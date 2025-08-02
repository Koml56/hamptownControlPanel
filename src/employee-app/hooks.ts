// hooks.ts - Enhanced with comprehensive inventory Firebase integration
import { useState, useRef, useCallback, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { FIREBASE_CONFIG } from './constants';
import { FirebaseService } from './firebaseService';
import { 
  migrateEmployeeData, 
  migrateTaskData, 
  migrateScheduledPreps, 
  getFormattedDate 
} from './migrationUtils';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
import type { 
  Employee, 
  Task, 
  DailyDataMap, 
  TaskAssignments, 
  PrepItem, 
  ScheduledPrep, 
  PrepSelections, 
  StoreItem,
  ConnectionStatus,
  CurrentUser,
  InventoryData,
  InventorySyncOperation,
  SyncOperation
} from './types';
import type { InventoryItem, DatabaseItem, ActivityLogEntry, InventoryFrequency } from './inventory/types';

// Enhanced Firebase data hook with comprehensive inventory support
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

  // NEW: Inventory data
  const [dailyItems, setDailyItems] = useState<InventoryItem[]>([]);
  const [weeklyItems, setWeeklyItems] = useState<InventoryItem[]>([]);
  const [monthlyItems, setMonthlyItems] = useState<InventoryItem[]>([]);
  const [databaseItems, setDatabaseItems] = useState<DatabaseItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  
  const firebaseService = new FirebaseService();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const isInitializedRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  // Enhanced debounced save with inventory data
  const debouncedSave = useCallback(async () => {
    if (isSavingRef.current || connectionStatus !== 'connected') {
      return;
    }

    isSavingRef.current = true;
    
    // Create complete data hash including inventory
    const currentDataHash = JSON.stringify({
      employees: employees.length,
      tasks: tasks.length,
      dailyData: Object.keys(dailyData).length,
      completedTasks: completedTasks.size,
      taskAssignments: Object.keys(taskAssignments).length,
      customRoles: customRoles.length,
      prepItems: prepItems.length,
      scheduledPreps: scheduledPreps.length,
      prepSelections: Object.keys(prepSelections).length,
      storeItems: storeItems.length,
      // NEW: Include inventory in hash
      dailyItems: dailyItems.length,
      weeklyItems: weeklyItems.length,
      monthlyItems: monthlyItems.length,
      databaseItems: databaseItems.length,
      activityLog: activityLog.length
    });

    if (lastSaveDataRef.current === currentDataHash) {
      console.log('📦 No changes detected, skipping save');
      isSavingRef.current = false;
      return;
    }
    
    try {
      console.log('🔥 Enhanced save with inventory data...');
      
      // Enhanced save with ALL fields including inventory
      await firebaseService.saveData({
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
        // NEW: Include inventory data
        dailyItems,
        weeklyItems,
        monthlyItems,
        databaseItems,
        activityLog
      });

      setLastSync(new Date().toLocaleTimeString());
      lastSaveDataRef.current = currentDataHash;
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('❌ Enhanced save failed:', error);
      setConnectionStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [
    employees, tasks, dailyData, completedTasks, taskAssignments, customRoles,
    prepItems, scheduledPreps, prepSelections, storeItems,
    // NEW: Include inventory data in dependencies
    dailyItems, weeklyItems, monthlyItems, databaseItems, activityLog,
    connectionStatus
  ]);

  // Enhanced quick save for immediate inventory operations
  const quickSave = useCallback(async (field: string, data: any): Promise<boolean> => {
    if (connectionStatus !== 'connected') {
      console.warn('⛔ Cannot save: offline or error connection');
      return false;
    }

    console.log(`🔥 Quick save: ${field}`);
    
    try {
      let saveData = data instanceof Set ? Array.from(data) : data;
      
      // Enhanced logging for inventory fields
      if (field.includes('inventory') || field.includes('Items')) {
        console.log(`📦 Saving ${field}:`, {
          count: Array.isArray(saveData) ? saveData.length : 'not array',
          sample: Array.isArray(saveData) ? saveData.slice(0, 2) : saveData
        });
      }
      
      const success = await firebaseService.quickSave(field, saveData);
      
      if (success) {
        setLastSync(new Date().toLocaleTimeString());
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
      
      return success;
    } catch (error) {
      console.error(`❌ Quick save failed for ${field}:`, error);
      setConnectionStatus('error');
      return false;
    }
  }, [connectionStatus]);

  // Enhanced save to Firebase with longer debounce
  const saveToFirebase = useCallback(() => {
    if (connectionStatus !== 'connected') {
      console.warn('⛔ Not saving to Firebase: offline or error connection');
      return;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 2000); // 2 second debounce
  }, [debouncedSave, connectionStatus]);

  // Enhanced load from Firebase with inventory data
  const loadFromFirebase = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      console.log('📡 Enhanced loading with inventory data...');
      
      const loadPromise = firebaseService.loadData();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Load timeout')), 15000)
      );

      const data = await Promise.race([loadPromise, timeoutPromise]) as any;

      // Migrate core data
      const finalEmployees = migrateEmployeeData(data.employees);
      const finalTasks = migrateTaskData(data.tasks);
      const finalScheduledPreps = migrateScheduledPreps(data.scheduledPreps || []);

      // Enhanced logging for loaded data
      console.log('📦 Loaded enhanced data:', {
        employees: finalEmployees.length,
        tasks: finalTasks.length,
        scheduledPreps: finalScheduledPreps.length,
        // NEW: Log inventory data
        inventoryData: data.inventoryData ? {
          dailyItems: data.inventoryData.dailyItems?.length || 0,
          weeklyItems: data.inventoryData.weeklyItems?.length || 0,
          monthlyItems: data.inventoryData.monthlyItems?.length || 0,
          databaseItems: data.inventoryData.databaseItems?.length || 0,
          activityLog: data.inventoryData.activityLog?.length || 0,
          version: data.inventoryData.version || 0
        } : 'No inventory data'
      });

      // Set core data
      setEmployees(finalEmployees);
      setTasks(finalTasks);
      setDailyData(data.dailyData || {});
      setCompletedTasks(new Set(data.completedTasks || []));
      setTaskAssignments(data.taskAssignments || {});
      setCustomRoles(data.customRoles || ['Cleaner', 'Manager', 'Supervisor']);
      setPrepItems(data.prepItems || []);
      setScheduledPreps(finalScheduledPreps);
      setPrepSelections(data.prepSelections || {});
      setStoreItems(data.storeItems || getDefaultStoreItems());

      // NEW: Set inventory data
      if (data.inventoryData) {
        setDailyItems(data.inventoryData.dailyItems || []);
        setWeeklyItems(data.inventoryData.weeklyItems || []);
        setMonthlyItems(data.inventoryData.monthlyItems || []);
        setDatabaseItems(data.inventoryData.databaseItems || []);
        setActivityLog(data.inventoryData.activityLog || []);
      } else {
        // Initialize with empty inventory data
        setDailyItems([]);
        setWeeklyItems([]);
        setMonthlyItems([]);
        setDatabaseItems([]);
        setActivityLog([]);
      }

      setConnectionStatus('connected');
      setLastSync(new Date().toLocaleTimeString());
      lastSaveDataRef.current = JSON.stringify({ loaded: true });
      isInitializedRef.current = true;

      console.log('✅ Enhanced data loaded successfully with inventory');

    } catch (error) {
      console.error('❌ Enhanced load failed:', error);
      setConnectionStatus('error');

      if (!isInitializedRef.current) {
        console.log('⚠️ Setting defaults due to load failure');
        setEmployees(getDefaultEmployees());
        setTasks(getDefaultTasks());
        setDailyData(getEmptyDailyData());
        setPrepItems([]);
        setScheduledPreps([]);
        setPrepSelections({});
        setStoreItems(getDefaultStoreItems());
        // NEW: Set empty inventory defaults
        setDailyItems([]);
        setWeeklyItems([]);
        setMonthlyItems([]);
        setDatabaseItems([]);
        setActivityLog([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // NEW: Inventory-specific save functions
  const saveInventoryData = useCallback(async (data: Partial<InventoryData>): Promise<boolean> => {
    if (connectionStatus !== 'connected') return false;
    
    console.log('🏪 Saving inventory data:', Object.keys(data));
    return await firebaseService.saveInventoryData(data);
  }, [connectionStatus]);

  const saveInventoryFrequency = useCallback(async (
    frequency: 'daily' | 'weekly' | 'monthly', 
    items: InventoryItem[]
  ): Promise<boolean> => {
    if (connectionStatus !== 'connected') return false;
    
    console.log(`🗂️ Saving ${frequency} items:`, items.length);
    return await firebaseService.saveInventoryFrequency(frequency, items);
  }, [connectionStatus]);

  const saveDatabaseItems = useCallback(async (items: DatabaseItem[]): Promise<boolean> => {
    if (connectionStatus !== 'connected') return false;
    
    console.log('🗄️ Saving database items:', items.length);
    return await firebaseService.saveDatabaseItems(items);
  }, [connectionStatus]);

  const saveActivityLog = useCallback(async (log: ActivityLogEntry[]): Promise<boolean> => {
    if (connectionStatus !== 'connected') return false;
    
    console.log('📝 Saving activity log:', log.length);
    return await firebaseService.saveActivityLog(log);
  }, [connectionStatus]);

  // NEW: Apply inventory sync operation
  const applyInventoryOperation = useCallback(async (operation: InventorySyncOperation): Promise<boolean> => {
    console.log('🔄 Applying inventory operation:', operation.type);
    return await firebaseService.applyInventoryOperation(operation);
  }, []);

  // Enhanced auto-save with inventory data
  useEffect(() => {
    if (isInitializedRef.current && !isSavingRef.current) {
      const autoSaveTimer = setTimeout(() => {
        saveToFirebase();
      }, 1000);
      
      return () => clearTimeout(autoSaveTimer);
    }
  }, [
    employees, tasks, dailyData, completedTasks, taskAssignments, customRoles, scheduledPreps,
    // NEW: Include inventory in auto-save triggers
    dailyItems, weeklyItems, monthlyItems, databaseItems
  ]);

  // Separate effect for activity log (less frequent saves)
  useEffect(() => {
    if (isInitializedRef.current) {
      const timer = setTimeout(() => {
        saveToFirebase();
      }, 5000); // 5 second delay for activity log
      
      return () => clearTimeout(timer);
    }
  }, [activityLog]);

  // Enhanced real-time listeners including inventory
  const firebaseAppRef = useRef<any>(null);
  const dbRef = useRef<any>(null);
  
  if (!firebaseAppRef.current) {
    firebaseAppRef.current = initializeApp(FIREBASE_CONFIG);
    dbRef.current = getDatabase(firebaseAppRef.current);
  }

  useEffect(() => {
    const db = dbRef.current;
    if (!db) return;

    console.log('🔄 Setting up enhanced real-time listeners with inventory...');

    // Existing listeners
    const employeesRef = ref(db, 'employees');
    const handleEmployees = (snapshot: any) => {
      const data = snapshot.val() || [];
      setEmployees(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(employeesRef, handleEmployees);

    const tasksRef = ref(db, 'tasks');
    const handleTasks = (snapshot: any) => {
      const data = snapshot.val() || [];
      setTasks(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(tasksRef, handleTasks);

    const dailyDataRef = ref(db, 'dailyData');
    const handleDailyData = (snapshot: any) => {
      setDailyData(snapshot.val() || {});
    };
    onValue(dailyDataRef, handleDailyData);

    const completedTasksRef = ref(db, 'completedTasks');
    const handleCompletedTasks = (snapshot: any) => {
      const data = snapshot.val() || [];
      setCompletedTasks(new Set(data));
    };
    onValue(completedTasksRef, handleCompletedTasks);

    const taskAssignmentsRef = ref(db, 'taskAssignments');
    const handleTaskAssignments = (snapshot: any) => {
      setTaskAssignments(snapshot.val() || {});
    };
    onValue(taskAssignmentsRef, handleTaskAssignments);

    const customRolesRef = ref(db, 'customRoles');
    const handleCustomRoles = (snapshot: any) => {
      setCustomRoles(snapshot.val() || ['Cleaner', 'Manager', 'Supervisor']);
    };
    onValue(customRolesRef, handleCustomRoles);

    const prepItemsRef = ref(db, 'prepItems');
    const handlePrepItems = (snapshot: any) => {
      const data = snapshot.val() || [];
      setPrepItems(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(prepItemsRef, handlePrepItems);

    const scheduledPrepsRef = ref(db, 'scheduledPreps');
    const handleScheduledPreps = (snapshot: any) => {
      const data = snapshot.val() || [];
      const migrated = migrateScheduledPreps(Array.isArray(data) ? data : Object.values(data));
      setScheduledPreps(migrated);
    };
    onValue(scheduledPrepsRef, handleScheduledPreps);

    const prepSelectionsRef = ref(db, 'prepSelections');
    const handlePrepSelections = (snapshot: any) => {
      setPrepSelections(snapshot.val() || {});
    };
    onValue(prepSelectionsRef, handlePrepSelections);

    const storeItemsRef = ref(db, 'storeItems');
    const handleStoreItems = (snapshot: any) => {
      const data = snapshot.val() || [];
      setStoreItems(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(storeItemsRef, handleStoreItems);

    // NEW: Inventory real-time listeners
    const inventoryDataRef = ref(db, 'inventoryData');
    const handleInventoryData = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        console.log('🔄 Real-time inventory update received');
        setDailyItems(data.dailyItems || []);
        setWeeklyItems(data.weeklyItems || []);
        setMonthlyItems(data.monthlyItems || []);
        setDatabaseItems(data.databaseItems || []);
        setActivityLog(data.activityLog || []);
      }
    };
    onValue(inventoryDataRef, handleInventoryData);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up enhanced real-time listeners');
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
      // NEW: Cleanup inventory listeners
      off(inventoryDataRef, 'value', handleInventoryData);
    };
  }, []);

  // Apply task sync operation (existing)
  const applyTaskSyncOperation = (op: SyncOperation) => {
    // Implementation for task operations
    console.log('🔄 Applying task sync operation:', op);
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
    // NEW: Inventory state
    dailyItems,
    weeklyItems,
    monthlyItems,
    databaseItems,
    activityLog,

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
    // NEW: Inventory setters
    setDailyItems,
    setWeeklyItems,
    setMonthlyItems,
    setDatabaseItems,
    setActivityLog,

    // Actions
    loadFromFirebase,
    saveToFirebase,
    quickSave,
    // NEW: Inventory actions
    saveInventoryData,
    saveInventoryFrequency,
    saveDatabaseItems,
    saveActivityLog,
    applyInventoryOperation,

    // Sync operations
    applyTaskSyncOperation
  };
};

// Enhanced Auth hook (unchanged)
export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({ id: 1, name: 'Luka' });
  const [isAdmin, setIsAdmin] = useState(false);

  const switchUser = useCallback((employee: Employee) => {
    setCurrentUser({ id: employee.id, name: employee.name });
    localStorage.setItem('currentUserName', employee.name);
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdmin(false);
  }, []);

  useEffect(() => {
    if (currentUser.name) {
      localStorage.setItem('currentUserName', currentUser.name);
    }
  }, [currentUser.name]);

  return {
    currentUser,
    isAdmin,
    setCurrentUser,
    setIsAdmin,
    switchUser,
    logoutAdmin
  };
};

// Enhanced task realtime sync hook (simplified)
export const useTaskRealtimeSync = (applyTaskSyncOperation: (op: SyncOperation) => void) => {
  // Enhanced real-time sync handled by Firebase listeners in useFirebaseData
  console.log('🔄 Enhanced task realtime sync initialized');
  return { status: 'connected' };
};
