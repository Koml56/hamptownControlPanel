// useSimpleSync.ts - React hook for simple cross-tab synchronization
import { useEffect, useCallback, useRef } from 'react';
import { simpleCrossTabSync, SyncData } from './SimpleCrossTabSync';

interface UseSimplesyncProps {
  completedTasks: Set<number>;
  taskAssignments: Record<number, number>;
  employees: any[];
  dailyData: any;
  tasks: any[]; // Add tasks to get points
  setCompletedTasks: (tasks: Set<number>) => void;
  setTaskAssignments: (updater: (prev: Record<number, number>) => Record<number, number>) => void;
  setEmployees: (updater: (prev: any[]) => any[]) => void;
  setDailyData: (updater: (prev: any) => any) => void;
}

/**
 * React hook for simple, reliable cross-tab synchronization
 * Automatically syncs state changes across tabs using localStorage events
 */
export function useSimpleSync({
  completedTasks,
  taskAssignments,
  employees,
  dailyData,
  tasks,
  setCompletedTasks,
  setTaskAssignments,
  setEmployees,
  setDailyData
}: UseSimplesyncProps) {
  const initializationRef = useRef(false);
  const lastSyncRef = useRef<number>(0);

  // Initialize sync and load existing data
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    console.log('🔄 Initializing simple sync...');

    // Load initial data from localStorage
    const initialData = simpleCrossTabSync.loadInitialData();
    if (initialData) {
      console.log('📂 Loading initial sync data into React state');
      
      // Only update if the data is newer than what we have
      if (initialData.lastUpdated && initialData.lastUpdated > lastSyncRef.current) {
        setCompletedTasks(new Set(initialData.completedTasks || []));
        setTaskAssignments(() => initialData.taskAssignments || {});
        if (initialData.employees) {
          setEmployees(() => initialData.employees);
        }
        if (initialData.dailyData) {
          setDailyData(() => initialData.dailyData);
        }
        lastSyncRef.current = initialData.lastUpdated;
        console.log('✅ Initial data loaded successfully');
      }
    }

    // Listen for task updates from other tabs
    simpleCrossTabSync.onTaskUpdate((data) => {
      console.log('📥 Received task update from another tab:', data);
      
      if (data.timestamp > lastSyncRef.current) {
        if (data.completed) {
          setCompletedTasks(new Set([...completedTasks, data.taskId]));
          if (data.employeeId) {
            setTaskAssignments(prev => ({ ...prev, [data.taskId]: data.employeeId! }));
          }
        } else {
          const newCompletedTasks = new Set(completedTasks);
          newCompletedTasks.delete(data.taskId);
          setCompletedTasks(newCompletedTasks);
          setTaskAssignments(prev => {
            const newAssignments = { ...prev };
            delete newAssignments[data.taskId];
            return newAssignments;
          });
        }
        lastSyncRef.current = data.timestamp;
      }
    });

    // Listen for general data updates from other tabs
    simpleCrossTabSync.onDataUpdate((data) => {
      console.log('📥 Received data update from another tab:', data);
      
      if (data.lastUpdated && data.lastUpdated > lastSyncRef.current) {
        if (data.completedTasks) {
          setCompletedTasks(new Set(data.completedTasks));
        }
        if (data.taskAssignments) {
          setTaskAssignments(() => data.taskAssignments!);
        }
        if (data.employees) {
          setEmployees(() => data.employees!);
        }
        if (data.dailyData) {
          setDailyData(() => data.dailyData!);
        }
        lastSyncRef.current = data.lastUpdated;
      }
    });

    console.log('✅ Simple sync initialized');
  }, [setCompletedTasks, setTaskAssignments, setEmployees, setDailyData]); // Add dependencies

  // Function to mark task as completed with sync
  const markTaskCompleted = useCallback((taskId: number, employeeId: number) => {
    console.log(`🔄 Marking task ${taskId} as completed for employee ${employeeId}`);
    
    // Find the task to get its points
    const task = tasks.find(t => t.id === taskId);
    const taskPoints = task?.points || 5; // Fallback to 5 points if not found
    
    // Update local state immediately for responsive UI
    setCompletedTasks(new Set([...completedTasks, taskId]));
    setTaskAssignments(prev => ({ ...prev, [taskId]: employeeId }));
    
    // Update employee points in dailyData
    setDailyData((prev: any) => {
      const today = new Date().toISOString().split('T')[0];
      const updated = { ...prev };
      if (!updated[today]) {
        updated[today] = {};
      }
      if (!updated[today][employeeId]) {
        updated[today][employeeId] = { points: 0, completedTasks: [] };
      }
      
      // Add points for the task
      updated[today][employeeId].points = (updated[today][employeeId].points || 0) + taskPoints;
      updated[today][employeeId].completedTasks = [
        ...(updated[today][employeeId].completedTasks || []),
        taskId
      ];
      
      return updated;
    });

    // Update employee points
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId 
        ? { ...emp, points: (emp.points || 0) + taskPoints }
        : emp
    ));

    // Sync to other tabs
    simpleCrossTabSync.markTaskCompleted(taskId, employeeId);
    lastSyncRef.current = Date.now();
  }, [setCompletedTasks, setTaskAssignments, setDailyData, setEmployees, tasks, completedTasks]);

  // Function to mark task as uncompleted with sync
  const markTaskUncompleted = useCallback((taskId: number) => {
    console.log(`🔄 Marking task ${taskId} as uncompleted`);
    
    // Get the employee who was assigned to this task
    const assignedEmployeeId = taskAssignments[taskId];
    
    // Find the task to get its points
    const task = tasks.find(t => t.id === taskId);
    const taskPoints = task?.points || 5; // Fallback to 5 points if not found
    
    // Update local state immediately
    const newCompletedTasks = new Set(completedTasks);
    newCompletedTasks.delete(taskId);
    setCompletedTasks(newCompletedTasks);
    
    setTaskAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[taskId];
      return newAssignments;
    });

    // Update dailyData to remove points
    if (assignedEmployeeId) {
      setDailyData((prev: any) => {
        const today = new Date().toISOString().split('T')[0];
        const updated = { ...prev };
        if (updated[today] && updated[today][assignedEmployeeId]) {
          updated[today][assignedEmployeeId].points = Math.max(0, 
            (updated[today][assignedEmployeeId].points || 0) - taskPoints
          );
          updated[today][assignedEmployeeId].completedTasks = 
            (updated[today][assignedEmployeeId].completedTasks || []).filter((id: number) => id !== taskId);
        }
        return updated;
      });

      // Update employee points
      setEmployees(prev => prev.map(emp => 
        emp.id === assignedEmployeeId 
          ? { ...emp, points: Math.max(0, (emp.points || 0) - taskPoints) }
          : emp
      ));
    }

    // Sync to other tabs
    simpleCrossTabSync.markTaskUncompleted(taskId);
    lastSyncRef.current = Date.now();
  }, [taskAssignments, tasks, completedTasks, setCompletedTasks, setTaskAssignments, setDailyData, setEmployees]);

  // Function to save current state to sync
  const saveCurrentState = useCallback(() => {
    const syncData: Partial<SyncData> = {
      completedTasks: Array.from(completedTasks),
      taskAssignments,
      employees,
      dailyData,
      lastUpdated: Date.now()
    };
    
    simpleCrossTabSync.saveData(syncData);
    lastSyncRef.current = Date.now();
    console.log('💾 Current state saved to sync');
  }, [completedTasks, taskAssignments, employees, dailyData]);

  // Auto-save state changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (initializationRef.current) {
        saveCurrentState();
      }
    }, 500); // Debounce saves by 500ms

    return () => clearTimeout(timeoutId);
  }, [completedTasks, taskAssignments, employees, dailyData, saveCurrentState, tasks]);

  return {
    markTaskCompleted,
    markTaskUncompleted,
    saveCurrentState,
    deviceId: simpleCrossTabSync.getDeviceId(),
    isInitialized: initializationRef.current
  };
}