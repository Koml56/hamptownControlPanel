// src/employee-app/firebaseService.ts - Enhanced with inventory support
import { FIREBASE_CONFIG } from './constants';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData } from './defaultData';
import type { Employee, Task, DailyDataMap, TaskAssignments, PrepItem, ScheduledPrep, PrepSelections, StoreItem } from './types';
import type { InventoryItem, DatabaseItem, ActivityLogEntry } from './inventory/types';

export class FirebaseService {
  private baseUrl = FIREBASE_CONFIG.databaseURL;
  private saveQueue = new Set<string>();
  private isCurrentlySaving = false;

  // Enhanced data summary for logging
  private getDataSummary(field: string, data: any): any {
    if (!data) return { empty: true };
    
    if (Array.isArray(data)) {
      if (field.startsWith('inventory')) {
        return {
          count: data.length,
          firstItem: data[0]?.name || data[0]?.type || 'Unknown',
          types: field.includes('Database') ? 
            [...new Set(data.map(item => item.type || 'uncategorized'))].slice(0, 3) :
            [...new Set(data.map(item => item.category))].slice(0, 3)
        };
      }
      return { count: data.length, sample: data[0] };
    }
    
    if (typeof data === 'object') {
      return { 
        keys: Object.keys(data).length, 
        sampleKeys: Object.keys(data).slice(0, 3) 
      };
    }
    
    return { type: typeof data, value: data };
  }

  // Get field data from the complete data object
  private getFieldData(field: string, allData: any): any {
    switch (field) {
      case 'employees': return allData.employees;
      case 'tasks': return allData.tasks;
      case 'dailyData': return allData.dailyData;
      case 'completedTasks': return Array.from(allData.completedTasks);
      case 'taskAssignments': return allData.taskAssignments;
      case 'customRoles': return allData.customRoles;
      case 'prepItems': return allData.prepItems;
      case 'scheduledPreps': return allData.scheduledPreps;
      case 'prepSelections': return allData.prepSelections;
      case 'storeItems': return allData.storeItems;
      // NEW: Inventory fields
      case 'inventoryDailyItems': return allData.inventoryDailyItems;
      case 'inventoryWeeklyItems': return allData.inventoryWeeklyItems;
      case 'inventoryMonthlyItems': return allData.inventoryMonthlyItems;
      case 'inventoryDatabaseItems': return allData.inventoryDatabaseItems;
      case 'inventoryActivityLog': return allData.inventoryActivityLog;
      default: return null;
    }
  }

  // Quick save for immediate data persistence
  async quickSave(field: string, data: any): Promise<boolean> {
    console.log(`🔥 QuickSave: ${field}`);
    console.log(`🔍 Saving ${field} to Firebase:`, this.getDataSummary(field, data));

    try {
      const response = await fetch(`${this.baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Firebase save failed: ${response.status} ${response.statusText}`);
      }

      console.log(`🔒 Critical save - waiting for confirmation: ${field}`);
      
      // Verify the save by reading back the data
      const verifyResponse = await fetch(`${this.baseUrl}/${field}.json`);
      const verifiedData = await verifyResponse.json();
      
      console.log(`🔍 Verified data in Firebase after save:`, this.getDataSummary(field, verifiedData));
      console.log(`✅ Critical QuickSave completed: ${field}`);
      
      return true;
    } catch (error) {
      console.error(`❌ QuickSave failed for ${field}:`, error);
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
        return this.quickSave(field, data);
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
          }, 1000);
        }
      } else {
        console.error('❌ Some batch saves failed');
      }

      return allSuccessful;
    } catch (error) {
      console.error('❌ Batch save error:', error);
      return false;
    } finally {
      this.isCurrentlySaving = false;
    }
  }

  // Enhanced load all data
  async loadData(): Promise<{
    employees: Employee[];
    tasks: Task[];
    dailyData: DailyDataMap;
    completedTasks: number[];
    taskAssignments: TaskAssignments;
    customRoles: string[];
    prepItems: PrepItem[];
    scheduledPreps: ScheduledPrep[];
    prepSelections: PrepSelections;
    storeItems: StoreItem[];
    // NEW: Inventory data
    inventoryDailyItems: InventoryItem[];
    inventoryWeeklyItems: InventoryItem[];
    inventoryMonthlyItems: InventoryItem[];
    inventoryDatabaseItems: DatabaseItem[];
    inventoryActivityLog: ActivityLogEntry[];
  }> {
    console.log('🔄 Loading all data from Firebase...');

    try {
      // Load all data in parallel
      const [
        employeesRes, tasksRes, dailyDataRes, completedTasksRes,
        taskAssignmentsRes, customRolesRes, prepItemsRes,
        scheduledPrepsRes, prepSelectionsRes, storeItemsRes,
        // NEW: Load inventory data
        inventoryDailyRes, inventoryWeeklyRes, inventoryMonthlyRes,
        inventoryDatabaseRes, inventoryActivityLogRes
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
        // Inventory endpoints
        fetch(`${this.baseUrl}/inventoryDailyItems.json`),
        fetch(`${this.baseUrl}/inventoryWeeklyItems.json`),
        fetch(`${this.baseUrl}/inventoryMonthlyItems.json`),
        fetch(`${this.baseUrl}/inventoryDatabaseItems.json`),
        fetch(`${this.baseUrl}/inventoryActivityLog.json`)
      ]);

      // Parse all responses
      const [
        employees, tasks, dailyData, completedTasks, taskAssignments,
        customRoles, prepItems, scheduledPreps, prepSelections, storeItems,
        // Parse inventory data
        inventoryDailyItems, inventoryWeeklyItems, inventoryMonthlyItems,
        inventoryDatabaseItems, inventoryActivityLog
      ] = await Promise.all([
        employeesRes.json(), tasksRes.json(), dailyDataRes.json(),
        completedTasksRes.json(), taskAssignmentsRes.json(), customRolesRes.json(),
        prepItemsRes.json(), scheduledPrepsRes.json(), prepSelectionsRes.json(),
        storeItemsRes.json(),
        // Parse inventory
        inventoryDailyRes.json(), inventoryWeeklyRes.json(), inventoryMonthlyRes.json(),
        inventoryDatabaseRes.json(), inventoryActivityLogRes.json()
      ]);

      console.log('✅ All data loaded from Firebase');
      
      return {
        employees: employees || getDefaultEmployees(),
        tasks: tasks || getDefaultTasks(),
        dailyData: dailyData || getEmptyDailyData(),
        completedTasks: completedTasks || [],
        taskAssignments: taskAssignments || {},
        customRoles: customRoles || ['Cleaner', 'Manager', 'Supervisor'],
        prepItems: prepItems || [],
        scheduledPreps: scheduledPreps || [],
        prepSelections: prepSelections || {},
        storeItems: storeItems || [],
        // Return inventory data with defaults
        inventoryDailyItems: inventoryDailyItems || [],
        inventoryWeeklyItems: inventoryWeeklyItems || [],
        inventoryMonthlyItems: inventoryMonthlyItems || [],
        inventoryDatabaseItems: inventoryDatabaseItems || [],
        inventoryActivityLog: inventoryActivityLog || []
      };
    } catch (error) {
      console.error('❌ Load data failed:', error);
      throw error;
    }
  }

  // Enhanced save all data with inventory support
  async saveData(data: {
    employees: Employee[];
    tasks: Task[];
    dailyData: DailyDataMap;
    completedTasks: Set<number>;
    taskAssignments: TaskAssignments;
    customRoles: string[];
    prepItems: PrepItem[];
    scheduledPreps: ScheduledPrep[];
    prepSelections: PrepSelections;
    storeItems: StoreItem[];
    // NEW: Inventory data
    inventoryDailyItems: InventoryItem[];
    inventoryWeeklyItems: InventoryItem[];
    inventoryMonthlyItems: InventoryItem[];
    inventoryDatabaseItems: DatabaseItem[];
    inventoryActivityLog: ActivityLogEntry[];
  }) {
    console.log('🔥 Saving all data to Firebase with inventory support...');

    // Enhanced fields list with inventory
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
      'inventoryDailyItems',
      'inventoryWeeklyItems',
      'inventoryMonthlyItems',
      'inventoryDatabaseItems',
      'inventoryActivityLog'
    ];

    const success = await this.batchSave(fields, data);

    if (success) {
      console.log('✅ Firebase: All data (including inventory) saved successfully');
    } else {
      console.error('❌ Firebase: Some data failed to save');
      throw new Error('Firebase save failed');
    }
  }

  // Enhanced immediate save for critical operations with inventory support
  async saveImmediate(field: string, data: any, allData?: any): Promise<boolean> {
    console.log(`🔥 Immediate save triggered by ${field} change`);

    // Save the specific field immediately
    const success = await this.quickSave(field, data);

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

  // Enhanced related fields with inventory support
  private getRelatedFields(changedField: string): string[] {
    switch (changedField) {
      case 'completedTasks':
        return ['employees', 'dailyData', 'taskAssignments'];
      case 'employees':
        return ['dailyData'];
      case 'taskAssignments':
        return ['completedTasks'];
      case 'scheduledPreps':
        return ['prepSelections'];
      // NEW: Inventory related fields
      case 'inventoryDailyItems':
      case 'inventoryWeeklyItems':
      case 'inventoryMonthlyItems':
        return ['inventoryActivityLog', 'inventoryDatabaseItems'];
      case 'inventoryDatabaseItems':
        return ['inventoryDailyItems', 'inventoryWeeklyItems', 'inventoryMonthlyItems'];
      case 'inventoryActivityLog':
        return []; // Activity log is independent
      default:
        return [];
    }
  }
}
