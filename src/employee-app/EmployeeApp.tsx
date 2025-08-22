// EmployeeApp.tsx - Updated with Restaurant Inventory tab integration
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  CheckSquare, 
  TrendingUp, 
  Settings, 
  Lock, 
  LogOut, 
  Database, 
  ChevronDown, 
  X, 
  Check, 
  ShoppingBag, 
  ChefHat,
  UtensilsCrossed // New icon for inventory
} from 'lucide-react';

// Components
import MoodTracker from './MoodTracker';
import TaskManager from './TaskManager';
import Store from './Store';
import AdminPanel from './AdminPanel';
import DailyReports from './DailyReports';
import PrepListPrototype from './PrepListPrototype';
import RestaurantInventory from './inventory/RestaurantInventory'; // NEW: Inventory component
import SyncStatusIndicator from './SyncStatusIndicator';
import RealTimeSyncIndicator from './RealTimeSyncIndicator'; // NEW: Real-time sync indicator
// import CrossTabDebugPanel from './CrossTabDebugPanel'; // Hidden per user request

// Hooks and Functions
import { useFirebaseData, useAuth, useTaskRealtimeSync } from './hooks';
import { handleAdminLogin } from './adminFunctions';
import { offlineQueue, resolveTaskConflicts } from './taskOperations';
import type { SyncOperation } from './OperationManager';
import { MultiDeviceSyncService } from './multiDeviceSync';
import type { DeviceInfo, SyncEvent } from './multiDeviceSync';

// Types and Constants
import { getFormattedDate } from './utils';
import { getDefaultStoreItems } from './defaultData';
import type { ActiveTab, Employee, Task, DailyDataMap, TaskAssignments, StoreItem } from './types';

// Extend ActiveTab type to include inventory
type ExtendedActiveTab = ActiveTab | 'inventory';

const EmployeeApp: React.FC = () => {
  // FirebaseService instance for meta operations
  const firebaseMeta = React.useRef<any>(null);
  if (!firebaseMeta.current) {
    firebaseMeta.current = new (require('./firebaseService').FirebaseService)();
  }

  // Track initialization to prevent race conditions with real-time listeners
  const isInitializedRef = React.useRef<boolean>(false);

  // Firebase and Auth hooks with multi-device sync
  const {
    isLoading,
    lastSync,
    connectionStatus,
    employees,
    tasks,
    dailyData,
    completedTasks,
    taskAssignments,
    customRoles,
    prepItems: _prepItems,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    scheduledPreps: _scheduledPreps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    prepSelections: _prepSelections,
    storeItems: firebaseStoreItems,
    inventoryDailyItems,
    inventoryWeeklyItems,
    inventoryMonthlyItems,
    inventoryDatabaseItems,
    inventoryActivityLog,
    inventoryCustomCategories,
    stockCountSnapshots,
    dailyInventorySnapshots,
    inventoryHistoricalSnapshots,
    setEmployees,
    setTasks,
    setDailyData,
    setCompletedTasks,
    setTaskAssignments,
    setCustomRoles,
    setPrepItems,
    setScheduledPreps,
    setPrepSelections,
    setStoreItems: setFirebaseStoreItems,
    setInventoryDailyItems,
    setInventoryWeeklyItems,
    setInventoryMonthlyItems,
    setInventoryDatabaseItems,
    setInventoryActivityLog,
    setInventoryCustomCategories,
    setStockCountSnapshots,
    setDailyInventorySnapshots,
    setInventoryHistoricalSnapshots,
    loadFromFirebase,
    saveToFirebase,
    quickSave,
    quickSaveImmediate,
    setSyncService,
    applyTaskSyncOperation,
    setConnectionStatus
  } = useFirebaseData();

  // Real-time cleaning tasks sync with debouncing to prevent oscillation
  useEffect(() => {
    if (!firebaseMeta.current) return;
    
    // Debounce incoming real-time updates to prevent rapid oscillation between devices
    let completedTasksTimeout: NodeJS.Timeout;
    let assignmentsTimeout: NodeJS.Timeout;
    
    const unsubscribeCompleted = firebaseMeta.current.onCompletedTasksChange((newCompleted: number[] | Set<number>) => {
      clearTimeout(completedTasksTimeout);
      completedTasksTimeout = setTimeout(() => {
        console.log('🔄 [SYNC] Received completedTasks update from Firebase:', newCompleted);
        
        // Create new set from received data
        const newSet = new Set(Array.isArray(newCompleted) ? newCompleted : Array.from(newCompleted));
        
        // Use callback to get current state for comparison
        setCompletedTasks(currentTasks => {
          const currentArray = Array.from(currentTasks);
          const newArray = Array.from(newSet);
          
          // Only update if there's an actual difference
          if (currentArray.length !== newArray.length || !currentArray.every(id => newSet.has(id))) {
            console.log('🔄 [SYNC] CompletedTasks actually changed, updating state');
            return newSet;
          } else {
            console.log('🔄 [SYNC] CompletedTasks unchanged, keeping current state');
            return currentTasks;
          }
        });
      }, 150); // 150ms debounce to prevent oscillation
    });
    
    const unsubscribeAssignments = firebaseMeta.current.onTaskAssignmentsChange((newAssignments: any) => {
      clearTimeout(assignmentsTimeout);
      assignmentsTimeout = setTimeout(() => {
        console.log('🔄 [SYNC] Received taskAssignments update from Firebase:', newAssignments);
        
        // Use callback to get current state for comparison
        setTaskAssignments(currentAssignments => {
          const currentStr = JSON.stringify(currentAssignments);
          const newStr = JSON.stringify(newAssignments || {});
          
          if (currentStr !== newStr) {
            console.log('🔄 [SYNC] TaskAssignments actually changed, updating state');
            return newAssignments || {};
          } else {
            console.log('🔄 [SYNC] TaskAssignments unchanged, keeping current state');
            return currentAssignments;
          }
        });
      }, 150); // 150ms debounce to prevent oscillation
    });
    
    return () => {
      clearTimeout(completedTasksTimeout);
      clearTimeout(assignmentsTimeout);
      if (unsubscribeCompleted) unsubscribeCompleted();
      if (unsubscribeAssignments) unsubscribeAssignments();
    };
  }, [setCompletedTasks, setTaskAssignments]); // Only depend on setters

  const {
    currentUser,
    isAdmin,
    setIsAdmin,
    switchUser,
    logoutAdmin
  } = useAuth();

  // UI State
  const [userMood, setUserMood] = useState(3);
  const [activeTab, setActiveTab] = useState<ExtendedActiveTab>('mood'); // Updated type
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedDate, setSelectedDate] = useState(getFormattedDate(new Date()));
  const [storeItems, setStoreItems] = useState<StoreItem[]>(getDefaultStoreItems());
  const [showDailyResetNotification, setShowDailyResetNotification] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);

  // Multi-device sync state
  const [activeDevices, setActiveDevices] = useState<DeviceInfo[]>([]);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [deviceCount, setDeviceCount] = useState(1);
  const [isMultiDeviceEnabled, setIsMultiDeviceEnabled] = useState(true);
  const [syncMode, setSyncMode] = useState<string>('firebase');
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  
  // Multi-device sync service
  const syncServiceRef = useRef<MultiDeviceSyncService | null>(null);

  // State for task operations history
  const [taskOperations, setTaskOperations] = useState<SyncOperation[]>([]);

  // Initialize on mount - FIXED: Prevent race condition with real-time listeners
  useEffect(() => {
    let mounted = true;
    
    const initializeApp = async () => {
      // FIXED: Don't depend on employees.length which can be populated by real-time listeners
      // Instead, use a ref to track if we've already initialized
      if (mounted && !isInitializedRef.current) {
        console.log('🚀 Initializing app...');
        isInitializedRef.current = true;
        
        // Always call loadFromFirebase to ensure proper initialization
        await loadFromFirebase();
        
        // CRITICAL: Initialize daily snapshot automation to prevent historical data corruption
        if (mounted) {
          try {
            const { initializeDailySnapshotAutomation } = await import('./inventory/dailySnapshotAutomation');
            const { FirebaseService } = await import('./firebaseService');
            
            // Create a Firebase service instance for automation
            const automationFirebaseService = new FirebaseService();
            
            // Initialize and start daily snapshot automation
            const automation = initializeDailySnapshotAutomation(automationFirebaseService);
            
            console.log('📸 Daily snapshot automation initialized successfully');
            console.log('🛡️ Historical data corruption prevention active');
            
            // Store automation instance for cleanup
            (window as any).__snapshotAutomation = automation;
            
          } catch (error) {
            console.error('❌ Failed to initialize daily snapshot automation:', error);
            console.warn('⚠️ Historical data may not be automatically preserved');
          }
        }
      }
    };
    
    initializeApp();
    
    return () => {
      mounted = false;
      
      // Cleanup automation on unmount
      if ((window as any).__snapshotAutomation) {
        (window as any).__snapshotAutomation.stop();
        delete (window as any).__snapshotAutomation;
      }
    };
    // FIXED: Remove loadFromFirebase dependency to prevent infinite retry loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize Multi-Device Sync Service
  useEffect(() => {
    if (!syncServiceRef.current && currentUser) {
      console.log('🔄 Initializing Multi-Device Sync Service...');
      
      syncServiceRef.current = new MultiDeviceSyncService(currentUser.name);
      
      // Set up event handlers
      syncServiceRef.current.onDeviceCountChanged((count, devices) => {
        setDeviceCount(count);
        setActiveDevices(devices);
      });
      
      syncServiceRef.current.onSyncEventReceived((event) => {
        setSyncEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
      });
      
      // Set up field change listeners for real-time sync
      syncServiceRef.current.onFieldChange('completedTasks', (data) => {
        if (data instanceof Set) {
          setCompletedTasks(data);
        } else if (Array.isArray(data)) {
          setCompletedTasks(new Set(data));
        }
      });
      
      syncServiceRef.current.onFieldChange('taskAssignments', setTaskAssignments);
      syncServiceRef.current.onFieldChange('employees', setEmployees);
      syncServiceRef.current.onFieldChange('tasks', setTasks);
      syncServiceRef.current.onFieldChange('dailyData', setDailyData);
      
      // FIXED: Add prep fields to multi-device sync
      syncServiceRef.current.onFieldChange('prepSelections', setPrepSelections);
      syncServiceRef.current.onFieldChange('scheduledPreps', setScheduledPreps);
      syncServiceRef.current.onFieldChange('prepItems', setPrepItems);
      
      // Connect the service
      syncServiceRef.current.connect().catch(console.error);
      
      // FIXED: Connect sync service to hooks for prep data cross-tab sync
      setSyncService(syncServiceRef.current);
      
      // Periodic sync stats update to track fallback mode and connection status
      const updateSyncStats = () => {
        if (syncServiceRef.current) {
          const stats = syncServiceRef.current.getSyncStats();
          setSyncMode(stats.syncMode);
          setIsUsingFallback(stats.isUsingFallback);
          
          // FIXED: Update connection status based on sync service status
          if (stats.isConnected) {
            setConnectionStatus('connected');
          } else {
            setConnectionStatus('error');
          }
        }
      };
      
      // Initial update
      setTimeout(updateSyncStats, 1000);
      
      // Periodic updates
      const statsInterval = setInterval(updateSyncStats, 5000);
      
      return () => {
        clearInterval(statsInterval);
      };
    }
    
    return () => {
      if (syncServiceRef.current) {
        syncServiceRef.current.disconnect();
        syncServiceRef.current = null;
      }
    };
  }, [currentUser, setCompletedTasks, setDailyData, setEmployees, setTaskAssignments, setTasks, setPrepSelections, setScheduledPreps, setPrepItems, setSyncService, setConnectionStatus]);

  // Set up periodic auto-save (every 5 minutes)
  // Set up periodic auto-save (every 5 minutes) with logging for cleaning tasks
  useEffect(() => {
    const interval = setInterval(async () => {
      if (connectionStatus === 'connected' && !isLoading) {
        console.log('🧹 [AUTO-SAVE] Cleaning tasks: Initiating periodic auto-save...');
        try {
          await saveToFirebase();
          // Verification: reload and compare
          const verify = async () => {
            const data = await firebaseMeta.current.getCleaningTasksData?.();
            if (data) {
              const completedMatch = Array.from(completedTasks).every(t => data.completedTasks?.includes?.(t));
              const assignmentsMatch = JSON.stringify(taskAssignments) === JSON.stringify(data.taskAssignments);
              if (completedMatch && assignmentsMatch) {
                console.log('✅ [AUTO-SAVE] Cleaning tasks verified after save.');
              } else {
                console.warn('⚠️ [AUTO-SAVE] Cleaning tasks verification failed.', { completedMatch, assignmentsMatch, data });
              }
            } else {
              console.warn('⚠️ [AUTO-SAVE] Cleaning tasks verification: No data returned.');
            }
          };
          verify();
        } catch (err) {
          console.error('❌ [AUTO-SAVE] Cleaning tasks save failed:', err);
        }
      }
    }, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [connectionStatus, isLoading, saveToFirebase, completedTasks, taskAssignments]);

  // FIXED: Track completedTasks changes and notify sync service for proper merging
  useEffect(() => {
    if (syncServiceRef.current && completedTasks) {
      // Update the sync service with current state so it can merge properly
      syncServiceRef.current.updateFieldState('completedTasks', completedTasks);
    }
  }, [completedTasks]);

  // Simple daily reset check on startup only
  useEffect(() => {
    if (!isLoading && connectionStatus === 'connected') {
      const checkForNewDay = async () => {
        const today = getFormattedDate(new Date());
        
        // Check Firebase shared state first to prevent unnecessary resets from new devices
        let lastResetDate: string | null = null;
        try {
          lastResetDate = await firebaseMeta.current?.getLastTaskResetDate?.();
        } catch (error) {
          console.warn('⚠️ Failed to check Firebase reset date, falling back to localStorage:', error);
        }
        
        // Fall back to localStorage if Firebase check failed
        if (!lastResetDate) {
          lastResetDate = localStorage.getItem('lastTaskResetDate');
        }
        
        // ONLY trigger if date changed AND no reset was done today globally
        if (lastResetDate !== today) {
          console.log('🌅 NEW DAY DETECTED: Performing simple daily reset');
          
          // Reset cleaning tasks
          setCompletedTasks(new Set());
          setTaskAssignments({});
          localStorage.setItem('lastTaskResetDate', today);
          
          // Save to Firebase
          Promise.all([
            quickSave('completedTasks', []),
            quickSave('taskAssignments', {}),
            firebaseMeta.current?.setLastTaskResetDate?.(today)
          ]).then(() => {
            console.log('✅ SIMPLE RESET: Daily reset completed and saved');
          }).catch((error) => {
            console.error('❌ SIMPLE RESET: Failed to save:', error);
          });
          
          // Show notification
          setShowDailyResetNotification(true);
          setTimeout(() => {
            setShowDailyResetNotification(false);
          }, 8000);
        } else if (lastResetDate === today) {
          // Reset was already done today, just update localStorage to sync with global state
          localStorage.setItem('lastTaskResetDate', today);
          console.log('📅 Daily reset already completed today, device now synchronized');
        }
      };

      // Check once on startup with a small delay
      const timer = setTimeout(checkForNewDay, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, connectionStatus, setCompletedTasks, setTaskAssignments, quickSave]);




  // Update user mood when current user changes
  useEffect(() => {
    const currentEmployee = employees.find(emp => emp.id === currentUser.id);
    if (currentEmployee) {
      setUserMood(currentEmployee.mood);
    }
  }, [currentUser.id, employees]);

  // Restore current user from localStorage when employees are loaded
  useEffect(() => {
    if (employees.length > 0) {
      const savedUserName = localStorage.getItem('currentUserName');
      if (savedUserName) {
        const savedEmployee = employees.find(emp => emp.name === savedUserName);
        if (savedEmployee && savedEmployee.id !== currentUser.id) {
          // Restore the saved user
          switchUser(savedEmployee);
        }
      }
    }
  }, [employees, currentUser.id, switchUser]);

  // Sync Firebase store items with local state
  useEffect(() => {
    if (firebaseStoreItems && firebaseStoreItems.length > 0) {
      setStoreItems(firebaseStoreItems);
    }
  }, [firebaseStoreItems]);

  // Calculate conflicts
  useEffect(() => {
    const conflicts = taskOperations.length - resolveTaskConflicts(taskOperations).length;
    setConflictCount(conflicts);
  }, [taskOperations]);

  // Handle task operations
  const handleTaskOperation = useCallback((op: SyncOperation) => {
    setTaskOperations(prev => [...prev, op]);
    applyTaskSyncOperation(op);
  }, [applyTaskSyncOperation]);

  // Subscribe to WebSocket
  useTaskRealtimeSync(handleTaskOperation);

  // Offline queue handler
  useEffect(() => {
    const handleOnline = () => {
      offlineQueue.processQueue(async (op) => {
        // wsManager.sendOperation(op, 'normal');
      });
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Optimized data change handler
  const handleDataChange = useCallback(() => {
    if (connectionStatus === 'connected') {
      saveToFirebase();
    }
  }, [connectionStatus, saveToFirebase]);

  // Enhanced setters that trigger save
  const setEmployeesWithSave = useCallback((value: React.SetStateAction<Employee[]>) => {
    setEmployees(value);
    handleDataChange();
  }, [setEmployees, handleDataChange]);

  const setTasksWithSave = useCallback((value: React.SetStateAction<Task[]>) => {
    setTasks(value);
    handleDataChange();
  }, [setTasks, handleDataChange]);

  const setDailyDataWithSave = useCallback((updater: (prev: DailyDataMap) => DailyDataMap) => {
    setDailyData(updater);
    handleDataChange();
  }, [setDailyData, handleDataChange]);

  // Enhanced setters for cleaning tasks with logging and verification
  // Critical QuickSave flow for completedTasks (instant, confirmed, verified)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setCompletedTasksWithSave = useCallback(async (tasks: Set<number>) => {
    console.log('🔥 [CRITICAL-SAVE] Cleaning tasks: About to save completedTasks:', Array.from(tasks));
    try {
      const result = await quickSave('completedTasks', Array.from(tasks));
      if (result === true) {
        console.log('🔒 [CRITICAL-SAVE] CompletedTasks QuickSave confirmed by Firebase.');
        setCompletedTasks(tasks);
        // Verification
        const data = await firebaseMeta.current.getCleaningTasksData?.();
        if (data) {
          const completedMatch = Array.from(tasks).every(t => data.completedTasks?.includes?.(t));
          if (completedMatch) {
            console.log('✅ [CRITICAL-SAVE] Completed tasks successfully verified in Firebase.');
          } else {
            console.warn('⚠️ [CRITICAL-SAVE] Completed tasks verification failed.', { tasks, data });
          }
        }
      } else {
        console.error('❌ [CRITICAL-SAVE] CompletedTasks QuickSave failed:', result);
      }
    } catch (err) {
      console.error('❌ [CRITICAL-SAVE] CompletedTasks QuickSave error:', err);
    }
  }, [quickSave, setCompletedTasks]);

  // Critical QuickSave flow for taskAssignments (instant, confirmed, verified)
  const setTaskAssignmentsWithSave = useCallback(async (updater: (prev: TaskAssignments) => TaskAssignments) => {
    const newAssignments = typeof updater === 'function' ? updater({ ...taskAssignments }) : updater;
    console.log('🔥 [CRITICAL-SAVE] Cleaning tasks: About to save taskAssignments:', newAssignments);
    try {
      const result = await quickSave('taskAssignments', newAssignments);
      if (result === true) {
        console.log('🔒 [CRITICAL-SAVE] TaskAssignments QuickSave confirmed by Firebase.');
        setTaskAssignments(() => newAssignments);
        // Verification
        const data = await firebaseMeta.current.getCleaningTasksData?.();
        if (data) {
          const assignmentsMatch = JSON.stringify(newAssignments) === JSON.stringify(data.taskAssignments);
          if (assignmentsMatch) {
            console.log('✅ [CRITICAL-SAVE] Task assignments successfully verified in Firebase.');
          } else {
            console.warn('⚠️ [CRITICAL-SAVE] Task assignments verification failed.', { newAssignments, data });
          }
        }
      } else {
        console.error('❌ [CRITICAL-SAVE] TaskAssignments QuickSave failed:', result);
      }
    } catch (err) {
      console.error('❌ [CRITICAL-SAVE] TaskAssignments QuickSave error:', err);
    }
  }, [quickSave, setTaskAssignments, taskAssignments]);

  const setCustomRolesWithSave = useCallback((value: React.SetStateAction<string[]>) => {
    setCustomRoles(value);
    handleDataChange();
  }, [setCustomRoles, handleDataChange]);

  const setStoreItemsWithSave = useCallback((value: React.SetStateAction<StoreItem[]>) => {
    const newItems = typeof value === 'function' ? value(storeItems) : value;
    setStoreItems(newItems);
    setFirebaseStoreItems(() => newItems);
    handleDataChange();
  }, [storeItems, setFirebaseStoreItems, handleDataChange]);



  // Admin Login Modal logic
  const handleAdminLoginSubmit = useCallback(() => {
    handleAdminLogin(adminPassword, setIsAdmin, setActiveTab, setAdminPassword);
    setShowAdminLogin(false);
  }, [adminPassword, setIsAdmin, setActiveTab, setAdminPassword]);

  // Event handlers
  const handleUserSwitch = (employee: Employee) => {
    switchUser(employee);
    setShowUserSwitcher(false);
    setActiveTab('mood');
  };

  const handleAdminLogout = () => {
    logoutAdmin();
    setActiveTab('mood');
  };

  const currentEmployee = employees.find(emp => emp.id === currentUser.id);

  // Multi-device sync helper functions
  const toggleMultiDeviceSync = useCallback(() => {
    setIsMultiDeviceEnabled(prev => !prev);
    if (syncServiceRef.current) {
      if (isMultiDeviceEnabled) {
        syncServiceRef.current.disconnect();
      } else {
        syncServiceRef.current.connect();
      }
    }
  }, [isMultiDeviceEnabled]);

  const refreshFromAllDevices = useCallback(async () => {
    if (syncServiceRef.current) {
      try {
        console.log('🔄 Refreshing data from all devices...');
        const syncData = await syncServiceRef.current.refreshDataFromAllDevices();
        
        // Apply the synced data
        if (syncData.employees) setEmployees(syncData.employees);
        if (syncData.tasks) setTasks(syncData.tasks);
        if (syncData.dailyData) setDailyData(syncData.dailyData);
        if (syncData.completedTasks) {
          if (Array.isArray(syncData.completedTasks)) {
            setCompletedTasks(new Set(syncData.completedTasks));
          }
        }
        if (syncData.taskAssignments) setTaskAssignments(syncData.taskAssignments);
        
        // FIXED: Apply prep data from sync
        if (syncData.prepSelections) setPrepSelections(syncData.prepSelections);
        if (syncData.scheduledPreps) setScheduledPreps(syncData.scheduledPreps);
        if (syncData.prepItems) setPrepItems(syncData.prepItems);
        
        console.log('✅ Data refreshed from all devices');
      } catch (error) {
        console.error('❌ Failed to refresh from all devices:', error);
      }
    } else {
      // Fallback to regular Firebase refresh
      await loadFromFirebase();
    }
  }, [loadFromFirebase, setEmployees, setTasks, setDailyData, setCompletedTasks, setTaskAssignments, setPrepSelections, setScheduledPreps, setPrepItems]);

  // Simple daily reset - only checks on app startup



  // Simple debug helper
  useEffect(() => {
    console.log('📊 SIMPLE RESET DEBUG:', {
      currentDate: getFormattedDate(new Date()),
      lastResetDate: localStorage.getItem('lastTaskResetDate'),
      completedTasksCount: completedTasks.size,
      taskAssignmentsCount: Object.keys(taskAssignments).length,
      isLoading,
      connectionStatus,
      employeeCount: employees.length
    });
  }, [isLoading, connectionStatus, employees.length, completedTasks.size, taskAssignments]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800">WorkVibe</h1>
              <button
                onClick={() => setShowUserSwitcher(!showUserSwitcher)}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800 mt-1"
              >
                Hello, {currentUser.name}! 
                <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  {currentEmployee?.points || 0} pts
                </span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>
            </div>
            {isAdmin && (
              <div className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                Admin Mode
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <button
                onClick={handleAdminLogout}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                title="Logout Admin"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setShowAdminLogin(true)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              title="Admin Login"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Switcher Dropdown */}
        {showUserSwitcher && (
          <div className="absolute top-16 left-4 bg-white border rounded-lg shadow-lg z-40 w-64">
            <div className="p-3 border-b bg-gray-50">
              <div className="text-sm font-medium text-gray-700">Switch Employee</div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => handleUserSwitch(emp)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between ${
                    currentUser.id === emp.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      emp.mood === 1 ? 'bg-red-500' :
                      emp.mood === 2 ? 'bg-orange-500' :
                      emp.mood === 3 ? 'bg-yellow-500' :
                      emp.mood === 4 ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <div className="font-medium text-gray-800">{emp.name}</div>
                      <div className="text-xs text-gray-500">
                        {emp.role} • {emp.points} pts
                      </div>
                    </div>
                  </div>
                  {currentUser.id === emp.id && (
                    <Check className="w-4 h-4 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('mood')}
            className={`flex-shrink-0 py-3 px-4 text-center ${
              activeTab === 'mood' 
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <TrendingUp className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Mood Tracker</span>
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-shrink-0 py-3 px-4 text-center ${
              activeTab === 'tasks' 
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <CheckSquare className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Cleaning Tasks</span>
          </button>
          <button
            onClick={() => setActiveTab('prep')}
            className={`flex-shrink-0 py-3 px-4 text-center ${
              activeTab === 'prep' 
                ? 'border-b-2 border-green-500 text-green-600 bg-green-50' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <ChefHat className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Prep List</span>
          </button>
          {/* NEW: Restaurant Inventory Tab */}
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-shrink-0 py-3 px-4 text-center ${
              activeTab === 'inventory' 
                ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Restaurant Inventory</span>
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={`flex-shrink-0 py-3 px-4 text-center ${
              activeTab === 'store' 
                ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <ShoppingBag className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Store</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-shrink-0 py-3 px-4 text-center ${
                activeTab === 'admin' 
                  ? 'border-b-2 border-red-500 text-red-600 bg-red-50' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Settings className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm">Admin Panel</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-shrink-0 py-3 px-4 text-center ${
                activeTab === 'reports' 
                  ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Database className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm">Daily Reports</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-6">
        {/* Daily Reset Notification */}
        {showDailyResetNotification && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-lg backdrop-blur-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-blue-800">
                    🌅 New Day, Fresh Start!
                  </h3>
                  <p className="mt-1 text-sm text-blue-600">
                    All cleaning tasks and assignments have been reset for today. Time to start fresh and earn those points!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Enhanced Sync Status Indicator with Multi-Device Support */}
        <SyncStatusIndicator
          isLoading={isLoading}
          lastSync={lastSync}
          connectionStatus={connectionStatus}
          loadFromFirebase={loadFromFirebase}
          conflictCount={conflictCount}
          activeDevices={activeDevices}
          syncEvents={syncEvents}
          deviceCount={deviceCount}
          isMultiDeviceEnabled={isMultiDeviceEnabled}
          toggleMultiDeviceSync={toggleMultiDeviceSync}
          refreshFromAllDevices={refreshFromAllDevices}
          syncMode={syncMode}
          isUsingFallback={isUsingFallback}
        />

        {/* Cross-Tab Debug Panel for monitoring rapid click coordination - Hidden per user request */}
        {/* <CrossTabDebugPanel isVisible={true} /> */}

        {/* Tab Content */}
        {activeTab === 'mood' && (
          <MoodTracker
            currentUser={currentUser}
            employees={employees}
            userMood={userMood}
            setUserMood={setUserMood}
            setEmployees={setEmployeesWithSave}
            setDailyData={setDailyDataWithSave}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskManager
            currentUser={currentUser}
            tasks={tasks}
            employees={employees}
            taskAssignments={taskAssignments}
            dailyData={dailyData}
            setTaskAssignments={setTaskAssignmentsWithSave}
            setDailyData={setDailyDataWithSave}
            setEmployees={setEmployeesWithSave}
            saveToFirebase={saveToFirebase}
          />
        )}

        {activeTab === 'prep' && (
          <PrepListPrototype
            currentUser={currentUser}
            connectionStatus={connectionStatus}
            quickSave={quickSave}
            quickSaveImmediate={quickSaveImmediate}
          />
        )}

        {/* NEW: Restaurant Inventory Tab Content */}
        {activeTab === 'inventory' && (
          <RestaurantInventory
            currentUser={currentUser}
            connectionStatus={connectionStatus}
            employees={employees}
            isAdmin={isAdmin} // NEW: Pass admin state to inventory
            inventoryDailyItems={inventoryDailyItems}
            inventoryWeeklyItems={inventoryWeeklyItems}
            inventoryMonthlyItems={inventoryMonthlyItems}
            inventoryDatabaseItems={inventoryDatabaseItems}
            inventoryActivityLog={inventoryActivityLog}
            inventoryCustomCategories={inventoryCustomCategories}
            stockCountSnapshots={stockCountSnapshots}
            dailyInventorySnapshots={dailyInventorySnapshots}
            inventoryHistoricalSnapshots={inventoryHistoricalSnapshots}
            setInventoryDailyItems={setInventoryDailyItems}
            setInventoryWeeklyItems={setInventoryWeeklyItems}
            setInventoryMonthlyItems={setInventoryMonthlyItems}
            setInventoryDatabaseItems={setInventoryDatabaseItems}
            setInventoryActivityLog={setInventoryActivityLog}
            setInventoryCustomCategories={setInventoryCustomCategories}
            setStockCountSnapshots={setStockCountSnapshots}
            setDailyInventorySnapshots={setDailyInventorySnapshots}
            setInventoryHistoricalSnapshots={setInventoryHistoricalSnapshots}
            quickSave={quickSave}
          />
        )}

        {activeTab === 'store' && (
          <Store
            currentUser={currentUser}
            employees={employees}
            storeItems={storeItems}
            dailyData={dailyData}
            setEmployees={setEmployeesWithSave}
            setDailyData={setDailyDataWithSave}
            saveToFirebase={saveToFirebase}
            quickSave={quickSave}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPanel
            employees={employees}
            tasks={tasks}
            customRoles={customRoles}
            storeItems={storeItems}
            prepItems={_prepItems}
            setEmployees={setEmployeesWithSave}
            setTasks={setTasksWithSave}
            setCustomRoles={setCustomRolesWithSave}
            setStoreItems={setStoreItemsWithSave}
            setPrepItems={setPrepItems}
            quickSave={quickSave}
          />
        )}

        {activeTab === 'reports' && isAdmin && (
          <DailyReports
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dailyData={dailyData}
            employees={employees}
            connectionStatus={connectionStatus as any}
          />
        )}
      </div>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Admin Access
              </h3>
              <button
                onClick={() => {
                  setShowAdminLogin(false);
                  setAdminPassword('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLoginSubmit()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={handleAdminLoginSubmit}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside handlers */}
      {(showUserSwitcher || showAdminLogin) && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => {
            setShowUserSwitcher(false);
            if (!showAdminLogin) {
              setShowAdminLogin(false);
            }
          }}
        />
      )}
      
      {/* Real-time sync indicator */}
      <RealTimeSyncIndicator />
    </div>
  );
};

export default EmployeeApp;
