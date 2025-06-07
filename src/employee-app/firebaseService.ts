// firebaseService.ts
import { FIREBASE_CONFIG } from './constants';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData } from './defaultData';
import type { Employee, Task, DailyDataMap, TaskAssignments } from './types';

export class FirebaseService {
  private baseUrl = FIREBASE_CONFIG.databaseURL;

  async loadData() {
    console.log('🔥 Loading data from Firebase...');
    
    try {
      const [employeesRes, tasksRes, dailyRes, completedRes, assignmentsRes, rolesRes] = await Promise.all([
        fetch(`${this.baseUrl}/employees.json`),
        fetch(`${this.baseUrl}/tasks.json`),
        fetch(`${this.baseUrl}/dailyData.json`),
        fetch(`${this.baseUrl}/completedTasks.json`),
        fetch(`${this.baseUrl}/taskAssignments.json`),
        fetch(`${this.baseUrl}/customRoles.json`)
      ]);
      
      const employeesData = await employeesRes.json();
      const tasksData = await tasksRes.json();
      const dailyDataRes = await dailyRes.json();
      const completedTasksData = await completedRes.json();
      const taskAssignmentsData = await assignmentsRes.json();
      const customRolesData = await rolesRes.json();
      
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
      
      console.log('✅ Firebase: Data loaded and migrated successfully');
      console.log('👥 Employees with points:', migratedEmployees);
      
      return {
        employees: migratedEmployees,
        tasks: migratedTasks,
        dailyData: migratedDailyData,
        completedTasks: new Set<number>(completedTasksData || []),
        taskAssignments: taskAssignmentsData || {},
        customRoles: customRolesData || ['Cleaner', 'Manager', 'Supervisor']
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

  async saveData(data: {
    employees: Employee[];
    tasks: Task[];
    dailyData: DailyDataMap;
    completedTasks: Set<number>;
    taskAssignments: TaskAssignments;
    customRoles: string[];
  }) {
    console.log('🔥 Saving to Firebase...');
    
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
        })
      ]);
      
      console.log('✅ Firebase: Data saved successfully');
      
    } catch (error) {
      console.error('❌ Firebase save failed:', error);
      throw error;
    }
  }
}