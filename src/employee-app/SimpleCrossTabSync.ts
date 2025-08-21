// SimpleCrossTabSync.ts - New simplified sync system for perfect cross-tab synchronization
// Designed to replace the complex VectorClock/OperationManager system

export interface SyncData {
  completedTasks: number[];
  taskAssignments: Record<number, number>;
  employees: any[];
  dailyData: any;
  lastUpdated: number;
  deviceId: string;
}

export interface SyncEvent {
  type: 'task_completed' | 'task_uncompleted' | 'data_update';
  taskId?: number;
  employeeId?: number;
  timestamp: number;
  deviceId: string;
  data?: Partial<SyncData>;
}

/**
 * Simple, reliable cross-tab synchronization using localStorage events
 * Key principles:
 * - Immediate sync across tabs
 * - Last-writer-wins conflict resolution
 * - Event-driven updates
 * - No complex vector clocks or operation queues
 */
export class SimpleCrossTabSync {
  private deviceId: string;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private storageKey = 'workVibe_simple_sync';
  private eventKey = 'workVibe_sync_event';
  private isInitialized = false;
  private lastKnownData: SyncData | null = null;

  constructor() {
    this.deviceId = this.generateDeviceId();
    this.setupStorageListener();
    console.log('🔄 SimpleCrossTabSync initialized for device:', this.deviceId);
  }

  private generateDeviceId(): string {
    // Use sessionStorage to ensure each tab has unique ID
    let deviceId = sessionStorage.getItem('workVibe_simple_deviceId');
    if (!deviceId) {
      deviceId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      sessionStorage.setItem('workVibe_simple_deviceId', deviceId);
    }
    return deviceId;
  }

  private setupStorageListener(): void {
    window.addEventListener('storage', (e) => {
      if (e.key === this.eventKey && e.newValue) {
        try {
          const event: SyncEvent = JSON.parse(e.newValue);
          // Don't process our own events
          if (event.deviceId !== this.deviceId) {
            console.log('📥 Received sync event from another tab:', event);
            this.handleSyncEvent(event);
          }
        } catch (error) {
          console.warn('Error parsing sync event:', error);
        }
      }
    });
  }

  private handleSyncEvent(event: SyncEvent): void {
    switch (event.type) {
      case 'task_completed':
      case 'task_uncompleted':
        this.emitToListeners('taskUpdate', {
          taskId: event.taskId,
          employeeId: event.employeeId,
          completed: event.type === 'task_completed',
          timestamp: event.timestamp
        });
        break;
      case 'data_update':
        if (event.data) {
          this.emitToListeners('dataUpdate', event.data);
        }
        break;
    }
  }

  private emitToListeners(eventType: string, data: any): void {
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.warn('Error in sync listener:', error);
      }
    });
  }

  /**
   * Load initial data from localStorage
   */
  loadInitialData(): SyncData | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data: SyncData = JSON.parse(stored);
        this.lastKnownData = data;
        console.log('📂 Loaded initial sync data:', data);
        return data;
      }
    } catch (error) {
      console.warn('Error loading initial sync data:', error);
    }
    return null;
  }

  /**
   * Save complete state and emit sync event
   */
  saveData(data: Partial<SyncData>): void {
    const completeData: SyncData = {
      completedTasks: [],
      taskAssignments: {},
      employees: [],
      dailyData: {},
      lastUpdated: Date.now(),
      deviceId: this.deviceId,
      ...this.lastKnownData,
      ...data
    };

    try {
      // Save to localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(completeData));
      this.lastKnownData = completeData;

      // Emit sync event to other tabs
      const syncEvent: SyncEvent = {
        type: 'data_update',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        data: data
      };

      localStorage.setItem(this.eventKey, JSON.stringify(syncEvent));
      console.log('📤 Data saved and sync event emitted:', data);
    } catch (error) {
      console.error('Error saving sync data:', error);
    }
  }

  /**
   * Handle task completion with immediate cross-tab sync
   */
  markTaskCompleted(taskId: number, employeeId: number): void {
    // Update our known data
    if (this.lastKnownData) {
      this.lastKnownData.completedTasks = [...new Set([...this.lastKnownData.completedTasks, taskId])];
      this.lastKnownData.taskAssignments = { ...this.lastKnownData.taskAssignments, [taskId]: employeeId };
      this.lastKnownData.lastUpdated = Date.now();
    }

    // Save to localStorage
    this.saveData({
      completedTasks: this.lastKnownData?.completedTasks || [taskId],
      taskAssignments: this.lastKnownData?.taskAssignments || { [taskId]: employeeId }
    });

    // Emit specific task completion event
    const event: SyncEvent = {
      type: 'task_completed',
      taskId,
      employeeId,
      timestamp: Date.now(),
      deviceId: this.deviceId
    };

    localStorage.setItem(this.eventKey, JSON.stringify(event));
    console.log(`✅ Task ${taskId} marked completed and synced`);
  }

  /**
   * Handle task un-completion with immediate cross-tab sync
   */
  markTaskUncompleted(taskId: number): void {
    // Update our known data
    if (this.lastKnownData) {
      this.lastKnownData.completedTasks = this.lastKnownData.completedTasks.filter(id => id !== taskId);
      const newAssignments = { ...this.lastKnownData.taskAssignments };
      delete newAssignments[taskId];
      this.lastKnownData.taskAssignments = newAssignments;
      this.lastKnownData.lastUpdated = Date.now();
    }

    // Save to localStorage
    this.saveData({
      completedTasks: this.lastKnownData?.completedTasks || [],
      taskAssignments: this.lastKnownData?.taskAssignments || {}
    });

    // Emit specific task un-completion event
    const event: SyncEvent = {
      type: 'task_uncompleted',
      taskId,
      timestamp: Date.now(),
      deviceId: this.deviceId
    };

    localStorage.setItem(this.eventKey, JSON.stringify(event));
    console.log(`❌ Task ${taskId} marked uncompleted and synced`);
  }

  /**
   * Register listener for sync events
   */
  onTaskUpdate(callback: (data: { taskId: number; employeeId?: number; completed: boolean; timestamp: number }) => void): void {
    if (!this.listeners.has('taskUpdate')) {
      this.listeners.set('taskUpdate', []);
    }
    this.listeners.get('taskUpdate')!.push(callback);
  }

  /**
   * Register listener for data updates
   */
  onDataUpdate(callback: (data: Partial<SyncData>) => void): void {
    if (!this.listeners.has('dataUpdate')) {
      this.listeners.set('dataUpdate', []);
    }
    this.listeners.get('dataUpdate')!.push(callback);
  }

  /**
   * Get current device info
   */
  getDeviceId(): string {
    return this.deviceId;
  }

  /**
   * Get last known sync data
   */
  getLastKnownData(): SyncData | null {
    return this.lastKnownData;
  }

  /**
   * Clear all sync data (for testing/debugging)
   */
  clearSyncData(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.eventKey);
    this.lastKnownData = null;
    console.log('🗑️ Sync data cleared');
  }
}

// Export singleton instance
export const simpleCrossTabSync = new SimpleCrossTabSync();