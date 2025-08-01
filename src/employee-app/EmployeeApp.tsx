// EmployeeApp.tsx - FIXED: Centralized daily reset to prevent multi-user conflicts
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  CheckSquare, 
  TrendingUp, 
  Settings, 
  Lock, 
  LogOut, 
  Calendar, 
  Database, 
  ChevronDown, 
  X, 
  Check, 
  ShoppingBag, 
  ChefHat,
  UtensilsCrossed
} from 'lucide-react';

// Components
import MoodTracker from './MoodTracker';
import TaskManager from './TaskManager';
import Store from './Store';
import AdminPanel from './AdminPanel';
import DailyReports from './DailyReports';
import PrepListPrototype from './PrepListPrototype';
import RestaurantInventory from './inventory/RestaurantInventory';
import SyncStatusIndicator from './SyncStatusIndicator';

// Hooks and Functions
import { useFirebaseData, useAuth, useTaskRealtimeSync } from './hooks';
import { handleAdminLogin } from './adminFunctions';
import { offlineQueue, resolveTaskConflicts } from './taskOperations';
import { applyEmployeeOperation, resolveEmployeeConflicts } from './employeeOperations';
import type { SyncOperation } from './OperationManager';

// Types and Constants
import { getFormattedDate } from './utils';
import { getDefaultStoreItems } from './defaultData';
import type { ActiveTab, Employee, Task, DailyDataMap, TaskAssignments, StoreItem } from './types';

// Extend ActiveTab type to include inventory
type ExtendedActiveTab = ActiveTab | 'inventory';

// System data interface for centralized app state
interface SystemData {
  lastResetDate: string;
  resetInProgress: boolean;
  resetInitiatedBy: string;
  resetTimestamp: number;
}

const EmployeeApp: React.FC = () => {
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
    prepItems,
    scheduledPreps,
    prepSelections,
    storeItems: firebaseStoreItems,
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
    loadFromFirebase,
    saveToFirebase,
    quickSave,
    applyTaskSyncOperation
  } = useFirebaseData();

  const {
    currentUser,
    isAdmin,
    setCurrentUser,
    setIsAdmin,
    switchUser,
    logoutAdmin
  } = useAuth();

  // Local State
  const [activeTab, setActiveTab] = useState<ExtendedActiveTab>('mood');
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showDailyResetNotification, setShowDailyResetNotification] = useState(false);
  const [storeItems, setStoreItems] = useState<StoreItem[]>(getDefaultStoreItems());
  const [conflictCount, setConflictCount] = useState(0);
  
  // FIXED: Add system data state for centralized reset management
  const [systemData, setSystemData] = useState<SystemData>({
    lastResetDate: '',
    resetInProgress: false,
    resetInitiatedBy: '',
    resetTimestamp: 0
  });

  // Initialize store items from Firebase
  useEffect(() => {
    if (firebaseStoreItems.length > 0) {
      setStoreItems(firebaseStoreItems);
    }
  }, [firebaseStoreItems]);

  // FIXED: Load system data from Firebase
  useEffect(() => {
    const loadSystemData = async () => {
      if (connectionStatus === 'connected') {
        try {
          const response = await fetch(`https://workvibeapp-default-rtdb.firebaseio.com/systemData.json`);
          if (response.ok) {
            const data = await response.json();
            if (data) {
              setSystemData(data);
              console.log('📊 Loaded system data:', data);
            }
          }
        } catch (error) {
          console.error('❌ Failed to load system data:', error);
        }
      }
    };
    
    loadSystemData();
  }, [connectionStatus]);

  // FIXED: Save system data to Firebase
  const saveSystemData = useCallback(async (newSystemData: SystemData): Promise<boolean> => {
    try {
      const response = await fetch(`https://workvibeapp-default-rtdb.firebaseio.com/systemData.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSystemData)
      });
      
      if (response.ok) {
        setSystemData(newSystemData);
        console.log('✅ System data saved:', newSystemData);
        return true;
      } else {
        console.error('❌ Failed to save system data:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving system data:', error);
      return false;
    }
  }, []);

  // Task realtime sync
  useTaskRealtimeSync(applyTaskSyncOperation);

  // Conflict Resolution
  useEffect(() => {
    if (offlineQueue.length > 0 && connectionStatus === 'connected') {
      console.log('🔄 Resolving offline conflicts...');
      const conflicts = resolveTaskConflicts(Array.from(completedTasks), tasks);
      setConflictCount(conflicts);
      offlineQueue.splice(0, offlineQueue.length);
    }
  }, [connectionStatus, completedTasks, tasks]);

  // Error handling utility
  const handleDataChange = useCallback(() => {
    if (connectionStatus === 'connected') {
      saveToFirebase();
    }
  }, [connectionStatus, saveToFirebase]);

  // Enhanced state setters with auto-save
  const setEmployeesWithSave = useCallback((value: Employee[] | ((prev: Employee[]) => Employee[])) => {
    const newEmployees = typeof value === 'function' ? value(employees) : value;
    setEmployees(() => newEmployees);
    handleDataChange();
  }, [employees, setEmployees, handleDataChange]);

  const setDailyDataWithSave = useCallback((value: DailyDataMap | ((prev: DailyDataMap) => DailyDataMap)) => {
    const newDailyData = typeof value === 'function' ? value(dailyData) : value;
    setDailyData(() => newDailyData);
    handleDataChange();
  }, [dailyData, setDailyData, handleDataChange]);

  const setCompletedTasksWithSave = useCallback((value: Set<number> | ((prev: Set<number>) => Set<number>)) => {
    const newCompletedTasks = typeof value === 'function' ? value(completedTasks) : value;
    setCompletedTasks(() => newCompletedTasks);
    handleDataChange();
  }, [completedTasks, setCompletedTasks, handleDataChange]);

  const setTaskAssignmentsWithSave = useCallback((value: TaskAssignments | ((prev: TaskAssignments) => TaskAssignments)) => {
    const newAssignments = typeof value === 'function' ? value(taskAssignments) : value;
    setTaskAssignments(() => newAssignments);
    handleDataChange();
  }, [taskAssignments, setTaskAssignments, handleDataChange]);

  const setStoreItemsWithSave = useCallback((value: StoreItem[] | ((prev: StoreItem[]) => StoreItem[])) => {
    const newItems = typeof value === 'function' ? value(storeItems) : value;
    setStoreItems(newItems);
    setFirebaseStoreItems(() => newItems);
    handleDataChange();
  }, [storeItems, setFirebaseStoreItems, handleDataChange]);

  // FIXED: Centralized daily reset function
  const performDailyReset = useCallback(async (): Promise<boolean> => {
    const today = getFormattedDate(new Date());
    const currentTime = Date.now();
    const userId = `${currentUser.name}-${currentUser.id}`;
    
    console.log('🔍 Attempting daily reset:', {
      today,
      lastResetDate: systemData.lastResetDate,
      resetInProgress: systemData.resetInProgress,
      completedTasksCount: completedTasks.size,
      taskAssignmentsCount: Object.keys(taskAssignments).length,
      userId
    });

    // Check if reset is needed
    if (systemData.lastResetDate === today) {
      console.log('✅ Daily reset already completed for today');
      return false;
    }

    // Check if there's nothing to reset
    if (completedTasks.size === 0 && Object.keys(taskAssignments).length === 0) {
      console.log('✅ No data to reset, updating reset date only');
      await saveSystemData({
        lastResetDate: today,
        resetInProgress: false,
        resetInitiatedBy: userId,
        resetTimestamp: currentTime
      });
      return false;
    }

    // Check if reset is already in progress (with timeout protection)
    const resetTimeoutMs = 30000; // 30 seconds timeout
    if (systemData.resetInProgress && (currentTime - systemData.resetTimestamp < resetTimeoutMs)) {
      console.log('⏳ Reset already in progress, waiting...');
      return false;
    }

    // Acquire reset lock
    console.log('🔒 Acquiring reset lock...');
    const lockData: SystemData = {
      lastResetDate: systemData.lastResetDate, // Keep old date until reset completes
      resetInProgress: true,
      resetInitiatedBy: userId,
      resetTimestamp: currentTime
    };

    const lockAcquired = await saveSystemData(lockData);
    if (!lockAcquired) {
      console.error('❌ Failed to acquire reset lock');
      return false;
    }

    // Wait a moment to ensure lock is propagated
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      console.log('🌅 NEW DAY DETECTED: Performing centralized daily reset');
      
      // Clear the data
      const resetResults = await Promise.all([
        quickSave('completedTasks', []),
        quickSave('taskAssignments', {})
      ]);
      
      if (resetResults.every(result => result === true)) {
        // Update system data with successful reset
        const successData: SystemData = {
          lastResetDate: today,
          resetInProgress: false,
          resetInitiatedBy: userId,
          resetTimestamp: currentTime
        };
        
        await saveSystemData(successData);
        
        console.log('✅ CENTRALIZED RESET: Successfully completed daily reset');
        
        // Show notification
        setShowDailyResetNotification(true);
        setTimeout(() => {
          setShowDailyResetNotification(false);
        }, 8000);

        // Clean up old localStorage entries
        localStorage.removeItem('lastTaskResetDate');
        localStorage.removeItem('lastDailyResetNotification');
        localStorage.removeItem('resetCheckedToday');
        localStorage.removeItem('resetInProgress');
        
        return true;
      } else {
        throw new Error('Failed to save reset data to Firebase');
      }
      
    } catch (error) {
      console.error('❌ CENTRALIZED RESET: Error during reset:', error);
      
      // Release lock on error
      await saveSystemData({
        lastResetDate: systemData.lastResetDate,
        resetInProgress: false,
        resetInitiatedBy: userId,
        resetTimestamp: currentTime
      });
      
      return false;
    }
  }, [systemData, currentUser, completedTasks, taskAssignments, quickSave, saveSystemData]);

  // FIXED: Main daily reset effect - only triggers when system data changes
  useEffect(() => {
    if (!isLoading && connectionStatus === 'connected' && employees.length > 0 && systemData.lastResetDate !== undefined) {
      const timer = setTimeout(() => {
        performDailyReset();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, connectionStatus, employees.length, systemData.lastResetDate, performDailyReset]);

  // FIXED: Check for daily reset on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !isLoading && connectionStatus === 'connected' && systemData.lastResetDate !== undefined) {
        console.log('👁️ App became visible, checking for daily reset');
        
        setTimeout(() => {
          performDailyReset();
        }, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoading, connectionStatus, systemData.lastResetDate, performDailyReset]);

  // Manual reset function for testing (admin only) - FIXED: Also uses centralized system
  const handleManualReset = useCallback(async () => {
    if (!isAdmin) return;
    
    console.log('🧪 MANUAL RESET: Triggered by admin');
    const today = getFormattedDate(new Date());
    const userId = `${currentUser.name}-${currentUser.id}-MANUAL`;
    
    try {
      // Force reset by clearing system data first
      await saveSystemData({
        lastResetDate: '',
        resetInProgress: false,
        resetInitiatedBy: userId,
        resetTimestamp: Date.now()
      });
      
      // Wait a moment then trigger reset
      setTimeout(() => {
        performDailyReset();
      }, 500);
      
    } catch (error) {
      console.error('❌ MANUAL RESET: Failed:', error);
    }
  }, [isAdmin, currentUser, saveSystemData, performDailyReset]);

  // Debug helper - FIXED: Now shows system data
  useEffect(() => {
    if (!isLoading && connectionStatus === 'connected') {
      console.log('📊 DAILY RESET DEBUG:', {
        currentDate: getFormattedDate(new Date()),
        systemData,
        completedTasksCount: completedTasks.size,
        taskAssignmentsCount: Object.keys(taskAssignments).length,
        isLoading,
        connectionStatus,
        employeeCount: employees.length
      });
    }
  }, [systemData, completedTasks.size, Object.keys(taskAssignments).length, isLoading, connectionStatus]);

  // Manual trigger for testing - FIXED: Uses new centralized system
  useEffect(() => {
    (window as any).triggerDailyReset = async () => {
      console.log('🧪 MANUAL TRIGGER: Forcing daily reset from console');
      return await performDailyReset();
    };
    
    (window as any).getSystemData = () => {
      console.log('📊 Current system data:', systemData);
      return systemData;
    };
    
    return () => {
      delete (window as any).triggerDailyReset;
      delete (window as any).getSystemData;
    };
  }, [performDailyReset, systemData]);

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
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isAdmin && (
              <button
                onClick={() => setShowAdminLogin(true)}
                className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                title="Admin Login"
              >
                <Lock className="w-5 h-5" />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleAdminLogout}
                className="p-2 text-red-600 hover:text-red-800 transition-colors"
                title="Logout Admin"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* User Switcher Dropdown */}
        {showUserSwitcher && (
          <div className="absolute top-16 left-4 bg-white rounded-lg shadow-lg border z-50 min-w-48">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-2 py-1">Switch User</div>
              {employees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => handleUserSwitch(employee)}
                  className={`w-full text-left px-2 py-2 rounded transition-colors ${
                    employee.id === currentUser.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {employee.name}
                  {employee.id === currentUser.id && (
                    <Check className="w-4 h-4 inline ml-2 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b">
          <button
            onClick={() => setActiveTab('mood')}
            className={`flex-shrink-0 py-3 px-4 text-center ${
              activeTab === 'mood' 
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <TrendingUp className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Mood & Points</span>
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-shrink-0 py-3 px-4 text-center ${
              activeTab === 'tasks' 
                ? 'border-b-2 border-green-500 text-green-600 bg-green-50' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <CheckSquare className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Tasks</span>
          </button>
          <button
            onClick={() => setActiveTab('prep')}
            className={`flex-shrink-0 py-3 px-4 text-center ${
              activeTab === 'prep' 
                ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <ChefHat className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Prep</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-shrink-0 py-3 px-4 text-center ${
              activeTab === 'inventory' 
                ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Inventory</span>
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={`flex-shrink-0 py-3 px-4 text-center ${
              activeTab === 'store' 
                ? 'border-b-2 border-yellow-500 text-yellow-600 bg-yellow-50' 
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
              title="Test Daily Reset - Uses centralized system (Admin Only)"
            >
              🧪 Test Reset
            </button>
          </div>
        )}

        {/* Enhanced Sync Status Indicator */}
        <SyncStatusIndicator
          isLoading={isLoading}
          lastSync={lastSync}
          connectionStatus={connectionStatus}
          loadFromFirebase={loadFromFirebase}
          conflictCount={conflictCount}
        />

        {/* Tab Content */}
        {activeTab === 'mood' && (
          <MoodTracker
            currentUser={currentUser}
            employees={employees}
            userMood={currentEmployee?.currentMood}
            setUserMood={(mood) => {
              setEmployeesWithSave(prev => 
                prev.map(emp => 
                  emp.id === currentUser.id 
                    ? { ...emp, currentMood: mood } 
                    : emp
                )
              );
            }}
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
            setPrepItems={setPrepItems}
            setScheduledPreps={setScheduledPreps}
            setPrepSelections={setPrepSelections}
            quickSave={quickSave}
          />
        )}

        {activeTab === 'inventory' && (
          <RestaurantInventory />
        )}

        {activeTab === 'store' && (
          <Store
            currentUser={currentUser}
            employees={employees}
            storeItems={storeItems}
            setEmployees={setEmployeesWithSave}
            setStoreItems={setStoreItemsWithSave}
            setDailyData={setDailyDataWithSave}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPanel
            employees={employees}
            tasks={tasks}
            customRoles={customRoles}
            storeItems={storeItems}
            setEmployees={setEmployeesWithSave}
            setTasks={setTasks}
            setCustomRoles={setCustomRoles}
            setStoreItems={setStoreItemsWithSave}
            saveToFirebase={saveToFirebase}
          />
        )}

        {activeTab === 'reports' && isAdmin && (
          <DailyReports
            dailyData={dailyData}
            employees={employees}
            tasks={tasks}
          />
        )}
      </div>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Admin Login</h3>
              <button
                onClick={() => setShowAdminLogin(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="password"
              placeholder="Enter admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLoginSubmit()}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAdminLogin(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAdminLoginSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeApp;
