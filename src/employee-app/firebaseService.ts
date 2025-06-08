// firebaseService.ts
import { FIREBASE_CONFIG } from './constants';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
import type { Employee, Task, DailyDataMap, TaskAssignments, StoreItem } from './types';

export class FirebaseService {
  private baseUrl = FIREBASE_CONFIG.databaseURL;

  async loadData() {
    console.log('🔥 Loading data from Firebase...');
    
    try {
      const [employeesRes, tasksRes, dailyRes, completedRes, assignmentsRes, rolesRes, storeRes] = await Promise.all([
        fetch(`${this.baseUrl}/employees.json`),
        fetch(`${this.baseUrl}/tasks.json`),
        fetch(`${this.baseUrl}/dailyData.json`),
        fetch(`${this.baseUrl}/completedTasks.json`),
        fetch(`${this.baseUrl}/taskAssignments.json`),
        fetch(`${this.baseUrl}/customRoles.json`),
        fetch(`${this.baseUrl}/storeItems.json`) // Add store items endpoint
      ]);
      
      const employeesData = await employeesRes.json();
      const tasksData = await tasksRes.json();
      const dailyDataRes = await dailyRes.json();
      const completedTasksData = await completedRes.json();
      const taskAssignmentsData = await assignmentsRes.json();
      const customRolesData = await rolesRes.json();
      const storeItemsData = await storeRes.json();
      
      // Migrate employees data to include points if missing
      const migratedEmployees = employeesData ? employeesData.map((emp: any) => ({
        ...emp,
        points: emp.points !== undefined ? emp.points : 0 // Add points if missing
      })) : getDefaultEmployees();

      // Migrate tasks data to include points if missing
      const migratedTasks = tasksData ? tasksData.map((task: any) => ({
        ...task,
        points: task.points !== undefined ? task.points : this.getDefaultTaskPoints(task.priority)
      })) : getDefaultTasks();

      // Migrate daily data to include new fields
      const migratedDailyData = dailyDataRes ? this.migrateDailyData(dailyDataRes) : getEmptyDailyData();
      
      // Migrate store items to ensure all required fields
      const migratedStoreItems = storeItemsData ? this.migrateStoreItems(storeItemsData) : getDefaultStoreItems();
      
      console.log('✅ Firebase: Data loaded and migrated successfully');
      console.log('👥 Employees with points:', migratedEmployees);
      console.log('🏪 Store items loaded:', migratedStoreItems);
      
      return {
        employees: migratedEmployees,
        tasks: migratedTasks,
        dailyData: migratedDailyData,
        completedTasks: new Set<number>(), // Now derived from dailyData
        taskAssignments: {}, // Now derived from dailyData
        customRoles: customRolesData || ['Cleaner', 'Manager', 'Supervisor'],
        storeItems: migratedStoreItems
      };
      
    } catch (error) {
      console.error('❌ Firebase connection failed:', error);
      throw error;
    }
  }

  private getDefaultTaskPoints(priority: string): number {
    switch (priority) {
      case 'high': return 10;
      case 'medium': return 5;
      case 'low': return 3;
      default: return 5;
    }
  }

  private migrateDailyData(dailyData: any): DailyDataMap {
    const migrated: DailyDataMap = {};
    
    Object.keys(dailyData).forEach(date => {
      const dayData = dailyData[date];
      migrated[date] = {
        completedTasks: dayData.completedTasks || [],
        employeeMoods: dayData.employeeMoods || [],
        purchases: dayData.purchases || [],
        totalTasks: dayData.totalTasks || 22,
        completionRate: dayData.completionRate || 0,
        totalPointsEarned: dayData.totalPointsEarned || 0,
        totalPointsSpent: dayData.totalPointsSpent || 0
      };
    });
    
    return migrated;
  }

  private migrateStoreItems(storeItems: any[]): StoreItem[] {
    if (!storeItems || !Array.isArray(storeItems)) return getDefaultStoreItems();
    
    return storeItems.map(item => ({
      id: item.id || 0,
      name: item.name || 'Unknown Item',
      description: item.description || 'No description',
      cost: typeof item.cost === 'number' ? item.cost : 10,
      category: item.category || 'reward',
      icon: item.icon || '🎁',
      available: typeof item.available === 'boolean' ? item.available : true
    }));
  }

  async saveData(data: {
    employees: Employee[];
    tasks: Task[];
    dailyData: DailyDataMap;
    completedTasks: Set<number>;
    taskAssignments: TaskAssignments;
    customRoles: string[];
    storeItems: StoreItem[];
  }) {
    console.log('🔥 Saving to Firebase...');
    console.log('🏪 Store items to save:', data.storeItems);
    
    try {
      await Promise.all([
        fetch(`${this.baseUrl}/employees.json`, {
          method: 'PUT',
          body: JSON.stringify(data.employees)
        }),
        fetch(`${this.baseUrl}/tasks.json`, {
          method: 'PUT', 
          body: JSON.stringify(data.tasks)
        }),
        fetch(`${this.baseUrl}/dailyData.json`, {
          method: 'PUT',
          body: JSON.stringify(data.dailyData)
        }),
        fetch(`${this.baseUrl}/completedTasks.json`, {
          method: 'PUT',
          body: JSON.stringify(Array.from(data.completedTasks))
        }),
        fetch(`${this.baseUrl}/taskAssignments.json`, {
          method: 'PUT',
          body: JSON.stringify(data.taskAssignments)
        }),
        fetch(`${this.baseUrl}/customRoles.json`, {
          method: 'PUT',
          body: JSON.stringify(data.customRoles)
        }),
        fetch(`${this.baseUrl}/storeItems.json`, {
          method: 'PUT',
          body: JSON.stringify(data.storeItems)
        })
      ]);
      
      console.log('✅ Firebase: Data saved successfully');
      
    } catch (error) {
      console.error('❌ Firebase save failed:', error);
      throw error;
    }
  }
}
