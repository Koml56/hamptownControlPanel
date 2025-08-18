// src/employee-app/inventory/components/ReportsView.tsx
// Completely rewritten analytics dashboard with interactive charts and real data comparisons

import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  GitCompare, 
  Download, 
  Eye, 
  EyeOff,
  Package,
  Activity,
  Percent
} from 'lucide-react';
import { useInventory } from '../InventoryContext';
import {
  StorageGrowthLineChart,
  OrderFrequencyBarChart,
  WasteAnalysisPieChart,
  ConsumptionTrendAreaChart,
  CategoryBreakdownChart,
  StockLevelChart
} from './AnalyticsCharts';
import type { DateRange } from '../../types';

const ReportsView: React.FC = () => {
  const { 
    dailyItems, 
    weeklyItems, 
    monthlyItems,
    activityLog,
    historicalSnapshots,
    getAnalyticsData,
    compareWithPreviousPeriod,
    createSnapshot
  } = useInventory();
  
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days'>('30days');
  const [comparisonPeriod, setComparisonPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [showComparison, setShowComparison] = useState(true);
  const [showSnapshotModule, setShowSnapshotModule] = useState(false);

  // Calculate date range
  const calculatedDateRange = useMemo((): DateRange => {
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
  }, [dateRange]);

  // Get analytics data with real calculations
  const analyticsData = useMemo(() => {
    const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
    return getAnalyticsData(calculatedDateRange);
  }, [dailyItems, weeklyItems, monthlyItems, getAnalyticsData, calculatedDateRange]);

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

  // Prepare data for charts
  const chartData = useMemo(() => {
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
      const category = item.category || 'Uncategorized';
      if (!categoryData[category]) {
        categoryData[category] = { totalItems: 0, totalValue: 0 };
      }
      categoryData[category].totalItems += 1;
      categoryData[category].totalValue += item.currentStock * (item.cost || 0);
    });

    const categoryChartData = Object.entries(categoryData).map(([category, data]) => ({
      category,
      totalItems: data.totalItems,
      totalValue: data.totalValue,
      avgItemValue: data.totalValue / data.totalItems
    }));

    // Waste analysis data
    const wasteData = analyticsData.wasteAnalysis.reduce((acc, day) => {
      Object.entries(day.wasteByCategory).forEach(([category, count]) => {
        acc[category] = (acc[category] || 0) + count;
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
  }, [currentMetrics, analyticsData, dailyItems, weeklyItems, monthlyItems]);

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
            </select>

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
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Historical Snapshots</h3>
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={handleCreateSnapshot}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Create Snapshot
              </button>
              <p className="text-sm text-gray-600 flex items-center">
                <Package className="w-4 h-4 mr-1" />
                {historicalSnapshots.length} snapshots available
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {historicalSnapshots.slice(-6).map((snapshot, index) => (
                <div key={snapshot.id} className="bg-white p-3 rounded border">
                  <p className="font-medium text-sm">{snapshot.date}</p>
                  <p className="text-xs text-gray-600">{snapshot.totalItems} items</p>
                  <p className="text-xs text-gray-600">${snapshot.totalValue.toFixed(2)}</p>
                </div>
              ))}
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