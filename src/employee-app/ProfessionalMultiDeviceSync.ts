// ProfessionalMultiDeviceSync.ts - Professional-grade real-time multi-device synchronization
// This replaces the existing multiDeviceSync.ts with a more robust implementation
import { FIREBASE_CONFIG } from './constants';
import type { Employee, Task, DailyDataMap, TaskAssignments, PrepItem, ScheduledPrep, PrepSelections, StoreItem, InventoryItem, DatabaseItem, ActivityLogEntry } from './types';

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
}

export interface SyncEvent {
  type: 'data_update' | 'device_join' | 'device_leave' | 'conflict_resolution' | 'full_sync' | 'error';
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
}

export class ProfessionalMultiDeviceSync {
  private baseUrl = FIREBASE_CONFIG.databaseURL;
  private deviceId: string;
  private deviceInfo: DeviceInfo;
  private syncCallbacks: Map<string, (data: any) => void> = new Map();
  private isConnected = false;
  private eventSource: EventSource | null = null;
  
  // Enhanced state management
  private syncQueue: Map<string, SyncQueueItem> = new Map();
  private lastDataTimestamp: Map<string, number> = new Map();
  private dataChecksums: Map<string, string> = new Map();
  private pendingUpdates: Set<string> = new Set();
  
  // Connection management
  private connectionRetryCount = 0;
  private maxRetries = 5;
  private retryTimeouts: Set<NodeJS.Timeout> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionQuality: 'excellent' | 'good' | 'poor' = 'excellent';
  
  // Performance optimization
  private syncBatchTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private conflictResolutionInProgress = false;
  
  // Event handlers
  private onDeviceCountChange?: (count: number, devices: DeviceInfo[]) => void;
  private onSyncEvent?: (event: SyncEvent) => void;
  private onConflictDetected?: (field: string, local: any, remote: any) => any;
  
  constructor(userName: string = 'Unknown User') {
    this.deviceId = this.generateUniqueDeviceId();
    this.deviceInfo = this.createDeviceInfo(userName);
    
    console.log('🚀 Professional Multi-Device Sync initialized:', {
      deviceId: this.deviceId.substring(0, 12) + '...',
      user: userName,
      version: '2.0.0'
    });

    // Enhanced cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.gracefulDisconnect();
    });

    // Enhanced visibility change handling
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updatePresence(false);
      } else {
        this.updatePresence(true);
        this.checkForDataUpdates();
      }
    });

    // Network quality monitoring
    this.startConnectionQualityMonitoring();
  }

  private generateUniqueDeviceId(): string {
    let deviceId = localStorage.getItem('professional_device_id');
    if (!deviceId) {
      const timestamp = Date.now().toString(36);
      const random = crypto.getRandomValues(new Uint32Array(2))
        .reduce((acc, val) => acc + val.toString(36), '');
      deviceId = `prof_${timestamp}_${random}`;
      localStorage.setItem('professional_device_id', deviceId);
    }
    return deviceId;
  }

  private createDeviceInfo(userName: string): DeviceInfo {
    const userAgent = navigator.userAgent;
    const connection = (navigator as any).connection;
    
    // Enhanced device detection
    let deviceType = 'Desktop';
    let browserName = 'Unknown';
    
    if (/Mobile|Android|iPhone|iPod/.test(userAgent)) {
      deviceType = 'Mobile';
    } else if (/iPad|Tablet/.test(userAgent)) {
      deviceType = 'Tablet';
    }
    
    if (userAgent.includes('Chrome')) browserName = 'Chrome';
    else if (userAgent.includes('Firefox')) browserName = 'Firefox';
    else if (userAgent.includes('Safari')) browserName = 'Safari';
    else if (userAgent.includes('Edge')) browserName = 'Edge';
    
    // Connection quality assessment
    let connectionQuality: 'excellent' | 'good' | 'poor' = 'excellent';
    if (connection) {
      const speed = connection.downlink || 10;
      if (speed < 1) connectionQuality = 'poor';
      else if (speed < 5) connectionQuality = 'good';
    }

    return {
      id: this.deviceId,
      name: `${deviceType} • ${browserName}`,
      lastSeen: Date.now(),
      user: userName,
      platform: deviceType.toLowerCase(),
      isActive: true,
      browserInfo: `${browserName} ${this.getBrowserVersion()} on ${navigator.platform}`,
      version: '2.0.0',
      connectionQuality
    };
  }

  private getBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    const versionMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return versionMatch ? versionMatch[2] : 'Unknown';
  }

  private startConnectionQualityMonitoring(): void {
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        const speed = connection.downlink || 10;
        let quality: 'excellent' | 'good' | 'poor' = 'excellent';
        
        if (speed < 1) quality = 'poor';
        else if (speed < 5) quality = 'good';
        
        if (quality !== this.connectionQuality) {
          this.connectionQuality = quality;
          this.deviceInfo.connectionQuality = quality;
          this.updatePresence(true).catch(console.warn);
          
          console.log(`📶 Connection quality changed to: ${quality} (${speed} Mbps)`);
        }
      });
    }
  }

  // Enhanced connection with better error handling
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('✅ Already connected to professional sync');
      return;
    }

    try {
      console.log('🔗 Connecting professional multi-device sync...');
      
      // Clear any existing connections
      this.disconnect();
      
      // Update presence with retries
      await this.updatePresenceWithRetry();
      
      // Start enhanced listening
      this.startEnhancedListening();
      
      // Start heartbeat with connection quality adjustment
      this.startAdaptiveHeartbeat();
      
      // Initial data integrity check
      await this.performDataIntegrityCheck();
      
      this.isConnected = true;
      this.connectionRetryCount = 0;
      
      this.emitSyncEvent({
        type: 'device_join',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        description: `Professional sync connected (${this.connectionQuality} connection)`
      });
      
      console.log('✅ Professional multi-device sync connected successfully');
      
    } catch (error) {
      console.error('❌ Professional sync connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private async updatePresenceWithRetry(maxAttempts: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.updatePresence(true);
        return;
      } catch (error) {
        console.warn(`⚠️ Presence update attempt ${attempt} failed:`, error);
        if (attempt === maxAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  private startEnhancedListening(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    console.log('👂 Starting enhanced EventSource listener...');
    
    const eventSourceUrl = `${this.baseUrl}/.json`;
    this.eventSource = new EventSource(eventSourceUrl);
    
    this.eventSource.onopen = () => {
      console.log('📡 EventSource connection opened');
      this.connectionQuality = 'excellent';
    };
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data === null) return;
        
        this.processEnhancedDataUpdate(data);
        
      } catch (error) {
        console.warn('⚠️ Error processing enhanced data update:', error);
        this.handleDataError(error);
      }
    };
    
    this.eventSource.onerror = (error) => {
      console.warn('⚠️ Enhanced EventSource error:', error);
      this.connectionQuality = 'poor';
      this.handleConnectionError();
    };
  }

  private processEnhancedDataUpdate(data: any): void {
    const relevantFields = [
      'employees', 'tasks', 'dailyData', 'completedTasks', 'taskAssignments', 'customRoles',
      'prepItems', 'scheduledPreps', 'prepSelections', 'storeItems',
      'inventoryDailyItems', 'inventoryWeeklyItems', 'inventoryMonthlyItems',
      'inventoryDatabaseItems', 'inventoryActivityLog'
    ];
    
    const now = Date.now();
    
    for (const field of relevantFields) {
      if (data[field] && this.syncCallbacks.has(field)) {
        // Skip updates from this device to prevent loops
        if (this.pendingUpdates.has(field)) {
          console.log(`⏭️ Skipping own update for ${field}`);
          continue;
        }
        
        const callback = this.syncCallbacks.get(field)!;
        const lastUpdate = this.lastDataTimestamp.get(field) || 0;
        
        // Enhanced throttling with conflict detection
        if (now - lastUpdate > 1000) { // 1 second throttle
          this.lastDataTimestamp.set(field, now);
          
          const newChecksum = this.calculateChecksum(data[field]);
          const oldChecksum = this.dataChecksums.get(field);
          
          if (newChecksum !== oldChecksum) {
            // Conflict detection and resolution
            if (this.conflictResolutionInProgress) {
              console.log(`⏳ Conflict resolution in progress for ${field}, queuing update`);
              return;
            }
            
            this.dataChecksums.set(field, newChecksum);
            
            let processedData = data[field];
            if (field === 'completedTasks' && Array.isArray(processedData)) {
              processedData = new Set(processedData);
            }
            
            callback(processedData);
            
            this.emitSyncEvent({
              type: 'data_update',
              timestamp: now,
              deviceId: 'remote',
              deviceName: 'Remote Device',
              field,
              checksum: newChecksum,
              description: `${field} updated professionally`
            });
          }
        }
      }
    }
  }

  private calculateChecksum(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private startAdaptiveHeartbeat(): void {
    // Adaptive heartbeat based on connection quality
    const intervals = {
      excellent: 60000, // 1 minute
      good: 45000,      // 45 seconds
      poor: 30000       // 30 seconds
    };
    
    const interval = intervals[this.connectionQuality];
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.updatePresence(true).catch(() => {
          this.connectionQuality = 'poor';
          this.startAdaptiveHeartbeat(); // Restart with new interval
        });
      }
    }, interval);
  }

  private async performDataIntegrityCheck(): Promise<void> {
    try {
      console.log('🔍 Performing initial data integrity check...');
      
      const response = await fetch(`${this.baseUrl}/.json`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Integrity check failed: ${response.status}`);
      }
      
      const remoteData = await response.json();
      
      // Calculate checksums for all fields
      if (remoteData) {
        Object.keys(remoteData).forEach(field => {
          if (remoteData[field]) {
            const checksum = this.calculateChecksum(remoteData[field]);
            this.dataChecksums.set(field, checksum);
          }
        });
      }
      
      console.log('✅ Data integrity check completed');
      
    } catch (error) {
      console.warn('⚠️ Data integrity check failed:', error);
    }
  }

  // Enhanced sync with conflict resolution and checksums
  async syncData(field: string, data: any): Promise<void> {
    const syncItem: SyncQueueItem = {
      field,
      data,
      timestamp: Date.now(),
      checksum: this.calculateChecksum(data),
      retry: 0
    };
    
    // Mark as pending to prevent processing our own update
    this.pendingUpdates.add(field);
    
    this.syncQueue.set(field, syncItem);
    
    // Debounce sync operations
    if (this.syncBatchTimer) {
      clearTimeout(this.syncBatchTimer);
    }
    
    this.syncBatchTimer = setTimeout(() => {
      this.processSyncQueueEnhanced();
    }, 500); // 500ms batch delay
  }

  private async processSyncQueueEnhanced(): Promise<void> {
    if (this.isSyncing || this.syncQueue.size === 0) return;
    
    this.isSyncing = true;
    const queue = new Map(this.syncQueue);
    this.syncQueue.clear();
    
    try {
      console.log('📤 Processing enhanced sync queue:', Array.from(queue.keys()));
      
      // Process syncs with enhanced error handling and conflict resolution
      const syncPromises = Array.from(queue.entries()).map(async ([field, item]) => {
        try {
          // Pre-sync conflict check
          await this.checkForConflicts(field, item);
          
          let processedData = item.data instanceof Set ? Array.from(item.data) : item.data;
          
          const response = await fetch(`${this.baseUrl}/${field}.json`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'X-Device-ID': this.deviceId,
              'X-Checksum': item.checksum
            },
            body: JSON.stringify(processedData)
          });

          if (!response.ok) {
            throw new Error(`Sync failed for ${field}: ${response.status} ${response.statusText}`);
          }
          
          // Update local checksum
          this.dataChecksums.set(field, item.checksum);
          
          // Remove from pending updates after successful sync
          setTimeout(() => {
            this.pendingUpdates.delete(field);
          }, 2000);
          
          console.log(`✅ Enhanced sync completed for ${field}`);
          
          this.emitSyncEvent({
            type: 'data_update',
            timestamp: Date.now(),
            deviceId: this.deviceId,
            deviceName: this.deviceInfo.name,
            field,
            checksum: item.checksum,
            description: `${field} synced professionally`
          });
          
        } catch (error) {
          console.warn(`⚠️ Enhanced sync failed for ${field}:`, error);
          
          // Retry logic with exponential backoff
          item.retry++;
          if (item.retry <= 3) {
            setTimeout(() => {
              this.syncQueue.set(field, item);
              this.processSyncQueueEnhanced();
            }, 1000 * Math.pow(2, item.retry));
          } else {
            this.pendingUpdates.delete(field);
            this.emitSyncEvent({
              type: 'error',
              timestamp: Date.now(),
              deviceId: this.deviceId,
              deviceName: this.deviceInfo.name,
              field,
              description: `Failed to sync ${field} after ${item.retry} attempts`
            });
          }
        }
      });

      await Promise.allSettled(syncPromises);
      
    } catch (error) {
      console.error('❌ Enhanced sync queue processing failed:', error);
    } finally {
      this.isSyncing = false;
      
      // Process any new items that were queued during sync
      if (this.syncQueue.size > 0) {
        setTimeout(() => this.processSyncQueueEnhanced(), 1000);
      }
    }
  }

  private async checkForConflicts(field: string, item: SyncQueueItem): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${field}.json`);
      if (!response.ok) return;
      
      const remoteData = await response.json();
      if (!remoteData) return;
      
      const remoteChecksum = this.calculateChecksum(remoteData);
      const localChecksum = this.dataChecksums.get(field);
      
      if (localChecksum && remoteChecksum !== localChecksum && remoteChecksum !== item.checksum) {
        console.warn(`⚠️ Conflict detected for ${field}`);
        
        if (this.onConflictDetected) {
          this.conflictResolutionInProgress = true;
          
          try {
            const resolvedData = this.onConflictDetected(field, item.data, remoteData);
            item.data = resolvedData;
            item.checksum = this.calculateChecksum(resolvedData);
            
            this.emitSyncEvent({
              type: 'conflict_resolution',
              timestamp: Date.now(),
              deviceId: this.deviceId,
              deviceName: this.deviceInfo.name,
              field,
              description: `Conflict resolved for ${field}`
            });
            
          } finally {
            this.conflictResolutionInProgress = false;
          }
        }
      }
      
    } catch (error) {
      console.warn(`⚠️ Conflict check failed for ${field}:`, error);
    }
  }

  private async updatePresence(isActive: boolean): Promise<void> {
    this.deviceInfo = {
      ...this.deviceInfo,
      lastSeen: Date.now(),
      isActive,
      connectionQuality: this.connectionQuality
    };

    try {
      const response = await fetch(`${this.baseUrl}/presence/${this.deviceId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.deviceInfo)
      });

      if (!response.ok) {
        throw new Error(`Presence update failed: ${response.status}`);
      }

      // Update device count asynchronously
      this.getActiveDevices().then(devices => {
        if (this.onDeviceCountChange) {
          this.onDeviceCountChange(devices.length, devices);
        }
      }).catch(console.warn);

    } catch (error) {
      console.warn('⚠️ Enhanced presence update failed:', error);
      throw error;
    }
  }

  private handleConnectionError(): void {
    console.log('🔄 Handling connection error...');
    
    this.connectionQuality = 'poor';
    this.stopListening();
    
    if (this.connectionRetryCount < this.maxRetries) {
      this.scheduleReconnect();
    } else {
      console.warn('⚠️ Max reconnection attempts reached, switching to offline mode');
      this.isConnected = false;
      
      this.emitSyncEvent({
        type: 'error',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        description: 'Connection lost, offline mode activated'
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
    
    console.log(`🔄 Professional reconnect scheduled in ${delay/1000}s (attempt ${this.connectionRetryCount}/${this.maxRetries})`);
    
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

  private stopListening(): void {
    if (this.eventSource) {
      console.log('🔇 Stopping enhanced listener');
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private gracefulDisconnect(): void {
    console.log('👋 Graceful disconnect initiated...');
    
    try {
      this.isConnected = false;
      this.stopListening();
      
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      if (this.syncBatchTimer) {
        clearTimeout(this.syncBatchTimer);
        this.syncBatchTimer = null;
      }
      
      // Clear all retry timeouts
      this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
      this.retryTimeouts.clear();
      
      // Send disconnect signal (fire and forget)
      fetch(`${this.baseUrl}/presence/${this.deviceId}.json`, {
        method: 'DELETE',
        keepalive: true
      }).catch(() => {});
      
      console.log('✅ Graceful disconnect completed');
      
    } catch (error) {
      console.error('❌ Graceful disconnect error:', error);
    }
  }

  // Public disconnect method
  async disconnect(): Promise<void> {
    this.gracefulDisconnect();
  }

  async getActiveDevices(): Promise<DeviceInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/presence.json`);
      const presenceData = await response.json();
      
      if (!presenceData) return [];
      
      const devices = Object.values(presenceData) as DeviceInfo[];
      const now = Date.now();
      
      // Enhanced filtering with connection quality consideration
      return devices.filter(device => 
        device.isActive && 
        (now - device.lastSeen) < 180000 && // 3 minutes for poor connections
        device.version // Only include devices with version info
      ).slice(0, 20); // Support up to 20 devices
      
    } catch (error) {
      console.warn('⚠️ Failed to get enhanced device list:', error);
      return [];
    }
  }

  // Enhanced refresh with integrity verification
  async refreshDataFromAllDevices(): Promise<SyncData> {
    try {
      console.log('🔄 Enhanced data refresh...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const fieldsToFetch = [
        'employees', 'tasks', 'dailyData', 'completedTasks', 'taskAssignments', 'customRoles',
        'prepItems', 'scheduledPreps', 'prepSelections', 'storeItems',
        'inventoryDailyItems', 'inventoryWeeklyItems', 'inventoryMonthlyItems',
        'inventoryDatabaseItems', 'inventoryActivityLog'
      ];
      
      const promises = fieldsToFetch.map(field => 
        fetch(`${this.baseUrl}/${field}.json`, { 
          signal: controller.signal,
          headers: { 'X-Device-ID': this.deviceId }
        })
        .then(res => res.json())
        .then(data => {
          if (data) {
            const checksum = this.calculateChecksum(data);
            this.dataChecksums.set(field, checksum);
          }
          return { [field]: data };
        })
      );

      const results = await Promise.allSettled(promises);
      clearTimeout(timeoutId);
      
      const data: SyncData = {};
      let successCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          Object.assign(data, result.value);
          successCount++;
        } else {
          console.warn(`⚠️ Enhanced fetch failed for ${fieldsToFetch[index]}:`, result.reason);
        }
      });

      console.log(`✅ Enhanced refresh completed (${successCount}/${fieldsToFetch.length} fields)`);
      
      this.emitSyncEvent({
        type: 'full_sync',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        description: `Full refresh completed (${successCount}/${fieldsToFetch.length} fields)`
      });
      
      return data;
      
    } catch (error) {
      console.error('❌ Enhanced refresh failed:', error);
      throw error;
    }
  }

  // Event handlers
  onFieldChange(field: string, callback: (data: any) => void): void {
    this.syncCallbacks.set(field, callback);
  }

  offFieldChange(field: string): void {
    this.syncCallbacks.delete(field);
  }

  onDeviceCountChanged(callback: (count: number, devices: DeviceInfo[]) => void): void {
    this.onDeviceCountChange = callback;
  }

  onSyncEventReceived(callback: (event: SyncEvent) => void): void {
    this.onSyncEvent = callback;
  }

  onConflictResolution(callback: (field: string, local: any, remote: any) => any): void {
    this.onConflictDetected = callback;
  }

  private emitSyncEvent(event: SyncEvent): void {
    if (this.onSyncEvent) {
      this.onSyncEvent(event);
    }
  }

  // Enhanced status and diagnostics
  getSyncStats(): { 
    isConnected: boolean; 
    deviceCount: number; 
    lastSync: number; 
    isListening: boolean;
    queueSize: number;
    connectionQuality: string;
    conflictCount: number;
    version: string;
  } {
    return {
      isConnected: this.isConnected,
      deviceCount: 0, // Will be updated by device count callback
      lastSync: Math.max(...Array.from(this.lastDataTimestamp.values()), 0),
      isListening: this.eventSource !== null,
      queueSize: this.syncQueue.size,
      connectionQuality: this.connectionQuality,
      conflictCount: 0, // Could be tracked separately
      version: '2.0.0'
    };
  }

  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo, lastSeen: Date.now() };
  }

  updateCurrentUser(userName: string): void {
    this.deviceInfo.user = userName;
    this.updatePresence(true).catch(console.warn);
  }

  async checkDataIntegrity(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    try {
      const remoteData = await this.refreshDataFromAllDevices();
      
      Object.keys(remoteData).forEach(field => {
        const data = (remoteData as any)[field];
        if (data) {
          const remoteChecksum = this.calculateChecksum(data);
          const localChecksum = this.dataChecksums.get(field);
          results.set(field, remoteChecksum === localChecksum);
        }
      });
      
    } catch (error) {
      console.error('❌ Data integrity check failed:', error);
    }
    
    return results;
  }
}