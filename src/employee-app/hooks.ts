// firebaseService.ts - FIXED to include all prep, store, and inventory fields
import { FIREBASE_CONFIG } from './constants';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData } from './defaultData';
import type { Employee, Task, DailyDataMap, TaskAssignments, PrepItem, ScheduledPrep, PrepSelections, StoreItem } from './types';
import type { InventoryItem, DatabaseItem, ActivityLogEntry } from './inventory/types';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';

export class FirebaseService {
  private baseUrl = FIREBASE_CONFIG.databaseURL;
  private saveQueue = new Set<string>();
  private isCurrentlySaving = false;
  private app = initializeApp(FIREBASE_CONFIG);
  private db = getDatabase(this.app);

  // Get the shared lastTaskResetDate from Firebase
  async getLastTaskResetDate(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/meta/lastTaskResetDate.json`);
      if (!response.ok) throw new Error('Failed to fetch lastTaskResetDate');
      const date = await response.json();
      return typeof date === 'string' ? date : null;
    } catch (error) {
      console.error('❌ Error fetching lastTaskResetDate:', error);
      return null;
    }
  }

  // Set the shared lastTaskResetDate in Firebase
  async setLastTaskResetDate(date: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/meta/lastTaskResetDate.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(date)
      });
      if (!response.ok) throw new Error('Failed to set lastTaskResetDate');
      return true;
    } catch (error) {
      console.error('❌ Error setting lastTaskResetDate:', error);
      return false;
    }
  }

  // Save single field - used by quickSave from hooks
  async saveField(field: string, data: any): Promise<boolean> {
    console.log(`🔥 Saving field ${field} to Firebase`);
    console.log(`🔍 Field ${field} data:`, this.getDataSummary(field, data));

    try {
      const response = await fetch(`${this.baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Firebase save failed: ${response.status} ${response.statusText}`);
      }

      console.log(`✅ Field ${field} saved successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Save failed for ${field}:`, error);
      return false;
    }
  }

  // Batch save for multiple fields
  async batchSave(fields: string[], allData: any): Promise<boolean> {
    if (this.isCurrentlySaving) {
      console.log('⏳ Save already in progress, queueing fields:', fields);
      fields.forEach(field => this.saveQueue.add(field));
      return true;
    }

    this.isCurrentlySaving = true;
    console.log(`🔄 Batch syncing fields:`, fields);

    try {
      const savePromises = fields.map(async (field) => {
        const data = this.getFieldData(field, allData);
        return this.saveField(field, data);
      });

      const results = await Promise.all(savePromises);
      const allSuccessful = results.every(result => result === true);

      if (allSuccessful) {
        console.log(`✅ Batch sync completed`);
        
        // Process any queued saves
        if (this.saveQueue.size > 0) {
          const queuedFields = Array.from(this.saveQueue);
          this.saveQueue.clear();
          console.log('📤 Processing sync queue:', queuedFields);
          
          setTimeout(() => {
            this.batchSave(queuedFields, allData);
          }, 100);
        }
      } else {
        console.error('❌ Some batch saves failed');
      }

      return allSuccessful;
    } catch (error) {
      console.error('❌ Batch save failed:', error);
      return false;
    } finally {
      this.isCurrentlySaving = false;
    }
  }

  // FIXED: Get data for specific field including ALL prep, store, and inventory fields
  private getFieldData(field: string, allData: any) {
    switch (field) {
      case 'employees':
        return allData.employees;
      case 'tasks':
        return allData.tasks;
      case 'dailyData':
        return allData.dailyData;
      case 'completedTasks':
        return Array.from(allData.completedTasks);
      case 'taskAssignments':
        return allData.taskAssignments;
      case 'customRoles':
        return allData.customRoles;
      case 'prepItems':
        return allData.prepItems;
      case 'scheduledPreps':
        return allData.scheduledPreps;
      case 'prepSelections':
        return allData.prepSelections;
      case 'storeItems':
        return allData.storeItems;
      // NEW: Inventory fields
      case 'dailyItems':
        return allData.dailyItems;
      case 'weeklyItems':
        return allData.weeklyItems;
      case 'monthlyItems':
        return allData.monthlyItems;
      case 'databaseItems':
        return allData.databaseItems;
      case 'activityLog':
        return allData.activityLog;
      default:
        console.warn(`Unknown field: ${field}`);
        return null;
    }
  }

  // Get data summary for logging
  private getDataSummary(field: string, data: any) {
    switch (field) {
      case 'employees':
        return {
          totalCount: data?.length || 0,
          sampleEmployee: data?.[0]?.name || 'none'
        };
      case 'tasks':
        return {
          totalCount: data?.length || 0,
          sampleTask: data?.[0]?.task || 'none'
        };
      case 'dailyData':
        return {
          totalDates: Object.keys(data || {}).length,
          latestDate: Object.keys(data || {}).sort().pop() || 'none'
        };
      case 'completedTasks':
        return {
          completedCount: Array.isArray(data) ? data.length : (data?.size || 0)
        };
      case 'taskAssignments':
        return {
          totalAssignments: Object.keys(data || {}).length
        };
      case 'customRoles':
        return {
          rolesCount: data?.length || 0,
          roles: data || []
        };
      case 'prepItems':
        return {
          totalCount: data?.length || 0,
          samplePrep: data?.[0]?.name || 'none'
        };
      case 'scheduledPreps':
        // ENHANCED: Better logging for scheduledPreps debugging
        const todayStr = new Date().toISOString().split('T')[0];
        const todayPreps = (data || []).filter((prep: any) => prep.scheduledDate === todayStr);
        return {
          totalCount: (data || []).length,
          todayCount: todayPreps.length,
          todayCompletedCount: todayPreps.filter((prep: any) => prep.completed).length,
          sampleTodayPreps: todayPreps.slice(0, 3).map((p: any) => ({
            id: p.id,
            name: p.name,
            completed: p.completed,
            scheduledDate: p.scheduledDate
          }))
        };
      case 'prepSelections':
        return {
          totalSelections: Object.keys(data || {}).length,
          sampleKeys: Object.keys(data || {}).slice(0, 3)
        };
      case 'storeItems':
        return {
          totalCount: data?.length || 0,
          availableCount: (data || []).filter((item: any) => item.available).length
        };
      // NEW: Inventory field summaries
      case 'dailyItems':
      case 'weeklyItems':
      case 'monthlyItems':
        return {
          totalCount: data?.length || 0,
          sampleItem: data?.[0]?.name || 'none',
          criticalItems: (data || []).filter((item: any) => item.currentStock <= item.minLevel).length
        };
      case 'databaseItems':
        return {
          totalCount: data?.length || 0,
          assignedCount: (data || []).filter((item: any) => item.isAssigned).length,
          unassignedCount: (data || []).filter((item: any) => !item.isAssigned).length
        };
      case 'activityLog':
        return {
          totalEntries: data?.length || 0,
          recentActivity: data?.[0]?.type || 'none'
        };
      default:
        return data;
    }
  }

  async loadData() {
    console.log('🔥 Loading data from Firebase...');

    try {
      // FIXED: Load ALL fields including prep, store, and inventory data
      const [
        employeesRes, 
        tasksRes, 
        dailyRes, 
        completedRes, 
        assignmentsRes, 
        rolesRes, 
        prepItemsRes,
        scheduledPrepsRes,
        prepSelectionsRes,
        storeItemsRes,
        // NEW: Inventory fields
        dailyItemsRes,
        weeklyItemsRes,
        monthlyItemsRes,
        databaseItemsRes,
        activityLogRes
      ] = await Promise.all([
        fetch(`${this.baseUrl}/employees.json`),
        fetch(`${this.baseUrl}/tasks.json`),
        fetch(`${this.baseUrl}/dailyData.json`),
        fetch(`${this.baseUrl}/completedTasks.json`),
        fetch(`${this.baseUrl}/taskAssignments.json`),
        fetch(`${this.baseUrl}/customRoles.json`),
        fetch(`${this.baseUrl}/prepItems.json`),
        fetch(`${this.baseUrl}/scheduledPreps.json`),
        fetch(`${this.baseUrl}/prepSelections.json`),
        fetch(`${this.baseUrl}/storeItems.json`),
        // NEW: Inventory fields
        fetch(`${this.baseUrl}/dailyItems.json`),
        fetch(`${this.baseUrl}/weeklyItems.json`),
        fetch(`${this.baseUrl}/monthlyItems.json`),
        fetch(`${this.baseUrl}/databaseItems.json`),
        fetch(`${this.baseUrl}/activityLog.json`)
      ]);
      
      const employeesData = await employeesRes.json();
      const tasksData = await tasksRes.json();
      const dailyDataRes = await dailyRes.json();
      const completedTasksData = await completedRes.json();
      const taskAssignmentsData = await assignmentsRes.json();
      const customRolesData = await rolesRes.json();
      const prepItemsData = await prepItemsRes.json();
      const scheduledPrepsData = await scheduledPrepsRes.json();
      const prepSelectionsData = await prepSelectionsRes.json();
      const storeItemsData = await storeItemsRes.json();
      // NEW: Inventory data
      const dailyItemsData = await dailyItemsRes.json();
      const weeklyItemsData = await weeklyItemsRes.json();
      const monthlyItemsData = await monthlyItemsRes.json();
      const databaseItemsData = await databaseItemsRes.json();
      const activityLogData = await activityLogRes.json();
      
      // Migrate employees data to include points if missing
      const migratedEmployees = employeesData ? 
        employeesData.map((emp: any) => ({
          ...emp,
          points: emp.points !== undefined ? emp.points : 0
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
      
      // ENHANCED: Log loaded prep data for debugging
      if (scheduledPrepsData) {
        console.log('📋 Loaded scheduledPreps:', this.getDataSummary('scheduledPreps', scheduledPrepsData));
      }

      // NEW: Log inventory data
      if (dailyItemsData) {
        console.log('🏪 Loaded inventory data:', {
          dailyItems: dailyItemsData?.length || 0,
          weeklyItems: weeklyItemsData?.length || 0,
          monthlyItems: monthlyItemsData?.length || 0,
          databaseItems: databaseItemsData?.length || 0,
          activityLog: activityLogData?.length || 0
        });
      }
      
      return {
        employees: migratedEmployees,
        tasks: migratedTasks,
        dailyData: migratedDailyData,
        completedTasks: new Set<number>(completedTasksData || []),
        taskAssignments: taskAssignmentsData || {},
        customRoles: customRolesData || ['Cleaner', 'Manager', 'Supervisor'],
        // FIXED: Include all prep and store data
        prepItems: prepItemsData || [],
        scheduledPreps: scheduledPrepsData || [],
        prepSelections: prepSelectionsData || {},
        storeItems: storeItemsData || [],
        // NEW: Include all inventory data
        dailyItems: dailyItemsData || [],
        weeklyItems: weeklyItemsData || [],
        monthlyItems: monthlyItemsData || [],
        databaseItems: databaseItemsData || [],
        activityLog: activityLogData || []
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

  // FIXED: Legacy saveData method updated to include ALL fields
  async saveData(data: {
    employees: Employee[];
    tasks: Task[];
    dailyData: DailyDataMap;
    completedTasks: Set<number>;
    taskAssignments: TaskAssignments;
    customRoles: string[];
    // FIXED: Include all the new fields
    prepItems: PrepItem[];
    scheduledPreps: ScheduledPrep[];
    prepSelections: PrepSelections;
    storeItems: StoreItem[];
    // NEW: Include inventory fields
    dailyItems: InventoryItem[];
    weeklyItems: InventoryItem[];
    monthlyItems: InventoryItem[];
    databaseItems: DatabaseItem[];
    activityLog: ActivityLogEntry[];
  }) {
    console.log('🔥 Saving all data to Firebase...');

    // FIXED: Include all fields in the save
    const fields = [
      'employees', 
      'tasks', 
      'dailyData', 
      'completedTasks', 
      'taskAssignments', 
      'customRoles',
      'prepItems',
      'scheduledPreps', 
      'prepSelections',
      'storeItems',
      // NEW: Inventory fields
      'dailyItems',
      'weeklyItems',
      'monthlyItems',
      'databaseItems',
      'activityLog'
    ];

    const success = await this.batchSave(fields, data);

    if (success) {
      console.log('✅ Firebase: All data saved successfully');
    } else {
      console.error('❌ Firebase: Some data failed to save');
      throw new Error('Firebase save failed');
    }
  }

  // Immediate save for critical operations (like task completion)
  async saveImmediate(field: string, data: any, allData?: any): Promise<boolean> {
    console.log(`🔥 Immediate save triggered by ${field} change`);

    // Save the specific field immediately
    const success = await this.saveField(field, data);

    if (success) {
      // Also trigger a background save of related fields after a short delay
      if (allData && field !== 'scheduledPreps') {
        setTimeout(() => {
          console.log('🔄 Background sync of related fields');
          const relatedFields = this.getRelatedFields(field);
          if (relatedFields.length > 0) {
            this.batchSave(relatedFields, allData);
          }
        }, 1000);
      }
    }

    return success;
  }

  // Get fields that should be synced together
  private getRelatedFields(changedField: string): string[] {
    switch (changedField) {
      case 'completedTasks':
        return ['employees', 'dailyData', 'taskAssignments'];
      case 'employees':
        return ['dailyData'];
      case 'taskAssignments':
        return ['completedTasks'];
      case 'scheduledPreps':
        return ['prepSelections']; // Prep completions might affect selections
      // NEW: Inventory related fields
      case 'dailyItems':
      case 'weeklyItems':
      case 'monthlyItems':
        return ['activityLog']; // Inventory changes should log activity
      case 'databaseItems':
        return ['dailyItems', 'weeklyItems', 'monthlyItems']; // Database changes might affect inventory
      default:
        return [];
    }
  }

  // True real-time listeners using Firebase SDK
  onCompletedTasksChange(callback: (completed: number[] | Set<number>) => void) {
    const completedRef = ref(this.db, 'completedTasks');
    const handler = onValue(completedRef, (snapshot) => {
      const data = snapshot.val() || [];
      callback(data);
    });
    return () => off(completedRef, 'value', handler);
  }

  onTaskAssignmentsChange(callback: (assignments: any) => void) {
    const assignmentsRef = ref(this.db, 'taskAssignments');
    const handler = onValue(assignmentsRef, (snapshot) => {
      const data = snapshot.val() || {};
      callback(data);
    });
    return () => off(assignmentsRef, 'value', handler);
  }

  // NEW: Inventory real-time listeners
  onInventoryItemsChange(frequency: 'daily' | 'weekly' | 'monthly', callback: (items: InventoryItem[]) => void) {
    const inventoryRef = ref(this.db, `${frequency}Items`);
    const handler = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val() || [];
      callback(Array.isArray(data) ? data : Object.values(data));
    });
    return () => off(inventoryRef, 'value', handler);
  }

  onDatabaseItemsChange(callback: (items: DatabaseItem[]) => void) {
    const databaseRef = ref(this.db, 'databaseItems');
    const handler = onValue(databaseRef, (snapshot) => {
      const data = snapshot.val() || [];
      callback(Array.isArray(data) ? data : Object.values(data));
    });
    return () => off(databaseRef, 'value', handler);
  }

  onActivityLogChange(callback: (log: ActivityLogEntry[]) => void) {
    const activityRef = ref(this.db, 'activityLog');
    const handler = onValue(activityRef, (snapshot) => {
      const data = snapshot.val() || [];
      callback(Array.isArray(data) ? data : Object.values(data));
    });
    return () => off(activityRef, 'value', handler);
  }
}
