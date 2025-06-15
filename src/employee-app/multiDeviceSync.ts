// multiDeviceSync.ts - Complete multi-device synchronization service with real-time updates
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
  private isListening = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private onDeviceCountChange?: (count: number, devices: DeviceInfo[]) => void;
  private onSyncEvent?: (event: SyncEvent) => void;
  private lastDataTimestamp: Map<string, number> = new Map();
  private conflictThrottleMap: Map<string, number> = new Map();
  
  // Real-time listeners for each data field
  private dataListeners: Map<string, () => void> = new Map();

  constructor(userName: string = 'Unknown User') {
    this.deviceId = this.generateDeviceId();
    this.deviceInfo = this.createDeviceInfo(userName);
    this.presenceRef = `presence/${this.deviceId}`;
    
    console.log('🔄 MultiDeviceSyncService initialized:', {
      deviceId: this.deviceId,
      deviceName: this.deviceInfo.name,
      user: this.deviceInfo.user,
      platform: this.deviceInfo.platform
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });

    // Handle visibility changes (tab switching, etc.)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updatePresence(false);
      } else {
        this.updatePresence(true);
        // Small delay to ensure we're back online
        setTimeout(() => {
          this.refreshDataFromAllDevices();
        }, 1000);
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Back online - reconnecting sync...');
      this.updatePresence(true);
      this.startListening();
    });

    window.addEventListener('offline', () => {
      console.log('📵 Gone offline - pausing sync...');
      this.updatePresence(false);
    });
  }

  private generateDeviceId(): string {
    // Try to get existing device ID from localStorage
    let deviceId = localStorage.getItem('workVibe_deviceId');
    if (!deviceId) {
      // Generate new device ID with more randomness
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 9);
      const userAgent = navigator.userAgent.substring(0, 10).replace(/\W/g, '');
      deviceId = `device_${timestamp}_${random}_${userAgent}`;
      localStorage.setItem('workVibe_deviceId', deviceId);
    }
    return deviceId;
  }

  private createDeviceInfo(userName: string): DeviceInfo {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform || 'Unknown Platform';
    
    // Enhanced device detection
    let deviceType = 'Desktop';
    let browserName = 'Unknown Browser';
    
    // Detect device type
    if (/Mobile|Android|iPhone|iPod/.test(userAgent)) {
      deviceType = 'Mobile';
    } else if (/iPad|Tablet/.test(userAgent)) {
      deviceType = 'Tablet';
    }
    
    // Detect browser
    if (userAgent.includes('Chrome')) browserName = 'Chrome';
    else if (userAgent.includes('Firefox')) browserName = 'Firefox';
    else if (userAgent.includes('Safari')) browserName = 'Safari';
    else if (userAgent.includes('Edge')) browserName = 'Edge';
    
    // Create device name with better formatting
    const deviceName = `${deviceType} • ${browserName}`;
    const browserInfo = `${browserName} on ${platform}`;
    
    return {
      id: this.deviceId,
      name: deviceName,
      lastSeen: Date.now(),
      user: userName,
      platform: deviceType.toLowerCase(),
      isActive: true,
      browserInfo: browserInfo
    };
  }

  // Connect to multi-device sync
  async connect(): Promise<void> {
    try {
      console.log('🔗 Connecting to multi-device sync...');
      
      // Update presence
      await this.updatePresence(true);
      
      // Start listening for changes
      this.startListening();
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Emit connection event
      this.emitSyncEvent({
        type: 'device_join',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        description: `${this.deviceInfo.name} connected`,
        data: { deviceInfo: this.deviceInfo }
      });
      
      console.log('✅ Multi-device sync connected');
      
    } catch (error) {
      console.error('❌ Failed to connect multi-device sync:', error);
      throw error;
    }
  }

  // Disconnect from multi-device sync
  async disconnect(): Promise<void> {
    try {
      console.log('🔌 Disconnecting multi-device sync...');
      
      // Emit disconnection event
      this.emitSyncEvent({
        type: 'device_leave',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        description: `${this.deviceInfo.name} disconnected`
      });
      
      // Stop listening
      this.stopListening();
      
      // Stop heartbeat
      this.stopHeartbeat();
      
      // Remove presence
      await this.removePresence();
      
      console.log('✅ Multi-device sync disconnected');
      
    } catch (error) {
      console.error('❌ Error disconnecting sync:', error);
    }
  }

  // Update device presence
  private async updatePresence(isActive: boolean): Promise<void> {
    this.deviceInfo = {
      ...this.deviceInfo,
      lastSeen: Date.now(),
      isActive
    };

    try {
      const response = await fetch(`${this.baseUrl}/${this.presenceRef}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.deviceInfo)
      });

      if (!response.ok) {
        throw new Error(`Failed to update presence: ${response.status}`);
      }

      // Update device count
      const devices = await this.getActiveDevices();
      if (this.onDeviceCountChange) {
        this.onDeviceCountChange(devices.length, devices);
      }

    } catch (error) {
      console.error('❌ Failed to update presence:', error);
    }
  }

  // Remove device presence
  private async removePresence(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/${this.presenceRef}.json`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('❌ Failed to remove presence:', error);
    }
  }

  // Get active devices with better filtering
  async getActiveDevices(): Promise<DeviceInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/presence.json`);
      const presenceData = await response.json();
      
      if (!presenceData) return [];
      
      const now = Date.now();
      const devices = Object.values(presenceData) as DeviceInfo[];
      
      // Filter out stale devices (inactive for more than 3 minutes)
      const activeDevices = devices.filter(device => 
        device.isActive && (now - device.lastSeen) < 180000
      );

      // Sort by last seen (most recent first)
      return activeDevices.sort((a, b) => b.lastSeen - a.lastSeen);
      
    } catch (error) {
      console.error('❌ Failed to get active devices:', error);
      return [];
    }
  }

  // Start listening for real-time changes
  private startListening(): void {
    if (this.isListening) return;
    
    this.isListening = true;
    console.log('👂 Starting real-time listeners for all data fields...');
    
    // Listen to each data field separately for better performance
    const fields = [
      'employees', 'tasks', 'dailyData', 'completedTasks', 
      'taskAssignments', 'customRoles', 'prepItems', 
      'scheduledPreps', 'prepSelections', 'storeItems'
    ];

    fields.forEach(field => {
      this.setupFieldListener(field);
    });
    
    // Also listen for presence changes
    this.setupPresenceListener();
  }

  // Setup listener for a specific data field
  private setupFieldListener(field: string): void {
    const eventSourceUrl = `${this.baseUrl}/${field}.json`;
    
    const eventSource = new EventSource(eventSourceUrl);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Skip if data is null or if it's from this device recently
        if (data === null) return;
        
        const now = Date.now();
        const lastTimestamp = this.lastDataTimestamp.get(field) || 0;
        
        // Throttle updates to prevent infinite loops
        if (now - lastTimestamp < 1000) {
          console.log(`⏱️ Throttling ${field} update to prevent loop`);
          return;
        }
        
        this.lastDataTimestamp.set(field, now);
        
        console.log(`📥 Received real-time update for ${field}`);
        
        // Apply data update
        if (this.syncCallbacks.has(field)) {
          const callback = this.syncCallbacks.get(field)!;
          
          // Handle different data types appropriately
          let processedData = data;
          if (field === 'completedTasks' && Array.isArray(data)) {
            processedData = new Set(data);
          }
          
          callback(processedData);
          
          // Emit sync event
          this.emitSyncEvent({
            type: 'data_update',
            timestamp: now,
            deviceId: 'remote',
            deviceName: 'Remote Device',
            field,
            description: `${field} updated from remote device`,
            data: processedData
          });
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${field} update:`, error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error(`❌ EventSource error for ${field}:`, error);
      // Store cleanup function
      this.dataListeners.set(field, () => eventSource.close());
      
      // Reconnect after delay if still listening
      setTimeout(() => {
        if (this.isListening) {
          console.log(`🔄 Reconnecting ${field} listener...`);
          this.setupFieldListener(field);
        }
      }, 5000);
    };
    
    // Store cleanup function
    this.dataListeners.set(field, () => eventSource.close());
  }

  // Setup presence listener for device count updates
  private setupPresenceListener(): void {
    const eventSourceUrl = `${this.baseUrl}/presence.json`;
    const eventSource = new EventSource(eventSourceUrl);
    
    eventSource.onmessage = async (event) => {
      try {
        // Update device count when presence changes
        const devices = await this.getActiveDevices();
        if (this.onDeviceCountChange) {
          this.onDeviceCountChange(devices.length, devices);
        }
      } catch (error) {
        console.error('❌ Error processing presence update:', error);
      }
    };
    
    this.dataListeners.set('presence', () => eventSource.close());
  }

  // Stop listening for changes
  private stopListening(): void {
    this.isListening = false;
    
    // Close all event sources
    this.dataListeners.forEach((cleanup, field) => {
      console.log(`🔇 Stopping listener for ${field}`);
      cleanup();
    });
    
    this.dataListeners.clear();
  }

  // Start heartbeat to maintain presence
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.updatePresence(true);
    }, 60000); // Update every minute
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Sync data field to other devices with conflict prevention
  async syncData(field: string, data: any): Promise<void> {
    try {
      // Set timestamp to prevent immediate echo
      this.lastDataTimestamp.set(field, Date.now());
      
      // Convert Set to Array for JSON serialization
      let processedData = data;
      if (data instanceof Set) {
        processedData = Array.from(data);
      }
      
      const response = await fetch(`${this.baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData)
      });

      if (!response.ok) {
        throw new Error(`Failed to sync ${field}: ${response.status}`);
      }
      
      console.log(`📤 Synced ${field} to other devices`);
      
      // Emit sync event
      this.emitSyncEvent({
        type: 'data_update',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        field,
        description: `${field} synced to all devices`,
        data: processedData
      });
      
    } catch (error) {
      console.error(`❌ Failed to sync ${field}:`, error);
      throw error;
    }
  }

  // Subscribe to field changes
  onFieldChange(field: string, callback: (data: any) => void): void {
    this.syncCallbacks.set(field, callback);
  }

  // Unsubscribe from field changes
  offFieldChange(field: string): void {
    this.syncCallbacks.delete(field);
  }

  // Set device count change callback
  onDeviceCountChanged(callback: (count: number, devices: DeviceInfo[]) => void): void {
    this.onDeviceCountChange = callback;
  }

  // Set sync event callback
  onSyncEventReceived(callback: (event: SyncEvent) => void): void {
    this.onSyncEvent = callback;
  }

  // Emit sync event
  private emitSyncEvent(event: SyncEvent): void {
    if (this.onSyncEvent) {
      this.onSyncEvent(event);
    }
  }

  // Force refresh data from all devices
  async refreshDataFromAllDevices(): Promise<SyncData> {
    try {
      console.log('🔄 Refreshing data from all devices...');
      
      const [
        employeesRes,
        tasksRes,
        dailyDataRes,
        completedTasksRes,
        taskAssignmentsRes,
        customRolesRes,
        prepItemsRes,
        scheduledPrepsRes,
        prepSelectionsRes,
        storeItemsRes
      ] = await Promise.all([
        fetch(`${this.baseUrl}/employees.json`),
        fetch(`${this.baseUrl}/tasks.json`),
        fetch(`${this.baseUrl}/dailyData.json`),
        fetch(`${this.baseUrl}/completedTasks.json`),
        fetch(`${this.baseUrl}/taskAssignments.json`),
        fetch(`${this.baseUrl}/customRoles.json`),
        fetch(`${this.baseUrl}/prepItems.json`),
        fetch(`${this.baseUrl}/scheduledPreps.json`),
        fetch(`${this.baseUrl}/prepSelections.json`),
        fetch(`${this.baseUrl}/storeItems.json`)
      ]);

      const data: SyncData = {
        employees: await employeesRes.json(),
        tasks: await tasksRes.json(),
        dailyData: await dailyDataRes.json(),
        completedTasks: await completedTasksRes.json(),
        taskAssignments: await taskAssignmentsRes.json(),
        customRoles: await customRolesRes.json(),
        prepItems: await prepItemsRes.json(),
        scheduledPreps: await scheduledPrepsRes.json(),
        prepSelections: await prepSelectionsRes.json(),
        storeItems: await storeItemsRes.json()
      };

      // Trigger callbacks for all fields that have data
      Object.entries(data).forEach(([field, fieldData]) => {
        if (this.syncCallbacks.has(field) && fieldData !== null) {
          const callback = this.syncCallbacks.get(field)!;
          
          // Handle Set conversion
          let processedData = fieldData;
          if (field === 'completedTasks' && Array.isArray(fieldData)) {
            processedData = new Set(fieldData);
          }
          
          callback(processedData);
        }
      });

      // Emit full sync event
      this.emitSyncEvent({
        type: 'full_sync',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        deviceName: this.deviceInfo.name,
        description: 'Full data refresh completed',
        data: data
      });

      console.log('✅ Data refreshed from all devices');
      return data;
      
    } catch (error) {
      console.error('❌ Failed to refresh data:', error);
      throw error;
    }
  }

  // Get current device info
  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo, lastSeen: Date.now() };
  }

  // Update current user
  updateCurrentUser(userName: string): void {
    this.deviceInfo.user = userName;
    this.updatePresence(true);
  }

  // Get sync statistics
  getSyncStats(): { 
    isConnected: boolean; 
    deviceCount: number; 
    lastSync: number; 
    isListening: boolean;
  } {
    return {
      isConnected: this.isListening,
      deviceCount: 0, // Will be updated by presence listener
      lastSync: Math.max(...Array.from(this.lastDataTimestamp.values())),
      isListening: this.isListening
    };
  }
}
