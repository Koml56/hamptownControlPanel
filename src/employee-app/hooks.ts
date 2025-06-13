// hooks.ts - Enhanced with multi-device sync
import { useState, useEffect, useCallback, useRef } from 'react';
import { FirebaseService } from './firebaseService';
import { MultiDeviceSyncService, type DeviceInfo, type SyncEvent } from './multiDeviceSync';
import { getFormattedDate } from './utils';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData } from './defaultData';
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

// Миграция данных
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

// Daily reset functionality
const checkAndResetDailyTasks = (
  completedTasks: Set<number>,
  taskAssignments: TaskAssignments,
  setCompletedTasks: (tasks: Set<number>) => void,
  setTaskAssignments: (updater: (prev: TaskAssignments) => TaskAssignments) => void,
  quickSave: (field: string, data: any) => Promise<void>
): boolean => {
  const today = getFormattedDate(new Date());
  const lastResetDate = localStorage.getItem('lastTaskResetDate');
  
  console.log('🔍 Checking daily task reset:', { 
    today, 
    lastResetDate, 
    currentTasksCount: completedTasks.size,
    currentAssignmentsCount: Object.keys(taskAssignments).length,
    needsReset: lastResetDate !== today && (completedTasks.size > 0 || Object.keys(taskAssignments).length > 0)
  });
  
  if (lastResetDate !== today && (completedTasks.size > 0 || Object.keys(taskAssignments).length > 0)) {
    const resetInProgress = localStorage.getItem('resetInProgress');
    if (resetInProgress === today) {
      console.log('⏸️ Reset already in progress for today, skipping');
      return false;
    }
    
    console.log('🔄 DAILY RESET: Clearing completed tasks AND task assignments for new day');
    
    localStorage.setItem('resetInProgress', today);
    
    const emptySet = new Set<number>();
    const emptyAssignments = {};
    
    setCompletedTasks(emptySet);
    setTaskAssignments(() => emptyAssignments);
    localStorage.setItem('lastTaskResetDate', today);
    
    console.log('✅ After daily reset: All tasks unmarked and unassigned');
    
    setTimeout(async () => {
      try {
        await Promise.all([
          quickSave('completedTasks', []),
          quickSave('taskAssignments', {})
        ]);
        console.log('✅ DAILY RESET: Both completedTasks AND taskAssignments saved to Firebase');
        localStorage.removeItem('resetInProgress');
      } catch (error) {
        console.error('❌ Failed to save reset to Firebase:', error);
        localStorage.removeItem('resetInProgress');
      }
    }, 500);
    
    return true;
  }
  
  if (!lastResetDate) {
    localStorage.setItem('lastTaskResetDate', today);
    console.log('📅 Set initial reset date:', today);
  }
  
  return false;
};

export const useFirebaseData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  // Multi-device sync state
  const [activeDevices, setActiveDevices] = useState<DeviceInfo[]>([]);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [deviceCount, setDeviceCount] = useState(1);
  const [isMultiDeviceEnabled, setIsMultiDeviceEnabled] = useState(true);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyData, setDailyData] = useState<DailyDataMap>({});
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignments>({});
  const [customRoles, setCustomRoles] = useState<string[]>(['Cleaner', 'Manager', 'Supervisor']);

  // New prep list state
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [scheduledPreps, setScheduledPreps] = useState<ScheduledPrep[]>([]);
  const [prepSelections, setPrepSelections] = useState<PrepSelections>({});
  
  // Store items state
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);

  const firebaseService = new FirebaseService();
  const multiDeviceSyncRef = useRef<MultiDeviceSyncService | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');

  // Initialize multi-device sync
  useEffect(() => {
    if (isMultiDeviceEnabled && !multiDeviceSyncRef.current) {
      console.log('🔄 Initializing multi-device sync...');
      
      multiDeviceSyncRef.current = new MultiDeviceSyncService('Current User');
      
      // Setup sync callbacks
      const syncService = multiDeviceSyncRef.current;
      
      // Subscribe to field changes
      syncService.onFieldChange('employees', (data) => {
        console.log('📥 Received employees update from another device');
        if (data && Array.isArray(data)) {
          setEmployees(migrateEmployeeData(data));
        }
      });
      
      syncService.onFieldChange('tasks', (data) => {
        console.log('📥 Received tasks update from another device');
        if (data && Array.isArray(data)) {
          setTasks(migrateTaskData(data));
        }
      });
      
      syncService.onFieldChange('completedTasks', (data) => {
        console.log('📥 Received completedTasks update from another device');
        if (data && Array.isArray(data)) {
          setCompletedTasks(new Set(data));
        }
      });
      
      syncService.onFieldChange('taskAssignments', (data) => {
        console.log('📥 Received taskAssignments update from another device');
        if (data && typeof data === 'object') {
          setTaskAssignments(data);
        }
      });
      
      syncService.onFieldChange('dailyData', (data) => {
        console.log('📥 Received dailyData update from another device');
        if (data && typeof data === 'object') {
          setDailyData(data);
        }
      });
      
      syncService.onFieldChange('prepItems', (data) => {
        console.log('📥 Received prepItems update from another device');
        if (data && Array.isArray(data)) {
          setPrepItems(data);
        }
      });
      
      syncService.onFieldChange('scheduledPreps', (data) => {
        console.log('📥 Received scheduledPreps update from another device');
        if (data && Array.isArray(data)) {
          setScheduledPreps(data);
        }
      });
      
      syncService.onFieldChange('storeItems', (data) => {
        console.log('📥 Received storeItems update from another device');
        if (data && Array.isArray(data)) {
          setStoreItems(data);
        }
      });
      
      // Setup device count callback
      syncService.onDeviceCountChanged((count) => {
        console.log(`📱 Device count changed: ${count}`);
        setDeviceCount(count);
        // Update active devices list
        syncService.getActiveDevices().then(setActiveDevices);
      });
      
      // Setup sync event callback
      syncService.onSyncEventReceived((event) => {
        console.log('🔄 Sync event received:', event);
        setSyncEvents(prev => [...prev.slice(-19), event]); // Keep last 20 events
        
        // Show sync pulse effect
        if (event.type === 'data_update') {
          setLastSync(new Date().toLocaleTimeString());
        }
      });
      
      // Connect to sync service
      syncService.connect().catch(console.error);
    }
    
    return () => {
      if (multiDeviceSyncRef.current) {
        multiDeviceSyncRef.current.disconnect();
        multiDeviceSyncRef.current = null;
      }
    };
  }, [isMultiDeviceEnabled]);

  // Quick save function for individual fields
  const quickSave = useCallback(async (field: string, data: any) => {
    if (connectionStatus !== 'connected') return;
    
    try {
      const baseUrl = 'https://hamptown-panel-default-rtdb.firebaseio.com';
      await fetch(`${baseUrl}/${field}.json`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      console.log(`✅ Quick saved ${field}`);
      
      // Sync to other devices if multi-device is enabled
      if (isMultiDeviceEnabled && multiDeviceSyncRef.current) {
        await multiDeviceSyncRef.current.syncData(field, data);
      }
      
    } catch (error) {
      console.error(`❌ Quick save failed for ${field}:`, error);
    }
  }, [connectionStatus, isMultiDeviceEnabled]);

  // Enhanced save function with multi-device sync
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

    console.log('🔄 Saving data to Firebase with multi-device sync...');

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
      
      // Sync all fields to other devices
      if (isMultiDeviceEnabled && multiDeviceSyncRef.current) {
        const syncPromises = [
          multiDeviceSyncRef.current.syncData('employees', employees),
          multiDeviceSyncRef.current.syncData('tasks', tasks),
          multiDeviceSyncRef.current.syncData('dailyData', dailyData),
          multiDeviceSyncRef.current.syncData('completedTasks', Array.from(completedTasks)),
          multiDeviceSyncRef.current.syncData('taskAssignments', taskAssignments),
          multiDeviceSyncRef.current.syncData('customRoles', customRoles),
          multiDeviceSyncRef.current.syncData('prepItems', prepItems),
          multiDeviceSyncRef.current.syncData('scheduledPreps', scheduledPreps),
          multiDeviceSyncRef.current.syncData('prepSelections', prepSelections),
          multiDeviceSyncRef.current.syncData('storeItems', storeItems)
        ];
        
        await Promise.all(syncPromises);
        console.log('📤 All data synced to other devices');
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

  const saveToFirebase = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 2000);
  }, [debouncedSave]);

  const loadFromFirebase = useCallback(async () => {
    if (isLoading) {
      console.log('⏸️ Load already in progress, skipping');
      return;
    }

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

      // Load prep list data
      setPrepItems(data.prepItems || []);
      setScheduledPreps(data.scheduledPreps || []);
      setPrepSelections(data.prepSelections || {});
      
      // Load store items
      setStoreItems(data.storeItems || []);

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

      // Check for daily reset after loading data
      const hasAlreadyCheckedToday = localStorage.getItem('resetCheckedToday');
      const today = getFormattedDate(new Date());
      
      if (hasAlreadyCheckedToday !== today) {
        setTimeout(() => {
          const wasReset = checkAndResetDailyTasks(
            new Set(data.completedTasks), 
            data.taskAssignments, 
            setCompletedTasks, 
            setTaskAssignments, 
            quickSave
          );
          if (wasReset || hasAlreadyCheckedToday !== today) {
            localStorage.setItem('resetCheckedToday', today);
          }
        }, 1000);
      }

    } catch (error) {
      setConnectionStatus('error');

      setEmployees(getDefaultEmployees());
      setTasks(getDefaultTasks());
      setDailyData(getEmptyDailyData());
      setPrepItems([]);
      setScheduledPreps([]);
      setPrepSelections({});
      setStoreItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, quickSave]);

  // Toggle multi-device sync
  const toggleMultiDeviceSync = useCallback(() => {
    setIsMultiDeviceEnabled(prev => !prev);
    console.log(`🔄 Multi-device sync ${!isMultiDeviceEnabled ? 'enabled' : 'disabled'}`);
  }, [isMultiDeviceEnabled]);

  // Force refresh from all devices
  const refreshFromAllDevices = useCallback(async () => {
    if (multiDeviceSyncRef.current) {
      await multiDeviceSyncRef.current.refreshDataFromAllDevices();
    }
  }, []);

  // Save to Firebase when data changes
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      saveToFirebase();
    }, 1000);
    
    return () => clearTimeout(saveTimer);
  }, [employees, tasks, dailyData, taskAssignments, customRoles, prepItems, scheduledPreps, prepSelections, storeItems]);

  // Handle completedTasks changes separately
  useEffect(() => {
    const lastResetDate = localStorage.getItem('lastTaskResetDate');
    const today = getFormattedDate(new Date());
    const isResetDay = lastResetDate === today && completedTasks.size === 0;
    
    if (!isResetDay) {
      const saveTimer = setTimeout(() => {
        quickSave('completedTasks', Array.from(completedTasks));
      }, 2000);
      
      return () => clearTimeout(saveTimer);
    }
  }, [completedTasks, quickSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
    setPrepItems,
    setScheduledPreps,
    setPrepSelections,
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
    
    // Update multi-device sync user if available
    // This could be passed down from the main hook if needed
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
