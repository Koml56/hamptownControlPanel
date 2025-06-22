// hooks.ts - FIXED: Enhanced Firebase save/load for prep completions with better debugging
import { useState, useEffect, useCallback, useRef } from 'react';
import { FirebaseService } from './firebaseService';
import { MultiDeviceSyncService, type DeviceInfo, type SyncEvent } from './multiDeviceSync';
import { getFormattedDate } from './utils';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';
import type {
  Employee,
  Task,
  DailyDataMap,
  TaskAssignments,
  ConnectionStatus,
  CurrentUser,
  PrepItem,
  ScheduledPrep,
  PrepSelections,
  StoreItem
} from './types';

// Migration functions
const migrateEmployeeData = (employees: any[]): Employee[] => {
  if (!employees || !Array.isArray(employees)) return getDefaultEmployees();
  return employees.map(emp => ({
    id: emp.id || 0,
    name: emp.name || 'Unknown',
    mood: emp.mood || 3,
    lastUpdated: emp.lastUpdated || 'Not updated',
    role: emp.role || 'Cleaner',
    lastMoodDate: emp.lastMoodDate || null,
    points: typeof emp.points === 'number' ? emp.points : 0
  }));
};

const migrateTaskData = (tasks: any[]): Task[] => {
  if (!tasks || !Array.isArray(tasks)) return getDefaultTasks();
  return tasks.map(task => ({
    id: task.id || 0,
    task: task.task || 'Unknown Task',
    location: task.location || 'Unknown Location',
    priority: task.priority || 'medium',
    estimatedTime: task.estimatedTime || '30 min',
    points: typeof task.points === 'number' ? task.points : 5
  }));
};

// FIXED: Enhanced prep data migration with completion status validation
const migrateScheduledPreps = (scheduledPreps: any[]): ScheduledPrep[] => {
  if (!scheduledPreps || !Array.isArray(scheduledPreps)) return [];
  
  return scheduledPreps.map(prep => ({
    id: prep.id || Date.now() + Math.random(),
    prepId: prep.prepId || 0,
    name: prep.name || 'Unknown Prep',
    category: prep.category || 'muut',
    estimatedTime: prep.estimatedTime || '30 min',
    isCustom: prep.isCustom || false,
    hasRecipe: prep.hasRecipe || false,
    recipe: prep.recipe || null,
    scheduledDate: prep.scheduledDate || getFormattedDate(new Date()),
    priority: prep.priority || 'medium',
    timeSlot: prep.timeSlot || '',
    completed: typeof prep.completed === 'boolean' ? prep.completed : false, // CRITICAL: Ensure completed status is boolean
    assignedTo: prep.assignedTo || null,
    notes: prep.notes || ''
  }));
};

// Helper function to get initial multi-device sync state
const getInitialSyncState = (): boolean => {
  const savedPreference = localStorage.getItem('workVibe_multiDeviceSyncEnabled');
  if (savedPreference !== null) {
    return savedPreference === 'true';
  }
  return true; // Default enabled
};

export const useFirebaseData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  // Main app data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyData, setDailyData] = useState<DailyDataMap>({});
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignments>({});
  const [customRoles, setCustomRoles] = useState<string[]>(['Cleaner', 'Manager', 'Supervisor']);

  // PrepList data
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [scheduledPreps, setScheduledPreps] = useState<ScheduledPrep[]>([]);
  const [prepSelections, setPrepSelections] = useState<PrepSelections>({});
  
  // Store data
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  
  // Multi-device sync data
  const [activeDevices, setActiveDevices] = useState<DeviceInfo[]>([]);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [deviceCount, setDeviceCount] = useState<number>(1);
  const [isMultiDeviceEnabled, setIsMultiDeviceEnabled] = useState<boolean>(getInitialSyncState());

  const firebaseService = new FirebaseService();
  const syncServiceRef = useRef<MultiDeviceSyncService | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const isInitializedRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);
  const pendingSyncData = useRef<Set<string>>(new Set());

  // FIXED: Enhanced quickSave with better error handling and completion status logging
  const quickSave = useCallback(async (field: string, data: any): Promise<boolean> => {
    console.log(`🔥 QuickSave: ${field}`);
    
    try {
      const baseUrl = 'https://hamptown-panel-default-rtdb.firebaseio.com';
      let saveData = data instanceof Set ? Array.from(data) : data;
      
      // ENHANCED: Detailed logging for scheduledPreps with completion status
      if (field === 'scheduledPreps') {
        const todayStr = getFormattedDate(new Date());
        const todayPreps = saveData.filter((prep: any) => prep.scheduledDate === todayStr);
        const todayCompleted = todayPreps.filter((prep: any) => prep.completed === true);
        
        console.log('🔍 Saving scheduledPreps to Firebase:', {
          totalCount: saveData.length,
          todayCount: todayPreps.length,
          todayCompletedCount: todayCompleted.length,
          completionPercentage: todayPreps.length > 0 ? Math.round((todayCompleted.length / todayPreps.length) * 100) : 0,
          sampleTodayPreps: todayPreps.slice(0, 3).map((prep: any) => ({
            id: prep.id,
            name: prep.name,
            completed: prep.completed,
            scheduledDate: prep.scheduledDate
          }))
        });
        
        // VALIDATION: Ensure all completion statuses are boolean
        saveData = saveData.map((prep: any) => ({
          ...prep,
          completed: Boolean(prep.completed) // Force to boolean
        }));
      }
      
      // Critical fields that need reliable saving (wait for response)
      const criticalFields = ['scheduledPreps', 'completedTasks', 'taskAssignments', 'dailyData'];
      const isCritical = criticalFields.includes(field);
      
      if (isCritical) {
        // For critical data, wait for the response to ensure it's saved
        console.log('🔒 Critical save - waiting for confirmation:', field);
        
        const response = await fetch(`${baseUrl}/${field}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveData)
        });
        
        if (response.ok) {
          setLastSync(new Date().toLocaleTimeString());
          setConnectionStatus('connected');
          console.log('✅ Critical QuickSave completed:', field);
          
          // ENHANCED: Verify the save by reading back the data for scheduledPreps
          if (field === 'scheduledPreps') {
            setTimeout(async () => {
              try {
                const verifyResponse = await fetch(`${baseUrl}/${field}.json`);
                const verifyData = await verifyResponse.json();
                
                if (verifyData) {
                  const todayStr = getFormattedDate(new Date());
                  const todayPreps = verifyData.filter((prep: any) => prep.scheduledDate === todayStr);
                  const todayCompleted = todayPreps.filter((prep: any) => prep.completed === true);
                  
                  console.log('🔍 Verified scheduledPreps in Firebase after save:', {
                    totalCount: verifyData.length,
                    todayCount: todayPreps.length,
                    todayCompletedCount: todayCompleted.length,
                    completionPercentage: todayPreps.length > 0 ? Math.round((todayCompleted.length / todayPreps.length) * 100) : 0
                  });
                  
                  // Check if there's a mismatch
                  const originalTodayCompleted = saveData.filter((prep: any) => 
                    prep.scheduledDate === todayStr && prep.completed === true
                  ).length;
                  
                  if (todayCompleted.length !== originalTodayCompleted) {
                    console.warn('⚠️ Completion count mismatch after save!', {
                      sent: originalTodayCompleted,
                      verified: todayCompleted.length
                    });
                  } else {
                    console.log('✅ Completion status successfully verified');
                  }
                } else {
                  console.warn('⚠️ No data returned from verification');
                }
              } catch (error) {
                console.warn('⚠️ Failed to verify save:', error);
              }
            }, 500);
          }
        } else {
          throw new Error(`Critical save failed: ${response.status}`);
        }
      } else {
        // Non-critical data can still be fire-and-forget
        fetch(`${baseUrl}/${field}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveData)
        }).then(response => {
          if (response.ok) {
            setLastSync(new Date().toLocaleTimeString());
            setConnectionStatus('connected');
            console.log('✅ QuickSave completed:', field);
          } else {
            throw new Error(`Save failed: ${response.status}`);
          }
        }).catch(error => {
          console.warn('⚠️ QuickSave failed (non-blocking):', error);
          setConnectionStatus('error');
        });
      }

      // Schedule sync (non-blocking)
      if (isMultiDeviceEnabled) {
        pendingSyncData.current.add(field);
        
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        
        syncTimeoutRef.current = setTimeout(() => {
          debouncedBatchSync();
        }, 1000); // Batch sync after 1 second of inactivity
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ QuickSave error:', error);
      setConnectionStatus('error');
      return false;
    }
  }, [isMultiDeviceEnabled]);

  // PERFORMANCE OPTIMIZATION: Initialize sync service lazily after initial load
  const initializeSyncService = useCallback(async () => {
    if (syncServiceRef.current || !isMultiDeviceEnabled) return;

    try {
      console.log('🔄 Initializing sync service (lazy load)...');
      const userName = localStorage.getItem('currentUserName') || 'Unknown User';
      syncServiceRef.current = new MultiDeviceSyncService(userName);
      
      // Setup event listeners
      syncServiceRef.current.onSyncEventReceived((event: SyncEvent) => {
        console.log('📥 Sync event:', event.type, event.field);
        setSyncEvents(prev => [event, ...prev.slice(0, 4)]); // Keep only 5 events
      });

      syncServiceRef.current.onDeviceCountChanged((count: number, devices: DeviceInfo[]) => {
        setDeviceCount(count);
        setActiveDevices(devices.slice(0, 10)); // Limit to 10 devices for performance
      });

      // LAZY CONNECT: Connect after a short delay to not block initial load
      setTimeout(async () => {
        if (syncServiceRef.current && isMultiDeviceEnabled) {
          try {
            await syncServiceRef.current.connect();
            console.log('✅ Sync service connected (lazy)');
          } catch (error) {
            console.warn('⚠️ Sync connection failed (non-blocking):', error);
          }
        }
      }, 2000); // 2 second delay after initial load

    } catch (error) {
      console.error('❌ Failed to initialize sync service:', error);
    }
  }, [isMultiDeviceEnabled]);

  // PERFORMANCE: Debounced batch sync function
  const debouncedBatchSync = useCallback(async () => {
    if (!isMultiDeviceEnabled || !syncServiceRef.current || pendingSyncData.current.size === 0) {
      return;
    }

    const fieldsToSync = Array.from(pendingSyncData.current);
    pendingSyncData.current.clear();

    try {
      console.log('🔄 Batch syncing fields:', fieldsToSync);
      
      const syncPromises = fieldsToSync.map(async (field) => {
        let data: any;
        switch (field) {
          case 'employees': data = employees; break;
          case 'tasks': data = tasks; break;
          case 'dailyData': data = dailyData; break;
          case 'completedTasks': data = Array.from(completedTasks); break;
          case 'taskAssignments': data = taskAssignments; break;
          case 'customRoles': data = customRoles; break;
          case 'prepItems': data = prepItems; break;
          case 'scheduledPreps': data = scheduledPreps; break;
          case 'prepSelections': data = prepSelections; break;
          case 'storeItems': data = storeItems; break;
          default: return;
        }
        
        return syncServiceRef.current!.syncData(field, data);
      });

      await Promise.allSettled(syncPromises); // Don't fail if one sync fails
      console.log('✅ Batch sync completed');
      
    } catch (error) {
      console.warn('⚠️ Batch sync failed (non-blocking):', error);
    }
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles, 
      prepItems, scheduledPreps, prepSelections, storeItems, isMultiDeviceEnabled]);

  // PERFORMANCE: Non-blocking main save function - FIXED to include all fields
  const debouncedSave = useCallback(async () => {
    if (isSavingRef.current || connectionStatus === 'error') {
      console.log('⏭️ Skipping save (already saving or offline)');
      return;
    }

    const currentDataHash = JSON.stringify({
      employees: employees.length,
      tasks: tasks.length,
      dailyDataKeys: Object.keys(dailyData).length,
      completedTasksSize: completedTasks.size,
      taskAssignmentsKeys: Object.keys(taskAssignments).length,
      customRolesLength: customRoles.length,
      prepItemsLength: prepItems.length,
      scheduledPrepsLength: scheduledPreps.length,
      prepSelectionsKeys: Object.keys(prepSelections).length,
      storeItemsLength: storeItems.length
    });

    if (currentDataHash === lastSaveDataRef.current) {
      return;
    }

    isSavingRef.current = true;
    console.log('💾 Saving data (non-blocking)...');
    
    try {
      // FIXED: Save to Firebase with ALL fields included
      await firebaseService.saveData({
        employees,
        tasks,
        dailyData,
        completedTasks,
        taskAssignments,
        customRoles,
        // FIXED: Include all prep and store fields
        prepItems,
        scheduledPreps,
        prepSelections,
        storeItems
      });

      setLastSync(new Date().toLocaleTimeString());
      lastSaveDataRef.current = currentDataHash;
      setConnectionStatus('connected');
      
      // Schedule batch sync (non-blocking) - only if we have real data
      if (isMultiDeviceEnabled && isInitializedRef.current) {
        pendingSyncData.current.add('employees');
        pendingSyncData.current.add('tasks');
        pendingSyncData.current.add('dailyData');
        pendingSyncData.current.add('completedTasks');
        pendingSyncData.current.add('taskAssignments');
        pendingSyncData.current.add('scheduledPreps');
        pendingSyncData.current.add('prepItems');
        pendingSyncData.current.add('prepSelections');
        pendingSyncData.current.add('storeItems');
        
        setTimeout(() => {
          debouncedBatchSync();
        }, 500); // Sync after save completes
      }
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      setConnectionStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [
    employees, tasks, dailyData, completedTasks, taskAssignments, customRoles,
    prepItems, scheduledPreps, prepSelections, storeItems,
    connectionStatus, isMultiDeviceEnabled, debouncedBatchSync
  ]);

  // PERFORMANCE: Longer debounce for main saves
  const saveToFirebase = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 2000); // Increased debounce to reduce save frequency
  }, [debouncedSave]);

  // PERFORMANCE: Fast, non-blocking load with enhanced prep data handling
  const loadFromFirebase = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      console.log('📡 Loading data (fast mode)...');
      
      // Load main data with timeout to prevent hanging
      const loadPromise = firebaseService.loadData();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Load timeout')), 10000) // 10 second timeout
      );

      const data = await Promise.race([loadPromise, timeoutPromise]) as any;

      const finalEmployees = migrateEmployeeData(data.employees);
      const finalTasks = migrateTaskData(data.tasks);
      const finalScheduledPreps = migrateScheduledPreps(data.scheduledPreps || []);

      // ENHANCED: Debug loaded scheduledPreps data with completion status
      console.log('🔍 Loading scheduledPreps from Firebase:', {
        count: finalScheduledPreps.length,
        todayPreps: finalScheduledPreps.filter((prep: any) => 
          prep.scheduledDate === getFormattedDate(new Date())
        ).length,
        todayCompleted: finalScheduledPreps.filter((prep: any) => 
          prep.scheduledDate === getFormattedDate(new Date()) && prep.completed === true
        ).length,
        sampleData: finalScheduledPreps.slice(0, 5).map((prep: any) => ({
          id: prep.id,
          name: prep.name,
          completed: prep.completed,
          scheduledDate: prep.scheduledDate
        })),
        rawDataSample: data.scheduledPreps ? data.scheduledPreps.slice(0, 3) : 'No raw data'
      });

      // Set data immediately
      setEmployees(finalEmployees);
      setTasks(finalTasks);
      setDailyData(data.dailyData);
      setCompletedTasks(new Set(data.completedTasks));
      setTaskAssignments(data.taskAssignments);
      setCustomRoles(data.customRoles);
      setPrepItems(data.prepItems || []);
      setScheduledPreps(finalScheduledPreps);
      setPrepSelections(data.prepSelections || {});
      setStoreItems(data.storeItems || getDefaultStoreItems());

      // ENHANCED: Log what we actually set for scheduledPreps with completion status
      const todayStr = getFormattedDate(new Date());
      const todayPreps = finalScheduledPreps.filter((prep: any) => prep.scheduledDate === todayStr);
      const todayCompleted = todayPreps.filter((prep: any) => prep.completed === true);
      
      console.log('✅ Set scheduledPreps state:', {
        count: finalScheduledPreps.length,
        todayCount: todayPreps.length,
        todayCompletedCount: todayCompleted.length,
        completionPercentage: todayPreps.length > 0 ? Math.round((todayCompleted.length / todayPreps.length) * 100) : 0
      });

      setConnectionStatus('connected');
      setLastSync(new Date().toLocaleTimeString());
      lastSaveDataRef.current = JSON.stringify({ loaded: true });
      isInitializedRef.current = true;

      console.log('✅ Data loaded successfully');

      // Initialize sync service AFTER load completes (non-blocking)
      if (isMultiDeviceEnabled) {
        setTimeout(() => {
          initializeSyncService();
        }, 1000);
      }

    } catch (error) {
      console.error('❌ Load failed:', error);
      setConnectionStatus('error');

      // Set defaults on error - but don't mark as initialized to prevent sync overwrite
      if (!isInitializedRef.current) {
        console.log('⚠️ Setting defaults due to load failure - sync disabled until manual load succeeds');
        setEmployees(getDefaultEmployees());
        setTasks(getDefaultTasks());
        setDailyData(getEmptyDailyData());
        setPrepItems([]);
        setScheduledPreps([]);
        setPrepSelections({});
        setStoreItems(getDefaultStoreItems());
        // DON'T set isInitializedRef.current = true here to prevent sync overwrite
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isMultiDeviceEnabled, initializeSyncService]);

  // CRITICAL FIX: Auto-save critical data immediately (includes scheduledPreps for prep completions)
  useEffect(() => {
    if (isInitializedRef.current) {
      saveToFirebase();
    }
  }, [employees, tasks, dailyData, completedTasks, taskAssignments, customRoles, scheduledPreps]);

  // PERFORMANCE: Separate effect for less critical data with longer debounce
  useEffect(() => {
    if (isInitializedRef.current) {
      const timer = setTimeout(() => {
        saveToFirebase();
      }, 3000); // 3 second delay for non-critical data
      
      return () => clearTimeout(timer);
    }
  }, [prepItems, prepSelections, storeItems]);

  // Save multi-device sync preference
  useEffect(() => {
    localStorage.setItem('workVibe_multiDeviceSyncEnabled', isMultiDeviceEnabled.toString());
  }, [isMultiDeviceEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (syncServiceRef.current) {
        syncServiceRef.current.disconnect().catch(console.error);
      }
    };
  }, []);

  // PERFORMANCE: Optimized toggle function
  const toggleMultiDeviceSync = useCallback(async () => {
    const newState = !isMultiDeviceEnabled;
    setIsMultiDeviceEnabled(newState);
    
    if (newState) {
      console.log('✅ Multi-device sync enabled');
      // Initialize lazily
      setTimeout(() => {
        initializeSyncService();
      }, 1000);
    } else {
      console.log('❌ Multi-device sync disabled');
      if (syncServiceRef.current) {
        await syncServiceRef.current.disconnect();
        syncServiceRef.current = null;
      }
      setActiveDevices([]);
      setDeviceCount(1);
      setSyncEvents([]);
    }
  }, [isMultiDeviceEnabled, initializeSyncService]);

  // PERFORMANCE: Fast refresh function with retry logic - FIXED for prep data
  const refreshFromAllDevices = useCallback(async () => {
    if (!isMultiDeviceEnabled || !syncServiceRef.current) {
      await loadFromFirebase();
      return;
    }

    try {
      console.log('🔄 Quick refresh...');
      
      // Quick refresh with timeout
      const refreshPromise = syncServiceRef.current.refreshDataFromAllDevices();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Refresh timeout')), 5000)
      );

      const syncData = await Promise.race([refreshPromise, timeoutPromise]) as any;
      
      // FIXED: Apply all data immediately including prep and store data
      if (syncData.employees) setEmployees(migrateEmployeeData(syncData.employees));
      if (syncData.tasks) setTasks(migrateTaskData(syncData.tasks));
      if (syncData.dailyData) setDailyData(syncData.dailyData);
      if (syncData.completedTasks) setCompletedTasks(new Set(syncData.completedTasks));
      if (syncData.taskAssignments) setTaskAssignments(syncData.taskAssignments);
      if (syncData.prepItems) setPrepItems(syncData.prepItems);
      if (syncData.scheduledPreps) {
        const migratedScheduledPreps = migrateScheduledPreps(syncData.scheduledPreps);
        setScheduledPreps(migratedScheduledPreps);
        
        // ENHANCED: Log refreshed prep data with completion status
        const todayStr = getFormattedDate(new Date());
        const todayPreps = migratedScheduledPreps.filter((prep: any) => prep.scheduledDate === todayStr);
        const todayCompleted = todayPreps.filter((prep: any) => prep.completed === true);
        
        console.log('🔄 Refreshed scheduledPreps from sync:', {
          count: migratedScheduledPreps.length,
          todayCount: todayPreps.length,
          todayCompletedCount: todayCompleted.length,
          completionPercentage: todayPreps.length > 0 ? Math.round((todayCompleted.length / todayPreps.length) * 100) : 0
        });
      }
      if (syncData.prepSelections) setPrepSelections(syncData.prepSelections);
      if (syncData.storeItems) setStoreItems(syncData.storeItems);
      
      setLastSync(new Date().toLocaleTimeString());
      console.log('✅ Quick refresh completed');
      
    } catch (error) {
      console.warn('⚠️ Quick refresh failed, falling back to normal load:', error);
      await loadFromFirebase();
    }
  }, [isMultiDeviceEnabled, loadFromFirebase]);

  // Manual retry function for when initial load fails
  const retryLoadFromFirebase = useCallback(async () => {
    console.log('🔄 Manual retry of Firebase load...');
    try {
      await loadFromFirebase();
      if (connectionStatus === 'connected') {
        console.log('✅ Manual retry succeeded - enabling sync');
        isInitializedRef.current = true; // Now we can safely sync
      }
    } catch (error) {
      console.error('❌ Manual retry failed:', error);
    }
  }, [loadFromFirebase, connectionStatus]);

  return {
    // State
    isLoading,
    lastSync,
    connectionStatus,
    employees,
    tasks,
    dailyData,
    completedTasks,
    taskAssignments,
    customRoles,
    prepItems,
    scheduledPreps,
    prepSelections,
    storeItems,
    
    // Multi-device sync state
    activeDevices,
    syncEvents,
    deviceCount,
    isMultiDeviceEnabled,

    // Setters
    setEmployees,
    setTasks,
    setDailyData,
    setCompletedTasks,
    setTaskAssignments,
    setCustomRoles,
    setPrepItems,
    setScheduledPreps,
    setPrepSelections,
    setStoreItems,

    // Actions
    loadFromFirebase,
    saveToFirebase,
    quickSave,
    toggleMultiDeviceSync,
    refreshFromAllDevices,
    retryLoadFromFirebase
  };
};

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({ id: 1, name: 'Luka' });
  const [isAdmin, setIsAdmin] = useState(false);

  const switchUser = useCallback((employee: Employee) => {
    setCurrentUser({ id: employee.id, name: employee.name });
    localStorage.setItem('currentUserName', employee.name);
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdmin(false);
  }, []);

  useEffect(() => {
    if (currentUser.name) {
      localStorage.setItem('currentUserName', currentUser.name);
    }
  }, [currentUser.name]);

  return {
    currentUser,
    isAdmin,
    setCurrentUser,
    setIsAdmin,
    switchUser,
    logoutAdmin
  };
};
