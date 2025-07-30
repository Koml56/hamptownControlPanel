// src/employee-app/inventory/RestaurantInventory.tsx
import React from 'react';
import { ChefHat, Flame, Calendar, Package, Database, BarChart3 } from 'lucide-react';
import { InventoryProvider, useInventory } from './InventoryContext';
import { InventoryTabProps } from './types';
import { getStockStatus } from './utils';
import DatabaseView from './components/DatabaseView';
import DailyView from './components/DailyView';
import WeeklyView from './components/WeeklyView';
import MonthlyView from './components/MonthlyView';
import ReportsView from './components/ReportsView';
import ToastContainer from './components/ToastContainer';

// Integrated Header Component
const InventoryHeader: React.FC = () => {
  const { dailyItems, weeklyItems, monthlyItems, databaseItems } = useInventory();

  // Calculate stock statistics
  const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
  const criticalCount = allItems.filter(item => getStockStatus(item) === 'critical').length;
  const lowStockCount = allItems.filter(item => getStockStatus(item) === 'low').length;
  const wellStockedCount = allItems.filter(item => getStockStatus(item) === 'normal').length;
  const databaseCount = databaseItems.length;

  return (
    <div className="bg-white rounded-xl shadow-sm mb-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-orange-500 p-3 rounded-lg mr-4">
            <ChefHat className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Restaurant Inventory</h1>
            <p className="text-gray-600">Track usage, waste, and consumption patterns</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-red-50 px-4 py-2 rounded-lg">
            <div className="text-sm text-red-600 font-medium">Critical Items</div>
            <div className="text-xl font-bold text-red-800">{criticalCount}</div>
          </div>
          <div className="bg-yellow-50 px-4 py-2 rounded-lg">
            <div className="text-sm text-yellow-600 font-medium">Low Stock</div>
            <div className="text-xl font-bold text-yellow-800">{lowStockCount}</div>
          </div>
          <div className="bg-green-50 px-4 py-2 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Well Stocked</div>
            <div className="text-xl font-bold text-green-800">{wellStockedCount}</div>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Database Items</div>
            <div className="text-xl font-bold text-blue-800">{databaseCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Integrated Tab Navigation Component
const TabNavigation: React.FC = () => {
  const { currentTab, switchTab, dailyItems, weeklyItems, monthlyItems, databaseItems } = useInventory();

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

  return (
    <div className="bg-white rounded-xl shadow-sm mb-6 p-2">
      <div className="flex space-x-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg transition-all font-medium ${
                isActive 
                  ? `bg-${tab.color}-500 text-white` 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {tab.label}
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <ToastContainer />
      
      <div className="max-w-7xl mx-auto">
        <InventoryHeader />
        <TabNavigation />
        {renderCurrentView()}
      </div>
    </div>
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
