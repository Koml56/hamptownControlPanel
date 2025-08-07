// storeFunctions.ts
import { getFormattedDate } from './utils';
import type { Employee, StoreItem, Purchase, DailyDataMap } from './types';

export const canAffordItem = (employee: Employee, item: StoreItem): boolean => {
  return employee.points >= item.cost && item.available;
};

export const purchaseItem = (
  employeeId: number,
  item: StoreItem,
  employees: Employee[],
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void,
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void
): boolean => {
  try {
    const employee = employees.find(emp => emp.id === employeeId);

    if (!employee) {
      alert(`Employee with id ${employeeId} not found`);
      return false;
    }

    if (!canAffordItem(employee, item)) {
      alert(`Insufficient points! You need ${item.cost} points but only have ${employee.points}.`);
      return false;
    }

    const today = new Date();
    const todayStr = getFormattedDate(today);
    const now = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    // Update employee points
    setEmployees(prevEmployees =>
      prevEmployees.map(emp =>
        emp.id === employeeId ? { ...emp, points: emp.points - item.cost } : emp
      )
    );

    // Create purchase record
    const purchase: Purchase = {
      id: Date.now(),
      employeeId,
      itemId: item.id,
      itemName: item.name,
      cost: item.cost,
      purchasedAt: now,
      date: todayStr,
      status: 'pending'
    };

    // Update dailyData immutably
    setDailyData(prev => {
      const todayData = prev[todayStr] || {
        completedTasks: [],
        employeeMoods: [],
        purchases: [],
        totalTasks: 22,
        completionRate: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0
      };

      const updatedPurchases = Array.isArray(todayData.purchases)
        ? [...todayData.purchases, purchase]
        : [purchase];

      const newTotalSpent = (todayData.totalPointsSpent || 0) + item.cost;

      const updatedDailyData = {
        ...prev,
        [todayStr]: {
          ...todayData,
          purchases: updatedPurchases,
          totalPointsSpent: newTotalSpent
        }
      };

      return updatedDailyData;
    });

    console.log("🛒 Purchase logged successfully:", purchase);
    return true;
  } catch (error) {
    console.error("❌ Error during purchase:", error);
    alert("An error occurred during purchase. Please try again.");
    return false;
  }
};

export const getEmployeePoints = (employeeId: number, employees: Employee[]): number => {
  const employee = employees.find(emp => emp.id === employeeId);
  return employee?.points || 0;
};

export const getEmployeePurchaseHistory = (
  employeeId: number, 
  dailyData: DailyDataMap, 
  days: number = 30
): Purchase[] => {
  const purchases: Purchase[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = getFormattedDate(date);
    const dayData = dailyData[dateStr];
    
    if (dayData?.purchases) {
      const employeePurchases = dayData.purchases.filter(p => p.employeeId === employeeId);
      purchases.push(...employeePurchases);
    }
  }
  
  return purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getTotalPointsEarned = (employeeId: number, dailyData: DailyDataMap, days: number = 30): number => {
  let total = 0;
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = getFormattedDate(date);
    const dayData = dailyData[dateStr];
    
    if (dayData?.completedTasks) {
      const employeeTasks = dayData.completedTasks.filter(t => t.employeeId === employeeId);
      total += employeeTasks.reduce((sum, task) => sum + (task.pointsEarned || 0), 0);
    }
  }
  
  return total;
};

export const getTotalPointsSpent = (employeeId: number, dailyData: DailyDataMap, days: number = 30): number => {
  let total = 0;
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = getFormattedDate(date);
    const dayData = dailyData[dateStr];
    
    if (dayData?.purchases) {
      const employeePurchases = dayData.purchases.filter(p => p.employeeId === employeeId);
      total += employeePurchases.reduce((sum, purchase) => sum + purchase.cost, 0);
    }
  }
  
  return total;
};

export const getLeaderboard = (employees: Employee[]): Employee[] => {
  return [...employees]
    .sort((a, b) => b.points - a.points)
    .slice(0, 10); // Top 10
};
