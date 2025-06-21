// multiDeviceSync.ts - Optimized for performance and reliability with full prep/store support
import { FIREBASE_CONFIG } from './constants';
import type { Employee, Task, DailyDataMap, TaskAssignments, PrepItem, ScheduledPrep, PrepSelections, StoreItem } from './types';

export interface DeviceInfo {
  id: string;
  name: string;
  lastSeen: number;
  user: string;
  platform: string;
  isActive: boolean;
  browserInfo: string;
  ipAddress?: string;
}

export interface SyncEvent {
  type: 'data_update' | 'device_join' | 'device_leave' | 'conflict_resolution' | 'full_sync';
  timestamp: number;
  deviceId: string;
  deviceName: string;
  data?: any;
  field?: string;
  description?: string;
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
}

export class MultiDeviceSyncService {
  private baseUrl = FIREBASE_CONFIG.databaseURL;
  private deviceId: string;
  private deviceInfo: DeviceInfo;
  private presenceRef: string;
  private syncCallbacks: Map<string, (data: any) => void> = new Map();
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private onDeviceCountChange?: (count: number, devices: DeviceInfo[]) => void;
  private onSyncEvent?: (event: SyncEvent) => void;
  private lastDataTimestamp: Map<string, number> = new Map();
  
  // PERFORMANCE: Single EventSource for all data instead of multiple
  private eventSource: EventSource | null = null;
  private connectionRetryCount = 0;
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;
  
  // PERFORMANCE: Throttle sync operations
  private syncQueue: Map<string, any> = new Map();
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor(userName: string = 'Unknown User') {
    this.deviceId = this.generateDeviceId();
    this.deviceInfo = this.createDeviceInfo(userName);
    this.presenceRef = `presence/${this.deviceId}`;
    
    console.log('🔄 Sync service initialized:', {
      deviceId: this.deviceId.substring(0, 8) + '...',
      user: userName
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });

    // Handle visibility changes efficiently
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updatePresence(false);
      } else {
        this.updatePresence(true);
      }
    });
  }

  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('workVibe_deviceId');
    if (!deviceId) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 6); // Shorter for performance
      deviceId = `device_${timestamp}_${random}`;
      localStorage.setItem('workVibe_deviceId', deviceId);
    }
    return deviceId;
  }

  private createDeviceInfo(userName: string): DeviceInfo {
    const userAgent = navigator.userAgent;
    
    // Simplified device detection for performance
    let deviceType = 'Desktop';
    let browserName = 'Browser';
    
    if (/Mobile|Android|iPhone|iPod/.test(userAgent)) {
      deviceType = 'Mobile';
    } else if (/iPad|Tablet/.test(userAgent)) {
      deviceType = 'Tablet';
    }
    
    if (userAgent.includes('Chrome')) browserName = 'Chrome';
    else if (userAgent.includes('Firefox')) browserName = 'Firefox';
    else if (userAgent.includes('Safari')) browserName = 'Safari';
    
    return {
      id: this.deviceId,
      name: `${deviceType} • ${browserName}`,
      lastSeen: Date.now(),
      user: userName,
      platform: deviceType.toLowerCase(),
      isActive: true,
      browserInfo: `${browserName} on ${navigator.platform || 'Unknown'}`
    };
  }

  // PERFORMANCE: Fast, non-blocking connect
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('✅ Already connected');
      return;
    }

    try {
      console.log('🔗 Connecting sync service...');
      
      // Update presence (fire and forget)
      this.updatePresence(true).catch(console.warn);
      
      // Start listening (non-blocking)
      this.startListening();
      
      // Start heartbeat (lightweight)
      this.startHeartbeat();
      
      this.isConnected = true;
      this.connectionRetryCount = 0;
      
      // Emit connection event (non-blocking)
      this.emitSyncEvent({
        type: 'device_join',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        description: `${this.deviceInfo.name} connected`
      });
      
      console.log('✅ Sync service connected');
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  // PERFORMANCE: Fast disconnect
  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      console.log('🔌 Disconnecting...');
      
      this.isConnected = false;
      this.stopListening();
      this.stopHeartbeat();
      
      // Clean up timers
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
      
      if (this.syncTimer) {
        clearTimeout(this.syncTimer);
        this.syncTimer = null;
      }
      
      // Remove presence (fire and forget)
      this.removePresence().catch(console.warn);
      
      console.log('✅ Disconnected');
      
    } catch (error) {
      console.error('❌ Disconnect error:', error);
    }
  }

  // PERFORMANCE: Non-blocking presence update
  private async updatePresence(isActive: boolean): Promise<void> {
    this.deviceInfo = {
      ...this.deviceInfo,
      lastSeen: Date.now(),
      isActive
    };

    try {
      // Fire and forget - don't wait for response
      fetch(`${this.baseUrl}/${this.presenceRef}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.deviceInfo)
      }).then(response => {
        if (response.ok) {
          // Update device count asynchronously
          this.getActiveDevices().then(devices => {
            if (this.onDeviceCountChange) {
              this.onDeviceCountChange(devices.length, devices);
            }
          }).catch(console.warn);
        }
      }).catch(console.warn);

    } catch (error) {
      console.warn('⚠️ Presence update failed:', error);
    }
  }

  private async removePresence(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/${this.presenceRef}.json`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.warn('⚠️ Failed to remove presence:', error);
    }
  }

  // PERFORMANCE: Cached device list with filtering
  private deviceCache: { devices: DeviceInfo[], timestamp: number } | null = null;
  private readonly DEVICE_CACHE_TTL = 30000; // 30 seconds

  async getActiveDevices(): Promise<DeviceInfo[]> {
    try {
      // Use cache if available and fresh
      const now = Date.now();
      if (this.deviceCache && (now - this.deviceCache.timestamp) < this.DEVICE_CACHE_TTL) {
        return this.deviceCache.devices;
      }

      const response = await fetch(`${this.baseUrl}/presence.json`);
      const presenceData = await response.json();
      
      if (!presenceData) {
        this.deviceCache = { devices: [], timestamp: now };
        return [];
      }
      
      const devices = Object.values(presenceData) as DeviceInfo[];
      
      // Filter stale devices (inactive for more than 5 minutes)
      const activeDevices = devices.filter(device => 
        device.isActive && (now - device.lastSeen) < 300000
      ).slice(0, 10); // Limit to 10 devices for performance

      // Cache the result
      this.deviceCache = { devices: activeDevices, timestamp: now };
      
      return activeDevices;
      
    } catch (error) {
      console.warn('⚠️ Failed to get devices:', error);
      return [];
    }
  }

  // PERFORMANCE: Single EventSource instead of multiple
  private startListening(): void {
    if (this.eventSource) {
      console.log('👂 Already listening');
      return;
    }
    
    console.log('👂 Starting single EventSource listener...');
    
    // Listen to root path for all changes
    const eventSourceUrl = `${this.baseUrl}/.json`;
    this.eventSource = new EventSource(eventSourceUrl);
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data === null) return;
        
        console.log('📥 Received data update');
        
        // Process the data and trigger callbacks
        this.processDataUpdate(data);
        
      } catch (error) {
        console.warn('⚠️ Error processing data update:', error);
      }
    };
    
    this.eventSource.onerror = (error) => {
      console.warn('⚠️ EventSource error:', error);
      this.handleConnectionError();
    };
  }

  // FIXED: Process data updates for ALL fields including prep and store data
  private processDataUpdate(data: any): void {
    // FIXED: Include all relevant fields including prep and store data
    const relevantFields = [
      'employees', 
      'tasks', 
      'dailyData', 
      'completedTasks', 
      'taskAssignments', 
      'customRoles',
      'prepItems',
      'scheduledPreps',
      'prepSelections',
      'storeItems'
    ];
    
    for (const field of relevantFields) {
      if (data[field] && this.syncCallbacks.has(field)) {
        const callback = this.syncCallbacks.get(field)!;
        
        // Throttle updates to prevent spam
        const now = Date.now();
        const lastUpdate = this.lastDataTimestamp.get(field) || 0;
        
        if (now - lastUpdate > 2000) { // Only update every 2 seconds
          this.lastDataTimestamp.set(field, now);
          
          let processedData = data[field];
          if (field === 'completedTasks' && Array.isArray(processedData)) {
            processedData = new Set(processedData);
          }
          
          callback(processedData);
          
          // Emit sync event
          this.emitSyncEvent({
            type: 'data_update',
            timestamp: now,
            deviceId: 'remote',
            deviceName: 'Remote Device',
            field,
            description: `${field} updated`
          });
        }
      }
    }
  }

  private stopListening(): void {
    if (this.eventSource) {
      console.log('🔇 Stopping listener');
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private handleConnectionError(): void {
    this.stopListening();
    
    if (this.connectionRetryCount < this.maxRetries) {
      this.scheduleReconnect();
    } else {
      console.warn('⚠️ Max reconnection attempts reached');
      this.isConnected = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.retryTimeout) return;
    
    this.connectionRetryCount++;
    const delay = Math.min(1000 * Math.pow(2, this.connectionRetryCount), 30000); // Exponential backoff, max 30s
    
    console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${this.connectionRetryCount})`);
    
    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      if (!this.isConnected) {
        this.startListening();
      }
    }, delay);
  }

  // PERFORMANCE: Batched sync operations
  async syncData(field: string, data: any): Promise<void> {
    // Add to sync queue instead of immediate sync
    this.syncQueue.set(field, data);
    
    // Debounce sync operations
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    
    this.syncTimer = setTimeout(() => {
      this.processSyncQueue();
    }, 1000); // Batch syncs after 1 second
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.size === 0) return;
    
    this.isSyncing = true;
    const queue = new Map(this.syncQueue);
    this.syncQueue.clear();
    
    try {
      console.log('📤 Processing sync queue:', Array.from(queue.keys()));
      
      // Process all queued syncs in parallel
      const syncPromises = Array.from(queue.entries()).map(async ([field, data]) => {
        try {
          let processedData = data instanceof Set ? Array.from(data) : data;
          
          const response = await fetch(`${this.baseUrl}/${field}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(processedData)
          });

          if (!response.ok) {
            throw new Error(`Sync failed for ${field}: ${response.status}`);
          }
          
          console.log(`✅ Synced ${field}`);
          
          // Emit sync event
          this.emitSyncEvent({
            type: 'data_update',
            timestamp: Date.now(),
            deviceId: this.deviceId,
            deviceName: this.deviceInfo.name,
            field,
            description: `${field} synced`
          });
          
        } catch (error) {
          console.warn(`⚠️ Failed to sync ${field}:`, error);
          // Re-queue failed syncs for retry
          this.syncQueue.set(field, data);
        }
      });

      await Promise.allSettled(syncPromises);
      
    } catch (error) {
      console.error('❌ Sync queue processing failed:', error);
    } finally {
      this.isSyncing = false;
      
      // Process any new items that were queued during sync
      if (this.syncQueue.size > 0) {
        setTimeout(() => this.processSyncQueue(), 2000);
      }
    }
  }

  // Lightweight heartbeat
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.updatePresence(true).catch(console.warn);
      }
    }, 90000); // Every 90 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Subscribe to field changes
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

  private emitSyncEvent(event: SyncEvent): void {
    if (this.onSyncEvent) {
      this.onSyncEvent(event);
    }
  }

  // PERFORMANCE: Fast refresh with timeout - FIXED to include prep and store data
  async refreshDataFromAllDevices(): Promise<SyncData> {
    try {
      console.log('🔄 Fast refresh...');
      
      // FIXED: Fetch all essential data including prep and store fields
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const fieldsToFetch = [
        'employees', 
        'tasks', 
        'dailyData', 
        'completedTasks', 
        'taskAssignments',
        'prepItems',
        'scheduledPreps',
        'prepSelections',
        'storeItems'
      ];
      
      const promises = fieldsToFetch.map(field => 
        fetch(`${this.baseUrl}/${field}.json`, { 
          signal: controller.signal 
        }).then(res => res.json()).then(data => ({ [field]: data }))
      );

      const results = await Promise.allSettled(promises);
      clearTimeout(timeoutId);
      
      const data: SyncData = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          Object.assign(data, result.value);
        } else {
          console.warn(`⚠️ Failed to fetch ${fieldsToFetch[index]}:`, result.reason);
        }
      });

      console.log('✅ Fast refresh completed');
      return data;
      
    } catch (error) {
      console.error('❌ Fast refresh failed:', error);
      throw error;
    }
  }

  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo, lastSeen: Date.now() };
  }

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
  } {
    return {
      isConnected: this.isConnected,
      deviceCount: this.deviceCache?.devices.length || 0,
      lastSync: Math.max(...Array.from(this.lastDataTimestamp.values()), 0),
      isListening: this.eventSource !== null,
      queueSize: this.syncQueue.size
    };
  }
}
