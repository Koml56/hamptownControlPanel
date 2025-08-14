// src/employee-app/inventory/components/ManualItemModal.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { showToast, getAllCategoryOptions } from '../utils';

interface ManualItemModalProps {
  onClose: () => void;
}

const ManualItemModal: React.FC<ManualItemModalProps> = ({ onClose }) => {
  const { addManualItem, customCategories } = useInventory();
  const [formData, setFormData] = useState({
    name: '',
    ean: '',
    unit: '',
    cost: '',
    costWithTax: '',
    type: ''
  });

  // Get all available categories
  const allCategoryOptions = getAllCategoryOptions(customCategories);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      showToast('Please enter a product name');
      return;
    }

    const newItem = {
      name: formData.name.trim(),
      ean: formData.ean.trim(),
      unit: formData.unit.trim(),
      cost: parseFloat(formData.cost) || 0,
      costWithTax: parseFloat(formData.costWithTax) || 0,
      type: formData.type as any
    };

    addManualItem(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Add Manual Item</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
            <input 
              type="text" 
              placeholder="Enter product name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">EAN Code (Optional)</label>
            <input 
              type="text" 
              placeholder="Enter EAN code"
              value={formData.ean}
              onChange={(e) => setFormData(prev => ({ ...prev, ean: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
            <input 
              type="text" 
              placeholder="e.g., kg, pieces, bottles"
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price (excl. tax)</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="0.00"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price (incl. tax)</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="0.00"
                value={formData.costWithTax}
                onChange={(e) => setFormData(prev => ({ ...prev, costWithTax: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select 
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select type...</option>
              {allCategoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex gap-4 mt-6">
          <button 
            onClick={handleSubmit}
            className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Add to Database
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

export default ManualItemModal;
