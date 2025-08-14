// src/employee-app/inventory/components/ReportsView.tsx
import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, DollarSign, Calendar, GitCompare } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getStockStatus } from '../stockUtils';
import type { DailyInventorySnapshot } from '../../types';

const ReportsView: React.FC = () => {
  const { dailyItems, weeklyItems, monthlyItems, activityLog } = useInventory();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [comparisonMode, setComparisonMode] = useState<'none' | 'previous-day' | 'week-average'>('none');

  // Helper function to format date for display
  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Helper function to get date range for analysis
  const getDateRange = (targetDate: string) => {
    const date = new Date(targetDate);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return { startOfDay, endOfDay };
  };

  // Calculate metrics for selected date
  const selectedDateMetrics = useMemo(() => {
    const { startOfDay, endOfDay } = getDateRange(selectedDate);
    
    // Filter activity log for selected date
    const dayActivity = activityLog.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startOfDay && entryDate <= endOfDay;
    });

    // Calculate daily metrics
    const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
    const wasteToday = dayActivity
      .filter(entry => entry.type === 'waste')
      .reduce((sum, entry) => sum + entry.quantity, 0);

    const totalWasteValue = dayActivity
      .filter(entry => entry.type === 'waste')
      .reduce((sum, entry) => {
        const item = allItems.find(i => i.name === entry.item);
        return sum + (entry.quantity * (item?.cost || 0));
      }, 0);

    const countUpdates = dayActivity.filter(a => a.type === 'count_update').length;
    const wasteReports = dayActivity.filter(a => a.type === 'waste').length;
    const manualAdds = dayActivity.filter(a => a.type === 'manual_add').length;

    // Calculate current inventory metrics (as of selected date if historical)
    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    let criticalItems, lowStockItems, totalValue;
    
    if (isToday) {
      // Use current data for today
      criticalItems = allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'critical');
      lowStockItems = allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'low');
      totalValue = allItems.reduce((sum, item) => sum + (item.cost * item.currentStock), 0);
    } else {
      // For historical dates, we'd need to reconstruct state - for now show current with note
      criticalItems = allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'critical');
      lowStockItems = allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'low');
      totalValue = allItems.reduce((sum, item) => sum + (item.cost * item.currentStock), 0);
    }

    return {
      dayActivity,
      wasteToday,
      totalWasteValue,
      countUpdates,
      wasteReports,
      manualAdds,
      criticalItems,
      lowStockItems,
      totalValue,
      allItems,
      isToday
    };
  }, [selectedDate, dailyItems, weeklyItems, monthlyItems, activityLog]);

  // Calculate comparison metrics
  const comparisonMetrics = useMemo(() => {
    if (comparisonMode === 'none') return null;

    if (comparisonMode === 'previous-day') {
      const prevDate = new Date(selectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      const { startOfDay, endOfDay } = getDateRange(prevDateStr);
      
      const prevDayActivity = activityLog.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startOfDay && entryDate <= endOfDay;
      });

      const prevWaste = prevDayActivity
        .filter(entry => entry.type === 'waste')
        .reduce((sum, entry) => sum + entry.quantity, 0);

      const prevCountUpdates = prevDayActivity.filter(a => a.type === 'count_update').length;

      return {
        type: 'previous-day',
        label: formatDisplayDate(prevDateStr),
        wasteChange: selectedDateMetrics.wasteToday - prevWaste,
        countUpdatesChange: selectedDateMetrics.countUpdates - prevCountUpdates,
      };
    }

    return null;
  }, [comparisonMode, selectedDate, activityLog, selectedDateMetrics]);

  return (
    <div className="space-y-6">
      {/* Header with Date Picker */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-purple-600" />
              Daily Inventory Reports
            </h2>
            <p className="text-gray-600">Detailed analysis for {formatDisplayDate(selectedDate)}</p>
          </div>
          
          {/* Date Selection Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]} // Can't select future dates
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-gray-500" />
              <select
                value={comparisonMode}
                onChange={(e) => setComparisonMode(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="none">No Comparison</option>
                <option value="previous-day">vs Previous Day</option>
                <option value="week-average">vs Week Average</option>
              </select>
            </div>
          </div>
        </div>

        {/* Historical Data Notice */}
        {!selectedDateMetrics.isToday && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-blue-600 mr-2" />
              <div className="text-sm text-blue-800">
                <strong>Historical Data:</strong> Viewing data for {formatDisplayDate(selectedDate)}. 
                Stock levels shown are current values - historical reconstruction coming soon.
              </div>
            </div>
          </div>
        )}

        {/* Comparison Information */}
        {comparisonMetrics && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm text-green-800">
              <strong>Comparing with {comparisonMetrics.label}:</strong>
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <span>Waste: {comparisonMetrics.wasteChange > 0 ? '+' : ''}{comparisonMetrics.wasteChange} items</span>
                <span>Updates: {comparisonMetrics.countUpdatesChange > 0 ? '+' : ''}{comparisonMetrics.countUpdatesChange} counts</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{selectedDateMetrics.allItems.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                Daily: {dailyItems.length} | Weekly: {weeklyItems.length} | Monthly: {monthlyItems.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Items</p>
              <p className="text-2xl font-bold text-red-600">{selectedDateMetrics.criticalItems.length}</p>
              <p className="text-xs text-red-500 mt-1">
                {selectedDateMetrics.criticalItems.length > 0 ? 'Immediate attention required' : 'All items properly stocked'}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inventory Value</p>
              <p className="text-2xl font-bold text-green-600">€{selectedDateMetrics.totalValue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedDateMetrics.isToday ? 'Current stock value' : 'Stock value (current levels)'}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {selectedDateMetrics.isToday ? "Today's" : "Day's"} Waste
              </p>
              <p className="text-2xl font-bold text-orange-600">{selectedDateMetrics.wasteToday}</p>
              <p className="text-xs text-gray-500 mt-1">Items wasted</p>
              {comparisonMetrics && (
                <p className="text-xs text-orange-600 mt-1">
                  {comparisonMetrics.wasteChange > 0 ? '+' : ''}{comparisonMetrics.wasteChange} vs {comparisonMetrics.type.replace('-', ' ')}
                </p>
              )}
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Stock Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock Status Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Normal Stock</span>
              </div>
              <span className="font-semibold text-green-600">
                {selectedDateMetrics.allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'ok').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Low Stock</span>
              </div>
              <span className="font-semibold text-yellow-600">{selectedDateMetrics.lowStockItems.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Critical Stock</span>
              </div>
              <span className="font-semibold text-red-600">{selectedDateMetrics.criticalItems.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {selectedDateMetrics.isToday ? "Today's" : "Day's"} Activity Summary
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg mr-2">📝</span>
                <span className="text-sm text-gray-600">Count Updates</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-blue-600">{selectedDateMetrics.countUpdates}</span>
                {comparisonMetrics && (
                  <div className="text-xs text-gray-500">
                    {comparisonMetrics.countUpdatesChange > 0 ? '+' : ''}{comparisonMetrics.countUpdatesChange}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg mr-2">🗑️</span>
                <span className="text-sm text-gray-600">Waste Reports</span>
              </div>
              <span className="font-semibold text-orange-600">{selectedDateMetrics.wasteReports}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg mr-2">💰</span>
                <span className="text-sm text-gray-600">Waste Value</span>
              </div>
              <span className="font-semibold text-red-600">€{selectedDateMetrics.totalWasteValue.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg mr-2">📥</span>
                <span className="text-sm text-gray-600">Manual Adds</span>
              </div>
              <span className="font-semibold text-green-600">{selectedDateMetrics.manualAdds}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Items Alert */}
      {selectedDateMetrics.criticalItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">🚨 Critical Stock Alert</h3>
          </div>
          <p className="text-red-700 mb-4">
            The following items are critically low and require immediate restocking:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedDateMetrics.criticalItems.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-lg border-l-4 border-red-500">
                <div className="font-medium text-gray-800">{item.name}</div>
                <div className="text-sm text-red-600">
                  Current: <span className="font-bold">{item.currentStock} {item.unit}</span> | 
                  Min Required: <span className="font-bold">{item.minLevel} {item.unit}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 capitalize">{item.category}</div>
                <div className="text-xs text-red-500 mt-1">
                  Shortage: {item.minLevel - item.currentStock} {item.unit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Log */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            {selectedDateMetrics.isToday ? 'Recent Activity Log' : `Activity Log for ${formatDisplayDate(selectedDate)}`}
          </h3>
          <p className="text-gray-600 text-sm">
            {selectedDateMetrics.isToday 
              ? 'Latest inventory transactions and updates' 
              : `All inventory transactions for ${formatDisplayDate(selectedDate)}`}
          </p>
        </div>
        <div className="p-6">
          {selectedDateMetrics.dayActivity.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">📋</div>
              <p className="text-gray-500">
                {selectedDateMetrics.isToday ? 'No activity recorded yet' : 'No activity recorded for this date'}
              </p>
              <p className="text-sm text-gray-400">
                {selectedDateMetrics.isToday 
                  ? 'Start by updating item counts or reporting waste'
                  : 'Try selecting a different date or check if data exists for this period'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedDateMetrics.dayActivity.slice(0, 20).map(entry => (
                <div key={entry.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-lg mr-3">
                      {entry.type === 'count_update' ? '📝' : 
                       entry.type === 'waste' ? '🗑️' : 
                       entry.type === 'import' ? '📥' : '➕'}
                    </span>
                    <div>
                      <div className="font-medium text-gray-800">{entry.item}</div>
                      <div className="text-sm text-gray-600">
                        {entry.type === 'count_update' && `Updated count to ${entry.quantity} ${entry.unit}`}
                        {entry.type === 'waste' && `Wasted ${entry.quantity} ${entry.unit} - ${entry.reason}`}
                        {entry.type === 'import' && `Imported ${entry.quantity} ${entry.unit}`}
                        {entry.type === 'manual_add' && `Added to database`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">{entry.employee}</div>
                    <div className="text-xs text-gray-400">{entry.timestamp}</div>
                  </div>
                </div>
              ))}
              {selectedDateMetrics.dayActivity.length > 20 && (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-500">
                    Showing first 20 of {selectedDateMetrics.dayActivity.length} activities
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
