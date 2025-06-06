// hooks.ts - Simple fix: Remove debounce for critical operations
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

  // Simple save function - no debounce, just save immediately
  const saveToFirebase = useCallback(async () => {
    if (connectionStatus !== 'connected' || isLoading) return;
    
    // Create a hash of current data to avoid unnecessary saves
    const currentDataHash = JSON.stringify({
      employees: employees.length,
      tasks: tasks.length,
      dailyDataKeys: Object.keys(dailyData).length,
      completedTasksSize: completedTasks.size,
      taskAssignmentsKeys: Object.keys(taskAssignments).length,
      customRolesLength: customRoles.length,
      // Add actual data checksums to detect real changes
      employeesChecksum: JSON.stringify(employees.map(e => `${e.id}-${e.points}-${e.mood}`)),
      completedTasksArray: Array.from(completedTasks).sort().join(',')
    });

    // Skip save if data hasn't actually changed
    if (currentDataHash === lastSaveDataRef.current) {
      console.log('⏭️ Skipping save - no data changes detected');
      return;
    }

    setIsLoading(true);
    console.log('💾 Saving to Firebase immediately...');
    
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
      console.log('✅ Save successful');
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles, connectionStatus, isLoading]);

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
        customRolesLength: data.customRoles.length,
        employeesChecksum: JSON.stringify(finalEmployees.map(e => `${e.id}-${e.points}-${e.mood}`)),
        completedTasksArray: Array.from(data.completedTasks).sort().join(',')
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
    saveToFirebase  // Now saves immediately, no debounce
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
