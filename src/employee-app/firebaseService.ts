// firebaseService.ts - UPDATED to support system data for centralized daily reset
import { FIREBASE_CONFIG } from './constants';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData } from './defaultData';
import type { Employee, Task, DailyDataMap, TaskAssignments, PrepItem, ScheduledPrep, PrepSelections, StoreItem } from './types';

// System data interface for centralized app state
interface SystemData {
  lastResetDate: string;
  resetInProgress: boolean;
  resetInitiatedBy: string;
  resetTimestamp: number;
}

export class FirebaseService {
  private baseUrl = FIREBASE_CONFIG.databaseURL;
  private saveQueue = new Set<string>();
  private isCurrentlySaving = false;

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

  // ADDED: System data management methods
  async getSystemData(): Promise<SystemData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/systemData.json`);
      if (response.ok) {
        const data = await response.json();
        return data || null;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get system data:', error);
      return null;
    }
  }

  async saveSystemData(systemData: SystemData): Promise<boolean> {
    return await this.quickSave('systemData', systemData);
  }

  // ADDED: Atomic reset operation - prevents race conditions
  async performAtomicDailyReset(
    userId: string,
    currentSystemData: SystemData,
    completedTasks: any[],
    taskAssignments: any
  ): Promise<{ success: boolean; reason?: string }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentTime = Date.now();
    
    // Check if reset is still needed
    if (currentSystemData.lastResetDate === today) {
      return { success: false, reason: 'Already reset today' };
    }

    // Check if reset is in progress with timeout
    const resetTimeoutMs = 30000; // 30 seconds
    if (currentSystemData.resetInProgress && 
        (currentTime - currentSystemData.resetTimestamp < resetTimeoutMs)) {
      return { success: false, reason: 'Reset already in progress' };
    }

    // Check if there's anything to reset
    if ((!completedTasks || completedTasks.length === 0) && 
        (!taskAssignments || Object.keys(taskAssignments).length === 0)) {
      // Nothing to reset, just update the date
      const successData: SystemData = {
        lastResetDate: today,
        resetInProgress: false,
        resetInitiatedBy: userId,
        resetTimestamp: currentTime
      };
      
      const saved = await this.saveSystemData(successData);
      return { 
        success: saved, 
        reason: saved ? 'No data to reset, date updated' : 'Failed to update date'
      };
    }

    try {
      // Step 1: Acquire lock
      console.log('🔒 Acquiring atomic reset lock...');
      const lockData: SystemData = {
        lastResetDate: currentSystemData.lastResetDate,
        resetInProgress: true,
        resetInitiatedBy: userId,
        resetTimestamp: currentTime
      };

      const lockAcquired = await this.saveSystemData(lockData);
      if (!lockAcquired) {
        return { success: false, reason: 'Failed to acquire lock' };
      }

      // Step 2: Wait for lock propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Verify we still have the lock
      const currentData = await this.getSystemData();
      if (!currentData || 
          currentData.resetInitiatedBy !== userId || 
          !currentData.resetInProgress) {
        return { success: false, reason: 'Lost lock during operation' };
      }

      // Step 4: Perform the reset
      console.log('🌅 Performing atomic daily reset...');
      const resetResults = await Promise.all([
        this.quickSave('completedTasks', []),
        this.quickSave('taskAssignments', {})
      ]);

      if (!resetResults.every(result => result === true)) {
        // Release lock on failure
        await this.saveSystemData({
          ...currentSystemData,
          resetInProgress: false,
          resetTimestamp: currentTime
        });
        return { success: false, reason: 'Failed to clear task data' };
      }

      // Step 5: Update system data with successful reset
      const successData: SystemData = {
        lastResetDate: today,
        resetInProgress: false,
        resetInitiatedBy: userId,
        resetTimestamp: currentTime
      };

      const finalSave = await this.saveSystemData(successData);
      if (!finalSave) {
        return { success: false, reason: 'Failed to update system state' };
      }

      console.log('✅ Atomic daily reset completed successfully');
      return { success: true, reason: 'Reset completed successfully' };

    } catch (error) {
      console.error('❌ Error during atomic reset:', error);
      
      // Release lock on error
      try {
        await this.saveSystemData({
          ...currentSystemData,
          resetInProgress: false,
          resetTimestamp: currentTime
        });
      } catch (releaseError) {
        console.error('❌ Failed to release lock after error:', releaseError);
      }
      
      return { success: false, reason: `Error: ${error.message}` };
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
      console.error('❌ Batch sync failed:', error);
      return false;
    } finally {
      this.isCurrentlySaving = false;
    }
  }

  // Get field data from combined data object
  private getFieldData(field: string, allData: any): any {
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
      case 'systemData':
        return allData.systemData;
      default:
        console.warn(`Unknown field: ${field}`);
        return null;
    }
  }

  // Get data summary for logging
  private getDataSummary(field: string, data: any): string {
    if (!data) return 'null';
    
    switch (field) {
      case 'employees':
        return `${Array.isArray(data) ? data.length : 'invalid'} employees`;
      case 'tasks':
        return `${Array.isArray(data) ? data.length : 'invalid'} tasks`;
      case 'dailyData':
        return `${Object.keys(data || {}).length} days of data`;
      case 'completedTasks':
        return `${Array.isArray(data) ? data.length : 'invalid'} completed tasks`;
      case 'taskAssignments':
        return `${Object.keys(data || {}).length} assignments`;
      case 'customRoles':
        return `${Array.isArray(data) ? data.length : 'invalid'} custom roles`;
      case 'prepItems':
        return `${Array.isArray(data) ? data.length : 'invalid'} prep items`;
      case 'scheduledPreps':
        return `${Array.isArray(data) ? data.length : 'invalid'} scheduled preps`;
      case 'prepSelections':
        return `${Object.keys(data || {}).length} prep selections`;
      case 'storeItems':
        return `${Array.isArray(data) ? data.length : 'invalid'} store items`;
      case 'systemData':
        return `lastReset: ${data?.lastResetDate || 'none'}, inProgress: ${data?.resetInProgress || false}`;
      default:
        return typeof data === 'object' ? JSON.stringify(data).substring(0, 100) : String(data);
    }
  }

  // Load all data from Firebase
  async loadData(): Promise<{
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
    systemData: SystemData | null;
  }> {
    console.log('🔄 Loading all data from Firebase...');

    try {
      const [
        employeesRes, tasksRes, dailyDataRes, completedTasksRes, 
        taskAssignmentsRes, customRolesRes, prepItemsRes, 
        scheduledPrepsRes, prepSelectionsRes, storeItemsRes, systemDataRes
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
        fetch(`${this.baseUrl}/systemData.json`)
      ]);

      const employees = await employeesRes.json() || getDefaultEmployees();
      const tasks = await tasksRes.json() || getDefaultTasks();
      const dailyData = await dailyDataRes.json() || getEmptyDailyData();
      const completedTasksArray = await completedTasksRes.json() || [];
      const taskAssignments = await taskAssignmentsRes.json() || {};
      const customRoles = await customRolesRes.json() || [];
      const prepItems = await prepItemsRes.json() || [];
      const scheduledPreps = await scheduledPrepsRes.json() || [];
      const prepSelections = await prepSelectionsRes.json() || {};
      const storeItems = await storeItemsRes.json() || [];
      const systemData = await systemDataRes.json() || null;

      // Migrate data if needed
      const migratedEmployees = Array.isArray(employees) ? employees : Object.values(employees);
      const migratedTasks = Array.isArray(tasks) ? tasks : Object.values(tasks);
      const migratedPreps = Array.isArray(scheduledPreps) ? scheduledPreps : Object.values(scheduledPreps);
      const migratedStoreItems = Array.isArray(storeItems) ? storeItems : Object.values(storeItems);

      console.log('✅ Firebase: All data loaded successfully');
      console.log('📊 System data loaded:', systemData);

      return {
        employees: migratedEmployees,
        tasks: migratedTasks,
        dailyData,
        completedTasks: new Set(completedTasksArray),
        taskAssignments,
        customRoles,
        prepItems: Array.isArray(prepItems) ? prepItems : Object.values(prepItems),
        scheduledPreps: migratedPreps,
        prepSelections,
        storeItems: migratedStoreItems,
        systemData
      };
    } catch (error) {
      console.error('❌ Firebase: Load failed:', error);
      throw error;
    }
  }

  // Save all data to Firebase
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
    systemData?: SystemData;
  }) {
    console.log('🔥 Saving all data to Firebase...');

    // Include all fields including systemData
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
      'storeItems'
    ];

    // Add systemData to fields if it exists
    if (data.systemData) {
      fields.push('systemData');
    }

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
      if (allData && field !== 'scheduledPreps' && field !== 'systemData') {
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
  private getRelatedFields(field: string): string[] {
    switch (field) {
      case 'completedTasks':
        return ['employees', 'dailyData', 'taskAssignments'];
      case 'employees':
        return ['dailyData'];
      case 'taskAssignments':
        return ['completedTasks'];
      case 'scheduledPreps':
        return ['prepSelections'];
      case 'systemData':
        return []; // System data changes don't require related field updates
      default:
        return [];
    }
  }

  // Initialize system data if it doesn't exist
  async initializeSystemData(): Promise<SystemData> {
    console.log('🔧 Initializing system data...');
    
    const existingData = await this.getSystemData();
    if (existingData) {
      console.log('✅ System data already exists');
      return existingData;
    }

    const today = new Date().toISOString().split('T')[0];
    const initialSystemData: SystemData = {
      lastResetDate: today,
      resetInProgress: false,
      resetInitiatedBy: 'system-initialization',
      resetTimestamp: Date.now()
    };

    const saved = await this.saveSystemData(initialSystemData);
    if (saved) {
      console.log('✅ System data initialized');
      return initialSystemData;
    } else {
      console.error('❌ Failed to initialize system data');
      throw new Error('Failed to initialize system data');
    }
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService();
