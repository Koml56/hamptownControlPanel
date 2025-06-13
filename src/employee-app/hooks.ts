import { useState, useEffect, useCallback, useRef } from 'react';
import { FirebaseService } from './firebaseService';
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
  setCompletedTasks: (tasks: Set<number>) => void,
  quickSave: (field: string, data: any) => Promise<void>
): boolean => {
  const today = getFormattedDate(new Date());
  const lastResetDate = localStorage.getItem('lastTaskResetDate');
  
  console.log('🔍 Checking daily task reset:', { 
    today, 
    lastResetDate, 
    completedTasksCount: completedTasks.size 
  });
  
  if (lastResetDate !== today && completedTasks.size > 0) {
    console.log('🔄 Resetting completed tasks for new day');
    
    // Clear completed tasks immediately
    setCompletedTasks(new Set());
    
    // Update localStorage
    localStorage.setItem('lastTaskResetDate', today);
    
    // Save empty array to Firebase
    quickSave('completedTasks', []);
    
    console.log('✅ Tasks reset completed');
    return true; // Tasks were reset
  }
  
  // Set the reset date if it's not set
  if (!lastResetDate) {
    localStorage.setItem('lastTaskResetDate', today);
  }
  
  return false; // No reset needed
};

// Set up midnight reset timer
const setupMidnightReset = (
  completedTasks: Set<number>,
  setCompletedTasks: (tasks: Set<number>) => void,
  quickSave: (field: string, data: any) => Promise<void>
): (() => void) => {
  let currentTimer: NodeJS.Timeout | null = null;
  
  const scheduleNextReset = (): NodeJS.Timeout => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 1, 0, 0); // 12:01 AM
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    console.log(`⏰ Next task reset scheduled in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);
    
    return setTimeout(() => {
      console.log('🌅 Midnight reached - resetting daily tasks');
      checkAndResetDailyTasks(completedTasks, setCompletedTasks, quickSave);
      
      // Schedule the next reset
      currentTimer = scheduleNextReset();
    }, timeUntilMidnight);
  };
  
  currentTimer = scheduleNextReset();
  
  // Return cleanup function
  return () => {
    if (currentTimer) {
      clearTimeout(currentTimer);
      currentTimer = null;
    }
  };
};

export const useFirebaseData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

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
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const midnightResetCleanupRef = useRef<(() => void) | null>(null);

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
    } catch (error) {
      console.error(`❌ Quick save failed for ${field}:`, error);
    }
  }, [connectionStatus]);

  // Функция отложенного сохранения
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
    console.log('📦 Data snapshot:', {
      employees,
      tasks,
      dailyData,
      completedTasks: Array.from(completedTasks),
      taskAssignments,
      customRoles,
      prepItems,
      scheduledPreps,
      prepSelections,
      storeItems
    });

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
    isLoading
  ]);

  // Вызывает debouncedSave с задержкой
  const saveToFirebase = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 2000);
  }, [debouncedSave]);

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
      setTaskAssignments(data.taskAssignments);
      setCustomRoles(data.customRoles);

      // Load prep list data
      setPrepItems(data.prepItems || []);
      setScheduledPreps(data.scheduledPreps || []);
      setPrepSelections(data.prepSelections || {});
      
      // Load store items
      setStoreItems(data.storeItems || []);

      // IMPORTANT: Set completed tasks AFTER checking for daily reset
      const loadedCompletedTasks = new Set(data.completedTasks);
      
      // Check if we need to reset tasks for today
      const wasReset = checkAndResetDailyTasks(loadedCompletedTasks, setCompletedTasks, quickSave);
      
      if (!wasReset) {
        // Only set the loaded tasks if no reset was needed
        setCompletedTasks(loadedCompletedTasks);
      }

      setConnectionStatus('connected');
      setLastSync(new Date().toLocaleTimeString());

      const dataHash = JSON.stringify({
        employees: finalEmployees.length,
        tasks: finalTasks.length,
        dailyDataKeys: Object.keys(data.dailyData).length,
        completedTasksSize: wasReset ? 0 : data.completedTasks.size,
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

      setEmployees(getDefaultEmployees());
      setTasks(getDefaultTasks());
      setDailyData(getEmptyDailyData());
      setCompletedTasks(new Set());
      // Initialize empty prep list data on error
      setPrepItems([]);
      setScheduledPreps([]);
      setPrepSelections({});
      setStoreItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, quickSave]);

  // Setup daily reset functionality
  useEffect(() => {
    // Only run this effect once on mount
    console.log('🔧 Setting up daily reset functionality');
    
    // Setup midnight reset timer
    midnightResetCleanupRef.current = setupMidnightReset(completedTasks, setCompletedTasks, quickSave);

    // Cleanup on unmount
    return () => {
      if (midnightResetCleanupRef.current) {
        console.log('🧹 Cleaning up daily reset timer');
        midnightResetCleanupRef.current();
      }
    };
  }, []); // Empty dependency array - only run once

  // Separate save effect to prevent infinite loops
  useEffect(() => {
    // Only save if we're connected and not loading
    if (connectionStatus === 'connected' && !isLoading) {
      saveToFirebase();
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
    saveToFirebase
  ]);

  // Cleanup timer on unmount only
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Debug function to manually test reset (available in browser console)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugResetTasks = () => {
        console.log('🧪 DEBUG: Manually resetting tasks');
        setCompletedTasks(new Set());
        quickSave('completedTasks', []);
        localStorage.removeItem('lastTaskResetDate');
        console.log('✅ DEBUG: Tasks reset completed');
      };
    }
  }, [setCompletedTasks, quickSave]);

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
    quickSave
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
