// firebaseService.ts - FIXED to include all prep and store fields
import { FIREBASE_CONFIG } from './constants';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData } from './defaultData';
import type { Employee, Task, DailyDataMap, TaskAssignments, PrepItem, ScheduledPrep, PrepSelections, StoreItem, InventoryItem, DatabaseItem, ActivityLogEntry, StockCountHistoryEntry } from './types';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';

export class FirebaseService {
  private baseUrl = FIREBASE_CONFIG.databaseURL;
  private saveQueue = new Set<string>();
  private isCurrentlySaving = false;
  private app = initializeApp(FIREBASE_CONFIG);
  private db = getDatabase(this.app);
  
  // Enhanced debouncing for critical saves to prevent rapid fire saves
  private pendingSaves = new Map<string, NodeJS.Timeout>();
  private lastSaveTimestamps = new Map<string, number>();
  private saveAttempts = new Map<string, number>();

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

  // Distributed lock for daily reset synchronization
  async acquireResetLock(lockKey: string, deviceId: string, expiry: number): Promise<boolean> {
    try {
      // First check if lock exists and is still valid
      const checkResponse = await fetch(`${this.baseUrl}/locks/${lockKey}.json`);
      if (checkResponse.ok) {
        const existingLock = await checkResponse.json();
        if (existingLock && existingLock.expiry > Date.now()) {
          // Lock exists and is still valid
          return existingLock.deviceId === deviceId;
        }
      }

      // Try to acquire the lock using Firebase's atomic operations
      const lockData = {
        deviceId,
        expiry,
        timestamp: Date.now()
      };

      const response = await fetch(`${this.baseUrl}/locks/${lockKey}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lockData)
      });

      if (!response.ok) throw new Error('Failed to acquire lock');
      
      // Verify we got the lock by reading it back
      const verifyResponse = await fetch(`${this.baseUrl}/locks/${lockKey}.json`);
      if (!verifyResponse.ok) return false;
      
      const verifyLock = await verifyResponse.json();
      return verifyLock && verifyLock.deviceId === deviceId && verifyLock.expiry === expiry;
    } catch (error) {
      console.error('❌ Error acquiring reset lock:', error);
      return false;
    }
  }

  // Release the distributed lock
  async releaseResetLock(lockKey: string, deviceId: string): Promise<boolean> {
    try {
      // Only release if we own the lock
      const checkResponse = await fetch(`${this.baseUrl}/locks/${lockKey}.json`);
      if (checkResponse.ok) {
        const existingLock = await checkResponse.json();
        if (existingLock && existingLock.deviceId !== deviceId) {
          console.warn('⚠️ Attempted to release lock owned by another device');
          return false;
        }
      }

      const response = await fetch(`${this.baseUrl}/locks/${lockKey}.json`, {
        method: 'DELETE'
      });
      
      return response.ok;
    } catch (error) {
      console.error('❌ Error releasing reset lock:', error);
      return false;
    }
  }
  // Enhanced Quick save with smart debouncing and deduplication
  async quickSave(field: string, data: any): Promise<boolean> {
    const now = Date.now();
    const lastSave = this.lastSaveTimestamps.get(field) || 0;
    const timeSinceLastSave = now - lastSave;
    
    // Prevent rapid saves (within 2 seconds) of the same field
    if (timeSinceLastSave < 2000) {
      console.log(`⏳ Debouncing rapid save for ${field} (${timeSinceLastSave}ms since last save)`);
      
      // Clear any pending save for this field
      const existingTimeout = this.pendingSaves.get(field);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // Schedule a debounced save
      const timeout = setTimeout(() => {
        this.executeSave(field, data);
        this.pendingSaves.delete(field);
      }, 1500);
      
      this.pendingSaves.set(field, timeout);
      return true;
    }
    
    return this.executeSave(field, data);
  }

  // Execute the actual save operation
  private async executeSave(field: string, data: any): Promise<boolean> {
    console.log(`🔥 QuickSave: ${field}`);
    console.log(`🔍 Saving ${field} to Firebase:`, this.getDataSummary(field, data));
    
    // Track save attempts to detect issues
    const attempts = this.saveAttempts.get(field) || 0;
    this.saveAttempts.set(field, attempts + 1);
    
    if (attempts > 5) {
      console.warn(`⚠️ Too many save attempts for ${field}, throttling...`);
      this.saveAttempts.set(field, 0); // Reset counter
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        // ENHANCED: Provide detailed error information for Firebase save failures
        const errorDetails = {
          field,
          status: response.status,
          statusText: response.statusText,
          url: `${this.baseUrl}/${field}.json`,
          dataSize: JSON.stringify(data).length,
          dataType: Array.isArray(data) ? 'array' : typeof data,
          timestamp: new Date().toISOString()
        };
        
        console.error('❌ Firebase save detailed error:', errorDetails);
        
        // Try to get response body for more details
        try {
          const responseText = await response.text();
          console.error('❌ Firebase error response body:', responseText);
        } catch (bodyError) {
          console.error('❌ Could not read error response body:', bodyError);
        }
        
        throw new Error(`Firebase save failed: ${response.status} ${response.statusText} for field ${field}`);
      }

      console.log(`🔒 Critical save - waiting for confirmation: ${field}`);
      
      // Simplified verification - don't re-read the data unless it's critical
      const isTaskOrAssignment = field === 'completedTasks' || field === 'taskAssignments';
      if (isTaskOrAssignment) {
        const verifyResponse = await fetch(`${this.baseUrl}/${field}.json`);
        const verifiedData = await verifyResponse.json();
        console.log(`🔍 Verified data in Firebase after save:`, this.getDataSummary(field, verifiedData));
      }
      
      console.log(`✅ Critical QuickSave completed: ${field}`);
      console.log(`🔒 [CRITICAL-SAVE] ${field.charAt(0).toUpperCase() + field.slice(1)} QuickSave confirmed by Firebase.`);
      
      // Update timestamp and reset attempt counter on success
      this.lastSaveTimestamps.set(field, Date.now());
      this.saveAttempts.set(field, 0);
      
      return true;
    } catch (error) {
      // ENHANCED: Detailed error logging for individual field saves
      console.error(`❌ QuickSave failed for ${field} - detailed error:`, {
        field,
        error: error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        dataInfo: this.getDataSizeInfo(field, { [field]: data }),
        attempt: this.saveAttempts.get(field) || 1,
        timestamp: new Date().toISOString()
      });
      
      // Log data sample if it might be causing issues
      if (data && (Array.isArray(data) || typeof data === 'object')) {
        console.error(`🔍 Problematic data sample for ${field}:`, this.getDataSample(field, { [field]: data }));
      }
      
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
          }, 100);
        }
      } else {
        // ENHANCED: Provide detailed information about which saves failed
        console.error('❌ Some batch saves failed - detailed analysis:');
        console.error('📊 Field save results:', fields.map((field, index) => ({
          field,
          success: results[index],
          dataSize: this.getDataSizeInfo(field, allData)
        })));
        
        // Log failing fields specifically
        const failedFields = fields.filter((field, index) => results[index] !== true);
        if (failedFields.length > 0) {
          console.error('❌ Failed fields:', failedFields);
          console.error('🔍 Failed field data samples:', failedFields.map(field => ({
            field,
            dataSample: this.getDataSample(field, allData)
          })));
        }
      }

      return allSuccessful;
    } catch (error) {
      // ENHANCED: Detailed error logging for Firebase batch saves
      console.error('❌ Batch save failed - detailed error info:', {
        error: error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        fieldsBeingSaved: fields,
        timestamp: new Date().toISOString()
      });
      return false;
    } finally {
      this.isCurrentlySaving = false;
    }
  }

  // FIXED: Get data for specific field including ALL prep and store fields
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
      // Inventory fields
      case 'inventoryDailyItems':
        return allData.inventoryDailyItems;
      case 'inventoryWeeklyItems':
        return allData.inventoryWeeklyItems;
      case 'inventoryMonthlyItems':
        return allData.inventoryMonthlyItems;
      case 'inventoryDatabaseItems':
        return allData.inventoryDatabaseItems;
      case 'inventoryActivityLog':
        return allData.inventoryActivityLog;
      case 'inventoryCustomCategories':
        return allData.inventoryCustomCategories;
      case 'stockCountSnapshots':
        return allData.stockCountSnapshots;
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
      case 'inventoryDailyItems':
        return {
          totalCount: data?.length || 0,
          criticalCount: (data || []).filter((item: any) => item.currentStock <= item.minLevel * 0.5).length
        };
      case 'inventoryWeeklyItems':
        return {
          totalCount: data?.length || 0,
          criticalCount: (data || []).filter((item: any) => item.currentStock <= item.minLevel * 0.5).length
        };
      case 'inventoryMonthlyItems':
        return {
          totalCount: data?.length || 0,
          criticalCount: (data || []).filter((item: any) => item.currentStock <= item.minLevel * 0.5).length
        };
      case 'inventoryDatabaseItems':
        return {
          totalCount: data?.length || 0,
          assignedCount: (data || []).filter((item: any) => item.isAssigned).length
        };
      case 'inventoryActivityLog':
        return {
          totalEntries: data?.length || 0,
          latestEntry: data?.[0]?.timestamp || 'none'
        };
      case 'inventoryCustomCategories':
        return {
          totalCategories: data?.length || 0,
          sampleCategory: data?.[0]?.name || 'none'
        };
      case 'stockCountSnapshots':
        return {
          totalSnapshots: data?.length || 0,
          latestSnapshot: data?.[0]?.date || 'none'
        };
      default:
        return data;
    }
  }

  async loadData() {
    console.log('🔥 Loading data from Firebase...');

    try {
      // FIXED: Load ALL fields including prep and store data
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
        inventoryDailyRes,
        inventoryWeeklyRes,
        inventoryMonthlyRes,
        inventoryDatabaseRes,
        inventoryActivityLogRes,
        inventoryCustomCategoriesRes,
        stockCountSnapshotsRes
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
        fetch(`${this.baseUrl}/inventoryDailyItems.json`),
        fetch(`${this.baseUrl}/inventoryWeeklyItems.json`),
        fetch(`${this.baseUrl}/inventoryMonthlyItems.json`),
        fetch(`${this.baseUrl}/inventoryDatabaseItems.json`),
        fetch(`${this.baseUrl}/inventoryActivityLog.json`),
        fetch(`${this.baseUrl}/inventoryCustomCategories.json`),
        fetch(`${this.baseUrl}/stockCountSnapshots.json`)
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
      const inventoryDailyData = await inventoryDailyRes.json();
      const inventoryWeeklyData = await inventoryWeeklyRes.json();
      const inventoryMonthlyData = await inventoryMonthlyRes.json();
      const inventoryDatabaseData = await inventoryDatabaseRes.json();
      const inventoryActivityLogData = await inventoryActivityLogRes.json();
      const inventoryCustomCategoriesData = await inventoryCustomCategoriesRes.json();
      const stockCountSnapshotsData = await stockCountSnapshotsRes.json();
      
      // Migrate employees data to include points if missing
      const migratedEmployees = employeesData ? employeesData.map((emp: any) => ({
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
        // Inventory data
        inventoryDailyItems: inventoryDailyData || [],
        inventoryWeeklyItems: inventoryWeeklyData || [],
        inventoryMonthlyItems: inventoryMonthlyData || [],
        inventoryDatabaseItems: inventoryDatabaseData || [],
        inventoryActivityLog: inventoryActivityLogData || [],
        inventoryCustomCategories: inventoryCustomCategoriesData || [],
        stockCountSnapshots: stockCountSnapshotsData || []
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
    // Inventory fields
    inventoryDailyItems: InventoryItem[];
    inventoryWeeklyItems: InventoryItem[];
    inventoryMonthlyItems: InventoryItem[];
    inventoryDatabaseItems: DatabaseItem[];
    inventoryActivityLog: ActivityLogEntry[];
    stockCountSnapshots: StockCountHistoryEntry[];
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
      'inventoryDailyItems',
      'inventoryWeeklyItems',
      'inventoryMonthlyItems',
      'inventoryDatabaseItems',
      'inventoryActivityLog',
      'inventoryCustomCategories',
      'stockCountSnapshots'
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
      case 'inventoryDailyItems':
        return ['inventoryActivityLog']; // Daily items affect activity log
      case 'inventoryWeeklyItems':
        return ['inventoryActivityLog']; // Weekly items affect activity log
      case 'inventoryMonthlyItems':
        return ['inventoryActivityLog']; // Monthly items affect activity log
      case 'inventoryDatabaseItems':
        return ['inventoryDailyItems', 'inventoryWeeklyItems', 'inventoryMonthlyItems']; // Database changes might affect assigned items
      case 'stockCountSnapshots':
        return []; // Snapshots are independent and don't affect other data
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

  // Method to save stock count snapshots
  async saveStockCountSnapshot(snapshot: StockCountHistoryEntry): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/stockCountSnapshots.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot)
      });
      
      if (response.ok) {
        console.log('✅ Stock count snapshot saved successfully:', snapshot.snapshotId);
        return true;
      } else {
        throw new Error(`Failed to save snapshot: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error saving stock count snapshot:', error);
      return false;
    }
  }

  // Method to get stock count snapshots by date range
  async getStockCountSnapshots(startDate?: string, endDate?: string): Promise<StockCountHistoryEntry[]> {
    try {
      const response = await fetch(`${this.baseUrl}/stockCountSnapshots.json`);
      if (!response.ok) throw new Error('Failed to fetch snapshots');
      
      const data = await response.json();
      const snapshots: StockCountHistoryEntry[] = data ? Object.values(data) : [];
      
      if (startDate || endDate) {
        return snapshots.filter(snapshot => {
          const snapshotDate = new Date(snapshot.date);
          const start = startDate ? new Date(startDate) : new Date('1900-01-01');
          const end = endDate ? new Date(endDate) : new Date('2099-12-31');
          return snapshotDate >= start && snapshotDate <= end;
        });
      }
      
      return snapshots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('❌ Error fetching stock count snapshots:', error);
      return [];
    }
  }

  // Method to get the latest snapshot for a specific frequency
  async getLatestSnapshot(frequency?: 'daily' | 'weekly' | 'monthly'): Promise<StockCountHistoryEntry | null> {
    try {
      const snapshots = await this.getStockCountSnapshots();
      const filtered = frequency 
        ? snapshots.filter(s => s.frequency === frequency)
        : snapshots;
      
      return filtered.length > 0 ? filtered[0] : null;
    } catch (error) {
      console.error('❌ Error fetching latest snapshot:', error);
      return null;
    }
  }

  // ENHANCED: Helper method to get data size information for debugging
  private getDataSizeInfo(field: string, allData: any): any {
    const data = this.getFieldData(field, allData);
    
    // Safety check for null/undefined data
    if (data === null || data === undefined) {
      return {
        type: 'null',
        sizeBytes: 4 // 'null' has 4 characters
      };
    }
    
    if (Array.isArray(data)) {
      return {
        type: 'array',
        length: data.length,
        sizeBytes: JSON.stringify(data).length
      };
    } else if (data instanceof Set) {
      return {
        type: 'set',
        size: data.size,
        sizeBytes: JSON.stringify(Array.from(data)).length
      };
    } else if (typeof data === 'object') {
      return {
        type: 'object',
        keys: Object.keys(data).length,
        sizeBytes: JSON.stringify(data).length
      };
    } else {
      return {
        type: typeof data,
        sizeBytes: JSON.stringify(data).length
      };
    }
  }

  // ENHANCED: Helper method to get data sample for debugging
  private getDataSample(field: string, allData: any): any {
    const data = this.getFieldData(field, allData);
    
    // Safety check for null/undefined data
    if (data === null || data === undefined) {
      return {
        type: 'null',
        value: data
      };
    }
    
    if (Array.isArray(data)) {
      return {
        totalLength: data.length,
        sample: data.slice(0, 3), // First 3 items
        hasInvalidItems: data.some(item => !item || typeof item !== 'object')
      };
    } else if (data instanceof Set) {
      const array = Array.from(data);
      return {
        totalSize: data.size,
        sample: array.slice(0, 3)
      };
    } else if (typeof data === 'object') {
      const keys = Object.keys(data);
      return {
        totalKeys: keys.length,
        sampleKeys: keys.slice(0, 5),
        sample: Object.fromEntries(keys.slice(0, 3).map(key => [key, data[key]]))
      };
    } else {
      return data;
    }
  }
}
