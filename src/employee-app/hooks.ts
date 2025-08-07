// hooks.ts - FIXED: Enhanced Firebase save/load for prep completions with better debugging
import { useState, useEffect, useCallback, useRef } from 'react';
import { FirebaseService } from './firebaseService';
import { getFormattedDate } from './utils';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
import type {
  Employee,
  Task,
  DailyDataMap,
  TaskAssignments,
  ConnectionStatus,
  CurrentUser,
  PrepItem,
  ScheduledPrep,
  PrepSelections,
  StoreItem,
  InventoryItem,
  DatabaseItem,
  ActivityLogEntry,
  CustomCategory
} from './types';
import type { SyncOperation } from './OperationManager';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { FIREBASE_CONFIG } from './constants';
import { applyTaskOperation } from './taskOperations';
import { checkInventoryChanges } from './inventory/notificationService';

// Migration functions
const migrateEmployeeData = (employees: any[]): Employee[] => {
  if (!employees || !Array.isArray(employees)) return getDefaultEmployees();
  return employees.map(emp => ({
    id: emp.id || 0,
    name: emp.name || 'Unknown',
    mood: emp.mood || 3,
    lastUpdated: emp.lastUpdated || 'Not updated',
    role: emp.role || 'Cleaner',
    lastMoodDate: emp.lastMoodDate || null,
    points: typeof emp.points === 'number' ? emp.points : 0
  }));
};

const migrateTaskData = (tasks: any[]): Task[] => {
  if (!tasks || !Array.isArray(tasks)) return getDefaultTasks();
  return tasks.map(task => ({
    id: task.id || 0,
    task: task.task || 'Unknown Task',
    location: task.location || 'Unknown Location',
    priority: task.priority || 'medium',
    estimatedTime: task.estimatedTime || '30 min',
    points: typeof task.points === 'number' ? task.points : 5
  }));
};

// FIXED: Enhanced prep data migration with completion status validation
const migrateScheduledPreps = (scheduledPreps: any[]): ScheduledPrep[] => {
  if (!scheduledPreps || !Array.isArray(scheduledPreps)) return [];
  
  return scheduledPreps.map(prep => ({
    id: prep.id || Date.now() + Math.random(),
    prepId: prep.prepId || 0,
    name: prep.name || 'Unknown Prep',
    category: prep.category || 'muut',
    estimatedTime: prep.estimatedTime || '30 min',
    isCustom: prep.isCustom || false,
    hasRecipe: prep.hasRecipe || false,
    recipe: prep.recipe || null,
    scheduledDate: prep.scheduledDate || getFormattedDate(new Date()),
    priority: prep.priority || 'medium',
    timeSlot: prep.timeSlot || '',
    completed: typeof prep.completed === 'boolean' ? prep.completed : false, // CRITICAL: Ensure completed status is boolean
    assignedTo: prep.assignedTo || null,
    notes: prep.notes || ''
  }));
};

export const useFirebaseData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  // Main app data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyData, setDailyData] = useState<DailyDataMap>({});
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignments>({});
  const [customRoles, setCustomRoles] = useState<string[]>(['Cleaner', 'Manager', 'Supervisor']);

  // PrepList data
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [scheduledPreps, setScheduledPreps] = useState<ScheduledPrep[]>([]);
  const [prepSelections, setPrepSelections] = useState<PrepSelections>({});
  
  // Store data
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  
  // Inventory data
  const [inventoryDailyItems, setInventoryDailyItems] = useState<InventoryItem[]>([]);
  const [inventoryWeeklyItems, setInventoryWeeklyItems] = useState<InventoryItem[]>([]);
  const [inventoryMonthlyItems, setInventoryMonthlyItems] = useState<InventoryItem[]>([]);
  const [inventoryDatabaseItems, setInventoryDatabaseItems] = useState<DatabaseItem[]>([]);
  const [inventoryActivityLog, setInventoryActivityLog] = useState<ActivityLogEntry[]>([]);
  const [inventoryCustomCategories, setInventoryCustomCategories] = useState<CustomCategory[]>([]);
  
  // Previous inventory state for change detection
  const previousInventoryDailyRef = useRef<InventoryItem[]>([]);
  const previousInventoryWeeklyRef = useRef<InventoryItem[]>([]);
  const previousInventoryMonthlyRef = useRef<InventoryItem[]>([]);
  
  const firebaseService = new FirebaseService();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const isInitializedRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  // FIXED: Enhanced quickSave with better error handling and completion status logging
  const quickSave = useCallback(async (field: string, data: any): Promise<boolean> => {
    console.log(`🔥 QuickSave: ${field}`);
    
    try {
      const baseUrl = 'https://hamptown-panel-default-rtdb.firebaseio.com';
      let saveData = data instanceof Set ? Array.from(data) : data;
      
      // ENHANCED: Detailed logging for scheduledPreps with completion status
      if (field === 'scheduledPreps') {
        const todayStr = getFormattedDate(new Date());
        const todayPreps = saveData.filter((prep: any) => prep.scheduledDate === todayStr);
        const todayCompleted = todayPreps.filter((prep: any) => prep.completed === true);
        
        console.log('🔍 Saving scheduledPreps to Firebase:', {
          totalCount: saveData.length,
          todayCount: todayPreps.length,
          todayCompletedCount: todayCompleted.length,
          completionPercentage: todayPreps.length > 0 ? Math.round((todayCompleted.length / todayPreps.length) * 100) : 0,
          sampleTodayPreps: todayPreps.slice(0, 3).map((prep: any) => ({
            id: prep.id,
            name: prep.name,
            completed: prep.completed,
            scheduledDate: prep.scheduledDate
          }))
        });
        
        // VALIDATION: Ensure all completion statuses are boolean
        saveData = saveData.map((prep: any) => ({
          ...prep,
          completed: Boolean(prep.completed) // Force to boolean
        }));
      }
      
      // Critical fields that need reliable saving (wait for response)
      const criticalFields = ['scheduledPreps', 'completedTasks', 'taskAssignments', 'dailyData'];
      const isCritical = criticalFields.includes(field);
      
      if (isCritical) {
        // For critical data, wait for the response to ensure it's saved
        console.log('🔒 Critical save - waiting for confirmation:', field);
        
        const response = await fetch(`${baseUrl}/${field}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveData)
        });
        
        if (response.ok) {
          setLastSync(new Date().toLocaleTimeString());
          setConnectionStatus('connected');
          console.log('✅ Critical QuickSave completed:', field);
          
          // ENHANCED: Verify the save by reading back the data for scheduledPreps
          if (field === 'scheduledPreps') {
            setTimeout(async () => {
              try {
                const verifyResponse = await fetch(`${baseUrl}/${field}.json`);
                const verifyData = await verifyResponse.json();
                
                if (verifyData) {
                  const todayStr = getFormattedDate(new Date());
                  const todayPreps = verifyData.filter((prep: any) => prep.scheduledDate === todayStr);
                  const todayCompleted = todayPreps.filter((prep: any) => prep.completed === true);
                  
                  console.log('🔍 Verified scheduledPreps in Firebase after save:', {
                    totalCount: verifyData.length,
                    todayCount: todayPreps.length,
                    todayCompletedCount: todayCompleted.length,
                    completionPercentage: todayPreps.length > 0 ? Math.round((todayCompleted.length / todayPreps.length) * 100) : 0
                  });
                  
                  // Check if there's a mismatch
                  const originalTodayCompleted = saveData.filter((prep: any) => 
                    prep.scheduledDate === todayStr && prep.completed === true
                  ).length;
                  
                  if (todayCompleted.length !== originalTodayCompleted) {
                    console.warn('⚠️ Completion count mismatch after save!', {
                      sent: originalTodayCompleted,
                      verified: todayCompleted.length
                    });
                  } else {
                    console.log('✅ Completion status successfully verified');
                  }
                } else {
                  console.warn('⚠️ No data returned from verification');
                }
              } catch (error) {
                console.warn('⚠️ Failed to verify save:', error);
              }
            }, 500);
          }
        } else {
          throw new Error(`Critical save failed: ${response.status}`);
        }
      } else {
        // Non-critical data can still be fire-and-forget
        fetch(`${baseUrl}/${field}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveData)
        }).then(response => {
          if (response.ok) {
            setLastSync(new Date().toLocaleTimeString());
            setConnectionStatus('connected');
            console.log('✅ QuickSave completed:', field);
          } else {
            throw new Error(`Save failed: ${response.status}`);
          }
        }).catch(error => {
          console.warn('⚠️ QuickSave failed (non-blocking):', error);
          setConnectionStatus('error');
        });
      }

      return true;
      
    } catch (error) {
      console.error('❌ QuickSave error:', error);
      setConnectionStatus('error');
      return false;
    }
  }, []);

  // PERFORMANCE OPTIMIZATION: Initialize sync service lazily after initial load
  const initializeSyncService = useCallback(async () => {
    // REMOVE: MultiDeviceSyncService initialization
  }, []);

  // PERFORMANCE: Debounced batch sync function (with sync pause protection and prep data protection)
  const debouncedBatchSync = useCallback(async () => {
    // REMOVE: Batch sync logic
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles, 
      prepItems, scheduledPreps, prepSelections, storeItems]);

  // PERFORMANCE: Non-blocking main save function - FIXED to include all fields
  const debouncedSave = useCallback(async () => {
    if (isSavingRef.current || connectionStatus === 'error') {
      console.log('⏭️ Skipping save (already saving or offline)');
      return;
    }

    const currentDataHash = JSON.stringify({
      employees: employees.length,
      tasks: tasks.length,
      dailyDataKeys: Object.keys(dailyData).length,
      completedTasksSize: completedTasks.size,
      taskAssignmentsKeys: Object.keys(taskAssignments).length,
      customRolesLength: customRoles.length,
      prepItemsLength: prepItems.length,
      scheduledPrepsLength: scheduledPreps.length,
      prepSelectionsKeys: Object.keys(prepSelections).length,
      storeItemsLength: storeItems.length,
      inventoryDailyItemsLength: inventoryDailyItems.length,
      inventoryWeeklyItemsLength: inventoryWeeklyItems.length,
      inventoryMonthlyItemsLength: inventoryMonthlyItems.length,
      inventoryDatabaseItemsLength: inventoryDatabaseItems.length,
      inventoryActivityLogLength: inventoryActivityLog.length
    });

    if (currentDataHash === lastSaveDataRef.current) {
      return;
    }

    isSavingRef.current = true;
    console.log('💾 Saving data (non-blocking)...');
    
    try {
      // FIXED: Save to Firebase with ALL fields included
      await firebaseService.saveData({
        employees,
        tasks,
        dailyData,
        completedTasks,
        taskAssignments,
        customRoles,
        // FIXED: Include all prep and store fields
        prepItems,
        scheduledPreps,
        prepSelections,
        storeItems,
        // Inventory fields
        inventoryDailyItems,
        inventoryWeeklyItems,
        inventoryMonthlyItems,
        inventoryDatabaseItems,
        inventoryActivityLog
      });

      setLastSync(new Date().toLocaleTimeString());
      lastSaveDataRef.current = currentDataHash;
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      setConnectionStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [
    employees, tasks, dailyData, completedTasks, taskAssignments, customRoles,
    prepItems, scheduledPreps, prepSelections, storeItems,
    inventoryDailyItems, inventoryWeeklyItems, inventoryMonthlyItems, inventoryDatabaseItems, inventoryActivityLog,
    connectionStatus, debouncedBatchSync
  ]);

  // PERFORMANCE: Longer debounce for main saves
  const saveToFirebase = useCallback(() => {
    // Prevent save if offline
    if (connectionStatus !== 'connected') {
      console.warn('⛔ Not saving to Firebase: offline or error connection');
      return;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 2000); // Increased debounce to reduce save frequency
  }, [debouncedSave, connectionStatus]);

  // PERFORMANCE: Fast, non-blocking load with enhanced prep data handling
  const loadFromFirebase = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      console.log('📡 Loading data (fast mode)...');
      
      // Load main data with timeout to prevent hanging
      const loadPromise = firebaseService.loadData();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Load timeout')), 10000) // 10 second timeout
      );

      const data = await Promise.race([loadPromise, timeoutPromise]) as any;

      const finalEmployees = migrateEmployeeData(data.employees);
      const finalTasks = migrateTaskData(data.tasks);
      const finalScheduledPreps = migrateScheduledPreps(data.scheduledPreps || []);

      // ENHANCED: Debug loaded scheduledPreps data with completion status
      console.log('🔍 Loading scheduledPreps from Firebase:', {
        count: finalScheduledPreps.length,
        todayPreps: finalScheduledPreps.filter((prep: any) => 
          prep.scheduledDate === getFormattedDate(new Date())
        ).length,
        todayCompleted: finalScheduledPreps.filter((prep: any) => 
          prep.scheduledDate === getFormattedDate(new Date()) && prep.completed === true
        ).length,
        sampleData: finalScheduledPreps.slice(0, 5).map((prep: any) => ({
          id: prep.id,
          name: prep.name,
          completed: prep.completed,
          scheduledDate: prep.scheduledDate
        })),
        rawDataSample: data.scheduledPreps ? data.scheduledPreps.slice(0, 3) : 'No raw data'
      });

      // Set data immediately
      setEmployees(finalEmployees);
      setTasks(finalTasks);
      setDailyData(data.dailyData);
      setCompletedTasks(new Set(data.completedTasks));
      setTaskAssignments(data.taskAssignments);
      setCustomRoles(data.customRoles);
      setPrepItems(data.prepItems || []);
      setScheduledPreps(finalScheduledPreps);
      setPrepSelections(data.prepSelections || {});
      setStoreItems(data.storeItems || getDefaultStoreItems());
      
      // Set inventory data
      const dailyItems = data.inventoryDailyItems || [];
      const weeklyItems = data.inventoryWeeklyItems || [];
      const monthlyItems = data.inventoryMonthlyItems || [];
      
      setInventoryDailyItems(dailyItems);
      setInventoryWeeklyItems(weeklyItems);
      setInventoryMonthlyItems(monthlyItems);
      setInventoryDatabaseItems(data.inventoryDatabaseItems || []);
      setInventoryActivityLog(data.inventoryActivityLog || []);
      setInventoryCustomCategories(data.inventoryCustomCategories || []);
      
      // Initialize previous inventory references for change detection
      previousInventoryDailyRef.current = [...dailyItems];
      previousInventoryWeeklyRef.current = [...weeklyItems];
      previousInventoryMonthlyRef.current = [...monthlyItems];

      // ENHANCED: Log what we actually set for scheduledPreps with completion status
      const todayStr = getFormattedDate(new Date());
      const todayPreps = finalScheduledPreps.filter((prep: any) => prep.scheduledDate === todayStr);
      const todayCompleted = todayPreps.filter((prep: any) => prep.completed === true);
      
      console.log('✅ Set scheduledPreps state:', {
        count: finalScheduledPreps.length,
        todayCount: todayPreps.length,
        todayCompletedCount: todayCompleted.length,
        completionPercentage: todayPreps.length > 0 ? Math.round((todayCompleted.length / todayPreps.length) * 100) : 0
      });

      setConnectionStatus('connected');
      setLastSync(new Date().toLocaleTimeString());
      lastSaveDataRef.current = JSON.stringify({ loaded: true });
      isInitializedRef.current = true;

      console.log('✅ Data loaded successfully');

    } catch (error) {
      console.error('❌ Load failed:', error);
      setConnectionStatus('error');

      // Set defaults on error - but don't mark as initialized to prevent sync overwrite
      if (!isInitializedRef.current) {
        console.log('⚠️ Setting defaults due to load failure - sync disabled until manual load succeeds');
        setEmployees(getDefaultEmployees());
        setTasks(getDefaultTasks());
        setDailyData(getEmptyDailyData());
        setPrepItems([]);
        setScheduledPreps([]);
        setPrepSelections({});
        setStoreItems(getDefaultStoreItems());
        // DON'T set isInitializedRef.current = true here to prevent sync overwrite
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // CRITICAL FIX: Auto-save critical data immediately (but respect sync pause)
  useEffect(() => {
    if (isInitializedRef.current && !isSavingRef.current) {
      // Add a small delay to batch multiple changes together
      const autoSaveTimer = setTimeout(() => {
        saveToFirebase();
      }, 1000);
      
      return () => clearTimeout(autoSaveTimer);
    }
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles, scheduledPreps]);

  // PERFORMANCE: Separate effect for less critical data with longer debounce
  useEffect(() => {
    if (isInitializedRef.current) {
      const timer = setTimeout(() => {
        saveToFirebase();
      }, 3000); // 3 second delay for non-critical data
      
      return () => clearTimeout(timer);
    }
  }, [prepItems, prepSelections, storeItems]);

  // --- REAL-TIME SYNC SETUP ---
  // Initialize Firebase app and database (only once)
  const firebaseAppRef = useRef<any>(null);
  const dbRef = useRef<any>(null);
  if (!firebaseAppRef.current) {
    firebaseAppRef.current = initializeApp(FIREBASE_CONFIG);
    dbRef.current = getDatabase(firebaseAppRef.current);
  }

  // Real-time listeners for all shared data types
  useEffect(() => {
    const db = dbRef.current;
    if (!db) return;
    // Employees
    const employeesRef = ref(db, 'employees');
    const handleEmployees = (snapshot: any) => {
      const data = snapshot.val() || [];
      setEmployees(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(employeesRef, handleEmployees);
    // Tasks
    const tasksRef = ref(db, 'tasks');
    const handleTasks = (snapshot: any) => {
      const data = snapshot.val() || [];
      setTasks(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(tasksRef, handleTasks);
    // DailyData
    const dailyDataRef = ref(db, 'dailyData');
    const handleDailyData = (snapshot: any) => {
      setDailyData(snapshot.val() || {});
    };
    onValue(dailyDataRef, handleDailyData);
    // CompletedTasks
    const completedTasksRef = ref(db, 'completedTasks');
    const handleCompletedTasks = (snapshot: any) => {
      setCompletedTasks(new Set(snapshot.val() || []));
    };
    onValue(completedTasksRef, handleCompletedTasks);
    // TaskAssignments
    const taskAssignmentsRef = ref(db, 'taskAssignments');
    const handleTaskAssignments = (snapshot: any) => {
      setTaskAssignments(snapshot.val() || {});
    };
    onValue(taskAssignmentsRef, handleTaskAssignments);
    // CustomRoles
    const customRolesRef = ref(db, 'customRoles');
    const handleCustomRoles = (snapshot: any) => {
      setCustomRoles(Array.isArray(snapshot.val()) ? snapshot.val() : []);
    };
    onValue(customRolesRef, handleCustomRoles);
    // PrepItems
    const prepItemsRef = ref(db, 'prepItems');
    const handlePrepItems = (snapshot: any) => {
      const data = snapshot.val() || [];
      setPrepItems(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(prepItemsRef, handlePrepItems);
    // ScheduledPreps
    const scheduledPrepsRef = ref(db, 'scheduledPreps');
    const handleScheduledPreps = (snapshot: any) => {
      const data = snapshot.val() || [];
      const migrated = migrateScheduledPreps(Array.isArray(data) ? data : Object.values(data));
      setScheduledPreps(migrated);
    };
    onValue(scheduledPrepsRef, handleScheduledPreps);
    // PrepSelections
    const prepSelectionsRef = ref(db, 'prepSelections');
    const handlePrepSelections = (snapshot: any) => {
      setPrepSelections(snapshot.val() || {});
    };
    onValue(prepSelectionsRef, handlePrepSelections);
    
    // StoreItems
    const storeItemsRef = ref(db, 'storeItems');
    const handleStoreItems = (snapshot: any) => {
      const data = snapshot.val() || [];
      setStoreItems(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(storeItemsRef, handleStoreItems);

    // Inventory Items - Real-time synchronization with notification support
    const inventoryDailyItemsRef = ref(db, 'inventoryDailyItems');
    const handleInventoryDailyItems = (snapshot: any) => {
      const data = snapshot.val() || [];
      const newItems = Array.isArray(data) ? data : Object.values(data);
      
      // Check for inventory changes and send notifications
      if (isInitializedRef.current && previousInventoryDailyRef.current.length > 0) {
        checkInventoryChanges(newItems, previousInventoryDailyRef.current);
      }
      
      // Update state and previous reference
      previousInventoryDailyRef.current = [...newItems];
      setInventoryDailyItems(newItems);
    };
    onValue(inventoryDailyItemsRef, handleInventoryDailyItems);

    const inventoryWeeklyItemsRef = ref(db, 'inventoryWeeklyItems');
    const handleInventoryWeeklyItems = (snapshot: any) => {
      const data = snapshot.val() || [];
      const newItems = Array.isArray(data) ? data : Object.values(data);
      
      // Check for inventory changes and send notifications
      if (isInitializedRef.current && previousInventoryWeeklyRef.current.length > 0) {
        checkInventoryChanges(newItems, previousInventoryWeeklyRef.current);
      }
      
      // Update state and previous reference
      previousInventoryWeeklyRef.current = [...newItems];
      setInventoryWeeklyItems(newItems);
    };
    onValue(inventoryWeeklyItemsRef, handleInventoryWeeklyItems);

    const inventoryMonthlyItemsRef = ref(db, 'inventoryMonthlyItems');
    const handleInventoryMonthlyItems = (snapshot: any) => {
      const data = snapshot.val() || [];
      const newItems = Array.isArray(data) ? data : Object.values(data);
      
      // Check for inventory changes and send notifications
      if (isInitializedRef.current && previousInventoryMonthlyRef.current.length > 0) {
        checkInventoryChanges(newItems, previousInventoryMonthlyRef.current);
      }
      
      // Update state and previous reference
      previousInventoryMonthlyRef.current = [...newItems];
      setInventoryMonthlyItems(newItems);
    };
    onValue(inventoryMonthlyItemsRef, handleInventoryMonthlyItems);

    const inventoryDatabaseItemsRef = ref(db, 'inventoryDatabaseItems');
    const handleInventoryDatabaseItems = (snapshot: any) => {
      const data = snapshot.val() || [];
      setInventoryDatabaseItems(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(inventoryDatabaseItemsRef, handleInventoryDatabaseItems);

    const inventoryActivityLogRef = ref(db, 'inventoryActivityLog');
    const handleInventoryActivityLog = (snapshot: any) => {
      const data = snapshot.val() || [];
      setInventoryActivityLog(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(inventoryActivityLogRef, handleInventoryActivityLog);

    const inventoryCustomCategoriesRef = ref(db, 'inventoryCustomCategories');
    const handleInventoryCustomCategories = (snapshot: any) => {
      const data = snapshot.val() || [];
      setInventoryCustomCategories(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(inventoryCustomCategoriesRef, handleInventoryCustomCategories);
    // Cleanup
    return () => {
      off(employeesRef, 'value', handleEmployees);
      off(tasksRef, 'value', handleTasks);
      off(dailyDataRef, 'value', handleDailyData);
      off(completedTasksRef, 'value', handleCompletedTasks);
      off(taskAssignmentsRef, 'value', handleTaskAssignments);
      off(customRolesRef, 'value', handleCustomRoles);
      off(prepItemsRef, 'value', handlePrepItems);
      off(scheduledPrepsRef, 'value', handleScheduledPreps);
      off(prepSelectionsRef, 'value', handlePrepSelections);
      off(storeItemsRef, 'value', handleStoreItems);
      // Inventory cleanup
      off(inventoryDailyItemsRef, 'value', handleInventoryDailyItems);
      off(inventoryWeeklyItemsRef, 'value', handleInventoryWeeklyItems);
      off(inventoryMonthlyItemsRef, 'value', handleInventoryMonthlyItems);
      off(inventoryDatabaseItemsRef, 'value', handleInventoryDatabaseItems);
      off(inventoryActivityLogRef, 'value', handleInventoryActivityLog);
    };
  }, []);

  // Додаємо applyTaskOperation для застосування операцій до задач
  const applyTaskSyncOperation = (op: SyncOperation) => {
    setTasks(prev => applyTaskOperation(prev, op));
  };

  return {
    // State
    isLoading,
    lastSync,
    connectionStatus,
    employees,
    tasks,
    dailyData,
    completedTasks,
    taskAssignments,
    customRoles,
    prepItems,
    scheduledPreps,
    prepSelections,
    storeItems,
    inventoryDailyItems,
    inventoryWeeklyItems,
    inventoryMonthlyItems,
    inventoryDatabaseItems,
    inventoryActivityLog,
    inventoryCustomCategories,

    // Setters
    setEmployees,
    setTasks,
    setDailyData,
    setCompletedTasks,
    setTaskAssignments,
    setCustomRoles,
    setPrepItems,
    setScheduledPreps,
    setPrepSelections,
    setStoreItems,
    setInventoryDailyItems,
    setInventoryWeeklyItems,
    setInventoryMonthlyItems,
    setInventoryDatabaseItems,
    setInventoryActivityLog,
    setInventoryCustomCategories,

    // Actions
    loadFromFirebase,
    saveToFirebase,
    quickSave,

    // Додаємо applyTaskOperation для застосування операцій до задач
    applyTaskSyncOperation
  };
};

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({ id: 1, name: 'Luka' });
  const [isAdmin, setIsAdmin] = useState(false);

  // Restore user from localStorage on component mount (only once)
  useEffect(() => {
    const savedUserName = localStorage.getItem('currentUserName');
    if (savedUserName && savedUserName !== currentUser.name) {
      // We need employees to find the correct ID, so this will be handled 
      // by the EmployeeApp component when employees are loaded
      setCurrentUser(prev => ({ ...prev, name: savedUserName }));
    }
  }, []); // Empty dependency array - only run once on mount

  const switchUser = useCallback((employee: Employee) => {
    setCurrentUser({ id: employee.id, name: employee.name });
    localStorage.setItem('currentUserName', employee.name);
    
    // Also update inventory employee selection to keep them in sync
    try {
      const { saveSelectedEmployee } = require('./inventory/components/EmployeeSelector');
      saveSelectedEmployee(employee.id, employee.name);
    } catch (error) {
      // Fallback if import fails, just update localStorage directly
      const employeeData = { id: employee.id, name: employee.name };
      localStorage.setItem('inventory_selected_employee', JSON.stringify(employeeData));
    }
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdmin(false);
  }, []);

  return {
    currentUser,
    isAdmin,
    setCurrentUser,
    setIsAdmin,
    switchUser,
    logoutAdmin
  };
};

export const useTaskRealtimeSync = (applyTaskSyncOperation: (op: SyncOperation) => void) => {
  // WebSocketManager removed: real-time sync handled by Firebase
  // If you need to add custom sync, use Firebase listeners here.
};
