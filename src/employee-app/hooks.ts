// hooks.ts - FIXED: Enhanced Firebase save/load for prep completions with better debugging
import { useState, useEffect, useCallback, useRef } from 'react';
import { FirebaseService } from './firebaseService';
import { getFormattedDate } from './utils';
import { migrateEmployeeData, migrateTaskData } from './migrationUtils';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
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
import type { SyncOperation } from './OperationManager';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { FIREBASE_CONFIG } from './constants';
import { applyTaskOperation } from './taskOperations';

// FIXED: Enhanced prep data migration with completion status validation
const migrateScheduledPreps = (scheduledPreps: any[]): ScheduledPrep[] => {
  if (!scheduledPreps || !Array.isArray(scheduledPreps)) return [];
  
  return scheduledPreps.map(prep => ({
    id: prep.id || Date.now() + Math.random(),
    prepId: prep.prepId || 0,
    name: prep.name || 'Unknown Prep',
    category: prep.category || 'muut',
    estimatedTime: prep.estimatedTime || '30 min',
    isCustom: prep.isCustom || false,
    hasRecipe: prep.hasRecipe || false,
    recipe: prep.recipe || null,
    scheduledDate: prep.scheduledDate || getFormattedDate(new Date()),
    priority: prep.priority || 'medium',
    timeSlot: prep.timeSlot || '',
    completed: typeof prep.completed === 'boolean' ? prep.completed : false,
    assignedTo: prep.assignedTo || null,
    notes: prep.notes || ''
  }));
};

export const useFirebaseData = () => {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  
  // Main data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyData, setDailyData] = useState<DailyDataMap>({});
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignments>({});
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  
  // Prep management states
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [scheduledPreps, setScheduledPreps] = useState<ScheduledPrep[]>([]);
  const [prepSelections, setPrepSelections] = useState<PrepSelections>({});
  
  // Store management state
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);

  // Service instances
  const firebaseService = useRef<FirebaseService | null>(null);
  const isSavingRef = useRef(false);
  const lastSaveDataRef = useRef<string>('');

  // Initialize Firebase service
  useEffect(() => {
    if (!firebaseService.current) {
      firebaseService.current = new FirebaseService();
    }
  }, []);

  // Quick save function for individual fields (used by prep list)
  const quickSave = useCallback(async (field: string, data: any): Promise<boolean> => {
    if (!firebaseService.current) return false;
    
    try {
      console.log(`💾 Quick save: ${field}`, data);
      await firebaseService.current.saveField(field, data);
      setLastSync(new Date());
      return true;
    } catch (error) {
      console.error(`❌ Quick save failed for ${field}:`, error);
      return false;
    }
  }, []);

  // Main data loading function
  const loadFromFirebase = useCallback(async () => {
    if (!firebaseService.current) return;

    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      console.log('📡 Loading data from Firebase...');
      
      // Load main data with timeout to prevent hanging
      const loadPromise = firebaseService.current.loadData();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Load timeout')), 10000) // 10 second timeout
      );

      const data = await Promise.race([loadPromise, timeoutPromise]) as any;

      const finalEmployees = migrateEmployeeData(data.employees || []);
      const finalTasks = migrateTaskData(data.tasks || []);
      const finalScheduledPreps = migrateScheduledPreps(data.scheduledPreps || []);

      // ENHANCED: Debug loaded scheduledPreps data with completion status
      console.log('🔍 Loading scheduledPreps from Firebase:', {
        count: finalScheduledPreps.length,
        todayPreps: finalScheduledPreps.filter((prep: any) => 
          prep.scheduledDate === getFormattedDate(new Date())
        ).length,
        todayCompleted: finalScheduledPreps.filter((prep: any) => 
          prep.scheduledDate === getFormattedDate(new Date()) && prep.completed === true
        ).length,
        sampleData: finalScheduledPreps.slice(0, 5).map((prep: any) => ({
          id: prep.id,
          name: prep.name,
          completed: prep.completed,
          scheduledDate: prep.scheduledDate
        })),
        rawDataSample: data.scheduledPreps ? data.scheduledPreps.slice(0, 3) : 'No raw data'
      });

      // Set data immediately
      setEmployees(finalEmployees.length > 0 ? finalEmployees : getDefaultEmployees());
      setTasks(finalTasks.length > 0 ? finalTasks : getDefaultTasks());
      setDailyData(data.dailyData || getEmptyDailyData());
      setCompletedTasks(new Set(data.completedTasks || []));
      setTaskAssignments(data.taskAssignments || {});
      setCustomRoles(Array.isArray(data.customRoles) ? data.customRoles : []);
      setPrepItems(Array.isArray(data.prepItems) ? data.prepItems : []);
      setScheduledPreps(finalScheduledPreps);
      setPrepSelections(data.prepSelections || {});
      setStoreItems(Array.isArray(data.storeItems) ? data.storeItems : getDefaultStoreItems());

      // ENHANCED: Log what we actually set for scheduledPreps with completion status
      const todayStr = getFormattedDate(new Date());
      const todayPreps = finalScheduledPreps.filter((prep: any) => prep.scheduledDate === todayStr);
      const todayCompleted = todayPreps.filter((prep: any) => prep.completed === true);
      
      console.log('✅ Set scheduledPreps state:', {
        count: finalScheduledPreps.length,
        todayCount: todayPreps.length,
        todayCompletedCount: todayCompleted.length,
        completionPercentage: todayPreps.length > 0 ? 
          Math.round((todayCompleted.length / todayPreps.length) * 100) : 0
      });

      setConnectionStatus('connected');
      setLastSync(new Date());
      console.log('✅ Data loaded successfully from Firebase');

    } catch (error) {
      console.error('❌ Firebase load error:', error);
      setConnectionStatus('error');
      
      // Load defaults on error
      setEmployees(getDefaultEmployees());
      setTasks(getDefaultTasks());
      setDailyData(getEmptyDailyData());
      setStoreItems(getDefaultStoreItems());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Main data saving function
  const saveToFirebase = useCallback(async () => {
    if (!firebaseService.current || isSavingRef.current) return;

    isSavingRef.current = true;
    setConnectionStatus('connecting');

    try {
      console.log('💾 Saving data to Firebase...');
      
      const dataToSave = {
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
      };

      await firebaseService.current.saveData(dataToSave);
      
      setConnectionStatus('connected');
      setLastSync(new Date());
      console.log('✅ Data saved successfully to Firebase');

    } catch (error) {
      console.error('❌ Firebase save error:', error);
      setConnectionStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles, 
      prepItems, scheduledPreps, prepSelections, storeItems]);

  // Real-time data listeners
  useEffect(() => {
    if (!firebaseService.current) return;

    const app = initializeApp(FIREBASE_CONFIG);
    const db = getDatabase(app);

    // Employees
    const employeesRef = ref(db, 'employees');
    const handleEmployees = (snapshot: any) => {
      const data = snapshot.val() || [];
      const migrated = migrateEmployeeData(Array.isArray(data) ? data : Object.values(data));
      setEmployees(migrated.length > 0 ? migrated : getDefaultEmployees());
    };
    onValue(employeesRef, handleEmployees);

    // Tasks
    const tasksRef = ref(db, 'tasks');
    const handleTasks = (snapshot: any) => {
      const data = snapshot.val() || [];
      const migrated = migrateTaskData(Array.isArray(data) ? data : Object.values(data));
      setTasks(migrated.length > 0 ? migrated : getDefaultTasks());
    };
    onValue(tasksRef, handleTasks);

    // DailyData
    const dailyDataRef = ref(db, 'dailyData');
    const handleDailyData = (snapshot: any) => {
      setDailyData(snapshot.val() || getEmptyDailyData());
    };
    onValue(dailyDataRef, handleDailyData);

    // CompletedTasks
    const completedTasksRef = ref(db, 'completedTasks');
    const handleCompletedTasks = (snapshot: any) => {
      setCompletedTasks(new Set(snapshot.val() || []));
    };
    onValue(completedTasksRef, handleCompletedTasks);

    // TaskAssignments
    const taskAssignmentsRef = ref(db, 'taskAssignments');
    const handleTaskAssignments = (snapshot: any) => {
      setTaskAssignments(snapshot.val() || {});
    };
    onValue(taskAssignmentsRef, handleTaskAssignments);

    // CustomRoles
    const customRolesRef = ref(db, 'customRoles');
    const handleCustomRoles = (snapshot: any) => {
      setCustomRoles(Array.isArray(snapshot.val()) ? snapshot.val() : []);
    };
    onValue(customRolesRef, handleCustomRoles);

    // PrepItems
    const prepItemsRef = ref(db, 'prepItems');
    const handlePrepItems = (snapshot: any) => {
      const data = snapshot.val() || [];
      setPrepItems(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(prepItemsRef, handlePrepItems);

    // ScheduledPreps
    const scheduledPrepsRef = ref(db, 'scheduledPreps');
    const handleScheduledPreps = (snapshot: any) => {
      const data = snapshot.val() || [];
      const migrated = migrateScheduledPreps(Array.isArray(data) ? data : Object.values(data));
      setScheduledPreps(migrated);
    };
    onValue(scheduledPrepsRef, handleScheduledPreps);

    // PrepSelections
    const prepSelectionsRef = ref(db, 'prepSelections');
    const handlePrepSelections = (snapshot: any) => {
      setPrepSelections(snapshot.val() || {});
    };
    onValue(prepSelectionsRef, handlePrepSelections);

    // StoreItems
    const storeItemsRef = ref(db, 'storeItems');
    const handleStoreItems = (snapshot: any) => {
      const data = snapshot.val() || [];
      setStoreItems(Array.isArray(data) ? data : Object.values(data));
    };
    onValue(storeItemsRef, handleStoreItems);

    // Cleanup
    return () => {
      off(employeesRef, 'value', handleEmployees);
      off(tasksRef, 'value', handleTasks);
      off(dailyDataRef, 'value', handleDailyData);
      off(completedTasksRef, 'value', handleCompletedTasks);
      off(taskAssignmentsRef, 'value', handleTaskAssignments);
      off(customRolesRef, 'value', handleCustomRoles);
      off(prepItemsRef, 'value', handlePrepItems);
      off(scheduledPrepsRef, 'value', handleScheduledPreps);
      off(prepSelectionsRef, 'value', handlePrepSelections);
      off(storeItemsRef, 'value', handleStoreItems);
    };
  }, []);

  // Apply task sync operation
  const applyTaskSyncOperation = (op: SyncOperation) => {
    setTasks(prev => applyTaskOperation(prev, op));
  };

  // Initial data load
  useEffect(() => {
    loadFromFirebase();
  }, [loadFromFirebase]);

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
    quickSave,
    applyTaskSyncOperation
  };
};

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({ id: 1, name: 'Luka' });
  const [isAdmin, setIsAdmin] = useState(false);

  const switchUser = useCallback((employee: Employee) => {
    setCurrentUser({ id: employee.id, name: employee.name });
    localStorage.setItem('currentUserName', employee.name);
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdmin(false);
  }, []);

  useEffect(() => {
    if (currentUser.name) {
      localStorage.setItem('currentUserName', currentUser.name);
    }
  }, [currentUser.name]);

  return {
    currentUser,
    isAdmin,
    setCurrentUser,
    setIsAdmin,
    switchUser,
    logoutAdmin
  };
};

export const useTaskRealtimeSync = (applyTaskSyncOperation: (op: SyncOperation) => void) => {
  // Real-time sync handled by Firebase listeners in useFirebaseData
  // This hook can be extended for additional sync functionality if needed
  
  useEffect(() => {
    console.log('🔄 Task real-time sync initialized');
    return () => {
      console.log('🔄 Task real-time sync cleaned up');
    };
  }, [applyTaskSyncOperation]);
};
