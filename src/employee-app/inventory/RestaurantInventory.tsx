// src/employee-app/inventory/RestaurantInventory.tsx
import React from 'react';
import { ChefHat, AlertTriangle, TrendingDown, CheckCircle, Database, Package } from 'lucide-react';
import { InventoryProvider, useInventory } from './InventoryContext';
import { InventoryTabProps } from './types';
import { getStockStatus } from './stockUtils';
import DatabaseView from './components/DatabaseView';
import DailyView from './components/DailyView';
import WeeklyView from './components/WeeklyView';
import MonthlyView from './components/MonthlyView';
import ReportsView from './components/ReportsView';
import OutOfStockView from './components/OutOfStockView';
import TabNavigation from './components/TabNavigation';
import ToastContainer from './components/ToastContainer';

// Simple Header Component - No background wrapper
const InventoryHeader: React.FC = () => {
  const { dailyItems, weeklyItems, monthlyItems, databaseItems } = useInventory();

  // Calculate stock statistics
  const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
  const criticalCount = allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'critical').length;
  const lowStockCount = allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'low').length;
  const wellStockedCount = allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'ok').length;
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
      case 'outofstock':
        return <OutOfStockView />;
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

const RestaurantInventory: React.FC<InventoryTabProps> = ({ 
  currentUser, 
  connectionStatus,
  inventoryDailyItems,
  inventoryWeeklyItems,
  inventoryMonthlyItems,
  inventoryDatabaseItems,
  inventoryActivityLog,
  inventoryCustomCategories,
  setInventoryDailyItems,
  setInventoryWeeklyItems,
  setInventoryMonthlyItems,
  setInventoryDatabaseItems,
  setInventoryActivityLog,
  setInventoryCustomCategories,
  quickSave
}) => {
  return (
    <InventoryProvider
      inventoryDailyItems={inventoryDailyItems}
      inventoryWeeklyItems={inventoryWeeklyItems}
      inventoryMonthlyItems={inventoryMonthlyItems}
      inventoryDatabaseItems={inventoryDatabaseItems}
      inventoryActivityLog={inventoryActivityLog}
      inventoryCustomCategories={inventoryCustomCategories}
      setInventoryDailyItems={setInventoryDailyItems}
      setInventoryWeeklyItems={setInventoryWeeklyItems}
      setInventoryMonthlyItems={setInventoryMonthlyItems}
      setInventoryDatabaseItems={setInventoryDatabaseItems}
      setInventoryActivityLog={setInventoryActivityLog}
      setInventoryCustomCategories={setInventoryCustomCategories}
      quickSave={quickSave}
    >
      <InventoryContent />
    </InventoryProvider>
  );
};

export default RestaurantInventory;
