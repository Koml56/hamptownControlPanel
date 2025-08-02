// RestaurantInventory.tsx - Enhanced with Firebase integration and multi-device sync
import React, { useEffect } from 'react';
import { ChefHat, Flame, Calendar, Package, Database, BarChart3, AlertTriangle, TrendingDown, CheckCircle, Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react';
import { InventoryProvider, useInventory } from './InventoryContext';
import { InventoryTabProps } from './types';
import { getStockStatus } from './utils';
import DatabaseView from './components/DatabaseView';
import DailyView from './components/DailyView';
import WeeklyView from './components/WeeklyView';
import MonthlyView from './components/MonthlyView';
import ReportsView from './components/ReportsView';
import ToastContainer from './components/ToastContainer';

// Enhanced connection status indicator
const ConnectionStatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Cloud,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          text: 'Connected',
          description: 'Real-time sync active'
        };
      case 'connecting':
        return {
          icon: Wifi,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          text: 'Connecting...',
          description: 'Establishing connection'
        };
      case 'error':
        return {
          icon: CloudOff,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          text: 'Offline',
          description: 'Changes saved locally'
        };
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          text: 'Unknown',
          description: 'Status unknown'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center px-3 py-2 rounded-lg ${config.bgColor}`}>
      <Icon className={`w-4 h-4 mr-2 ${config.color}`} />
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
        <span className="text-xs text-gray-600">
          {config.description}
        </span>
      </div>
    </div>
  );
};

// Enhanced inventory header with Firebase sync status
const InventoryHeader: React.FC = () => {
  const { 
    dailyItems, 
    weeklyItems, 
    monthlyItems, 
    databaseItems, 
    connectionStatus 
  } = useInventory();

  // Calculate stock statistics
  const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
  const criticalCount = allItems.filter(item => getStockStatus(item).status === 'critical').length;
  const lowStockCount = allItems.filter(item => getStockStatus(item).status === 'low').length;
  const wellStockedCount = allItems.filter(item => getStockStatus(item).status === 'normal').length;
  const databaseCount = databaseItems.length;

  return (
    <div className="bg-white rounded-xl shadow-sm mb-6 p-4 md:p-6">
      {/* Header Title with Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
        <div className="flex items-center mb-4 sm:mb-0">
          <div className="bg-orange-500 p-2 md:p-3 rounded-lg mr-3 md:mr-4">
            <ChefHat className="text-white w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Restaurant Inventory</h1>
            <p className="text-sm md:text-base text-gray-600">Track usage, waste, and consumption patterns</p>
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center space-x-3">
          <ConnectionStatusIndicator status={connectionStatus} />
          {connectionStatus === 'connected' && (
            <div className="hidden sm:flex items-center text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Multi-device sync
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Statistics with Real-time Updates */}
      <div className="space-y-3">
        {/* Critical Alert - Always Visible */}
        {criticalCount > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-800">
                  {criticalCount} Critical Item{criticalCount > 1 ? 's' : ''} Need Immediate Attention
                </div>
                <div className="text-xs text-red-600 mt-1">
                  Stock levels below minimum threshold
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Grid - Mobile First */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Critical Items */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
              <div>
                <div className="text-lg font-bold text-red-800">{criticalCount}</div>
                <div className="text-xs text-red-600">Critical</div>
              </div>
            </div>
          </div>

          {/* Low Stock */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <TrendingDown className="w-4 h-4 text-yellow-600 mr-2" />
              <div>
                <div className="text-lg font-bold text-yellow-800">{lowStockCount}</div>
                <div className="text-xs text-yellow-600">Low Stock</div>
              </div>
            </div>
          </div>

          {/* Well Stocked */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <div>
                <div className="text-lg font-bold text-green-800">{wellStockedCount}</div>
                <div className="text-xs text-green-600">Well Stocked</div>
              </div>
            </div>
          </div>

          {/* Database Items */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center">
              <Database className="w-4 h-4 text-blue-600 mr-2" />
              <div>
                <div className="text-lg font-bold text-blue-800">{databaseCount}</div>
                <div className="text-xs text-blue-600">Database</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sync Information */}
        {connectionStatus === 'connected' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center text-sm text-green-800">
              <Cloud className="w-4 h-4 mr-2" />
              <span>
                All inventory changes are automatically synced across devices in real-time
              </span>
            </div>
          </div>
        )}

        {/* Offline Warning */}
        {connectionStatus === 'error' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center text-sm text-yellow-800">
              <CloudOff className="w-4 h-4 mr-2" />
              <span>
                Working offline - changes will sync automatically when connection is restored
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced tab navigation with sync status
const TabNavigation: React.FC = () => {
  const { 
    currentTab, 
    switchTab, 
    dailyItems, 
    weeklyItems, 
    monthlyItems, 
    databaseItems,
    connectionStatus 
  } = useInventory();

  const tabs = [
    {
      id: 'daily' as const,
      label: 'Daily Items',
      icon: Flame,
      count: dailyItems.length,
      color: 'red'
    },
    {
      id: 'weekly' as const,
      label: 'Weekly Items', 
      icon: Calendar,
      count: weeklyItems.length,
      color: 'yellow'
    },
    {
      id: 'monthly' as const,
      label: 'Monthly Items',
      icon: Package,
      count: monthlyItems.length,
      color: 'green'
    },
    {
      id: 'database' as const,
      label: 'Items Database',
      icon: Database,
      count: databaseItems.length,
      color: 'blue'
    },
    {
      id: 'reports' as const,
      label: 'Analytics',
      icon: BarChart3,
      count: 0,
      color: 'purple'
    }
  ];

  const getTabClasses = (tabId: string, color: string) => {
    const isActive = currentTab === tabId;
    const baseClasses = "flex-1 flex items-center justify-center px-4 py-3 rounded-lg transition-all font-medium relative";
    
    if (isActive) {
      return `${baseClasses} bg-${color}-500 text-white`;
    }
    return `${baseClasses} text-gray-600 hover:bg-gray-100`;
  };

  const getBadgeClasses = (tabId: string, color: string) => {
    const isActive = currentTab === tabId;
    
    if (isActive) {
      return `ml-2 bg-${color}-600 px-2 py-1 rounded-full text-xs`;
    }
    return "ml-2 bg-gray-300 text-gray-700 px-2 py-1 rounded-full text-xs";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm mb-6 p-2">
      <div className="flex space-x-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={getTabClasses(tab.id, tab.color)}
            >
              <Icon className="w-5 h-5 mr-2" />
              {tab.label}
              <span className={getBadgeClasses(tab.id, tab.color)}>
                {tab.count}
              </span>
              
              {/* Sync indicator for active tab */}
              {currentTab === tab.id && connectionStatus === 'connected' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white">
                  <div className="w-full h-full bg-green-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Enhanced main inventory component
const InventoryContent: React.FC<InventoryTabProps> = ({ currentUser, connectionStatus: appConnectionStatus }) => {
  const { currentTab, connectionStatus } = useInventory();

  // Log initialization
  useEffect(() => {
    console.log('🏪 Enhanced Restaurant Inventory initialized with Firebase sync');
    console.log('📡 Connection status:', connectionStatus);
    console.log('👤 Current user:', currentUser);
  }, [connectionStatus, currentUser]);

  // Render content based on current tab
  const renderTabContent = () => {
    switch (currentTab) {
      case 'daily':
        return <DailyView currentUser={currentUser} connectionStatus={connectionStatus} />;
      case 'weekly':
        return <WeeklyView currentUser={currentUser} connectionStatus={connectionStatus} />;
      case 'monthly':
        return <MonthlyView currentUser={currentUser} connectionStatus={connectionStatus} />;
      case 'database':
        return <DatabaseView currentUser={currentUser} connectionStatus={connectionStatus} />;
      case 'reports':
        return <ReportsView currentUser={currentUser} connectionStatus={connectionStatus} />;
      default:
        return <DailyView currentUser={currentUser} connectionStatus={connectionStatus} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header with Firebase Integration */}
        <InventoryHeader />
        
        {/* Enhanced Tab Navigation */}
        <TabNavigation />
        
        {/* Enhanced Tab Content */}
        <div className="bg-white rounded-xl shadow-sm">
          {renderTabContent()}
        </div>
        
        {/* Toast notifications for sync status */}
        <ToastContainer />
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
            <strong>Debug Info:</strong> Tab: {currentTab}, Firebase: {connectionStatus}, App: {appConnectionStatus}
          </div>
        )}
      </div>
    </div>
  );
};

// Main component with Firebase-enabled provider
const RestaurantInventory: React.FC<InventoryTabProps> = (props) => {
  return (
    <InventoryProvider>
      <InventoryContent {...props} />
    </InventoryProvider>
  );
};

export default RestaurantInventory;
