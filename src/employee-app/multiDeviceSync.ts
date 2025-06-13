// multiDeviceSync.ts - Complete multi-device synchronization service
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
  private eventSource: EventSource | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private onDeviceCountChange?: (count: number) => void;
  private onSyncEvent?: (event: SyncEvent) => void;

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
        this.refreshDataFromAllDevices();
      }
    });
  }

  private generateDeviceId(): string {
    // Try to get existing device ID from localStorage
    let deviceId = localStorage.getItem('workVibe_deviceId');
    if (!deviceId) {
      // Generate new device ID
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('workVibe_deviceId', deviceId);
    }
    return deviceId;
  }

  private getDeviceName(): string {
    const platform = navigator.platform || 'Unknown';
    const userAgent = navigator.userAgent;
    
    let deviceType = 'Desktop';
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      deviceType = 'Mobile';
    } else if (/Tablet|iPad/.test(userAgent)) {
      deviceType = 'Tablet';
    }
    
    return `${deviceType} (${platform})`;
  }

  private setupConflictResolvers(): void {
    // Task completion conflicts - last action wins
    this.conflictResolvers.set('completedTasks', (local: Set<number>, remote: number[]) => {
      console.log('🔄 Resolving task completion conflict');
      return new Set([...Array.from(local), ...remote]);
    });

    // Employee points conflicts - sum them up (optimistic)
    this.conflictResolvers.set('employees', (local: Employee[], remote: Employee[]) => {
      console.log('🔄 Resolving employee points conflict');
      const merged = [...local];
      remote.forEach(remoteEmp => {
        const localIndex = merged.findIndex(emp => emp.id === remoteEmp.id);
        if (localIndex >= 0) {
          // Keep higher points value (optimistic approach)
          if (remoteEmp.points > merged[localIndex].points) {
            merged[localIndex] = { ...merged[localIndex], points: remoteEmp.points };
          }
          // Keep most recent mood update - FIXED: Proper null handling
          if (remoteEmp.lastMoodDate) {
            const localMoodDate = merged[localIndex].lastMoodDate;
            if (localMoodDate === null || remoteEmp.lastMoodDate > localMoodDate) {
              merged[localIndex].mood = remoteEmp.mood;
              merged[localIndex].lastMoodDate = remoteEmp.lastMoodDate;
              merged[localIndex].lastUpdated = remoteEmp.lastUpdated;
            }
          }
        } else {
          merged.push(remoteEmp);
        }
      });
      return merged;
    });

    // Daily data conflicts - merge arrays
    this.conflictResolvers.set('dailyData', (local: DailyDataMap, remote: DailyDataMap) => {
      console.log('🔄 Resolving daily data conflict');
      const merged = { ...local };
      Object.keys(remote).forEach(date => {
        if (!merged[date]) {
          merged[date] = remote[date];
        } else {
          // Merge completed tasks (avoid duplicates)
          const existingTaskIds = new Set(merged[date].completedTasks.map(t => t.taskId));
          const newCompletions = remote[date].completedTasks.filter(t => !existingTaskIds.has(t.taskId));
          merged[date].completedTasks = [...merged[date].completedTasks, ...newCompletions];
          
          // Merge mood updates (keep latest per employee)
          const moodMap = new Map();
          [...merged[date].employeeMoods, ...remote[date].employeeMoods].forEach(mood => {
            const existing = moodMap.get(mood.employeeId);
            if (!existing || mood.updatedAt > existing.updatedAt) {
              moodMap.set(mood.employeeId, mood);
            }
          });
          merged[date].employeeMoods = Array.from(moodMap.values());
          
          // Merge purchases (avoid duplicates)
          const existingPurchaseIds = new Set(merged[date].purchases.map(p => p.id));
          const newPurchases = remote[date].purchases.filter(p => !existingPurchaseIds.has(p.id));
          merged[date].purchases = [...merged[date].purchases, ...newPurchases];
          
          // Recalculate totals
          merged[date].totalPointsEarned = merged[date].completedTasks.reduce((sum, t) => sum + (t.pointsEarned || 0), 0);
          merged[date].totalPointsSpent = merged[date].purchases.reduce((sum, p) => sum + p.cost, 0);
          merged[date].completionRate = Math.round((merged[date].completedTasks.length / merged[date].totalTasks) * 100);
        }
      });
      return merged;
    });
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
      
      console.log('✅ Multi-device sync connected');
      
      this.emitSyncEvent({
        type: 'device_join',
        timestamp: Date.now(),
        deviceId: this.deviceId,
        data: { deviceName: this.deviceName, user: this.currentUser }
      });
      
    } catch (error) {
      console.error('❌ Failed to connect multi-device sync:', error);
      throw error;
    }
  }

  // Disconnect from multi-device sync
  async disconnect(): Promise<void> {
    try {
      console.log('🔌 Disconnecting multi-device sync...');
      
      // Stop listening
      this.stopListening();
      
      // Stop heartbeat
      this.stopHeartbeat();
      
      // Remove presence
      await this.updatePresence(false);
      await this.removePresence();
      
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
    const deviceInfo: DeviceInfo = {
      id: this.deviceId,
      name: this.deviceName,
      lastSeen: Date.now(),
      user: this.currentUser,
      platform: navigator.platform || 'Unknown',
      isActive
    };

    try {
      await fetch(`${this.baseUrl}/${this.presenceRef}.json`, {
        method: 'PUT',
        body: JSON.stringify(deviceInfo)
      });
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

  // Get active devices
  async getActiveDevices(): Promise<DeviceInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/presence.json`);
      const presenceData = await response.json();
      
      if (!presenceData) return [];
      
      const now = Date.now();
      const devices = Object.values(presenceData) as DeviceInfo[];
      
      // Filter out stale devices (inactive for more than 2 minutes)
      return devices.filter(device => 
        device.isActive && (now - device.lastSeen) < 120000
      );
      
    } catch (error) {
      console.error('❌ Failed to get active devices:', error);
      return [];
    }
  }

  // Start listening for real-time changes
  private startListening(): void {
    if (this.isListening) return;
    
    this.isListening = true;
    
    // Listen for data changes using Server-Sent Events
    const eventSourceUrl = `${this.baseUrl}/.json?ns=${FIREBASE_CONFIG.projectId}`;
    this.eventSource = new EventSource(eventSourceUrl);
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleRemoteDataChange(data);
      } catch (error) {
        console.error('❌ Error parsing sync event:', error);
      }
    };
    
    this.eventSource.onerror = (error) => {
      console.error('❌ EventSource error:', error);
      // Reconnect after delay
      setTimeout(() => {
        if (this.isListening) {
          this.stopListening();
          this.startListening();
        }
      }, 5000);
    };
    
    // Also listen for presence changes
    this.pollPresenceChanges();
  }

  // Stop listening for changes
  private stopListening(): void {
    this.isListening = false;
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // Handle remote data changes
  private handleRemoteDataChange(data: any): void {
    // Ignore changes from this device
    if (data.deviceId === this.deviceId) return;
    
    console.log('📥 Received remote data change:', data);
    
    // Apply conflict resolution if needed
    Object.keys(data).forEach(field => {
      if (this.syncCallbacks.has(field)) {
        const callback = this.syncCallbacks.get(field)!;
        const resolver = this.conflictResolvers.get(field);
        
        if (resolver) {
          // Apply conflict resolution
          const resolvedData = resolver(data[field], data[field]);
          callback(resolvedData);
          
          this.emitSyncEvent({
            type: 'conflict_resolution',
            timestamp: Date.now(),
            deviceId: this.deviceId,
            field,
            data: resolvedData
          });
        } else {
          // No conflict resolution needed
          callback(data[field]);
        }
        
        this.emitSyncEvent({
          type: 'data_update',
          timestamp: Date.now(),
          deviceId: data.deviceId || 'unknown',
          field,
          data: data[field]
        });
      }
    });
  }

  // Poll for presence changes
  private async pollPresenceChanges(): Promise<void> {
    if (!this.isListening) return;
    
    try {
      const devices = await this.getActiveDevices();
      
      if (this.onDeviceCountChange) {
        this.onDeviceCountChange(devices.length);
      }
      
    } catch (error) {
      console.error('❌ Error polling presence:', error);
    }
    
    // Poll every 30 seconds
    setTimeout(() => {
      this.pollPresenceChanges();
    }, 30000);
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

  // Sync data field to other devices
  async syncData(field: string, data: any): Promise<void> {
    try {
      const syncData = {
        [field]: data,
        deviceId: this.deviceId,
        timestamp: Date.now(),
        user: this.currentUser
      };
      
      await fetch(`${this.baseUrl}/sync/${field}.json`, {
        method: 'PUT',
        body: JSON.stringify(syncData)
      });
      
      console.log(`📤 Synced ${field} to other devices`);
      
    } catch (error) {
      console.error(`❌ Failed to sync ${field}:`, error);
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
  onDeviceCountChanged(callback: (count: number) => void): void {
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
  async refreshDataFromAllDevices(): Promise<void> {
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

      const data = {
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

      // Trigger callbacks for all fields
      Object.keys(data).forEach(field => {
        if (this.syncCallbacks.has(field) && data[field] !== null) {
          const callback = this.syncCallbacks.get(field)!;
          callback(data[field]);
        }
      });

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
      isActive: true
    };
  }

  // Update current user
  updateCurrentUser(userName: string): void {
    this.currentUser = userName;
    this.updatePresence(true);
  }
}

// Exports are handled by the class declaration above
export type { DeviceInfo, SyncEvent };
