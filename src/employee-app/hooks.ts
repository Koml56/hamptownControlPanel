// src/employee-app/hooks.ts - Updated with inventory Firebase syncing
import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from './firebase';
import { FirebaseService } from './firebaseService';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
import { applyTaskOperation, resolveTaskConflicts } from './taskOperations';
import { applyEmployeeOperation, resolveEmployeeConflicts } from './employeeOperations';
import { applyPrepItemOperation, resolvePrepItemConflicts } from './prepOperations';
import { getFormattedDate } from './utils';
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
  SyncOperation,
  CurrentUser
} from './types';

// Import inventory types
import type { 
  InventoryItem, 
  DatabaseItem, 
  ActivityLogEntry, 
  InventoryFrequency 
} from './inventory/types';

// Helper function to migrate prep data
const migrateScheduledPreps = (data: any[]): ScheduledPrep[] => {
  return data.map(prep => ({
    ...prep,
    completed: prep.completed === true || prep.completed === 'true' ? true : prep.completed === false || prep.completed === 'false' ? false : false, // CRITICAL: Ensure completed status is boolean
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

  // NEW: Inventory data
  const [inventoryDailyItems, setInventoryDailyItems] = useState<InventoryItem[]>([]);
  const [inventoryWeeklyItems, setInventoryWeeklyItems] = useState<InventoryItem[]>([]);
  const [inventoryMonthlyItems, setInventoryMonthlyItems] = useState<InventoryItem[]>([]);
  const [inventoryDatabaseItems, setInventoryDatabaseItems] = useState<DatabaseItem[]>([]);
  const [inventoryActivityLog, setInventoryActivityLog] = useState<ActivityLogEntry[]>([]);
  
  const firebaseService = new FirebaseService();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const isInitializedRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  // ENHANCED: quickSave with inventory support
  const quickSave = useCallback(async (field: string, data: any): Promise<boolean> => {
    console.log(`🔥 QuickSave: ${field}`);
    
    try {
      const baseUrl = 'https://hamptown-panel-default-rtdb.firebaseio.com';
      let saveData = data instanceof Set ? Array.from(data) : data;
      
      // Enhanced logging for different data types
      if (field === 'scheduledPreps') {
        const todayStr = getFormattedDate(new Date());
        const todayPreps = saveData.filter((prep: any) => prep.scheduledDate === todayStr);
        const todayCompleted = todayPreps.filter((prep: any) => prep.completed === true);
        
        console.log('🔍 Saving scheduledPreps to Firebase:', {
          totalCount: saveData.length,
          todayCount: todayPreps.length,
          todayCompletedCount: todayCompleted.length,
          completionPercentage: todayPreps.length > 0 ? Math.round((todayCompleted.length / todayPreps.length) * 100) : 0
        });
      } else if (field.startsWith('inventory')) {
        console.log(`🔍 Saving ${field} to Firebase:`, {
          count: Array.isArray(saveData) ? saveData.length : 'Not array',
          firstItem: Array.isArray(saveData) && saveData.length > 0 ? saveData[0].name || saveData[0].type : 'No items'
        });
      } else {
        console.log(`🔍 Saving ${field} to Firebase:`, {
          type: typeof saveData,
          length: Array.isArray(saveData) ? saveData.length : 'Not array',
          keys: typeof saveData === 'object' && saveData !== null ? Object.keys(saveData).length : 'Not object'
        });
      }

      const response = await fetch(`${baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ QuickSave successful: ${field}`);
      return true;
    } catch (error) {
      console.error(`❌ QuickSave failed for ${field}:`, error);
      return false;
    }
  }, []);

  // Inventory-specific quick save functions
  const quickSaveInventory = useCallback(async (frequency: InventoryFrequency, items: InventoryItem[]): Promise<boolean> => {
    const fieldName = frequency === 'daily' ? 'inventoryDailyItems' : 
                     frequency === 'weekly' ? 'inventoryWeeklyItems' : 
                     'inventoryMonthlyItems';
    return await quickSave(fieldName, items);
  }, [quickSave]);

  const quickSaveDatabase = useCallback(async (items: DatabaseItem[]): Promise<boolean> => {
    return await quickSave('inventoryDatabaseItems', items);
  }, [quickSave]);

  const quickSaveActivityLog = useCallback(async (log: ActivityLogEntry[]): Promise<boolean> => {
    return await quickSave('inventoryActivityLog', log);
  }, [quickSave]);

  // Enhanced save function
  const debouncedSave = useCallback(async () => {
    if (isSavingRef.current) return;
    
    isSavingRef.current = true;
    setConnectionStatus('syncing');
    
    // Create data hash to detect changes
    const currentDataHash = JSON.stringify({
      employees: employees.length,
      tasks: tasks.length,
      dailyData: Object.keys(dailyData).length,
      completedTasks: completedTasks.size,
      prepItems: prepItems.length,
      scheduledPreps: scheduledPreps.length,
      storeItems: storeItems.length,
      // Add inventory data to hash
      inventoryDailyItems: inventoryDailyItems.length,
      inventoryWeeklyItems: inventoryWeeklyItems.length,
      inventoryMonthlyItems: inventoryMonthlyItems.length,
      inventoryDatabaseItems: inventoryDatabaseItems.length,
      inventoryActivityLog: inventoryActivityLog.length
    });
    
    if (currentDataHash === lastSaveDataRef.current) {
      console.log('📊 Data unchanged, skipping save');
      isSavingRef.current = false;
      setConnectionStatus('connected');
      return;
    }
    
    try {
      // Enhanced Firebase save with inventory data
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
        // Add inventory data
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
    // Add inventory dependencies
    inventoryDailyItems, inventoryWeeklyItems, inventoryMonthlyItems, 
    inventoryDatabaseItems, inventoryActivityLog,
    connectionStatus
  ]);

  // Enhanced save to Firebase
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
    }, 2000);
  }, [debouncedSave, connectionStatus]);

  // Enhanced load from Firebase with inventory data
  const loadFromFirebase = useCallback(async () => {
    if (isInitializedRef.current) return;
    
    setIsLoading(true);
    setConnectionStatus('connecting');
    
    try {
      console.log('🔄 Loading data from Firebase...');
      
      const baseUrl = 'https://hamptown-panel-default-rtdb.firebaseio.com';
      
      // Load all data in parallel
      const [
        employeesRes, tasksRes, dailyDataRes, completedTasksRes, 
        taskAssignmentsRes, customRolesRes, prepItemsRes, 
        scheduledPrepsRes, prepSelectionsRes, storeItemsRes,
        // Load inventory data
        inventoryDailyRes, inventoryWeeklyRes, inventoryMonthlyRes,
        inventoryDatabaseRes, inventoryActivityLogRes
      ] = await Promise.all([
        fetch(`${baseUrl}/employees.json`),
        fetch(`${baseUrl}/tasks.json`),
        fetch(`${baseUrl}/dailyData.json`),
        fetch(`${baseUrl}/completedTasks.json`),
        fetch(`${baseUrl}/taskAssignments.json`),
        fetch(`${baseUrl}/customRoles.json`),
        fetch(`${baseUrl}/prepItems.json`),
        fetch(`${baseUrl}/scheduledPreps.json`),
        fetch(`${baseUrl}/prepSelections.json`),
        fetch(`${baseUrl}/storeItems.json`),
        // Inventory endpoints
        fetch(`${baseUrl}/inventoryDailyItems.json`),
        fetch(`${baseUrl}/inventoryWeeklyItems.json`),
        fetch(`${baseUrl}/inventoryMonthlyItems.json`),
        fetch(`${baseUrl}/inventoryDatabaseItems.json`),
        fetch(`${baseUrl}/inventoryActivityLog.json`)
      ]);

      // Parse all responses
      const [
        employeesData, tasksData, dailyDataData, completedTasksData,
        taskAssignmentsData, customRolesData, prepItemsData,
        scheduledPrepsData, prepSelectionsData, storeItemsData,
        // Parse inventory data
        inventoryDailyData, inventoryWeeklyData, inventoryMonthlyData,
        inventoryDatabaseData, inventoryActivityLogData
      ] = await Promise.all([
        employeesRes.json(), tasksRes.json(), dailyDataRes.json(), completedTasksRes.json(),
        taskAssignmentsRes.json(), customRolesRes.json(), prepItemsRes.json(),
        scheduledPrepsRes.json(), prepSelectionsRes.json(), storeItemsRes.json(),
        // Parse inventory
        inventoryDailyRes.json(), inventoryWeeklyRes.json(), inventoryMonthlyRes.json(),
        inventoryDatabaseRes.json(), inventoryActivityLogRes.json()
      ]);

      // Set main data with defaults
      setEmployees(employeesData || getDefaultEmployees());
      setTasks(tasksData || getDefaultTasks());
      setDailyData(dailyDataData || getEmptyDailyData());
      setCompletedTasks(new Set(completedTasksData || []));
      setTaskAssignments(taskAssignmentsData || {});
      setCustomRoles(customRolesData || ['Cleaner', 'Manager', 'Supervisor']);
      setPrepItems(prepItemsData || []);
      setScheduledPreps(scheduledPrepsData ? migrateScheduledPreps(scheduledPrepsData) : []);
      setPrepSelections(prepSelectionsData || {});
      setStoreItems(storeItemsData || getDefaultStoreItems());

      // Set inventory data with defaults
      setInventoryDailyItems(inventoryDailyData || []);
      setInventoryWeeklyItems(inventoryWeeklyData || []);
      setInventoryMonthlyItems(inventoryMonthlyData || []);
      setInventoryDatabaseItems(inventoryDatabaseData || []);
      setInventoryActivityLog(inventoryActivityLogData || []);

      console.log('✅ Data loaded from Firebase successfully');
      console.log('📊 Inventory data loaded:', {
        daily: inventoryDailyData?.length || 0,
        weekly: inventoryWeeklyData?.length || 0,
        monthly: inventoryMonthlyData?.length || 0,
        database: inventoryDatabaseData?.length || 0,
        activityLog: inventoryActivityLogData?.length || 0
      });
      
      setConnectionStatus('connected');
      isInitializedRef.current = true;
      
    } catch (error) {
      console.error('❌ Load failed:', error);
      setConnectionStatus('error');
      
      // Set defaults on error
      setEmployees(getDefaultEmployees());
      setTasks(getDefaultTasks());
      setDailyData(getEmptyDailyData());
      setStoreItems(getDefaultStoreItems());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Enhanced real-time listeners with inventory support
  const setupRealtimeListeners = useCallback(() => {
    console.log('🔄 Setting up real-time Firebase listeners with inventory support...');
    
    // Existing listeners...
    const employeesRef = ref(db, 'employees');
    const handleEmployees = (snapshot: any) => {
      const data = snapshot.val();
      setEmployees(data || getDefaultEmployees());
    };
    onValue(employeesRef, handleEmployees);

    const tasksRef = ref(db, 'tasks');
    const handleTasks = (snapshot: any) => {
      const data = snapshot.val();
      setTasks(data || getDefaultTasks());
    };
    onValue(tasksRef, handleTasks);

    const dailyDataRef = ref(db, 'dailyData');
    const handleDailyData = (snapshot: any) => {
      setDailyData(snapshot.val() || getEmptyDailyData());
    };
    onValue(dailyDataRef, handleDailyData);

    const completedTasksRef = ref(db, 'completedTasks');
    const handleCompletedTasks = (snapshot: any) => {
      const data = snapshot.val();
      setCompletedTasks(new Set(data || []));
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

    // NEW: Inventory listeners
    const inventoryDailyRef = ref(db, 'inventoryDailyItems');
    const handleInventoryDaily = (snapshot: any) => {
      const data = snapshot.val() || [];
      setInventoryDailyItems(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(inventoryDailyRef, handleInventoryDaily);

    const inventoryWeeklyRef = ref(db, 'inventoryWeeklyItems');
    const handleInventoryWeekly = (snapshot: any) => {
      const data = snapshot.val() || [];
      setInventoryWeeklyItems(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(inventoryWeeklyRef, handleInventoryWeekly);

    const inventoryMonthlyRef = ref(db, 'inventoryMonthlyItems');
    const handleInventoryMonthly = (snapshot: any) => {
      const data = snapshot.val() || [];
      setInventoryMonthlyItems(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(inventoryMonthlyRef, handleInventoryMonthly);

    const inventoryDatabaseRef = ref(db, 'inventoryDatabaseItems');
    const handleInventoryDatabase = (snapshot: any) => {
      const data = snapshot.val() || [];
      setInventoryDatabaseItems(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(inventoryDatabaseRef, handleInventoryDatabase);

    const inventoryActivityLogRef = ref(db, 'inventoryActivityLog');
    const handleInventoryActivityLog = (snapshot: any) => {
      const data = snapshot.val() || [];
      setInventoryActivityLog(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(inventoryActivityLogRef, handleInventoryActivityLog);

    // Cleanup function
    return () => {
      // Existing cleanup
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
      
      // NEW: Inventory cleanup
      off(inventoryDailyRef, 'value', handleInventoryDaily);
      off(inventoryWeeklyRef, 'value', handleInventoryWeekly);
      off(inventoryMonthlyRef, 'value', handleInventoryMonthly);
      off(inventoryDatabaseRef, 'value', handleInventoryDatabase);
      off(inventoryActivityLogRef, 'value', handleInventoryActivityLog);
    };
  }, []);

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

    // NEW: Inventory state
    inventoryDailyItems,
    inventoryWeeklyItems,
    inventoryMonthlyItems,
    inventoryDatabaseItems,
    inventoryActivityLog,

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
    setInventoryDailyItems,
    setInventoryWeeklyItems,
    setInventoryMonthlyItems,
    setInventoryDatabaseItems,
    setInventoryActivityLog,

    // Actions
    loadFromFirebase,
    saveToFirebase,
    quickSave,

    // NEW: Inventory-specific save functions
    quickSaveInventory,
    quickSaveDatabase,
    quickSaveActivityLog,

    // Task sync
    applyTaskSyncOperation,

    // Setup listeners
    setupRealtimeListeners
  };
};

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

export const useTaskRealtimeSync = (applyTaskSyncOperation: (op: SyncOperation) => void) => {
  // WebSocketManager removed: real-time sync handled by Firebase
  // If you need to add custom sync, use Firebase listeners here.
};
