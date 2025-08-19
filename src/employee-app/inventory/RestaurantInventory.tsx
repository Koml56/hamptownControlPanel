import React, { useState } from 'react';
import { ChefHat, AlertTriangle, TrendingDown, CheckCircle, Database, Package, Search } from 'lucide-react';
import { InventoryProvider, useInventory } from './InventoryContext';
import { InventoryTabProps } from './types';
import { InventoryFrequency } from '../types';
import { getStockStatus } from './stockUtils';
import DatabaseView from './components/DatabaseView';
import DailyView from './components/DailyView';
import WeeklyView from './components/WeeklyView';
import MonthlyView from './components/MonthlyView';
import OutOfStockView from './components/OutOfStockView';
import TabNavigation from './components/TabNavigation';
import ToastContainer from './components/ToastContainer';
import ReportsView from './components/ReportsView'; // Import our new analytics dashboard
import GlobalSearchModal from './components/GlobalSearchModal';
import CountModal from './components/CountModal';
import WasteModal from './components/WasteModal';

// Simple Header Component - No background wrapper
const InventoryHeader: React.FC = () => {
  const { dailyItems, weeklyItems, monthlyItems, databaseItems } = useInventory();
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | string | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<InventoryFrequency>('daily');

  // Calculate stock statistics
  const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
  const criticalCount = allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'critical').length;
  const lowStockCount = allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'low').length;
  const wellStockedCount = allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'ok').length;
  const databaseCount = databaseItems.length;

  const handleGlobalUpdateCount = (itemId: number | string, frequency: InventoryFrequency) => {
    setSelectedItemId(itemId);
    setSelectedFrequency(frequency);
    setShowCountModal(true);
  };

  const handleGlobalReportWaste = (itemId: number | string, frequency: InventoryFrequency) => {
    setSelectedItemId(itemId);
    setSelectedFrequency(frequency);
    setShowWasteModal(true);
  };

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
        
        {/* Global Search Button */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowGlobalSearch(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center text-sm md:text-base"
          >
            <Search className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Global Search
          </button>
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
      
      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onUpdateCount={handleGlobalUpdateCount}
        onReportWaste={handleGlobalReportWaste}
      />

      {/* Count Modal for Global Search */}
      {showCountModal && (
        <CountModal
          frequency={selectedFrequency}
          selectedItemId={selectedItemId}
          onClose={() => {
            setShowCountModal(false);
            setSelectedItemId(null);
          }}
        />
      )}

      {/* Waste Modal for Global Search */}
      {showWasteModal && (
        <WasteModal
          frequency={selectedFrequency}
          selectedItemId={selectedItemId}
          onClose={() => {
            setShowWasteModal(false);
            setSelectedItemId(null);
          }}
        />
      )}
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
      case 'analytics':
        return <ReportsView />; // Use our new analytics dashboard
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
  employees,
  isAdmin, // NEW: Admin state from main app
  inventoryDailyItems,
  inventoryWeeklyItems,
  inventoryMonthlyItems,
  inventoryDatabaseItems,
  inventoryActivityLog,
  inventoryCustomCategories,
  stockCountSnapshots,
  dailyInventorySnapshots,
  inventoryHistoricalSnapshots,
  setInventoryDailyItems,
  setInventoryWeeklyItems,
  setInventoryMonthlyItems,
  setInventoryDatabaseItems,
  setInventoryActivityLog,
  setInventoryCustomCategories,
  setStockCountSnapshots,
  setDailyInventorySnapshots,
  setInventoryHistoricalSnapshots,
  quickSave
}) => {
  return (
    <InventoryProvider
      currentUser={currentUser}
      employees={employees}
      isAdmin={isAdmin} // NEW: Pass admin state to provider
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
    >
      <InventoryContent />
    </InventoryProvider>
  );
};

export default RestaurantInventory;
