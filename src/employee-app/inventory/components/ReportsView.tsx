// src/employee-app/inventory/components/ReportsView.tsx
import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, DollarSign, Calendar, GitCompare } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getStockStatus } from '../stockUtils';
import type { } from '../../types';

const ReportsView: React.FC = () => {
  const { dailyItems, weeklyItems, monthlyItems, activityLog, stockCountSnapshots } = useInventory();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [comparisonMode, setComparisonMode] = useState<'none' | 'previous-day' | 'week-average' | 'previous-week' | 'previous-month' | 'trend-7-days'>('none');
  const [trendRange, setTrendRange] = useState<'7days' | '30days' | '90days'>('7days');
  const [showTrendAnalysis, setShowTrendAnalysis] = useState(false);

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
    
    // Check if we have historical snapshots for this date
    const historicalSnapshots = stockCountSnapshots.filter(s => s.date === selectedDate);
    const hasHistoricalData = historicalSnapshots.length > 0;
    
    let criticalItems, lowStockItems, totalValue;
    let historicalItems = allItems; // Use current items as fallback
    
    if (hasHistoricalData) {
      // Use historical snapshot data
      const combinedSnapshot = historicalSnapshots.reduce((acc, snapshot) => {
        Object.entries(snapshot.snapshot.itemCounts).forEach(([itemId, item]) => {
          acc[itemId] = item;
        });
        return acc;
      }, {} as any);

      historicalItems = Object.values(combinedSnapshot).map((item: any) => ({
        id: item.itemId || Math.random(),
        name: item.itemName,
        category: item.category,
        currentStock: item.currentStock,
        minLevel: item.minLevel,
        unit: item.unit,
        cost: item.unitCost,
        lastUsed: item.lastCountDate,
        frequency: item.frequency,
        optimalLevel: item.optimalLevel
      }));

      // Calculate stock status using historical data
      criticalItems = historicalItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'critical');
      lowStockItems = historicalItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'low');
      totalValue = historicalItems.reduce((sum, item) => sum + (item.cost * item.currentStock), 0);
    } else if (isToday) {
      // Use current data for today
      criticalItems = allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'critical');
      lowStockItems = allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'low');
      totalValue = allItems.reduce((sum, item) => sum + (item.cost * item.currentStock), 0);
    } else {
      // For historical dates without snapshots, show current with note
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
      allItems: hasHistoricalData ? historicalItems : allItems,
      isToday,
      hasHistoricalData
    };
  }, [selectedDate, dailyItems, weeklyItems, monthlyItems, activityLog, stockCountSnapshots]);

  // Calculate advanced trend and comparison metrics
  const trendAnalysis = useMemo(() => {
    const daysToAnalyze = trendRange === '7days' ? 7 : trendRange === '30days' ? 30 : 90;
    const trendData = [];
    
    for (let i = 0; i < daysToAnalyze; i++) {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const { startOfDay, endOfDay } = getDateRange(dateStr);
      
      const dayActivity = activityLog.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startOfDay && entryDate <= endOfDay;
      });

      const dayWaste = dayActivity
        .filter(entry => entry.type === 'waste')
        .reduce((sum, entry) => sum + entry.quantity, 0);
      
      const dayWasteValue = dayActivity
        .filter(entry => entry.type === 'waste')
        .reduce((sum, entry) => {
          const item = [...dailyItems, ...weeklyItems, ...monthlyItems].find(item => item.name === entry.item);
          return sum + (entry.quantity * (item?.cost || 0));
        }, 0);

      const dayCountUpdates = dayActivity.filter(a => a.type === 'count_update').length;
      
      // Check for historical snapshots on this date
      const historicalSnapshot = stockCountSnapshots.find(s => s.date === dateStr);
      let dayInventoryValue = 0;
      let dayCriticalItems = 0;
      
      if (historicalSnapshot) {
        dayInventoryValue = historicalSnapshot.snapshot.totalValue;
        dayCriticalItems = historicalSnapshot.snapshot.summary.criticalStockItems;
      }

      trendData.push({
        date: dateStr,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        waste: dayWaste,
        wasteValue: dayWasteValue,
        countUpdates: dayCountUpdates,
        inventoryValue: dayInventoryValue,
        criticalItems: dayCriticalItems,
        hasSnapshot: !!historicalSnapshot
      });
    }
    
    // Calculate trends
    const recent = trendData.slice(0, Math.floor(daysToAnalyze / 3));
    const older = trendData.slice(-Math.floor(daysToAnalyze / 3));
    
    const recentAvgWaste = recent.reduce((sum, d) => sum + d.waste, 0) / recent.length;
    const olderAvgWaste = older.reduce((sum, d) => sum + d.waste, 0) / older.length;
    const wasteTrend = recentAvgWaste - olderAvgWaste;
    
    const recentAvgValue = recent.filter(d => d.hasSnapshot).reduce((sum, d) => sum + d.inventoryValue, 0) / recent.filter(d => d.hasSnapshot).length || 0;
    const olderAvgValue = older.filter(d => d.hasSnapshot).reduce((sum, d) => sum + d.inventoryValue, 0) / older.filter(d => d.hasSnapshot).length || 0;
    const valueTrend = recentAvgValue - olderAvgValue;

    return {
      data: trendData.reverse(), // Show chronologically
      wasteTrend,
      valueTrend,
      avgWastePerDay: trendData.reduce((sum, d) => sum + d.waste, 0) / daysToAnalyze,
      avgValuePerDay: trendData.filter(d => d.hasSnapshot).reduce((sum, d) => sum + d.inventoryValue, 0) / trendData.filter(d => d.hasSnapshot).length || 0,
      totalDaysWithData: trendData.filter(d => d.hasSnapshot).length
    };
  }, [selectedDate, trendRange, activityLog, dailyItems, weeklyItems, monthlyItems, stockCountSnapshots]);

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

    if (comparisonMode === 'previous-week') {
      const weekAgo = new Date(selectedDate);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      const { startOfDay, endOfDay } = getDateRange(weekAgoStr);
      
      const weekAgoActivity = activityLog.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startOfDay && entryDate <= endOfDay;
      });

      const weekAgoWaste = weekAgoActivity
        .filter(entry => entry.type === 'waste')
        .reduce((sum, entry) => sum + entry.quantity, 0);

      const weekAgoUpdates = weekAgoActivity.filter(a => a.type === 'count_update').length;

      return {
        type: 'previous-week',
        label: formatDisplayDate(weekAgoStr),
        wasteChange: selectedDateMetrics.wasteToday - weekAgoWaste,
        countUpdatesChange: selectedDateMetrics.countUpdates - weekAgoUpdates,
      };
    }

    if (comparisonMode === 'week-average') {
      const weekData = [];
      for (let i = 1; i <= 7; i++) {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const { startOfDay, endOfDay } = getDateRange(dateStr);
        
        const dayActivity = activityLog.filter(entry => {
          const entryDate = new Date(entry.timestamp);
          return entryDate >= startOfDay && entryDate <= endOfDay;
        });

        const dayWaste = dayActivity
          .filter(entry => entry.type === 'waste')
          .reduce((sum, entry) => sum + entry.quantity, 0);
        const dayUpdates = dayActivity.filter(a => a.type === 'count_update').length;
        
        weekData.push({ waste: dayWaste, updates: dayUpdates });
      }

      const avgWaste = weekData.reduce((sum, d) => sum + d.waste, 0) / 7;
      const avgUpdates = weekData.reduce((sum, d) => sum + d.updates, 0) / 7;

      return {
        type: 'week-average',
        label: '7-day average',
        wasteChange: selectedDateMetrics.wasteToday - avgWaste,
        countUpdatesChange: selectedDateMetrics.countUpdates - avgUpdates,
      };
    }

    if (comparisonMode === 'trend-7-days') {
      return {
        type: 'trend-7-days',
        label: '7-day trend analysis',
        wasteChange: trendAnalysis.wasteTrend,
        countUpdatesChange: 0, // Not applicable for trend
        trendData: trendAnalysis
      };
    }

    return null;
  }, [comparisonMode, selectedDate, activityLog, selectedDateMetrics, trendAnalysis]);

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
                <option value="previous-week">vs Previous Week</option>
                <option value="week-average">vs Week Average</option>
                <option value="trend-7-days">7-Day Trend</option>
              </select>
            </div>

            <button
              onClick={() => setShowTrendAnalysis(!showTrendAnalysis)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                showTrendAnalysis 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              Trend Analysis
            </button>
          </div>
        </div>

        {/* Historical Data Notice */}
        {!selectedDateMetrics.isToday && (
          <div className={`border rounded-lg p-3 mb-4 ${
            selectedDateMetrics.hasHistoricalData 
              ? 'bg-green-50 border-green-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center">
              <AlertTriangle className={`w-5 h-5 mr-2 ${
                selectedDateMetrics.hasHistoricalData 
                  ? 'text-green-600' 
                  : 'text-blue-600'
              }`} />
              <div className={`text-sm ${
                selectedDateMetrics.hasHistoricalData 
                  ? 'text-green-800' 
                  : 'text-blue-800'
              }`}>
                {selectedDateMetrics.hasHistoricalData ? (
                  <>
                    <strong>Historical Data Available:</strong> Viewing actual inventory snapshot for {formatDisplayDate(selectedDate)}. 
                    Stock levels and metrics reflect the true state on this date.
                  </>
                ) : (
                  <>
                    <strong>No Historical Data:</strong> Viewing data for {formatDisplayDate(selectedDate)}. 
                    Stock levels shown are current values - historical snapshots will be created automatically going forward.
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comparison Information */}
        {comparisonMetrics && comparisonMetrics.type !== 'trend-7-days' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm text-green-800">
              <strong>Comparing with {comparisonMetrics.label}:</strong>
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <span>Waste: {comparisonMetrics.wasteChange > 0 ? '+' : ''}{comparisonMetrics.wasteChange.toFixed(1)} items</span>
                <span>Updates: {comparisonMetrics.countUpdatesChange > 0 ? '+' : ''}{comparisonMetrics.countUpdatesChange} counts</span>
              </div>
            </div>
          </div>
        )}

        {/* Trend Analysis Information */}
        {comparisonMetrics && comparisonMetrics.type === 'trend-7-days' && comparisonMetrics.trendData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <strong>7-Day Trend Analysis:</strong>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-blue-600">Waste Trend</div>
                  <div className={`font-semibold ${comparisonMetrics.trendData.wasteTrend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {comparisonMetrics.trendData.wasteTrend > 0 ? '+' : ''}{comparisonMetrics.trendData.wasteTrend.toFixed(1)} items/day
                    {comparisonMetrics.trendData.wasteTrend > 0 ? ' ↗' : ' ↘'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-600">Avg Daily Waste</div>
                  <div className="font-semibold text-blue-800">{comparisonMetrics.trendData.avgWastePerDay.toFixed(1)} items</div>
                </div>
                <div>
                  <div className="text-xs text-blue-600">Data Coverage</div>
                  <div className="font-semibold text-blue-800">{comparisonMetrics.trendData.totalDaysWithData}/7 days</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Trend Analysis Panel */}
        {showTrendAnalysis && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-blue-800 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Advanced Trend Analysis
              </h4>
              <select
                value={trendRange}
                onChange={(e) => setTrendRange(e.target.value as any)}
                className="px-3 py-1 text-sm border border-blue-300 rounded-md bg-white"
              >
                <option value="7days">7 Days</option>
                <option value="30days">30 Days</option>
                <option value="90days">90 Days</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trend Statistics */}
              <div>
                <h5 className="font-medium text-blue-700 mb-3">Trend Statistics</h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Waste Trend:</span>
                    <span className={`font-semibold ${trendAnalysis.wasteTrend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {trendAnalysis.wasteTrend > 0 ? 'Increasing' : 'Decreasing'} 
                      ({trendAnalysis.wasteTrend > 0 ? '+' : ''}{trendAnalysis.wasteTrend.toFixed(1)}/day)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Daily Waste:</span>
                    <span className="font-semibold text-blue-800">{trendAnalysis.avgWastePerDay.toFixed(1)} items</span>
                  </div>
                  {trendAnalysis.avgValuePerDay > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Value Trend:</span>
                        <span className={`font-semibold ${trendAnalysis.valueTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trendAnalysis.valueTrend > 0 ? 'Increasing' : 'Decreasing'}
                          (€{trendAnalysis.valueTrend > 0 ? '+' : ''}{trendAnalysis.valueTrend.toFixed(2)}/day)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg Daily Value:</span>
                        <span className="font-semibold text-blue-800">€{trendAnalysis.avgValuePerDay.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Data Coverage:</span>
                    <span className="font-semibold text-blue-800">
                      {trendAnalysis.totalDaysWithData}/{trendRange === '7days' ? 7 : trendRange === '30days' ? 30 : 90} days
                    </span>
                  </div>
                </div>
              </div>

              {/* Simple Trend Visualization */}
              <div>
                <h5 className="font-medium text-blue-700 mb-3">Waste Pattern (Last {trendRange === '7days' ? '7' : trendRange === '30days' ? '30' : '90'} Days)</h5>
                <div className="h-32 flex items-end space-x-1">
                  {trendAnalysis.data.slice(-20).map((day, index) => {
                    const maxWaste = Math.max(...trendAnalysis.data.map(d => d.waste));
                    const height = maxWaste > 0 ? (day.waste / maxWaste) * 100 : 0;
                    
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center">
                        <div
                          className={`w-full rounded-t transition-all ${
                            day.waste > trendAnalysis.avgWastePerDay ? 'bg-red-400' : 'bg-green-400'
                          }`}
                          style={{ height: `${height}%` }}
                          title={`${day.displayDate}: ${day.waste} items wasted`}
                        />
                        <div className="text-xs text-gray-500 mt-1 writing-mode-vertical transform rotate-45 origin-bottom-left">
                          {day.displayDate}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-gray-500 mt-2 flex justify-between">
                  <span>Green: Below average</span>
                  <span>Red: Above average</span>
                </div>
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
              {comparisonMetrics && comparisonMetrics.type !== 'trend-7-days' && (
                <p className="text-xs text-orange-600 mt-1">
                  {comparisonMetrics.wasteChange > 0 ? '+' : ''}{comparisonMetrics.wasteChange.toFixed(1)} vs {comparisonMetrics.type.replace('-', ' ')}
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
                {comparisonMetrics && comparisonMetrics.type !== 'trend-7-days' && (
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

      {/* Inventory Movement Table */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            {selectedDateMetrics.isToday ? 'Today\'s Inventory Movement' : `Inventory Movement for ${formatDisplayDate(selectedDate)}`}
          </h3>
          <p className="text-gray-600 text-sm">Detailed breakdown of all inventory changes</p>
        </div>
        <div className="p-6">
          {selectedDateMetrics.dayActivity.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">📦</div>
              <p className="text-gray-500">No inventory movements recorded</p>
              <p className="text-sm text-gray-400">
                Inventory movements will appear here when items are updated, wasted, or imported
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Item</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Quantity</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Employee</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDateMetrics.dayActivity.map(entry => {
                    const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    });
                    const typeIcon = entry.type === 'count_update' ? '📝' : 
                                   entry.type === 'waste' ? '🗑️' : 
                                   entry.type === 'import' ? '📥' : '➕';
                    const typeLabel = entry.type === 'count_update' ? 'Count Update' : 
                                    entry.type === 'waste' ? 'Waste Report' : 
                                    entry.type === 'import' ? 'Import' : 'Manual Add';
                    const typeColor = entry.type === 'count_update' ? 'text-blue-600' : 
                                    entry.type === 'waste' ? 'text-orange-600' : 
                                    entry.type === 'import' ? 'text-green-600' : 'text-purple-600';

                    return (
                      <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-600">{time}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-800">{entry.item}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className={`flex items-center ${typeColor}`}>
                            <span className="mr-2">{typeIcon}</span>
                            <span className="text-sm font-medium">{typeLabel}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <span className="font-medium">{entry.quantity}</span> {entry.unit}
                            {entry.type === 'waste' && entry.reason && (
                              <div className="text-xs text-gray-500 mt-1">Reason: {entry.reason}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{entry.employee}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {entry.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
