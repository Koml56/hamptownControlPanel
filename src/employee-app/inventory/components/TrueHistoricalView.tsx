// src/employee-app/inventory/components/TrueHistoricalView.tsx
/**
 * True Historical View Component
 * 
 * This component implements the solution to the broken snapshot system by:
 * 1. Displaying TRUE historical data (not current data with old dates)
 * 2. Never modifying historical records
 * 3. Showing data exactly as it was on each date
 * 4. Enhanced analytics with drill-down capabilities
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  BarChart3, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Package,
  AlertTriangle,
  DollarSign,
  Eye,
  Info,
  PieChart,
  Activity
} from 'lucide-react';
import { getDailySnapshotService, type DailySnapshot } from '../dailySnapshotService';

interface TrueHistoricalViewProps {
  className?: string;
}

const TrueHistoricalView: React.FC<TrueHistoricalViewProps> = ({ className = '' }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [historicalSnapshot, setHistoricalSnapshot] = useState<DailySnapshot | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snapshotService = getDailySnapshotService();

  // Load available dates on component mount
  useEffect(() => {
    const loadAvailableDates = async () => {
      try {
        const dates = await snapshotService.getAvailableHistoricalDates();
        setAvailableDates(dates);
        
        // If current selected date doesn't have a snapshot, select the latest available
        if (dates.length > 0 && !dates.includes(selectedDate)) {
          setSelectedDate(dates[dates.length - 1]);
        }
      } catch (error) {
        console.error('Error loading available dates:', error);
        setError('Failed to load available dates');
      }
    };

    loadAvailableDates();
  }, [selectedDate]);

  // Load historical snapshot when date changes
  useEffect(() => {
    const loadHistoricalSnapshot = async () => {
      if (!selectedDate) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const snapshot = await snapshotService.loadHistoricalSnapshot(selectedDate);
        setHistoricalSnapshot(snapshot);
        
        if (!snapshot) {
          setError(`No historical data available for ${selectedDate}`);
        }
      } catch (error) {
        console.error('Error loading historical snapshot:', error);
        setError('Failed to load historical data');
      } finally {
        setLoading(false);
      }
    };

    loadHistoricalSnapshot();
  }, [selectedDate]);

  // Format historical data for display
  const historicalItems = useMemo(() => {
    if (!historicalSnapshot) return [];
    
    return Object.entries(historicalSnapshot.inventoryState).map(([itemId, item]) => ({
      id: itemId,
      name: item.itemName,
      category: item.category,
      frequency: item.frequency,
      quantity: item.quantity, // Historical quantity
      unitCost: item.unitCost, // Historical price (NEVER changes)
      totalValue: item.totalValue, // Historical value (NEVER changes)
      unit: item.unit,
      minLevel: item.minLevel,
      optimalLevel: item.optimalLevel,
      lastUpdated: item.lastUpdated,
      stockStatus: getStockStatus(item.quantity, item.minLevel)
    }));
  }, [historicalSnapshot]);

  // Category breakdown for analytics
  const categoryBreakdown = useMemo(() => {
    const breakdown: { [category: string]: { items: number; totalValue: number } } = {};
    
    historicalItems.forEach(item => {
      if (!breakdown[item.category]) {
        breakdown[item.category] = { items: 0, totalValue: 0 };
      }
      breakdown[item.category].items++;
      breakdown[item.category].totalValue += item.totalValue;
    });
    
    return Object.entries(breakdown).map(([category, data]) => ({
      category,
      items: data.items,
      totalValue: data.totalValue
    })).sort((a, b) => b.totalValue - a.totalValue);
  }, [historicalItems]);

  // Stock status helper
  const getStockStatus = (currentStock: number, minLevel: number): 'out' | 'critical' | 'low' | 'ok' => {
    if (currentStock === 0) return 'out';
    if (currentStock <= minLevel * 0.5) return 'critical';
    if (currentStock <= minLevel) return 'low';
    return 'ok';
  };

  // Handle date selection
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setShowBreakdown(false);
  };

  // Handle inventory value click - show breakdown
  const handleInventoryValueClick = () => {
    setShowBreakdown(true);
  };

  // Export historical data
  const handleExport = () => {
    if (!historicalSnapshot) return;
    
    const exportData = {
      date: historicalSnapshot.date,
      capturedAt: historicalSnapshot.capturedAt,
      metadata: historicalSnapshot.metadata,
      items: historicalItems,
      totals: historicalSnapshot.dailyTotals,
      categoryBreakdown
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historical-inventory-${selectedDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading historical data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">True Historical Inventory</h2>
            <p className="text-gray-600">
              Accurate historical data preserved from {historicalSnapshot?.capturedAt ? 
                new Date(historicalSnapshot.capturedAt).toLocaleString() : 'N/A'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={!historicalSnapshot}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Date Selection */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Historical Date:</label>
          </div>
          <select
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableDates.length === 0 ? (
              <option value="">No historical data available</option>
            ) : (
              availableDates.map(date => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString()}
                </option>
              ))
            )}
          </select>
          
          {availableDates.length > 0 && (
            <span className="text-sm text-gray-500">
              {availableDates.length} historical records available
            </span>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Historical Accuracy Notice */}
        {historicalSnapshot && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">Historical Accuracy Guaranteed</span>
            </div>
            <p className="text-green-700 text-sm">
              This data represents the actual inventory state on {selectedDate} at {
                new Date(historicalSnapshot.capturedAt).toLocaleTimeString()
              }. Historical prices and quantities are preserved and never modified.
            </p>
          </div>
        )}

        {/* Summary Cards */}
        {historicalSnapshot && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div 
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={handleInventoryValueClick}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Inventory Value</p>
                  <p className="text-2xl font-bold text-blue-900">
                    ${historicalSnapshot.dailyTotals.totalInventoryValue.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600 text-xs">Click for breakdown</span>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Total Items</p>
                  <p className="text-2xl font-bold text-green-900">
                    {historicalSnapshot.dailyTotals.totalItems}
                  </p>
                </div>
                <Package className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Stock Issues</p>
                  <p className="text-2xl font-bold text-red-900">
                    {historicalSnapshot.dailyTotals.outOfStockItems + 
                     historicalSnapshot.dailyTotals.criticalStockItems + 
                     historicalSnapshot.dailyTotals.lowStockItems}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Categories</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {categoryBreakdown.length}
                  </p>
                </div>
                <PieChart className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Breakdown Modal */}
      {showBreakdown && historicalSnapshot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Inventory Breakdown - {selectedDate}</h3>
                <button
                  onClick={() => setShowBreakdown(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {/* Category Breakdown */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-4">Value by Category</h4>
                <div className="space-y-2">
                  {categoryBreakdown.map((category, index) => (
                    <div key={category.category} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{category.category}</span>
                        <span className="text-gray-500 ml-2">({category.items} items)</span>
                      </div>
                      <span className="font-bold">${category.totalValue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Item Details */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Item Details</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Item</th>
                        <th className="text-left p-2">Category</th>
                        <th className="text-right p-2">Quantity</th>
                        <th className="text-right p-2">Unit Cost</th>
                        <th className="text-right p-2">Total Value</th>
                        <th className="text-center p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicalItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{item.name}</td>
                          <td className="p-2 text-gray-600">{item.category}</td>
                          <td className="p-2 text-right">{item.quantity} {item.unit}</td>
                          <td className="p-2 text-right">${item.unitCost.toFixed(2)}</td>
                          <td className="p-2 text-right font-medium">${item.totalValue.toFixed(2)}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.stockStatus === 'out' ? 'bg-red-100 text-red-800' :
                              item.stockStatus === 'critical' ? 'bg-orange-100 text-orange-800' :
                              item.stockStatus === 'low' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.stockStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Items Table */}
      {historicalSnapshot && historicalItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Historical Inventory Items</h3>
            <p className="text-gray-600 text-sm">
              Data captured on {selectedDate} - prices and quantities are historical and immutable
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4">Item Name</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-right p-4">Quantity</th>
                  <th className="text-right p-4">Historical Price</th>
                  <th className="text-right p-4">Historical Value</th>
                  <th className="text-center p-4">Stock Status</th>
                </tr>
              </thead>
              <tbody>
                {historicalItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.frequency}</div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">{item.category}</td>
                    <td className="p-4 text-right">{item.quantity} {item.unit}</td>
                    <td className="p-4 text-right">${item.unitCost.toFixed(2)}</td>
                    <td className="p-4 text-right font-medium">${item.totalValue.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.stockStatus === 'out' ? 'bg-red-100 text-red-800' :
                        item.stockStatus === 'critical' ? 'bg-orange-100 text-orange-800' :
                        item.stockStatus === 'low' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {item.stockStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !historicalSnapshot && !error && (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Historical Data</h3>
          <p className="text-gray-600">
            No historical snapshot is available for the selected date. 
            Historical snapshots are created automatically at 11:59 PM each day.
          </p>
        </div>
      )}
    </div>
  );
};

export default TrueHistoricalView;