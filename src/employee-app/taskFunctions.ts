// taskFunctions.ts - Fixed to prevent duplicate daily completions with cross-tab coordination
import { getFormattedDate } from './utils';
import type { Task, TaskAssignments, Employee, DailyDataMap } from './types';
import { CrossTabOperationManager } from './CrossTabOperationManager';

// Cross-tab operation coordination to prevent conflicts
const DEVICE_ID = (() => {
  let id = localStorage.getItem('hamptown_deviceId');
  if (!id) {
    id = 'device-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
    localStorage.setItem('hamptown_deviceId', id);
  }
  return id;
})();

const crossTabManager = new CrossTabOperationManager(DEVICE_ID);

// Legacy debouncing mechanism (kept for backward compatibility)
const pendingOperations = new Map<number, NodeJS.Timeout>();
const operationTimestamps = new Map<number, number>();

// Clear any pending operation for a task
const clearPendingOperation = (taskId: number) => {
  const timeout = pendingOperations.get(taskId);
  if (timeout) {
    clearTimeout(timeout);
    pendingOperations.delete(taskId);
  }
};

// Enhanced cross-tab aware operation check
const shouldAllowOperation = (taskId: number, minDelay: number = 1000): boolean => {
  // First check cross-tab coordination
  if (!crossTabManager.shouldAllowOperation(taskId, 'TOGGLE_TASK', minDelay)) {
    return false;
  }
  
  // Then check local timing (additional protection)
  const lastOperation = operationTimestamps.get(taskId) || 0;
  const now = Date.now();
  
  if (now - lastOperation < minDelay) {
    console.warn(`⚠️ Task operation debounced locally for task ${taskId} - too rapid`);
    crossTabManager.completeOperation(taskId); // Clean up cross-tab state
    return false;
  }
  
  operationTimestamps.set(taskId, now);
  return true;
};

export const saveDailyTaskCompletion = (
  taskId: number,
  employeeId: number,
  taskName: string,
  pointsEarned: number,
  tasks: Task[],
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void
) => {
  const today = new Date();
  const todayStr = getFormattedDate(today);
  const now = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const completion = {
    taskId,
    employeeId,
    completedAt: now,
    taskName,
    date: todayStr,
    pointsEarned
  };

  setDailyData(prev => {
    const todayData = prev[todayStr] || { 
      completedTasks: [], 
      employeeMoods: [], 
      purchases: [],
      totalTasks: tasks.length, 
      completionRate: 0,
      totalPointsEarned: 0,
      totalPointsSpent: 0
    };
    
    const existingCompletions = Array.isArray(todayData.completedTasks) ? todayData.completedTasks : [];
    
    // CRITICAL FIX: Remove any existing completion for this specific task
    // This prevents duplicates when task is completed -> uncompleted -> completed again
    const filteredCompletions = existingCompletions.filter(c => c.taskId !== taskId);
    const updatedCompletions = [...filteredCompletions, completion];
    
    const newCompletionRate = Math.round((updatedCompletions.length / tasks.length) * 100);
    const newTotalPointsEarned = updatedCompletions.reduce((sum, c) => sum + (c.pointsEarned || 0), 0);
    
    return {
      ...prev,
      [todayStr]: {
        ...todayData,
        completedTasks: updatedCompletions,
        totalTasks: tasks.length,
        completionRate: newCompletionRate,
        totalPointsEarned: newTotalPointsEarned
      }
    };
  });

  console.log('📊 Task completion logged (replacing any previous completion):', completion);
};

export const removeDailyTaskCompletion = (
  taskId: number,
  tasks: Task[],
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void
) => {
  const today = new Date();
  const todayStr = getFormattedDate(today);

  setDailyData(prev => {
    const todayData = prev[todayStr] || { 
      completedTasks: [], 
      employeeMoods: [], 
      purchases: [],
      totalTasks: tasks.length, 
      completionRate: 0,
      totalPointsEarned: 0,
      totalPointsSpent: 0
    };
    
    const existingCompletions = Array.isArray(todayData.completedTasks) ? todayData.completedTasks : [];
    
    // Remove the completion for this task
    const filteredCompletions = existingCompletions.filter(c => c.taskId !== taskId);
    
    const newCompletionRate = Math.round((filteredCompletions.length / tasks.length) * 100);
    const newTotalPointsEarned = filteredCompletions.reduce((sum, c) => sum + (c.pointsEarned || 0), 0);
    
    return {
      ...prev,
      [todayStr]: {
        ...todayData,
        completedTasks: filteredCompletions,
        totalTasks: tasks.length,
        completionRate: newCompletionRate,
        totalPointsEarned: newTotalPointsEarned
      }
    };
  });

  console.log('🗑️ Task completion removed from daily data:', taskId);
};

export const transferPoints = (
  fromEmployeeId: number,
  toEmployeeId: number,
  points: number,
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void
) => {
  setEmployees(prev => prev.map(emp => {
    if (emp.id === fromEmployeeId) {
      return { ...emp, points: Math.max(0, emp.points - points) };
    }
    if (emp.id === toEmployeeId) {
      return { ...emp, points: emp.points + points };
    }
    return emp;
  }));
  
  console.log(`💰 Transferred ${points} points from employee ${fromEmployeeId} to ${toEmployeeId}`);
};

export const awardPoints = (
  employeeId: number,
  points: number,
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void
) => {
  setEmployees(prev => prev.map(emp => 
    emp.id === employeeId 
      ? { ...emp, points: emp.points + points }
      : emp
  ));
};

export const deductPoints = (
  employeeId: number,
  points: number,
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void
) => {
  setEmployees(prev => prev.map(emp => 
    emp.id === employeeId 
      ? { ...emp, points: Math.max(0, emp.points - points) }
      : emp
  ));
};

export const assignTask = (
  taskId: number,
  employeeId: number,
  setTaskAssignments: (updater: (prev: TaskAssignments) => TaskAssignments) => void
) => {
  setTaskAssignments(prev => ({ ...prev, [taskId]: employeeId }));
};

export const getAssignedEmployee = (taskId: number, taskAssignments: TaskAssignments, employees: Employee[]) => {
  const empId = taskAssignments[taskId];
  return employees.find(emp => emp.id === empId);
};

export const toggleTaskComplete = (
  taskId: number,
  assignToEmployeeId: number | undefined,
  currentUserId: number,
  completedTasks: Set<number>,
  taskAssignments: TaskAssignments,
  tasks: Task[],
  employees: Employee[],
  setCompletedTasks: (tasks: Set<number>) => void,
  setTaskAssignments: (updater: (prev: TaskAssignments) => TaskAssignments) => void,
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void,
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void,
  saveToFirebase?: () => void
) => {
  // ENHANCED CROSS-TAB DEBOUNCE: Prevent rapid clicking across tabs
  if (!shouldAllowOperation(taskId, 1000)) {
    console.warn(`🚫 Task ${taskId} operation blocked by cross-tab coordination`);
    return;
  }

  // Clear any pending operations for this task
  clearPendingOperation(taskId);

  const wasCompleted = completedTasks.has(taskId);
  const newCompletedTasks = new Set(completedTasks);
  const task = tasks.find(t => t.id === taskId);
  const currentlyAssignedEmp = getAssignedEmployee(taskId, taskAssignments, employees);
  
  if (!task) {
    console.error('Task not found:', taskId);
    crossTabManager.completeOperation(taskId); // Clean up cross-tab state
    return;
  }

  console.log(`🔄 Processing task ${taskId} (${task.task}) - wasCompleted: ${wasCompleted}, device: ${DEVICE_ID}`);

  try {
    if (wasCompleted) {
      // UNCOMPLETING A TASK
      console.log(`🔄 Uncompleting task: ${task.task}`);
      
      newCompletedTasks.delete(taskId);
      
      // Remove task assignment when uncompleting
      setTaskAssignments(prev => {
        const newAssignments = { ...prev };
        delete newAssignments[taskId];
        return newAssignments;
      });
      
      // Deduct points from the employee who had completed it
      if (currentlyAssignedEmp) {
        deductPoints(currentlyAssignedEmp.id, task.points, setEmployees);
        console.log(`📉 Deducted ${task.points} points from ${currentlyAssignedEmp.name} for uncompleting task`);
      }
      
      // CRITICAL: Remove from daily completion tracking
      removeDailyTaskCompletion(taskId, tasks, setDailyData);
      
    } else {
      // COMPLETING A TASK
      console.log(`✅ Completing task: ${task.task}`);
      
      const targetEmployeeId = assignToEmployeeId || currentlyAssignedEmp?.id || currentUserId;
      
      // Update assignment if a specific employee was provided
      if (assignToEmployeeId) {
        setTaskAssignments(prev => ({ ...prev, [taskId]: assignToEmployeeId }));
      } else if (!currentlyAssignedEmp) {
        setTaskAssignments(prev => ({ ...prev, [taskId]: currentUserId }));
      }
      
      newCompletedTasks.add(taskId);
      
      // Award points and save completion to daily tracking
      awardPoints(targetEmployeeId, task.points, setEmployees);
      saveDailyTaskCompletion(taskId, targetEmployeeId, task.task, task.points, tasks, setDailyData);
      
      console.log(`📈 Awarded ${task.points} points to employee ${targetEmployeeId} for completing task`);
    }
    
    setCompletedTasks(newCompletedTasks);
    
    // CROSS-TAB COORDINATED SAVE: Save to Firebase after task completion change
    if (saveToFirebase) {
      console.log('🔥 [CRITICAL-SAVE] Cleaning tasks: About to save via cross-tab coordination');
      
      // Clear any existing pending save for this task
      clearPendingOperation(taskId);
      
      // Schedule a coordinated save operation
      const saveTimeout = setTimeout(() => {
        console.log(`⏰ Executing coordinated save for task ${taskId} from device ${DEVICE_ID}`);
        saveToFirebase();
        pendingOperations.delete(taskId);
        crossTabManager.completeOperation(taskId); // Mark operation as complete
      }, 750); // Slightly faster save but still debounced
      
      pendingOperations.set(taskId, saveTimeout);
    } else {
      // If no save function, still mark operation as complete
      crossTabManager.completeOperation(taskId);
    }
    
    console.log(`✅ Task ${taskId} operation completed successfully by device ${DEVICE_ID}`);
    
  } catch (error) {
    console.error(`❌ Error processing task ${taskId}:`, error);
    crossTabManager.completeOperation(taskId); // Clean up cross-tab state on error
    throw error; // Re-throw to maintain error handling behavior
  }
};

// Handle reassignment of already completed tasks with cross-tab coordination
export const reassignCompletedTask = (
  taskId: number,
  newEmployeeId: number,
  completedTasks: Set<number>,
  taskAssignments: TaskAssignments,
  tasks: Task[],
  employees: Employee[],
  setTaskAssignments: (updater: (prev: TaskAssignments) => TaskAssignments) => void,
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void,
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void,
  saveToFirebase?: () => void
) => {
  // ENHANCED CROSS-TAB DEBOUNCE: Prevent rapid reassignment clicks across tabs
  if (!crossTabManager.shouldAllowOperation(taskId, 'ASSIGN_TASK', 800)) {
    console.warn(`🚫 Task ${taskId} reassignment blocked by cross-tab coordination`);
    return;
  }

  const task = tasks.find(t => t.id === taskId);
  const oldAssignedEmp = getAssignedEmployee(taskId, taskAssignments, employees);
  const newAssignedEmp = employees.find(emp => emp.id === newEmployeeId);
  
  if (!task || !newAssignedEmp) {
    console.error('Task or new employee not found');
    crossTabManager.completeOperation(taskId); // Clean up cross-tab state
    return;
  }

  console.log(`🔄 Reassigning completed task ${taskId} from ${oldAssignedEmp?.name || 'unassigned'} to ${newAssignedEmp.name} (device: ${DEVICE_ID})`);

  try {
    // Transfer points: deduct from old employee, add to new employee
    if (oldAssignedEmp && oldAssignedEmp.id !== newEmployeeId) {
      transferPoints(oldAssignedEmp.id, newEmployeeId, task.points, setEmployees);
      console.log(`💰 Transferred ${task.points} points from ${oldAssignedEmp.name} to ${newAssignedEmp.name}`);
    } else if (!oldAssignedEmp) {
      // If no previous assignee, just award points to new assignee
      awardPoints(newEmployeeId, task.points, setEmployees);
      console.log(`📈 Awarded ${task.points} points to ${newAssignedEmp.name} for reassigned task`);
    }
    
    // Update task assignment
    setTaskAssignments(prev => ({ ...prev, [taskId]: newEmployeeId }));
    
    // Update daily tracking - remove old completion and add new one
    removeDailyTaskCompletion(taskId, tasks, setDailyData);
    saveDailyTaskCompletion(taskId, newEmployeeId, task.task, task.points, tasks, setDailyData);
    
    // CROSS-TAB COORDINATED SAVE: Save changes with coordination
    if (saveToFirebase) {
      setTimeout(() => {
        console.log(`⏰ Executing coordinated reassignment save for task ${taskId} from device ${DEVICE_ID}`);
        saveToFirebase();
        crossTabManager.completeOperation(taskId); // Mark operation as complete
      }, 600); // Slightly faster for reassignments
    } else {
      crossTabManager.completeOperation(taskId);
    }
    
    console.log(`✅ Task ${taskId} reassignment completed successfully by device ${DEVICE_ID}`);
    
  } catch (error) {
    console.error(`❌ Error reassigning task ${taskId}:`, error);
    crossTabManager.completeOperation(taskId); // Clean up cross-tab state on error
    throw error;
  }
};

// Export the cross-tab manager for debugging
export const getCrossTabManagerStatus = () => crossTabManager.getStatus();
export const getCrossTabDeviceId = () => DEVICE_ID;
