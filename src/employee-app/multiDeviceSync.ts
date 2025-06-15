// multiDeviceSync.ts - Fixed multi-device synchronization service
import { FIREBASE_CONFIG } from './constants';
import type { Employee, Task, DailyDataMap, TaskAssignments, PrepItem, ScheduledPrep, PrepSelections, StoreItem } from './types';

export interface DeviceInfo {
  id: string;
  name: string;
  lastSeen: number;
  user: string;
  platform: string;
  isActive: boolean;
}

export interface SyncEvent {
  type: 'data_update' | 'device_join' | 'device_leave' | 'conflict_resolution';
  timestamp: number;
  deviceId: string;
  data?: any;
  field?: string;
}

export class MultiDeviceSyncService {
  private baseUrl = FIREBASE_CONFIG.databaseURL;
  private deviceId: string;
  private deviceName: string;
  private currentUser: string;
  private presenceRef: string;
  private syncCallbacks: Map<string, (data: any) => void> = new Map();
  private conflictResolvers: Map<string, (local: any, remote: any) => any> = new Map();
  private isListening = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private presenceInterval: NodeJS.Timeout | null = null;
  private onDeviceCountChange?: (count: number) => void;
  private onSyncEvent?: (event: SyncEvent) => void;
  private isConnected = false;

  constructor(userName: string = 'Unknown User') {
    this.deviceId = this.generateDeviceId();
    this.deviceName = this.getDeviceName();
    this.currentUser = userName;
    this.presenceRef = `presence/${this.deviceId}`;
    
    console.log('🔄 MultiDeviceSyncService initialized:', {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      user: this.currentUser
    });

    // Setup conflict resolvers
    this.setupConflictResolvers();
    
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
        // Small delay to ensure presence is updated before refreshing
        setTimeout(() => {
          this.refreshDataFromAllDevices();
        }, 1000);
      }
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
      console.log('🌐 Back online - reconnecting sync service');
      if (this.isConnected) {
        this.updatePresence(true);
      }
    });

    window.addEventListener('offline', () => {
      console.log('📵 Gone offline - sync service will resume when online');
    });
  }

  private generateDeviceId(): string {
    // Try to get existing device ID from localStorage
    let deviceId = localStorage.getItem('workVibe_deviceId');
    if (!deviceId) {
      // Generate new device ID with more entropy
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 9);
      const userAgent = navigator.userAgent.slice(-10).replace(/[^a-zA-Z0-9]/g, '');
      deviceId = `device_${timestamp}_${random}_${userAgent}`;
      localStorage.setItem('workVibe_deviceId', deviceId);
    }
    return deviceId;
  }

  private getDeviceName(): string {
    const platform = navigator.platform || 'Unknown';
    const userAgent = navigator.userAgent;
    
    let deviceType = 'Desktop';
    let browserName = 'Unknown';
    
    // Detect device type
    if (/Mobile|Android|iPhone/.test(userAgent)) {
      deviceType = 'Mobile';
    } else if (/iPad|Tablet/.test(userAgent)) {
      deviceType = 'Tablet';
    }
    
    // Detect browser
    if (userAgent.includes('Chrome')) browserName = 'Chrome';
    else if (userAgent.includes('Firefox')) browserName = 'Firefox';
    else if (userAgent.includes('Safari')) browserName = 'Safari';
    else if (userAgent.includes('Edge')) browserName = 'Edge';
    
    return `${deviceType} • ${browserName}`;
  }

  private setupConflictResolvers(): void {
    // Task completion conflicts - merge sets
    this.conflictResolvers.set('completedTasks', (local: Set<number>, remote: number[]) => {
      console.log('🔄 Resolving task completion conflict');
      const merged = new Set([...Array.from(local), ...remote]);
      return Array.from(merged); // Return as array for storage
    });

    // Employee conflicts - keep highest points and latest mood
    this.conflictResolvers.set('employees', (local: Employee[], remote: Employee[]) => {
      console.log('🔄 Resolving employee conflicts');
      const merged = [...local];
      remote.forEach(remoteEmp => {
        const localIndex = merged.findIndex(emp => emp.id === remoteEmp.id);
        if (localIndex >= 0) {
          const localEmp = merged[localIndex];
          // Keep higher points value (optimistic approach)
          const points = Math.max(localEmp.points || 0, remoteEmp.points || 0);
          
          // Keep most recent mood update
          let mood = localEmp.mood;
          let lastMoodDate = localEmp.lastMoodDate;
          let lastUpdated = localEmp.lastUpdated;
          
          if (remoteEmp.lastMoodDate && localEmp.lastMoodDate) {
            if (remoteEmp.lastMoodDate > localEmp.lastMoodDate) {
              mood = remoteEmp.mood;
              lastMoodDate = remoteEmp.lastMoodDate;
              lastUpdated = remoteEmp.lastUpdated;
            }
          } else if (remoteEmp.lastMoodDate && !localEmp.lastMoodDate) {
            mood = remoteEmp.mood;
            lastMoodDate = remoteEmp.lastMoodDate;
            lastUpdated = remoteEmp.lastUpdated;
          }
          
          merged[localIndex] = {
            ...localEmp,
            points,
            mood,
            lastMoodDate,
            lastUpdated
          };
        } else {
          merged.push(remoteEmp);
        }
      });
      return merged;
    });

    // Daily data conflicts - merge arrays intelligently
    this.conflictResolvers.set('dailyData', (local: DailyDataMap, remote: DailyDataMap) => {
      console.log('🔄 Resolving daily data conflict');
      const merged = { ...local };
      Object.keys(remote).forEach(date => {
        if (!merged[date]) {
          merged[date] = remote[date];
        } else {
          const localDay = merged[date];
          const remoteDay = remote[date];
          
          // Merge completed tasks (avoid duplicates by taskId)
          const taskMap = new Map();
          [...(localDay.completedTasks || []), ...(remoteDay.completedTasks || [])].forEach(task => {
            const key = `${task.taskId}_${task.date}`;
            const existing = taskMap.get(key);
            if (!existing || task.completedAt > existing.completedAt) {
              taskMap.set(key, task);
            }
          });
          
          // Merge mood updates (keep latest per employee per day)
          const moodMap = new Map();
          [...(localDay.employeeMoods || []), ...(remoteDay.employeeMoods || [])].forEach(mood => {
            const key = `${mood.employeeId}`;
            const existing = moodMap.get(key);
            if (!existing || mood.updatedAt > existing.updatedAt) {
              moodMap.set(key, mood);
            }
          });
          
          // Merge purchases (avoid duplicates by id)
          const purchaseMap = new Map();
          [...(localDay.purchases || []), ...(remoteDay.purchases || [])].forEach(purchase => {
            purchaseMap.set(purchase.id, purchase);
          });
          
          const completedTasks = Array.from(taskMap.values());
          const employeeMoods = Array.from(moodMap.values());
          const purchases = Array.from(purchaseMap.values());
          
          // Recalculate totals
          const totalPointsEarned = completedTasks.reduce((sum, t) => sum + (t.pointsEarned || 0), 0);
          const totalPointsSpent = purchases.reduce((sum, p) => sum + p.cost, 0);
          const completionRate = localDay.totalTasks > 0 
            ? Math.round((completedTasks.length / localDay.totalTasks) * 100) 
            : 0;
          
          merged[date] = {
            ...localDay,
            completedTasks,
            employeeMoods,
            purchases,
            totalPointsEarned,
            totalPointsSpent,
            completionRate
          };
        }
      });
      return merged;
    });
  }

  // Connect to multi-device sync
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('🔗 Already connected to multi-device sync');
      return;
    }

    try {
      console.log('🔗 Connecting to multi-device sync...');
      
      // Update presence
      await this.updatePresence(true);
      
      // Start listening for changes
      this.startListening();
      
      // Start heartbeat and presence polling
      this.startHeartbeat();
      this.startPresencePolling();
      
      this.isConnected = true;
      
      console.log('✅ Multi-device sync connected');
      
      this.emitSyncEvent({
        type: 'device_join',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        data: { deviceName: this.deviceName, user: this.currentUser }
      });
      
    } catch (error) {
      console.error('❌ Failed to connect multi-device sync:', error);
      this.isConnected = false;
      throw error;
    }
  }

  // Disconnect from multi-device sync
  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      console.log('🔌 Disconnecting multi-device sync...');
      
      // Stop listening
      this.stopListening();
      
      // Stop intervals
      this.stopHeartbeat();
      this.stopPresencePolling();
      
      // Remove presence
      await this.updatePresence(false);
      await this.removePresence();
      
      this.isConnected = false;
      
      this.emitSyncEvent({
        type: 'device_leave',
        timestamp: Date.now(),
        deviceId: this.deviceId
      });
      
      console.log('✅ Multi-device sync disconnected');
      
    } catch (error) {
      console.error('❌ Error disconnecting sync:', error);
    }
  }

  // Update device presence
  private async updatePresence(isActive: boolean): Promise<void> {
    if (!navigator.onLine) {
      console.log('📵 Offline - skipping presence update');
      return;
    }

    const deviceInfo: DeviceInfo = {
      id: this.deviceId,
      name: this.deviceName,
      lastSeen: Date.now(),
      user: this.currentUser,
      platform: navigator.platform || 'Unknown',
      isActive
    };

    try {
      const response = await fetch(`${this.baseUrl}/${this.presenceRef}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceInfo)
      });

      if (!response.ok) {
        throw new Error(`Presence update failed: ${response.status}`);
      }

      console.log(`📡 Presence updated: ${isActive ? 'active' : 'inactive'}`);
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
      console.log('🗑️ Presence removed');
    } catch (error) {
      console.error('❌ Failed to remove presence:', error);
    }
  }

  // Get active devices
  async getActiveDevices(): Promise<DeviceInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/presence.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch presence: ${response.status}`);
      }
      
      const presenceData = await response.json();
      
      if (!presenceData) return [];
      
      const now = Date.now();
      const devices = Object.values(presenceData) as DeviceInfo[];
      
      // Filter out stale devices (inactive for more than 2 minutes)
      const activeDevices = devices.filter(device => 
        device && 
        device.isActive && 
        (now - (device.lastSeen || 0)) < 120000
      );
      
      console.log(`📱 Found ${activeDevices.length} active devices:`, activeDevices.map(d => d.name));
      
      return activeDevices;
      
    } catch (error) {
      console.error('❌ Failed to get active devices:', error);
      return [];
    }
  }

  // Start listening for real-time changes
  private startListening(): void {
    if (this.isListening) return;
    
    console.log('👂 Starting to listen for data changes...');
    this.isListening = true;
    
    // Since Firebase Realtime Database streaming can be complex in browser,
    // we'll use periodic polling for simplicity and reliability
    this.pollForChanges();
  }

  // Stop listening for changes
  private stopListening(): void {
    console.log('🔇 Stopped listening for data changes');
    this.isListening = false;
  }

  // Poll for data changes (more reliable than streaming in browser)
  private async pollForChanges(): Promise<void> {
    if (!this.isListening || !navigator.onLine) {
      if (this.isListening) {
        // Retry in 10 seconds if offline
        setTimeout(() => this.pollForChanges(), 10000);
      }
      return;
    }
    
    try {
      // Poll for sync metadata to detect changes
      const response = await fetch(`${this.baseUrl}/syncMetadata.json`);
      
      if (response.ok) {
        const metadata = await response.json();
        
        if (metadata) {
          // Check if data was updated by another device
          Object.keys(metadata).forEach(field => {
            const fieldMetadata = metadata[field];
            if (fieldMetadata && 
                fieldMetadata.deviceId !== this.deviceId && 
                fieldMetadata.timestamp > (Date.now() - 60000)) { // Within last minute
              
              console.log(`📥 Detected change in ${field} from device ${fieldMetadata.deviceId}`);
              this.refreshFieldFromFirebase(field);
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Error polling for changes:', error);
    }
    
    // Continue polling every 15 seconds
    if (this.isListening) {
      setTimeout(() => this.pollForChanges(), 15000);
    }
  }

  // Refresh specific field from Firebase
  private async refreshFieldFromFirebase(field: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${field}.json`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (this.syncCallbacks.has(field)) {
          const callback = this.syncCallbacks.get(field)!;
          const resolver = this.conflictResolvers.get(field);
          
          if (resolver && data !== null) {
            // Get current local data (this would need to be stored somewhere)
            // For now, just apply the remote data directly
            callback(data);
          } else if (data !== null) {
            callback(data);
          }
          
          this.emitSyncEvent({
            type: 'data_update',
            timestamp: Date.now(),
            deviceId: 'remote',
            field,
            data
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error refreshing ${field}:`, error);
    }
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

  // Start polling for presence changes
  private startPresencePolling(): void {
    this.presenceInterval = setInterval(async () => {
      try {
        const devices = await this.getActiveDevices();
        
        if (this.onDeviceCountChange) {
          this.onDeviceCountChange(devices.length);
        }
        
      } catch (error) {
        console.error('❌ Error polling presence:', error);
      }
    }, 30000); // Poll every 30 seconds
  }

  // Stop presence polling
  private stopPresencePolling(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
  }

  // Sync data field to other devices
  async syncData(field: string, data: any): Promise<void> {
    try {
      // Save the data
      await fetch(`${this.baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      // Update sync metadata
      const metadata = {
        deviceId: this.deviceId,
        timestamp: Date.now(),
        user: this.currentUser,
        field
      };

      await fetch(`${this.baseUrl}/syncMetadata/${field}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata)
      });
      
      console.log(`📤 Synced ${field} to other devices`);
      
    } catch (error) {
      console.error(`❌ Failed to sync ${field}:`, error);
    }
  }

  // Subscribe to field changes
  onFieldChange(field: string, callback: (data: any) => void): void {
    this.syncCallbacks.set(field, callback);
    console.log(`📋 Subscribed to changes for: ${field}`);
  }

  // Unsubscribe from field changes
  offFieldChange(field: string): void {
    this.syncCallbacks.delete(field);
    console.log(`📋 Unsubscribed from: ${field}`);
  }

  // Set device count change callback
  onDeviceCountChanged(callback: (count: number) => void): void {
    this.onDeviceCountChange = callback;
  }

  // Set sync event callback
  onSyncEventReceived(callback: (event: SyncEvent) => void): void {
    this.onSyncEvent = callback;
  }

  // Emit sync event
  private emitSyncEvent(event: SyncEvent): void {
    console.log('📡 Sync event:', event);
    if (this.onSyncEvent) {
      this.onSyncEvent(event);
    }
  }

  // Force refresh data from all devices
  async refreshDataFromAllDevices(): Promise<void> {
    try {
      console.log('🔄 Refreshing data from all devices...');
      
      const fields = [
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

      const responses = await Promise.all(
        fields.map(field => 
          fetch(`${this.baseUrl}/${field}.json`).then(res => res.json())
        )
      );

      const data: Record<string, any> = {};
      fields.forEach((field, index) => {
        data[field] = responses[index];
      });

      // Trigger callbacks for all fields that have data
      Object.keys(data).forEach(field => {
        if (this.syncCallbacks.has(field) && data[field] !== null) {
          const callback = this.syncCallbacks.get(field)!;
          callback(data[field]);
        }
      });

      // Also refresh device list
      const devices = await this.getActiveDevices();
      if (this.onDeviceCountChange) {
        this.onDeviceCountChange(devices.length);
      }

      console.log('✅ Data refreshed from all devices');
      
    } catch (error) {
      console.error('❌ Failed to refresh data:', error);
    }
  }

  // Get current device info
  getDeviceInfo(): DeviceInfo {
    return {
      id: this.deviceId,
      name: this.deviceName,
      lastSeen: Date.now(),
      user: this.currentUser,
      platform: navigator.platform || 'Unknown',
      isActive: this.isConnected
    };
  }

  // Update current user
  updateCurrentUser(userName: string): void {
    this.currentUser = userName;
    if (this.isConnected) {
      this.updatePresence(true);
    }
  }

  // Get connection status
  isDeviceConnected(): boolean {
    return this.isConnected;
  }
}
