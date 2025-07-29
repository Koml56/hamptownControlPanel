// src/employee-app/inventory/components/BulkActionsBar.tsx
import React from 'react';
import { useInventory } from '../InventoryContext';

interface BulkActionsBarProps {
  onAssignCategory: () => void;
  onDelete: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({ onAssignCategory, onDelete }) => {
  const { selectedItems, clearSelection } = useInventory();

  if (selectedItems.size === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-xl shadow-lg border p-4 min-w-96">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedItems.size} items selected
            </span>
            <div className="h-4 w-px bg-gray-300"></div>
            <div className="flex space-x-2">
              <button 
                onClick={onAssignCategory}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
              >
                🔥 Daily
              </button>
              <button 
                onClick={onAssignCategory}
                className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 transition-colors"
              >
                📅 Weekly
              </button>
              <button 
                onClick={onAssignCategory}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
              >
                📦 Monthly
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={clearSelection}
              className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
            <button 
              onClick={onDelete}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;
