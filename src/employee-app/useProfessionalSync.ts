// useProfessionalSync.ts - Professional multi-device sync hook
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { EnhancedSyncIntegration } from './EnhancedSyncIntegration';
import { DeviceInfo, SyncEvent } from './ProfessionalMultiDeviceSync';
import type {
  Employee,
  Task,
  DailyDataMap,
  TaskAssignments,
  PrepItem,
  ScheduledPrep,
  PrepSelections,
  StoreItem,
  InventoryItem,
  DatabaseItem,
  ActivityLogEntry
} from './types';

interface ProfessionalSyncState {
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor';
  deviceCount: number;
  lastSync: number;
  syncEvents: SyncEvent[];
  isLoading: boolean;
  error: string | null;
}

interface ProfessionalSyncHook {
  // State
  employees: Employee[];
  tasks: Task[];
  dailyData: DailyDataMap;
  completedTasks: Set<number>;
  taskAssignments: TaskAssignments;
  customRoles: string[];
  prepItems: PrepItem[];
  scheduledPreps: ScheduledPrep[];
  prepSelections: PrepSelections;
  storeItems: StoreItem[];
  inventoryDailyItems: InventoryItem[];
  inventoryWeeklyItems: InventoryItem[];
  inventoryMonthlyItems: InventoryItem[];
  inventoryDatabaseItems: DatabaseItem[];
  inventoryActivityLog: ActivityLogEntry[];

  // Setters
  setEmployees: (employees: Employee[]) => void;
  setTasks: (tasks: Task[]) => void;
  setDailyData: (data: DailyDataMap) => void;
  setCompletedTasks: (tasks: Set<number>) => void;
  setTaskAssignments: (assignments: TaskAssignments) => void;
  setCustomRoles: (roles: string[]) => void;
  setPrepItems: (items: PrepItem[]) => void;
  setScheduledPreps: (preps: ScheduledPrep[]) => void;
  setPrepSelections: (selections: PrepSelections) => void;
  setStoreItems: (items: StoreItem[]) => void;
  setInventoryDailyItems: (items: InventoryItem[]) => void;
  setInventoryWeeklyItems: (items: InventoryItem[]) => void;
  setInventoryMonthlyItems: (items: InventoryItem[]) => void;
  setInventoryDatabaseItems: (items: DatabaseItem[]) => void;
  setInventoryActivityLog: (log: ActivityLogEntry[]) => void;

  // Sync operations
  quickSave: (field: string, data: any) => Promise<boolean>;
  bulkSave: (updates: Record<string, any>) => Promise<boolean>;
  refreshData: () => Promise<void>;

  // Sync status
  syncState: ProfessionalSyncState;
  activeDevices: DeviceInfo[];

  // Connection management
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  
  // Diagnostics
  checkIntegrity: () => Promise<Map<string, boolean>>;
  getMetrics: () => any;
}

export const useProfessionalSync = (userName: string = 'Unknown User'): ProfessionalSyncHook => {
  // Enhanced sync integration
  const syncIntegrationRef = useRef<EnhancedSyncIntegration | null>(null);
  
  // Initialize sync integration with memoization
  const syncIntegration = useMemo(() => {
    if (!syncIntegrationRef.current) {
      syncIntegrationRef.current = new EnhancedSyncIntegration(userName);
    }
    return syncIntegrationRef.current;
  }, [userName]);

  // Data state
  const [employees, setEmployeesState] = useState<Employee[]>([]);
  const [tasks, setTasksState] = useState<Task[]>([]);
  const [dailyData, setDailyDataState] = useState<DailyDataMap>({});
  const [completedTasks, setCompletedTasksState] = useState<Set<number>>(new Set());
  const [taskAssignments, setTaskAssignmentsState] = useState<TaskAssignments>({});
  const [customRoles, setCustomRolesState] = useState<string[]>([]);
  const [prepItems, setPrepItemsState] = useState<PrepItem[]>([]);
  const [scheduledPreps, setScheduledPrepsState] = useState<ScheduledPrep[]>([]);
  const [prepSelections, setPrepSelectionsState] = useState<PrepSelections>({});
  const [storeItems, setStoreItemsState] = useState<StoreItem[]>([]);
  const [inventoryDailyItems, setInventoryDailyItemsState] = useState<InventoryItem[]>([]);
  const [inventoryWeeklyItems, setInventoryWeeklyItemsState] = useState<InventoryItem[]>([]);
  const [inventoryMonthlyItems, setInventoryMonthlyItemsState] = useState<InventoryItem[]>([]);
  const [inventoryDatabaseItems, setInventoryDatabaseItemsState] = useState<DatabaseItem[]>([]);
  const [inventoryActivityLog, setInventoryActivityLogState] = useState<ActivityLogEntry[]>([]);

  // Sync state
  const [syncState, setSyncState] = useState<ProfessionalSyncState>({
    isConnected: false,
    connectionQuality: 'excellent',
    deviceCount: 0,
    lastSync: 0,
    syncEvents: [],
    isLoading: true,
    error: null
  });

  const [activeDevices, setActiveDevices] = useState<DeviceInfo[]>([]);

  // Refs for preventing unnecessary re-renders
  const isInitializedRef = useRef(false);
  const lastUpdateRef = useRef<Record<string, number>>({});

  // Enhanced setters with automatic sync
  const createSyncSetter = useCallback((
    field: string,
    setState: (data: any) => void,
    transformer?: (data: any) => any
  ) => {
    return (data: any) => {
      const processedData = transformer ? transformer(data) : data;
      setState(processedData);
      
      // Auto-sync if initialized
      if (isInitializedRef.current) {
        const now = Date.now();
        const lastUpdate = lastUpdateRef.current[field] || 0;
        
        // Debounce rapid updates
        if (now - lastUpdate > 500) {
          lastUpdateRef.current[field] = now;
          syncIntegration.syncField(field, processedData).catch(error => {
            console.warn(`⚠️ Auto-sync failed for ${field}:`, error);
          });
        }
      }
    };
  }, [syncIntegration]);

  // Enhanced setters
  const setEmployees = useMemo(() => 
    createSyncSetter('employees', setEmployeesState), 
    [createSyncSetter]
  );

  const setTasks = useMemo(() => 
    createSyncSetter('tasks', setTasksState), 
    [createSyncSetter]
  );

  const setDailyData = useMemo(() => 
    createSyncSetter('dailyData', setDailyDataState), 
    [createSyncSetter]
  );

  const setCompletedTasks = useMemo(() => 
    createSyncSetter('completedTasks', setCompletedTasksState, (data: Set<number> | number[]) => 
      data instanceof Set ? data : new Set(data)
    ), 
    [createSyncSetter]
  );

  const setTaskAssignments = useMemo(() => 
    createSyncSetter('taskAssignments', setTaskAssignmentsState), 
    [createSyncSetter]
  );

  const setCustomRoles = useMemo(() => 
    createSyncSetter('customRoles', setCustomRolesState), 
    [createSyncSetter]
  );

  const setPrepItems = useMemo(() => 
    createSyncSetter('prepItems', setPrepItemsState), 
    [createSyncSetter]
  );

  const setScheduledPreps = useMemo(() => 
    createSyncSetter('scheduledPreps', setScheduledPrepsState), 
    [createSyncSetter]
  );

  const setPrepSelections = useMemo(() => 
    createSyncSetter('prepSelections', setPrepSelectionsState), 
    [createSyncSetter]
  );

  const setStoreItems = useMemo(() => 
    createSyncSetter('storeItems', setStoreItemsState), 
    [createSyncSetter]
  );

  const setInventoryDailyItems = useMemo(() => 
    createSyncSetter('inventoryDailyItems', setInventoryDailyItemsState), 
    [createSyncSetter]
  );

  const setInventoryWeeklyItems = useMemo(() => 
    createSyncSetter('inventoryWeeklyItems', setInventoryWeeklyItemsState), 
    [createSyncSetter]
  );

  const setInventoryMonthlyItems = useMemo(() => 
    createSyncSetter('inventoryMonthlyItems', setInventoryMonthlyItemsState), 
    [createSyncSetter]
  );

  const setInventoryDatabaseItems = useMemo(() => 
    createSyncSetter('inventoryDatabaseItems', setInventoryDatabaseItemsState), 
    [createSyncSetter]
  );

  const setInventoryActivityLog = useMemo(() => 
    createSyncSetter('inventoryActivityLog', setInventoryActivityLogState), 
    [createSyncSetter]
  );

  // Quick save function
  const quickSave = useCallback(async (field: string, data: any): Promise<boolean> => {
    try {
      await syncIntegration.syncField(field, data);
      return true;
    } catch (error) {
      console.error(`❌ Quick save failed for ${field}:`, error);
      return false;
    }
  }, [syncIntegration]);

  // Bulk save function
  const bulkSave = useCallback(async (updates: Record<string, any>): Promise<boolean> => {
    try {
      await syncIntegration.syncMultipleFields(updates);
      return true;
    } catch (error) {
      console.error('❌ Bulk save failed:', error);
      return false;
    }
  }, [syncIntegration]);

  // Refresh data function
  const refreshData = useCallback(async (): Promise<void> => {
    try {
      setSyncState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const data = await syncIntegration.refreshAllData();
      
      // Update all state with fetched data
      if (data.employees) setEmployeesState(data.employees);
      if (data.tasks) setTasksState(data.tasks);
      if (data.dailyData) setDailyDataState(data.dailyData);
      if (data.completedTasks) setCompletedTasksState(new Set(data.completedTasks));
      if (data.taskAssignments) setTaskAssignmentsState(data.taskAssignments);
      if (data.customRoles) setCustomRolesState(data.customRoles);
      if (data.prepItems) setPrepItemsState(data.prepItems);
      if (data.scheduledPreps) setScheduledPrepsState(data.scheduledPreps);
      if (data.prepSelections) setPrepSelectionsState(data.prepSelections);
      if (data.storeItems) setStoreItemsState(data.storeItems);
      if (data.inventoryDailyItems) setInventoryDailyItemsState(data.inventoryDailyItems);
      if (data.inventoryWeeklyItems) setInventoryWeeklyItemsState(data.inventoryWeeklyItems);
      if (data.inventoryMonthlyItems) setInventoryMonthlyItemsState(data.inventoryMonthlyItems);
      if (data.inventoryDatabaseItems) setInventoryDatabaseItemsState(data.inventoryDatabaseItems);
      if (data.inventoryActivityLog) setInventoryActivityLogState(data.inventoryActivityLog);
      
      setSyncState(prev => ({ ...prev, isLoading: false }));
      console.log('✅ Data refresh completed');
      
    } catch (error) {
      console.error('❌ Data refresh failed:', error);
      setSyncState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [syncIntegration]);

  // Connection management
  const connect = useCallback(async (): Promise<void> => {
    try {
      setSyncState(prev => ({ ...prev, isLoading: true, error: null }));
      await syncIntegration.connect();
      setSyncState(prev => ({ ...prev, isConnected: true, isLoading: false }));
    } catch (error) {
      console.error('❌ Connection failed:', error);
      setSyncState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [syncIntegration]);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await syncIntegration.disconnect();
      setSyncState(prev => ({ ...prev, isConnected: false }));
    } catch (error) {
      console.error('❌ Disconnect failed:', error);
    }
  }, [syncIntegration]);

  // Diagnostics
  const checkIntegrity = useCallback(async (): Promise<Map<string, boolean>> => {
    return await syncIntegration.checkDataIntegrity();
  }, [syncIntegration]);

  const getMetrics = useCallback(() => {
    return syncIntegration.getPerformanceMetrics();
  }, [syncIntegration]);

  // Setup sync subscriptions
  useEffect(() => {
    const fieldSubscriptions = [
      { field: 'employees', setter: setEmployeesState },
      { field: 'tasks', setter: setTasksState },
      { field: 'dailyData', setter: setDailyDataState },
      { field: 'completedTasks', setter: (data: number[]) => setCompletedTasksState(new Set(data)) },
      { field: 'taskAssignments', setter: setTaskAssignmentsState },
      { field: 'customRoles', setter: setCustomRolesState },
      { field: 'prepItems', setter: setPrepItemsState },
      { field: 'scheduledPreps', setter: setScheduledPrepsState },
      { field: 'prepSelections', setter: setPrepSelectionsState },
      { field: 'storeItems', setter: setStoreItemsState },
      { field: 'inventoryDailyItems', setter: setInventoryDailyItemsState },
      { field: 'inventoryWeeklyItems', setter: setInventoryWeeklyItemsState },
      { field: 'inventoryMonthlyItems', setter: setInventoryMonthlyItemsState },
      { field: 'inventoryDatabaseItems', setter: setInventoryDatabaseItemsState },
      { field: 'inventoryActivityLog', setter: setInventoryActivityLogState }
    ];

    fieldSubscriptions.forEach(({ field, setter }) => {
      syncIntegration.subscribeToField(field, (data) => {
        if (data !== null && data !== undefined) {
          setter(data);
        }
      });
    });

    return () => {
      fieldSubscriptions.forEach(({ field }) => {
        syncIntegration.unsubscribeFromField(field);
      });
    };
  }, [syncIntegration]);

  // Setup sync state monitoring
  useEffect(() => {
    syncIntegration.onSyncStateChange((state) => {
      setSyncState(prev => ({
        ...prev,
        isConnected: state.isConnected,
        connectionQuality: state.connectionQuality as any,
        deviceCount: state.deviceCount,
        lastSync: state.lastSync,
        syncEvents: state.syncEvents
      }));
    });

    // Update active devices periodically
    const updateDevices = async () => {
      try {
        const devices = await syncIntegration.getActiveDevices();
        setActiveDevices(devices);
      } catch (error) {
        console.warn('⚠️ Failed to update device list:', error);
      }
    };

    updateDevices();
    const deviceInterval = setInterval(updateDevices, 30000); // Every 30 seconds

    return () => {
      clearInterval(deviceInterval);
    };
  }, [syncIntegration]);

  // Auto-connect on mount
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (mounted) {
        await connect();
        await refreshData();
        isInitializedRef.current = true;
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (isInitializedRef.current) {
        disconnect().catch(console.warn);
      }
    };
  }, [connect, disconnect, refreshData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntegrationRef.current) {
        syncIntegrationRef.current.disconnect().catch(console.warn);
      }
    };
  }, []);

  return {
    // State
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

    // Sync operations
    quickSave,
    bulkSave,
    refreshData,

    // Sync status
    syncState,
    activeDevices,

    // Connection management
    connect,
    disconnect,

    // Diagnostics
    checkIntegrity,
    getMetrics
  };
};