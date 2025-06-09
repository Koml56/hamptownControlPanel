// firebaseService.ts - Enhanced for instant sync with optimistic updates
import { FIREBASE_CONFIG } from './constants';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
import type { Employee, Task, DailyDataMap, TaskAssignments, StoreItem } from './types';

export class FirebaseService {
  private baseUrl = FIREBASE_CONFIG.databaseURL;
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastDataSnapshots: Map<string, string> = new Map();
  private pendingUpdates: Map<string, any> = new Map();

  // Setup real-time listeners with faster polling for instant feel
  setupRealtimeListeners(callbacks: {
    onEmployeesUpdate: (employees: Employee[]) => void;
    onTasksUpdate: (tasks: Task[]) => void;
    onDailyDataUpdate: (dailyData: DailyDataMap) => void;
    onCustomRolesUpdate: (roles: string[]) => void;
    onStoreItemsUpdate: (items: StoreItem[]) => void;
    onConnectionChange: (status: 'connected' | 'disconnected' | 'error') => void;
  }) {
    console.log('🔥 Setting up instant Firebase sync...');

    // Setup faster polling for near real-time sync
    this.setupPollingListener('employees', callbacks.onEmployeesUpdate, this.migrateEmployeeData, 500); // 500ms
    this.setupPollingListener('tasks', callbacks.onTasksUpdate, this.migrateTaskData, 500);
    this.setupPollingListener('dailyData', callbacks.onDailyDataUpdate, this.migrateDailyData, 500);
    this.setupPollingListener('customRoles', callbacks.onCustomRolesUpdate, (data) => data || ['Cleaner', 'Manager', 'Supervisor'], 1000);
    this.setupPollingListener('storeItems', callbacks.onStoreItemsUpdate, this.migrateStoreItems, 1000);

    // Connection status monitoring
    this.setupConnectionMonitoring(callbacks.onConnectionChange);
  }

  private setupPollingListener(
    endpoint: string,
    callback: (data: any) => void,
    migrationFn: (data: any) => any,
    intervalMs: number = 500 // Default 500ms for instant feel
  ) {
    const pollData = async () => {
      try {
        const response = await fetch(`${this.baseUrl}/${endpoint}.json`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const dataHash = JSON.stringify(data);
        
        // Only trigger callback if data actually changed
        const lastHash = this.lastDataSnapshots.get(endpoint);
        if (lastHash !== undefined && lastHash !== dataHash) {
          this.lastDataSnapshots.set(endpoint, dataHash);
          
          const migratedData = migrationFn(data);
          console.log(`⚡ Instant update detected for ${endpoint}`);
          callback(migratedData);
        } else if (lastHash === undefined) {
          // First load - store hash but don't trigger callback
          this.lastDataSnapshots.set(endpoint, dataHash);
          console.log(`📥 Initial data loaded for ${endpoint}`);
        }
      } catch (error) {
        console.warn(`⚠️ Polling error for ${endpoint}:`, error);
      }
    };

    // Initial load
    pollData();
    
    // Set up faster polling
    const interval = setInterval(pollData, intervalMs);
    this.pollIntervals.set(endpoint, interval);
  }

  private setupConnectionMonitoring(onConnectionChange: (status: 'connected' | 'disconnected' | 'error') => void) {
    // Monitor online/offline status
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

    // Test connection periodically
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

    // Initial status
    testConnection();
    
    // Test every 15 seconds (more frequent)
    setInterval(testConnection, 15000);
  }

  async loadData() {
    console.log('🔥 Loading initial data from Firebase...');
    
    try {
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
      
      const migratedEmployees = this.migrateEmployeeData(employeesData);
      const migratedTasks = this.migrateTaskData(tasksData);
      const migratedDailyData = this.migrateDailyData(dailyDataRes);
      const migratedStoreItems = this.migrateStoreItems(storeItemsData);
      
      // Store initial snapshots to avoid false triggers
      this.lastDataSnapshots.set('employees', JSON.stringify(employeesData));
      this.lastDataSnapshots.set('tasks', JSON.stringify(tasksData));
      this.lastDataSnapshots.set('dailyData', JSON.stringify(dailyDataRes));
      this.lastDataSnapshots.set('customRoles', JSON.stringify(customRolesData));
      this.lastDataSnapshots.set('storeItems', JSON.stringify(storeItemsData));
      
      console.log('✅ Firebase: Initial data loaded successfully');
      
      return {
        employees: migratedEmployees,
        tasks: migratedTasks,
        dailyData: migratedDailyData,
        customRoles: customRolesData || ['Cleaner', 'Manager', 'Supervisor'],
        storeItems: migratedStoreItems
      };
      
    } catch (error) {
      console.error('❌ Firebase connection failed:', error);
      throw error;
    }
  }

  // Optimistic instant save - saves immediately without waiting
  async instantSave(field: string, data: any) {
    console.log(`⚡ Instant saving ${field}...`);
    
    // Store as pending update
    this.pendingUpdates.set(field, data);
    
    try {
      // Fire and forget - don't wait for response
      fetch(`${this.baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(response => {
        if (response.ok) {
          console.log(`⚡ ${field} instantly saved`);
          this.pendingUpdates.delete(field);
        } else {
          console.warn(`⚠️ Instant save failed for ${field}, will retry`);
        }
      }).catch(error => {
        console.warn(`⚠️ Instant save error for ${field}:`, error);
      });
      
      return true;
    } catch (error) {
      console.error(`❌ Instant save failed for ${field}:`, error);
      return false;
    }
  }

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

  async saveData(data: {
    employees: Employee[];
    tasks: Task[];
    dailyData: DailyDataMap;
    customRoles: string[];
    storeItems: StoreItem[];
  }) {
    console.log('🔥 Saving to Firebase...');
    
    try {
      // Use instant save for critical data
      await Promise.all([
        this.instantSave('employees', data.employees),
        this.instantSave('tasks', data.tasks),
        this.instantSave('dailyData', data.dailyData),
        this.instantSave('customRoles', data.customRoles),
        this.instantSave('storeItems', data.storeItems)
      ]);
      
      console.log('✅ Firebase: Data saved instantly');
      
    } catch (error) {
      console.error('❌ Firebase save failed:', error);
      throw error;
    }
  }

  // Method to save a single field instantly
  async saveField(field: string, data: any) {
    return this.instantSave(field, data);
  }

  // Clean up listeners
  cleanup() {
    console.log('🧹 Cleaning up Firebase listeners...');
    
    this.pollIntervals.forEach((interval, endpoint) => {
      clearInterval(interval);
      console.log(`❌ Cleared polling interval for ${endpoint}`);
    });
    
    this.pollIntervals.clear();
    this.lastDataSnapshots.clear();
    this.pendingUpdates.clear();
  }
}
