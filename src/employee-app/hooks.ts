// hooks.ts - UPDATED to support system data for centralized daily reset
import { useState, useEffect, useCallback, useRef } from 'react';
import { firebaseService } from './firebaseService';
import { applyTaskOperation } from './taskOperations';
import { applyEmployeeOperation } from './employeeOperations';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
import type { 
  Employee, Task, DailyDataMap, TaskAssignments, PrepItem, 
  ScheduledPrep, PrepSelections, StoreItem, CurrentUser 
} from './types';
import type { SyncOperation } from './OperationManager';

// System data interface
interface SystemData {
  lastResetDate: string;
  resetInProgress: boolean;
  resetInitiatedBy: string;
  resetTimestamp: number;
}

export const useFirebaseData = () => {
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>('Never');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // Main data states
  const [employees, setEmployees] = useState<Employee[]>(getDefaultEmployees());
  const [tasks, setTasks] = useState<Task[]>(getDefaultTasks());
  const [dailyData, setDailyData] = useState<DailyDataMap>(getEmptyDailyData());
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignments>({});
  const [customRoles, setCustomRoles] = useState<string[]>([]);

  // Prep data states
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [scheduledPreps, setScheduledPreps] = useState<ScheduledPrep[]>([]);
  const [prepSelections, setPrepSelections] = useState<PrepSelections>({});

  // Store data states
  const [storeItems, setStoreItems] = useState<StoreItem[]>(getDefaultStoreItems());

  // ADDED: System data state
  const [systemData, setSystemData] = useState<SystemData>({
    lastResetDate: '',
    resetInProgress: false,
    resetInitiatedBy: '',
    resetTimestamp: 0
  });

  // Performance optimization refs
  const lastSaveDataRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // FIXED: Calculate data hash including system data
  const calculateDataHash = useCallback(() => {
    const dataToHash = {
      employees: employees.length,
      tasks: tasks.length,
      dailyData: Object.keys(dailyData).length,
      completedTasks: completedTasks.size,
      taskAssignments: Object.keys(taskAssignments).length,
      customRoles: customRoles.length,
      prepItems: prepItems.length,
      scheduledPreps: scheduledPreps.length,
      prepSelections: Object.keys(prepSelections).length,
      storeItems: storeItems.length,
      systemData: `${systemData.lastResetDate}-${systemData.resetInProgress}-${systemData.resetTimestamp}`
    };
    return JSON.stringify(dataToHash);
  }, [
    employees.length, tasks.length, Object.keys(dailyData).length,
    completedTasks.size, Object.keys(taskAssignments).length, customRoles.length,
    prepItems.length, scheduledPreps.length, Object.keys(prepSelections).length,
    storeItems.length, systemData
  ]);

  // ENHANCED: Quick save with system data support
  const quickSave = useCallback(async (field: string, data: any): Promise<boolean> => {
    if (connectionStatus !== 'connected') {
      console.warn('⛔ Cannot save: not connected to Firebase');
      return false;
    }

    try {
      console.log(`🔥 QuickSave: ${field}`);
      
      // Special handling for system data
      if (field === 'systemData') {
        const success = await firebaseService.saveSystemData(data);
        if (success) {
          setSystemData(data);
          console.log('✅ System data saved and updated locally');
        }
        return success;
      }

      // Handle other fields normally
      const success = await firebaseService.quickSave(field, data);
      
      if (success) {
        setLastSync(new Date().toLocaleTimeString());
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
      
      return success;
    } catch (error) {
      console.error(`❌ QuickSave failed for ${field}:`, error);
      setConnectionStatus('error');
      return false;
    }
  }, [connectionStatus]);

  // ENHANCED: Atomic daily reset function
  const performAtomicReset = useCallback(async (userId: string): Promise<{ success: boolean; reason?: string }> => {
    if (connectionStatus !== 'connected') {
      return { success: false, reason: 'Not connected to Firebase' };
    }

    try {
      console.log('🔄 Performing atomic daily reset...');
      
      // Get fresh system data to ensure we have the latest state
      const currentSystemData = await firebaseService.getSystemData() || systemData;
      
      const result = await firebaseService.performAtomicDailyReset(
        userId,
        currentSystemData,
        Array.from(completedTasks),
        taskAssignments
      );

      if (result.success) {
        // Update local state to reflect the reset
        const today = new Date().toISOString().split('T')[0];
        const newSystemData: SystemData = {
          lastResetDate: today,
          resetInProgress: false,
          resetInitiatedBy: userId,
          resetTimestamp: Date.now()
        };
        
        setSystemData(newSystemData);
        
        // The real-time listeners will handle updating completedTasks and taskAssignments
        console.log('✅ Atomic reset completed, waiting for real-time updates...');
      }

      return result;
    } catch (error) {
      console.error('❌ Atomic reset failed:', error);
      return { success: false, reason: `Error: ${error.message}` };
    }
  }, [connectionStatus, systemData, completedTasks, taskAssignments]);

  // Debounced batch sync
  const debouncedBatchSync = useCallback(async () => {
    if (isSavingRef.current || connectionStatus !== 'connected') {
      return;
    }

    const currentDataHash = calculateDataHash();
    if (currentDataHash === lastSaveDataRef.current) {
      return;
    }

    isSavingRef.current = true;
    console.log('🔄 Starting batch sync to Firebase...');
    
    try {
      // ENHANCED: Save to Firebase with system data included
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
        storeItems,
        systemData: systemData.lastResetDate ? systemData : undefined
      });

      setLastSync(new Date().toLocaleTimeString());
      lastSaveDataRef.current = currentDataHash;
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      setConnectionStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [
    employees, tasks, dailyData, completedTasks, taskAssignments, customRoles,
    prepItems, scheduledPreps, prepSelections, storeItems, systemData,
    connectionStatus, calculateDataHash
  ]);

  // Enhanced save to Firebase
  const saveToFirebase = useCallback(() => {
    if (connectionStatus !== 'connected') {
      console.warn('⛔ Not saving to Firebase: offline or error connection');
      return;
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedBatchSync();
    }, 2000);
  }, [debouncedBatchSync, connectionStatus]);

  // ENHANCED: Load from Firebase with system data
  const loadFromFirebase = useCallback(async () => {
    setIsLoading(true);
    setConnectionStatus('connecting');
    
    try {
      console.log('🔄 Loading data from Firebase...');
      
      const data = await firebaseService.loadData();
      
      // Update all states
      setEmployees(data.employees);
      setTasks(data.tasks);
      setDailyData(data.dailyData);
      setCompletedTasks(data.completedTasks);
      setTaskAssignments(data.taskAssignments);
      setCustomRoles(data.customRoles);
      setPrepItems(data.prepItems);
      setScheduledPreps(data.scheduledPreps);
      setPrepSelections(data.prepSelections);
      setStoreItems(data.storeItems);
      
      // ADDED: Set system data or initialize if missing
      if (data.systemData) {
        setSystemData(data.systemData);
        console.log('📊 System data loaded:', data.systemData);
      } else {
        console.log('🔧 System data missing, initializing...');
        const initialSystemData = await firebaseService.initializeSystemData();
        setSystemData(initialSystemData);
      }
      
      setLastSync(new Date().toLocaleTimeString());
      setConnectionStatus('connected');
      console.log('✅ All data loaded successfully');
      
    } catch (error) {
      console.error('❌ Load failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    loadFromFirebase();
  }, [loadFromFirebase]);

  // ENHANCED: Real-time Firebase listeners with system data support
  useEffect(() => {
    if (connectionStatus !== 'connected') return;

    console.log('🔄 Setting up real-time Firebase listeners...');
    
    // Helper function to set up a listener
    const setupListener = (path: string, callback: (data: any) => void) => {
      const eventSource = new EventSource(
        `${firebaseService['baseUrl']}/${path}.json?accept=text/event-stream`
      );
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error(`Error parsing ${path} data:`, error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error(`EventSource error for ${path}:`, error);
      };
      
      return eventSource;
    };

    // Set up all listeners
    const listeners: EventSource[] = [];

    // Standard data listeners
    listeners.push(setupListener('employees', (data) => {
      if (data) {
        const migrated = Array.isArray(data) ? data : Object.values(data);
        setEmployees(migrated);
      }
    }));

    listeners.push(setupListener('tasks', (data) => {
      if (data) {
        const migrated = Array.isArray(data) ? data : Object.values(data);
        setTasks(migrated);
      }
    }));

    listeners.push(setupListener('dailyData', (data) => {
      setDailyData(data || {});
    }));

    listeners.push(setupListener('completedTasks', (data) => {
      const tasks = Array.isArray(data) ? data : (data ? Object.values(data) : []);
      setCompletedTasks(new Set(tasks));
    }));

    listeners.push(setupListener('taskAssignments', (data) => {
      setTaskAssignments(data || {});
    }));

    listeners.push(setupListener('customRoles', (data) => {
      const roles = Array.isArray(data) ? data : (data ? Object.values(data) : []);
      setCustomRoles(roles);
    }));

    listeners.push(setupListener('prepItems', (data) => {
      const items = Array.isArray(data) ? data : (data ? Object.values(data) : []);
      setPrepItems(items);
    }));

    listeners.push(setupListener('scheduledPreps', (data) => {
      const preps = Array.isArray(data) ? data : (data ? Object.values(data) : []);
      setScheduledPreps(preps);
    }));

    listeners.push(setupListener('prepSelections', (data) => {
      setPrepSelections(data || {});
    }));

    listeners.push(setupListener('storeItems', (data) => {
      const items = Array.isArray(data) ? data : (data ? Object.values(data) : []);
      setStoreItems(items);
    }));

    // ADDED: System data listener
    listeners.push(setupListener('systemData', (data) => {
      if (data) {
        console.log('📊 System data updated via real-time listener:', data);
        setSystemData(data);
      }
    }));

    // Cleanup function
    return () => {
      console.log('🔌 Closing real-time Firebase listeners...');
      listeners.forEach(listener => listener.close());
    };
  }, [connectionStatus]);

  // Apply task operation for sync
  const applyTaskSyncOperation = (op: SyncOperation) => {
    setTasks(prev => applyTaskOperation(prev, op));
  };

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
    systemData, // ADDED: Expose system data

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
    setSystemData, // ADDED: Expose system data setter

    // Actions
    loadFromFirebase,
    saveToFirebase,
    quickSave,
    performAtomicReset, // ADDED: Expose atomic reset function

    // Task operations
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
  // Real-time sync is now handled by Firebase listeners in useFirebaseData
  // This hook remains for compatibility but doesn't need to do anything
  useEffect(() => {
    console.log('🔄 Task real-time sync initialized (handled by Firebase listeners)');
  }, [applyTaskSyncOperation]);

  return {
    // Could add specific task sync methods here if needed
  };
};
