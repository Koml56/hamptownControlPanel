// hooks.ts - Updated with multi-device sync enabled by default
import { useState, useEffect, useCallback, useRef } from 'react';
import { FirebaseService } from './firebaseService';
import { MultiDeviceSyncService, type DeviceInfo, type SyncEvent } from './multiDeviceSync';
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
  StoreItem
} from './types';

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

// Helper function to get initial multi-device sync state
const getInitialSyncState = (): boolean => {
  // Check localStorage for user preference
  const savedPreference = localStorage.getItem('workVibe_multiDeviceSyncEnabled');
  
  if (savedPreference !== null) {
    return savedPreference === 'true';
  }
  
  // Default to enabled for new users
  return true;
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
  
  // Multi-device sync data - NOW ENABLED BY DEFAULT
  const [activeDevices, setActiveDevices] = useState<DeviceInfo[]>([]);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [deviceCount, setDeviceCount] = useState<number>(1);
  const [isMultiDeviceEnabled, setIsMultiDeviceEnabled] = useState<boolean>(getInitialSyncState());

  const firebaseService = new FirebaseService();
  const syncServiceRef = useRef<MultiDeviceSyncService | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const isInitializedRef = useRef<boolean>(false);

  // Initialize multi-device sync service immediately
  useEffect(() => {
    if (!syncServiceRef.current) {
      const userName = localStorage.getItem('currentUserName') || 'Unknown User';
      syncServiceRef.current = new MultiDeviceSyncService(userName);
      
      console.log('🔄 Multi-device sync service initialized', {
        enabled: isMultiDeviceEnabled,
        user: userName
      });
      
      // Setup sync event listener
      syncServiceRef.current.onSyncEventReceived((event: SyncEvent) => {
        console.log('🔄 Sync event received:', event);
        setSyncEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
        
        // Show loading animation for short time
        if (event.type === 'data_update' || event.type === 'full_sync') {
          setIsLoading(true);
          setTimeout(() => setIsLoading(false), 500);
        }
      });

      // Setup device count change listener
      syncServiceRef.current.onDeviceCountChanged((count: number, devices: DeviceInfo[]) => {
        console.log(`📱 Device count changed: ${count} devices`, devices);
        setDeviceCount(count);
        setActiveDevices(devices);
      });

      // Auto-connect if multi-device sync is enabled
      if (isMultiDeviceEnabled) {
        console.log('🚀 Auto-connecting multi-device sync...');
        syncServiceRef.current.connect().catch(error => {
          console.error('❌ Failed to auto-connect sync service:', error);
        });
      }
    }
  }, []); // Empty dependency - only run once on mount

  // Setup real-time sync listeners when multi-device is enabled
  useEffect(() => {
    if (!isMultiDeviceEnabled || !syncServiceRef.current) return;

    console.log('🔗 Setting up real-time sync listeners...');
    const syncService = syncServiceRef.current;

    // Setup listeners for all data fields
    syncService.onFieldChange('employees', (data: Employee[]) => {
      console.log('📥 Received employees update from sync');
      if (data && Array.isArray(data)) {
        setEmployees(migrateEmployeeData(data));
      }
    });

    syncService.onFieldChange('tasks', (data: Task[]) => {
      console.log('📥 Received tasks update from sync');
      if (data && Array.isArray(data)) {
        setTasks(migrateTaskData(data));
      }
    });

    syncService.onFieldChange('dailyData', (data: DailyDataMap) => {
      console.log('📥 Received dailyData update from sync');
      if (data && typeof data === 'object') {
        setDailyData(data);
      }
    });

    syncService.onFieldChange('completedTasks', (data: Set<number> | number[]) => {
      console.log('📥 Received completedTasks update from sync');
      if (data) {
        setCompletedTasks(data instanceof Set ? data : new Set(data));
      }
    });

    syncService.onFieldChange('taskAssignments', (data: TaskAssignments) => {
      console.log('📥 Received taskAssignments update from sync');
      if (data && typeof data === 'object') {
        setTaskAssignments(data);
      }
    });

    syncService.onFieldChange('customRoles', (data: string[]) => {
      console.log('📥 Received customRoles update from sync');
      if (data && Array.isArray(data)) {
        setCustomRoles(data);
      }
    });

    syncService.onFieldChange('prepItems', (data: PrepItem[]) => {
      console.log('📥 Received prepItems update from sync');
      if (data && Array.isArray(data)) {
        setPrepItems(data);
      }
    });

    syncService.onFieldChange('scheduledPreps', (data: ScheduledPrep[]) => {
      console.log('📥 Received scheduledPreps update from sync');
      if (data && Array.isArray(data)) {
        setScheduledPreps(data);
      }
    });

    syncService.onFieldChange('prepSelections', (data: PrepSelections) => {
      console.log('📥 Received prepSelections update from sync');
      if (data && typeof data === 'object') {
        setPrepSelections(data);
      }
    });

    syncService.onFieldChange('storeItems', (data: StoreItem[]) => {
      console.log('📥 Received storeItems update from sync');
      if (data && Array.isArray(data)) {
        setStoreItems(data);
      }
    });

    // Connect to sync service if not already connected
    if (!syncService.getSyncStats().isConnected) {
      syncService.connect().catch(error => {
        console.error('❌ Failed to connect sync service:', error);
      });
    }

    // Cleanup on disable
    return () => {
      console.log('🔌 Cleaning up sync listeners...');
      syncService.disconnect().catch(error => {
        console.error('❌ Error disconnecting sync:', error);
      });
    };
  }, [isMultiDeviceEnabled]);

  // Save multi-device sync preference to localStorage
  useEffect(() => {
    localStorage.setItem('workVibe_multiDeviceSyncEnabled', isMultiDeviceEnabled.toString());
    console.log('💾 Saved multi-device sync preference:', isMultiDeviceEnabled);
  }, [isMultiDeviceEnabled]);

  // Quick save function with sync
  const quickSave = useCallback(async (field: string, data: any) => {
    console.log('🔥 QuickSave triggered for:', field);
    
    setIsLoading(true);
    
    try {
      // Firebase save operation
      const baseUrl = 'https://hamptown-panel-default-rtdb.firebaseio.com';
      
      // Convert Set to Array for serialization
      let saveData = data;
      if (data instanceof Set) {
        saveData = Array.from(data);
      }
      
      const response = await fetch(`${baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData)
      });

      if (!response.ok) {
        throw new Error(`Firebase save failed: ${response.status} ${response.statusText}`);
      }
      
      setLastSync(new Date().toLocaleTimeString());
      setConnectionStatus('connected');
      
      // Sync to other devices if multi-device is enabled
      if (isMultiDeviceEnabled && syncServiceRef.current) {
        await syncServiceRef.current.syncData(field, saveData);
      }
      
      console.log('✅ QuickSave completed successfully for:', field);
      
    } catch (error) {
      console.error('❌ QuickSave failed:', error);
      setConnectionStatus('error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isMultiDeviceEnabled]);

  // Debounced save function for main data
  const debouncedSave = useCallback(async () => {
    if (connectionStatus !== 'connected' || isLoading) {
      return;
    }

    const currentDataHash = JSON.stringify({
      employees: employees.length,
      tasks: tasks.length,
      dailyDataHash: JSON.stringify(dailyData),
      completedTasksSize: completedTasks.size,
      taskAssignmentsKeys: Object.keys(taskAssignments).length,
      customRolesLength: customRoles.length,
      prepItemsLength: prepItems.length,
      scheduledPrepsLength: scheduledPreps.length,
      prepSelectionsKeys: Object.keys(prepSelections).length,
      storeItemsLength: storeItems.length
    });

    if (currentDataHash === lastSaveDataRef.current) {
      console.log('debouncedSave aborted: data hash unchanged');
      return;
    }

    console.log('🔄 Saving data to Firebase...');
    
    setIsLoading(true);
    try {
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
        storeItems
      });

      setLastSync(new Date().toLocaleTimeString());
      lastSaveDataRef.current = currentDataHash;
      
      // Sync all data to other devices if enabled
      if (isMultiDeviceEnabled && syncServiceRef.current) {
        try {
          await Promise.all([
            syncServiceRef.current.syncData('employees', employees),
            syncServiceRef.current.syncData('tasks', tasks),
            syncServiceRef.current.syncData('dailyData', dailyData),
            syncServiceRef.current.syncData('completedTasks', Array.from(completedTasks)),
            syncServiceRef.current.syncData('taskAssignments', taskAssignments),
            syncServiceRef.current.syncData('customRoles', customRoles),
            syncServiceRef.current.syncData('prepItems', prepItems),
            syncServiceRef.current.syncData('scheduledPreps', scheduledPreps),
            syncServiceRef.current.syncData('prepSelections', prepSelections),
            syncServiceRef.current.syncData('storeItems', storeItems)
          ]);
          console.log('✅ All data synced to other devices');
        } catch (syncError) {
          console.error('⚠️ Sync to other devices failed, but data saved to Firebase:', syncError);
        }
      }
      
    } catch (error) {
      console.error('Save failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [
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
    connectionStatus,
    isLoading,
    isMultiDeviceEnabled
  ]);

  // Main save function with debouncing
  const saveToFirebase = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 100);
  }, [debouncedSave]);

  // Load from Firebase with initial setup
  const loadFromFirebase = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      // Load main data
      const data = await firebaseService.loadData();

      const finalEmployees = migrateEmployeeData(data.employees);
      const finalTasks = migrateTaskData(data.tasks);

      setEmployees(finalEmployees);
      setTasks(finalTasks);
      setDailyData(data.dailyData);
      setCompletedTasks(new Set(data.completedTasks));
      setTaskAssignments(data.taskAssignments);
      setCustomRoles(data.customRoles);

      // Load additional data
      setPrepItems(data.prepItems || []);
      setScheduledPreps(data.scheduledPreps || []);
      setPrepSelections(data.prepSelections || {});
      setStoreItems(data.storeItems || getDefaultStoreItems());

      setConnectionStatus('connected');
      setLastSync(new Date().toLocaleTimeString());

      // Update data hash
      const dataHash = JSON.stringify({
        employees: finalEmployees.length,
        tasks: finalTasks.length,
        dailyDataKeys: Object.keys(data.dailyData).length,
        completedTasksSize: data.completedTasks.size,
        taskAssignmentsKeys: Object.keys(data.taskAssignments).length,
        customRolesLength: data.customRoles.length,
        prepItemsLength: (data.prepItems || []).length,
        scheduledPrepsLength: (data.scheduledPreps || []).length,
        prepSelectionsKeys: Object.keys(data.prepSelections || {}).length,
        storeItemsLength: (data.storeItems || []).length
      });
      lastSaveDataRef.current = dataHash;
      isInitializedRef.current = true;

      // Auto-sync initial data if multi-device is enabled
      if (isMultiDeviceEnabled && syncServiceRef.current) {
        console.log('🔄 Auto-syncing initial data to other devices...');
        try {
          await Promise.all([
            syncServiceRef.current.syncData('employees', finalEmployees),
            syncServiceRef.current.syncData('tasks', finalTasks),
            syncServiceRef.current.syncData('dailyData', data.dailyData),
            syncServiceRef.current.syncData('completedTasks', Array.from(data.completedTasks)),
            syncServiceRef.current.syncData('taskAssignments', data.taskAssignments),
            syncServiceRef.current.syncData('customRoles', data.customRoles)
          ]);
          console.log('✅ Initial data synced to other devices');
        } catch (syncError) {
          console.error('⚠️ Failed to sync initial data to other devices:', syncError);
        }
      }

    } catch (error) {
      setConnectionStatus('error');

      // Set defaults on error
      if (!isInitializedRef.current) {
        setEmployees(getDefaultEmployees());
        setTasks(getDefaultTasks());
        setDailyData(getEmptyDailyData());
        setPrepItems([]);
        setScheduledPreps([]);
        setPrepSelections({});
        setStoreItems(getDefaultStoreItems());
        isInitializedRef.current = true;
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isMultiDeviceEnabled]);

  // Auto-save when main data changes (but only after initialization)
  useEffect(() => {
    if (isInitializedRef.current) {
      saveToFirebase();
    }
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles]);

  // Auto-save when additional data changes (but only after initialization)
  useEffect(() => {
    if (isInitializedRef.current) {
      saveToFirebase();
    }
  }, [prepItems, scheduledPreps, prepSelections, storeItems]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (syncServiceRef.current) {
        syncServiceRef.current.disconnect().catch(console.error);
      }
    };
  }, []);

  // Multi-device sync functions
  const toggleMultiDeviceSync = useCallback(async () => {
    const newState = !isMultiDeviceEnabled;
    setIsMultiDeviceEnabled(newState);
    
    if (newState) {
      console.log('✅ Multi-device sync enabled');
      // Connection will be handled by the useEffect above
    } else {
      console.log('❌ Multi-device sync disabled');
      if (syncServiceRef.current) {
        await syncServiceRef.current.disconnect();
      }
      setActiveDevices([]);
      setDeviceCount(1);
      setSyncEvents([]);
    }
  }, [isMultiDeviceEnabled]);

  const refreshFromAllDevices = useCallback(async () => {
    if (!isMultiDeviceEnabled || !syncServiceRef.current) {
      // Fallback to normal Firebase load
      await loadFromFirebase();
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔄 Refreshing from all devices...');
      
      const syncData = await syncServiceRef.current.refreshDataFromAllDevices();
      
      // Apply refreshed data
      if (syncData.employees) setEmployees(migrateEmployeeData(syncData.employees));
      if (syncData.tasks) setTasks(migrateTaskData(syncData.tasks));
      if (syncData.dailyData) setDailyData(syncData.dailyData);
      if (syncData.completedTasks) setCompletedTasks(new Set(syncData.completedTasks));
      if (syncData.taskAssignments) setTaskAssignments(syncData.taskAssignments);
      if (syncData.customRoles) setCustomRoles(syncData.customRoles);
      if (syncData.prepItems) setPrepItems(syncData.prepItems);
      if (syncData.scheduledPreps) setScheduledPreps(syncData.scheduledPreps);
      if (syncData.prepSelections) setPrepSelections(syncData.prepSelections);
      if (syncData.storeItems) setStoreItems(syncData.storeItems);
      
      setLastSync(new Date().toLocaleTimeString());
      
    } catch (error) {
      console.error('❌ Failed to refresh from all devices:', error);
      // Fallback to normal load
      await loadFromFirebase();
    } finally {
      setIsLoading(false);
    }
  }, [isMultiDeviceEnabled, loadFromFirebase]);

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
    
    // PrepList state
    prepItems,
    scheduledPreps,
    prepSelections,
    
    // Store state
    storeItems,
    
    // Multi-device sync state
    activeDevices,
    syncEvents,
    deviceCount,
    isMultiDeviceEnabled,

    // Setters
    setEmployees,
    setTasks,
    setDailyData,
    setCompletedTasks,
    setTaskAssignments,
    setCustomRoles,
    
    // PrepList setters
    setPrepItems,
    setScheduledPreps,
    setPrepSelections,
    
    // Store setters
    setStoreItems,

    // Actions
    loadFromFirebase,
    saveToFirebase,
    quickSave,
    
    // Multi-device sync actions
    toggleMultiDeviceSync,
    refreshFromAllDevices
  };
};

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({ id: 1, name: 'Luka' });
  const [isAdmin, setIsAdmin] = useState(false);

  const switchUser = useCallback((employee: Employee) => {
    setCurrentUser({ id: employee.id, name: employee.name });
    // Store current user name for sync service
    localStorage.setItem('currentUserName', employee.name);
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdmin(false);
  }, []);

  // Initialize current user name in localStorage
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
