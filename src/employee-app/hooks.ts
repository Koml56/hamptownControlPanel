// hooks.ts - Updated to handle daily task resets
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

const migrateStoreItemData = (storeItems: any[]): StoreItem[] => {
  if (!storeItems || !Array.isArray(storeItems)) return getDefaultStoreItems();

  return storeItems.map(item => ({
    id: item.id || 0,
    name: item.name || 'Unknown Item',
    description: item.description || 'No description',
    cost: typeof item.cost === 'number' ? item.cost : 10,
    category: item.category || 'reward',
    icon: item.icon || '🎁',
    available: typeof item.available === 'boolean' ? item.available : true
  }));
};

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

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyData, setDailyData] = useState<DailyDataMap>({});
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignments>({});
  const [customRoles, setCustomRoles] = useState<string[]>(['Cleaner', 'Manager', 'Supervisor']);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [currentDate, setCurrentDate] = useState<string>(getFormattedDate(new Date()));

  const firebaseService = new FirebaseService();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');

  // Check for date change and reset daily tasks
  useEffect(() => {
    const checkDateChange = () => {
      const today = getFormattedDate(new Date());
      
      if (currentDate !== today) {
        console.log(`📅 Date changed from ${currentDate} to ${today} - resetting daily tasks`);
        
        // Update current date
        setCurrentDate(today);
        
        // Reset completed tasks and assignments for the new day
        const todayCompleted = getTodayCompletedTasks(dailyData);
        const todayAssignments = getTodayTaskAssignments(dailyData);
        
        setCompletedTasks(todayCompleted);
        setTaskAssignments(todayAssignments);
        
        console.log(`✅ Reset complete - ${todayCompleted.size} tasks completed today`);
      }
    };

    // Check immediately
    checkDateChange();
    
    // Check every minute for date changes
    const interval = setInterval(checkDateChange, 60000);
    
    return () => clearInterval(interval);
  }, [currentDate, dailyData]);

  // Update completed tasks when daily data changes
  useEffect(() => {
    const todayCompleted = getTodayCompletedTasks(dailyData);
    const todayAssignments = getTodayTaskAssignments(dailyData);
    
    // Only update if there's a meaningful change
    if (todayCompleted.size !== completedTasks.size || 
        JSON.stringify(todayAssignments) !== JSON.stringify(taskAssignments)) {
      
      console.log(`🔄 Updating today's task state: ${todayCompleted.size} completed tasks`);
      setCompletedTasks(todayCompleted);
      setTaskAssignments(todayAssignments);
    }
  }, [dailyData, currentDate]);

  // Debounced save function
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
      storeItemsLength: storeItems.length
    });

    if (currentDataHash === lastSaveDataRef.current) {
      console.log('debouncedSave aborted: data hash unchanged');
      return;
    }

    console.log('🔄 Saving data to Firebase...');

    setIsLoading(true);
    try {
      // Note: We don't save completedTasks and taskAssignments directly anymore
      // They are derived from dailyData for the current day
      await firebaseService.saveData({
        employees,
        tasks,
        dailyData,
        completedTasks: new Set(), // Always empty - data is in dailyData
        taskAssignments: {}, // Always empty - data is in dailyData
        customRoles,
        storeItems
      });

      setLastSync(new Date().toLocaleTimeString());
      lastSaveDataRef.current = currentDataHash;
      console.log('✅ Store items saved to Firebase successfully');
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
      const finalStoreItems = migrateStoreItemData(data.storeItems);

      setEmployees(finalEmployees);
      setTasks(finalTasks);
      setDailyData(data.dailyData);
      setCustomRoles(data.customRoles);
      setStoreItems(finalStoreItems);

      // Set today's completed tasks and assignments from daily data
      const today = getFormattedDate(new Date());
      setCurrentDate(today);
      
      const todayCompleted = getTodayCompletedTasks(data.dailyData);
      const todayAssignments = getTodayTaskAssignments(data.dailyData);
      
      setCompletedTasks(todayCompleted);
      setTaskAssignments(todayAssignments);

      setConnectionStatus('connected');
      setLastSync(new Date().toLocaleTimeString());

      console.log(`✅ Data loaded - Today (${today}): ${todayCompleted.size} completed tasks`);

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

  // Auto-save when data changes
  useEffect(() => {
    saveToFirebase();
  }, [employees, tasks, dailyData, customRoles, storeItems]);

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
    saveToFirebase
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
