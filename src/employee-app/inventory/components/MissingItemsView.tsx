// src/employee-app/inventory/components/MissingItemsView.tsx
import React, { useState } from 'react';
import { AlertTriangle, ShoppingCart, Download, Eye, Check, Clock, Package } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getStockStatus, getCategoryIcon } from '../utils';
import { InventoryItem, InventoryFrequency } from '../../types';

const MissingItemsView: React.FC = () => {
  const { dailyItems, weeklyItems, monthlyItems } = useInventory();
  const [showOrderModal, setShowOrderModal] = useState(false);
  
  // Get all items and categorize by urgency
  const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
  const criticalItems = allItems.filter(item => getStockStatus(item).status === 'critical');
  const lowStockItems = allItems.filter(item => getStockStatus(item).status === 'low');

  const totalMissingItems = criticalItems.length + lowStockItems.length;

  // Generate Kespro order CSV data
  const generateOrderCSV = () => {
    const orderItems = [...criticalItems, ...lowStockItems];
    const csvHeader = 'EAN,Product Name,Current Stock,Min Level,Suggested Order,Unit,Notes\n';
    const csvData = orderItems.map(item => {
      const suggestedOrder = Math.max(item.minLevel - item.currentStock, item.minLevel);
      const notes = item.currentStock === 0 ? 'CRITICAL: Out of stock' : 'Low stock';
      return `${item.ean || 'No EAN'},"${item.name}",${item.currentStock},${item.minLevel},${suggestedOrder},${item.unit},"${notes}"`;
    }).join('\n');
    
    const blob = new Blob([csvHeader + csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kespro-order-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getItemFrequencyIcon = (item: InventoryItem) => {
    switch (item.frequency) {
      case 'daily': return '🔥';
      case 'weekly': return '📅';
      case 'monthly': return '📦';
      default: return '📋';
    }
  };

  const getUrgencyColor = (item: InventoryItem) => {
    const status = getStockStatus(item).status;
    switch (status) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'low': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getUrgencyBadge = (item: InventoryItem) => {
    const status = getStockStatus(item).status;
    switch (status) {
      case 'critical': 
        return <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full">🚨 CRITICAL</span>;
      case 'low': 
        return <span className="px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded-full">⚠️ LOW</span>;
      default: 
        return null;
    }
  };

  if (totalMissingItems === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">All Items Well Stocked! 🎉</h3>
          <p className="text-gray-600">No items are currently below minimum levels.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="bg-red-500 p-2 md:p-3 rounded-lg mr-3 md:mr-4">
              <AlertTriangle className="text-white w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                🚨 {totalMissingItems} Items Need Attention
              </h2>
              <p className="text-sm md:text-base text-gray-600">
                {criticalItems.length} critical • {lowStockItems.length} low stock
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateOrderCSV}
              className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Export Kespro Order</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="text-xs font-medium text-red-600">Out of Stock</div>
            <div className="text-lg font-bold text-red-800">{criticalItems.length}</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="text-xs font-medium text-yellow-600">Low Stock</div>
            <div className="text-lg font-bold text-yellow-800">{lowStockItems.length}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="text-xs font-medium text-blue-600">Total Value</div>
            <div className="text-lg font-bold text-blue-800">
              €{[...criticalItems, ...lowStockItems].reduce((sum, item) => sum + (item.cost || 0), 0).toFixed(2)}
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <div className="text-xs font-medium text-purple-600">Avg Days Since Used</div>
            <div className="text-lg font-bold text-purple-800">
              {Math.round([...criticalItems, ...lowStockItems].reduce((sum, item) => {
                const daysSince = Math.floor((Date.now() - new Date(item.lastUsed).getTime()) / (1000 * 60 * 60 * 24));
                return sum + daysSince;
              }, 0) / totalMissingItems) || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Critical Items Section */}
      {criticalItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <div className="flex items-center mb-4">
            <div className="bg-red-600 p-2 rounded-lg mr-3">
              <AlertTriangle className="text-white w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              🚨 CRITICAL - OUT OF STOCK ({criticalItems.length})
            </h3>
          </div>
          <div className="space-y-3">
            {criticalItems.map((item) => (
              <div key={item.id} className={`p-4 rounded-lg border-2 ${getUrgencyColor(item)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <span className="text-2xl mr-3">{getCategoryIcon(item.category)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-800">{item.name}</h4>
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">{getItemFrequencyIcon(item)} {item.frequency}</span>
                        {getUrgencyBadge(item)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {item.ean && `${item.ean} • `}{item.unit} • Last used: {new Date(item.lastUsed).toLocaleDateString()}
                      </p>
                      <div className="flex gap-4 mt-1 text-sm">
                        <span className="text-red-600 font-semibold">Current: {item.currentStock}/{item.minLevel} {item.unit}</span>
                        <span className="text-gray-600">Cost: €{(item.cost || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Stock Items Section */}
      {lowStockItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <div className="flex items-center mb-4">
            <div className="bg-yellow-600 p-2 rounded-lg mr-3">
              <Clock className="text-white w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              ⚠️ LOW STOCK - BELOW MINIMUM ({lowStockItems.length})
            </h3>
          </div>
          <div className="space-y-3">
            {lowStockItems.map((item) => (
              <div key={item.id} className={`p-4 rounded-lg border-2 ${getUrgencyColor(item)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <span className="text-2xl mr-3">{getCategoryIcon(item.category)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-800">{item.name}</h4>
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">{getItemFrequencyIcon(item)} {item.frequency}</span>
                        {getUrgencyBadge(item)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {item.ean && `${item.ean} • `}{item.unit} • Last used: {new Date(item.lastUsed).toLocaleDateString()}
                      </p>
                      <div className="flex gap-4 mt-1 text-sm">
                        <span className="text-yellow-600 font-semibold">Current: {item.currentStock}/{item.minLevel} {item.unit}</span>
                        <span className="text-gray-600">Cost: €{(item.cost || 0).toFixed(2)}</span>
                        <span className="text-blue-600">
                          {Math.ceil((item.minLevel - item.currentStock) / item.minLevel * 100)}% below minimum
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Panel */}
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={generateOrderCSV}
            className="flex items-center justify-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Generate Kespro Order
          </button>
          <button
            className="flex items-center justify-center p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            onClick={() => {
              // TODO: Implement mark as ordered functionality
              alert('Mark as Ordered functionality coming soon!');
            }}
          >
            <Check className="w-5 h-5 mr-2" />
            Mark All as Ordered
          </button>
          <button
            className="flex items-center justify-center p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            onClick={() => {
              // TODO: Implement notification settings
              alert('Smart notifications coming soon!');
            }}
          >
            <Eye className="w-5 h-5 mr-2" />
            Enable Smart Alerts
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissingItemsView;