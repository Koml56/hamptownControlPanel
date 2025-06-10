// hooks.ts - Enhanced with instant sync and prep support
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
  StoreItem,
  PrepItem,
  ScheduledPrep,
  PrepSelections
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
  const [syncCount, setSyncCount] = useState(0);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyData, setDailyData] = useState<DailyDataMap>({});
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignments>({});
  const [customRoles, setCustomRoles] = useState<string[]>(['Cleaner', 'Manager', 'Supervisor']);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  
  // ADD PREP STATE
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [scheduledPreps, setScheduledPreps] = useState<ScheduledPrep[]>([]);
  const [prepSelections, setPrepSelections] = useState<PrepSelections>({});
  
  const [currentDate, setCurrentDate] = useState<string>(getFormattedDate(new Date()));

  const firebaseService = useRef(new FirebaseService());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReceivingUpdate = useRef(false);

  // Real-time sync callbacks
  const realtimeCallbacks = useCallback(() => ({
    onEmployeesUpdate: (newEmployees: Employee[]) => {
      console.log('⚡ Instant employees sync received');
      isReceivingUpdate.current = true;
      setEmployees(newEmployees);
      setSyncCount(prev => prev + 1);
      setTimeout(() => { isReceivingUpdate.current = false; }, 50);
    },

    onTasksUpdate: (newTasks: Task[]) => {
      console.log('⚡ Instant tasks sync received');
      isReceivingUpdate.current = true;
      setTasks(newTasks);
      setSyncCount(prev => prev + 1);
      setTimeout(() => { isReceivingUpdate.current = false; }, 50);
    },

    onDailyDataUpdate: (newDailyData: DailyDataMap) => {
      console.log('⚡ Instant daily data sync received');
      isReceivingUpdate.current = true;
      setDailyData(newDailyData);
      
      // Update completed tasks and assignments for today
      const todayCompleted = getTodayCompletedTasks(newDailyData);
      const todayAssignments = getTodayTaskAssignments(newDailyData);
      setCompletedTasks(todayCompleted);
      setTaskAssignments(todayAssignments);
      
      setSyncCount(prev => prev + 1);
      setTimeout(() => { isReceivingUpdate.current = false; }, 50);
    },

    onCustomRolesUpdate: (newRoles: string[]) => {
      console.log('⚡ Instant custom roles sync received');
      isReceivingUpdate.current = true;
      setCustomRoles(newRoles);
      setSyncCount(prev => prev + 1);
      setTimeout(() => { isReceivingUpdate.current = false; }, 50);
    },

    onStoreItemsUpdate: (newStoreItems: StoreItem[]) => {
      console.log('⚡ Instant store items sync received');
      isReceivingUpdate.current = true;
      setStoreItems(newStoreItems);
      setSyncCount(prev => prev + 1);
      setTimeout(() => { isReceivingUpdate.current = false; }, 50);
    },

    // ADD PREP CALLBACKS
    onPrepItemsUpdate: (newPrepItems: PrepItem[]) => {
      console.log('⚡ Instant prep items sync received');
      isReceivingUpdate.current = true;
      setPrepItems(newPrepItems);
      setSyncCount(prev => prev + 1);
      setTimeout(() => { isReceivingUpdate.current = false; }, 50);
    },

    onScheduledPrepsUpdate: (newScheduledPreps: ScheduledPrep[]) => {
      console.log('⚡ Instant scheduled preps sync received');
      isReceivingUpdate.current = true;
      setScheduledPreps(newScheduledPreps);
      setSyncCount(prev => prev + 1);
      setTimeout(() => { isReceivingUpdate.current = false; }, 50);
    },

    onPrepSelectionsUpdate: (newPrepSelections: PrepSelections) => {
      console.log('⚡ Instant prep selections sync received');
      isReceivingUpdate.current = true;
      setPrepSelections(newPrepSelections);
      setSyncCount(prev => prev + 1);
      setTimeout(() => { isReceivingUpdate.current = false; }, 50);
    },

    onConnectionChange: (status: 'connected' | 'disconnected' | 'error') => {
      console.log(`⚡ Connection status: ${status}`);
      setConnectionStatus(status === 'disconnected' ? 'error' : 'connected');
    }
  }), []);

  // Setup real-time listeners
  useEffect(() => {
    console.log('🚀 Setting up instant synchronization with prep support...');
    firebaseService.current.setupRealtimeListeners(realtimeCallbacks());

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

  // Instant save function with optimistic updates
  const instantSave = useCallback(async () => {
    if (connectionStatus !== 'connected' || isReceivingUpdate.current) {
      return;
    }

    console.log('⚡ Instant save triggered...');
    setLastSync(new Date().toLocaleTimeString());

    try {
      // Fire instant saves for all data - don't wait
      await firebaseService.current.saveData({
        employees,
        tasks,
        dailyData,
        customRoles,
        storeItems,
        // ADD PREP DATA
        prepItems,
        scheduledPreps,
        prepSelections
      });

      console.log('⚡ Instant save completed');
    } catch (error) {
      console.error('❌ Instant save failed:', error);
      setConnectionStatus('error');
    }
  }, [
    employees,
    tasks,
    dailyData,
    customRoles,
    storeItems,
    prepItems,
    scheduledPreps,
    prepSelections,
    connectionStatus
  ]);

  // Optimistic save with immediate UI update
  const saveToFirebase = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Instant save - no delay for immediate feel
    saveTimeoutRef.current = setTimeout(() => {
      instantSave();
    }, 100); // Minimal delay just to batch rapid changes
  }, [instantSave]);

  // Instant field save for critical operations
  const quickSave = useCallback(async (field: string, data: any) => {
    if (connectionStatus !== 'connected' || isReceivingUpdate.current) {
      return;
    }

    console.log(`⚡ Quick saving ${field} instantly...`);
    setLastSync(new Date().toLocaleTimeString());
    
    try {
      await firebaseService.current.saveField(field, data);
    } catch (error) {
      console.error(`❌ Quick save failed for ${field}:`, error);
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
      
      // LOAD PREP DATA
      setPrepItems(data.prepItems || []);
      setScheduledPreps(data.scheduledPreps || []);
      setPrepSelections(data.prepSelections || {});

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
      setPrepItems([]);
      setScheduledPreps([]);
      setPrepSelections({});
      setCompletedTasks(new Set());
      setTaskAssignments({});
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Auto-save when data changes (with optimistic updates)
  useEffect(() => {
    if (!isReceivingUpdate.current) {
      saveToFirebase();
    }
  }, [employees, tasks, dailyData, customRoles, storeItems, prepItems, scheduledPreps, prepSelections, saveToFirebase]);

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
    syncCount,
    employees,
    tasks,
    dailyData,
    completedTasks,
    taskAssignments,
    customRoles,
    storeItems,
    // ADD PREP STATE
    prepItems,
    scheduledPreps,
    prepSelections,

    // Setters (with optimistic updates)
    setEmployees,
    setTasks,
    setDailyData,
    setCompletedTasks,
    setTaskAssignments,
    setCustomRoles,
    setStoreItems,
    // ADD PREP SETTERS
    setPrepItems,
    setScheduledPreps,
    setPrepSelections,

    // Actions
    loadFromFirebase,
    saveToFirebase,
    quickSave,
    instantSave // New: for immediate saves
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
