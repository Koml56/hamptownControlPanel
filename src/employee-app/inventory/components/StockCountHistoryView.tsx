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
  Eye,
  ArrowUp,
  ArrowDown,
  Minus
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
    dailyInventorySnapshots,
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
  const [showComparison, setShowComparison] = useState(true); // Default to expanded

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

  // Helper functions to get comparison dates
  const getLastWeekDate = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  };

  const getLastMonthDate = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  };

  // Check if comparison dates exist in available data
  const getAvailableComparisonDates = () => {
    const lastWeek = getLastWeekDate(selectedDate);
    const lastMonth = getLastMonthDate(selectedDate);
    
    return {
      lastWeek: availableDates.includes(lastWeek) ? lastWeek : null,
      lastMonth: availableDates.includes(lastMonth) ? lastMonth : null
    };
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
    
    // Update summary statistics
    const summary = combinedSnapshot.summary;
    summary.totalInventoryValue = combinedSnapshot.totalValue;
    
    Object.values(combinedSnapshot.itemCounts).forEach(item => {
      const status = getStockStatus(item.currentStock, item.minLevel);
      if (status === 'out') summary.outOfStockItems++;
      else if (status === 'critical') summary.criticalStockItems++;
      else if (status === 'low') summary.lowStockItems++;
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
    if (selectedSnapshot.type === 'daily') {
      // Handle daily inventory snapshot structure
      return Object.entries(selectedSnapshot.data.items).map(([itemId, item]) => ({
        itemId,
        itemName: item.name,
        category: item.category,
        frequency: item.frequency,
        stockLevel: item.currentStock,
        unit: item.unit,
        unitCost: item.unitCost, // This is the HISTORICAL price from when snapshot was created
        totalValue: item.totalValue, // This is the HISTORICAL value
        stockStatus: getStockStatus(item.currentStock, item.minimumLevel),
        minLevel: item.minimumLevel,
        optimalLevel: item.optimalLevel || item.minimumLevel * 2, // Fallback calculation
        lastCountDate: item.lastCountDate,
        countedBy: item.countedBy
      }));
    } else {
      // Handle stock count snapshot structure
      return Object.entries(selectedSnapshot.data.itemCounts).map(([itemId, item]) => ({
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
    }
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

  // Calculate comparison data
  const comparisonData = useMemo(() => {
    if (!comparisonDate || !showComparison) return null;
    
    // Get comparison snapshot (prefer daily snapshots)
    const comparisonDailySnapshot = dailyInventorySnapshots.find(s => s.date === comparisonDate);
    let comparisonItems: HistoricalItemData[] = [];
    
    if (comparisonDailySnapshot) {
      comparisonItems = Object.entries(comparisonDailySnapshot.items).map(([itemId, item]) => ({
        itemId,
        itemName: item.name,
        category: item.category,
        frequency: item.frequency,
        stockLevel: item.currentStock,
        unit: item.unit,
        unitCost: item.unitCost,
        totalValue: item.totalValue,
        stockStatus: getStockStatus(item.currentStock, item.minimumLevel),
        minLevel: item.minimumLevel,
        optimalLevel: item.optimalLevel || item.minimumLevel * 2,
        lastCountDate: item.lastCountDate,
        countedBy: item.countedBy
      }));
    }
    
    // Calculate differences and analytics
    const comparisons = filteredData.map(currentItem => {
      const comparisonItem = comparisonItems.find(comp => comp.itemName === currentItem.itemName);
      
      if (!comparisonItem) {
        return {
          ...currentItem,
          comparison: null,
          stockChange: 0,
          valueChange: 0,
          statusChange: 'same' as const
        };
      }
      
      const stockChange = currentItem.stockLevel - comparisonItem.stockLevel;
      const valueChange = currentItem.totalValue - comparisonItem.totalValue;
      const statusChange = currentItem.stockStatus !== comparisonItem.stockStatus ? 'changed' : 'same';
      
      return {
        ...currentItem,
        comparison: comparisonItem,
        stockChange,
        valueChange,
        statusChange
      };
    });
    
    const summaryChanges = {
      totalValueChange: summaryStats.totalValue - comparisonItems.reduce((sum, item) => sum + item.totalValue, 0),
      stockChanges: {
        increased: comparisons.filter(c => c.stockChange > 0).length,
        decreased: comparisons.filter(c => c.stockChange < 0).length,
        unchanged: comparisons.filter(c => c.stockChange === 0).length
      }
    };
    
    return { comparisons, summaryChanges, comparisonDate };
  }, [filteredData, comparisonDate, showComparison, dailyInventorySnapshots, summaryStats.totalValue]);

  // Handle date change
  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
    // Keep comparison enabled but reset comparison date
    if (showComparison) {
      setComparisonDate(null);
    }
  }, [showComparison]);

  // Handle comparison toggle
  const handleComparisonToggle = useCallback(() => {
    setShowComparison(!showComparison);
    if (!showComparison) {
      // When enabling comparison, try to set to last week if available
      const lastWeek = getLastWeekDate(selectedDate);
      if (availableDates.includes(lastWeek)) {
        setComparisonDate(lastWeek);
      } else {
        // Fallback to previous day
        const prevDate = new Date(selectedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        if (availableDates.includes(prevDateStr)) {
          setComparisonDate(prevDateStr);
        }
      }
    } else {
      setComparisonDate(null);
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
            <label className="block text-sm font-medium text-blue-800 mb-3">
              Compare with Date:
            </label>
            
            {/* Quick Comparison Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              {(() => {
                const comparisonDates = getAvailableComparisonDates();
                return (
                  <>
                    {comparisonDates.lastWeek && (
                      <button
                        onClick={() => setComparisonDate(comparisonDates.lastWeek)}
                        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                          comparisonDate === comparisonDates.lastWeek
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        Last Week
                      </button>
                    )}
                    {comparisonDates.lastMonth && (
                      <button
                        onClick={() => setComparisonDate(comparisonDates.lastMonth)}
                        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                          comparisonDate === comparisonDates.lastMonth
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        Last Month
                      </button>
                    )}
                    <button
                      onClick={() => setComparisonDate(null)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        comparisonDate === null
                          ? 'bg-gray-600 text-white border-gray-600' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Clear
                    </button>
                  </>
                );
              })()}
            </div>
            
            {/* Custom Date Selection */}
            <select
              value={comparisonDate || ''}
              onChange={(e) => setComparisonDate(e.target.value || null)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select custom comparison date...</option>
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

      {/* Comparison Analytics */}
      {comparisonData && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
              Comparison with {formatDisplayDate(comparisonData.comparisonDate)}
            </h3>
          </div>
          
          <div className="p-6">
            {/* Summary Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Value Change</p>
                    <p className={`text-2xl font-bold flex items-center ${
                      comparisonData.summaryChanges.totalValueChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {comparisonData.summaryChanges.totalValueChange >= 0 ? (
                        <ArrowUp className="w-5 h-5 mr-1" />
                      ) : (
                        <ArrowDown className="w-5 h-5 mr-1" />
                      )}
                      ${Math.abs(comparisonData.summaryChanges.totalValueChange).toFixed(2)}
                    </p>
                  </div>
                  <TrendingUp className={`w-8 h-8 ${
                    comparisonData.summaryChanges.totalValueChange >= 0 ? 'text-green-500' : 'text-red-500'
                  }`} />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Items Increased</p>
                    <p className="text-2xl font-bold text-green-600">
                      {comparisonData.summaryChanges.stockChanges.increased}
                    </p>
                  </div>
                  <ArrowUp className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700">Items Decreased</p>
                    <p className="text-2xl font-bold text-red-600">
                      {comparisonData.summaryChanges.stockChanges.decreased}
                    </p>
                  </div>
                  <ArrowDown className="w-8 h-8 text-red-500" />
                </div>
              </div>
            </div>
            
            {/* Usage Pattern Analysis */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-md font-semibold text-gray-800 mb-3">Usage Patterns & Order Recommendations</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-red-700 mb-2">High Usage Items (Order More)</h5>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {comparisonData.comparisons
                      .filter(item => item.stockChange < -item.minLevel * 0.5)
                      .slice(0, 5)
                      .map(item => (
                        <div key={item.itemId} className="flex justify-between text-sm bg-white p-2 rounded">
                          <span className="font-medium">{item.itemName}</span>
                          <span className="text-red-600 flex items-center">
                            <ArrowDown className="w-3 h-3 mr-1" />
                            {Math.abs(item.stockChange)} {item.unit}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-green-700 mb-2">Low Usage Items (Order Less)</h5>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {comparisonData.comparisons
                      .filter(item => item.stockChange > 0 && item.stockLevel > item.optimalLevel)
                      .slice(0, 5)
                      .map(item => (
                        <div key={item.itemId} className="flex justify-between text-sm bg-white p-2 rounded">
                          <span className="font-medium">{item.itemName}</span>
                          <span className="text-green-600 flex items-center">
                            <ArrowUp className="w-3 h-3 mr-1" />
                            {item.stockChange} {item.unit}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Cost Analysis Graph */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-800 mb-3">Cost Breakdown by Category</h4>
              <div className="space-y-3">
                {['daily', 'weekly', 'monthly'].map(frequency => {
                  const categoryItems = comparisonData.comparisons.filter(item => item.frequency === frequency);
                  const totalValue = categoryItems.reduce((sum, item) => sum + item.totalValue, 0);
                  const maxValue = Math.max(...['daily', 'weekly', 'monthly'].map(f => 
                    comparisonData.comparisons.filter(i => i.frequency === f).reduce((s, i) => s + i.totalValue, 0)
                  ));
                  const widthPercent = maxValue > 0 ? (totalValue / maxValue) * 100 : 0;
                  
                  return (
                    <div key={frequency} className="flex items-center space-x-3">
                      <div className="w-16 text-sm font-medium text-gray-700 capitalize">
                        {frequency}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                        <div 
                          className={`h-6 rounded-full ${
                            frequency === 'daily' ? 'bg-blue-500' :
                            frequency === 'weekly' ? 'bg-green-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${widthPercent}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          ${totalValue.toFixed(0)}
                        </span>
                      </div>
                      <div className="w-12 text-sm text-gray-600">
                        {categoryItems.length}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Data Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Eye className="w-5 h-5 mr-2 text-blue-600" />
            Inventory Snapshot for {formatDisplayDate(selectedDate)}
            {hasHistoricalData && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Historical Data (Expanded)
              </span>
            )}
            {isShowingLiveData && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Live Data (Expanded)
              </span>
            )}
            {!hasHistoricalData && !isShowingLiveData && (
              <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                No Data
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Historical data sections are expanded by default for comprehensive analytics
          </p>
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
                {comparisonData && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change
                  </th>
                )}
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
              {(comparisonData ? comparisonData.comparisons : filteredData).map((item) => {
                const comparisonItem = comparisonData ? item as any : null; // Type assertion for comparison data
                return (
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
                    {comparisonData && comparisonItem && typeof comparisonItem.stockChange === 'number' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className={`flex items-center ${
                          comparisonItem.stockChange > 0 ? 'text-green-600' :
                          comparisonItem.stockChange < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {comparisonItem.stockChange > 0 ? (
                            <ArrowUp className="w-4 h-4 mr-1" />
                          ) : comparisonItem.stockChange < 0 ? (
                            <ArrowDown className="w-4 h-4 mr-1" />
                          ) : (
                            <Minus className="w-4 h-4 mr-1" />
                          )}
                          {Math.abs(comparisonItem.stockChange)} {item.unit}
                        </div>
                      </td>
                    )}
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
                );
              })}
            </tbody>
          </table>
        </div>

        {(comparisonData ? comparisonData.comparisons : filteredData).length === 0 && (
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