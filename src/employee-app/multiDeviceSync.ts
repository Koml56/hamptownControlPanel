// multiDeviceSync.ts - Optimized for performance and reliability with full prep/store support
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
  // FIXED: Add inventory fields for multi-device sync
  inventoryDailyItems?: InventoryItem[];
  inventoryWeeklyItems?: InventoryItem[];
  inventoryMonthlyItems?: InventoryItem[];
  inventoryDatabaseItems?: DatabaseItem[];
  inventoryActivityLog?: ActivityLogEntry[];
}

export class MultiDeviceSyncService {
  private baseUrl = FIREBASE_CONFIG.databaseURL;
  private deviceId: string;
  private deviceInfo: DeviceInfo;
  private presenceRef: string;
  private syncCallbacks: Map<string, (data: any) => void> = new Map();
  private currentFieldState: Map<string, any> = new Map(); // Track current state for merging
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
  
  // FALLBACK: LocalStorage sync for when Firebase is unavailable
  private useLocalStorageFallback = false;
  private localStoragePrefix = 'workVibe_sync_';
  private storageEventListener: ((e: StorageEvent) => void) | null = null;
  
  // PERFORMANCE: Throttle sync operations
  private syncQueue: Map<string, any> = new Map();
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  // ANTI-LOOP: Track our own operations to prevent sync loops
  private ourOperations = new Set<string>();
  private operationTimeout = 30000; // 30 seconds to track our operations

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
    // FIXED: Use sessionStorage instead of localStorage to ensure each tab has unique device ID
    let deviceId = sessionStorage.getItem('workVibe_deviceId');
    if (!deviceId) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 6); // Shorter for performance
      deviceId = `device_${timestamp}_${random}`;
      sessionStorage.setItem('workVibe_deviceId', deviceId);
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

  // ENHANCED: Connection with fallback mechanism
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('✅ Already connected');
      return;
    }

    try {
      console.log('🔗 Connecting sync service...');
      
      // Test Firebase connectivity first
      const connectivityTest = await this.testFirebaseConnectivity();
      
      if (connectivityTest) {
        console.log('✅ Firebase available, using real-time sync');
        await this.connectToFirebase();
      } else {
        console.log('⚠️ Firebase unavailable, using localStorage fallback');
        this.connectToLocalStorage();
      }
      
      // Update presence (fire and forget)
      this.updatePresence(true).catch(console.warn);
      
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
        description: `${this.deviceInfo.name} connected${this.useLocalStorageFallback ? ' (local mode)' : ''}`
      });
      
      console.log(`✅ Sync service connected${this.useLocalStorageFallback ? ' in local mode' : ''}`);
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  // Test Firebase connectivity
  private async testFirebaseConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${this.baseUrl}/presence.json`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('⚠️ Firebase connectivity test failed:', error);
      return false;
    }
  }

  // Connect to Firebase (original method)
  private async connectToFirebase(): Promise<void> {
    this.useLocalStorageFallback = false;
    
    // Start listening (non-blocking)
    this.startListening();
  }

  // Connect using localStorage fallback
  private connectToLocalStorage(): void {
    this.useLocalStorageFallback = true;
    
    console.log('🔄 Initializing localStorage sync...');
    
    // Set up storage event listener for cross-tab sync
    this.storageEventListener = (e: StorageEvent) => {
      if (e.key && e.key.startsWith(this.localStoragePrefix)) {
        const field = e.key.substring(this.localStoragePrefix.length);
        
        if (e.newValue && this.syncCallbacks.has(field)) {
          console.log(`📥 Received localStorage update for ${field}`);
          
          try {
            const incomingData = JSON.parse(e.newValue);
            let processedData = incomingData;
            
            // FIXED: Implement proper state merging for completedTasks
            if (field === 'completedTasks' && Array.isArray(incomingData)) {
              // Get current local state
              let currentLocalState: Set<number> = new Set();
              
              // Try to get current state from the app (if available)
              if (this.currentFieldState?.has(field)) {
                currentLocalState = this.currentFieldState.get(field) as Set<number>;
              }
              
              // Merge: Union of current local tasks + incoming tasks
              const incomingSet = new Set(incomingData);
              const mergedSet = new Set([...currentLocalState, ...incomingSet]);
              
              console.log(`🔀 Merging completedTasks - Local: [${Array.from(currentLocalState)}], Incoming: [${incomingData}], Merged: [${Array.from(mergedSet)}]`);
              
              // Only update if the merged state is different from current
              if (mergedSet.size !== currentLocalState.size || !Array.from(mergedSet).every(task => currentLocalState.has(task))) {
                processedData = mergedSet;
                
                // Save the merged state back to localStorage to ensure consistency
                localStorage.setItem(
                  this.localStoragePrefix + field, 
                  JSON.stringify(Array.from(mergedSet))
                );
                
                console.log(`✅ Updated localStorage with merged completedTasks: [${Array.from(mergedSet)}]`);
              } else {
                console.log(`🔄 No changes needed - local state already includes all tasks`);
                return; // No callback needed since nothing changed
              }
            } else if (Array.isArray(incomingData) && field === 'completedTasks') {
              // Fallback: convert to Set for other array fields if needed
              processedData = new Set(incomingData);
            }
            
            const callback = this.syncCallbacks.get(field)!;
            callback(processedData);
            
            // Emit sync event
            this.emitSyncEvent({
              type: 'data_update',
              timestamp: Date.now(),
              deviceId: 'local',
              deviceName: 'Local Storage',
              field,
              description: `${field} updated from another tab`
            });
            
          } catch (error) {
            console.warn(`⚠️ Error processing localStorage update for ${field}:`, error);
          }
        }
      }
    };
    
    window.addEventListener('storage', this.storageEventListener);
    
    // Load initial data from localStorage
    this.loadInitialLocalData();
    
    // CRITICAL FIX: After setting up localStorage sync, check for any already-registered callbacks
    // and load their initial data immediately
    for (const [field] of this.syncCallbacks.entries()) {
      this.loadInitialDataForField(field);
    }
  }

  // Load initial data from localStorage for a specific field
  private loadInitialDataForField(field: string): void {
    try {
      const key = this.localStoragePrefix + field;
      const stored = localStorage.getItem(key);
      
      if (stored && this.syncCallbacks.has(field)) {
        const data = JSON.parse(stored);
        let processedData = data;
        
        if (field === 'completedTasks' && Array.isArray(data)) {
          processedData = new Set(data);
          // Update our current field state for proper merging
          this.currentFieldState.set(field, processedData);
        } else {
          // Update current field state for other data types too
          this.currentFieldState.set(field, processedData);
        }
        
        const callback = this.syncCallbacks.get(field)!;
        callback(processedData);
        
        console.log(`📂 Loaded ${field} from localStorage on callback registration`);
      }
    } catch (error) {
      console.warn(`⚠️ Error loading ${field} from localStorage:`, error);
    }
  }

  // Load initial data from localStorage (legacy method, now calls individual field loader)
  private loadInitialLocalData(): void {
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
      'storeItems',
      'inventoryDailyItems',
      'inventoryWeeklyItems', 
      'inventoryMonthlyItems',
      'inventoryDatabaseItems',
      'inventoryActivityLog'
    ];

    // NOTE: This is now mainly for logging, actual loading happens when callbacks are registered
    console.log(`📂 Ready to load ${relevantFields.length} fields from localStorage when callbacks are registered`);
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
      
      // Clean up localStorage event listener
      if (this.storageEventListener) {
        window.removeEventListener('storage', this.storageEventListener);
        this.storageEventListener = null;
      }
      
      // Remove presence (fire and forget)
      this.removePresence().catch(console.warn);
      
      console.log('✅ Disconnected');
      
    } catch (error) {
      console.error('❌ Disconnect error:', error);
    }
  }

  // ENHANCED: Non-blocking presence update with improved device counting
  private async updatePresence(isActive: boolean): Promise<void> {
    this.deviceInfo = {
      ...this.deviceInfo,
      lastSeen: Date.now(),
      isActive
    };

    try {
      if (this.useLocalStorageFallback) {
        // Update presence in localStorage
        this.updateLocalPresence();
      } else {
        // Fire and forget - don't wait for response
        fetch(`${this.baseUrl}/${this.presenceRef}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.deviceInfo)
        }).then(response => {
          if (response.ok) {
            // ENHANCED: Update device count asynchronously with debouncing
            if (this.deviceCountTimeout) {
              clearTimeout(this.deviceCountTimeout);
            }
            this.deviceCountTimeout = setTimeout(() => {
              this.getActiveDevices().then(devices => {
                if (this.onDeviceCountChange) {
                  console.log(`📱 Device count updated: ${devices.length} devices connected`);
                  this.onDeviceCountChange(devices.length, devices);
                }
              }).catch(console.warn);
            }, 1000); // Debounce device count updates
          } else {
            console.warn(`⚠️ Presence update failed: HTTP ${response.status} ${response.statusText}`);
          }
        }).catch(error => {
          // Enhanced error logging for presence updates
          console.warn('⚠️ Presence update failed:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            name: error instanceof Error ? error.name : 'Error',
            presenceRef: this.presenceRef,
            baseUrl: this.baseUrl,
            error: error
          });
        });
      }

    } catch (error) {
      // Enhanced error logging for presence updates
      console.warn('⚠️ Presence update failed:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Error',
        presenceRef: this.presenceRef,
        baseUrl: this.baseUrl,
        error: error
      });
    }
  }

  // Update presence in localStorage (fallback mode)
  private updateLocalPresence(): void {
    try {
      const stored = localStorage.getItem(this.localStoragePrefix + 'activeDevices');
      let devices: DeviceInfo[] = stored ? JSON.parse(stored) : [];
      
      // Remove stale devices and our old entry
      const now = Date.now();
      devices = devices.filter(device => 
        device.id !== this.deviceId && 
        device.isActive && 
        (now - device.lastSeen) < 120000 // 2 minutes
      );
      
      // Add our current device info
      devices.push(this.deviceInfo);
      
      // Save back to localStorage
      localStorage.setItem(
        this.localStoragePrefix + 'activeDevices', 
        JSON.stringify(devices)
      );
      
      // Update device count
      if (this.onDeviceCountChange) {
        this.onDeviceCountChange(devices.length, devices);
      }
      
    } catch (error) {
      console.warn('⚠️ Error updating local presence:', error);
    }
  }

  private deviceCountTimeout: NodeJS.Timeout | null = null;

  private async removePresence(): Promise<void> {
    try {
      if (this.useLocalStorageFallback) {
        // Remove presence from localStorage
        this.removeLocalPresence();
      } else {
        const response = await fetch(`${this.baseUrl}/${this.presenceRef}.json`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
    } catch (error) {
      // Enhanced error logging to show meaningful details
      console.warn('⚠️ Failed to remove presence:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Error',
        stack: error instanceof Error ? error.stack : undefined,
        presenceRef: this.presenceRef,
        baseUrl: this.baseUrl,
        error: error
      });
    }
  }

  // Remove presence from localStorage (fallback mode)
  private removeLocalPresence(): void {
    try {
      const stored = localStorage.getItem(this.localStoragePrefix + 'activeDevices');
      if (!stored) return;
      
      let devices: DeviceInfo[] = JSON.parse(stored);
      
      // Remove our device
      devices = devices.filter(device => device.id !== this.deviceId);
      
      // Save back to localStorage
      localStorage.setItem(
        this.localStoragePrefix + 'activeDevices', 
        JSON.stringify(devices)
      );
      
    } catch (error) {
      console.warn('⚠️ Error removing local presence:', error);
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

      if (this.useLocalStorageFallback) {
        // Use localStorage to track active tabs
        return this.getLocalActiveDevices();
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
      return this.useLocalStorageFallback ? this.getLocalActiveDevices() : [];
    }
  }

  // Get active devices from localStorage (fallback mode)
  private getLocalActiveDevices(): DeviceInfo[] {
    try {
      const stored = localStorage.getItem(this.localStoragePrefix + 'activeDevices');
      if (!stored) return [this.deviceInfo];
      
      const devices = JSON.parse(stored) as DeviceInfo[];
      const now = Date.now();
      
      // Filter stale devices (inactive for more than 2 minutes in local mode)
      const activeDevices = devices.filter(device => 
        device.isActive && (now - device.lastSeen) < 120000
      );
      
      // Always include ourselves
      const ourDevice = activeDevices.find(d => d.id === this.deviceId);
      if (!ourDevice) {
        activeDevices.push(this.deviceInfo);
      }
      
      this.deviceCache = { devices: activeDevices, timestamp: now };
      return activeDevices;
      
    } catch (error) {
      console.warn('⚠️ Error reading local active devices:', error);
      return [this.deviceInfo];
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

  // ENHANCED: Process data updates for ALL fields including prep, store and inventory data with loop prevention
  private processDataUpdate(data: any): void {
    // FIXED: Include all relevant fields including prep, store and inventory data
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
      'storeItems',
      // FIXED: Add inventory fields for multi-device sync
      'inventoryDailyItems',
      'inventoryWeeklyItems', 
      'inventoryMonthlyItems',
      'inventoryDatabaseItems',
      'inventoryActivityLog'
    ];
    
    for (const field of relevantFields) {
      if (data[field] && this.syncCallbacks.has(field)) {
        const callback = this.syncCallbacks.get(field)!;
        
        // Throttle updates to prevent spam
        const now = Date.now();
        const lastUpdate = this.lastDataTimestamp.get(field) || 0;
        
        // ENHANCED: Longer throttle period to prevent loops
        if (now - lastUpdate > 3000) { // Only update every 3 seconds (increased from 2)
          
          // ANTI-LOOP: Check if this is our own operation coming back
          const operationKey = `${field}_${JSON.stringify(data[field]).slice(0, 100)}`;
          if (this.ourOperations.has(operationKey)) {
            console.log(`🔄 [SYNC] ${field} update ignored - this was our own operation`);
            continue;
          }
          
          this.lastDataTimestamp.set(field, now);
          
          let processedData = data[field];
          if (field === 'completedTasks' && Array.isArray(processedData)) {
            processedData = new Set(processedData);
          }
          
          console.log(`🔄 [SYNC] Received ${field} update from Firebase:`, 
                     Array.isArray(data[field]) ? data[field] : Object.keys(data[field] || {}).length);
          
          // ENHANCED: Check if data actually changed before calling callback
          const dataChanged = this.hasDataChanged(field, processedData);
          if (dataChanged) {
            console.log(`🔄 [SYNC] ${field.charAt(0).toUpperCase() + field.slice(1)} actually changed, updating state`);
            callback(processedData);
          } else {
            console.log(`🔄 [SYNC] ${field.charAt(0).toUpperCase() + field.slice(1)} unchanged, keeping current state`);
          }
          
          // Emit sync event only if data changed
          if (dataChanged) {
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
  }

  // Helper to check if data actually changed (prevent unnecessary updates)
  private lastKnownData = new Map<string, any>();
  
  private hasDataChanged(field: string, newData: any): boolean {
    const lastData = this.lastKnownData.get(field);
    const newDataStr = JSON.stringify(newData);
    const lastDataStr = JSON.stringify(lastData);
    
    if (newDataStr !== lastDataStr) {
      this.lastKnownData.set(field, newData);
      return true;
    }
    return false;
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

  // ENHANCED: Batched sync operations with loop prevention
  async syncData(field: string, data: any): Promise<void> {
    // ANTI-LOOP: Track this as our operation
    const operationKey = `${field}_${JSON.stringify(data).slice(0, 100)}`;
    this.ourOperations.add(operationKey);
    
    // Auto-cleanup operation tracking after timeout
    setTimeout(() => {
      this.ourOperations.delete(operationKey);
    }, this.operationTimeout);
    
    // Add to sync queue instead of immediate sync
    this.syncQueue.set(field, data);
    
    // Debounce sync operations (increased delay to prevent rapid fire)
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    
    this.syncTimer = setTimeout(() => {
      this.processSyncQueue();
    }, 1500); // Increased from 1 second to 1.5 seconds
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.size === 0) return;
    
    this.isSyncing = true;
    const queue = new Map(this.syncQueue);
    this.syncQueue.clear();
    
    try {
      console.log('📤 Processing sync queue:', Array.from(queue.keys()));
      
      if (this.useLocalStorageFallback) {
        // Process localStorage sync
        this.processLocalStorageSync(queue);
      } else {
        // Process Firebase sync
        await this.processFirebaseSync(queue);
      }
      
    } finally {
      this.isSyncing = false;
    }
  }

  // Process sync using localStorage fallback
  private processLocalStorageSync(queue: Map<string, any>): void {
    console.log('📂 Processing localStorage sync...');
    
    for (const [field, data] of queue.entries()) {
      try {
        let processedData = data instanceof Set ? Array.from(data) : data;
        
        // Save to localStorage
        const key = this.localStoragePrefix + field;
        const value = JSON.stringify(processedData);
        localStorage.setItem(key, value);
        
        console.log(`✅ Synced ${field} to localStorage`);
        
        // Emit sync event
        this.emitSyncEvent({
          type: 'data_update',
          timestamp: Date.now(),
          deviceId: this.deviceId,
          deviceName: this.deviceInfo.name,
          field,
          description: `${field} synced locally`
        });
        
      } catch (error) {
        console.warn(`⚠️ Failed to sync ${field} to localStorage:`, error);
      }
    }
  }

  // Process sync using Firebase
  private async processFirebaseSync(queue: Map<string, any>): Promise<void> {
    try {
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
      console.error('❌ Firebase sync processing failed:', error);
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
    
    // CRITICAL FIX: Load initial data from localStorage if we're in fallback mode
    // This ensures new tabs inherit existing data when they register callbacks
    if (this.useLocalStorageFallback && this.isConnected) {
      this.loadInitialDataForField(field);
    }
  }
  
  // Update current field state (called by the app when state changes)
  updateFieldState(field: string, data: any): void {
    this.currentFieldState.set(field, data);
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
        'storeItems',
        // FIXED: Include inventory fields for multi-device sync
        'inventoryDailyItems',
        'inventoryWeeklyItems',
        'inventoryMonthlyItems', 
        'inventoryDatabaseItems',
        'inventoryActivityLog'
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
    isUsingFallback: boolean;
    syncMode: string;
  } {
    return {
      isConnected: this.isConnected,
      deviceCount: this.deviceCache?.devices.length || 0,
      lastSync: Math.max(...Array.from(this.lastDataTimestamp.values()), 0),
      isListening: this.eventSource !== null,
      queueSize: this.syncQueue.size,
      isUsingFallback: this.useLocalStorageFallback,
      syncMode: this.useLocalStorageFallback ? 'localStorage' : 'firebase'
    };
  }
}
