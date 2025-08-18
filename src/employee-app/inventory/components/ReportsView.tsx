// src/employee-app/inventory/components/ReportsView.tsx
// Completely rewritten analytics dashboard with interactive charts and real data comparisons

import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  AlertTriangle, 
  DollarSign, 
  GitCompare, 
  Download, 
  Eye, 
  EyeOff,
  Package,
  Activity,
  Calendar,
  Search
} from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getStockStatus } from '../stockUtils';
import {
  StorageGrowthLineChart,
  OrderFrequencyBarChart,
  WasteAnalysisPieChart,
  ConsumptionTrendAreaChart,
  CategoryBreakdownChart,
  StockLevelChart
} from './AnalyticsCharts';
import type { DateRange } from '../../types';
import { getCategoryNameOnly } from '../utils';

const ReportsView: React.FC = () => {
  const { 
    dailyItems, 
    weeklyItems, 
    monthlyItems,
    historicalSnapshots,
    getAnalyticsData,
    compareWithPreviousPeriod,
    createSnapshot,
    customCategories,
    stockCountSnapshots,
    dailyInventorySnapshots
  } = useInventory();
  
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'custom'>('30days');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [comparisonPeriod, setComparisonPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [showComparison, setShowComparison] = useState(true);
  const [showSnapshotModule, setShowSnapshotModule] = useState(false);
  
  // Snapshot module state
  const [snapshotSelectedDate, setSnapshotSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [snapshotSearchTerm, setSnapshotSearchTerm] = useState('');

  // Calculate date range
  const calculatedDateRange = useMemo((): DateRange => {
    if (dateRange === 'custom') {
      // For custom/single date selection, use the selected date
      return {
        startDate: selectedDate,
        endDate: selectedDate,
        period: 'day'
      };
    }
    
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case '7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      period: 'day'
    };
  }, [dateRange, selectedDate]);

  // Get analytics data with real calculations
  const analyticsData = useMemo(() => {
    const data = getAnalyticsData(calculatedDateRange);
    
    // Provide default structure if data is undefined
    const defaultData = {
      storageGrowth: [],
      orderFrequency: [],
      wasteAnalysis: [],
      consumptionTrends: [],
      performanceMetrics: {
        stockTurnoverRate: 0,
        wastePercentage: 0,
        orderAccuracy: 0,
        stockoutFrequency: 0
      }
    };

    if (!data) return defaultData;

    // Aggregate consumption trends by date for chart consumption
    const aggregatedConsumptionTrends = data.consumptionTrends.reduce((acc: Record<string, {date: string, consumed: number, remaining: number}>, trend) => {
      if (!trend || typeof trend !== 'object') return acc;
      
      const date = trend.date;
      if (!date) return acc;

      if (!acc[date]) {
        acc[date] = {
          date,
          consumed: 0,
          remaining: 0
        };
      }
      
      acc[date].consumed += trend.consumed || 0;
      acc[date].remaining += trend.remaining || 0;
      
      return acc;
    }, {});

    return {
      ...data,
      consumptionTrends: Object.values(aggregatedConsumptionTrends).sort((a, b) => a.date.localeCompare(b.date))
    };
  }, [getAnalyticsData, calculatedDateRange]);

  // Calculate current vs previous period comparison
  const comparisonData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return compareWithPreviousPeriod(today, comparisonPeriod);
  }, [compareWithPreviousPeriod, comparisonPeriod]);

  // Calculate current inventory metrics
  const currentMetrics = useMemo(() => {
    const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
    
    const totalValue = allItems.reduce((sum, item) => sum + (item.currentStock * (item.cost || 0)), 0);
    const totalItems = allItems.length;
    
    const stockLevels = {
      out: allItems.filter(item => item.currentStock === 0).length,
      critical: allItems.filter(item => {
        const minLevel = item.minLevel || 0;
        return item.currentStock > 0 && item.currentStock <= minLevel * 0.5;
      }).length,
      low: allItems.filter(item => {
        const minLevel = item.minLevel || 0;
        return item.currentStock > minLevel * 0.5 && item.currentStock <= minLevel;
      }).length,
      ok: allItems.filter(item => {
        const minLevel = item.minLevel || 0;
        return item.currentStock > minLevel;
      }).length
    };

    return { totalValue, totalItems, stockLevels };
  }, [dailyItems, weeklyItems, monthlyItems]);

  // Snapshot module logic - reused from StockCountHistoryView
  const snapshotAvailableDates = useMemo(() => {
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

  // Get snapshot for selected date in snapshot module
  const selectedSnapshotData = useMemo(() => {
    // First try to get daily snapshot
    const dailySnapshot = dailyInventorySnapshots.find(s => s.date === snapshotSelectedDate);
    if (dailySnapshot) {
      return {
        type: 'daily' as const,
        data: dailySnapshot,
        items: Object.values(dailySnapshot.items)
      };
    }
    
    // Fallback to stock count snapshots
    const snapshots = stockCountSnapshots.filter(s => s.date === snapshotSelectedDate);
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
    
    return null;
  }, [snapshotSelectedDate, stockCountSnapshots, dailyInventorySnapshots]);

  // Convert snapshot to historical item data for snapshot module
  const snapshotHistoricalData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const isToday = snapshotSelectedDate === today;
    
    if (!selectedSnapshotData) {
      // If viewing today and no snapshot exists yet, show current live data
      if (isToday) {
        const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
        return allItems.map(item => ({
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          frequency: item.frequency,
          stockLevel: item.currentStock,
          unit: item.unit,
          unitCost: item.cost,
          totalValue: item.currentStock * item.cost,
          stockStatus: getStockStatus(item.currentStock, item.minLevel),
          minLevel: item.minLevel,
          optimalLevel: item.minLevel * 2,
          lastCountDate: new Date().toISOString(),
          countedBy: 'Live Data'
        }));
      }
      return [];
    }
    
    if (selectedSnapshotData.type === 'daily') {
      // Handle daily inventory snapshot structure
      return Object.entries(selectedSnapshotData.data.items).map(([itemId, item]) => ({
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
    } else {
      // Handle stock count snapshot structure
      return Object.entries(selectedSnapshotData.data.itemCounts).map(([itemId, item]) => ({
        itemId,
        itemName: item.itemName,
        category: item.category,
        frequency: item.frequency,
        stockLevel: item.currentStock,
        unit: item.unit,
        unitCost: item.unitCost,
        totalValue: item.totalValue,
        stockStatus: getStockStatus(item.currentStock, item.minLevel),
        minLevel: item.minLevel,
        optimalLevel: item.optimalLevel,
        lastCountDate: item.lastCountDate,
        countedBy: item.countedBy
      }));
    }
  }, [selectedSnapshotData, snapshotSelectedDate, dailyItems, weeklyItems, monthlyItems]);

  // Filter snapshot data based on search term
  const filteredSnapshotData = useMemo(() => {
    let filtered = snapshotHistoricalData;
    
    // Filter by search term
    if (snapshotSearchTerm.trim()) {
      const searchLower = snapshotSearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.itemName.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [snapshotHistoricalData, snapshotSearchTerm]);

  // Format display date
  const formatDisplayDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) {
      return `Today (${new Date(dateStr).toLocaleDateString()})`;
    }
    return new Date(dateStr).toLocaleDateString();
  };

  // Prepare data for charts
  const chartData = useMemo(() => {
    // Defensive check for undefined analyticsData
    if (!analyticsData || !analyticsData.wasteAnalysis) {
      return {
        wasteData: {},
        totalWaste: 0,
        storageGrowthData: [],
        categoryDistribution: [],
        stockLevels: { out: 0, critical: 0, low: 0, ok: 0 },
        stockLevelData: [] as Array<{level: string, count: number, color: string}>,
        categoryChartData: [] as Array<{category: string, totalItems: number, totalValue: number, avgItemValue: number}>,
        wasteChartData: [] as Array<{name: string, value: number, percentage: number}>
      };
    }

    // Stock level distribution for chart
    const stockLevelData = [
      { level: 'Out of Stock', count: currentMetrics.stockLevels.out, color: '#EF4444' },
      { level: 'Critical', count: currentMetrics.stockLevels.critical, color: '#F59E0B' },
      { level: 'Low Stock', count: currentMetrics.stockLevels.low, color: '#10B981' },
      { level: 'Well Stocked', count: currentMetrics.stockLevels.ok, color: '#3B82F6' }
    ];

    // Category breakdown data
    const categoryData: Record<string, {totalItems: number, totalValue: number}> = {};
    [...dailyItems, ...weeklyItems, ...monthlyItems].forEach(item => {
      const categoryId = item.category || 'uncategorized';
      const categoryName = getCategoryNameOnly(categoryId, customCategories);
      if (!categoryData[categoryName]) {
        categoryData[categoryName] = { totalItems: 0, totalValue: 0 };
      }
      categoryData[categoryName].totalItems += 1;
      categoryData[categoryName].totalValue += item.currentStock * (item.cost || 0);
    });

    const categoryChartData = Object.entries(categoryData).map(([category, data]) => ({
      category,
      totalItems: data.totalItems,
      totalValue: data.totalValue,
      avgItemValue: data.totalValue / data.totalItems
    }));

    // Waste analysis data
    const wasteData = analyticsData.wasteAnalysis.reduce((acc, day) => {
      Object.entries(day.wasteByCategory).forEach(([categoryId, count]) => {
        const categoryName = getCategoryNameOnly(categoryId, customCategories);
        acc[categoryName] = (acc[categoryName] || 0) + count;
      });
      return acc;
    }, {} as Record<string, number>);

    const totalWaste = Object.values(wasteData).reduce((sum, count) => sum + count, 0);
    const wasteChartData = Object.entries(wasteData).map(([name, value]) => ({
      name,
      value,
      percentage: totalWaste > 0 ? (value / totalWaste) * 100 : 0
    }));

    return {
      stockLevelData,
      categoryChartData,
      wasteChartData
    };
  }, [currentMetrics, analyticsData, dailyItems, weeklyItems, monthlyItems, customCategories]);

  // KPI Card Component
  const KPICard: React.FC<{
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, change, changeLabel, icon, color }) => {
    const changeFormatted = change !== undefined && !isNaN(change) ? 
      `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : 'No data';
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {showComparison && change !== undefined && (
              <p className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {changeFormatted} {changeLabel}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            {icon}
          </div>
        </div>
      </div>
    );
  };

  // Handle snapshot creation
  const handleCreateSnapshot = () => {
    createSnapshot();
    alert('Snapshot created successfully!');
  };

  // Export functionality
  const exportReport = (format: 'csv' | 'json') => {
    const reportData = {
      date: new Date().toISOString().split('T')[0],
      metrics: currentMetrics,
      analytics: analyticsData,
      comparison: comparisonData
    };

    if (format === 'csv') {
      // Simple CSV export
      const csvContent = `Date,Total Value,Total Items,Out of Stock,Critical,Low Stock,Well Stocked\n` +
        `${reportData.date},${currentMetrics.totalValue.toFixed(2)},${currentMetrics.totalItems},` +
        `${currentMetrics.stockLevels.out},${currentMetrics.stockLevels.critical},` +
        `${currentMetrics.stockLevels.low},${currentMetrics.stockLevels.ok}`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-analytics-${reportData.date}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      // JSON export
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-analytics-${reportData.date}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
              Advanced Analytics Dashboard
            </h2>
            <p className="text-gray-600 mt-1">
              Comprehensive inventory analysis with real-time data and trend comparisons
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Date Range Selection */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="custom">Specific Day</option>
            </select>

            {/* Custom Date Picker - Show only when custom is selected */}
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  max={new Date().toISOString().split('T')[0]} // Prevent future dates
                />
              </div>
            )}

            {/* Comparison Period */}
            <select
              value={comparisonPeriod}
              onChange={(e) => setComparisonPeriod(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="day">vs Previous Day</option>
              <option value="week">vs Previous Week</option>
              <option value="month">vs Previous Month</option>
            </select>

            {/* Toggle Comparison */}
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${
                showComparison 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              {showComparison ? 'Hide' : 'Show'} Comparison
            </button>

            {/* Export Buttons */}
            <button
              onClick={() => exportReport('csv')}
              className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            
            <button
              onClick={() => exportReport('json')}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              JSON
            </button>
          </div>
        </div>

        {/* Snapshot Module Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowSnapshotModule(!showSnapshotModule)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            {showSnapshotModule ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showSnapshotModule ? 'Hide' : 'Show'} Snapshot Module
          </button>
        </div>

        {/* Snapshot Module - Expandable */}
        {showSnapshotModule && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Historical Snapshots</h3>
            
            {/* Snapshot Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Select Date
                </label>
                <select
                  value={snapshotSelectedDate}
                  onChange={(e) => setSnapshotSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {snapshotAvailableDates.map(date => (
                    <option key={date} value={date}>
                      {formatDisplayDate(date)}
                    </option>
                  ))}
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
                  value={snapshotSearchTerm}
                  onChange={(e) => setSnapshotSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateSnapshot}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Create Snapshot
                  </button>
                  <span className="text-sm text-gray-600 flex items-center px-2">
                    <Package className="w-4 h-4 mr-1" />
                    {historicalSnapshots.length} total
                  </span>
                </div>
              </div>
            </div>

            {/* Snapshot Summary */}
            {selectedSnapshotData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-lg font-semibold">{filteredSnapshotData.length}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-lg font-semibold">
                    ${filteredSnapshotData.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm text-gray-600">Out of Stock</p>
                  <p className="text-lg font-semibold text-red-600">
                    {filteredSnapshotData.filter(item => item.stockStatus === 'out').length}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm text-gray-600">Critical Items</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {filteredSnapshotData.filter(item => item.stockStatus === 'critical').length}
                  </p>
                </div>
              </div>
            )}

            {/* Snapshot Items Table */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h4 className="text-md font-semibold text-gray-900">
                  Items for {formatDisplayDate(snapshotSelectedDate)}
                  {selectedSnapshotData ? (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {selectedSnapshotData.type === 'daily' ? 'Snapshot Data' : 'Stock Count Data'}
                    </span>
                  ) : (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Live Data
                    </span>
                  )}
                </h4>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Frequency
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock Level
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSnapshotData.map((item) => (
                      <tr key={item.itemId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                            <div className="text-sm text-gray-500">Min: {item.minLevel} {item.unit}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {item.category}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.frequency === 'daily' ? 'bg-blue-100 text-blue-800' :
                            item.frequency === 'weekly' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {item.frequency}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {item.stockLevel} {item.unit}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
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
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          ${item.totalValue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredSnapshotData.length === 0 && (
                <div className="px-4 py-8 text-center">
                  {!selectedSnapshotData ? (
                    <div>
                      <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Snapshot Available</h4>
                      <p className="text-gray-500 mb-4">
                        No inventory snapshot was created for {formatDisplayDate(snapshotSelectedDate)}.
                      </p>
                      <button
                        onClick={handleCreateSnapshot}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create Snapshot for This Date
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        No items found matching your search criteria.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Inventory Value"
          value={`$${currentMetrics.totalValue.toFixed(2)}`}
          change={comparisonData?.percentageChanges.value}
          changeLabel="from last period"
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-blue-500"
        />
        
        <KPICard
          title="Total Items"
          value={currentMetrics.totalItems}
          change={comparisonData?.percentageChanges.items}
          changeLabel="from last period"
          icon={<Package className="w-6 h-6 text-white" />}
          color="bg-green-500"
        />
        
        <KPICard
          title="Critical Items"
          value={currentMetrics.stockLevels.critical}
          change={comparisonData?.percentageChanges.critical}
          changeLabel="from last period"
          icon={<AlertTriangle className="w-6 h-6 text-white" />}
          color="bg-red-500"
        />
        
        <KPICard
          title="Stock Turnover"
          value={`${analyticsData.performanceMetrics.stockTurnoverRate.toFixed(2)}x`}
          change={undefined} // Would need previous period calculation
          changeLabel="times per period"
          icon={<Activity className="w-6 h-6 text-white" />}
          color="bg-purple-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Growth */}
        <StorageGrowthLineChart data={analyticsData.storageGrowth} />
        
        {/* Order Frequency */}
        <OrderFrequencyBarChart data={analyticsData.orderFrequency} />
        
        {/* Stock Level Distribution */}
        <StockLevelChart data={chartData.stockLevelData} />
        
        {/* Category Breakdown */}
        <CategoryBreakdownChart data={chartData.categoryChartData} />
      </div>

      {/* Wide Charts */}
      <div className="space-y-6">
        {/* Consumption Trends */}
        <ConsumptionTrendAreaChart data={analyticsData.consumptionTrends} />
        
        {/* Waste Analysis - only show if there's waste data */}
        {chartData.wasteChartData.length > 0 && (
          <WasteAnalysisPieChart data={chartData.wasteChartData} />
        )}
      </div>

      {/* Performance Metrics Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {analyticsData.performanceMetrics.stockTurnoverRate.toFixed(2)}x
            </p>
            <p className="text-sm text-gray-600">Stock Turnover Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {analyticsData.performanceMetrics.wastePercentage.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">Waste Percentage</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {analyticsData.performanceMetrics.orderAccuracy.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">Order Accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {analyticsData.performanceMetrics.stockoutFrequency.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">Stockout Frequency</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;