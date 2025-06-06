// taskFunctions.ts
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
    const updatedCompletions = [...existingCompletions, completion];
    const newCompletionRate = Math.round((updatedCompletions.length / tasks.length) * 100);
    const newTotalPointsEarned = (todayData.totalPointsEarned || 0) + pointsEarned;
    
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

  console.log('📊 Task completion logged:', completion);
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
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void
) => {
  const wasCompleted = completedTasks.has(taskId);
  const newCompletedTasks = new Set(completedTasks);
  const task = tasks.find(t => t.id === taskId);
  
  if (wasCompleted) {
    // Uncomplete task - remove points
    newCompletedTasks.delete(taskId);
    // Remove task assignment when unclaiming
    setTaskAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[taskId];
      return newAssignments;
    });
    
    // Deduct points from employee who completed it
    const assignedEmp = getAssignedEmployee(taskId, taskAssignments, employees);
    if (assignedEmp && task) {
      setEmployees(prev => prev.map(emp => 
        emp.id === assignedEmp.id 
          ? { ...emp, points: Math.max(0, emp.points - task.points) }
          : emp
      ));
    }
  } else {
    // Complete task - award points
    const assignedEmp = getAssignedEmployee(taskId, taskAssignments, employees);
    const empId = assignToEmployeeId || assignedEmp?.id || currentUserId;
    
    // Update assignment if a specific employee was provided
    if (assignToEmployeeId) {
      setTaskAssignments(prev => ({ ...prev, [taskId]: assignToEmployeeId }));
    } else if (!assignedEmp) {
      setTaskAssignments(prev => ({ ...prev, [taskId]: currentUserId }));
    }
    
    newCompletedTasks.add(taskId);
    
    // Award points and save completion to daily tracking
    if (task) {
      awardPoints(empId, task.points, setEmployees);
      saveDailyTaskCompletion(taskId, empId, task.task, task.points, tasks, setDailyData);
    }
  }
  
  setCompletedTasks(newCompletedTasks);
};
