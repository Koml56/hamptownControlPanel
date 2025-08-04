// EnhancedSyncIntegration.ts - Professional integration layer for multi-device sync
import { ProfessionalMultiDeviceSync, SyncEvent, DeviceInfo } from './ProfessionalMultiDeviceSync';
import type { 
  Employee, Task, DailyDataMap, TaskAssignments, PrepItem, ScheduledPrep, 
  PrepSelections, StoreItem, InventoryItem, DatabaseItem, ActivityLogEntry 
} from './types';

interface SyncState {
  isConnected: boolean;
  deviceCount: number;
  lastSync: number;
  connectionQuality: string;
  syncEvents: SyncEvent[];
  conflicts: number;
}

interface ConflictResolutionStrategy {
  employees: 'newest' | 'merge' | 'manual';
  tasks: 'newest' | 'merge' | 'manual';
  inventory: 'newest' | 'merge' | 'manual';
  default: 'newest' | 'merge' | 'manual';
}

export class EnhancedSyncIntegration {
  private syncService: ProfessionalMultiDeviceSync;
  private syncState: SyncState;
  private conflictStrategy: ConflictResolutionStrategy;
  private syncCallbacks: Map<string, (data: any) => void> = new Map();
  private eventHistory: SyncEvent[] = [];
  private readonly maxEventHistory = 100;

  constructor(userName: string = 'Unknown User') {
    this.syncService = new ProfessionalMultiDeviceSync(userName);
    
    this.syncState = {
      isConnected: false,
      deviceCount: 0,
      lastSync: 0,
      connectionQuality: 'excellent',
      syncEvents: [],
      conflicts: 0
    };

    this.conflictStrategy = {
      employees: 'merge',
      tasks: 'merge', 
      inventory: 'newest',
      default: 'newest'
    };

    this.setupEventHandlers();
    this.setupConflictResolution();
    
    console.log('🎯 Enhanced Sync Integration initialized');
  }

  private setupEventHandlers(): void {
    // Device count changes
    this.syncService.onDeviceCountChanged((count, devices) => {
      this.syncState.deviceCount = count;
      console.log(`📱 Active devices: ${count}`, devices.map(d => d.name));
    });

    // Sync events
    this.syncService.onSyncEventReceived((event) => {
      this.handleSyncEvent(event);
    });
  }

  private setupConflictResolution(): void {
    this.syncService.onConflictResolution((field, localData, remoteData) => {
      return this.resolveConflict(field, localData, remoteData);
    });
  }

  private handleSyncEvent(event: SyncEvent): void {
    // Add to event history
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(0, this.maxEventHistory);
    }

    // Update sync state
    this.syncState.lastSync = event.timestamp;
    this.syncState.syncEvents = this.eventHistory.slice(0, 10); // Keep last 10 events

    // Handle different event types
    switch (event.type) {
      case 'device_join':
        console.log(`👋 Device joined: ${event.deviceName}`);
        break;
      case 'device_leave':
        console.log(`👋 Device left: ${event.deviceName}`);
        break;
      case 'conflict_resolution':
        this.syncState.conflicts++;
        console.log(`⚖️ Conflict resolved for ${event.field}`);
        break;
      case 'error':
        console.warn(`❌ Sync error: ${event.description}`);
        break;
    }

    // Emit to listeners
    this.emitSyncStateUpdate();
  }

  private resolveConflict(field: string, localData: any, remoteData: any): any {
    const strategy = this.getConflictStrategy(field);
    
    console.log(`⚖️ Resolving conflict for ${field} using strategy: ${strategy}`);

    switch (strategy) {
      case 'newest':
        return this.resolveByNewest(localData, remoteData);
      case 'merge':
        return this.resolveByMerge(field, localData, remoteData);
      case 'manual':
        return this.resolveManually(field, localData, remoteData);
      default:
        return remoteData; // Default to remote data
    }
  }

  private getConflictStrategy(field: string): 'newest' | 'merge' | 'manual' {
    if (field.includes('employee')) return this.conflictStrategy.employees;
    if (field.includes('task')) return this.conflictStrategy.tasks;
    if (field.includes('inventory')) return this.conflictStrategy.inventory;
    return this.conflictStrategy.default;
  }

  private resolveByNewest(localData: any, remoteData: any): any {
    // Simple timestamp-based resolution
    const localTime = this.getDataTimestamp(localData);
    const remoteTime = this.getDataTimestamp(remoteData);
    
    return localTime > remoteTime ? localData : remoteData;
  }

  private resolveByMerge(field: string, localData: any, remoteData: any): any {
    try {
      switch (field) {
        case 'employees':
          return this.mergeEmployees(localData, remoteData);
        case 'tasks':
          return this.mergeTasks(localData, remoteData);
        case 'completedTasks':
          return this.mergeCompletedTasks(localData, remoteData);
        case 'taskAssignments':
          return this.mergeTaskAssignments(localData, remoteData);
        default:
          // For arrays, merge by unique ID
          if (Array.isArray(localData) && Array.isArray(remoteData)) {
            return this.mergeArraysByID(localData, remoteData);
          }
          // For objects, merge properties
          if (typeof localData === 'object' && typeof remoteData === 'object') {
            return { ...remoteData, ...localData };
          }
          return remoteData;
      }
    } catch (error) {
      console.warn(`⚠️ Merge failed for ${field}, using remote data:`, error);
      return remoteData;
    }
  }

  private mergeEmployees(local: Employee[], remote: Employee[]): Employee[] {
    const merged = [...remote];
    
    local.forEach(localEmp => {
      const existingIndex = merged.findIndex(emp => emp.id === localEmp.id);
      if (existingIndex >= 0) {
        // Keep the one with more recent data (higher total points or more recent activity)
        const existing = merged[existingIndex];
        if (localEmp.totalPoints >= existing.totalPoints) {
          merged[existingIndex] = localEmp;
        }
      } else {
        merged.push(localEmp);
      }
    });

    return merged;
  }

  private mergeTasks(local: Task[], remote: Task[]): Task[] {
    const merged = [...remote];
    
    local.forEach(localTask => {
      const existingIndex = merged.findIndex(task => task.id === localTask.id);
      if (existingIndex >= 0) {
        // Merge task properties, keeping local changes for description and points
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...localTask
        };
      } else {
        merged.push(localTask);
      }
    });

    return merged;
  }

  private mergeCompletedTasks(local: Set<number> | number[], remote: Set<number> | number[]): Set<number> {
    const localArray = Array.isArray(local) ? local : Array.from(local);
    const remoteArray = Array.isArray(remote) ? remote : Array.from(remote);
    
    // Union of both sets
    return new Set([...localArray, ...remoteArray]);
  }

  private mergeTaskAssignments(local: TaskAssignments, remote: TaskAssignments): TaskAssignments {
    return { ...remote, ...local };
  }

  private mergeArraysByID(local: any[], remote: any[]): any[] {
    const merged = [...remote];
    
    local.forEach(localItem => {
      if (localItem.id) {
        const existingIndex = merged.findIndex(item => item.id === localItem.id);
        if (existingIndex >= 0) {
          merged[existingIndex] = localItem;
        } else {
          merged.push(localItem);
        }
      }
    });

    return merged;
  }

  private resolveManually(field: string, localData: any, remoteData: any): any {
    // For now, return remote data and log for manual review
    console.warn(`🔍 Manual conflict resolution needed for ${field}`);
    // In a real implementation, this would trigger a UI for manual resolution
    return remoteData;
  }

  private getDataTimestamp(data: any): number {
    // Try to extract timestamp from data structure
    if (data && typeof data === 'object') {
      if (data.lastModified) return data.lastModified;
      if (data.timestamp) return data.timestamp;
      if (data.updatedAt) return data.updatedAt;
    }
    return Date.now();
  }

  // Public API
  async connect(): Promise<void> {
    try {
      await this.syncService.connect();
      this.syncState.isConnected = true;
      this.emitSyncStateUpdate();
    } catch (error) {
      console.error('❌ Enhanced sync connection failed:', error);
      this.syncState.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.syncService.disconnect();
    this.syncState.isConnected = false;
    this.emitSyncStateUpdate();
  }

  // Field subscription management
  subscribeToField(field: string, callback: (data: any) => void): void {
    this.syncCallbacks.set(field, callback);
    this.syncService.onFieldChange(field, callback);
  }

  unsubscribeFromField(field: string): void {
    this.syncCallbacks.delete(field);
    this.syncService.offFieldChange(field);
  }

  // Data synchronization
  async syncField(field: string, data: any): Promise<void> {
    try {
      await this.syncService.syncData(field, data);
    } catch (error) {
      console.error(`❌ Failed to sync ${field}:`, error);
      throw error;
    }
  }

  // Bulk sync for multiple fields
  async syncMultipleFields(updates: Record<string, any>): Promise<void> {
    const promises = Object.entries(updates).map(([field, data]) => 
      this.syncField(field, data)
    );
    
    await Promise.allSettled(promises);
  }

  // Data refresh
  async refreshAllData(): Promise<any> {
    try {
      return await this.syncService.refreshDataFromAllDevices();
    } catch (error) {
      console.error('❌ Failed to refresh data:', error);
      throw error;
    }
  }

  // Device management
  async getActiveDevices(): Promise<DeviceInfo[]> {
    return await this.syncService.getActiveDevices();
  }

  updateUser(userName: string): void {
    this.syncService.updateCurrentUser(userName);
  }

  // Diagnostics and monitoring
  getSyncState(): SyncState {
    const stats = this.syncService.getSyncStats();
    return {
      ...this.syncState,
      isConnected: stats.isConnected,
      lastSync: stats.lastSync,
      connectionQuality: stats.connectionQuality
    };
  }

  async checkDataIntegrity(): Promise<Map<string, boolean>> {
    return await this.syncService.checkDataIntegrity();
  }

  getEventHistory(): SyncEvent[] {
    return [...this.eventHistory];
  }

  clearEventHistory(): void {
    this.eventHistory = [];
    this.syncState.syncEvents = [];
    this.emitSyncStateUpdate();
  }

  // Configuration
  setConflictStrategy(strategies: Partial<ConflictResolutionStrategy>): void {
    this.conflictStrategy = { ...this.conflictStrategy, ...strategies };
    console.log('⚖️ Conflict resolution strategies updated:', this.conflictStrategy);
  }

  // State change notifications
  private stateChangeCallbacks: ((state: SyncState) => void)[] = [];

  onSyncStateChange(callback: (state: SyncState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  private emitSyncStateUpdate(): void {
    const currentState = this.getSyncState();
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(currentState);
      } catch (error) {
        console.warn('⚠️ Sync state callback error:', error);
      }
    });
  }

  // Performance monitoring
  getPerformanceMetrics(): {
    avgSyncTime: number;
    syncSuccessRate: number;
    conflictRate: number;
    eventCount: number;
  } {
    const syncEvents = this.eventHistory.filter(e => e.type === 'data_update');
    const conflictEvents = this.eventHistory.filter(e => e.type === 'conflict_resolution');
    const errorEvents = this.eventHistory.filter(e => e.type === 'error');

    return {
      avgSyncTime: 0, // Would need to track sync durations
      syncSuccessRate: syncEvents.length / (syncEvents.length + errorEvents.length) || 1,
      conflictRate: conflictEvents.length / syncEvents.length || 0,
      eventCount: this.eventHistory.length
    };
  }

  // Recovery and error handling
  async recoverFromError(): Promise<void> {
    console.log('🔄 Attempting error recovery...');
    
    try {
      // Disconnect and reconnect
      await this.disconnect();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.connect();
      
      // Refresh all data
      await this.refreshAllData();
      
      console.log('✅ Error recovery completed');
    } catch (error) {
      console.error('❌ Error recovery failed:', error);
      throw error;
    }
  }
}