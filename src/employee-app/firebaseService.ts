// firebaseService.ts - Enhanced with data protection and prep support
import { FIREBASE_CONFIG } from './constants';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
import type { Employee, Task, DailyDataMap, TaskAssignments, StoreItem, PrepItem, ScheduledPrep, PrepSelections } from './types';

export class FirebaseService {
  private baseUrl = FIREBASE_CONFIG.databaseURL;
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastDataSnapshots: Map<string, string> = new Map();
  private lastKnownGoodData: Map<string, any> = new Map();
  private deviceId: string;

  constructor() {
    // Generate unique device ID for conflict tracking
    this.deviceId = this.generateDeviceId();
    console.log(`🔐 Device ID: ${this.deviceId}`);
  }

  private generateDeviceId(): string {
    const stored = localStorage.getItem('firebase_device_id');
    if (stored) return stored;
    
    const deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('firebase_device_id', deviceId);
    return deviceId;
  }

  // Enhanced data validation to prevent empty/corrupted data
  private validateData(endpoint: string, data: any): boolean {
    console.log(`🔍 Validating ${endpoint} data:`, data);
    
    switch (endpoint) {
      case 'employees':
        if (!Array.isArray(data) || data.length === 0) {
          console.error(`❌ Invalid employees data: ${data}`);
          return false;
        }
        const hasValidEmployees = data.every(emp => 
          emp && typeof emp.id === 'number' && emp.name && 
          typeof emp.points === 'number' && emp.points >= 0
        );
        if (!hasValidEmployees) {
          console.error(`❌ Employees missing required fields or have negative points`);
          return false;
        }
        break;
        
      case 'dailyData':
        if (!data || typeof data !== 'object') {
          console.error(`❌ Invalid dailyData: ${data}`);
          return false;
        }
        const dateKeys = Object.keys(data);
        if (dateKeys.length === 0) {
          console.error(`❌ DailyData is empty - potential data loss`);
          return false;
        }
        break;
        
      case 'tasks':
        if (!Array.isArray(data) || data.length === 0) {
          console.error(`❌ Invalid tasks data: ${data}`);
          return false;
        }
        break;
        
      case 'storeItems':
        if (!Array.isArray(data)) {
          console.error(`❌ Invalid storeItems data: ${data}`);
          return false;
        }
        break;

      case 'prepItems':
        if (!Array.isArray(data)) {
          console.error(`❌ Invalid prepItems data: ${data}`);
          return false;
        }
        break;

      case 'scheduledPreps':
        if (!Array.isArray(data)) {
          console.error(`❌ Invalid scheduledPreps data: ${data}`);
          return false;
        }
        break;
    }
    
    return true;
  }

  // Backup current data before making changes
  private async backupCurrentData(): Promise<void> {
    console.log('💾 Creating data backup...');
    
    try {
      const [employeesRes, tasksRes, dailyRes, rolesRes, storeRes, prepItemsRes, scheduledPrepsRes, prepSelectionsRes] = await Promise.all([
        fetch(`${this.baseUrl}/employees.json`),
        fetch(`${this.baseUrl}/tasks.json`),
        fetch(`${this.baseUrl}/dailyData.json`),
        fetch(`${this.baseUrl}/customRoles.json`),
        fetch(`${this.baseUrl}/storeItems.json`),
        fetch(`${this.baseUrl}/prepItems.json`),
        fetch(`${this.baseUrl}/scheduledPreps.json`),
        fetch(`${this.baseUrl}/prepSelections.json`)
      ]);
      
      const backup = {
        employees: await employeesRes.json(),
        tasks: await tasksRes.json(),
        dailyData: await dailyRes.json(),
        customRoles: await rolesRes.json(),
        storeItems: await storeRes.json(),
        prepItems: await prepItemsRes.json(),
        scheduledPreps: await scheduledPrepsRes.json(),
        prepSelections: await prepSelectionsRes.json(),
        timestamp: new Date().toISOString(),
        deviceId: this.deviceId
      };
      
      const backupKey = `firebase_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));
      
      this.cleanupOldBackups();
      
      console.log('✅ Data backup created:', backupKey);
    } catch (error) {
      console.error('❌ Backup failed:', error);
    }
  }

  private cleanupOldBackups(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('firebase_backup_'));
    if (keys.length > 5) {
      keys.sort().slice(0, -5).forEach(key => localStorage.removeItem(key));
    }
  }

  async restoreFromBackup(): Promise<boolean> {
    console.log('🚑 Attempting to restore from backup...');
    
    const backupKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('firebase_backup_'))
      .sort()
      .reverse();
    
    for (const backupKey of backupKeys) {
      try {
        const backupStr = localStorage.getItem(backupKey);
        if (!backupStr) continue;
        
        const backup = JSON.parse(backupStr);
        console.log(`🔄 Trying backup from ${backup.timestamp}`);
        
        if (this.validateData('employees', backup.employees) &&
            this.validateData('dailyData', backup.dailyData) &&
            this.validateData('tasks', backup.tasks)) {
          
          await this.saveData({
            employees: backup.employees,
            tasks: backup.tasks,
            dailyData: backup.dailyData,
            customRoles: backup.customRoles || ['Cleaner', 'Manager', 'Supervisor'],
            storeItems: backup.storeItems || [],
            prepItems: backup.prepItems || [],
            scheduledPreps: backup.scheduledPreps || [],
            prepSelections: backup.prepSelections || {}
          });
          
          console.log('✅ Data restored from backup:', backup.timestamp);
          alert(`⚠️ Data corruption detected and fixed!\nRestored from backup: ${backup.timestamp}\nDevice: ${backup.deviceId}`);
          return true;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to restore from ${backupKey}:`, error);
      }
    }
    
    console.error('❌ No valid backups found');
    return false;
  }

  setupRealtimeListeners(callbacks: {
    onEmployeesUpdate: (employees: Employee[]) => void;
    onTasksUpdate: (tasks: Task[]) => void;
    onDailyDataUpdate: (dailyData: DailyDataMap) => void;
    onCustomRolesUpdate: (roles: string[]) => void;
    onStoreItemsUpdate: (items: StoreItem[]) => void;
    onPrepItemsUpdate: (items: PrepItem[]) => void;
    onScheduledPrepsUpdate: (preps: ScheduledPrep[]) => void;
    onPrepSelectionsUpdate: (selections: PrepSelections) => void;
    onConnectionChange: (status: 'connected' | 'disconnected' | 'error') => void;
  }) {
    console.log('🔥 Setting up protected Firebase sync with prep support...');

    // Setup polling with data validation
    this.setupProtectedPolling('employees', callbacks.onEmployeesUpdate, this.migrateEmployeeData, 500);
    this.setupProtectedPolling('tasks', callbacks.onTasksUpdate, this.migrateTaskData, 500);
    this.setupProtectedPolling('dailyData', callbacks.onDailyDataUpdate, this.migrateDailyData, 500);
    this.setupProtectedPolling('customRoles', callbacks.onCustomRolesUpdate, (data) => data || ['Cleaner', 'Manager', 'Supervisor'], 1000);
    this.setupProtectedPolling('storeItems', callbacks.onStoreItemsUpdate, this.migrateStoreItems, 1000);
    
    // ADD PREP POLLING
    this.setupProtectedPolling('prepItems', callbacks.onPrepItemsUpdate, this.migratePrepItems, 1000);
    this.setupProtectedPolling('scheduledPreps', callbacks.onScheduledPrepsUpdate, this.migrateScheduledPreps, 1000);
    this.setupProtectedPolling('prepSelections', callbacks.onPrepSelectionsUpdate, (data) => data || {}, 1000);

    this.setupConnectionMonitoring(callbacks.onConnectionChange);
  }

  private setupProtectedPolling(
    endpoint: string,
    callback: (data: any) => void,
    migrationFn: (data: any) => any,
    intervalMs: number = 500
  ) {
    const pollData = async () => {
      try {
        const response = await fetch(`${this.baseUrl}/${endpoint}.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        
        if (!this.validateData(endpoint, data)) {
          console.error(`🚨 Corrupted data detected for ${endpoint}!`);
          
          if (endpoint === 'employees' || endpoint === 'dailyData') {
            const restored = await this.restoreFromBackup();
            if (!restored) {
              console.error(`❌ Could not restore ${endpoint}, using fallback`);
              const fallback = this.lastKnownGoodData.get(endpoint) || this.getFallbackData(endpoint);
              callback(migrationFn(fallback));
            }
          }
          return;
        }
        
        const dataHash = JSON.stringify(data);
        const lastHash = this.lastDataSnapshots.get(endpoint);
        
        if (lastHash !== undefined && lastHash !== dataHash) {
          this.lastKnownGoodData.set(endpoint, data);
          this.lastDataSnapshots.set(endpoint, dataHash);
          
          const migratedData = migrationFn(data);
          console.log(`⚡ Validated update for ${endpoint}`);
          callback(migratedData);
        } else if (lastHash === undefined) {
          this.lastDataSnapshots.set(endpoint, dataHash);
          this.lastKnownGoodData.set(endpoint, data);
          console.log(`📥 Initial validated data for ${endpoint}`);
        }
      } catch (error) {
        console.warn(`⚠️ Polling error for ${endpoint}:`, error);
      }
    };

    pollData();
    const interval = setInterval(pollData, intervalMs);
    this.pollIntervals.set(endpoint, interval);
  }

  private getFallbackData(endpoint: string) {
    switch (endpoint) {
      case 'employees': return getDefaultEmployees();
      case 'tasks': return getDefaultTasks();
      case 'dailyData': return getEmptyDailyData();
      case 'storeItems': return getDefaultStoreItems();
      case 'prepItems': return [];
      case 'scheduledPreps': return [];
      case 'prepSelections': return {};
      default: return null;
    }
  }

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

  async loadData(): Promise<{
    employees: Employee[];
    tasks: Task[];
    dailyData: DailyDataMap;
    customRoles: string[];
    storeItems: StoreItem[];
    prepItems: PrepItem[];
    scheduledPreps: ScheduledPrep[];
    prepSelections: PrepSelections;
  }> {
    console.log('🔥 Loading data with prep support...');
    
    try {
      await this.backupCurrentData();
      
      const [employeesRes, tasksRes, dailyRes, customRolesRes, storeRes, prepItemsRes, scheduledPrepsRes, prepSelectionsRes] = await Promise.all([
        fetch(`${this.baseUrl}/employees.json`),
        fetch(`${this.baseUrl}/tasks.json`),
        fetch(`${this.baseUrl}/dailyData.json`),
        fetch(`${this.baseUrl}/customRoles.json`),
        fetch(`${this.baseUrl}/storeItems.json`),
        fetch(`${this.baseUrl}/prepItems.json`),
        fetch(`${this.baseUrl}/scheduledPreps.json`),
        fetch(`${this.baseUrl}/prepSelections.json`)
      ]);
      
      const employeesData = await employeesRes.json();
      const tasksData = await tasksRes.json();
      const dailyDataRes = await dailyRes.json();
      const customRolesData = await customRolesRes.json();
      const storeItemsData = await storeRes.json();
      const prepItemsData = await prepItemsRes.json();
      const scheduledPrepsData = await scheduledPrepsRes.json();
      const prepSelectionsData = await prepSelectionsRes.json();
      
      // Validate loaded data
      if (!this.validateData('employees', employeesData) || 
          !this.validateData('dailyData', dailyDataRes)) {
        console.error('🚨 Corrupted data detected during load!');
        const restored = await this.restoreFromBackup();
        if (!restored) {
          throw new Error('Data corruption detected and no valid backup available');
        }
        return this.loadData(); // Retry after restore
      }
      
      const migratedEmployees = this.migrateEmployeeData(employeesData);
      const migratedTasks = this.migrateTaskData(tasksData);
      const migratedDailyData = this.migrateDailyData(dailyDataRes);
      const migratedStoreItems = this.migrateStoreItems(storeItemsData);
      const migratedPrepItems = this.migratePrepItems(prepItemsData);
      const migratedScheduledPreps = this.migrateScheduledPreps(scheduledPrepsData);
      const migratedPrepSelections = prepSelectionsData || {};
      
      // Store initial snapshots
      this.lastDataSnapshots.set('employees', JSON.stringify(employeesData));
      this.lastDataSnapshots.set('tasks', JSON.stringify(tasksData));
      this.lastDataSnapshots.set('dailyData', JSON.stringify(dailyDataRes));
      this.lastDataSnapshots.set('customRoles', JSON.stringify(customRolesData));
      this.lastDataSnapshots.set('storeItems', JSON.stringify(storeItemsData));
      this.lastDataSnapshots.set('prepItems', JSON.stringify(prepItemsData));
      this.lastDataSnapshots.set('scheduledPreps', JSON.stringify(scheduledPrepsData));
      this.lastDataSnapshots.set('prepSelections', JSON.stringify(prepSelectionsData));
      
      console.log('✅ Protected data load completed with prep support');
      
      return {
        employees: migratedEmployees,
        tasks: migratedTasks,
        dailyData: migratedDailyData,
        customRoles: customRolesData || ['Cleaner', 'Manager', 'Supervisor'],
        storeItems: migratedStoreItems,
        prepItems: migratedPrepItems,
        scheduledPreps: migratedScheduledPreps,
        prepSelections: migratedPrepSelections
      };
      
    } catch (error) {
      console.error('❌ Protected load failed:', error);
      throw error;
    }
  }

  async saveData(data: {
    employees: Employee[];
    tasks: Task[];
    dailyData: DailyDataMap;
    customRoles: string[];
    storeItems: StoreItem[];
    prepItems: PrepItem[];
    scheduledPreps: ScheduledPrep[];
    prepSelections: PrepSelections;
  }): Promise<void> {
    console.log('🔐 Saving data with prep support...');
    
    // Validate before saving
    if (!this.validateData('employees', data.employees)) {
      throw new Error('Invalid employees data - save aborted');
    }
    if (!this.validateData('dailyData', data.dailyData)) {
      throw new Error('Invalid dailyData - save aborted');
    }
    
    // Add metadata to track changes
    const metadata = {
      lastModified: new Date().toISOString(),
      deviceId: this.deviceId,
      version: Date.now()
    };
    
    try {
      await Promise.all([
        fetch(`${this.baseUrl}/employees.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.employees)
        }),
        fetch(`${this.baseUrl}/tasks.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.tasks)
        }),
        fetch(`${this.baseUrl}/dailyData.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.dailyData)
        }),
        fetch(`${this.baseUrl}/customRoles.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.customRoles)
        }),
        fetch(`${this.baseUrl}/storeItems.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.storeItems)
        }),
        fetch(`${this.baseUrl}/prepItems.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.prepItems)
        }),
        fetch(`${this.baseUrl}/scheduledPreps.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.scheduledPreps)
        }),
        fetch(`${this.baseUrl}/prepSelections.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.prepSelections)
        }),
        // Save metadata for conflict tracking
        fetch(`${this.baseUrl}/metadata.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metadata)
        })
      ]);
      
      console.log('✅ Protected save completed with prep support');
    } catch (error) {
      console.error('❌ Protected save failed:', error);
      throw error;
    }
  }

  async saveField(field: string, data: any): Promise<boolean> {
    console.log(`⚡ Protected save for ${field}...`);
    
    if (!this.validateData(field, data)) {
      console.error(`❌ Invalid data for ${field}, save aborted`);
      return false;
    }
    
    try {
      await fetch(`${this.baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return true;
    } catch (error) {
      console.error(`❌ Save failed for ${field}:`, error);
      return false;
    }
  }

  // Migration functions
  private migrateEmployeeData = (employees: any): Employee[] => {
    if (!employees || !Array.isArray(employees)) return getDefaultEmployees();
    return employees.map(emp => ({
      id: emp.id || 0,
      name: emp.name || 'Unknown',
      mood: emp.mood || 3,
      lastUpdated: emp.lastUpdated || 'Not updated',
      role: emp.role || 'Cleaner',
      lastMoodDate: emp.lastMoodDate || null,
      points: typeof emp.points === 'number' ? emp.points : 0
    }));
  };

  private migrateTaskData = (tasks: any): Task[] => {
    if (!tasks || !Array.isArray(tasks)) return getDefaultTasks();
    return tasks.map(task => ({
      id: task.id || 0,
      task: task.task || 'Unknown Task',
      location: task.location || 'Unknown Location',
      priority: task.priority || 'medium',
      estimatedTime: task.estimatedTime || '30 min',
      points: typeof task.points === 'number' ? task.points : this.getDefaultTaskPoints(task.priority)
    }));
  };

  private getDefaultTaskPoints(priority: string): number {
    switch (priority) {
      case 'high': return 10;
      case 'medium': return 5;
      case 'low': return 3;
      default: return 5;
    }
  }

  private migrateDailyData = (dailyData: any): DailyDataMap => {
    if (!dailyData || typeof dailyData !== 'object') return getEmptyDailyData();
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
  };

  private migrateStoreItems = (storeItems: any): StoreItem[] => {
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
  };

  // PREP MIGRATION FUNCTIONS
  private migratePrepItems = (prepItems: any): PrepItem[] => {
    if (!prepItems || !Array.isArray(prepItems)) return [];
    return prepItems.map(item => ({
      id: item.id || 0,
      name: item.name || 'Unknown Prep',
      category: item.category || 'vegetables',
      estimatedTime: item.estimatedTime || '30 min',
      isCustom: typeof item.isCustom === 'boolean' ? item.isCustom : false,
      hasRecipe: typeof item.hasRecipe === 'boolean' ? item.hasRecipe : false,
      recipe: item.recipe || null
    }));
  };

  private migrateScheduledPreps = (scheduledPreps: any): ScheduledPrep[] => {
    if (!scheduledPreps || !Array.isArray(scheduledPreps)) return [];
    return scheduledPreps.map(prep => ({
      id: prep.id || 0,
      prepId: prep.prepId || 0,
      name: prep.name || 'Unknown Prep',
      category: prep.category || 'vegetables',
      estimatedTime: prep.estimatedTime || '30 min',
      isCustom: typeof prep.isCustom === 'boolean' ? prep.isCustom : false,
      hasRecipe: typeof prep.hasRecipe === 'boolean' ? prep.hasRecipe : false,
      recipe: prep.recipe || null,
      scheduledDate: prep.scheduledDate || '',
      priority: prep.priority || 'medium',
      timeSlot: prep.timeSlot || '',
      completed: typeof prep.completed === 'boolean' ? prep.completed : false,
      assignedTo: prep.assignedTo || null,
      notes: prep.notes || ''
    }));
  };

  cleanup() {
    console.log('🧹 Cleaning up protected Firebase service...');
    this.pollIntervals.forEach((interval, endpoint) => {
      clearInterval(interval);
    });
    this.pollIntervals.clear();
    this.lastDataSnapshots.clear();
    this.lastKnownGoodData.clear();
  }
}
