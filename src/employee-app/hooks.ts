// hooks.ts - Enhanced with real-time multi-device synchronization
import { useState, useEffect, useCallback, useRef } from 'react';
import { FirebaseService } from './firebaseService';
import { getFormattedDate } from './utils';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
import type {
  Employee,
  Task,
  DailyDataMap,
  TaskAssignments,
  ConnectionStatus,
  CurrentUser,
  StoreItem
} from './types';

// Helper function to get today's completed tasks from daily data
const getTodayCompletedTasks = (dailyData: DailyDataMap): Set<number> => {
  const today = getFormattedDate(new Date());
  const todayData = dailyData[today];
  
  if (!todayData || !Array.isArray(todayData.completedTasks)) {
    return new Set<number>();
  }
  
  const completedTaskIds = todayData.completedTasks.map((completion: any) => completion.taskId);
  return new Set(completedTaskIds);
};

// Helper function to get today's task assignments from daily data
const getTodayTaskAssignments = (dailyData: DailyDataMap): TaskAssignments => {
  const today = getFormattedDate(new Date());
  const todayData = dailyData[today];
  
  if (!todayData || !Array.isArray(todayData.completedTasks)) {
    return {};
  }
  
  const assignments: TaskAssignments = {};
  todayData.completedTasks.forEach((completion: any) => {
    assignments[completion.taskId] = completion.employeeId;
  });
  
  return assignments;
};

export const useFirebaseData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [syncCount, setSyncCount] = useState(0); // Track sync events for UI feedback

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyData, setDailyData] = useState<DailyDataMap>({});
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignments>({});
  const [customRoles, setCustomRoles] = useState<string[]>(['Cleaner', 'Manager', 'Supervisor']);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [currentDate, setCurrentDate] = useState<string>(getFormattedDate(new Date()));

  const firebaseService = useRef(new FirebaseService());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const isReceivingUpdate = useRef(false); // Prevent save loops during real-time updates

  // Real-time sync callbacks
  const realtimeCallbacks = useCallback(() => ({
    onEmployeesUpdate: (newEmployees: Employee[]) => {
      console.log('📡 Real-time employees update received');
      isReceivingUpdate.current = true;
      setEmployees(newEmployees);
      setSyncCount(prev => prev + 1);
      setTimeout(() => { isReceivingUpdate.current = false; }, 100);
    },

    onTasksUpdate: (newTasks: Task[]) => {
      console.log('📡 Real-time tasks update received');
      isReceivingUpdate.current = true;
      setTasks(newTasks);
      setSyncCount(prev => prev + 1);
      setTimeout(() => { isReceivingUpdate.current = false; }, 100);
    },

    onDailyDataUpdate: (newDailyData: DailyDataMap) => {
      console.log('📡 Real-time daily data update received');
      isReceivingUpdate.current = true;
      setDailyData(newDailyData);
      
      // Update completed tasks and assignments for today
      const todayCompleted = getTodayCompletedTasks(newDailyData);
      const todayAssignments = getTodayTaskAssignments(newDailyData);
      setCompletedTasks(todayCompleted);
      setTaskAssignments(todayAssignments);
      
      setSyncCount(prev => prev + 1);
      setTimeout(() => { isReceivingUpdate.current = false; }, 100);
    },

    onCustomRolesUpdate: (newRoles: string[]) => {
      console.log('📡 Real-time custom roles update received');
      isReceivingUpdate.current = true;
      setCustomRoles(newRoles);
      setSyncCount(prev => prev + 1);
      setTimeout(() => { isReceivingUpdate.current = false; }, 100);
    },

    onStoreItemsUpdate: (newStoreItems: StoreItem[]) => {
      console.log('📡 Real-time store items update received');
      isReceivingUpdate.current = true;
      setStoreItems(newStoreItems);
      setSyncCount(prev => prev + 1);
      setTimeout(() => { isReceivingUpdate.current = false; }, 100);
    },

    onConnectionChange: (status: 'connected' | 'disconnected' | 'error') => {
      console.log(`📡 Connection status changed: ${status}`);
      setConnectionStatus(status === 'disconnected' ? 'error' : 'connected');
    }
  }), []);

  // Setup real-time listeners
  useEffect(() => {
    console.log('🚀 Setting up real-time synchronization...');
    firebaseService.current.setupRealtimeListeners(realtimeCallbacks());

    // Cleanup listeners on unmount
    return () => {
      firebaseService.current.cleanup();
    };
  }, [realtimeCallbacks]);

  // Check for date change and reset daily tasks
  useEffect(() => {
    const checkDateChange = () => {
      const today = getFormattedDate(new Date());
      
      if (currentDate !== today) {
        console.log(`📅 Date changed from ${currentDate} to ${today} - resetting daily tasks`);
        
        setCurrentDate(today);
        
        const todayCompleted = getTodayCompletedTasks(dailyData);
        const todayAssignments = getTodayTaskAssignments(dailyData);
        
        setCompletedTasks(todayCompleted);
        setTaskAssignments(todayAssignments);
        
        console.log(`✅ Reset complete - ${todayCompleted.size} tasks completed today`);
      }
    };

    checkDateChange();
    const interval = setInterval(checkDateChange, 60000);
    return () => clearInterval(interval);
  }, [currentDate, dailyData]);

  // Debounced save function (only when not receiving updates)
  const debouncedSave = useCallback(async () => {
    if (connectionStatus !== 'connected' || isLoading || isReceivingUpdate.current) {
      return;
    }

    const currentDataHash = JSON.stringify({
      employees: employees.length,
      tasks: tasks.length,
      dailyDataHash: JSON.stringify(dailyData),
      customRolesLength: customRoles.length,
      storeItemsLength: storeItems.length
    });

    if (currentDataHash === lastSaveDataRef.current) {
      return;
    }

    console.log('🔄 Saving data to Firebase (will sync to other devices)...');
    setIsLoading(true);

    try {
      await firebaseService.current.saveData({
        employees,
        tasks,
        dailyData,
        customRoles,
        storeItems
      });

      setLastSync(new Date().toLocaleTimeString());
      lastSaveDataRef.current = currentDataHash;
      console.log('✅ Data saved and synced to all devices');
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
    customRoles,
    storeItems,
    connectionStatus,
    isLoading
  ]);

  // Save with debounce
  const saveToFirebase = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 1000); // Reduced delay for better real-time experience
  }, [debouncedSave]);

  // Quick save for immediate operations (like task completion)
  const quickSave = useCallback(async (field: string, data: any) => {
    if (connectionStatus !== 'connected' || isReceivingUpdate.current) {
      return;
    }

    console.log(`⚡ Quick saving ${field}...`);
    try {
      await firebaseService.current.saveField(field, data);
      setLastSync(new Date().toLocaleTimeString());
    } catch (error) {
      console.error(`Quick save failed for ${field}:`, error);
    }
  }, [connectionStatus]);

  const loadFromFirebase = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      const data = await firebaseService.current.loadData();

      setEmployees(data.employees);
      setTasks(data.tasks);
      setDailyData(data.dailyData);
      setCustomRoles(data.customRoles);
      setStoreItems(data.storeItems);

      const today = getFormattedDate(new Date());
      setCurrentDate(today);
      
      const todayCompleted = getTodayCompletedTasks(data.dailyData);
      const todayAssignments = getTodayTaskAssignments(data.dailyData);
      
      setCompletedTasks(todayCompleted);
      setTaskAssignments(todayAssignments);

      setConnectionStatus('connected');
      setLastSync(new Date().toLocaleTimeString());

      console.log(`✅ Initial data loaded - Today (${today}): ${todayCompleted.size} completed tasks`);

    } catch (error) {
      setConnectionStatus('error');
      setEmployees(getDefaultEmployees());
      setTasks(getDefaultTasks());
      setDailyData(getEmptyDailyData());
      setStoreItems(getDefaultStoreItems());
      setCompletedTasks(new Set());
      setTaskAssignments({});
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Auto-save when data changes (but not during real-time updates)
  useEffect(() => {
    if (!isReceivingUpdate.current) {
      saveToFirebase();
    }
  }, [employees, tasks, dailyData, customRoles, storeItems, saveToFirebase]);

  // Cleanup timeout on unmount
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
    syncCount, // New: for showing sync activity
    employees,
    tasks,
    dailyData,
    completedTasks,
    taskAssignments,
    customRoles,
    storeItems,

    // Setters
    setEmployees,
    setTasks,
    setDailyData,
    setCompletedTasks,
    setTaskAssignments,
    setCustomRoles,
    setStoreItems,

    // Actions
    loadFromFirebase,
    saveToFirebase,
    quickSave // New: for immediate saves
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
