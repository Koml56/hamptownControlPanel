// src/employee-app/inventory/components/OutOfStockView.tsx
import React, { useState, useMemo } from 'react';
import { AlertTriangle, Download, TrendingDown, Package, CheckCircle2, Bell, BellOff } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getOutOfStockItems, checkUpcomingHolidays } from '../consumptionAnalytics';
import { generateOrderExcel } from '../excelExport';
import { EnhancedInventoryItem, HolidayAlert as HolidayAlertType } from '../../types';
import { showToast } from '../utils';
import { getStockStatus, markAsOrdered } from '../stockUtils';
import { 
  getNotificationSettings, 
  setNotificationEnabled, 
  isNotificationSupported,
  sendTestNotification 
} from '../notificationService';
import HolidayAlert from './HolidayAlert';

const OutOfStockView: React.FC = () => {
  const { dailyItems, weeklyItems, monthlyItems, setDailyItems, setWeeklyItems, setMonthlyItems, quickSave } = useInventory();
  const [filter, setFilter] = useState<'all' | 'critical' | 'low' | 'out'>('critical');
  const [holidayAlerts] = useState<HolidayAlertType[]>(checkUpcomingHolidays());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [notificationSettings, setNotificationSettings] = useState(getNotificationSettings());

  // Get enhanced items with forecast data
  const enhancedItems = useMemo(() => {
    return getOutOfStockItems(dailyItems, weeklyItems, monthlyItems);
  }, [dailyItems, weeklyItems, monthlyItems]);

  // Filter items based on selected filter
  const filteredItems = useMemo(() => {
    if (filter === 'all') return enhancedItems;
    return enhancedItems.filter(item => item.status === filter);
  }, [enhancedItems, filter]);

  // Fixed summary stats calculation as per requirements
  const getStockSummary = () => {
    const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
    
    return {
      out: allItems.filter(i => i.currentStock === 0).length,
      critical: allItems.filter(i => {
        const pct = (i.currentStock / i.minLevel) * 100;
        return pct > 0 && pct <= 20;
      }).length,
      low: allItems.filter(i => {
        const pct = (i.currentStock / i.minLevel) * 100;
        return pct > 20 && pct <= 50;
      }).length,
      total: allItems.filter(i => {
        const status = getStockStatus(i.currentStock, i.minLevel);
        return ['out', 'critical', 'low'].includes(status);
      }).length
    };
  };

  const summary = getStockSummary();

  const handleGenerateExcel = () => {
    try {
      const fileName = generateOrderExcel(enhancedItems);
      showToast(`Excel file "${fileName}" generated successfully!`);
    } catch (error) {
      showToast('Error generating Excel file');
      console.error('Excel generation error:', error);
    }
  };

  const handleMarkAsOrdered = async () => {
    if (selectedItems.size === 0) {
      showToast('Please select items to mark as ordered');
      return;
    }

    const itemIds = Array.from(selectedItems);
    const quantities = itemIds.map(id => {
      const item = enhancedItems.find(i => i.id.toString() === id);
      return item?.recommendedOrder || item?.optimalLevel || (item?.minLevel ? item.minLevel * 2 : 10);
    });

    try {
      // Update items in respective arrays
      const updatedDaily = markAsOrdered(dailyItems, itemIds, quantities);
      const updatedWeekly = markAsOrdered(weeklyItems, itemIds, quantities);
      const updatedMonthly = markAsOrdered(monthlyItems, itemIds, quantities);

      // Save to state and Firebase
      setDailyItems(updatedDaily);
      setWeeklyItems(updatedWeekly);
      setMonthlyItems(updatedMonthly);

      await quickSave('inventoryDailyItems', updatedDaily);
      await quickSave('inventoryWeeklyItems', updatedWeekly);
      await quickSave('inventoryMonthlyItems', updatedMonthly);

      setSelectedItems(new Set());
      showToast(`${selectedItems.size} items marked as ordered`);
    } catch (error) {
      showToast('Error marking items as ordered');
      console.error('Mark as ordered error:', error);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  // Handle notification toggle
  const handleNotificationToggle = async () => {
    try {
      const newEnabledState = !notificationSettings.enabled;
      const success = await setNotificationEnabled(newEnabledState);
      
      if (success) {
        setNotificationSettings(getNotificationSettings());
        showToast(newEnabledState ? 'Notifications enabled!' : 'Notifications disabled');
        
        // Send test notification when enabling
        if (newEnabledState) {
          setTimeout(() => sendTestNotification(), 1000);
        }
      } else {
        showToast('Failed to enable notifications. Please check browser permissions.');
      }
    } catch (error) {
      showToast('Error updating notification settings');
      console.error('Notification toggle error:', error);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Holiday Alert Banner */}
      {holidayAlerts.length > 0 && (
        <div className="space-y-4">
          {holidayAlerts.map((alert, index) => (
            <HolidayAlert key={index} alert={alert} />
          ))}
        </div>
      )}

      {/* Summary Statistics */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Stock Status Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">{summary.out}</div>
            <div className="text-sm text-red-600">Out of Stock</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">{summary.critical}</div>
            <div className="text-sm text-orange-600">Critical (≤20%)</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{summary.low}</div>
            <div className="text-sm text-yellow-600">Low Stock (≤50%)</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
            <div className="text-sm text-blue-600">Total Needs Attention</div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      {isNotificationSupported() && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {notificationSettings.enabled ? (
                <Bell className="w-5 h-5 text-blue-600 mr-3" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400 mr-3" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Inventory Notifications</h3>
                <p className="text-sm text-gray-600">
                  Get notified when items are out of stock or running low (≤20%)
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationSettings.enabled}
                  onChange={handleNotificationToggle}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          
          {notificationSettings.enabled && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center text-sm text-blue-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                <span>
                  Notifications enabled for this device. You'll be alerted when inventory levels change.
                </span>
              </div>
              {notificationSettings.permission === 'granted' && (
                <div className="text-xs text-blue-600 mt-1">
                  Permission granted - notifications will work even when the app is closed.
                </div>
              )}
            </div>
          )}
          
          {!notificationSettings.enabled && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">
                Enable notifications to get alerts when items are out of stock or running low.
                This setting is saved locally for this device only.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs - horizontal scroll on mobile */}
      <div className="bg-white rounded-xl shadow-sm p-2">
        <div className="overflow-x-auto">
          <div className="flex space-x-2 min-w-max">
            <button
              onClick={() => setFilter('out')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap flex items-center ${
                filter === 'out' 
                  ? 'bg-red-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Out of Stock ({summary.out})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap flex items-center ${
                filter === 'critical' 
                  ? 'bg-orange-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Critical ({summary.critical})
            </button>
            <button
              onClick={() => setFilter('low')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap flex items-center ${
                filter === 'low' 
                  ? 'bg-yellow-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Low Stock ({summary.low})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap flex items-center ${
                filter === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Items ({enhancedItems.length})
            </button>
          </div>
        </div>
      </div>

      {/* Selection Actions */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedItems.size} items selected
            </span>
            <div className="space-x-2">
              <button
                onClick={() => setSelectedItems(new Set())}
                className="px-3 py-1 text-blue-600 hover:bg-blue-100 rounded text-sm"
              >
                Clear Selection
              </button>
              <button
                onClick={handleMarkAsOrdered}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                Mark as Ordered
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Found</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'All items are well stocked!' 
              : `No items with ${filter} stock status.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <StockCard 
              key={item.id} 
              item={item}
              isSelected={selectedItems.has(item.id.toString())}
              onToggleSelection={() => toggleItemSelection(item.id.toString())}
            />
          ))}
        </div>
      )}

      {/* Export Button - Fixed position */}
      {enhancedItems.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-10">
          <button
            onClick={handleGenerateExcel}
            className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-green-600 flex items-center transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Generate Excel Order
          </button>
        </div>
      )}
    </div>
  );
};

// Stock Card Component
const StockCard: React.FC<{ 
  item: EnhancedInventoryItem; 
  isSelected: boolean; 
  onToggleSelection: () => void; 
}> = ({ item, isSelected, onToggleSelection }) => {
  const statusColors = {
    out: 'border-red-500 bg-red-50',
    critical: 'border-orange-500 bg-orange-50',
    low: 'border-yellow-500 bg-yellow-50',
    ok: 'border-green-500 bg-green-50'
  };

  const frequencyColors = {
    daily: 'bg-red-200 text-red-800',
    weekly: 'bg-yellow-200 text-yellow-800',
    monthly: 'bg-green-200 text-green-800',
    database: 'bg-blue-200 text-blue-800',
    outofstock: 'bg-gray-200 text-gray-800'
  };

  const isOrdered = item.orderedStatus?.isOrdered;

  return (
    <div className={`border-2 rounded-lg p-4 ${
      isOrdered 
        ? 'border-blue-500 bg-blue-50 opacity-75' 
        : statusColors[item.status || 'ok']
    } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
      
      {/* Ordered status indicator */}
      {isOrdered && (
        <div className="mb-3 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
          <CheckCircle2 className="w-4 h-4 inline mr-1" />
          Ordered {item.orderedStatus?.orderedQuantity} units on {
            item.orderedStatus?.orderedDate 
              ? new Date(item.orderedStatus.orderedDate).toLocaleDateString()
              : 'Unknown date'
          }
          {item.orderedStatus?.expectedDelivery && (
            <div className="text-xs mt-1">
              Expected: {new Date(item.orderedStatus.expectedDelivery).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Header with checkbox, title, and badge in one row */}
      <div className="flex items-start gap-2 mb-3">
        {!isOrdered && (
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={onToggleSelection}
            className="w-5 h-5 md:w-4 md:h-4 mt-1 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
          />
        )}
        
        <h3 className="font-semibold text-lg flex-1 min-w-0">
          <span className="truncate block" title={item.name}>{item.name}</span>
        </h3>
        
        <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${frequencyColors[item.frequency]}`}>
          {item.frequency}
        </span>
      </div>

      {/* Stock levels */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Current:</span>
          <span className="font-medium">{item.currentStock} {item.unit}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Minimum:</span>
          <span>{item.minimumLevel} {item.unit}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Optimal:</span>
          <span>{item.optimalLevel} {item.unit}</span>
        </div>

        {/* Stock percentage indicator */}
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium capitalize ${
            item.status === 'out' ? 'text-red-600' :
            item.status === 'critical' ? 'text-orange-600' :
            item.status === 'low' ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {item.status} ({Math.round((item.currentStock / item.minimumLevel) * 100)}%)
          </span>
        </div>

        {/* Forecast section */}
        <div className="border-t pt-2 mt-2">
          <div className="flex items-center text-gray-700">
            <TrendingDown className="w-4 h-4 mr-1" />
            <span>~{item.forecast?.averageDailyConsumption.toFixed(1)} {item.unit}/day</span>
          </div>

          <div className={`font-medium mt-1 ${
            (item.daysRemaining || 0) <= 2 ? 'text-red-600' :
            (item.daysRemaining || 0) <= 7 ? 'text-orange-600' : 'text-green-600'
          }`}>
            {item.daysRemaining === 0 ? 'Out of stock!' :
             item.daysRemaining === Infinity ? 'No consumption data' :
             `Will last ${item.daysRemaining} days`}
          </div>

          {item.forecast?.usualOrderThreshold && (
            <div className="text-xs text-gray-500 mt-1">
              Usually order at {item.forecast.usualOrderThreshold.toFixed(0)}% of minimum
            </div>
          )}
        </div>

        {/* Recommended order */}
        <div className="border-t pt-2 mt-2 bg-white rounded p-2">
          <div className="text-xs text-gray-600 mb-1">Recommended order:</div>
          <div className="font-semibold text-green-600">
            {item.recommendedOrder} {item.unit}
            {item.unitPackSize && (
              <span className="text-xs text-gray-500 ml-1">
                ({Math.ceil((item.recommendedOrder || 0) / item.unitPackSize)} packs)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutOfStockView;