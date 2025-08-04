// hooks.ts - Updated Firebase hooks with unified multi-device sync
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FirebaseService } from './firebaseService';
import { SyncIntegration, getSyncIntegration, SyncState } from './SyncIntegration';
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
  ActivityLogEntry
} from './types';

// Migration functions for data compatibility
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
    completed: typeof prep.completed === 'boolean' ? prep.completed : false,
    completedBy: prep.completedBy || null,
    completedAt: prep.completedAt || null,
    notes: prep.notes || '',
    assignedTo: prep.assignedTo || null
  }));
};

const migratePrepItems = (prepItems: any[]): PrepItem[] => {
  if (!prepItems || !Array.isArray(prepItems)) return [];
  
  return prepItems.map(item => ({
    id: item.id || 0,
    name: item.name || 'Unknown Item',
    category: item.category || 'muut',
    estimatedTime: item.estimatedTime || '30 min',
    hasRecipe: item.hasRecipe || false,
    recipe: item.recipe || null
  }));
};

const migrateStoreItems = (storeItems: any[]): StoreItem[] => {
  if (!storeItems || !Array.isArray(storeItems)) return getDefaultStoreItems();
  
  return storeItems.map(item => ({
    id: item.id || 0,
    name: item.name || 'Unknown Item',
    category: item.category || 'Other',
    inStock: typeof item.inStock === 'boolean' ? item.inStock : true,
    lastUpdated: item.lastUpdated || new Date().toISOString(),
    notes: item.notes || '',
    priority: item.priority || 'medium'
  }));
};

const migrateInventoryItems = (items: any[]): InventoryItem[] => {
  if (!items || !Array.isArray(items)) return [];
  
  return items.map(item => ({
    id: item.id || Date.now() + Math.random(),
    name: item.name || 'Unknown Item',
    currentStock: typeof item.currentStock === 'number' ? item.currentStock : 0,
    unit: item.unit || 'pcs',
    lastUpdated: item.lastUpdated || new Date().toISOString(),
    updatedBy: item.updatedBy || 'Unknown',
    category: item.category || 'Other',
    minStock: typeof item.minStock === 'number' ? item.minStock : 0,
    maxStock: typeof item.maxStock === 'number' ? item.maxStock : 100,
    isLowStock: typeof item.isLowStock === 'boolean' ? item.isLowStock : false,
    notes: item.notes || ''
  }));
};

const migrateDatabaseItems = (items: any[]): DatabaseItem[] => {
  if (!items || !Array.isArray(items)) return [];
  
  return items.map(item => ({
    id: item.id || Date.now() + Math.random(),
    name: item.name || 'Unknown Item',
    ean: item.ean || '',
    unit: item.unit || 'pcs',
    cost: typeof item.cost === 'number' ? item.cost : 0,
    costWithTax: typeof item.costWithTax === 'number' ? item.costWithTax : 0,
    type: item.type || 'product',
    assignedTo: item.assignedTo || '',
    assignedCategory: item.assignedCategory || '',
    isAssigned: typeof item.isAssigned === 'boolean' ? item.isAssigned : false,
    dateAdded: item.dateAdded || new Date().toISOString()
  }));
};

const migrateActivityLog = (log: any[]): ActivityLogEntry[] => {
  if (!log || !Array.isArray(log)) return [];
  
  return log.map(entry => ({
    id: entry.id || Date.now() + Math.random(),
    timestamp: entry.timestamp || new Date().toISOString(),
    user: entry.user || 'Unknown',
    action: entry.action || 'Unknown action',
    details: entry.details || '',
    category: entry.category || 'general'
  }));
};

// Auth hook with unified sync integration
export function useAuth(): { currentUser: CurrentUser | null; setCurrentUser: (user: CurrentUser | null) => void } {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem('workVibe_currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  // Update sync integration when user changes
  useEffect(() => {
    if (currentUser) {
      const syncIntegration = getSyncIntegration(currentUser.name);
      syncIntegration.updateUser(currentUser.name);
      localStorage.setItem('workVibe_currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('workVibe_currentUser');
    }
  }, [currentUser]);

  return { currentUser, setCurrentUser };
}

// Main Firebase data hook with unified sync
export function useFirebaseData(currentUser: CurrentUser | null) {
  // State management
  const [employees, setEmployees] = useState<Employee[]>(getDefaultEmployees());
  const [tasks, setTasks] = useState<Task[]>(getDefaultTasks());
  const [dailyData, setDailyData] = useState<DailyDataMap>(getEmptyDailyData());
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignments>({});
  const [customRoles, setCustomRoles] = useState<string[]>(['Cleaner', 'Manager', 'Supervisor']);
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [scheduledPreps, setScheduledPreps] = useState<ScheduledPrep[]>([]);
  const [prepSelections, setPrepSelections] = useState<PrepSelections>({});
  const [storeItems, setStoreItems] = useState<StoreItem[]>(getDefaultStoreItems());
  const [inventoryDailyItems, setInventoryDailyItems] = useState<InventoryItem[]>([]);
  const [inventoryWeeklyItems, setInventoryWeeklyItems] = useState<InventoryItem[]>([]);
  const [inventoryMonthlyItems, setInventoryMonthlyItems] = useState<InventoryItem[]>([]);
  const [inventoryDatabaseItems, setInventoryDatabaseItems] = useState<DatabaseItem[]>([]);
  const [inventoryActivityLog, setInventoryActivityLog] = useState<ActivityLogEntry[]>([]);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>('Never');
  const [syncState, setSyncState] = useState<SyncState | null>(null);

  // Services and refs
  const firebaseService = useMemo(() => new FirebaseService(), []);
  const syncIntegration = useMemo(() => getSyncIntegration(currentUser?.name || 'Unknown User'), [currentUser?.name]);
  const isInitializedRef = useRef(false);
  const isSavingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');

  // Initialize sync integration and set up state monitoring
  useEffect(() => {
    console.log('🚀 Setting up unified sync integration...');

    // Initialize sync integration
    syncIntegration.initialize().catch(console.error);

    // Monitor sync state changes
    syncIntegration.onSyncStateChanged((state: SyncState) => {
      setSyncState(state);
      setConnectionStatus(state.isConnected ? 'connected' : (state.error ? 'error' : 'connecting'));
      
      if (state.lastSync > 0) {
        setLastSync(new Date(state.lastSync).toLocaleTimeString());
      }
    });

    return () => {
      console.log('🧹 Cleaning up sync integration...');
      // Note: We don't disconnect here as it might be used by other components
    };
  }, [syncIntegration]);

  // Set up real-time field subscriptions
  useEffect(() => {
    if (!syncIntegration) return;

    console.log('📡 Setting up real-time subscriptions...');

    // Subscribe to employees
    syncIntegration.subscribeToField('employees', (data: Employee[]) => {
      console.log('📥 Received employees update');
      const migratedData = migrateEmployeeData(data);
      setEmployees(migratedData);
    });

    // Subscribe to tasks
    syncIntegration.subscribeToField('tasks', (data: Task[]) => {
      console.log('📥 Received tasks update');
      const migratedData = migrateTaskData(data);
      setTasks(migratedData);
    });

    // Subscribe to daily data
    syncIntegration.subscribeToField('dailyData', (data: DailyDataMap) => {
      console.log('📥 Received dailyData update');
      setDailyData(data || getEmptyDailyData());
    });

    // Subscribe to completed tasks
    syncIntegration.subscribeToField('completedTasks', (data: number[] | Set<number>) => {
      console.log('📥 Received completedTasks update');
      const processedData = Array.isArray(data) ? new Set(data) : data;
      setCompletedTasks(processedData || new Set());
    });

    // Subscribe to task assignments
    syncIntegration.subscribeToField('taskAssignments', (data: TaskAssignments) => {
      console.log('📥 Received taskAssignments update');
      setTaskAssignments(data || {});
    });

    // Subscribe to custom roles
    syncIntegration.subscribeToField('customRoles', (data: string[]) => {
      console.log('📥 Received customRoles update');
      setCustomRoles(data || ['Cleaner', 'Manager', 'Supervisor']);
    });

    // Subscribe to prep items
    syncIntegration.subscribeToField('prepItems', (data: PrepItem[]) => {
      console.log('📥 Received prepItems update');
      const migratedData = migratePrepItems(data);
      setPrepItems(migratedData);
    });

    // Subscribe to scheduled preps
    syncIntegration.subscribeToField('scheduledPreps', (data: ScheduledPrep[]) => {
      console.log('📥 Received scheduledPreps update');
      const migratedData = migrateScheduledPreps(data);
      setScheduledPreps(migratedData);
    });

    // Subscribe to prep selections
    syncIntegration.subscribeToField('prepSelections', (data: PrepSelections) => {
      console.log('📥 Received prepSelections update');
      setPrepSelections(data || {});
    });

    // Subscribe to store items
    syncIntegration.subscribeToField('storeItems', (data: StoreItem[]) => {
      console.log('📥 Received storeItems update');
      const migratedData = migrateStoreItems(data);
      setStoreItems(migratedData);
    });

    // Subscribe to inventory items
    syncIntegration.subscribeToField('inventoryDailyItems', (data: InventoryItem[]) => {
      console.log('📥 Received inventoryDailyItems update');
      const migratedData = migrateInventoryItems(data);
      setInventoryDailyItems(migratedData);
    });

    syncIntegration.subscribeToField('inventoryWeeklyItems', (data: InventoryItem[]) => {
      console.log('📥 Received inventoryWeeklyItems update');
      const migratedData = migrateInventoryItems(data);
      setInventoryWeeklyItems(migratedData);
    });

    syncIntegration.subscribeToField('inventoryMonthlyItems', (data: InventoryItem[]) => {
      console.log('📥 Received inventoryMonthlyItems update');
      const migratedData = migrateInventoryItems(data);
      setInventoryMonthlyItems(migratedData);
    });

    syncIntegration.subscribeToField('inventoryDatabaseItems', (data: DatabaseItem[]) => {
      console.log('📥 Received inventoryDatabaseItems update');
      const migratedData = migrateDatabaseItems(data);
      setInventoryDatabaseItems(migratedData);
    });

    syncIntegration.subscribeToField('inventoryActivityLog', (data: ActivityLogEntry[]) => {
      console.log('📥 Received inventoryActivityLog update');
      const migratedData = migrateActivityLog(data);
      setInventoryActivityLog(migratedData);
    });

    return () => {
      console.log('🧹 Cleaning up field subscriptions...');
      // Unsubscribe from all fields
      const fields = [
        'employees', 'tasks', 'dailyData', 'completedTasks', 'taskAssignments', 'customRoles',
        'prepItems', 'scheduledPreps', 'prepSelections', 'storeItems',
        'inventoryDailyItems', 'inventoryWeeklyItems', 'inventoryMonthlyItems',
        'inventoryDatabaseItems', 'inventoryActivityLog'
      ];
      
      fields.forEach(field => {
        syncIntegration.unsubscribeFromField(field);
      });
    };
  }, [syncIntegration]);

  // Initial data load
  const loadFromFirebase = useCallback(async () => {
    if (isLoading || !syncIntegration) return;

    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      console.log('📥 Loading initial data from Firebase...');
      
      const data = await syncIntegration.refreshAllData();
      
      // Migrate and set all data
      setEmployees(migrateEmployeeData(data.employees || []));
      setTasks(migrateTaskData(data.tasks || []));
      setDailyData(data.dailyData || getEmptyDailyData());
      setCompletedTasks(new Set(data.completedTasks || []));
      setTaskAssignments(data.taskAssignments || {});
      setCustomRoles(data.customRoles || ['Cleaner', 'Manager', 'Supervisor']);
      setPrepItems(migratePrepItems(data.prepItems || []));
      setScheduledPreps(migrateScheduledPreps(data.scheduledPreps || []));
      setPrepSelections(data.prepSelections || {});
      setStoreItems(migrateStoreItems(data.storeItems || []));
      setInventoryDailyItems(migrateInventoryItems(data.inventoryDailyItems || []));
      setInventoryWeeklyItems(migrateInventoryItems(data.inventoryWeeklyItems || []));
      setInventoryMonthlyItems(migrateInventoryItems(data.inventoryMonthlyItems || []));
      setInventoryDatabaseItems(migrateDatabaseItems(data.inventoryDatabaseItems || []));
      setInventoryActivityLog(migrateActivityLog(data.inventoryActivityLog || []));

      setConnectionStatus('connected');
      setLastSync(new Date().toLocaleTimeString());
      isInitializedRef.current = true;

      console.log('✅ Initial data loaded successfully');

    } catch (error) {
      console.error('❌ Initial load failed:', error);
      setConnectionStatus('error');

      // Set defaults on error but don't mark as initialized
      if (!isInitializedRef.current) {
        console.log('⚠️ Setting defaults due to load failure');
        setEmployees(getDefaultEmployees());
        setTasks(getDefaultTasks());
        setDailyData(getEmptyDailyData());
        setPrepItems([]);
        setScheduledPreps([]);
        setPrepSelections({});
        setStoreItems(getDefaultStoreItems());
        setInventoryDailyItems([]);
        setInventoryWeeklyItems([]);
        setInventoryMonthlyItems([]);
        setInventoryDatabaseItems([]);
        setInventoryActivityLog([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, syncIntegration]);

  // Auto-save with unified sync
  const saveToFirebase = useCallback(async () => {
    if (!isInitializedRef.current || isSavingRef.current || !syncIntegration) {
      return;
    }

    isSavingRef.current = true;

    try {
      console.log('💾 Auto-saving all data...');

      // Sync all critical data with high priority
      await syncIntegration.syncAllCriticalData({
        employees,
        tasks,
        completedTasks,
        taskAssignments
      });

      // Sync prep data with normal priority
      await syncIntegration.syncAllPrepData({
        prepItems,
        scheduledPreps,
        prepSelections
      });

      // Sync other data with normal/low priority
      await syncIntegration.syncField('dailyData', dailyData, 'normal');
      await syncIntegration.syncField('customRoles', customRoles, 'low');
      await syncIntegration.syncField('storeItems', storeItems, 'normal');

      // Sync inventory data
      await syncIntegration.syncAllInventoryData({
        inventoryDailyItems,
        inventoryWeeklyItems,
        inventoryMonthlyItems,
        inventoryDatabaseItems,
        inventoryActivityLog
      });

      setLastSync(new Date().toLocaleTimeString());
      setConnectionStatus('connected');

      console.log('✅ Auto-save completed successfully');

    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      setConnectionStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [
    employees, tasks, dailyData, completedTasks, taskAssignments, customRoles,
    prepItems, scheduledPreps, prepSelections, storeItems,
    inventoryDailyItems, inventoryWeeklyItems, inventoryMonthlyItems, 
    inventoryDatabaseItems, inventoryActivityLog,
    syncIntegration
  ]);

  // Debounced auto-save
  useEffect(() => {
    if (isInitializedRef.current && !isSavingRef.current) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveToFirebase();
      }, 2000); // 2 second debounce

      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }
  }, [saveToFirebase]);

  // Manual operations
  const forceSyncAll = useCallback(async () => {
    if (!syncIntegration) return;
    
    try {
      console.log('⚡ Force syncing all data...');
      await syncIntegration.forceSyncAll();
      console.log('✅ Force sync completed');
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      setConnectionStatus('error');
    }
  }, [syncIntegration]);

  const refreshData = useCallback(async () => {
    if (!syncIntegration) return;
    
    try {
      console.log('🔄 Refreshing data...');
      await loadFromFirebase();
      console.log('✅ Data refresh completed');
    } catch (error) {
      console.error('❌ Data refresh failed:', error);
    }
  }, [loadFromFirebase]);

  const checkDataIntegrity = useCallback(async () => {
    if (!syncIntegration) return new Map();
    
    try {
      console.log('🔍 Checking data integrity...');
      const results = await syncIntegration.checkDataIntegrity();
      console.log('✅ Data integrity check completed');
      return results;
    } catch (error) {
      console.error('❌ Data integrity check failed:', error);
      return new Map();
    }
  }, [syncIntegration]);

  // Calculate completion percentage for prep items
  const completionPercentage = useMemo(() => {
    const today = getFormattedDate(new Date());
    const todayPreps = scheduledPreps.filter(prep => prep.scheduledDate === today);
    const todayCompleted = todayPreps.filter(prep => prep.completed);
    
    return todayPreps.length > 0 
      ? Math.round((todayCompleted.length / todayPreps.length) * 100) 
      : 0;
  }, [scheduledPreps]);

  // Load initial data on mount
  useEffect(() => {
    loadFromFirebase();
  }, [loadFromFirebase]);

  return {
    // Data state
    employees,
    setEmployees,
    tasks,
    setTasks,
    dailyData,
    setDailyData,
    completedTasks,
    setCompletedTasks,
    taskAssignments,
    setTaskAssignments,
    customRoles,
    setCustomRoles,
    prepItems,
    setPrepItems,
    scheduledPreps,
    setScheduledPreps,
    prepSelections,
    setPrepSelections,
    storeItems,
    setStoreItems,
    inventoryDailyItems,
    setInventoryDailyItems,
    inventoryWeeklyItems,
    setInventoryWeeklyItems,
    inventoryMonthlyItems,
    setInventoryMonthlyItems,
    inventoryDatabaseItems,
    setInventoryDatabaseItems,
    inventoryActivityLog,
    setInventoryActivityLog,

    // Connection state
    connectionStatus,
    isLoading,
    lastSync,
    syncState,
    completionPercentage,

    // Manual operations
    saveToFirebase,
    loadFromFirebase,
    forceSyncAll,
    refreshData,
    checkDataIntegrity,

    // Services
    firebaseService,
    syncIntegration
  };
}
