// SyncIntegration.ts - Integration layer for the unified sync system
import { UnifiedMultiDeviceSync, DeviceInfo, SyncEvent, SyncData } from './UnifiedMultiDeviceSync';
import type { 
  Employee, Task, DailyDataMap, TaskAssignments, PrepItem, ScheduledPrep, 
  PrepSelections, StoreItem, InventoryItem, DatabaseItem, ActivityLogEntry 
} from './types';

export interface SyncState {
  isConnected: boolean;
  isInitialized: boolean;
  deviceCount: number;
  lastSync: number;
  connectionQuality: 'excellent' | 'good' | 'poor';
  syncEvents: SyncEvent[];
  error?: string;
  isListening: boolean;
  queueSize: number;
  deviceId: string;
}

export interface SyncConfig {
  enableAutoSync: boolean;
  syncInterval: number;
  maxRetries: number;
  batchDelay: number;
  enableOfflineMode: boolean;
}

export class SyncIntegration {
  private syncService: UnifiedMultiDeviceSync;
  private syncCallbacks: Map<string, (data: any) => void> = new Map();
  private syncState: SyncState;
  private eventHistory: SyncEvent[] = [];
  private maxEventHistory = 100;
  private onSyncStateChange?: (state: SyncState) => void;
  private config: SyncConfig;
  
  constructor(userName: string = 'Unknown User', config?: Partial<SyncConfig>) {
    this.config = {
      enableAutoSync: true,
      syncInterval: 1000,
      maxRetries: 10,
      batchDelay: 500,
      enableOfflineMode: true,
      ...config
    };

    this.syncState = {
      isConnected: false,
      isInitialized: false,
      deviceCount: 0,
      lastSync: 0,
      connectionQuality: 'poor',
      syncEvents: [],
      isListening: false,
      queueSize: 0,
      deviceId: ''
    };

    this.syncService = new UnifiedMultiDeviceSync(userName);
    this.setupEventHandlers();
    
    console.log('🔧 Sync Integration initialized with config:', this.config);
  }

  private setupEventHandlers(): void {
    // Device count changes
    this.syncService.onDeviceCountChanged((count: number, devices: DeviceInfo[]) => {
      this.syncState.deviceCount = count;
      this.emitSyncStateUpdate();
      
      console.log(`📱 Device count updated: ${count} active devices`);
    });

    // Sync events
    this.syncService.onSyncEventReceived((event: SyncEvent) => {
      this.addEventToHistory(event);
      this.updateSyncStateFromEvent(event);
      this.emitSyncStateUpdate();
    });

    // Connection state changes
    this.syncService.onConnectionStateChanged((isConnected: boolean, quality: string) => {
      this.syncState.isConnected = isConnected;
      this.syncState.connectionQuality = quality as 'excellent' | 'good' | 'poor';
      this.syncState.isInitialized = isConnected;
      
      if (isConnected) {
        this.syncState.error = undefined;
      }
      
      this.emitSyncStateUpdate();
      
      console.log(`🔌 Connection state: ${isConnected ? 'connected' : 'disconnected'} (${quality})`);
    });
  }

  private addEventToHistory(event: SyncEvent): void {
    this.eventHistory.unshift(event);
    
    // Keep only the latest events
    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(0, this.maxEventHistory);
    }
    
    // Update sync state events (keep last 10 for UI)
    this.syncState.syncEvents = this.eventHistory.slice(0, 10);
  }

  private updateSyncStateFromEvent(event: SyncEvent): void {
    const stats = this.syncService.getSyncStats();
    
    this.syncState.lastSync = event.timestamp;
    this.syncState.isListening = stats.isListening;
    this.syncState.queueSize = stats.queueSize;
    this.syncState.deviceId = stats.deviceId;
    
    // Handle error events
    if (event.type === 'error') {
      this.syncState.error = event.description;
      this.syncState.connectionQuality = 'poor';
    } else if (event.type === 'connection_restored') {
      this.syncState.error = undefined;
      this.syncState.connectionQuality = 'excellent';
    }
  }

  private emitSyncStateUpdate(): void {
    if (this.onSyncStateChange) {
      this.onSyncStateChange({ ...this.syncState });
    }
  }

  // === PUBLIC API ===

  // Initialization and connection
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing sync integration...');
      
      // The UnifiedMultiDeviceSync auto-connects in constructor
      // We just need to wait for the connection to be established
      
      this.syncState.isInitialized = true;
      this.emitSyncStateUpdate();
      
      console.log('✅ Sync integration initialized successfully');
      
    } catch (error) {
      console.error('❌ Sync integration initialization failed:', error);
      this.syncState.error = `Initialization failed: ${error}`;
      this.emitSyncStateUpdate();
      throw error;
    }
  }

  async connect(): Promise<void> {
    await this.syncService.connect();
  }

  disconnect(): void {
    this.syncService.disconnect();
    this.syncState.isConnected = false;
    this.syncState.isInitialized = false;
    this.emitSyncStateUpdate();
  }

  // Field subscription management
  subscribeToField(field: string, callback: (data: any) => void): void {
    console.log(`📡 Subscribing to field: ${field}`);
    
    // Store callback for management
    this.syncCallbacks.set(field, callback);
    
    // Subscribe through the sync service
    this.syncService.onFieldChange(field, callback);
  }

  unsubscribeFromField(field: string): void {
    console.log(`📡 Unsubscribing from field: ${field}`);
    
    this.syncCallbacks.delete(field);
    this.syncService.offFieldChange(field);
  }

  // Data synchronization
  async syncField(field: string, data: any, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    if (!this.config.enableAutoSync) {
      console.log(`⏸️ Auto-sync disabled, skipping ${field}`);
      return;
    }

    try {
      await this.syncService.syncData(field, data, priority);
      console.log(`📤 Queued ${field} for sync (${priority} priority)`);
    } catch (error) {
      console.error(`❌ Failed to sync ${field}:`, error);
      this.syncState.error = `Sync failed for ${field}: ${error}`;
      this.emitSyncStateUpdate();
      throw error;
    }
  }

  // Bulk sync for multiple fields
  async syncMultipleFields(updates: Record<string, any>): Promise<void> {
    if (!this.config.enableAutoSync) {
      console.log('⏸️ Auto-sync disabled, skipping bulk sync');
      return;
    }

    try {
      await this.syncService.syncMultipleFields(updates);
      console.log(`📤 Queued ${Object.keys(updates).length} fields for bulk sync`);
    } catch (error) {
      console.error('❌ Bulk sync failed:', error);
      this.syncState.error = `Bulk sync failed: ${error}`;
      this.emitSyncStateUpdate();
      throw error;
    }
  }

  // Data refresh and retrieval
  async refreshAllData(): Promise<SyncData> {
    try {
      console.log('🔄 Refreshing all data from remote...');
      const data = await this.syncService.refreshAllData();
      console.log('✅ Data refresh completed');
      return data;
    } catch (error) {
      console.error('❌ Failed to refresh data:', error);
      this.syncState.error = `Data refresh failed: ${error}`;
      this.emitSyncStateUpdate();
      throw error;
    }
  }

  // Device management
  async getActiveDevices(): Promise<DeviceInfo[]> {
    try {
      // Get device info from the sync service stats
      const stats = this.syncService.getSyncStats();
      
      // For now, return basic device info
      // The actual device count is updated via the callback
      return [this.syncService.getDeviceInfo()];
    } catch (error) {
      console.error('❌ Failed to get active devices:', error);
      return [];
    }
  }

  updateUser(userName: string): void {
    this.syncService.updateCurrentUser(userName);
    console.log(`👤 Updated user to: ${userName}`);
  }

  // Configuration management
  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Sync config updated:', this.config);
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  // State and diagnostics
  getSyncState(): SyncState {
    const stats = this.syncService.getSyncStats();
    
    return {
      ...this.syncState,
      isConnected: stats.isConnected,
      lastSync: stats.lastSync || this.syncState.lastSync,
      isListening: stats.isListening,
      queueSize: stats.queueSize,
      deviceId: stats.deviceId,
      connectionQuality: stats.connectionQuality as 'excellent' | 'good' | 'poor'
    };
  }

  async checkDataIntegrity(): Promise<Map<string, boolean>> {
    try {
      console.log('🔍 Checking data integrity...');
      const results = await this.syncService.checkDataIntegrity();
      console.log('✅ Data integrity check completed');
      return results;
    } catch (error) {
      console.error('❌ Data integrity check failed:', error);
      this.syncState.error = `Integrity check failed: ${error}`;
      this.emitSyncStateUpdate();
      throw error;
    }
  }

  getEventHistory(): SyncEvent[] {
    return [...this.eventHistory];
  }

  clearEventHistory(): void {
    this.eventHistory = [];
    this.syncState.syncEvents = [];
    this.emitSyncStateUpdate();
    console.log('🗑️ Event history cleared');
  }

  // Force operations
  async forceSyncAll(): Promise<void> {
    try {
      console.log('⚡ Force syncing all pending data...');
      await this.syncService.forceSyncAll();
      console.log('✅ Force sync completed');
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      this.syncState.error = `Force sync failed: ${error}`;
      this.emitSyncStateUpdate();
      throw error;
    }
  }

  // Event subscription
  onSyncStateChanged(callback: (state: SyncState) => void): void {
    this.onSyncStateChange = callback;
    
    // Immediately call with current state
    setTimeout(() => callback(this.getSyncState()), 0);
  }

  // Utility methods for common sync operations
  async syncEmployees(employees: Employee[]): Promise<void> {
    await this.syncField('employees', employees, 'high');
  }

  async syncTasks(tasks: Task[]): Promise<void> {
    await this.syncField('tasks', tasks, 'high');
  }

  async syncDailyData(dailyData: DailyDataMap): Promise<void> {
    await this.syncField('dailyData', dailyData, 'normal');
  }

  async syncCompletedTasks(completedTasks: Set<number> | number[]): Promise<void> {
    const data = completedTasks instanceof Set ? Array.from(completedTasks) : completedTasks;
    await this.syncField('completedTasks', data, 'high');
  }

  async syncTaskAssignments(taskAssignments: TaskAssignments): Promise<void> {
    await this.syncField('taskAssignments', taskAssignments, 'normal');
  }

  async syncCustomRoles(customRoles: string[]): Promise<void> {
    await this.syncField('customRoles', customRoles, 'low');
  }

  async syncPrepItems(prepItems: PrepItem[]): Promise<void> {
    await this.syncField('prepItems', prepItems, 'normal');
  }

  async syncScheduledPreps(scheduledPreps: ScheduledPrep[]): Promise<void> {
    await this.syncField('scheduledPreps', scheduledPreps, 'normal');
  }

  async syncPrepSelections(prepSelections: PrepSelections): Promise<void> {
    await this.syncField('prepSelections', prepSelections, 'normal');
  }

  async syncStoreItems(storeItems: StoreItem[]): Promise<void> {
    await this.syncField('storeItems', storeItems, 'normal');
  }

  async syncInventoryDailyItems(items: InventoryItem[]): Promise<void> {
    await this.syncField('inventoryDailyItems', items, 'normal');
  }

  async syncInventoryWeeklyItems(items: InventoryItem[]): Promise<void> {
    await this.syncField('inventoryWeeklyItems', items, 'normal');
  }

  async syncInventoryMonthlyItems(items: InventoryItem[]): Promise<void> {
    await this.syncField('inventoryMonthlyItems', items, 'normal');
  }

  async syncInventoryDatabaseItems(items: DatabaseItem[]): Promise<void> {
    await this.syncField('inventoryDatabaseItems', items, 'low');
  }

  async syncInventoryActivityLog(log: ActivityLogEntry[]): Promise<void> {
    await this.syncField('inventoryActivityLog', log, 'low');
  }

  // Batch sync common operations
  async syncAllCriticalData(data: {
    employees?: Employee[];
    tasks?: Task[];
    completedTasks?: Set<number> | number[];
    taskAssignments?: TaskAssignments;
  }): Promise<void> {
    const updates: Record<string, any> = {};
    
    if (data.employees) updates.employees = data.employees;
    if (data.tasks) updates.tasks = data.tasks;
    if (data.completedTasks) {
      updates.completedTasks = data.completedTasks instanceof Set 
        ? Array.from(data.completedTasks) 
        : data.completedTasks;
    }
    if (data.taskAssignments) updates.taskAssignments = data.taskAssignments;
    
    await this.syncMultipleFields(updates);
  }

  async syncAllPrepData(data: {
    prepItems?: PrepItem[];
    scheduledPreps?: ScheduledPrep[];
    prepSelections?: PrepSelections;
  }): Promise<void> {
    const updates: Record<string, any> = {};
    
    if (data.prepItems) updates.prepItems = data.prepItems;
    if (data.scheduledPreps) updates.scheduledPreps = data.scheduledPreps;
    if (data.prepSelections) updates.prepSelections = data.prepSelections;
    
    await this.syncMultipleFields(updates);
  }

  async syncAllInventoryData(data: {
    inventoryDailyItems?: InventoryItem[];
    inventoryWeeklyItems?: InventoryItem[];
    inventoryMonthlyItems?: InventoryItem[];
    inventoryDatabaseItems?: DatabaseItem[];
    inventoryActivityLog?: ActivityLogEntry[];
  }): Promise<void> {
    const updates: Record<string, any> = {};
    
    if (data.inventoryDailyItems) updates.inventoryDailyItems = data.inventoryDailyItems;
    if (data.inventoryWeeklyItems) updates.inventoryWeeklyItems = data.inventoryWeeklyItems;
    if (data.inventoryMonthlyItems) updates.inventoryMonthlyItems = data.inventoryMonthlyItems;
    if (data.inventoryDatabaseItems) updates.inventoryDatabaseItems = data.inventoryDatabaseItems;
    if (data.inventoryActivityLog) updates.inventoryActivityLog = data.inventoryActivityLog;
    
    await this.syncMultipleFields(updates);
  }

  // Health check and recovery
  async performHealthCheck(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    const state = this.getSyncState();
    
    // Check connection
    if (!state.isConnected) {
      issues.push('Not connected to sync service');
      recommendations.push('Check internet connection and try reconnecting');
    }
    
    // Check queue size
    if (state.queueSize > 10) {
      issues.push(`Large sync queue: ${state.queueSize} items`);
      recommendations.push('Consider force syncing to clear queue');
    }
    
    // Check last sync time
    const timeSinceLastSync = Date.now() - state.lastSync;
    if (timeSinceLastSync > 300000) { // 5 minutes
      issues.push('No recent sync activity');
      recommendations.push('Check connection and sync status');
    }
    
    // Check for errors
    if (state.error) {
      issues.push(`Error: ${state.error}`);
      recommendations.push('Check logs and try reconnecting');
    }
    
    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  async recoverFromError(): Promise<void> {
    try {
      console.log('🔧 Attempting sync recovery...');
      
      // Clear any existing errors
      this.syncState.error = undefined;
      
      // Disconnect and reconnect
      this.disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.connect();
      
      // Force sync any pending data
      await this.forceSyncAll();
      
      console.log('✅ Sync recovery completed');
      
    } catch (error) {
      console.error('❌ Sync recovery failed:', error);
      this.syncState.error = `Recovery failed: ${error}`;
      this.emitSyncStateUpdate();
      throw error;
    }
  }
}

// Export a singleton instance for global use
let globalSyncIntegration: SyncIntegration | null = null;

export function getSyncIntegration(userName?: string): SyncIntegration {
  if (!globalSyncIntegration) {
    globalSyncIntegration = new SyncIntegration(userName || 'Unknown User');
  }
  return globalSyncIntegration;
}

export function resetSyncIntegration(): void {
  if (globalSyncIntegration) {
    globalSyncIntegration.disconnect();
    globalSyncIntegration = null;
  }
}

// Hook for React components
export function useSyncIntegration(userName?: string) {
  const syncIntegration = getSyncIntegration(userName);
  
  return {
    syncIntegration,
    syncState: syncIntegration.getSyncState(),
    subscribeToField: syncIntegration.subscribeToField.bind(syncIntegration),
    unsubscribeFromField: syncIntegration.unsubscribeFromField.bind(syncIntegration),
    syncField: syncIntegration.syncField.bind(syncIntegration),
    refreshData: syncIntegration.refreshAllData.bind(syncIntegration),
    forceSyncAll: syncIntegration.forceSyncAll.bind(syncIntegration),
    checkIntegrity: syncIntegration.checkDataIntegrity.bind(syncIntegration),
    performHealthCheck: syncIntegration.performHealthCheck.bind(syncIntegration),
    recoverFromError: syncIntegration.recoverFromError.bind(syncIntegration)
  };
}
