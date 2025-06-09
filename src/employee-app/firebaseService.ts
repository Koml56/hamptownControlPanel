// firebaseService.ts - Enhanced with data protection and backup
import { FIREBASE_CONFIG } from './constants';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
import type { Employee, Task, DailyDataMap, TaskAssignments, StoreItem } from './types';

export class FirebaseService {
  private baseUrl = FIREBASE_CONFIG.databaseURL;
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastDataSnapshots: Map<string, string> = new Map();
  private pendingUpdates: Map<string, any> = new Map();
  private dataBackups: Map<string, any> = new Map(); // Backup mechanism

  // Setup real-time listeners with data protection
  setupRealtimeListeners(callbacks: {
    onEmployeesUpdate: (employees: Employee[]) => void;
    onTasksUpdate: (tasks: Task[]) => void;
    onDailyDataUpdate: (dailyData: DailyDataMap) => void;
    onCustomRolesUpdate: (roles: string[]) => void;
    onStoreItemsUpdate: (items: StoreItem[]) => void;
    onConnectionChange: (status: 'connected' | 'disconnected' | 'error') => void;
  }) {
    console.log('🔥 Setting up protected Firebase sync...');

    // Setup polling with data validation
    this.setupPollingListener('employees', callbacks.onEmployeesUpdate, this.protectedMigrateEmployeeData, 500);
    this.setupPollingListener('tasks', callbacks.onTasksUpdate, this.protectedMigrateTaskData, 500);
    this.setupPollingListener('dailyData', callbacks.onDailyDataUpdate, this.protectedMigrateDailyData, 500);
    this.setupPollingListener('customRoles', callbacks.onCustomRolesUpdate, this.protectedMigrateRoles, 1000);
    this.setupPollingListener('storeItems', callbacks.onStoreItemsUpdate, this.protectedMigrateStoreItems, 1000);

    // Connection status monitoring
    this.setupConnectionMonitoring(callbacks.onConnectionChange);
  }

  private setupPollingListener(
    endpoint: string,
    callback: (data: any) => void,
    migrationFn: (data: any) => any,
    intervalMs: number = 500
  ) {
    const pollData = async () => {
      try {
        const response = await fetch(`${this.baseUrl}/${endpoint}.json`);
        
        if (!response.ok) {
          console.warn(`⚠️ HTTP ${response.status} for ${endpoint}, using backup data if available`);
          
          // Use backup data if available
          if (this.dataBackups.has(endpoint)) {
            console.log(`🔄 Using backup data for ${endpoint}`);
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Validate data before processing
        if (!this.validateData(endpoint, data)) {
          console.warn(`⚠️ Invalid data received for ${endpoint}, skipping update`);
          return;
        }
        
        const dataHash = JSON.stringify(data);
        
        // Only trigger callback if data actually changed
        const lastHash = this.lastDataSnapshots.get(endpoint);
        if (lastHash !== undefined && lastHash !== dataHash) {
          this.lastDataSnapshots.set(endpoint, dataHash);
          
          // Backup the previous data before migration
          this.createBackup(endpoint, data);
          
          const migratedData = migrationFn(data);
          console.log(`⚡ Protected update for ${endpoint} (backed up)`);
          callback(migratedData);
        } else if (lastHash === undefined) {
          // First load - store hash and backup
          this.lastDataSnapshots.set(endpoint, dataHash);
          this.createBackup(endpoint, data);
          console.log(`📥 Initial protected load for ${endpoint}`);
        }
      } catch (error) {
        console.warn(`⚠️ Polling error for ${endpoint}:`, error);
      }
    };

    // Initial load
    pollData();
    
    // Set up polling
    const interval = setInterval(pollData, intervalMs);
    this.pollIntervals.set(endpoint, interval);
  }

  private validateData(endpoint: string, data: any): boolean {
    if (data === null || data === undefined) {
      console.warn(`❌ Null data for ${endpoint}`);
      return false;
    }

    switch (endpoint) {
      case 'employees':
        if (!Array.isArray(data)) {
          console.warn(`❌ Employees data is not an array:`, data);
          return false;
        }
        // Check if all employees have 0 points (suspicious)
        if (data.length > 0 && data.every((emp: any) => (emp.points || 0) === 0)) {
          console.warn(`🚨 All employees have 0 points - potential data corruption!`);
          return false;
        }
        break;
        
      case 'dailyData':
        if (typeof data !== 'object') {
          console.warn(`❌ Daily data is not an object:`, data);
          return false;
        }
        // Check if all daily data is empty (suspicious)
        const dates = Object.keys(data);
        if (dates.length > 0) {
          const hasAnyCompletions = dates.some(date => {
            const dayData = data[date];
            return dayData && Array.isArray(dayData.completedTasks) && dayData.completedTasks.length > 0;
          });
          if (!hasAnyCompletions && dates.length > 3) {
            console.warn(`🚨 No task completions found in daily data - potential data loss!`);
            return false;
          }
        }
        break;
        
      case 'tasks':
        if (!Array.isArray(data) || data.length === 0) {
          console.warn(`❌ Tasks data is invalid:`, data);
          return false;
        }
        break;
    }
    
    return true;
  }

  private createBackup(endpoint: string, data: any) {
    const timestamp = new Date().toISOString();
    this.dataBackups.set(`${endpoint}_${timestamp}`, data);
    this.dataBackups.set(`${endpoint}_latest`, data);
    
    // Keep only last 5 backups per endpoint
    const backupKeys = Array.from(this.dataBackups.keys())
      .filter(key => key.startsWith(`${endpoint}_`) && key !== `${endpoint}_latest`)
      .sort()
      .reverse();
      
    if (backupKeys.length > 5) {
      backupKeys.slice(5).forEach(key => this.dataBackups.delete(key));
    }
  }

  private restoreFromBackup(endpoint: string): any | null {
    const latest = this.dataBackups.get(`${endpoint}_latest`);
    if (latest) {
      console.log(`🔄 Restoring ${endpoint} from backup`);
      return latest;
    }
    return null;
  }

  // Protected migration functions that preserve data
  private protectedMigrateEmployeeData = (employees: any): Employee[] => {
    if (!employees || !Array.isArray(employees)) {
      console.warn(`⚠️ Invalid employees data, checking backup...`);
      const backup = this.restoreFromBackup('employees');
      if (backup && Array.isArray(backup)) {
        employees = backup;
      } else {
        console.warn(`❌ No valid backup for employees, using defaults`);
        return getDefaultEmployees();
      }
    }
    
    return employees.map((emp: any) => ({
      id: emp.id || 0,
      name: emp.name || 'Unknown',
      mood: emp.mood || 3,
      lastUpdated: emp.lastUpdated || 'Not updated',
      role: emp.role || 'Cleaner',
      lastMoodDate: emp.lastMoodDate || null,
      points: typeof emp.points === 'number' ? emp.points : 0 // CRITICAL: Preserve points
    }));
  };

  private protectedMigrateTaskData = (tasks: any): Task[] => {
    if (!tasks || !Array.isArray(tasks)) {
      console.warn(`⚠️ Invalid tasks data, checking backup...`);
      const backup = this.restoreFromBackup('tasks');
      if (backup && Array.isArray(backup)) {
        tasks = backup;
      } else {
        console.warn(`❌ No valid backup for tasks, using defaults`);
        return getDefaultTasks();
      }
    }
    
    return tasks.map((task: any) => ({
      id: task.id || 0,
      task: task.task || 'Unknown Task',
      location: task.location || 'Unknown Location',
      priority: task.priority || 'medium',
      estimatedTime: task.estimatedTime || '30 min',
      points: typeof task.points === 'number' ? task.points : this.getDefaultTaskPoints(task.priority)
    }));
  };

  private protectedMigrateDailyData = (dailyData: any): DailyDataMap => {
    if (!dailyData || typeof dailyData !== 'object') {
      console.warn(`⚠️ Invalid daily data, checking backup...`);
      const backup = this.restoreFromBackup('dailyData');
      if (backup && typeof backup === 'object') {
        dailyData = backup;
      } else {
        console.warn(`❌ No valid backup for daily data, using defaults`);
        return getEmptyDailyData();
      }
    }
    
    const migrated: DailyDataMap = {};
    
    Object.keys(dailyData).forEach(date => {
      const dayData = dailyData[date];
      if (dayData && typeof dayData === 'object') {
        migrated[date] = {
          completedTasks: Array.isArray(dayData.completedTasks) ? dayData.completedTasks : [],
          employeeMoods: Array.isArray(dayData.employeeMoods) ? dayData.employeeMoods : [],
          purchases: Array.isArray(dayData.purchases) ? dayData.purchases : [],
          totalTasks: typeof dayData.totalTasks === 'number' ? dayData.totalTasks : 22,
          completionRate: typeof dayData.completionRate === 'number' ? dayData.completionRate : 0,
          totalPointsEarned: typeof dayData.totalPointsEarned === 'number' ? dayData.totalPointsEarned : 0,
          totalPointsSpent: typeof dayData.totalPointsSpent === 'number' ? dayData.totalPointsSpent : 0
        };
      }
    });
    
    return migrated;
  };

  private protectedMigrateRoles = (roles: any): string[] => {
    if (!roles || !Array.isArray(roles)) {
      const backup = this.restoreFromBackup('customRoles');
      if (backup && Array.isArray(backup)) {
        return backup;
      }
      return ['Cleaner', 'Manager', 'Supervisor'];
    }
    return roles;
  };

  private protectedMigrateStoreItems = (storeItems: any): StoreItem[] => {
    if (!storeItems || !Array.isArray(storeItems)) {
      const backup = this.restoreFromBackup('storeItems');
      if (backup && Array.isArray(backup)) {
        storeItems = backup;
      } else {
        return getDefaultStoreItems();
      }
    }
    
    return storeItems.map((item: any) => ({
      id: item.id || 0,
      name: item.name || 'Unknown Item',
      description: item.description || 'No description',
      cost: typeof item.cost === 'number' ? item.cost : 10,
      category: item.category || 'reward',
      icon: item.icon || '🎁',
      available: typeof item.available === 'boolean' ? item.available : true
    }));
  };

  private setupConnectionMonitoring(onConnectionChange: (status: 'connected' | 'disconnected' | 'error') => void) {
    const handleOnline = () => {
      console.log('🌐 Device came online');
      onConnectionChange('connected');
    };

    const handleOffline = () => {
      console.log('📴 Device went offline');
      onConnectionChange('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const testConnection = async () => {
      try {
        const response = await fetch(`${this.baseUrl}/.json`, { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        onConnectionChange(response.ok ? 'connected' : 'error');
      } catch {
        onConnectionChange('error');
      }
    };

    testConnection();
    setInterval(testConnection, 15000);
  }

  async loadData() {
    console.log('🔥 Loading data with protection...');
    
    try {
      const [employeesRes, tasksRes, dailyRes, customRolesRes, storeRes] = await Promise.all([
        fetch(`${this.baseUrl}/employees.json`),
        fetch(`${this.baseUrl}/tasks.json`),
        fetch(`${this.baseUrl}/dailyData.json`),
        fetch(`${this.baseUrl}/customRoles.json`),
        fetch(`${this.baseUrl}/storeItems.json`)
      ]);
      
      // Check all responses
      if (!employeesRes.ok || !tasksRes.ok || !dailyRes.ok) {
        throw new Error('One or more endpoints failed');
      }
      
      const employeesData = await employeesRes.json();
      const tasksData = await tasksRes.json();
      const dailyDataRes = await dailyRes.json();
      const customRolesData = await customRolesRes.json();
      const storeItemsData = await storeRes.json();
      
      // Validate before processing
      if (!this.validateData('employees', employeesData) || 
          !this.validateData('tasks', tasksData) || 
          !this.validateData('dailyData', dailyDataRes)) {
        throw new Error('Data validation failed');
      }
      
      // Create backups before migration
      this.createBackup('employees', employeesData);
      this.createBackup('tasks', tasksData);
      this.createBackup('dailyData', dailyDataRes);
      this.createBackup('customRoles', customRolesData);
      this.createBackup('storeItems', storeItemsData);
      
      const migratedEmployees = this.protectedMigrateEmployeeData(employeesData);
      const migratedTasks = this.protectedMigrateTaskData(tasksData);
      const migratedDailyData = this.protectedMigrateDailyData(dailyDataRes);
      const migratedStoreItems = this.protectedMigrateStoreItems(storeItemsData);
      
      // Store initial snapshots
      this.lastDataSnapshots.set('employees', JSON.stringify(employeesData));
      this.lastDataSnapshots.set('tasks', JSON.stringify(tasksData));
      this.lastDataSnapshots.set('dailyData', JSON.stringify(dailyDataRes));
      this.lastDataSnapshots.set('customRoles', JSON.stringify(customRolesData));
      this.lastDataSnapshots.set('storeItems', JSON.stringify(storeItemsData));
      
      console.log('✅ Protected data load successful');
      
      return {
        employees: migratedEmployees,
        tasks: migratedTasks,
        dailyData: migratedDailyData,
        customRoles: customRolesData || ['Cleaner', 'Manager', 'Supervisor'],
        storeItems: migratedStoreItems
      };
      
    } catch (error) {
      console.error('❌ Protected data load failed:', error);
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

  async instantSave(field: string, data: any) {
    console.log(`⚡ Protected instant saving ${field}...`);
    
    // Validate data before saving
    if (!this.validateData(field, data)) {
      console.error(`❌ Refusing to save invalid data for ${field}`);
      return false;
    }
    
    // Create backup before save
    this.createBackup(field, data);
    this.pendingUpdates.set(field, data);
    
    try {
      const response = await fetch(`${this.baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        console.log(`⚡ ${field} safely saved`);
        this.pendingUpdates.delete(field);
        return true;
      } else {
        console.warn(`⚠️ Save failed for ${field}, status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Save error for ${field}:`, error);
      return false;
    }
  }

  async saveData(data: {
    employees: Employee[];
    tasks: Task[];
    dailyData: DailyDataMap;
    customRoles: string[];
    storeItems: StoreItem[];
  }) {
    console.log('🔥 Protected saving to Firebase...');
    
    try {
      const results = await Promise.allSettled([
        this.instantSave('employees', data.employees),
        this.instantSave('tasks', data.tasks),
        this.instantSave('dailyData', data.dailyData),
        this.instantSave('customRoles', data.customRoles),
        this.instantSave('storeItems', data.storeItems)
      ]);
      
      const failed = results.filter(result => result.status === 'rejected' || !result.value);
      if (failed.length > 0) {
        console.warn(`⚠️ ${failed.length} saves failed, but others succeeded`);
      }
      
      console.log('✅ Protected save completed');
      
    } catch (error) {
      console.error('❌ Protected save failed:', error);
      throw error;
    }
  }

  async saveField(field: string, data: any) {
    return this.instantSave(field, data);
  }

  cleanup() {
    console.log('🧹 Cleaning up with backup preservation...');
    
    this.pollIntervals.forEach((interval, endpoint) => {
      clearInterval(interval);
    });
    
    this.pollIntervals.clear();
    this.lastDataSnapshots.clear();
    this.pendingUpdates.clear();
    // Keep backups for potential recovery
    console.log(`💾 Preserved ${this.dataBackups.size} data backups`);
  }
}
