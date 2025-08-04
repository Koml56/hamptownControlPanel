// src/employee-app/inventory/components/CategoryModal.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { InventoryFrequency, InventoryCategory } from '../../types';

interface CategoryModalProps {
  onClose: () => void;
  preSelectedFrequency?: string;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ onClose, preSelectedFrequency }) => {
  const { databaseItems, selectedItems, assignToCategory } = useInventory();
  const [frequency, setFrequency] = useState<InventoryFrequency>(
    (preSelectedFrequency as InventoryFrequency) || 'daily'
  );
  const [category, setCategory] = useState<InventoryCategory>('produce');
  const [minLevel, setMinLevel] = useState(5);
  const [initialStock, setInitialStock] = useState(0);

  const selectedItemsData = databaseItems.filter(item => selectedItems.has(item.id));

  const handleAssign = () => {
    assignToCategory(Array.from(selectedItems), frequency, category, minLevel, initialStock);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Assign Category and Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {!preSelectedFrequency && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <select 
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as InventoryFrequency)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="daily">🔥 Daily Items</option>
                <option value="weekly">📅 Weekly Items</option>
                <option value="monthly">📦 Monthly Items</option>
              </select>
            </div>
          )}
          
          {preSelectedFrequency && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-1">Selected Frequency:</div>
              <div className="text-lg font-semibold text-blue-700">
                {preSelectedFrequency === 'daily' && '🔥 Daily Items'}
                {preSelectedFrequency === 'weekly' && '📅 Weekly Items'}
                {preSelectedFrequency === 'monthly' && '📦 Monthly Items'}
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value as InventoryCategory)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="produce">🥬 Produce</option>
              <option value="meat">🥩 Meat & Fish</option>
              <option value="dairy">🥛 Dairy</option>
              <option value="bread">🍞 Bread & Baked</option>
              <option value="beverages">🥤 Beverages</option>
              <option value="packaging">📦 Packaging</option>
              <option value="tukku">🏪 Tukku (Wholesale)</option>
              <option value="cleaning">🧽 Cleaning</option>
              <option value="supplies">📦 Supplies</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Stock Level</label>
            <input 
              type="number" 
              min="0" 
              value={minLevel}
              onChange={(e) => setMinLevel(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Initial Stock</label>
            <input 
              type="number" 
              min="0" 
              value={initialStock}
              onChange={(e) => setInitialStock(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Items to assign:</h4>
            <div className="text-sm text-blue-700 max-h-32 overflow-y-auto">
              {selectedItemsData.map(item => (
                <div key={item.id} className="py-1">• {item.name}</div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 mt-6">
          <button 
            onClick={handleAssign}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Assign Category
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;
