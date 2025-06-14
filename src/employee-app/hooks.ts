// hooks.ts - Enhanced with session expiry protection
import { useState, useEffect, useCallback, useRef } from 'react';
import { FirebaseService } from './firebaseService';
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

// Session expiry detection hook
export const useSessionExpiry = () => {
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [tabWasHidden, setTabWasHidden] = useState(false);
  const hiddenStartTime = useRef<number | null>(null);
  
  const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden
        hiddenStartTime.current = Date.now();
        setTabWasHidden(true);
        console.log('👁️ Tab hidden - tracking inactivity');
      } else {
        // Tab became visible
        if (hiddenStartTime.current) {
          const hiddenDuration = Date.now() - hiddenStartTime.current;
          console.log(`👁️ Tab visible after ${Math.round(hiddenDuration / 1000)}s`);
          
          if (hiddenDuration > SESSION_TIMEOUT) {
            console.log('🚨 Session expired due to inactivity');
            setIsSessionValid(false);
          } else {
            setLastActivity(Date.now());
            setIsSessionValid(true);
          }
        }
        hiddenStartTime.current = null;
        setTabWasHidden(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also update activity on user interactions
    const updateActivity = () => {
      if (!document.hidden) {
        setLastActivity(Date.now());
        setIsSessionValid(true);
      }
    };
    
    // Listen for user activity
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, []);
  
  const invalidateSession = useCallback(() => {
    setIsSessionValid(false);
  }, []);
  
  const refreshSession = useCallback(() => {
    setIsSessionValid(true);
    setLastActivity(Date.now());
    hiddenStartTime.current = null;
    setTabWasHidden(false);
  }, []);
  
  return {
    isSessionValid,
    lastActivity,
    tabWasHidden,
    invalidateSession,
    refreshSession
  };
};

export const useFirebaseData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  // Session expiry protection
  const { isSessionValid, refreshSession } = useSessionExpiry();

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
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');

  // Add sync event when data changes
  const addSyncEvent = useCallback((action: string) => {
    console.log('Sync event:', action);
  }, [isMultiDeviceEnabled]);

  // Protected save operations - check session validity first
  const protectedOperation = useCallback(async (operation: () => Promise<void>, operationName: string) => {
    if (!isSessionValid) {
      console.warn(`🚨 ${operationName} blocked - session expired. Please refresh the page.`);
      throw new Error(`Session expired. Please refresh the page to continue.`);
    }
    
    try {
      await operation();
    } catch (error) {
      console.error(`❌ ${operationName} failed:`, error);
      throw error;
    }
  }, [isSessionValid]);

  // Enhanced QuickSave with session protection
  const quickSave = useCallback(async (field: string, data: any) => {
    return protectedOperation(async () => {
      console.log('🔥 QuickSave triggered for:', field);
      
      setIsLoading(true);
      
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
      addSyncEvent(`sync-${field}`);
      
      console.log('✅ QuickSave completed successfully for:', field);
    }, `QuickSave(${field})`).finally(() => {
      setIsLoading(false);
    });
  }, [protectedOperation, addSyncEvent]);

  // Enhanced debounced save with session protection
  const debouncedSave = useCallback(async () => {
    if (connectionStatus !== 'connected' || isLoading) {
      return;
    }

    // Session validity check before saving
    if (!isSessionValid) {
      console.warn('🚨 Save operation blocked - session expired');
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

    return protectedOperation(async () => {
      console.log('🔄 Saving data to Firebase...');
      
      setIsLoading(true);
      
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
      addSyncEvent('full-sync');
    }, 'debouncedSave').catch((error) => {
      console.error('Save failed:', error);
      setConnectionStatus('error');
    }).finally(() => {
      setIsLoading(false);
    });
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
    isSessionValid,
    protectedOperation,
    addSyncEvent
  ]);

  // Main save function with session protection
  const saveToFirebase = useCallback(() => {
    if (!isSessionValid) {
      console.warn('🚨 SaveToFirebase blocked - session expired');
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 100);
  }, [debouncedSave, isSessionValid]);

  // Load from Firebase with fresh session
  const loadFromFirebase = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      // Refresh session when loading fresh data
      refreshSession();
      
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
      const baseUrl = 'https://hamptown-panel-default-rtdb.firebaseio.com';
      
      const [prepItemsRes, scheduledPrepsRes, prepSelectionsRes, storeItemsRes] = await Promise.all([
        fetch(`${baseUrl}/prepItems.json`),
        fetch(`${baseUrl}/scheduledPreps.json`),
        fetch(`${baseUrl}/prepSelections.json`),
        fetch(`${baseUrl}/storeItems.json`)
      ]);

      const [prepItemsData, scheduledPrepsData, prepSelectionsData, storeItemsData] = await Promise.all([
        prepItemsRes.json(),
        scheduledPrepsRes.json(),
        prepSelectionsRes.json(),
        storeItemsRes.json()
      ]);

      setPrepItems(prepItemsData || []);
      setScheduledPreps(scheduledPrepsData || []);
      setPrepSelections(prepSelectionsData || {});
      setStoreItems(storeItemsData || getDefaultStoreItems());

      setConnectionStatus('connected');
      setLastSync(new Date().toLocaleTimeString());

      const dataHash = JSON.stringify({
        employees: finalEmployees.length,
        tasks: finalTasks.length,
        dailyDataKeys: Object.keys(data.dailyData).length,
        completedTasksSize: data.completedTasks.size,
        taskAssignmentsKeys: Object.keys(data.taskAssignments).length,
        customRolesLength: data.customRoles.length,
        prepItemsLength: (prepItemsData || []).length,
        scheduledPrepsLength: (scheduledPrepsData || []).length,
        prepSelectionsKeys: Object.keys(prepSelectionsData || {}).length,
        storeItemsLength: (storeItemsData || []).length
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
  }, [isLoading, refreshSession]);

  // Auto-save when data changes (with session protection)
  useEffect(() => {
    if (isSessionValid) {
      saveToFirebase();
    }
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles, saveToFirebase, isSessionValid]);

  // Auto-save when PrepList data changes (with session protection)
  useEffect(() => {
    if (isSessionValid) {
      saveToFirebase();
    }
  }, [prepItems, scheduledPreps, prepSelections, storeItems, saveToFirebase, isSessionValid]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Multi-device sync functions
  const toggleMultiDeviceSync = useCallback(() => {
    setIsMultiDeviceEnabled(prev => !prev);
  }, []);

  const refreshFromAllDevices = useCallback(() => {
    loadFromFirebase();
  }, [loadFromFirebase]);

  // Mock device info
  useEffect(() => {
    if (isMultiDeviceEnabled) {
      const currentDevice: DeviceInfo = {
        id: 'device-' + Date.now(),
        name: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop',
        lastSeen: Date.now(),
        user: 'Current User',
        platform: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
        isActive: true
      };
      setActiveDevices([currentDevice]);
      setDeviceCount(1);
    } else {
      setActiveDevices([]);
      setDeviceCount(1);
    }
  }, [isMultiDeviceEnabled]);

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
    
    // Session state
    isSessionValid,

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
    
    // Session actions
    refreshSession,
    
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
