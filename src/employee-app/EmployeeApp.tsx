// EmployeeApp.tsx - Updated with multi-device sync functionality
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
  ChefHat 
} from 'lucide-react';

// Components
import MoodTracker from './MoodTracker';
import TaskManager from './TaskManager';
import Store from './Store';
import AdminPanel from './AdminPanel';
import DailyReports from './DailyReports';
import PrepListPrototype from './PrepListPrototype';
import SyncStatusIndicator from './SyncStatusIndicator';

// Hooks and Functions
import { useFirebaseData, useAuth, useTaskRealtimeSync } from './hooks';
import { handleAdminLogin } from './adminFunctions';
import { offlineQueue, wsManager, resolveTaskConflicts } from './taskOperations';
import { applyEmployeeOperation, resolveEmployeeConflicts } from './employeeOperations';
import type { SyncOperation } from './OperationManager';

// Types and Constants
import { getFormattedDate } from './utils';
import { getDefaultStoreItems } from './defaultData';
import type { ActiveTab, Employee, Task, DailyDataMap, TaskAssignments, StoreItem } from './types';

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
    applyTaskSyncOperation // <-- Додаємо цю функцію
  } = useFirebaseData();

  const {
    currentUser,
    isAdmin,
    setIsAdmin,
    switchUser,
    logoutAdmin
  } = useAuth();

  // UI State
  const [userMood, setUserMood] = useState(3);
  const [activeTab, setActiveTab] = useState<ActiveTab>('mood');
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedDate, setSelectedDate] = useState(getFormattedDate(new Date()));
  const [storeItems, setStoreItems] = useState<StoreItem[]>(getDefaultStoreItems());
  const [showDailyResetNotification, setShowDailyResetNotification] = useState(false);
  // Додаємо стейт для конфліктів
  const [conflictCount, setConflictCount] = useState(0);

  // Стан для збереження історії операцій задач
  const [taskOperations, setTaskOperations] = useState<SyncOperation[]>([]);

  // Стан для збереження історії операцій співробітників
  const [employeeOperations, setEmployeeOperations] = useState<SyncOperation[]>([]);

  // Initialize on mount - with better control
  useEffect(() => {
    let mounted = true;
    const initializeApp = async () => {
      if (mounted && employees.length === 0) { // Only load if we don't have data yet
        console.log('🚀 Initializing app...');
        await loadFromFirebase();
      }
    };
    
    initializeApp();
    
    return () => {
      mounted = false;
    };
  }, []); // Only run once on mount

  // Set up periodic auto-save (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus === 'connected' && !isLoading) {
        saveToFirebase();
      }
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [connectionStatus, isLoading, saveToFirebase]);

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
      
      // Show notification if:
      // 1. A reset happened today (lastResetDate === today)
      // 2. We haven't shown notification today (lastNotificationDate !== today)
      // 3. Tasks are actually cleared (completedTasks.size === 0 AND taskAssignments is empty)
      if (lastResetDate === today && 
          lastNotificationDate !== today && 
          completedTasks.size === 0 &&
          Object.keys(taskAssignments).length === 0) {
        
        console.log('📢 Showing daily reset notification');
        setShowDailyResetNotification(true);
        localStorage.setItem('lastDailyResetNotification', today);
        
        // Auto-hide notification after 8 seconds
        setTimeout(() => {
          setShowDailyResetNotification(false);
        }, 8000);
      }
    };

    // Only check after initial load is complete and we have stable data
    if (!isLoading && connectionStatus === 'connected') {
      const timer = setTimeout(checkDailyReset, 2000); // Wait 2 seconds for stability
      return () => clearTimeout(timer);
    }
  }, [completedTasks.size, taskAssignments, isLoading, connectionStatus]); // More specific dependencies

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

  // Додаємо підрахунок конфліктів
  useEffect(() => {
    const conflicts = taskOperations.length - resolveTaskConflicts(taskOperations).length;
    setConflictCount(conflicts);
  }, [taskOperations]);

  // Додаємо підрахунок конфліктів для співробітників
  useEffect(() => {
    const conflicts = employeeOperations.length - resolveEmployeeConflicts(employeeOperations).length;
    setConflictCount(prev => prev + conflicts);
  }, [employeeOperations]);

  // Додаємо обробку вхідних операцій з WebSocket та локальних операцій
  const handleTaskOperation = useCallback((op: SyncOperation) => {
    setTaskOperations(prev => [...prev, op]);
    applyTaskSyncOperation(op);
  }, [applyTaskSyncOperation]);

  // Підписка на WebSocket (оновлюємо useTaskRealtimeSync)
  useTaskRealtimeSync(handleTaskOperation);

  // Обгортка для локальних операцій (addTask, updateTask, removeTask)
  const handleLocalTaskOperation = (op: SyncOperation) => {
    setTaskOperations(prev => [...prev, op]);
    // applyTaskSyncOperation(op); // вже викликається через WebSocket
  };

  // Додаємо обробку вхідних операцій співробітників
  const handleEmployeeOperation = useCallback((op: SyncOperation) => {
    setEmployeeOperations(prev => [...prev, op]);
    applyEmployeeOperation(employees, op);
  }, [employees]);

  // TODO: підписка на WebSocket для співробітників (аналогічно задачам)

  // Optimized data change handler
  const handleDataChange = useCallback(() => {
    if (connectionStatus === 'connected') {
      saveToFirebase();
    }
  }, [connectionStatus, saveToFirebase]);

  // Enhanced setters that trigger save
  const setEmployeesWithSave = useCallback((updater: (prev: Employee[]) => Employee[]) => {
    setEmployees(updater);
    handleDataChange();
  }, [setEmployees, handleDataChange]);

  const setTasksWithSave = useCallback((updater: (prev: Task[]) => Task[]) => {
    setTasks(updater);
    handleDataChange();
  }, [setTasks, handleDataChange]);

  const setDailyDataWithSave = useCallback((updater: (prev: DailyDataMap) => DailyDataMap) => {
    setDailyData(updater);
    handleDataChange();
  }, [setDailyData, handleDataChange]);

  const setCompletedTasksWithSave = useCallback((tasks: Set<number>) => {
    setCompletedTasks(tasks);
    handleDataChange();
  }, [setCompletedTasks, handleDataChange]);

  const setTaskAssignmentsWithSave = useCallback((updater: (prev: TaskAssignments) => TaskAssignments) => {
    setTaskAssignments(updater);
    handleDataChange();
  }, [setTaskAssignments, handleDataChange]);

  const setCustomRolesWithSave = useCallback((updater: (prev: string[]) => string[]) => {
    setCustomRoles(updater);
    handleDataChange();
  }, [setCustomRoles, handleDataChange]);

  const setStoreItemsWithSave = useCallback((updater: (prev: StoreItem[]) => StoreItem[]) => {
    const newItems = typeof updater === 'function' ? updater(storeItems) : updater;
    setStoreItems(newItems);
    setFirebaseStoreItems(() => newItems);
    handleDataChange();
  }, [storeItems, setFirebaseStoreItems, handleDataChange]);

  // FIXED: Manual reset function for testing (admin only) - Now clears BOTH completed tasks AND task assignments
  const handleManualReset = useCallback(() => {
    if (!isAdmin) return;
    
    console.log('🧪 MANUAL RESET: Triggered by admin');
    console.log('📋 Before manual reset:', { 
      completedTasksCount: completedTasks.size, 
      taskAssignmentsCount: Object.keys(taskAssignments).length,
      taskAssignments: taskAssignments
    });
    
    const today = getFormattedDate(new Date());
    
    // Clear all related localStorage flags
    localStorage.removeItem('resetInProgress');
    localStorage.removeItem('lastDailyResetNotification');
    localStorage.removeItem('resetCheckedToday');
    
    // Perform the reset - BOTH completed tasks AND task assignments
    setCompletedTasks(new Set());
    setTaskAssignments(() => ({})); // Clear all task assignments
    localStorage.setItem('lastTaskResetDate', today);
    
    console.log('✅ MANUAL RESET: Cleared both completed tasks AND task assignments');
    console.log('📋 After manual reset: { completedTasks: Set(0), taskAssignments: {} }');
    
    // Show notification
    setShowDailyResetNotification(true);
    setTimeout(() => {
      setShowDailyResetNotification(false);
    }, 8000);
    
    // Save BOTH to Firebase
    setTimeout(() => {
      Promise.all([
        quickSave('completedTasks', []),
        quickSave('taskAssignments', {})
      ]).then(() => {
        console.log('✅ MANUAL RESET: Both completedTasks=[] and taskAssignments={} saved to Firebase');
      }).catch((error) => {
        console.error('❌ MANUAL RESET: Failed to save to Firebase:', error);
      });
    }, 500);
  }, [isAdmin, setCompletedTasks, setTaskAssignments, quickSave, completedTasks, taskAssignments]);

  // --- Admin Login Modal logic ---
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
            setPrepItems={setPrepItems}
            setScheduledPreps={setScheduledPreps}
            setPrepSelections={setPrepSelections}
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
            setPrepItems={setPrepItems}
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

      {/* Offline queue handler */}
      <useEffect(() => {
        const handleOnline = () => {
          offlineQueue.processQueue(async (op) => {
            wsManager.sendOperation(op, 'normal');
          });
        };
        window.addEventListener('online', handleOnline);
        return () => {
          window.removeEventListener('online', handleOnline);
        };
      }, []);
    </div>
  );
};

export default EmployeeApp;
