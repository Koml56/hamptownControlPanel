// RealTimeSync.ts - New multi-device sync system without Firebase dependency
// Uses BroadcastChannel + localStorage for real-time cross-tab synchronization

interface SyncMessage {
  type: 'data_update' | 'device_join' | 'device_leave' | 'conflict_resolution';
  timestamp: number;
  deviceId: string;
  dataType: string;
  data: any;
  operation: 'create' | 'update' | 'delete' | 'merge';
  version: number;
}

interface DeviceInfo {
  id: string;
  name: string;
  lastSeen: number;
  isActive: boolean;
}

interface ConflictResolutionStrategy {
  // Strategy for resolving conflicts without data loss
  merge: (localData: any, remoteData: any) => any;
  priority: 'local' | 'remote' | 'timestamp' | 'merge';
}

export class RealTimeSync {
  private deviceId: string;
  private broadcastChannel: BroadcastChannel;
  private storageKey: string;
  private dataCallbacks: Map<string, (data: any) => void> = new Map();
  private devices: Map<string, DeviceInfo> = new Map();
  private dataVersions: Map<string, number> = new Map();
  private conflictStrategies: Map<string, ConflictResolutionStrategy> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastUpdateTimes: Map<string, number> = new Map();
  
  // Debouncing to prevent rapid updates
  private updateTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_DELAY = 300; // ms
  
  constructor(channelName = 'hamptown-sync') {
    this.deviceId = this.generateDeviceId();
    this.broadcastChannel = new BroadcastChannel(channelName);
    this.storageKey = `${channelName}_data`;
    
    this.initializeSync();
    this.setupConflictStrategies();
    this.startHeartbeat();
    
    console.log(`🔄 [RealTimeSync] Initialized for device: ${this.deviceId}`);
  }
  
  private generateDeviceId(): string {
    // Create unique device ID using sessionStorage for tab-specific identification
    let deviceId = sessionStorage.getItem('hamptown_device_id');
    if (!deviceId) {
      deviceId = 'DEV_' + Math.random().toString(36).substr(2, 8).toUpperCase() + '_' + Date.now();
      sessionStorage.setItem('hamptown_device_id', deviceId);
    }
    return deviceId;
  }
  
  private initializeSync(): void {
    // Listen for broadcast messages from other tabs/devices
    this.broadcastChannel.onmessage = (event) => {
      this.handleIncomingMessage(event.data);
    };
    
    // Listen for storage changes (fallback for cross-origin scenarios)
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith(this.storageKey)) {
        this.handleStorageChange(event);
      }
    });
    
    // Register this device
    this.registerDevice();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.unregisterDevice();
    });
  }
  
  private setupConflictStrategies(): void {
    // Set up conflict resolution strategies for different data types
    
    // Cleaning tasks - merge completed tasks without overriding
    this.conflictStrategies.set('completedTasks', {
      merge: (local: number[], remote: number[]) => {
        const localSet = new Set(local || []);
        const remoteSet = new Set(remote || []);
        return Array.from(new Set([...localSet, ...remoteSet]));
      },
      priority: 'merge'
    });
    
    // Task assignments - use timestamp priority
    this.conflictStrategies.set('taskAssignments', {
      merge: (local: any, remote: any) => {
        if (!local) return remote;
        if (!remote) return local;
        
        const merged = { ...local };
        Object.keys(remote).forEach(key => {
          if (!merged[key] || remote[key].timestamp > merged[key].timestamp) {
            merged[key] = remote[key];
          }
        });
        return merged;
      },
      priority: 'merge'
    });
    
    // Prep selections - merge without conflicts
    this.conflictStrategies.set('prepSelections', {
      merge: (local: any, remote: any) => {
        if (!local) return remote;
        if (!remote) return local;
        
        const merged = { ...local };
        Object.keys(remote).forEach(key => {
          if (!merged[key] || remote[key].timestamp > (merged[key].timestamp || 0)) {
            merged[key] = remote[key];
          }
        });
        return merged;
      },
      priority: 'merge'
    });
    
    // Scheduled preps - merge by ID with timestamp priority
    this.conflictStrategies.set('scheduledPreps', {
      merge: (local: any[], remote: any[]) => {
        if (!local) return remote || [];
        if (!remote) return local || [];
        
        const mergedMap = new Map();
        
        // Add local items
        local.forEach(item => {
          mergedMap.set(item.id, { ...item, timestamp: item.timestamp || 0 });
        });
        
        // Merge remote items
        remote.forEach(item => {
          const existing = mergedMap.get(item.id);
          if (!existing || (item.timestamp || 0) > existing.timestamp) {
            mergedMap.set(item.id, item);
          }
        });
        
        return Array.from(mergedMap.values());
      },
      priority: 'merge'
    });
    
    // Prep items - merge by ID
    this.conflictStrategies.set('prepItems', {
      merge: (local: any[], remote: any[]) => {
        if (!local) return remote || [];
        if (!remote) return local || [];
        
        const mergedMap = new Map();
        
        // Add all items from both sources
        [...local, ...remote].forEach(item => {
          mergedMap.set(item.id, item);
        });
        
        return Array.from(mergedMap.values());
      },
      priority: 'merge'
    });
    
    // Default strategy for other data types
    this.conflictStrategies.set('default', {
      merge: (local: any, remote: any) => {
        // Simple timestamp-based merge
        if (!local) return remote;
        if (!remote) return local;
        
        const localTime = local.timestamp || 0;
        const remoteTime = remote.timestamp || 0;
        
        return remoteTime > localTime ? remote : local;
      },
      priority: 'timestamp'
    });
  }
  
  private registerDevice(): void {
    const deviceInfo: DeviceInfo = {
      id: this.deviceId,
      name: this.getDeviceName(),
      lastSeen: Date.now(),
      isActive: true
    };
    
    this.devices.set(this.deviceId, deviceInfo);
    this.saveDevicesState();
    
    // Broadcast device join
    this.broadcastMessage({
      type: 'device_join',
      timestamp: Date.now(),
      deviceId: this.deviceId,
      dataType: 'device_info',
      data: deviceInfo,
      operation: 'create',
      version: 1
    });
  }
  
  private unregisterDevice(): void {
    this.devices.delete(this.deviceId);
    this.saveDevicesState();
    
    // Broadcast device leave
    this.broadcastMessage({
      type: 'device_leave',
      timestamp: Date.now(),
      deviceId: this.deviceId,
      dataType: 'device_info',
      data: null,
      operation: 'delete',
      version: 1
    });
  }
  
  private getDeviceName(): string {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    if (userAgent.includes('Chrome')) return `Chrome on ${platform}`;
    if (userAgent.includes('Firefox')) return `Firefox on ${platform}`;
    if (userAgent.includes('Safari')) return `Safari on ${platform}`;
    if (userAgent.includes('Edge')) return `Edge on ${platform}`;
    
    return `Browser on ${platform}`;
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      // Update last seen time
      const device = this.devices.get(this.deviceId);
      if (device) {
        device.lastSeen = Date.now();
        this.devices.set(this.deviceId, device);
        this.saveDevicesState();
      }
      
      // Clean up inactive devices (older than 30 seconds)
      const now = Date.now();
      const staleDevices = Array.from(this.devices.entries())
        .filter(([id, device]) => id !== this.deviceId && now - device.lastSeen > 30000);
      
      staleDevices.forEach(([id]) => {
        this.devices.delete(id);
      });
      
      if (staleDevices.length > 0) {
        this.saveDevicesState();
      }
    }, 5000);
  }
  
  private saveDevicesState(): void {
    const devicesData = Array.from(this.devices.entries());
    localStorage.setItem(`${this.storageKey}_devices`, JSON.stringify(devicesData));
  }
  
  private loadDevicesState(): void {
    try {
      const stored = localStorage.getItem(`${this.storageKey}_devices`);
      if (stored) {
        const devicesData = JSON.parse(stored);
        this.devices = new Map(devicesData);
      }
    } catch (error) {
      console.warn('Failed to load devices state:', error);
    }
  }
  
  // Public API methods
  
  /**
   * Subscribe to data changes for a specific data type
   */
  subscribe(dataType: string, callback: (data: any) => void): void {
    this.dataCallbacks.set(dataType, callback);
    
    // Load existing data from localStorage
    this.loadData(dataType).then(data => {
      if (data !== null) {
        callback(data);
      }
    });
    
    console.log(`📡 [RealTimeSync] Subscribed to ${dataType}`);
  }
  
  /**
   * Unsubscribe from data changes
   */
  unsubscribe(dataType: string): void {
    this.dataCallbacks.delete(dataType);
    console.log(`📡 [RealTimeSync] Unsubscribed from ${dataType}`);
  }
  
  /**
   * Update data with real-time sync
   */
  updateData(dataType: string, data: any, operation: 'create' | 'update' | 'delete' = 'update'): void {
    // Add timestamp to data
    const timestampedData = {
      ...data,
      timestamp: Date.now(),
      deviceId: this.deviceId
    };
    
    // Clear existing debounce timeout
    if (this.updateTimeouts.has(dataType)) {
      clearTimeout(this.updateTimeouts.get(dataType)!);
    }
    
    // Debounce updates to prevent spam
    const timeout = setTimeout(() => {
      this.performUpdate(dataType, timestampedData, operation);
      this.updateTimeouts.delete(dataType);
    }, this.DEBOUNCE_DELAY);
    
    this.updateTimeouts.set(dataType, timeout);
  }
  
  private performUpdate(dataType: string, data: any, operation: 'create' | 'update' | 'delete'): void {
    const version = (this.dataVersions.get(dataType) || 0) + 1;
    this.dataVersions.set(dataType, version);
    
    // Save to localStorage
    this.saveData(dataType, data);
    
    // Broadcast to other devices
    this.broadcastMessage({
      type: 'data_update',
      timestamp: Date.now(),
      deviceId: this.deviceId,
      dataType,
      data,
      operation,
      version
    });
    
    console.log(`🔄 [RealTimeSync] ${operation} ${dataType} (v${version})`);
  }
  
  /**
   * Get current connected devices count
   */
  getConnectedDevicesCount(): number {
    return this.devices.size;
  }
  
  /**
   * Get list of connected devices
   */
  getConnectedDevices(): DeviceInfo[] {
    return Array.from(this.devices.values());
  }
  
  private async saveData(dataType: string, data: any): Promise<void> {
    try {
      const key = `${this.storageKey}_${dataType}`;
      localStorage.setItem(key, JSON.stringify(data));
      this.lastUpdateTimes.set(dataType, Date.now());
    } catch (error) {
      console.error(`Failed to save ${dataType}:`, error);
    }
  }
  
  private async loadData(dataType: string): Promise<any> {
    try {
      const key = `${this.storageKey}_${dataType}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error(`Failed to load ${dataType}:`, error);
      return null;
    }
  }
  
  private broadcastMessage(message: SyncMessage): void {
    try {
      this.broadcastChannel.postMessage(message);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }
  
  private handleIncomingMessage(message: SyncMessage): void {
    // Ignore messages from ourselves
    if (message.deviceId === this.deviceId) {
      return;
    }
    
    console.log(`📥 [RealTimeSync] Received ${message.type} for ${message.dataType} from ${message.deviceId}`);
    
    switch (message.type) {
      case 'data_update':
        this.handleDataUpdate(message);
        break;
        
      case 'device_join':
        this.handleDeviceJoin(message);
        break;
        
      case 'device_leave':
        this.handleDeviceLeave(message);
        break;
        
      case 'conflict_resolution':
        this.handleConflictResolution(message);
        break;
    }
  }
  
  private async handleDataUpdate(message: SyncMessage): Promise<void> {
    const { dataType, data: remoteData, operation, version } = message;
    
    // Check if we have a more recent version
    const localVersion = this.dataVersions.get(dataType) || 0;
    if (version <= localVersion) {
      console.log(`🔄 [RealTimeSync] Ignoring older version ${version} vs ${localVersion} for ${dataType}`);
      return;
    }
    
    // Load current local data
    const localData = await this.loadData(dataType);
    
    // Apply conflict resolution
    const strategy = this.conflictStrategies.get(dataType) || this.conflictStrategies.get('default')!;
    const mergedData = strategy.merge(localData, remoteData);
    
    // Save merged data
    await this.saveData(dataType, mergedData);
    this.dataVersions.set(dataType, version);
    
    // Notify subscribers
    const callback = this.dataCallbacks.get(dataType);
    if (callback) {
      callback(mergedData);
    }
    
    console.log(`✅ [RealTimeSync] Applied ${operation} for ${dataType} (v${version})`);
  }
  
  private handleDeviceJoin(message: SyncMessage): void {
    const deviceInfo = message.data as DeviceInfo;
    this.devices.set(message.deviceId, deviceInfo);
    this.saveDevicesState();
    
    console.log(`👋 [RealTimeSync] Device joined: ${deviceInfo.name}`);
  }
  
  private handleDeviceLeave(message: SyncMessage): void {
    this.devices.delete(message.deviceId);
    this.saveDevicesState();
    
    console.log(`👋 [RealTimeSync] Device left: ${message.deviceId}`);
  }
  
  private handleConflictResolution(message: SyncMessage): void {
    // Handle conflict resolution messages
    console.log(`🔀 [RealTimeSync] Conflict resolution for ${message.dataType}`);
  }
  
  private handleStorageChange(event: StorageEvent): void {
    // Fallback handling for storage events (when BroadcastChannel isn't available)
    if (!event.newValue) return;
    
    try {
      const key = event.key!;
      const dataType = key.replace(`${this.storageKey}_`, '');
      
      if (dataType === 'devices') {
        this.loadDevicesState();
        return;
      }
      
      const callback = this.dataCallbacks.get(dataType);
      if (callback) {
        const data = JSON.parse(event.newValue);
        callback(data);
      }
    } catch (error) {
      console.error('Failed to handle storage change:', error);
    }
  }
  
  /**
   * Force sync with all connected devices
   */
  forceSyncAll(): void {
    // Request full sync from all devices
    this.dataCallbacks.forEach((_, dataType) => {
      this.broadcastMessage({
        type: 'data_update',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        dataType,
        data: null,
        operation: 'create',
        version: 0
      });
    });
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Clear all timeouts
    this.updateTimeouts.forEach(timeout => clearTimeout(timeout));
    this.updateTimeouts.clear();
    
    this.unregisterDevice();
    this.broadcastChannel.close();
    
    console.log(`🔄 [RealTimeSync] Destroyed for device: ${this.deviceId}`);
  }
}

// Export singleton instance
export const realTimeSync = new RealTimeSync();