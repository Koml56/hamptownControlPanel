// src/employee-app/inventory/components/OutOfStockView.tsx
import React, { useState, useMemo } from 'react';
import { AlertTriangle, Calendar, Download, TrendingDown, Package } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getOutOfStockItems, checkUpcomingHolidays } from '../consumptionAnalytics';
import { generateOrderExcel } from '../excelExport';
import { EnhancedInventoryItem, HolidayAlert } from '../../types';
import { showToast } from '../utils';

const OutOfStockView: React.FC = () => {
  const { dailyItems, weeklyItems, monthlyItems } = useInventory();
  const [filter, setFilter] = useState<'all' | 'critical' | 'low' | 'out'>('critical');
  const [holidayAlerts] = useState<HolidayAlert[]>(checkUpcomingHolidays());

  // Get enhanced items with forecast data
  const enhancedItems = useMemo(() => {
    return getOutOfStockItems(dailyItems, weeklyItems, monthlyItems);
  }, [dailyItems, weeklyItems, monthlyItems]);

  // Filter items based on selected filter
  const filteredItems = useMemo(() => {
    if (filter === 'all') return enhancedItems;
    return enhancedItems.filter(item => item.status === filter);
  }, [enhancedItems, filter]);

  const handleGenerateExcel = () => {
    try {
      const fileName = generateOrderExcel(enhancedItems);
      showToast(`Excel file "${fileName}" generated successfully!`);
    } catch (error) {
      showToast('Error generating Excel file');
      console.error('Excel generation error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Holiday Alert Banner */}
      {holidayAlerts.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
          <div className="flex items-start">
            <Calendar className="w-5 h-5 text-orange-500 mt-1 mr-3" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900">
                Upcoming Holiday: {holidayAlerts[0].holiday}
              </h3>
              <p className="text-orange-700 mt-1">
                In {holidayAlerts[0].daysUntil} days - Review last year's consumption
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Stock Status Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">
              {enhancedItems.filter(i => i.status === 'out').length}
            </div>
            <div className="text-sm text-red-600">Out of Stock</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">
              {enhancedItems.filter(i => i.status === 'critical').length}
            </div>
            <div className="text-sm text-orange-600">Critical</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">
              {enhancedItems.filter(i => i.status === 'low').length}
            </div>
            <div className="text-sm text-yellow-600">Low Stock</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">
              {enhancedItems.length}
            </div>
            <div className="text-sm text-blue-600">Total Items</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-2">
        <div className="flex space-x-2 overflow-x-auto">
          <button
            onClick={() => setFilter('out')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              filter === 'out' 
                ? 'bg-red-500 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Out of Stock ({enhancedItems.filter(i => i.status === 'out').length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              filter === 'critical' 
                ? 'bg-orange-500 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Critical ({enhancedItems.filter(i => i.status === 'critical').length})
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              filter === 'low' 
                ? 'bg-yellow-500 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <TrendingDown className="w-4 h-4 inline mr-2" />
            Low Stock ({enhancedItems.filter(i => i.status === 'low').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              filter === 'all' 
                ? 'bg-blue-500 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Items ({enhancedItems.length})
          </button>
        </div>
      </div>

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
            <StockCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Export Button - Fixed position */}
      {enhancedItems.length > 0 && (
        <div className="fixed bottom-6 right-6 z-10">
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
const StockCard: React.FC<{ item: EnhancedInventoryItem }> = ({ item }) => {
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

  return (
    <div className={`border-2 rounded-lg p-4 ${statusColors[item.status || 'ok']}`}>
      {/* Header with frequency badge */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg">{item.name}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${frequencyColors[item.frequency]}`}>
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