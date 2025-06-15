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
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');

  // Add sync event when data changes (declare this first)
  const addSyncEvent = useCallback((action: string) => {
    // Temporarily disabled until SyncEvent type is resolved
    console.log('Sync event:', action);
    /*
    if (isMultiDeviceEnabled) {
      const event = {
        deviceId: 'device-' + Date.now(),
        timestamp: Date.now(),
        action: action
      } as SyncEvent;
      setSyncEvents(prev => [event, ...prev.slice(0, 9)]); // Keep only last 10 events
    }
    */
  }, [isMultiDeviceEnabled]);

  // 🎯 NEW: QuickSave function with sync animation
  const quickSave = useCallback(async (field: string, data: any) => {
    console.log('🔥 QuickSave triggered for:', field);
    
    // START SYNC ANIMATION
    setIsLoading(true);
    
    try {
      // Firebase save operation
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
      
      // UPDATE SYNC STATUS ON SUCCESS
      setLastSync(new Date().toLocaleTimeString());
      setConnectionStatus('connected');
      
      // Add sync event
      addSyncEvent(`sync-${field}`);
      
      console.log('✅ QuickSave completed successfully for:', field);
      
    } catch (error) {
      console.error('❌ QuickSave failed:', error);
      setConnectionStatus('error');
      throw error; // Re-throw so calling code can handle if needed
    } finally {
      // STOP SYNC ANIMATION
      setIsLoading(false);
    }
  }, [addSyncEvent]);

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
      
      // Add sync event for main save
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
    quickSave,
    addSyncEvent
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

      // Load PrepList data
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
  }, [isLoading]);

  // Auto-save when main data changes
  useEffect(() => {
    saveToFirebase();
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles]);

  // Auto-save when PrepList data changes (but don't use quickSave here to avoid double animation)
  useEffect(() => {
    saveToFirebase();
  }, [prepItems, scheduledPreps, prepSelections, storeItems]);

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
    const newEnabled = !isMultiDeviceEnabled;
    console.log('🔄 Toggling multi-device sync:', newEnabled);
    setIsMultiDeviceEnabled(newEnabled);
    
    if (newEnabled) {
      // Immediately create and set device when enabling
      const userAgent = navigator.userAgent;
      let deviceType = 'Desktop';
      let browserName = 'Unknown';
      
      // Detect device type
      if (/Mobile|Android|iPhone/.test(userAgent)) {
        deviceType = 'Mobile';
      } else if (/iPad|Tablet/.test(userAgent)) {
        deviceType = 'Tablet';
      }
      
      // Detect browser
      if (userAgent.includes('Chrome')) browserName = 'Chrome';
      else if (userAgent.includes('Firefox')) browserName = 'Firefox';
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browserName = 'Safari';
      else if (userAgent.includes('Edge')) browserName = 'Edge';
      
      const deviceName = `${deviceType} • ${browserName}`;
      
      const currentDevice: DeviceInfo = {
        id: 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        name: deviceName,
        lastSeen: Date.now(),
        user: 'Current User',
        platform: navigator.platform || 'Unknown',
        isActive: true
      };
      
      console.log('📱 Creating device:', currentDevice);
      setActiveDevices([currentDevice]);
      setDeviceCount(1);
    } else {
      console.log('📱 Clearing devices');
      setActiveDevices([]);
      setDeviceCount(1);
    }
  }, [isMultiDeviceEnabled]);

  const refreshFromAllDevices = useCallback(() => {
    // Force reload from Firebase
    loadFromFirebase();
  }, [loadFromFirebase]);

  // Mock device info with better names
  useEffect(() => {
    if (isMultiDeviceEnabled) {
      // Generate better device name
      const userAgent = navigator.userAgent;
      let deviceType = 'Desktop';
      let browserName = 'Unknown';
      
      // Detect device type
      if (/Mobile|Android|iPhone/.test(userAgent)) {
        deviceType = 'Mobile';
      } else if (/iPad|Tablet/.test(userAgent)) {
        deviceType = 'Tablet';
      }
      
      // Detect browser
      if (userAgent.includes('Chrome')) browserName = 'Chrome';
      else if (userAgent.includes('Firefox')) browserName = 'Firefox';
      else if (userAgent.includes('Safari')) browserName = 'Safari';
      else if (userAgent.includes('Edge')) browserName = 'Edge';
      
      const deviceName = `${deviceType} • ${browserName}`;
      
      const currentDevice: DeviceInfo = {
        id: 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        name: deviceName,
        lastSeen: Date.now(),
        user: 'Current User',
        platform: navigator.platform || 'Unknown',
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
    quickSave, // 🎯 NEW: QuickSave with sync animation
    
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
