// hooks.ts - Complete implementation with fixed multi-device sync
import { useState, useEffect, useCallback, useRef } from 'react';
import { FirebaseService } from './firebaseService';
import { MultiDeviceSyncService } from './multiDeviceSync';
import { getFormattedDate } from './utils';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
import type { DeviceInfo, SyncEvent } from './multiDeviceSync';
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
  
  // Multi-device sync data
  const [activeDevices, setActiveDevices] = useState<DeviceInfo[]>([]);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [deviceCount, setDeviceCount] = useState<number>(1);
  const [isMultiDeviceEnabled, setIsMultiDeviceEnabled] = useState<boolean>(false);

  const firebaseService = new FirebaseService();
  const multiDeviceSyncRef = useRef<MultiDeviceSyncService | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const devicePollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize multi-device sync service
  useEffect(() => {
    if (!multiDeviceSyncRef.current) {
      multiDeviceSyncRef.current = new MultiDeviceSyncService('Current User');
      
      // Setup callbacks
      multiDeviceSyncRef.current.onDeviceCountChanged((count) => {
        console.log('📱 Device count changed:', count);
        setDeviceCount(count);
      });

      multiDeviceSyncRef.current.onSyncEventReceived((event) => {
        console.log('📡 Sync event received:', event);
        setSyncEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
      });

      // Setup field change listeners for real-time sync
      multiDeviceSyncRef.current.onFieldChange('employees', (data) => {
        if (data) {
          console.log('📥 Received employees update from another device');
          setEmployees(migrateEmployeeData(data));
        }
      });

      multiDeviceSyncRef.current.onFieldChange('tasks', (data) => {
        if (data) {
          console.log('📥 Received tasks update from another device');
          setTasks(migrateTaskData(data));
        }
      });

      multiDeviceSyncRef.current.onFieldChange('completedTasks', (data) => {
        if (data) {
          console.log('📥 Received completed tasks update from another device');
          setCompletedTasks(new Set(data));
        }
      });

      multiDeviceSyncRef.current.onFieldChange('taskAssignments', (data) => {
        if (data) {
          console.log('📥 Received task assignments update from another device');
          setTaskAssignments(data);
        }
      });

      multiDeviceSyncRef.current.onFieldChange('dailyData', (data) => {
        if (data) {
          console.log('📥 Received daily data update from another device');
          setDailyData(data);
        }
      });

      multiDeviceSyncRef.current.onFieldChange('prepItems', (data) => {
        if (data) {
          console.log('📥 Received prep items update from another device');
          setPrepItems(data);
        }
      });

      multiDeviceSyncRef.current.onFieldChange('scheduledPreps', (data) => {
        if (data) {
          console.log('📥 Received scheduled preps update from another device');
          setScheduledPreps(data);
        }
      });

      multiDeviceSyncRef.current.onFieldChange('prepSelections', (data) => {
        if (data) {
          console.log('📥 Received prep selections update from another device');
          setPrepSelections(data);
        }
      });

      multiDeviceSyncRef.current.onFieldChange('storeItems', (data) => {
        if (data) {
          console.log('📥 Received store items update from another device');
          setStoreItems(data);
        }
      });
    }
  }, []);

  // Add sync event when data changes
  const addSyncEvent = useCallback((action: string) => {
    if (isMultiDeviceEnabled) {
      const event: SyncEvent = {
        type: 'data_update',
        deviceId: multiDeviceSyncRef.current?.getDeviceInfo().id || 'unknown',
        timestamp: Date.now(),
        data: { action }
      };
      setSyncEvents(prev => [event, ...prev.slice(0, 9)]);
    }
  }, [isMultiDeviceEnabled]);

  // QuickSave function with sync animation
  const quickSave = useCallback(async (field: string, data: any) => {
    console.log('🔥 QuickSave triggered for:', field);
    
    setIsLoading(true);
    
    try {
      const baseUrl = 'https://hamptown-panel-default-rtdb.firebaseio.com';
      
      const response = await fetch(`${baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Firebase save failed: ${response.status} ${response.statusText}`);
      }
      
      setLastSync(new Date().toLocaleTimeString());
      setConnectionStatus('connected');
      
      // Sync to other devices if multi-device is enabled
      if (isMultiDeviceEnabled && multiDeviceSyncRef.current) {
        await multiDeviceSyncRef.current.syncData(field, data);
      }
      
      addSyncEvent(`sync-${field}`);
      
      console.log('✅ QuickSave completed successfully for:', field);
      
    } catch (error) {
      console.error('❌ QuickSave failed:', error);
      setConnectionStatus('error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [addSyncEvent, isMultiDeviceEnabled]);

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
      
      // Sync all data to other devices if multi-device is enabled
      if (isMultiDeviceEnabled && multiDeviceSyncRef.current) {
        await Promise.all([
          multiDeviceSyncRef.current.syncData('employees', employees),
          multiDeviceSyncRef.current.syncData('tasks', tasks),
          multiDeviceSyncRef.current.syncData('dailyData', dailyData),
          multiDeviceSyncRef.current.syncData('completedTasks', Array.from(completedTasks)),
          multiDeviceSyncRef.current.syncData('taskAssignments', taskAssignments),
          multiDeviceSyncRef.current.syncData('prepItems', prepItems),
          multiDeviceSyncRef.current.syncData('scheduledPreps', scheduledPreps),
          multiDeviceSyncRef.current.syncData('prepSelections', prepSelections),
          multiDeviceSyncRef.current.syncData('storeItems', storeItems)
        ]);
      }
      
      addSyncEvent('full-sync');
      
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
    addSyncEvent,
    isMultiDeviceEnabled
  ]);

  // Main save function with debouncing
  const saveToFirebase = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 2000);
  }, [debouncedSave]);

  // Load from Firebase
  const loadFromFirebase = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      const data = await firebaseService.loadData();

      const finalEmployees = migrateEmployeeData(data.employees);
      const finalTasks = migrateTaskData(data.tasks);

      setEmployees(finalEmployees);
      setTasks(finalTasks);
      setDailyData(data.dailyData);
      setCompletedTasks(new Set(data.completedTasks));
      setTaskAssignments(data.taskAssignments);
      setCustomRoles(data.customRoles);
      setPrepItems(data.prepItems || []);
      setScheduledPreps(data.scheduledPreps || []);
      setPrepSelections(data.prepSelections || {});
      setStoreItems(data.storeItems || getDefaultStoreItems());

      setConnectionStatus('connected');
      setLastSync(new Date().toLocaleTimeString());

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

    } catch (error) {
      setConnectionStatus('error');
      // Set defaults on error
      setEmployees(getDefaultEmployees());
      setTasks(getDefaultTasks());
      setDailyData(getEmptyDailyData());
      setPrepItems([]);
      setScheduledPreps([]);
      setPrepSelections({});
      setStoreItems(getDefaultStoreItems());
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Auto-save when main data changes
  useEffect(() => {
    saveToFirebase();
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles]);

  // Auto-save when PrepList data changes
  useEffect(() => {
    saveToFirebase();
  }, [prepItems, scheduledPreps, prepSelections, storeItems]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (devicePollIntervalRef.current) {
        clearInterval(devicePollIntervalRef.current);
      }
      // Disconnect multi-device sync
      if (multiDeviceSyncRef.current) {
        multiDeviceSyncRef.current.disconnect();
      }
    };
  }, []);

  // Poll active devices when multi-device sync is enabled
  const pollActiveDevices = useCallback(async () => {
    if (!isMultiDeviceEnabled || !multiDeviceSyncRef.current) return;
    
    try {
      const devices = await multiDeviceSyncRef.current.getActiveDevices();
      console.log('📱 Polling devices - found:', devices.length);
      setActiveDevices(devices);
      setDeviceCount(devices.length);
    } catch (error) {
      console.error('❌ Error polling devices:', error);
    }
  }, [isMultiDeviceEnabled]);

  // Multi-device sync functions
  const toggleMultiDeviceSync = useCallback(async () => {
    const newEnabled = !isMultiDeviceEnabled;
    console.log('🔄 Toggling multi-device sync:', newEnabled);
    setIsMultiDeviceEnabled(newEnabled);
    
    if (newEnabled && multiDeviceSyncRef.current) {
      try {
        // Connect to multi-device sync
        await multiDeviceSyncRef.current.connect();
        console.log('✅ Multi-device sync connected');
        
        // Get initial device list
        const devices = await multiDeviceSyncRef.current.getActiveDevices();
        console.log('📱 Initial active devices found:', devices);
        setActiveDevices(devices);
        setDeviceCount(devices.length);
        
        // Start polling for device updates every 30 seconds
        devicePollIntervalRef.current = setInterval(pollActiveDevices, 30000);
        
        // Also poll immediately
        pollActiveDevices();
        
      } catch (error) {
        console.error('❌ Failed to enable multi-device sync:', error);
        setIsMultiDeviceEnabled(false);
      }
    } else if (multiDeviceSyncRef.current) {
      try {
        // Clear polling interval
        if (devicePollIntervalRef.current) {
          clearInterval(devicePollIntervalRef.current);
          devicePollIntervalRef.current = null;
        }
        
        // Disconnect from multi-device sync
        await multiDeviceSyncRef.current.disconnect();
        console.log('📱 Multi-device sync disconnected');
        setActiveDevices([]);
        setDeviceCount(1);
      } catch (error) {
        console.error('❌ Failed to disable multi-device sync:', error);
      }
    }
  }, [isMultiDeviceEnabled, pollActiveDevices]);

  const refreshFromAllDevices = useCallback(async () => {
    if (multiDeviceSyncRef.current && isMultiDeviceEnabled) {
      console.log('🔄 Refreshing data from all devices...');
      await multiDeviceSyncRef.current.refreshDataFromAllDevices();
    } else {
      // Fallback to regular Firebase load
      console.log('🔄 Refreshing data from Firebase...');
      loadFromFirebase();
    }
  }, [loadFromFirebase, isMultiDeviceEnabled]);

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
