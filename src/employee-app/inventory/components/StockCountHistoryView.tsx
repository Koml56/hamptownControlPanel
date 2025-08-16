// src/employee-app/inventory/components/StockCountHistoryView.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  BarChart3, 
  Download, 
  Filter, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Package,
  AlertTriangle,
  Search,
  FileText,
  Eye
} from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getStockStatus } from '../stockUtils';
import type { StockCountSnapshot, InventoryFrequency, InventoryItem } from '../../types';

interface HistoricalItemData {
  itemId: string;
  itemName: string;
  category: string;
  frequency: InventoryFrequency;
  stockLevel: number;
  unit: string;
  unitCost: number;
  totalValue: number;
  stockStatus: 'out' | 'critical' | 'low' | 'ok' | 'unknown';
  minLevel: number;
  optimalLevel: number;
  lastCountDate: string;
  countedBy: string;
}

const StockCountHistoryView: React.FC = () => {
  const { 
    stockCountSnapshots, 
    createStockSnapshot,
    dailyItems,
    weeklyItems, 
    monthlyItems
  } = useInventory();
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [frequencyFilter, setFrequencyFilter] = useState<InventoryFrequency | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [comparisonDate, setComparisonDate] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

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

  // Get available dates from both snapshot types
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    
    // Add dates from daily snapshots (priority)
    dailyInventorySnapshots.forEach(snapshot => {
      dates.add(snapshot.date);
    });
    
    // Add dates from stock count snapshots
    stockCountSnapshots.forEach(snapshot => {
      dates.add(snapshot.date);
    });
    
    // Always include today for live data
    const today = new Date().toISOString().split('T')[0];
    dates.add(today);
    
    return Array.from(dates).sort().reverse(); // Most recent first
  }, [stockCountSnapshots, dailyInventorySnapshots]);

  // Get snapshot for selected date (prefer daily snapshots)
  const selectedSnapshot = useMemo(() => {
    // First try to get daily snapshot
    const dailySnapshot = dailyInventorySnapshots.find(s => s.date === selectedDate);
    if (dailySnapshot) {
      return {
        type: 'daily' as const,
        data: dailySnapshot,
        items: Object.values(dailySnapshot.items)
      };
    }
    
    // Fallback to stock count snapshots
    const snapshots = stockCountSnapshots.filter(s => s.date === selectedDate);
    if (snapshots.length === 0) {
      return null;
    }
    
    if (snapshots.length === 1) {
      return {
        type: 'stock' as const,
        data: snapshots[0].snapshot,
        items: Object.values(snapshots[0].snapshot.itemCounts).map((item: any) => ({
          id: item.itemId || Math.random(),
          name: item.itemName,
          category: item.category,
          frequency: item.frequency,
          currentStock: item.currentStock,
          unit: item.unit,
          minimumLevel: item.minLevel,
          unitCost: item.unitCost,
          totalValue: item.totalValue,
          lastCountDate: item.lastCountDate,
          countedBy: item.countedBy,
          optimalLevel: item.optimalLevel
        }))
      };
    }
    
    // Combine multiple stock count snapshots
    const combinedSnapshot: StockCountSnapshot = {
      date: selectedDate,
      frequency: 'daily',
      timestamp: snapshots[0].snapshot.timestamp,
      totalItems: 0,
      totalValue: 0,
      itemCounts: {},
      summary: {
        dailyItemsCount: 0,
        weeklyItemsCount: 0,
        monthlyItemsCount: 0,
        totalInventoryValue: 0,
        outOfStockItems: 0,
        criticalStockItems: 0,
        lowStockItems: 0
      }
    };
    
    snapshots.forEach(s => {
      Object.assign(combinedSnapshot.itemCounts, s.snapshot.itemCounts);
      combinedSnapshot.totalValue += s.snapshot.totalValue;
      combinedSnapshot.totalItems += s.snapshot.totalItems;
    });
    
    return {
      type: 'stock' as const,
      data: combinedSnapshot,
      items: Object.values(combinedSnapshot.itemCounts).map((item: any) => ({
        id: item.itemId || Math.random(),
        name: item.itemName,
        category: item.category,
        frequency: item.frequency,
        currentStock: item.currentStock,
        unit: item.unit,
        minimumLevel: item.minLevel,
        unitCost: item.unitCost,
        totalValue: item.totalValue,
        lastCountDate: item.lastCountDate,
        countedBy: item.countedBy,
        optimalLevel: item.optimalLevel
      }))
    };
  }, [selectedDate, stockCountSnapshots, dailyInventorySnapshots]);
    const summary = combinedSnapshot.summary;
    summary.totalInventoryValue = combinedSnapshot.totalValue;
    
    Object.values(combinedSnapshot.itemCounts).forEach(item => {
      const status = getStockStatus(item.currentStock, item.minLevel);
      if (status === 'out') summary.outOfStockItems++;
      else if (status === 'critical') summary.criticalStockItems++;
      else if (status === 'low') summary.lowStockItems++;
    });
    
    return combinedSnapshot;
  }, [selectedDate, stockCountSnapshots]);

  // Convert snapshot to historical item data
  const historicalData = useMemo((): HistoricalItemData[] => {
    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;
    
    if (!selectedSnapshot) {
      // CRITICAL FIX: If viewing today and no snapshot exists yet, show current live data
      if (isToday) {
        console.log(`📊 Showing live inventory data for today (${selectedDate}) - no snapshot created yet`);
        
        // Combine all current inventory items for today's view
        const allCurrentItems: InventoryItem[] = [
          ...dailyItems,
          ...weeklyItems, 
          ...monthlyItems
        ];
        
        return allCurrentItems.map(item => ({
          itemId: item.id.toString(),
          itemName: item.name,
          category: item.category,
          frequency: item.frequency || 'daily', // Default to daily if undefined
          stockLevel: item.currentStock,
          unit: item.unit,
          unitCost: item.cost, // Use cost property from InventoryItem
          totalValue: item.currentStock * item.cost,
          stockStatus: getStockStatus(item.currentStock, item.minLevel),
          minLevel: item.minLevel,
          optimalLevel: item.optimalLevel || item.minLevel * 2, // Default to 2x min level if undefined
          lastCountDate: item.lastUsed || today,
          countedBy: 'Live Data'
        }));
      }
      
      // For historical dates (not today), preserve data integrity
      console.warn(`⚠️ No historical snapshot found for ${selectedDate}. Historical data integrity preserved.`);
      return [];
    }
    
    // Use ONLY snapshot data to ensure historical integrity
    return Object.entries(selectedSnapshot.itemCounts).map(([itemId, item]) => ({
      itemId,
      itemName: item.itemName,
      category: item.category,
      frequency: item.frequency,
      stockLevel: item.currentStock,
      unit: item.unit,
      unitCost: item.unitCost, // This is the HISTORICAL price from when snapshot was created
      totalValue: item.totalValue, // This is the HISTORICAL value
      stockStatus: getStockStatus(item.currentStock, item.minLevel),
      minLevel: item.minLevel,
      optimalLevel: item.optimalLevel,
      lastCountDate: item.lastCountDate,
      countedBy: item.countedBy
    }));
  }, [selectedSnapshot, selectedDate, dailyItems, weeklyItems, monthlyItems]);

  // Filter and search historical data
  const filteredData = useMemo(() => {
    let filtered = historicalData;
    
    // Filter by frequency
    if (frequencyFilter !== 'all') {
      filtered = filtered.filter(item => item.frequency === frequencyFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.itemName.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      );
    }
    
    return filtered.sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [historicalData, frequencyFilter, searchTerm]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const total = filteredData.length;
    const outOfStock = filteredData.filter(item => item.stockStatus === 'out').length;
    const critical = filteredData.filter(item => item.stockStatus === 'critical').length;
    const low = filteredData.filter(item => item.stockStatus === 'low').length;
    const ok = filteredData.filter(item => item.stockStatus === 'ok').length;
    const totalValue = filteredData.reduce((sum, item) => sum + item.totalValue, 0);
    
    return { total, outOfStock, critical, low, ok, totalValue };
  }, [filteredData]);

  // Handle date change
  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
    // Reset comparison when changing main date
    if (showComparison) {
      setComparisonDate(null);
      setShowComparison(false);
    }
  }, [showComparison]);

  // Handle comparison toggle
  const handleComparisonToggle = useCallback(() => {
    if (showComparison) {
      setComparisonDate(null);
      setShowComparison(false);
    } else {
      setShowComparison(true);
      // Set comparison to previous day by default
      const prevDate = new Date(selectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      if (availableDates.includes(prevDateStr)) {
        setComparisonDate(prevDateStr);
      }
    }
  }, [showComparison, selectedDate, availableDates]);

  // Export functionality
  const handleExport = useCallback((format: 'csv' | 'json') => {
    const dataToExport = filteredData.map(item => ({
      Date: selectedDate,
      'Item Name': item.itemName,
      Category: item.category,
      Frequency: item.frequency,
      'Stock Level': item.stockLevel,
      Unit: item.unit,
      'Unit Cost': item.unitCost,
      'Total Value': item.totalValue,
      'Stock Status': item.stockStatus,
      'Min Level': item.minLevel,
      'Optimal Level': item.optimalLevel,
      'Last Count Date': item.lastCountDate,
      'Counted By': item.countedBy
    }));
    
    if (format === 'csv') {
      const headers = Object.keys(dataToExport[0] || {});
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-count-history-${selectedDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-count-history-${selectedDate}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [filteredData, selectedDate]);

  // Create snapshot for a specific date
  const createSnapshotForDate = useCallback(async (date: string) => {
    try {
      console.log(`Creating snapshot for date: ${date}`);
      
      // Create snapshots for all frequencies on the specified date
      const results = await createStockSnapshot(date, ['daily', 'weekly', 'monthly']);
      
      if (results && results.length > 0) {
        console.log(`✅ Created ${results.length} snapshots for ${date}`);
        // The UI will automatically update since stockCountSnapshots will be updated
      } else {
        console.warn(`⚠️ No snapshots created for ${date}`);
      }
    } catch (error) {
      console.error(`❌ Error creating snapshot for ${date}:`, error);
    }
  }, [createStockSnapshot]);

  // Handle snapshot creation
  const handleCreateSnapshot = useCallback(async () => {
    try {
      const results = await createStockSnapshot();
      if (results.length > 0) {
        // No need to reload - the context will update stockCountSnapshots automatically
        console.log(`✅ Created ${results.length} snapshot(s) successfully`);
      }
    } catch (error) {
      console.error('Error creating snapshot:', error);
      // TODO: Show user-friendly error message instead of crashing
    }
  }, [createStockSnapshot]);

  const hasHistoricalData = selectedSnapshot !== null;
  const today = new Date().toISOString().split('T')[0];
  const isViewingToday = selectedDate === today;
  const isShowingLiveData = isViewingToday && !hasHistoricalData;

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
          <div className="mb-4 lg:mb-0">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
              <Clock className="w-6 h-6 mr-2 text-blue-600" />
              Stock Count History
            </h2>
            <p className="text-gray-600">
              View complete inventory snapshots for any historical date
            </p>
          </div>
          
          {/* Export Controls */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCreateSnapshot}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
              title="Create a snapshot of current inventory for testing"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Create Snapshot
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              JSON
            </button>
          </div>
        </div>

        {/* Date and Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Select Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableDates.map(date => (
                <option key={date} value={date}>
                  {formatDisplayDate(date)}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Frequency
            </label>
            <select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value as InventoryFrequency | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Items</option>
              <option value="daily">Daily Items</option>
              <option value="weekly">Weekly Items</option>
              <option value="monthly">Monthly Items</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search Items
            </label>
            <input
              type="text"
              placeholder="Search by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Comparison Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Comparison
            </label>
            <button
              onClick={handleComparisonToggle}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                showComparison 
                  ? 'bg-blue-100 border-blue-300 text-blue-800' 
                  : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {showComparison ? 'Hide Compare' : 'Compare Dates'}
            </button>
          </div>
        </div>

        {/* Comparison Date Selection */}
        {showComparison && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Compare with Date:
            </label>
            <select
              value={comparisonDate || ''}
              onChange={(e) => setComparisonDate(e.target.value || null)}
              className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select comparison date...</option>
              {availableDates.filter(date => date !== selectedDate).map(date => (
                <option key={date} value={date}>
                  {formatDisplayDate(date)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Live Data Notice */}
      {isShowingLiveData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Eye className="w-5 h-5 text-blue-600 mr-2" />
            <div className="text-sm text-blue-800">
              <strong>Live Data:</strong> Showing current inventory data for today ({formatDisplayDate(selectedDate)}). 
              A snapshot will be created automatically at 11:59 PM to preserve this data for historical viewing.
            </div>
          </div>
        </div>
      )}

      {/* No Historical Data Notice */}
      {!hasHistoricalData && !isShowingLiveData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
            <div className="text-sm text-amber-800">
              <strong>No Historical Data:</strong> No inventory snapshot was created for {formatDisplayDate(selectedDate)}. 
              Historical data integrity is preserved by not showing current prices for past dates.
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-xl font-bold text-gray-900">{summaryStats.total}</p>
            </div>
            <Package className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-xl font-bold text-gray-900">${summaryStats.totalValue.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Out of Stock</p>
              <p className="text-xl font-bold text-red-900">{summaryStats.outOfStock}</p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold">!</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Critical</p>
              <p className="text-xl font-bold text-orange-900">{summaryStats.critical}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Low Stock</p>
              <p className="text-xl font-bold text-yellow-900">{summaryStats.low}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Good Stock</p>
              <p className="text-xl font-bold text-green-900">{summaryStats.ok}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Data Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Eye className="w-5 h-5 mr-2 text-blue-600" />
            Inventory Snapshot for {formatDisplayDate(selectedDate)}
            {hasHistoricalData && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Historical Data
              </span>
            )}
            {isShowingLiveData && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Live Data
              </span>
            )}
            {!hasHistoricalData && !isShowingLiveData && (
              <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                No Data
              </span>
            )}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Count
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.itemId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                      <div className="text-sm text-gray-500">Min: {item.minLevel} {item.unit}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.frequency === 'daily' ? 'bg-blue-100 text-blue-800' :
                      item.frequency === 'weekly' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {item.frequency}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.stockLevel} {item.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.stockStatus === 'out' ? 'bg-red-100 text-red-800' :
                      item.stockStatus === 'critical' ? 'bg-orange-100 text-orange-800' :
                      item.stockStatus === 'low' ? 'bg-yellow-100 text-yellow-800' :
                      item.stockStatus === 'ok' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.stockStatus === 'out' ? 'Out of Stock' :
                       item.stockStatus === 'critical' ? 'Critical' :
                       item.stockStatus === 'low' ? 'Low' : 
                       item.stockStatus === 'ok' ? 'Good' : 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${item.totalValue.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.lastCountDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="px-6 py-8 text-center">
            {!selectedSnapshot && !isShowingLiveData ? (
              // No historical snapshot available for past dates - show historical data preservation message
              <div>
                <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Historical Data Available</h3>
                <p className="text-gray-500 mb-4">
                  No inventory snapshot was created for {formatDisplayDate(selectedDate)}.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
                  <div className="flex items-start">
                    <Eye className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium mb-1">Historical Data Integrity Protected</p>
                      <p className="text-xs text-blue-600">
                        To preserve data accuracy, we don't show current prices for historical dates. 
                        Create daily snapshots to ensure historical data is captured.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => createSnapshotForDate(selectedDate)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Snapshot for This Date
                </button>
              </div>
            ) : (
              // Snapshot exists or showing live data, but no items match filter criteria
              <div>
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {isShowingLiveData 
                    ? "No inventory items found matching your search criteria in the current live data."
                    : "No items found matching your search criteria in the snapshot."
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockCountHistoryView;