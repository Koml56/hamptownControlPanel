// src/employee-app/inventory/components/ReportsView.tsx
import React from 'react';
import { BarChart3, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getStockStatus } from '../utils';

const ReportsView: React.FC = () => {
  const { dailyItems, weeklyItems, monthlyItems, activityLog } = useInventory();

  // Calculate statistics
  const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
  const criticalItems = allItems.filter(item => getStockStatus(item) === 'critical');
  const lowStockItems = allItems.filter(item => getStockStatus(item) === 'low');
  const totalValue = allItems.reduce((sum, item) => sum + (item.cost * item.currentStock), 0);
  
  // Activity statistics
  const todayActivity = activityLog.filter(entry => {
    const entryDate = new Date(entry.timestamp).toDateString();
    const today = new Date().toDateString();
    return entryDate === today;
  });

  const wasteToday = todayActivity
    .filter(entry => entry.type === 'waste')
    .reduce((sum, entry) => sum + entry.quantity, 0);

  const totalWasteValue = todayActivity
    .filter(entry => entry.type === 'waste')
    .reduce((sum, entry) => {
      const item = allItems.find(i => i.name === entry.item);
      return sum + (entry.quantity * (item?.cost || 0));
    }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-purple-600" />
          Inventory Analytics Dashboard
        </h2>
        <p className="text-gray-600">Overview of inventory status, trends, and performance metrics</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{allItems.length}</p>
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
              <p className="text-2xl font-bold text-red-600">{criticalItems.length}</p>
              <p className="text-xs text-red-500 mt-1">
                {criticalItems.length > 0 ? 'Immediate attention required' : 'All items adequately stocked'}
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
              <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
              <p className="text-2xl font-bold text-green-600">€{totalValue.toFixed(2)}</p>
              <p className="text-xs text-green-500 mt-1">
                Current stock valuation
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
              <p className="text-sm font-medium text-gray-600">Today's Waste</p>
              <p className="text-2xl font-bold text-orange-600">{wasteToday}</p>
              <p className="text-xs text-orange-500 mt-1">
                Value: €{totalWasteValue.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Stock Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock Status Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Normal Stock</span>
              </div>
              <span className="font-semibold text-green-600">
                {allItems.filter(item => getStockStatus(item) === 'normal').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Low Stock</span>
              </div>
              <span className="font-semibold text-yellow-600">{lowStockItems.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Critical Stock</span>
              </div>
              <span className="font-semibold text-red-600">{criticalItems.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Activity Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg mr-2">📝</span>
                <span className="text-sm text-gray-600">Count Updates</span>
              </div>
              <span className="font-semibold text-blue-600">
                {todayActivity.filter(a => a.type === 'count_update').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg mr-2">🗑️</span>
                <span className="text-sm text-gray-600">Waste Reports</span>
              </div>
              <span className="font-semibold text-orange-600">
                {todayActivity.filter(a => a.type === 'waste').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg mr-2">➕</span>
                <span className="text-sm text-gray-600">Items Added</span>
              </div>
              <span className="font-semibold text-green-600">
                {todayActivity.filter(a => a.type === 'manual_add' || a.type === 'import').length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Categories by Value</h3>
          <div className="space-y-3">
            {Object.entries(
              allItems.reduce((acc, item) => {
                const category = item.category;
                const value = item.cost * item.currentStock;
                acc[category] = (acc[category] || 0) + value;
                return acc;
              }, {} as Record<string, number>)
            )
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([category, value]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{category}</span>
                  <span className="font-semibold text-gray-800">€{value.toFixed(2)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Critical Items Alert */}
      {criticalItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">🚨 Critical Stock Alert</h3>
          </div>
          <p className="text-red-700 mb-4">
            The following items are critically low and require immediate restocking:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criticalItems.map(item => (
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
          <h3 className="text-lg font-semibold text-gray-800">Recent Activity Log</h3>
          <p className="text-gray-600 text-sm">Latest inventory transactions and updates</p>
        </div>
        <div className="p-6">
          {activityLog.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">📋</div>
              <p>No activity recorded yet</p>
              <p className="text-sm">Start tracking inventory to see activity here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activityLog.slice(0, 15).map(activity => {
                let typeIcon, typeColor, typeText;
                
                switch(activity.type) {
                  case 'count_update':
                    typeIcon = '📝'; typeColor = 'blue'; typeText = 'Count Updated';
                    break;
                  case 'waste':
                    typeIcon = '🗑️'; typeColor = 'red'; typeText = 'Waste Reported';
                    break;
                  case 'import':
                    typeIcon = '📊'; typeColor = 'green'; typeText = 'Excel Import';
                    break;
                  case 'manual_add':
                    typeIcon = '➕'; typeColor = 'purple'; typeText = 'Manual Add';
                    break;
                  default:
                    typeIcon = '📦'; typeColor = 'gray'; typeText = 'Activity';
                }
                
                return (
                  <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <div className={`bg-${typeColor}-100 p-2 rounded-lg mr-4`}>
                        <span className="text-lg">{typeIcon}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{typeText}: {activity.item}</div>
                        <div className="text-sm text-gray-600">
                          {activity.employee} • {activity.timestamp}
                          {activity.notes && ` • ${activity.notes}`}
                          {activity.reason && ` (${activity.reason})`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-700">{activity.quantity} {activity.unit}</div>
                      <div className="text-xs text-gray-500 capitalize">{activity.type.replace('_', ' ')}</div>
                    </div>
                  </div>
                );
              })}
              
              {activityLog.length > 15 && (
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-500">
                    Showing latest 15 activities. Total: {activityLog.length} records.
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
