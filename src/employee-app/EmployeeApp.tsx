// EmployeeApp.tsx - Updated with Prep List Integration
import React, { useState, useEffect, useCallback } from 'react';
import { Users, CheckSquare, TrendingUp, Settings, Lock, LogOut, Calendar, Database, ChevronDown, X, Check, ShoppingBag, ChefHat } from 'lucide-react';

// Components
import MoodTracker from './MoodTracker';
import TaskManager from './TaskManager';
import Store from './Store';
import AdminPanel from './AdminPanel';
import DailyReports from './DailyReports';
import PrepListPrototype from './PrepListPrototype';

// Hooks and Functions
import { useFirebaseData, useAuth } from './hooks';
import { handleAdminLogin } from './adminFunctions';

// Types and Constants
import { getFormattedDate } from './utils';
import { getDefaultStoreItems } from './defaultData';
import type { ActiveTab, Employee, Task, DailyDataMap, TaskAssignments, StoreItem } from './types';

const EmployeeApp = () => {
  // Firebase and Auth hooks
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
    setEmployees,
    setTasks,
    setDailyData,
    setCompletedTasks,
    setTaskAssignments,
    setCustomRoles,
    setPrepItems,
    setScheduledPreps,
    setPrepSelections,
    loadFromFirebase,
    saveToFirebase,
    quickSave
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

  // Load data once on mount
  useEffect(() => {
    loadFromFirebase();
  }, []); // Empty dependency array - only run once

  // Set up periodic auto-save (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus === 'connected' && !isLoading) {
        saveToFirebase();
      }
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [connectionStatus, isLoading, saveToFirebase]);

  // Optimized data change handler - only save when user makes changes
  const handleDataChange = useCallback(() => {
    if (connectionStatus === 'connected') {
      saveToFirebase();
    }
  }, [connectionStatus, saveToFirebase]);

  // Update user mood when current user changes
  useEffect(() => {
    const currentEmployee = employees.find(emp => emp.id === currentUser.id);
    if (currentEmployee) {
      setUserMood(currentEmployee.mood);
    }
  }, [currentUser.id, employees]);

  const handleAdminLoginSubmit = () => {
    const success = handleAdminLogin(adminPassword, setIsAdmin, setActiveTab, setAdminPassword);
    if (success) {
      setShowAdminLogin(false);
    }
  };

  const handleUserSwitch = (employee: Employee) => {
    switchUser(employee);
    setShowUserSwitcher(false);
    setActiveTab('mood');
  };

  const handleAdminLogout = () => {
    logoutAdmin();
    setActiveTab('mood');
  };

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
    setStoreItems(updater);
    handleDataChange();
  }, [setStoreItems, handleDataChange]);

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
        <div className="flex">
          <button
            onClick={() => setActiveTab('mood')}
            className={`flex-1 py-3 px-4 text-center ${
              activeTab === 'mood' 
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                : 'text-gray-600'
            }`}
          >
            <TrendingUp className="w-5 h-5 mx-auto mb-1" />
            Mood Tracker
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-3 px-4 text-center ${
              activeTab === 'tasks' 
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                : 'text-gray-600'
            }`}
          >
            <CheckSquare className="w-5 h-5 mx-auto mb-1" />
            Cleaning Tasks
          </button>
          <button
            onClick={() => setActiveTab('preps')}
            className={`flex-1 py-3 px-4 text-center ${
              activeTab === 'preps' 
                ? 'border-b-2 border-green-500 text-green-600 bg-green-50' 
                : 'text-gray-600'
            }`}
          >
            <ChefHat className="w-5 h-5 mx-auto mb-1" />
            Prep List
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={`flex-1 py-3 px-4 text-center ${
              activeTab === 'store' 
                ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50' 
                : 'text-gray-600'
            }`}
          >
            <ShoppingBag className="w-5 h-5 mx-auto mb-1" />
            Store
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-3 px-4 text-center ${
                activeTab === 'admin' 
                  ? 'border-b-2 border-red-500 text-red-600 bg-red-50' 
                  : 'text-gray-600'
              }`}
            >
              <Settings className="w-5 h-5 mx-auto mb-1" />
              Admin Panel
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-1 py-3 px-4 text-center ${
                activeTab === 'reports' 
                  ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50' 
                  : 'text-gray-600'
              }`}
            >
              <Database className="w-5 h-5 mx-auto mb-1" />
              Daily Reports
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Floating Status Indicator */}
        <div className="fixed bottom-20 right-4 z-50">
          {isLoading && (
            <div className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg flex items-center space-x-2 border border-blue-100">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span className="text-blue-700 text-xs">Syncing...</span>
            </div>
          )}

          {lastSync && connectionStatus === 'connected' && !isLoading && (
            <div 
              className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg flex items-center space-x-2 border border-green-100 hover:bg-white/90 transition-all cursor-default"
              title={`Last saved: ${lastSync}`}
            >
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-green-700 text-xs">Saved</span>
            </div>
          )}

          {connectionStatus === 'error' && (
            <div 
              onClick={loadFromFirebase}
              className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg flex items-center space-x-2 border border-red-100 hover:bg-white/90 transition-all cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-red-700 text-xs">Reconnect</span>
            </div>
          )}
        </div>

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

        {activeTab === 'preps' && (
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
            setEmployees={setEmployeesWithSave}
            setTasks={setTasksWithSave}
            setCustomRoles={setCustomRolesWithSave}
            setStoreItems={setStoreItemsWithSave}
          />
        )}

        {activeTab === 'reports' && isAdmin && (
          <DailyReports
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dailyData={dailyData}
            employees={employees}
            connectionStatus={connectionStatus}
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

      {/* Click outside to close dropdowns */}
      {(showUserSwitcher || showAdminLogin) && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => {
            setShowUserSwitcher(false);
            if (!showAdminLogin) setShowAdminLogin(false);
          }}
        />
      )}
    </div>
  );
};

export default EmployeeApp;
