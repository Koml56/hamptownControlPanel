// taskFunctions.ts - Fixed to prevent duplicate daily completions
import { getFormattedDate } from './utils';
import type { Task, TaskAssignments, Employee, DailyDataMap } from './types';

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
  const wasCompleted = completedTasks.has(taskId);
  const newCompletedTasks = new Set(completedTasks);
  const task = tasks.find(t => t.id === taskId);
  const currentlyAssignedEmp = getAssignedEmployee(taskId, taskAssignments, employees);
  
  if (!task) {
    console.error('Task not found:', taskId);
    return;
  }

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
  
  // Immediately save to Firebase after task completion change
  if (saveToFirebase) {
    console.log('🔥 Immediate save triggered by task completion');
    setTimeout(() => {
      console.log('⏰ Executing immediate save now...');
      saveToFirebase();
    }, 200);
  }
};

// Handle reassignment of already completed tasks
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
  const task = tasks.find(t => t.id === taskId);
  const oldAssignedEmp = getAssignedEmployee(taskId, taskAssignments, employees);
  const newAssignedEmp = employees.find(emp => emp.id === newEmployeeId);
  
  if (!task || !newAssignedEmp) {
    console.error('Task or new employee not found');
    return;
  }

  // Only proceed if the task is completed and assignment is actually changing
  if (!completedTasks.has(taskId) || oldAssignedEmp?.id === newEmployeeId) {
    // If task is not completed, just update assignment normally
    setTaskAssignments(prev => ({ ...prev, [taskId]: newEmployeeId }));
    return;
  }

  console.log(`🔄 Reassigning completed task from ${oldAssignedEmp?.name || 'unassigned'} to ${newAssignedEmp.name}`);

  // Transfer points from old employee to new employee
  if (oldAssignedEmp) {
    transferPoints(oldAssignedEmp.id, newEmployeeId, task.points, setEmployees);
  } else {
    // If no previous assignment, just award points to new employee
    awardPoints(newEmployeeId, task.points, setEmployees);
  }

  // Update task assignment
  setTaskAssignments(prev => ({ ...prev, [taskId]: newEmployeeId }));

  // CRITICAL: Update daily data to reflect the new assignment
  // This replaces the old completion record with the new employee
  saveDailyTaskCompletion(taskId, newEmployeeId, task.task, task.points, tasks, setDailyData);

  // Save to Firebase
  if (saveToFirebase) {
    console.log('🔥 Immediate save triggered by task reassignment');
    setTimeout(() => {
      saveToFirebase();
    }, 200);
  }
};
