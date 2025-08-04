// ReliableSync.ts - Simple, reliable real-time sync system that actually works
import { FIREBASE_CONFIG } from './constants';

export interface SyncEvent {
  type: 'data_update' | 'device_join' | 'device_leave' | 'conflict_resolution' | 'full_sync';
  timestamp: number;
  deviceId: string;
  deviceName: string;
  data?: any;
  field?: string;
  description?: string;
}

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

export interface SyncState {
  isConnected: boolean;
  isLoading: boolean;
  lastSync: number;
  deviceCount: number;
  error: string | null;
  syncEvents: SyncEvent[];
}

export class ReliableSync {
  private baseUrl: string;
  private deviceId: string;
  private deviceInfo: DeviceInfo;
  private eventSource: EventSource | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private fieldCallbacks = new Map<string, (data: any) => void>();
  private stateCallbacks = new Set<(state: SyncState) => void>();
  private syncState: SyncState;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  constructor(userName: string) {
    this.baseUrl = FIREBASE_CONFIG.databaseURL;
    this.deviceId = this.generateDeviceId();
    this.deviceInfo = {
      id: this.deviceId,
      name: this.getDeviceName(),
      lastSeen: Date.now(),
      user: userName,
      platform: this.getDevicePlatform(),
      isActive: true,
      browserInfo: this.getBrowserInfo()
    };

    this.syncState = {
      isConnected: false,
      isLoading: false,
      lastSync: 0,
      deviceCount: 1,
      error: null,
      syncEvents: []
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });

    console.log('🔄 ReliableSync initialized:', {
      deviceId: this.deviceId.substring(0, 8) + '...',
      user: userName
    });
  }

  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('reliableSync_deviceId');
    if (!deviceId) {
      deviceId = `device_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
      localStorage.setItem('reliableSync_deviceId', deviceId);
    }
    return deviceId;
  }

  private getDeviceName(): string {
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPod/.test(userAgent)) return 'Mobile Device';
    if (/iPad|Tablet/.test(userAgent)) return 'Tablet';
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    return 'Desktop Browser';
  }

  private getDevicePlatform(): string {
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPod/.test(userAgent)) return 'mobile';
    if (/iPad|Tablet/.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  private getBrowserInfo(): string {
    const userAgent = navigator.userAgent;
    let browserName = 'Browser';
    
    if (userAgent.includes('Chrome')) browserName = 'Chrome';
    else if (userAgent.includes('Firefox')) browserName = 'Firefox';
    else if (userAgent.includes('Safari')) browserName = 'Safari';
    else if (userAgent.includes('Edge')) browserName = 'Edge';
    
    return `${browserName} on ${navigator.platform || 'Unknown'}`;
  }

  async connect(): Promise<void> {
    console.log('🔗 Connecting ReliableSync...');
    
    try {
      this.updateSyncState({ isLoading: true, error: null });
      
      // Register device presence
      await this.updatePresence(true);
      
      // Start listening for real-time updates
      this.startListening();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      this.updateSyncState({ 
        isConnected: true, 
        isLoading: false,
        lastSync: Date.now()
      });
      
      this.emitSyncEvent({
        type: 'device_join',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        description: `${this.deviceInfo.name} connected`
      });
      
      console.log('✅ ReliableSync connected');
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.updateSyncState({ 
        isConnected: false, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      });
      this.scheduleReconnect();
    }
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting ReliableSync...');
    
    this.isConnected = false;
    this.stopListening();
    this.stopHeartbeat();
    
    try {
      await this.updatePresence(false);
    } catch (error) {
      console.warn('Failed to update presence on disconnect:', error);
    }
    
    this.updateSyncState({ isConnected: false });
  }

  private startListening(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    console.log('👂 Starting real-time listener...');
    
    // Listen to the root for all data changes
    this.eventSource = new EventSource(`${this.baseUrl}/.json`);
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data === null) return;
        
        console.log('📥 Received real-time update');
        this.processDataUpdate(data);
        
        this.updateSyncState({ lastSync: Date.now() });
      } catch (error) {
        console.warn('⚠️ Error processing real-time update:', error);
      }
    };
    
    this.eventSource.onerror = (error) => {
      console.warn('⚠️ EventSource error:', error);
      this.handleConnectionError();
    };
    
    this.eventSource.onopen = () => {
      console.log('🔗 EventSource connected');
      if (!this.isConnected) {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.updateSyncState({ 
          isConnected: true, 
          error: null,
          lastSync: Date.now()
        });
      }
    };
  }

  private stopListening(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private processDataUpdate(data: any): void {
    // Process updates for all relevant fields
    const fields = [
      'employees', 'tasks', 'dailyData', 'completedTasks', 
      'taskAssignments', 'customRoles', 'prepItems', 
      'scheduledPreps', 'prepSelections', 'storeItems',
      'inventoryDailyItems', 'inventoryWeeklyItems', 
      'inventoryMonthlyItems', 'inventoryDatabaseItems', 
      'inventoryActivityLog'
    ];
    
    for (const field of fields) {
      if (data[field] && this.fieldCallbacks.has(field)) {
        const callback = this.fieldCallbacks.get(field)!;
        
        let processedData = data[field];
        
        // Special handling for completedTasks - convert array to Set
        if (field === 'completedTasks' && Array.isArray(processedData)) {
          processedData = new Set(processedData);
        }
        
        // Call the callback to update the UI
        callback(processedData);
        
        this.emitSyncEvent({
          type: 'data_update',
          timestamp: Date.now(),
          deviceId: 'remote',
          deviceName: 'Remote Device',
          field,
          description: `${field} updated from remote device`
        });
      }
    }
  }

  private handleConnectionError(): void {
    this.stopListening();
    this.isConnected = false;
    
    this.updateSyncState({ 
      isConnected: false,
      error: 'Connection lost'
    });
    
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('⚠️ Max reconnection attempts reached');
      this.updateSyncState({ 
        error: 'Unable to connect - please refresh the page'
      });
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.startListening();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.updatePresence(true).catch(() => {
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
    this.deviceInfo.lastSeen = Date.now();
    this.deviceInfo.isActive = isActive;
    
    const response = await fetch(`${this.baseUrl}/presence/${this.deviceId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.deviceInfo)
    });
    
    if (!response.ok) {
      throw new Error(`Presence update failed: ${response.status}`);
    }
  }

  // Public API for syncing data
  async syncData(field: string, data: any): Promise<void> {
    try {
      // Convert Set to Array for Firebase
      let processedData = data instanceof Set ? Array.from(data) : data;
      
      const response = await fetch(`${this.baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData)
      });
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }
      
      console.log(`✅ Synced ${field} successfully`);
      
      this.updateSyncState({ lastSync: Date.now() });
      
      this.emitSyncEvent({
        type: 'data_update',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        field,
        description: `${field} synced to remote`
      });
      
    } catch (error) {
      console.error(`❌ Failed to sync ${field}:`, error);
      this.updateSyncState({ 
        error: `Failed to sync ${field}`
      });
      throw error;
    }
  }

  // Subscribe to field changes
  onFieldChange(field: string, callback: (data: any) => void): void {
    this.fieldCallbacks.set(field, callback);
  }

  // Subscribe to sync state changes
  onSyncStateChange(callback: (state: SyncState) => void): void {
    this.stateCallbacks.add(callback);
  }

  // Unsubscribe from field changes
  offFieldChange(field: string): void {
    this.fieldCallbacks.delete(field);
  }

  // Unsubscribe from sync state changes
  offSyncStateChange(callback: (state: SyncState) => void): void {
    this.stateCallbacks.delete(callback);
  }

  // Get current sync state
  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  // Get device info
  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo };
  }

  // Get active devices
  async getActiveDevices(): Promise<DeviceInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/presence.json`);
      const presenceData = await response.json();
      
      if (!presenceData) return [];
      
      const now = Date.now();
      const devices = Object.values(presenceData) as DeviceInfo[];
      
      // Filter active devices (last seen within 5 minutes)
      return devices.filter(device => 
        device.isActive && (now - device.lastSeen) < 300000
      );
    } catch (error) {
      console.warn('Failed to get active devices:', error);
      return [];
    }
  }

  // Force refresh all data from remote
  async refreshAllData(): Promise<any> {
    try {
      console.log('🔄 Refreshing all data from remote...');
      
      const fields = [
        'employees', 'tasks', 'dailyData', 'completedTasks',
        'taskAssignments', 'customRoles', 'prepItems',
        'scheduledPreps', 'prepSelections', 'storeItems',
        'inventoryDailyItems', 'inventoryWeeklyItems',
        'inventoryMonthlyItems', 'inventoryDatabaseItems',
        'inventoryActivityLog'
      ];
      
      const promises = fields.map(field =>
        fetch(`${this.baseUrl}/${field}.json`)
          .then(res => res.json())
          .then(data => ({ [field]: data }))
      );
      
      const results = await Promise.allSettled(promises);
      const data: any = {};
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          Object.assign(data, result.value);
        } else {
          console.warn(`Failed to fetch ${fields[index]}:`, result.reason);
        }
      });
      
      console.log('✅ Data refresh completed');
      this.updateSyncState({ lastSync: Date.now() });
      
      return data;
    } catch (error) {
      console.error('❌ Data refresh failed:', error);
      throw error;
    }
  }

  private updateSyncState(updates: Partial<SyncState>): void {
    this.syncState = { ...this.syncState, ...updates };
    
    // Notify all listeners
    this.stateCallbacks.forEach(callback => {
      try {
        callback(this.syncState);
      } catch (error) {
        console.warn('Error in sync state callback:', error);
      }
    });
  }

  private emitSyncEvent(event: SyncEvent): void {
    // Add to events history
    this.syncState.syncEvents.unshift(event);
    
    // Keep only last 10 events
    if (this.syncState.syncEvents.length > 10) {
      this.syncState.syncEvents = this.syncState.syncEvents.slice(0, 10);
    }
    
    // Update sync state
    this.updateSyncState({ syncEvents: this.syncState.syncEvents });
  }
}