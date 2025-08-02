// EmployeeApp.tsx - Updated with Restaurant Inventory tab integration
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

// Hooks and Functions
import { useFirebaseData, useAuth, useTaskRealtimeSync } from './hooks';
import { handleAdminLogin } from './adminFunctions';
import { offlineQueue, resolveTaskConflicts } from './taskOperations';
import { applyEmployeeOperation, resolveEmployeeConflicts } from './employeeOperations';
// REMOVED: import type { SyncOperation } from './OperationManager'; // ❌ This was duplicate

// Types and Constants
import { getFormattedDate } from './utils';
import { getDefaultStoreItems } from './defaultData';
import type { ActiveTab, Employee, Task, DailyDataMap, TaskAssignments, StoreItem, SyncOperation } from './types';

// Extend ActiveTab type to include inventory
type ExtendedActiveTab = ActiveTab | 'inventory';

const EmployeeApp: React.FC = () => {
  // Enhanced Firebase data hook with inventory support
  const {
    // Core data
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
    // NEW: Inventory data from Firebase
    dailyItems,
    weeklyItems,
    monthlyItems,
    databaseItems,
    activityLog,
    // Enhanced setters
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
    // NEW: Inventory setters
    setDailyItems,
    setWeeklyItems,
    setMonthlyItems,
    setDatabaseItems,
    setActivityLog,
    // Enhanced Firebase functions
    loadFromFirebase,
    saveToFirebase,
    quickSave,
    // NEW: Inventory-specific functions
    saveInventoryData,
    saveInventoryFrequency,
    saveDatabaseItems,
    saveActivityLog: saveActivityLogToFirebase,
    applyInventoryOperation,
    // Sync operations
    applyTaskSyncOperation
  } = useFirebaseData();

  // Auth and UI state
  const { currentUser, isAdmin, setCurrentUser, setIsAdmin, switchUser, logoutAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<ExtendedActiveTab>('mood');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Add userMood state for MoodTracker
  const [userMood, setUserMood] = React.useState(() => {
    const currentEmployee = employees.find(emp => emp.id === currentUser.id);
    return currentEmployee?.mood || 3;
  });

  // Enhanced sync status tracking
  const [syncStats, setSyncStats] = useState({
    lastInventorySync: null as string | null,
    inventoryConflicts: 0,
    totalSyncOperations: 0
  });

  // FirebaseService instance for meta operations
  const firebaseMeta = React.useRef<any>(null);
  if (!firebaseMeta.current) {
    firebaseMeta.current = new (require('./firebaseService').FirebaseService)();
  }

  // Enhanced real-time sync setup
  useTaskRealtimeSync(applyTaskSyncOperation);

  // Real-time cleaning tasks sync (existing)
  useEffect(() => {
    if (!firebaseMeta.current) return;
    
    const unsubscribeCompleted = firebaseMeta.current.onCompletedTasksChange((newCompleted: number[] | Set<number>) => {
      setCompletedTasks(new Set(Array.isArray(newCompleted) ? newCompleted : Array.from(newCompleted)));
    });
    
    const unsubscribeAssignments = firebaseMeta.current.onTaskAssignmentsChange((newAssignments: TaskAssignments) => {
      setTaskAssignments(newAssignments);
    });

    return () => {
      unsubscribeCompleted?.();
      unsubscribeAssignments?.();
    };
  }, [setCompletedTasks, setTaskAssignments]);

  // Enhanced sync monitoring with inventory tracking
  useEffect(() => {
    if (connectionStatus === 'connected' && lastSync) {
      setSyncStats(prev => ({
        ...prev,
        lastInventorySync: lastSync,
        totalSyncOperations: prev.totalSyncOperations + 1
      }));
    }
  }, [connectionStatus, lastSync]);

  // Enhanced connection status effect
  useEffect(() => {
    if (connectionStatus === 'connected') {
      console.log('🌐 Enhanced Firebase connection established with inventory sync');
    } else if (connectionStatus === 'error') {
      console.warn('⚠️ Enhanced Firebase connection error - working offline');
    }
  }, [connectionStatus]);

  // Load data on mount
  useEffect(() => {
    console.log('🚀 Enhanced EmployeeApp initializing with inventory support...');
    loadFromFirebase();
  }, [loadFromFirebase]);

  // Update userMood when currentUser or employees change
  useEffect(() => {
    const currentEmployee = employees.find(emp => emp.id === currentUser.id);
    if (currentEmployee) {
      setUserMood(currentEmployee.mood);
    }
  }, [currentUser.id, employees]);

  // Enhanced tab configuration with inventory
  const tabs = [
    { id: 'mood' as const, label: 'Mood', icon: TrendingUp, color: 'blue' },
    { id: 'tasks' as const, label: 'Tasks', icon: CheckSquare, color: 'green' },
    { id: 'store' as const, label: 'Store', icon: ShoppingBag, color: 'purple' },
    { id: 'prep' as const, label: 'Prep List', icon: ChefHat, color: 'orange' },
    { id: 'inventory' as const, label: 'Inventory', icon: UtensilsCrossed, color: 'teal' }, // NEW
    { id: 'reports' as const, label: 'Reports', icon: Database, color: 'gray' }
  ];

  // Enhanced admin tabs with inventory management
  const adminTabs = [
    ...tabs,
    { id: 'admin' as const, label: 'Admin', icon: Settings, color: 'red' }
  ];

  const currentTabs = isAdmin ? adminTabs : tabs;

  // Enhanced tab rendering with inventory
  const renderTabContent = () => {
    switch (activeTab) {
      case 'mood':
        return (
          <MoodTracker 
            currentUser={currentUser}
            employees={employees}
            userMood={userMood}
            setUserMood={setUserMood}
            setEmployees={setEmployees}
            setDailyData={setDailyData}
          />
        );
        
      case 'tasks':
        return (
          <TaskManager 
            currentUser={currentUser}
            tasks={tasks}
            employees={employees}
            completedTasks={completedTasks}
            taskAssignments={taskAssignments}
            dailyData={dailyData}
            setCompletedTasks={setCompletedTasks}
            setTaskAssignments={setTaskAssignments}
            setDailyData={setDailyData}
            setEmployees={setEmployees}
          />
        );
        
      case 'store':
        return (
          <Store 
            currentUser={currentUser}
            employees={employees}
            storeItems={storeItems}
            dailyData={dailyData}
            setEmployees={setEmployees}
            setDailyData={setDailyData}
            saveToFirebase={saveToFirebase}
          />
        );
        
      case 'prep':
        return (
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
        );
        
      case 'inventory': // NEW: Enhanced inventory tab
        return (
          <RestaurantInventory
            currentUser={currentUser}
            connectionStatus={connectionStatus}
            // Firebase inventory data is automatically provided via InventoryProvider
          />
        );
        
      case 'reports':
        return (
          <DailyReports
            selectedDate={new Date().toISOString().split('T')[0]}
            setSelectedDate={() => {}} // Placeholder since we don't use this in the enhanced version
            dailyData={dailyData}
            employees={employees}
            connectionStatus={connectionStatus}
          />
        );
        
      case 'admin':
        return isAdmin ? (
          <AdminPanel
            employees={employees}
            tasks={tasks}
            customRoles={customRoles}
            storeItems={storeItems}
            prepItems={prepItems}
            setEmployees={setEmployees}
            setTasks={setTasks}
            setCustomRoles={setCustomRoles}
            setStoreItems={setStoreItems}
            setPrepItems={setPrepItems}
            quickSave={quickSave}
          />
        ) : null;
        
      default:
        return (
          <MoodTracker 
            currentUser={currentUser}
            employees={employees}
            userMood={userMood}
            setUserMood={setUserMood}
            setEmployees={setEmployees}
            setDailyData={setDailyData}
          />
        );
    }
  };

  // Enhanced admin login with inventory access
  const handleAdminLoginSubmit = () => {
    const success = handleAdminLogin(adminPassword, setIsAdmin);
    if (success) {
      setShowAdminLogin(false);
      setAdminPassword('');
      console.log('🔐 Admin logged in with inventory management access');
    }
  };

  // Enhanced user info display with sync status
  const renderUserInfo = () => (
    <div className="relative">
      <button
        onClick={() => setShowUserDropdown(!showUserDropdown)}
        className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
      >
        <Users className="w-5 h-5" />
        <span className="font-medium">{currentUser.name}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {showUserDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-4 border-b">
            <div className="font-medium text-gray-900">{currentUser.name}</div>
            <div className="text-sm text-gray-500">
              {isAdmin ? 'Administrator' : 'Employee'}
            </div>
            
            {/* Enhanced sync status */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center text-xs">
                {connectionStatus === 'connected' ? (
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-1" />
                ) : connectionStatus === 'error' ? (
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-1" />
                ) : (
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1" />
                )}
                <span className="text-gray-600">
                  {connectionStatus === 'connected' ? 'Online & Synced' : 
                   connectionStatus === 'error' ? 'Offline Mode' : 'Connecting...'}
                </span>
              </div>
              
              {lastSync && (
                <div className="text-xs text-gray-500">
                  Last sync: {lastSync}
                </div>
              )}
              
              {/* Inventory sync info */}
              {syncStats.lastInventorySync && (
                <div className="text-xs text-blue-600">
                  Inventory synced: {syncStats.lastInventorySync}
                </div>
              )}
            </div>
          </div>

          <div className="p-2">
            <div className="text-xs font-medium text-gray-700 mb-2">Switch User</div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {employees.map(employee => (
                <button
                  key={employee.id}
                  onClick={() => {
                    switchUser(employee);
                    setShowUserDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    employee.id === currentUser.id
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{employee.name}</span>
                    {employee.id === currentUser.id && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{employee.role}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-2 border-t space-y-1">
            {!isAdmin && (
              <button
                onClick={() => {
                  setShowAdminLogin(true);
                  setShowUserDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md flex items-center"
              >
                <Lock className="w-4 h-4 mr-2" />
                Admin Login
              </button>
            )}
            
            {isAdmin && (
              <button
                onClick={() => {
                  logoutAdmin();
                  setShowUserDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md flex items-center text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout Admin
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Enhanced loading screen with inventory info
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Enhanced System...</h2>
          <p className="text-blue-100">Initializing inventory management and real-time sync</p>
          
          {/* Enhanced loading steps */}
          <div className="mt-4 space-y-1 text-sm text-blue-200">
            <div>✓ Connecting to Firebase</div>
            <div>✓ Loading employee data</div>
            <div>✓ Loading task assignments</div>
            <div>✓ Loading prep schedules</div>
            <div className="animate-pulse">⏳ Loading inventory data...</div>
            <div>⏳ Setting up real-time sync</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      {/* Enhanced Header with Sync Status */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Enhanced Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <ChefHat className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">HampTown Panel</h1>
                <p className="text-sm text-blue-100">Enhanced with Real-time Inventory</p>
              </div>
            </div>

            {/* Enhanced Sync Status */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-white text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400' : 
                  connectionStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                }`} />
                <span>{connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ? 'Offline' : 'Connecting'}</span>
                {lastSync && (
                  <span className="text-blue-200">
                    • Last sync: {lastSync}
                  </span>
                )}
                {databaseItems && databaseItems.length > 0 && (
                  <span className="text-blue-200">
                    • {databaseItems.length} inventory items
                  </span>
                )}
              </div>
              {renderUserInfo()}
            </div>

            {/* Mobile user info */}
            <div className="md:hidden">
              {renderUserInfo()}
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Navigation Tabs */}
      <nav className="bg-white/5 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto py-4">
            {currentTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-md'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                  
                  {/* Enhanced badge indicators */}
                  {tab.id === 'inventory' && databaseItems && databaseItems.length > 0 && (
                    <span className={`ml-1 px-2 py-1 text-xs rounded-full ${
                      isActive ? 'bg-teal-100 text-teal-800' : 'bg-white/20 text-white'
                    }`}>
                      {databaseItems.length}
                    </span>
                  )}
                  
                  {tab.id === 'tasks' && completedTasks && Array.from(completedTasks).length > 0 && (
                    <span className={`ml-1 px-2 py-1 text-xs rounded-full ${
                      isActive ? 'bg-green-100 text-green-800' : 'bg-white/20 text-white'
                    }`}>
                      {Array.from(completedTasks).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Enhanced Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-xl min-h-[600px]">
          {renderTabContent()}
        </div>
      </main>

      {/* Enhanced Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Admin Login</h3>
              <button
                onClick={() => setShowAdminLogin(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLoginSubmit()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter admin password"
                  autoFocus
                />
              </div>
              
              <div className="text-xs text-gray-500">
                Admin access includes inventory management, user administration, and system settings.
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleAdminLoginSubmit}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => setShowAdminLogin(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside handler for dropdown */}
      {showUserDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserDropdown(false)}
        />
      )}
    </div>
  );
};

export default EmployeeApp;
