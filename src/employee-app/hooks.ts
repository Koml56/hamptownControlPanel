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

    } catch (error) {
      setConnectionStatus('error');

      setEmployees(getDefaultEmployees());
      setTasks(getDefaultTasks());
      setDailyData(getEmptyDailyData());
      // Initialize empty prep list data on error
      setPrepItems([]);
      setScheduledPreps([]);
      setPrepSelections({});
      setStoreItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Вызывает save при изменении зависимостей
  useEffect(() => {
    saveToFirebase();
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles, prepItems, scheduledPreps, prepSelections, storeItems]);

  // Очистка таймера при размонтировании
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
