// src/employee-app/inventory/components/InventoryHeader.tsx
import React from 'react';
import { ChefHat } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getStockStatus } from '../utils';

const InventoryHeader: React.FC = () => {
  const { dailyItems, weeklyItems, monthlyItems, databaseItems } = useInventory();

  // Calculate stock statistics
  const allItems = [...dailyItems, ...weeklyItems, ...monthlyItems];
  const criticalCount = allItems.filter(item => getStockStatus(item).status === 'critical').length;
  const lowStockCount = allItems.filter(item => getStockStatus(item).status === 'low').length;
  const wellStockedCount = allItems.filter(item => getStockStatus(item).status === 'normal').length;
  const databaseCount = databaseItems.length;

  return (
    <div className="bg-white rounded-xl shadow-sm mb-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-orange-500 p-3 rounded-lg mr-4">
            <ChefHat className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Restaurant Inventory</h1>
            <p className="text-gray-600">Track usage, waste, and consumption patterns</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-red-50 px-4 py-2 rounded-lg">
            <div className="text-sm text-red-600 font-medium">Critical Items</div>
            <div className="text-xl font-bold text-red-800">{criticalCount}</div>
          </div>
          <div className="bg-yellow-50 px-4 py-2 rounded-lg">
            <div className="text-sm text-yellow-600 font-medium">Low Stock</div>
            <div className="text-xl font-bold text-yellow-800">{lowStockCount}</div>
          </div>
          <div className="bg-green-50 px-4 py-2 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Well Stocked</div>
            <div className="text-xl font-bold text-green-800">{wellStockedCount}</div>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Database Items</div>
            <div className="text-xl font-bold text-blue-800">{databaseCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryHeader;
