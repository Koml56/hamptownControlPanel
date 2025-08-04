// UnifiedMultiDeviceSync.ts - Complete real-time multi-device synchronization solution
import { FIREBASE_CONFIG } from './constants';
import type { 
  Employee, Task, DailyDataMap, TaskAssignments, PrepItem, ScheduledPrep, 
  PrepSelections, StoreItem, InventoryItem, DatabaseItem, ActivityLogEntry 
} from './types';

export interface DeviceInfo {
  id: string;
  name: string;
  lastSeen: number;
  user: string;
  platform: string;
  isActive: boolean;
  browserInfo: string;
  version: string;
  connectionQuality: 'excellent' | 'good' | 'poor';
  ipAddress?: string;
}

export interface SyncEvent {
  type: 'data_update' | 'device_join' | 'device_leave' | 'conflict_resolution' | 'full_sync' | 'error' | 'connection_restored';
  timestamp: number;
  deviceId: string;
  deviceName: string;
  data?: any;
  field?: string;
  description?: string;
  checksum?: string;
}

export interface SyncData {
  employees?: Employee[];
  tasks?: Task[];
  dailyData?: DailyDataMap;
  completedTasks?: number[];
  taskAssignments?: TaskAssignments;
  customRoles?: string[];
  prepItems?: PrepItem[];
  scheduledPreps?: ScheduledPrep[];
  prepSelections?: PrepSelections;
  storeItems?: StoreItem[];
  inventoryDailyItems?: InventoryItem[];
  inventoryWeeklyItems?: InventoryItem[];
  inventoryMonthlyItems?: InventoryItem[];
  inventoryDatabaseItems?: DatabaseItem[];
  inventoryActivityLog?: ActivityLogEntry[];
}

interface SyncQueueItem {
  field: string;
  data: any;
  timestamp: number;
  checksum: string;
  retry: number;
  priority: 'high' | 'normal' | 'low';
}

export class ProfessionalMultiDeviceSync {
  private baseUrl = FIREBASE_CONFIG.databaseURL;
  private deviceId: string;
  private deviceInfo: DeviceInfo;
  private syncCallbacks: Map<string, (data: any) => void> = new Map();
  private isConnected = false;
  private isInitialized = false;
  
  // Connection management
  private eventSource: EventSource | null = null;
  private connectionRetryCount = 0;
  private maxRetries = 10;
  private retryTimeouts: Set<NodeJS.Timeout> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionQuality: 'excellent' | 'good' | 'poor' = 'excellent';
  
  // Data management
  private syncQueue: Map<string, SyncQueueItem> = new Map();
  private lastDataTimestamp: Map<string, number> = new Map();
  private dataChecksums: Map<string, string> = new Map();
  private pendingUpdates: Set<string> = new Set();
  private localDataCache: Map<string, any> = new Map();
  
  // Performance optimization
  private syncBatchTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private updateThrottleTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // Event handlers
  private onDeviceCountChange?: (count: number, devices: DeviceInfo[]) => void;
  private onSyncEvent?: (event: SyncEvent) => void;
  private onConnectionStateChange?: (isConnected: boolean, quality: string) => void;

  constructor(userName: string = 'Unknown User') {
    this.deviceId = this.generateDeviceId();
    this.deviceInfo = this.createDeviceInfo(userName);
    
    console.log('🚀 Unified Multi-Device Sync initialized:', {
      deviceId: this.deviceId.substring(0, 8) + '...',
      user: userName,
      version: '3.0.0'
    });

    // Setup cleanup handlers
    this.setupCleanupHandlers();
    
    // Auto-connect
    this.connect().catch(console.error);
  }

  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('workVibe_deviceId_v3');
    if (!deviceId) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 8);
      const performance = Math.random().toString(36).substr(2, 4);
      deviceId = `unified_${timestamp}_${random}_${performance}`;
      localStorage.setItem('workVibe_deviceId_v3', deviceId);
    }
    return deviceId;
  }

  private createDeviceInfo(userName: string): DeviceInfo {
    const userAgent = navigator.userAgent;
    
    let deviceType = 'Desktop';
    let browserName = 'Unknown';
    
    // Enhanced device detection
    if (/Mobile|Android|iPhone|iPod|BlackBerry|Windows Phone/i.test(userAgent)) {
      deviceType = 'Mobile';
    } else if (/iPad|Tablet/i.test(userAgent)) {
      deviceType = 'Tablet';
    }
    
    // Enhanced browser detection
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browserName = 'Chrome';
    else if (userAgent.includes('Firefox')) browserName = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browserName = 'Safari';
    else if (userAgent.includes('Edg')) browserName = 'Edge';
    
    const deviceName = `${browserName} on ${deviceType}`;
    
    return {
      id: this.deviceId,
      name: deviceName,
      lastSeen: Date.now(),
      user: userName,
      platform: deviceType,
      isActive: true,
      browserInfo: `${browserName} ${deviceType}`,
      version: '3.0.0',
      connectionQuality: 'excellent'
    };
  }

  private setupCleanupHandlers(): void {
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleVisibilityChange(false);
      } else {
        this.handleVisibilityChange(true);
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Network online - reconnecting...');
      this.handleNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      console.log('📵 Network offline - pausing sync...');
      this.handleNetworkChange(false);
    });
  }

  private handleVisibilityChange(isVisible: boolean): void {
    if (isVisible) {
      console.log('👀 Tab visible - resuming sync...');
      if (!this.isConnected) {
        this.connect().catch(console.error);
      }
      this.updatePresence(true).catch(console.warn);
    } else {
      console.log('👻 Tab hidden - reducing activity...');
      this.updatePresence(false).catch(console.warn);
    }
  }

  private handleNetworkChange(isOnline: boolean): void {
    if (isOnline) {
      this.connectionQuality = 'excellent';
      if (!this.isConnected) {
        this.connect().catch(console.error);
      }
    } else {
      this.connectionQuality = 'poor';
      this.disconnect();
    }
  }

  // === PUBLIC API ===

  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('✅ Already connected');
      return;
    }

    try {
      console.log('🔌 Connecting unified sync...');
      
      // Update presence first
      await this.updatePresence(true);
      
      // Start listening for changes
      this.startEnhancedListening();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.isConnected = true;
      this.isInitialized = true;
      this.connectionRetryCount = 0;
      this.connectionQuality = 'excellent';
      
      this.emitSyncEvent({
        type: 'device_join',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        description: 'Unified sync connected successfully'
      });

      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(true, this.connectionQuality);
      }
      
      console.log('✅ Unified sync connected successfully');
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting unified sync...');
    
    this.isConnected = false;
    this.stopListening();
    this.stopHeartbeat();
    this.clearAllTimers();
    
    // Update presence to offline
    this.updatePresence(false).catch(console.warn);

    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(false, 'poor');
    }
    
    this.emitSyncEvent({
      type: 'device_leave',
      timestamp: Date.now(),
      deviceId: this.deviceId,
      deviceName: this.deviceInfo.name,
      description: 'Unified sync disconnected'
    });
  }

  // Field subscription management
  onFieldChange(field: string, callback: (data: any) => void): void {
    console.log(`📡 Subscribing to field: ${field}`);
    this.syncCallbacks.set(field, callback);
    
    // If we have cached data, provide it immediately
    if (this.localDataCache.has(field)) {
      const cachedData = this.localDataCache.get(field);
      setTimeout(() => callback(cachedData), 0);
    }
  }

  offFieldChange(field: string): void {
    console.log(`📡 Unsubscribing from field: ${field}`);
    this.syncCallbacks.delete(field);
    this.localDataCache.delete(field);
    this.lastDataTimestamp.delete(field);
    this.dataChecksums.delete(field);
  }

  // Data synchronization
  async syncData(field: string, data: any, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    if (!this.isInitialized) {
      console.warn('⚠️ Sync not initialized yet, queuing data...');
    }

    const checksum = this.calculateChecksum(data);
    const timestamp = Date.now();
    
    // Update local cache immediately
    this.localDataCache.set(field, data);
    this.dataChecksums.set(field, checksum);
    
    // Add to sync queue with priority
    const queueItem: SyncQueueItem = {
      field,
      data,
      timestamp,
      checksum,
      retry: 0,
      priority
    };
    
    this.syncQueue.set(field, queueItem);
    
    // Process queue with appropriate delay based on priority
    const delay = priority === 'high' ? 100 : priority === 'normal' ? 500 : 1000;
    
    if (this.syncBatchTimer) {
      clearTimeout(this.syncBatchTimer);
    }
    
    this.syncBatchTimer = setTimeout(() => {
      this.processSyncQueue();
    }, delay);
  }

  // Bulk sync for multiple fields
  async syncMultipleFields(updates: Record<string, any>): Promise<void> {
    const promises = Object.entries(updates).map(([field, data]) => 
      this.syncData(field, data, 'normal')
    );
    
    await Promise.allSettled(promises);
  }

  // === PRIVATE IMPLEMENTATION ===

  private startEnhancedListening(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    console.log('👂 Starting enhanced EventSource listener...');
    
    // Use server-sent events for real-time updates
    const eventSourceUrl = `${this.baseUrl}/.json`;
    this.eventSource = new EventSource(eventSourceUrl);
    
    this.eventSource.onopen = () => {
      console.log('📡 EventSource connection opened');
      this.connectionQuality = 'excellent';
      this.connectionRetryCount = 0;
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(true, this.connectionQuality);
      }
    };
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data === null) return;
        
        console.log('📥 Received real-time update');
        this.processIncomingData(data);
        
      } catch (error) {
        console.warn('⚠️ Error processing incoming data:', error);
        this.handleDataError(error);
      }
    };
    
    this.eventSource.onerror = (error) => {
      console.warn('⚠️ EventSource error:', error);
      this.handleConnectionError();
    };
  }

  private processIncomingData(data: any): void {
    const relevantFields = [
      'employees', 'tasks', 'dailyData', 'completedTasks', 'taskAssignments', 'customRoles',
      'prepItems', 'scheduledPreps', 'prepSelections', 'storeItems',
      'inventoryDailyItems', 'inventoryWeeklyItems', 'inventoryMonthlyItems',
      'inventoryDatabaseItems', 'inventoryActivityLog'
    ];
    
    for (const field of relevantFields) {
      if (data[field] && this.syncCallbacks.has(field)) {
        this.processFieldUpdate(field, data[field]);
      }
    }
  }

  private processFieldUpdate(field: string, newData: any): void {
    const callback = this.syncCallbacks.get(field);
    if (!callback) return;
    
    const now = Date.now();
    const lastUpdate = this.lastDataTimestamp.get(field) || 0;
    const newChecksum = this.calculateChecksum(newData);
    const currentChecksum = this.dataChecksums.get(field);
    
    // Prevent unnecessary updates
    if (newChecksum === currentChecksum) {
      return;
    }
    
    // Throttle updates but don't lose important changes
    const isImportantField = ['employees', 'tasks', 'completedTasks'].includes(field);
    const throttleTime = isImportantField ? 500 : 1000;
    
    // Clear existing throttle timer for this field
    const existingTimer = this.updateThrottleTimers.get(field);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new throttle timer
    const timer = setTimeout(() => {
      this.updateThrottleTimers.delete(field);
      
      // Update cache and checksum
      this.localDataCache.set(field, newData);
      this.dataChecksums.set(field, newChecksum);
      this.lastDataTimestamp.set(field, now);
      
      // Process data based on field type
      let processedData = newData;
      if (field === 'completedTasks' && Array.isArray(processedData)) {
        processedData = new Set(processedData);
      }
      
      // Call the callback
      callback(processedData);
      
      this.emitSyncEvent({
        type: 'data_update',
        timestamp: now,
        deviceId: 'remote',
        deviceName: 'Remote Device',
        field,
        description: `${field} updated via real-time sync`,
        checksum: newChecksum
      });
      
      console.log(`📥 Applied ${field} update from remote device`);
      
    }, throttleTime);
    
    this.updateThrottleTimers.set(field, timer);
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.size === 0 || !this.isConnected) {
      return;
    }
    
    this.isSyncing = true;
    const queue = Array.from(this.syncQueue.entries()).sort(([,a], [,b]) => {
      // Sort by priority: high > normal > low
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    this.syncQueue.clear();
    
    try {
      console.log(`📤 Processing sync queue: ${queue.length} items`);
      
      // Process high priority items first, then batch the rest
      const highPriorityItems = queue.filter(([,item]) => item.priority === 'high');
      const otherItems = queue.filter(([,item]) => item.priority !== 'high');
      
      // Send high priority items immediately
      for (const [field, item] of highPriorityItems) {
        await this.syncFieldToFirebase(field, item);
      }
      
      // Batch send other items
      if (otherItems.length > 0) {
        await this.batchSyncToFirebase(otherItems);
      }
      
    } catch (error) {
      console.error('❌ Sync queue processing failed:', error);
      
      // Re-queue failed items with retry logic
      for (const [field, item] of queue) {
        if (item.retry < 3) {
          item.retry++;
          this.syncQueue.set(field, item);
        } else {
          console.warn(`⚠️ Dropping ${field} after 3 retries`);
        }
      }
      
    } finally {
      this.isSyncing = false;
      
      // Process any new items that were queued during sync
      if (this.syncQueue.size > 0) {
        setTimeout(() => this.processSyncQueue(), 1000);
      }
    }
  }

  private async syncFieldToFirebase(field: string, item: SyncQueueItem): Promise<void> {
    try {
      let processedData = item.data;
      if (item.data instanceof Set) {
        processedData = Array.from(item.data);
      }
      
      const response = await fetch(`${this.baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`✅ Synced ${field} (${item.priority} priority)`);
      
      this.emitSyncEvent({
        type: 'data_update',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        field,
        description: `${field} synced to Firebase`,
        checksum: item.checksum
      });
      
    } catch (error) {
      console.warn(`⚠️ Failed to sync ${field}:`, error);
      throw error;
    }
  }

  private async batchSyncToFirebase(items: [string, SyncQueueItem][]): Promise<void> {
    try {
      // Prepare batch update object
      const batchUpdate: Record<string, any> = {};
      
      for (const [field, item] of items) {
        let processedData = item.data;
        if (item.data instanceof Set) {
          processedData = Array.from(item.data);
        }
        batchUpdate[field] = processedData;
      }
      
      // Send batch update
      const response = await fetch(`${this.baseUrl}/.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchUpdate)
      });

      if (!response.ok) {
        throw new Error(`Batch sync HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`✅ Batch synced ${items.length} fields`);
      
      this.emitSyncEvent({
        type: 'data_update',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        description: `Batch synced ${items.length} fields to Firebase`
      });
      
    } catch (error) {
      console.warn('⚠️ Batch sync failed:', error);
      
      // Fall back to individual syncs
      for (const [field, item] of items) {
        try {
          await this.syncFieldToFirebase(field, item);
        } catch (fieldError) {
          console.warn(`⚠️ Failed individual fallback sync for ${field}:`, fieldError);
        }
      }
    }
  }

  private stopListening(): void {
    if (this.eventSource) {
      console.log('🔇 Stopping EventSource listener');
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.updatePresence(true).catch((error) => {
          console.warn('⚠️ Heartbeat failed:', error);
          this.handleConnectionError();
        });
      }
    }, 60000); // Every 60 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async updatePresence(isActive: boolean): Promise<void> {
    try {
      this.deviceInfo.lastSeen = Date.now();
      this.deviceInfo.isActive = isActive;
      this.deviceInfo.connectionQuality = this.connectionQuality;
      
      const response = await fetch(`${this.baseUrl}/presence/${this.deviceId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.deviceInfo)
      });

      if (!response.ok) {
        throw new Error(`Presence update HTTP ${response.status}`);
      }

      // Update device count
      this.updateDeviceCount();
      
    } catch (error) {
      console.warn('⚠️ Presence update failed:', error);
      throw error;
    }
  }

  private async updateDeviceCount(): Promise<void> {
    try {
      const devices = await this.getActiveDevices();
      if (this.onDeviceCountChange) {
        this.onDeviceCountChange(devices.length, devices);
      }
    } catch (error) {
      console.warn('⚠️ Device count update failed:', error);
    }
  }

  private async getActiveDevices(): Promise<DeviceInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/presence.json`);
      if (!response.ok) return [];
      
      const presenceData = await response.json();
      if (!presenceData) return [];
      
      const now = Date.now();
      const activeDevices = Object.values(presenceData).filter((device: any) =>
        device && 
        device.lastSeen && 
        (now - device.lastSeen) < 300000 // 5 minutes
      ) as DeviceInfo[];
      
      return activeDevices.slice(0, 20); // Limit for performance
      
    } catch (error) {
      console.warn('⚠️ Failed to get active devices:', error);
      return [];
    }
  }

  private handleConnectionError(): void {
    console.log('🔄 Handling connection error...');
    
    this.connectionQuality = 'poor';
    this.stopListening();
    
    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(false, this.connectionQuality);
    }
    
    if (this.connectionRetryCount < this.maxRetries) {
      this.scheduleReconnect();
    } else {
      console.warn('⚠️ Max reconnection attempts reached');
      this.isConnected = false;
      
      this.emitSyncEvent({
        type: 'error',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        description: 'Connection lost, max retries exceeded'
      });
    }
  }

  private handleDataError(error: any): void {
    console.warn('⚠️ Data processing error:', error);
    
    this.emitSyncEvent({
      type: 'error',
      timestamp: Date.now(),
      deviceId: this.deviceId,
      deviceName: this.deviceInfo.name,
      description: `Data processing error: ${error.message}`
    });
  }

  private scheduleReconnect(): void {
    this.connectionRetryCount++;
    const delay = Math.min(1000 * Math.pow(2, this.connectionRetryCount), 30000);
    
    console.log(`🔄 Reconnect scheduled in ${delay/1000}s (attempt ${this.connectionRetryCount}/${this.maxRetries})`);
    
    const timeout = setTimeout(() => {
      this.retryTimeouts.delete(timeout);
      if (!this.isConnected) {
        this.connect().catch(() => {
          if (this.connectionRetryCount < this.maxRetries) {
            this.scheduleReconnect();
          }
        });
      }
    }, delay);
    
    this.retryTimeouts.add(timeout);
  }

  private clearAllTimers(): void {
    if (this.syncBatchTimer) {
      clearTimeout(this.syncBatchTimer);
      this.syncBatchTimer = null;
    }
    
    // Clear all retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    
    // Clear all throttle timers
    this.updateThrottleTimers.forEach(timer => clearTimeout(timer));
    this.updateThrottleTimers.clear();
  }

  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private emitSyncEvent(event: SyncEvent): void {
    if (this.onSyncEvent) {
      this.onSyncEvent(event);
    }
  }

  // === PUBLIC EVENT HANDLERS ===

  onDeviceCountChanged(callback: (count: number, devices: DeviceInfo[]) => void): void {
    this.onDeviceCountChange = callback;
  }

  onSyncEventReceived(callback: (event: SyncEvent) => void): void {
    this.onSyncEvent = callback;
  }

  onConnectionStateChanged(callback: (isConnected: boolean, quality: string) => void): void {
    this.onConnectionStateChange = callback;
  }

  // === UTILITY METHODS ===

  updateCurrentUser(userName: string): void {
    this.deviceInfo.user = userName;
    this.updatePresence(true).catch(console.warn);
  }

  getSyncStats(): {
    isConnected: boolean;
    deviceCount: number;
    lastSync: number;
    isListening: boolean;
    queueSize: number;
    connectionQuality: string;
    version: string;
    deviceId: string;
  } {
    return {
      isConnected: this.isConnected,
      deviceCount: 0, // Will be updated by callback
      lastSync: Math.max(...Array.from(this.lastDataTimestamp.values()), 0),
      isListening: this.eventSource !== null,
      queueSize: this.syncQueue.size,
      connectionQuality: this.connectionQuality,
      version: '3.0.0',
      deviceId: this.deviceId.substring(0, 8) + '...'
    };
  }

  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo, lastSeen: Date.now() };
  }

  async refreshAllData(): Promise<SyncData> {
    try {
      const response = await fetch(`${this.baseUrl}/.json`);
      if (!response.ok) {
        throw new Error(`Failed to refresh data: ${response.status}`);
      }
      
      const data = await response.json();
      
      this.emitSyncEvent({
        type: 'full_sync',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        description: 'Full data refresh completed'
      });
      
      return data || {};
      
    } catch (error) {
      console.error('❌ Failed to refresh all data:', error);
      throw error;
    }
  }

  async checkDataIntegrity(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    try {
      const remoteData = await this.refreshAllData();
      
      this.syncCallbacks.forEach((_, field) => {
        const remoteFieldData = (remoteData as any)[field];
        const localFieldData = this.localDataCache.get(field);
        
        if (remoteFieldData && localFieldData) {
          const remoteChecksum = this.calculateChecksum(remoteFieldData);
          const localChecksum = this.calculateChecksum(localFieldData);
          results.set(field, remoteChecksum === localChecksum);
        } else {
          results.set(field, !remoteFieldData && !localFieldData);
        }
      });
      
    } catch (error) {
      console.error('❌ Data integrity check failed:', error);
      // Mark all as failed
      this.syncCallbacks.forEach((_, field) => {
        results.set(field, false);
      });
    }
    
    return results;
  }

  // Force immediate sync of all pending data
  async forceSyncAll(): Promise<void> {
    if (this.syncQueue.size === 0) {
      console.log('📤 No pending sync operations');
      return;
    }
    
    console.log('📤 Force syncing all pending data...');
    
    // Clear the batch timer and process immediately
    if (this.syncBatchTimer) {
      clearTimeout(this.syncBatchTimer);
      this.syncBatchTimer = null;
    }
    
    await this.processSyncQueue();
  }
}
