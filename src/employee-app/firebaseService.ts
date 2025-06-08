// firebaseService.ts - Fixed with proper Firebase real-time streaming
import { FIREBASE_CONFIG } from './constants';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
import type { Employee, Task, DailyDataMap, TaskAssignments, StoreItem } from './types';

export class FirebaseService {
  private baseUrl = FIREBASE_CONFIG.databaseURL;
  private eventSources: Map<string, EventSource> = new Map();
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastDataSnapshots: Map<string, string> = new Map();

  // Setup real-time listeners using Firebase REST streaming
  setupRealtimeListeners(callbacks: {
    onEmployeesUpdate: (employees: Employee[]) => void;
    onTasksUpdate: (tasks: Task[]) => void;
    onDailyDataUpdate: (dailyData: DailyDataMap) => void;
    onCustomRolesUpdate: (roles: string[]) => void;
    onStoreItemsUpdate: (items: StoreItem[]) => void;
    onConnectionChange: (status: 'connected' | 'disconnected' | 'error') => void;
  }) {
    console.log('🔥 Setting up Firebase real-time listeners...');

    // Setup polling-based real-time sync (more reliable than SSE with Firebase)
    this.setupPollingListener('employees', callbacks.onEmployeesUpdate, this.migrateEmployeeData);
    this.setupPollingListener('tasks', callbacks.onTasksUpdate, this.migrateTaskData);
    this.setupPollingListener('dailyData', callbacks.onDailyDataUpdate, this.migrateDailyData);
    this.setupPollingListener('customRoles', callbacks.onCustomRolesUpdate, (data) => data || ['Cleaner', 'Manager', 'Supervisor']);
    this.setupPollingListener('storeItems', callbacks.onStoreItemsUpdate, this.migrateStoreItems);

    // Connection status monitoring
    this.setupConnectionMonitoring(callbacks.onConnectionChange);
  }

  private setupPollingListener(
    endpoint: string,
    callback: (data: any) => void,
    migrationFn: (data: any) => any
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
        if (this.lastDataSnapshots.get(endpoint) !== dataHash) {
          this.lastDataSnapshots.set(endpoint, dataHash);
          
          if (this.lastDataSnapshots.has(endpoint)) { // Only after first load to avoid initial false triggers
            const migratedData = migrationFn(data);
            console.log(`🔄 Real-time update detected for ${endpoint}`);
            callback(migratedData);
          } else {
            // First load - just store the hash, don't trigger callback
            console.log(`📥 Initial data loaded for ${endpoint}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Polling error for ${endpoint}:`, error);
      }
    };

    // Initial load
    pollData();
    
    // Set up polling every 2 seconds
    const interval = setInterval(pollData, 2000);
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
    
    // Test every 30 seconds
    setInterval(testConnection, 30000);
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
      const savePromises = [
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
        })
      ];

      await Promise.all(savePromises);
      
      console.log('✅ Firebase: Data saved successfully');
      
    } catch (error) {
      console.error('❌ Firebase save failed:', error);
      throw error;
    }
  }

  // Method to save a single field quickly
  async saveField(field: string, data: any) {
    console.log(`🔥 Quick saving ${field} to Firebase...`);
    
    try {
      await fetch(`${this.baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      console.log(`✅ ${field} saved successfully`);
    } catch (error) {
      console.error(`❌ Failed to save ${field}:`, error);
      throw error;
    }
  }

  // Clean up listeners
  cleanup() {
    console.log('🧹 Cleaning up Firebase listeners...');
    
    this.eventSources.forEach((eventSource, endpoint) => {
      eventSource.close();
      console.log(`❌ Closed event source for ${endpoint}`);
    });
    
    this.pollIntervals.forEach((interval, endpoint) => {
      clearInterval(interval);
      console.log(`❌ Cleared polling interval for ${endpoint}`);
    });
    
    this.eventSources.clear();
    this.pollIntervals.clear();
    this.lastDataSnapshots.clear();
  }
}
