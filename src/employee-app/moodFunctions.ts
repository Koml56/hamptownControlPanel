// moodFunctions.ts
import { getFormattedDate } from './utils';
import type { Employee, DailyDataMap } from './types';

export const canUpdateMoodToday = (currentUserId: number, employees: Employee[]): boolean => {
  const today = new Date();
  const todayStr = getFormattedDate(today);
  const currentEmp = employees.find(emp => emp.id === currentUserId);
  return !currentEmp || currentEmp.lastMoodDate !== todayStr;
};

export const getNextMoodUpdate = (currentUserId: number, employees: Employee[]): string => {
  const currentEmp = employees.find(emp => emp.id === currentUserId);
  if (!currentEmp || !currentEmp.lastMoodDate) return '';
  
  const today = new Date();
  const todayStr = getFormattedDate(today);
  if (currentEmp.lastMoodDate === todayStr) {
    return 'You can update your mood again tomorrow!';
  }
  return '';
};

export const handleMoodUpdate = (
  mood: number,
  currentUserId: number,
  employees: Employee[],
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void,
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void
): boolean => {
  const today = new Date();
  const todayStr = getFormattedDate(today);
  const currentEmp = employees.find(emp => emp.id === currentUserId);
  
  if (currentEmp && currentEmp.lastMoodDate === todayStr) {
    alert('You have already updated your mood today! Come back tomorrow 😊');
    return false;
  }
  
  // Update employee's mood and date
  setEmployees(prev => prev.map(emp => 
    emp.id === currentUserId 
      ? { 
          ...emp, 
          mood: mood, 
          lastUpdated: 'Just now',
          lastMoodDate: todayStr
        }
      : emp
  ));

  // Save mood to daily data
  const now = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  setDailyData(prev => {
    const todayData = prev[todayStr] || { completedTasks: [], employeeMoods: [], totalTasks: 22, completionRate: 0 };
    const existingMoods = Array.isArray(todayData.employeeMoods) ? todayData.employeeMoods : [];
    const moodUpdate = {
      employeeId: currentUserId,
      mood: mood,
      updatedAt: now
    };
    
    return {
      ...prev,
      [todayStr]: {
        ...todayData,
        employeeMoods: [...existingMoods.filter(m => m.employeeId !== currentUserId), moodUpdate]
      }
    };
  });
  
  return true;
};

export const calculateAverageMood = (employees: Employee[]): string => {
  return (employees.reduce((sum, emp) => sum + emp.mood, 0) / employees.length).toFixed(1);
};