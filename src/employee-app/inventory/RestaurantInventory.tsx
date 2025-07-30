// src/employee-app/inventory/RestaurantInventory.tsx
import React from 'react';
import { ChefHat, Flame, Calendar, Package, Database, BarChart3, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react';
import { InventoryProvider, useInventory } from './InventoryContext';
import { InventoryTabProps } from './types';
import { getStockStatus } from './utils';
import DatabaseView from './components/DatabaseView';
import DailyView from './components/DailyView';
import WeeklyView from './components/WeeklyView';
import MonthlyView from './components/MonthlyView';
import ReportsView from './components/ReportsView';
import ToastContainer from './components/ToastContainer';

// Simple Header Component - No background wrapper
const InventoryHeader: React.FC = () => {
  const { dailyItems, weeklyItems, monthlyItems, databaseItems } = useInventory();

  // Calculate stock statistics
  const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
  const criticalCount = allItems.filter(item => getStockStatus(item) === 'critical').length;
  const lowStockCount = allItems.filter(item => getStockStatus(item) === 'low').length;
  const wellStockedCount = allItems.filter(item => getStockStatus(item) === 'normal').length;
  const databaseCount = databaseItems.length;

  return (
    <div className="bg-white rounded-xl shadow-sm mb-6 p-4 md:p-6">
      {/* Header Title */}
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
      </div>

      {/* Mobile-First Statistics */}
      <div className="space-y-3">
        {/* Critical Alert - Always Visible */}
        {criticalCount > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-800">
                  {criticalCount} Critical Item{criticalCount > 1 ? 's' : ''} Need Attention
                </div>
                <div className="text-xs text-red-600">Immediate restocking required</div>
              </div>
              <div className="text-2xl font-bold text-red-700">{criticalCount}</div>
            </div>
          </div>
        )}

        {/* Compact Stats Grid - Mobile Responsive */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-yellow-600">Low Stock</div>
                <div className="text-lg font-bold text-yellow-800">{lowStockCount}</div>
              </div>
              <TrendingDown className="w-4 h-4 text-yellow-600" />
            </div>
          </div>

          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-green-600">Good Stock</div>
                <div className="text-lg font-bold text-green-800">{wellStockedCount}</div>
              </div>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-blue-600">Database</div>
                <div className="text-lg font-bold text-blue-800">{databaseCount}</div>
              </div>
              <Database className="w-4 h-4 text-blue-600" />
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-gray-600">Total Items</div>
                <div className="text-lg font-bold text-gray-800">{allItems.length}</div>
              </div>
              <Package className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Tab Navigation - No background wrapper
const TabNavigation: React.FC = () => {
  const { currentTab, switchTab, dailyItems, weeklyItems, monthlyItems, databaseItems } = useInventory();

  const tabs = [
    {
      id: 'daily' as const,
      label: 'Daily',
      icon: Flame,
      count: dailyItems.length,
      color: 'red'
    },
    {
      id: 'weekly' as const,
      label: 'Weekly',
      icon: Calendar,
      count: weeklyItems.length,
      color: 'yellow'
    },
    {
      id: 'monthly' as const,
      label: 'Monthly',
      icon: Package,
      count: monthlyItems.length,
      color: 'green'
    },
    {
      id: 'database' as const,
      label: 'Database',
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

  return (
    <div className="bg-white rounded-xl shadow-sm mb-6 p-2">
      <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex-shrink-0 flex items-center justify-center px-3 py-2 md:px-4 md:py-3 rounded-lg transition-all font-medium min-w-max ${
                isActive 
                  ? `bg-${tab.color}-500 text-white` 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
              <span className="text-sm md:text-base">{tab.label}</span>
              <span className={`ml-1 md:ml-2 px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xs ${
                isActive 
                  ? `bg-${tab.color}-600` 
                  : 'bg-gray-300 text-gray-700'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const InventoryContent: React.FC = () => {
  const { currentTab } = useInventory();

  const renderCurrentView = () => {
    switch (currentTab) {
      case 'daily':
        return <DailyView />;
      case 'weekly':
        return <WeeklyView />;
      case 'monthly':
        return <MonthlyView />;
      case 'database':
        return <DatabaseView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <DailyView />;
    }
  };

  // CRITICAL: No wrapper divs, no background, no containers
  // This should render exactly like MoodTracker, TaskManager, Store components
  return (
    <>
      <ToastContainer />
      <InventoryHeader />
      <TabNavigation />
      {renderCurrentView()}
    </>
  );
};

const RestaurantInventory: React.FC<InventoryTabProps> = ({ currentUser, connectionStatus }) => {
  return (
    <InventoryProvider>
      <InventoryContent />
    </InventoryProvider>
  );
};

export default RestaurantInventory;
