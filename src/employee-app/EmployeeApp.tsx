// EmployeeApp.tsx - Updated with Restaurant Inventory tab integration
import React, { useState, useEffect, useCallback } from 'react';
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

// Hooks and Functions - Updated to use reliable sync
import { useAuth } from './hooks';
import { useReliableSync } from './useReliableSync';
import { handleAdminLogin } from './adminFunctions';

// Types and Constants
import { getFormattedDate } from './utils';
import { getDefaultStoreItems } from './defaultData';
import type { ActiveTab, Employee, Task, DailyDataMap, TaskAssignments, StoreItem } from './types';
import type { PrepItem, ScheduledPrep, PrepSelections } from './prep-types';

// Extend ActiveTab type to include inventory
type ExtendedActiveTab = ActiveTab | 'inventory';

const EmployeeApp: React.FC = () => {
  // FirebaseService instance for meta operations
  const firebaseMeta = React.useRef<any>(null);
  if (!firebaseMeta.current) {
    firebaseMeta.current = new (require('./firebaseService').FirebaseService)();
  }

  // Get user info first
  const {
    currentUser,
    isAdmin,
    setIsAdmin,
    switchUser,
    logoutAdmin
  } = useAuth();

  // Reliable multi-device sync with guaranteed cross-page synchronization
  const {
    // Data state
    employees,
    tasks,
    dailyData,
    completedTasks,
    taskAssignments,
    customRoles,
    prepItems,
    scheduledPreps,
    prepSelections,
    storeItems: firebaseStoreItems,
    inventoryDailyItems,
    inventoryWeeklyItems,
    inventoryMonthlyItems,
    inventoryDatabaseItems,
    inventoryActivityLog,
    
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
    setStoreItems: setFirebaseStoreItems,
    setInventoryDailyItems,
    setInventoryWeeklyItems,
    setInventoryMonthlyItems,
    setInventoryDatabaseItems,
    setInventoryActivityLog,
    
    // Sync operations
    quickSave,
    legacyQuickSave,
    refreshAllData,
    
    // Sync status
    syncState,
    activeDevices
  } = useReliableSync(currentUser?.name || 'Unknown User');

  // Extract sync state properties for compatibility with existing code
  const isLoading = syncState.isLoading;
  const connectionStatus = syncState.isConnected ? 'connected' : (syncState.error ? 'error' : 'connecting');

  // Reliable sync handles all real-time updates automatically
  // No need for manual Firebase subscription management

  // UI State
  const [userMood, setUserMood] = useState(3);
  const [activeTab, setActiveTab] = useState<ExtendedActiveTab>('mood'); // Updated type
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedDate, setSelectedDate] = useState(getFormattedDate(new Date()));
  const [storeItems, setStoreItems] = useState<StoreItem[]>(getDefaultStoreItems());
  const [showDailyResetNotification, setShowDailyResetNotification] = useState(false);

  // Reliable sync handles initialization automatically
  // No manual initialization needed

  // Reliable sync handles auto-save automatically with optimal batching
  // No need for manual periodic saves

  // Check for daily reset notification - improved logic with better debouncing
  useEffect(() => {
    const checkDailyReset = () => {
      const lastNotificationDate = localStorage.getItem('lastDailyResetNotification');
      const lastResetDate = localStorage.getItem('lastTaskResetDate');
      const today = getFormattedDate(new Date());
      
      console.log('🔍 Checking notification:', { 
        lastNotificationDate, 
        lastResetDate, 
        today, 
        completedTasksSize: completedTasks.size,
        taskAssignmentsCount: Object.keys(taskAssignments).length,
        shouldShow: lastResetDate === today && lastNotificationDate !== today && 
                   (completedTasks.size === 0 && Object.keys(taskAssignments).length === 0)
      });
      
      if (lastResetDate === today && 
          lastNotificationDate !== today && 
          completedTasks.size === 0 &&
          Object.keys(taskAssignments).length === 0) {
        
        console.log('📢 Showing daily reset notification');
        setShowDailyResetNotification(true);
        localStorage.setItem('lastDailyResetNotification', today);
        
        setTimeout(() => {
          setShowDailyResetNotification(false);
        }, 8000);
      }
    };

    if (!isLoading && connectionStatus === 'connected') {
      const timer = setTimeout(checkDailyReset, 2000);
      return () => clearTimeout(timer);
    }
  }, [completedTasks.size, taskAssignments, isLoading, connectionStatus]);

  // Update user mood when current user changes
  useEffect(() => {
    const currentEmployee = employees.find(emp => emp.id === currentUser.id);
    if (currentEmployee) {
      setUserMood(currentEmployee.mood);
    }
  }, [currentUser.id, employees]);

  // Sync Firebase store items with local state
  useEffect(() => {
    if (firebaseStoreItems && firebaseStoreItems.length > 0) {
      setStoreItems(firebaseStoreItems);
    }
  }, [firebaseStoreItems]);

  // Reliable sync handles task operations and conflict resolution automatically

  // Reliable sync handles auto-save, so these can be simpler
  const setEmployeesWithSave = (value: React.SetStateAction<Employee[]>) => {
    if (typeof value === 'function') {
      setEmployees(value(employees));
    } else {
      setEmployees(value);
    }
  };
  const setTasksWithSave = (value: React.SetStateAction<Task[]>) => {
    if (typeof value === 'function') {
      setTasks(value(tasks));
    } else {
      setTasks(value);
    }
  };
  const setDailyDataWithSave = (value: React.SetStateAction<DailyDataMap>) => {
    if (typeof value === 'function') {
      setDailyData(value(dailyData));
    } else {
      setDailyData(value);
    }
  };

  // Create compatibility function for components that still expect saveToFirebase
  const saveToFirebase = async () => {
    // Professional sync handles this automatically
    console.log('📦 Legacy saveToFirebase called - professional sync handles this automatically');
  };

  // Professional sync handles verification and retries automatically
  const setCompletedTasksWithSave = setCompletedTasks;
  const setTaskAssignmentsWithSave = (value: React.SetStateAction<TaskAssignments>) => {
    if (typeof value === 'function') {
      setTaskAssignments(value(taskAssignments));
    } else {
      setTaskAssignments(value);
    }
  };
  const setCustomRolesWithSave = (value: React.SetStateAction<string[]>) => {
    if (typeof value === 'function') {
      setCustomRoles(value(customRoles));
    } else {
      setCustomRoles(value);
    }
  };
  const setStoreItemsWithSave = (value: React.SetStateAction<StoreItem[]>) => {
    const newItems = typeof value === 'function' ? value(storeItems) : value;
    setStoreItems(newItems);
    setFirebaseStoreItems(newItems);
  };

  // Create wrapper functions for prep setters to handle function updaters
  const setPrepItemsWithSave = (value: React.SetStateAction<PrepItem[]>) => {
    if (typeof value === 'function') {
      setPrepItems(value(prepItems));
    } else {
      setPrepItems(value);
    }
  };
  const setScheduledPrepsWithSave = (value: React.SetStateAction<ScheduledPrep[]>) => {
    if (typeof value === 'function') {
      setScheduledPreps(value(scheduledPreps));
    } else {
      setScheduledPreps(value);
    }
  };
  const setPrepSelectionsWithSave = (value: React.SetStateAction<PrepSelections>) => {
    if (typeof value === 'function') {
      setPrepSelections(value(prepSelections));
    } else {
      setPrepSelections(value);
    }
  };



  // Manual reset function for testing (admin only)
  const handleManualReset = useCallback(() => {
    if (!isAdmin) return;
    
    console.log('🧪 MANUAL RESET: Triggered by admin');
    console.log('📋 Before manual reset:', { 
      completedTasksCount: completedTasks.size, 
      taskAssignmentsCount: Object.keys(taskAssignments).length,
      taskAssignments: taskAssignments
    });
    
    const today = getFormattedDate(new Date());
    
    localStorage.removeItem('resetInProgress');
    localStorage.removeItem('lastDailyResetNotification');
    localStorage.removeItem('resetCheckedToday');
    
    setCompletedTasks(new Set());
    setTaskAssignments({});
    localStorage.setItem('lastTaskResetDate', today);
    
    console.log('✅ MANUAL RESET: Cleared both completed tasks AND task assignments');
    
    setShowDailyResetNotification(true);
    setTimeout(() => {
      setShowDailyResetNotification(false);
    }, 8000);
    
    setTimeout(() => {
      // First set the state, then let reliable sync handle it
      setCompletedTasks(new Set());
      setTaskAssignments({});
      
      // Force immediate sync
      quickSave().then(() => {
        console.log('✅ MANUAL RESET: Both completedTasks=[] and taskAssignments={} saved to Firebase');
      }).catch((error) => {
        console.error('❌ MANUAL RESET: Failed to save to Firebase:', error);
      });
    }, 500);
  }, [isAdmin, setCompletedTasks, setTaskAssignments, quickSave, completedTasks, taskAssignments]);

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

  // DAILY RESET LOGIC with distributed synchronization
  useEffect(() => {
    const performAutomaticDailyReset = async () => {
      const today = getFormattedDate(new Date());
      const lastResetDate = await firebaseMeta.current.getLastTaskResetDate();
      console.log('🔍 [CROSS-DEVICE] Checking for automatic daily reset:', {
        today,
        lastResetDate,
        needsReset: lastResetDate !== today,
        completedTasksCount: completedTasks.size,
        taskAssignmentsCount: Object.keys(taskAssignments).length
      });
      
      if (lastResetDate !== today && (completedTasks.size > 0 || Object.keys(taskAssignments).length > 0)) {
        console.log('🌅 [CROSS-DEVICE] NEW DAY DETECTED: Attempting synchronized daily reset');
        
        // Distributed lock mechanism to prevent simultaneous resets from multiple devices
        const lockKey = `daily_reset_lock_${today}`;
        const deviceId = localStorage.getItem('deviceId') || `device-${Date.now()}`;
        const lockExpiry = Date.now() + 30000; // 30 second lock
        
        try {
          // Try to acquire the lock
          const lockResult = await firebaseMeta.current.acquireResetLock?.(lockKey, deviceId, lockExpiry);
          
          if (lockResult === true) {
            console.log('🔒 [CROSS-DEVICE] Reset lock acquired, performing reset');
            
            // Set the state and let reliable sync handle it
            setCompletedTasks(new Set());
            setTaskAssignments({});
            
            // Force immediate sync
            const saveResults = await quickSave();
            
            console.log('✅ [CROSS-DEVICE] Daily reset completed successfully');
            await firebaseMeta.current.setLastTaskResetDate(today);
            setShowDailyResetNotification(true);
            setTimeout(() => {
              setShowDailyResetNotification(false);
            }, 8000);
            
            // Release the lock
            await firebaseMeta.current.releaseResetLock?.(lockKey, deviceId);
            console.log('🔓 [CROSS-DEVICE] Reset lock released');
          } else {
            console.log('⏳ [CROSS-DEVICE] Another device is handling the daily reset, skipping');
          }
        } catch (error) {
          console.error('❌ [CROSS-DEVICE] AUTOMATIC RESET: Error during reset:', error);
          // Try to release lock on error
          try {
            await firebaseMeta.current.releaseResetLock?.(lockKey, deviceId);
          } catch (releaseError) {
            console.error('❌ [CROSS-DEVICE] Failed to release lock after error:', releaseError);
          }
        }
      }
    };
    
    if (!isLoading && connectionStatus === 'connected' && employees.length > 0) {
      const timer = setTimeout(() => {
        performAutomaticDailyReset();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, connectionStatus, employees.length, completedTasks.size, taskAssignments, quickSave]);

  // Check for daily reset on visibility change
  useEffect(() => {
    const completedTasksSize = completedTasks.size;
    const taskAssignmentsLength = Object.keys(taskAssignments).length;
    
    const handleVisibilityChange = async () => {
      if (!document.hidden && !isLoading && connectionStatus === 'connected') {
        const today = getFormattedDate(new Date());
        const lastResetDate = await firebaseMeta.current.getLastTaskResetDate();
        console.log('👁️ [CROSS-DEVICE] App became visible, checking for daily reset:', {
          today,
          lastResetDate,
          needsReset: lastResetDate !== today
        });
        if (lastResetDate !== today && (completedTasksSize > 0 || taskAssignmentsLength > 0)) {
          setTimeout(async () => {
            try {
              // Set the state and let reliable sync handle it
              setCompletedTasks(new Set());
              setTaskAssignments({});
              
              // Force immediate sync
              await quickSave();
              
              await firebaseMeta.current.setLastTaskResetDate(today);
              setShowDailyResetNotification(true);
              setTimeout(() => setShowDailyResetNotification(false), 8000);
            } catch (error) {
              console.error('❌ [CROSS-DEVICE] VISIBILITY RESET: Failed:', error);
            }
          }, 1000);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoading, connectionStatus, taskAssignments, completedTasks.size, quickSave]);

  // Debug helper
  useEffect(() => {
    const completedTasksSize = completedTasks.size;
    const taskAssignmentsLength = Object.keys(taskAssignments).length;
    
    if (!isLoading && connectionStatus === 'connected') {
      console.log('📊 DAILY RESET DEBUG:', {
        currentDate: getFormattedDate(new Date()),
        lastResetDate: localStorage.getItem('lastTaskResetDate'),
        completedTasksCount: completedTasksSize,
        taskAssignmentsCount: taskAssignmentsLength,
        isLoading,
        connectionStatus,
        employeeCount: employees.length
      });
    }
  }, [taskAssignments, completedTasks.size, isLoading, connectionStatus, employees.length]);

  // Manual trigger for testing
  useEffect(() => {
    (window as any).triggerDailyReset = async () => {
      console.log('🧪 MANUAL TRIGGER: Forcing daily reset from console');
      const today = getFormattedDate(new Date());
      localStorage.setItem('lastTaskResetDate', today);
      
      try {
        // Set the state and let reliable sync handle it
        setCompletedTasks(new Set());
        setTaskAssignments({});
        
        // Force immediate sync
        await quickSave();
        
        console.log('✅ Manual trigger completed');
        return true;
      } catch (error) {
        console.error('❌ Manual trigger failed:', error);
        return false;
      }
    };
    
    return () => {
      delete (window as any).triggerDailyReset;
    };
  }, [quickSave, setCompletedTasks, setTaskAssignments]);

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

        {/* Admin Test Reset Button */}
        {isAdmin && (
          <div className="fixed bottom-20 right-4 z-50">
            <button
              onClick={handleManualReset}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full shadow-lg transition-colors text-sm font-medium"
              title="Test Daily Reset - Clears both tasks AND assignments (Admin Only)"
            >
              🧪 Test Reset
            </button>
          </div>
        )}

        {/* Sync Status Indicator */}
        <SyncStatusIndicator
          isLoading={isLoading}
          lastSync={syncState.lastSync ? new Date(syncState.lastSync).toLocaleTimeString() : null}
          connectionStatus={connectionStatus}
          loadFromFirebase={refreshAllData}
          activeDevices={activeDevices}
          syncEvents={syncState.syncEvents}
          deviceCount={syncState.deviceCount}
          isMultiDeviceEnabled={true}
          toggleMultiDeviceSync={() => {}}
          refreshFromAllDevices={refreshAllData}
        />

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
            completedTasks={completedTasks}
            taskAssignments={taskAssignments}
            dailyData={dailyData}
            setCompletedTasks={setCompletedTasksWithSave}
            setTaskAssignments={setTaskAssignmentsWithSave}
            setDailyData={setDailyDataWithSave}
            setEmployees={setEmployeesWithSave}
          />
        )}

        {activeTab === 'prep' && (
          <PrepListPrototype
            currentUser={currentUser}
            connectionStatus={connectionStatus}
            prepItems={prepItems}
            scheduledPreps={scheduledPreps}
            prepSelections={prepSelections}
            setPrepItems={setPrepItemsWithSave}
            setScheduledPreps={setScheduledPrepsWithSave}
            setPrepSelections={setPrepSelectionsWithSave}
            quickSave={legacyQuickSave}
          />
        )}

        {/* NEW: Restaurant Inventory Tab Content */}
        {activeTab === 'inventory' && (
          <RestaurantInventory
            currentUser={currentUser}
            connectionStatus={connectionStatus}
            inventoryDailyItems={inventoryDailyItems}
            inventoryWeeklyItems={inventoryWeeklyItems}
            inventoryMonthlyItems={inventoryMonthlyItems}
            inventoryDatabaseItems={inventoryDatabaseItems}
            inventoryActivityLog={inventoryActivityLog}
            setInventoryDailyItems={setInventoryDailyItems}
            setInventoryWeeklyItems={setInventoryWeeklyItems}
            setInventoryMonthlyItems={setInventoryMonthlyItems}
            setInventoryDatabaseItems={setInventoryDatabaseItems}
            setInventoryActivityLog={setInventoryActivityLog}
            quickSave={legacyQuickSave}
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
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPanel
            employees={employees}
            tasks={tasks}
            customRoles={customRoles}
            storeItems={storeItems}
            prepItems={prepItems}
            setEmployees={setEmployeesWithSave}
            setTasks={setTasksWithSave}
            setCustomRoles={setCustomRolesWithSave}
            setStoreItems={setStoreItemsWithSave}
            setPrepItems={setPrepItemsWithSave}
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
    </div>
  );
};

export default EmployeeApp;
