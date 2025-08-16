// src/employee-app/inventory/components/ReportsView.tsx
import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, DollarSign, Calendar, GitCompare, Download, FileText, Eye, Filter } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getStockStatus } from '../stockUtils';
import type { DailyInventorySnapshot } from '../../types';

const ReportsView: React.FC = () => {
  const { 
    dailyItems, 
    weeklyItems, 
    monthlyItems, 
    activityLog, 
    stockCountSnapshots, 
    dailyInventorySnapshots 
  } = useInventory();
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [comparisonDate, setComparisonDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'trends' | 'compliance' | 'export'>('overview');
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days'>('7days');
  const [showComparison, setShowComparison] = useState(false);

  // Get available dates from daily snapshots for date picker
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    
    // Add dates from daily snapshots
    (dailyInventorySnapshots || []).forEach(snapshot => {
      if (snapshot && snapshot.date) {
        dates.add(snapshot.date);
      }
    });
    
    // Add dates from stock count snapshots for backward compatibility
    (stockCountSnapshots || []).forEach(snapshot => {
      if (snapshot && snapshot.date) {
        dates.add(snapshot.date);
      }
    });
    
    // Always include today
    const today = new Date().toISOString().split('T')[0];
    dates.add(today);
    
    return Array.from(dates).sort().reverse(); // Most recent first
  }, [dailyInventorySnapshots, stockCountSnapshots]);

  // Get daily snapshot for selected date
  const selectedSnapshot = useMemo(() => {
    return (dailyInventorySnapshots || []).find(snapshot => snapshot && snapshot.date === selectedDate);
  }, [dailyInventorySnapshots, selectedDate]);

  // Calculate comprehensive analytics for selected date
  const analytics = useMemo(() => {
    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    
    if (selectedSnapshot) {
      // Use historical snapshot data
      const snapshot = selectedSnapshot;
      const items = Object.values(snapshot.items || {});
      
      return {
        date: selectedDate,
        source: 'snapshot',
        inventoryValue: snapshot.inventoryValue || 0,
        totalItems: items.length,
        
        stockStatus: {
          outOfStock: items.filter(item => item.currentStock === 0).length,
          critical: items.filter(item => {
            const minLevel = item.minimumLevel || 0;
            return item.currentStock > 0 && item.currentStock <= minLevel * 0.5;
          }).length,
          low: items.filter(item => {
            const minLevel = item.minimumLevel || 0;
            return item.currentStock > minLevel * 0.5 && item.currentStock <= minLevel;
          }).length,
          ok: items.filter(item => {
            const minLevel = item.minimumLevel || 0;
            return item.currentStock > minLevel;
          }).length
        },
        
        dailyActivity: {
          itemsReceived: Object.keys(snapshot.dailyActivity?.itemsReceived || {}).length,
          itemsUsed: Object.keys(snapshot.dailyActivity?.itemsUsed || {}).length,
          itemsWasted: Object.keys(snapshot.dailyActivity?.itemsWasted || {}).length,
          totalWasteValue: Object.values(snapshot.dailyActivity?.itemsWasted || {})
            .reduce((sum, item) => sum + (item?.cost || 0), 0)
        },
        
        employeeActivity: snapshot.employeeActivity || {},
        compliance: snapshot.compliance || {},
        
        categories: {
          daily: items.filter(item => item.frequency === 'daily').length,
          weekly: items.filter(item => item.frequency === 'weekly').length,
          monthly: items.filter(item => item.frequency === 'monthly').length
        }
      };
    } else if (isToday) {
      // Use current data for today
      const allItems = [...(dailyItems || []), ...(weeklyItems || []), ...(monthlyItems || [])];
      const { startOfDay, endOfDay } = getDateRange(selectedDate);
      
      const dayActivity = (activityLog || []).filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startOfDay && entryDate <= endOfDay;
      });
      
      const totalValue = allItems.reduce((sum, item) => sum + (item.currentStock * item.cost), 0);
      
      return {
        date: selectedDate,
        source: 'current',
        inventoryValue: {
          total: totalValue,
          dailyItems: (dailyItems || []).reduce((sum, item) => sum + (item.currentStock * item.cost), 0),
          weeklyItems: (weeklyItems || []).reduce((sum, item) => sum + (item.currentStock * item.cost), 0),
          monthlyItems: (monthlyItems || []).reduce((sum, item) => sum + (item.currentStock * item.cost), 0)
        },
        totalItems: allItems.length,
        
        stockStatus: {
          outOfStock: allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'out').length,
          critical: allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'critical').length,
          low: allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'low').length,
          ok: allItems.filter(item => getStockStatus(item.currentStock, item.minLevel) === 'ok').length
        },
        
        dailyActivity: {
          itemsReceived: dayActivity.filter(entry => entry.type === 'manual_add').length,
          itemsUsed: dayActivity.filter(entry => entry.type === 'count_update').length,
          itemsWasted: dayActivity.filter(entry => entry.type === 'waste').length,
          totalWasteValue: dayActivity
            .filter(entry => entry.type === 'waste')
            .reduce((sum, entry) => {
              const item = allItems.find(i => i.name === entry.item);
              return sum + (entry.quantity * (item?.cost || 0));
            }, 0)
        },
        
        categories: {
          daily: (dailyItems || []).length,
          weekly: (weeklyItems || []).length,
          monthly: (monthlyItems || []).length
        }
      };
    } else {
      // No data available for this date
      return null;
    }
  }, [selectedDate, selectedSnapshot, dailyItems, weeklyItems, monthlyItems, activityLog]);

  // Calculate comparison data if comparison date is selected
  const comparisonAnalytics = useMemo(() => {
    if (!comparisonDate) return null;
    
    const comparisonSnapshot = (dailyInventorySnapshots || []).find(snapshot => 
      snapshot && snapshot.date === comparisonDate
    );
    if (!comparisonSnapshot) return null;
    
    const items = Object.values(comparisonSnapshot.items || {});
    
    return {
      date: comparisonDate,
      inventoryValue: comparisonSnapshot.inventoryValue || 0,
      totalItems: items.length,
      stockStatus: {
        outOfStock: items.filter(item => item.currentStock === 0).length,
        critical: items.filter(item => {
          const minLevel = item.minimumLevel || 0;
          return item.currentStock > 0 && item.currentStock <= minLevel * 0.5;
        }).length,
        low: items.filter(item => {
          const minLevel = item.minimumLevel || 0;
          return item.currentStock > minLevel * 0.5 && item.currentStock <= minLevel;
        }).length,
        ok: items.filter(item => {
          const minLevel = item.minimumLevel || 0;
          return item.currentStock > minLevel;
        }).length
      }
    };
  }, [comparisonDate, dailyInventorySnapshots]);

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

  // Export functionality
  const exportReport = (format: 'pdf' | 'csv') => {
    if (!analytics) return;
    
    if (format === 'csv') {
      // Create CSV content
      const csvContent = `Date,Total Value,Total Items,Out of Stock,Critical,Low Stock,OK Stock,Waste Value\n` +
        `${analytics.date},${analytics.inventoryValue.total || 'N/A'},${analytics.totalItems},` +
        `${analytics.stockStatus.outOfStock},${analytics.stockStatus.critical},` +
        `${analytics.stockStatus.low},${analytics.stockStatus.ok},${analytics.dailyActivity.totalWasteValue}`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-report-${analytics.date}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      // For PDF, we would need a PDF library - for now just alert
      alert('PDF export would be implemented with a PDF generation library like jsPDF');
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
              Analytics Dashboard
            </h2>
            <p className="text-gray-600 mt-1">
              Comprehensive inventory analysis and business intelligence
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Date Selection */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableDates.map(date => (
                  <option key={date} value={date}>
                    {date === new Date().toISOString().split('T')[0] ? 'Today' : formatDisplayDate(date)}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'trends', label: 'Trends', icon: TrendingUp },
                { id: 'compliance', label: 'Compliance', icon: AlertTriangle },
                { id: 'export', label: 'Export', icon: Download }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setViewMode(id as any)}
                  className={`px-3 py-2 text-sm font-medium flex items-center gap-1 ${
                    viewMode === id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison Toggle */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showComparison}
              onChange={(e) => setShowComparison(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable Comparison</span>
          </label>
          
          {showComparison && (
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-gray-500" />
              <select
                value={comparisonDate || ''}
                onChange={(e) => setComparisonDate(e.target.value || null)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select comparison date</option>
                {availableDates
                  .filter(date => date !== selectedDate)
                  .map(date => (
                    <option key={date} value={date}>
                      {formatDisplayDate(date)}
                    </option>
                  ))
                }
              </select>
            </div>
          )}
        </div>
      </div>

      {/* No Data State */}
      {!analytics && (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">
            No inventory data is available for {formatDisplayDate(selectedDate)}.
            {selectedDate !== new Date().toISOString().split('T')[0] && 
              " Historical snapshots may not have been created for this date."
            }
          </p>
        </div>
      )}

      {/* Main Content */}
      {analytics && (
        <>
          {/* Overview Mode */}
          {viewMode === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Key Metrics */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Total Value</p>
                        <p className="text-2xl font-bold text-blue-900">
                          ${(analytics.inventoryValue as any).total 
                            ? (analytics.inventoryValue as any).total.toFixed(2)
                            : ((analytics.inventoryValue as any) || 0).toFixed(2)
                          }
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Total Items</p>
                        <p className="text-2xl font-bold text-green-900">{analytics.totalItems}</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-600">Low Stock</p>
                        <p className="text-2xl font-bold text-yellow-900">
                          {analytics.stockStatus.low + analytics.stockStatus.critical}
                        </p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    </div>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600">Out of Stock</p>
                        <p className="text-2xl font-bold text-red-900">{analytics.stockStatus.outOfStock}</p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                  </div>
                </div>

                {/* Comparison */}
                {showComparison && comparisonAnalytics && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Comparison with {formatDisplayDate(comparisonDate!)}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Value Change:</span>
                        <span className={`ml-2 font-semibold ${
                          (typeof analytics.inventoryValue === 'number' ? analytics.inventoryValue : analytics.inventoryValue.total) > 
                          (typeof comparisonAnalytics.inventoryValue === 'number' ? comparisonAnalytics.inventoryValue : comparisonAnalytics.inventoryValue.total)
                            ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {((typeof analytics.inventoryValue === 'number' ? analytics.inventoryValue : analytics.inventoryValue.total) - 
                           (typeof comparisonAnalytics.inventoryValue === 'number' ? comparisonAnalytics.inventoryValue : comparisonAnalytics.inventoryValue.total)).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Items Change:</span>
                        <span className={`ml-2 font-semibold ${
                          analytics.totalItems > comparisonAnalytics.totalItems ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {analytics.totalItems - comparisonAnalytics.totalItems}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stock Status Breakdown */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Status</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Well Stocked', count: analytics.stockStatus.ok, color: 'green', bgColor: 'bg-green-500' },
                    { label: 'Low Stock', count: analytics.stockStatus.low, color: 'yellow', bgColor: 'bg-yellow-500' },
                    { label: 'Critical', count: analytics.stockStatus.critical, color: 'orange', bgColor: 'bg-orange-500' },
                    { label: 'Out of Stock', count: analytics.stockStatus.outOfStock, color: 'red', bgColor: 'bg-red-500' }
                  ].map(({ label, count, color, bgColor }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${bgColor}`}></div>
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Activity */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{analytics.dailyActivity.itemsReceived}</p>
                    <p className="text-sm text-gray-600">Items Received</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{analytics.dailyActivity.itemsUsed}</p>
                    <p className="text-sm text-gray-600">Stock Updates</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{analytics.dailyActivity.itemsWasted}</p>
                    <p className="text-sm text-gray-600">Items Wasted</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-700">${analytics.dailyActivity.totalWasteValue.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Waste Value</p>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequency Categories</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Daily Items', count: analytics.categories.daily, color: 'red' },
                    { label: 'Weekly Items', count: analytics.categories.weekly, color: 'yellow' },
                    { label: 'Monthly Items', count: analytics.categories.monthly, color: 'green' }
                  ].map(({ label, count, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      <span className={`text-sm font-bold text-${color}-600`}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Export Mode */}
          {viewMode === 'export' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-6 h-6 text-red-600" />
                    <h4 className="font-semibold text-gray-900">PDF Report</h4>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Generate a comprehensive PDF report with charts and detailed analysis.
                  </p>
                  <button
                    onClick={() => exportReport('pdf')}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Export PDF
                  </button>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Download className="w-6 h-6 text-green-600" />
                    <h4 className="font-semibold text-gray-900">CSV Data</h4>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Download raw data in CSV format for external analysis.
                  </p>
                  <button
                    onClick={() => exportReport('csv')}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data Source Indicator */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>
                Data source: {analytics.source === 'snapshot' ? 'Historical snapshot' : 'Current inventory'} 
                for {formatDisplayDate(selectedDate)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default ReportsView;
