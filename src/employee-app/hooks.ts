// hooks.ts
impor// hooks.ts - Fixed version with immediate save + debounce protection
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
  CurrentUser 
} from './types';

// Simple migration functions inline to avoid circular dependencies
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
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyData, setDailyData] = useState<DailyDataMap>({});
  const [completedTasks, setCompletedTasks] = useState(new Set<number>());
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignments>({});
  const [customRoles, setCustomRoles] = useState<string[]>(['Cleaner', 'Manager', 'Supervisor']);

  const firebaseService = new FirebaseService();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const pendingSaveRef = useRef<boolean>(false);

  // Immediate save function (no debounce) - for critical data like task completions
  const immediateSave = useCallback(async () => {
    if (connectionStatus !== 'connected' || isLoading || pendingSaveRef.current) {
      return;
    }

    // Create a hash of current data to avoid unnecessary saves
    const currentDataHash = JSON.stringify({
      employees: employees.length,
      tasks: tasks.length,
      dailyDataKeys: Object.keys(dailyData).length,
      completedTasksSize: completedTasks.size,
      taskAssignmentsKeys: Object.keys(taskAssignments).length,
      customRolesLength: customRoles.length
    });

    // Skip save if data hasn't changed
    if (currentDataHash === lastSaveDataRef.current) {
      return;
    }

    pendingSaveRef.current = true;
    setIsLoading(true);
    
    try {
      await firebaseService.saveData({
        employees,
        tasks,
        dailyData,
        completedTasks,
        taskAssignments,
        customRoles
      });
      
      setLastSync(new Date().toLocaleTimeString());
      lastSaveDataRef.current = currentDataHash;
      console.log('✅ Immediate save successful');
      
    } catch (error) {
      console.error('❌ Immediate save failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
      pendingSaveRef.current = false;
    }
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles, connectionStatus, isLoading]);

  // Debounced save function - for less critical operations
  const debouncedSave = useCallback(async () => {
    if (connectionStatus !== 'connected' || isLoading || pendingSaveRef.current) {
      return;
    }

    // Create a hash of current data to avoid unnecessary saves
    const currentDataHash = JSON.stringify({
      employees: employees.length,
      tasks: tasks.length,
      dailyDataKeys: Object.keys(dailyData).length,
      completedTasksSize: completedTasks.size,
      taskAssignmentsKeys: Object.keys(taskAssignments).length,
      customRolesLength: customRoles.length
    });

    // Skip save if data hasn't changed
    if (currentDataHash === lastSaveDataRef.current) {
      return;
    }

    pendingSaveRef.current = true;
    setIsLoading(true);
    
    try {
      await firebaseService.saveData({
        employees,
        tasks,
        dailyData,
        completedTasks,
        taskAssignments,
        customRoles
      });
      
      setLastSync(new Date().toLocaleTimeString());
      lastSaveDataRef.current = currentDataHash;
      console.log('✅ Debounced save successful');
      
    } catch (error) {
      console.error('❌ Debounced save failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
      pendingSaveRef.current = false;
    }
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles, connectionStatus, isLoading]);

  // Immediate save function for critical operations (task completions, purchases, etc.)
  const saveToFirebaseImmediate = useCallback(() => {
    // Cancel any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    // Save immediately
    immediateSave();
  }, [immediateSave]);

  // Regular debounced save for non-critical operations
  const saveToFirebase = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 1000); // Reduced from 2000ms to 1000ms for faster saves
  }, [debouncedSave]);

  const loadFromFirebase = useCallback(async () => {
    if (isLoading) return; // Prevent multiple simultaneous loads
    
    setIsLoading(true);
    setConnectionStatus('connecting');
    
    try {
      const data = await firebaseService.loadData();
      
      // Migrate data to ensure all required fields exist
      const finalEmployees = migrateEmployeeData(data.employees);
      const finalTasks = migrateTaskData(data.tasks);
      
      setEmployees(finalEmployees);
      setTasks(finalTasks);
      setDailyData(data.dailyData);
      setCompletedTasks(data.completedTasks);
      setTaskAssignments(data.taskAssignments);
      setCustomRoles(data.customRoles);
      
      setConnectionStatus('connected');
      setLastSync(new Date().toLocaleTimeString());
      
      console.log('📊 Final loaded data:');
      console.log('👥 Employees:', finalEmployees);
      console.log('📋 Tasks:', finalTasks);
      
      // Update the hash after loading
      const dataHash = JSON.stringify({
        employees: finalEmployees.length,
        tasks: finalTasks.length,
        dailyDataKeys: Object.keys(data.dailyData).length,
        completedTasksSize: data.completedTasks.size,
        taskAssignmentsKeys: Object.keys(data.taskAssignments).length,
        customRolesLength: data.customRoles.length
      });
      lastSaveDataRef.current = dataHash;
      
    } catch (error) {
      setConnectionStatus('error');
      
      // Initialize with default data on first run
      const defaultEmployees = getDefaultEmployees();
      const defaultTasks = getDefaultTasks();
      const emptyDaily = getEmptyDailyData();
      
      setEmployees(defaultEmployees);
      setTasks(defaultTasks);
      setDailyData(emptyDaily);
      
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Save before page unload to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // If there's a pending save, trigger immediate save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Use navigator.sendBeacon for reliability during page unload
        const currentData = {
          employees,
          tasks,
          dailyData,
          completedTasks: Array.from(completedTasks),
          taskAssignments,
          customRoles
        };
        
        // Try to send data using beacon (more reliable during unload)
        try {
          const blob = new Blob([JSON.stringify(currentData)], { type: 'application/json' });
          navigator.sendBeacon(`${firebaseService['baseUrl']}/urgent-save.json`, blob);
        } catch (error) {
          console.warn('Beacon save failed, trying immediate save');
          immediateSave();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles, immediateSave]);

  // Auto-save every 30 seconds as backup
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus === 'connected' && !isLoading && !pendingSaveRef.current) {
        debouncedSave();
      }
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [connectionStatus, isLoading, debouncedSave]);

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
    
    // Setters
    setEmployees,
    setTasks,
    setDailyData,
    setCompletedTasks,
    setTaskAssignments,
    setCustomRoles,
    
    // Actions
    loadFromFirebase,
    saveToFirebase,        // Regular debounced save (1 second delay)
    saveToFirebaseImmediate // Immediate save for critical operations
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
