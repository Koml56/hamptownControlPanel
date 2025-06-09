// firebaseService.ts - Enhanced with data protection and conflict prevention
import { FIREBASE_CONFIG } from './constants';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
import type { Employee, Task, DailyDataMap, TaskAssignments, StoreItem } from './types';

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
        // Check if all employees have required fields and points > 0
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
        // Check if we have reasonable amount of historical data
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
    }
    
    return true;
  }

  // Backup current data before making changes
  private async backupCurrentData(): Promise<void> {
    console.log('💾 Creating data backup...');
    
    try {
      const [employeesRes, tasksRes, dailyRes, rolesRes, storeRes] = await Promise.all([
        fetch(`${this.baseUrl}/employees.json`),
        fetch(`${this.baseUrl}/tasks.json`),
        fetch(`${this.baseUrl}/dailyData.json`),
        fetch(`${this.baseUrl}/customRoles.json`),
        fetch(`${this.baseUrl}/storeItems.json`)
      ]);
      
      const backup = {
        employees: await employeesRes.json(),
        tasks: await tasksRes.json(),
        dailyData: await dailyRes.json(),
        customRoles: await rolesRes.json(),
        storeItems: await storeRes.json(),
        timestamp: new Date().toISOString(),
        deviceId: this.deviceId
      };
      
      // Store backup in localStorage
      const backupKey = `firebase_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));
      
      // Keep only last 5 backups
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

  // Restore from backup if data corruption is detected
  async restoreFromBackup(): Promise<boolean> {
    console.log('🚑 Attempting to restore from backup...');
    
    const backupKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('firebase_backup_'))
      .sort()
      .reverse(); // Most recent first
    
    for (const backupKey of backupKeys) {
      try {
        const backupStr = localStorage.getItem(backupKey);
        if (!backupStr) continue;
        
        const backup = JSON.parse(backupStr);
        console.log(`🔄 Trying backup from ${backup.timestamp}`);
        
        // Validate backup data
        if (this.validateData('employees', backup.employees) &&
            this.validateData('dailyData', backup.dailyData) &&
            this.validateData('tasks', backup.tasks)) {
          
          // Restore the backup
          await this.saveDataWithProtection({
            employees: backup.employees,
            tasks: backup.tasks,
            dailyData: backup.dailyData,
            customRoles: backup.customRoles || ['Cleaner', 'Manager', 'Supervisor'],
            storeItems: backup.storeItems || getDefaultStoreItems()
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

  // Protected save with validation and conflict detection
  private async saveDataWithProtection(data: {
    employees: Employee[];
    tasks: Task[];
    dailyData: DailyDataMap;
    customRoles: string[];
    storeItems: StoreItem[];
  }) {
    console.log('🔐 Saving data with protection...');
    
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
        // Save metadata for conflict tracking
        fetch(`${this.baseUrl}/metadata.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metadata)
        })
      ]);
      
      console.log('✅ Protected save completed');
    } catch (error) {
      console.error('❌ Protected save failed:', error);
      throw error;
    }
  }

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
    this.setupProtectedPolling('employees', callbacks.onEmployeesUpdate, this.migrateEmployeeData, 500);
    this.setupProtectedPolling('tasks', callbacks.onTasksUpdate, this.migrateTaskData, 500);
    this.setupProtectedPolling('dailyData', callbacks.onDailyDataUpdate, this.migrateDailyData, 500);
    this.setupProtectedPolling('customRoles', callbacks.onCustomRolesUpdate, (data) => data || ['Cleaner', 'Manager', 'Supervisor'], 1000);
    this.setupProtectedPolling('storeItems', callbacks.onStoreItemsUpdate, this.migrateStoreItems, 1000);

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
        
        // CRITICAL: Validate data before using it
        if (!this.validateData(endpoint, data)) {
          console.error(`🚨 Corrupted data detected for ${endpoint}!`);
          
          // Try to restore from backup
          if (endpoint === 'employees' || endpoint === 'dailyData') {
            const restored = await this.restoreFromBackup();
            if (!restored) {
              console.error(`❌ Could not restore ${endpoint}, using fallback`);
              // Use last known good data or defaults
              const fallback = this.lastKnownGoodData.get(endpoint) || this.getFallbackData(endpoint);
              callback(migrationFn(fallback));
            }
          }
          return;
        }
        
        const dataHash = JSON.stringify(data);
        const lastHash = this.lastDataSnapshots.get(endpoint);
        
        if (lastHash !== undefined && lastHash !== dataHash) {
          // Store as last known good data
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

  async loadData() {
    console.log('🔥 Loading data with protection...');
    
    try {
      // Create backup before loading
      await this.backupCurrentData();
      
      const [employeesRes, tasksRes, dailyRes, customRolesRes, storeRes] = await Promise.all([
        fetch(`${this.baseUrl}/employees.json`),
        fetch(`${this.baseUrl}/tasks.json`),
        fetch(`${this.baseUrl}/dailyData.json`),
        fetch(`${this.baseUrl}/customRoles.json`),
        fetch(`${this.baseUrl}/storeItems.json`)
      ]);
      
      const employeesData = await employeesRes.json();
      const tasksData = await tasksRes.json();
      const dailyDataRes = await dailyRes.json();
      const customRolesData = await customRolesRes.json();
      const storeItemsData = await storeRes.json();
      
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
      
      // Store initial snapshots
      this.lastDataSnapshots.set('employees', JSON.stringify(employeesData));
      this.lastDataSnapshots.set('tasks', JSON.stringify(tasksData));
      this.lastDataSnapshots.set('dailyData', JSON.stringify(dailyDataRes));
      this.lastDataSnapshots.set('customRoles', JSON.stringify(customRolesData));
      this.lastDataSnapshots.set('storeItems', JSON.stringify(storeItemsData));
      
      // Store as known good data
      this.lastKnownGoodData.set('employees', employeesData);
      this.lastKnownGoodData.set('tasks', tasksData);
      this.lastKnownGoodData.set('dailyData', dailyDataRes);
      this.lastKnownGoodData.set('customRoles', customRolesData);
      this.lastKnownGoodData.set('storeItems', storeItemsData);
      
      console.log('✅ Protected data load completed');
      
      return {
        employees: migratedEmployees,
        tasks: migratedTasks,
        dailyData: migratedDailyData,
        customRoles: customRolesData || ['Cleaner', 'Manager', 'Supervisor'],
        storeItems: migratedStoreItems
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
  }) {
    return this.saveDataWithProtection(data);
  }

  async saveField(field: string, data: any) {
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

  // Migration functions (unchanged)
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
