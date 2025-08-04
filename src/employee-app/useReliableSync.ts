// useReliableSync.ts - Simplified, reliable sync hook
import { useState, useEffect, useCallback, useRef } from 'react';
import { ReliableSync, SyncState, DeviceInfo } from './ReliableSync';
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

interface ReliableSyncHook {
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

  // Setters that automatically sync
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
  quickSave: () => Promise<void>;
  legacyQuickSave: (field: string, data: any) => Promise<boolean>;
  refreshAllData: () => Promise<void>;

  // Sync status
  syncState: SyncState;
  activeDevices: DeviceInfo[];
}

export function useReliableSync(userName: string): ReliableSyncHook {
  // Initialize sync service
  const syncService = useRef<ReliableSync | null>(null);
  
  if (!syncService.current) {
    syncService.current = new ReliableSync(userName);
  }

  // Local state
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
  const [syncState, setSyncState] = useState<SyncState>(syncService.current.getSyncState());
  const [activeDevices, setActiveDevices] = useState<DeviceInfo[]>([]);

  // Initialize sync service and subscriptions
  useEffect(() => {
    const sync = syncService.current!;

    // Subscribe to sync state changes
    const handleSyncStateChange = (state: SyncState) => {
      setSyncState(state);
    };
    sync.onSyncStateChange(handleSyncStateChange);

    // Subscribe to data changes from other devices
    sync.onFieldChange('employees', setEmployeesState);
    sync.onFieldChange('tasks', setTasksState);
    sync.onFieldChange('dailyData', setDailyDataState);
    sync.onFieldChange('completedTasks', setCompletedTasksState);
    sync.onFieldChange('taskAssignments', setTaskAssignmentsState);
    sync.onFieldChange('customRoles', setCustomRolesState);
    sync.onFieldChange('prepItems', setPrepItemsState);
    sync.onFieldChange('scheduledPreps', setScheduledPrepsState);
    sync.onFieldChange('prepSelections', setPrepSelectionsState);
    sync.onFieldChange('storeItems', setStoreItemsState);
    sync.onFieldChange('inventoryDailyItems', setInventoryDailyItemsState);
    sync.onFieldChange('inventoryWeeklyItems', setInventoryWeeklyItemsState);
    sync.onFieldChange('inventoryMonthlyItems', setInventoryMonthlyItemsState);
    sync.onFieldChange('inventoryDatabaseItems', setInventoryDatabaseItemsState);
    sync.onFieldChange('inventoryActivityLog', setInventoryActivityLogState);

    // Connect to sync service
    sync.connect().catch(console.error);

    // Load initial data
    sync.refreshAllData().then((data) => {
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
    }).catch(console.error);

    // Update active devices periodically
    const updateDevices = async () => {
      try {
        const devices = await sync.getActiveDevices();
        setActiveDevices(devices);
        setSyncState(prev => ({ ...prev, deviceCount: devices.length }));
      } catch (error) {
        console.warn('Failed to update devices:', error);
      }
    };

    updateDevices();
    const deviceInterval = setInterval(updateDevices, 30000); // Every 30 seconds

    // Cleanup
    return () => {
      clearInterval(deviceInterval);
      sync.offSyncStateChange(handleSyncStateChange);
      sync.disconnect();
    };
  }, []);

  // Create setters that automatically sync data
  const setEmployees = useCallback((value: Employee[]) => {
    setEmployeesState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('employees', value).catch(error => {
          console.error('Failed to sync employees:', error);
        });
      }, 500);
    }
  }, []);

  const setTasks = useCallback((value: Task[]) => {
    setTasksState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('tasks', value).catch(error => {
          console.error('Failed to sync tasks:', error);
        });
      }, 500);
    }
  }, []);

  const setDailyData = useCallback((value: DailyDataMap) => {
    setDailyDataState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('dailyData', value).catch(error => {
          console.error('Failed to sync dailyData:', error);
        });
      }, 500);
    }
  }, []);

  const setCompletedTasks = useCallback((value: Set<number>) => {
    setCompletedTasksState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('completedTasks', value).catch(error => {
          console.error('Failed to sync completedTasks:', error);
        });
      }, 500);
    }
  }, []);

  const setTaskAssignments = useCallback((value: TaskAssignments) => {
    setTaskAssignmentsState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('taskAssignments', value).catch(error => {
          console.error('Failed to sync taskAssignments:', error);
        });
      }, 500);
    }
  }, []);

  const setCustomRoles = useCallback((value: string[]) => {
    setCustomRolesState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('customRoles', value).catch(error => {
          console.error('Failed to sync customRoles:', error);
        });
      }, 500);
    }
  }, []);

  const setPrepItems = useCallback((value: PrepItem[]) => {
    setPrepItemsState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('prepItems', value).catch(error => {
          console.error('Failed to sync prepItems:', error);
        });
      }, 500);
    }
  }, []);

  const setScheduledPreps = useCallback((value: ScheduledPrep[]) => {
    setScheduledPrepsState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('scheduledPreps', value).catch(error => {
          console.error('Failed to sync scheduledPreps:', error);
        });
      }, 500);
    }
  }, []);

  const setPrepSelections = useCallback((value: PrepSelections) => {
    setPrepSelectionsState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('prepSelections', value).catch(error => {
          console.error('Failed to sync prepSelections:', error);
        });
      }, 500);
    }
  }, []);

  const setStoreItems = useCallback((value: StoreItem[]) => {
    setStoreItemsState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('storeItems', value).catch(error => {
          console.error('Failed to sync storeItems:', error);
        });
      }, 500);
    }
  }, []);

  const setInventoryDailyItems = useCallback((value: InventoryItem[]) => {
    setInventoryDailyItemsState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('inventoryDailyItems', value).catch(error => {
          console.error('Failed to sync inventoryDailyItems:', error);
        });
      }, 500);
    }
  }, []);

  const setInventoryWeeklyItems = useCallback((value: InventoryItem[]) => {
    setInventoryWeeklyItemsState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('inventoryWeeklyItems', value).catch(error => {
          console.error('Failed to sync inventoryWeeklyItems:', error);
        });
      }, 500);
    }
  }, []);

  const setInventoryMonthlyItems = useCallback((value: InventoryItem[]) => {
    setInventoryMonthlyItemsState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('inventoryMonthlyItems', value).catch(error => {
          console.error('Failed to sync inventoryMonthlyItems:', error);
        });
      }, 500);
    }
  }, []);

  const setInventoryDatabaseItems = useCallback((value: DatabaseItem[]) => {
    setInventoryDatabaseItemsState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('inventoryDatabaseItems', value).catch(error => {
          console.error('Failed to sync inventoryDatabaseItems:', error);
        });
      }, 500);
    }
  }, []);

  const setInventoryActivityLog = useCallback((value: ActivityLogEntry[]) => {
    setInventoryActivityLogState(value);
    if (syncService.current) {
      setTimeout(() => {
        syncService.current!.syncData('inventoryActivityLog', value).catch(error => {
          console.error('Failed to sync inventoryActivityLog:', error);
        });
      }, 500);
    }
  }, []);

  // Create compatibility wrapper for old quickSave API
  const legacyQuickSave = useCallback(async (field: string, data: any): Promise<boolean> => {
    try {
      if (!syncService.current) return false;
      
      // Update the appropriate local state first
      switch (field) {
        case 'employees': setEmployeesState(data); break;
        case 'tasks': setTasksState(data); break;
        case 'dailyData': setDailyDataState(data); break;
        case 'completedTasks': setCompletedTasksState(new Set(data)); break;
        case 'taskAssignments': setTaskAssignmentsState(data); break;
        case 'customRoles': setCustomRolesState(data); break;
        case 'prepItems': setPrepItemsState(data); break;
        case 'scheduledPreps': setScheduledPrepsState(data); break;
        case 'prepSelections': setPrepSelectionsState(data); break;
        case 'storeItems': setStoreItemsState(data); break;
        case 'inventoryDailyItems': setInventoryDailyItemsState(data); break;
        case 'inventoryWeeklyItems': setInventoryWeeklyItemsState(data); break;
        case 'inventoryMonthlyItems': setInventoryMonthlyItemsState(data); break;
        case 'inventoryDatabaseItems': setInventoryDatabaseItemsState(data); break;
        case 'inventoryActivityLog': setInventoryActivityLogState(data); break;
      }
      
      // Then sync to remote
      await syncService.current.syncData(field, data);
      return true;
    } catch (error) {
      console.error(`Failed to legacy quick save ${field}:`, error);
      return false;
    }
  }, []);
  // Quick save all data
  const quickSave = useCallback(async () => {
    if (!syncService.current) return;

    const sync = syncService.current;
    
    try {
      await Promise.all([
        sync.syncData('employees', employees),
        sync.syncData('tasks', tasks),
        sync.syncData('dailyData', dailyData),
        sync.syncData('completedTasks', completedTasks),
        sync.syncData('taskAssignments', taskAssignments),
        sync.syncData('customRoles', customRoles),
        sync.syncData('prepItems', prepItems),
        sync.syncData('scheduledPreps', scheduledPreps),
        sync.syncData('prepSelections', prepSelections),
        sync.syncData('storeItems', storeItems),
        sync.syncData('inventoryDailyItems', inventoryDailyItems),
        sync.syncData('inventoryWeeklyItems', inventoryWeeklyItems),
        sync.syncData('inventoryMonthlyItems', inventoryMonthlyItems),
        sync.syncData('inventoryDatabaseItems', inventoryDatabaseItems),
        sync.syncData('inventoryActivityLog', inventoryActivityLog)
      ]);
      
      console.log('✅ Quick save completed');
    } catch (error) {
      console.error('❌ Quick save failed:', error);
      throw error;
    }
  }, [
    employees, tasks, dailyData, completedTasks, taskAssignments, customRoles,
    prepItems, scheduledPreps, prepSelections, storeItems,
    inventoryDailyItems, inventoryWeeklyItems, inventoryMonthlyItems,
    inventoryDatabaseItems, inventoryActivityLog
  ]);

  // Refresh all data from remote
  const refreshAllData = useCallback(async () => {
    if (!syncService.current) return;

    try {
      const data = await syncService.current.refreshAllData();
      
      // Update all local state with fresh data
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
      
      console.log('✅ Data refresh completed');
    } catch (error) {
      console.error('❌ Data refresh failed:', error);
      throw error;
    }
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

    // Operations
    quickSave,
    legacyQuickSave,
    refreshAllData,

    // Status
    syncState,
    activeDevices
  };
}