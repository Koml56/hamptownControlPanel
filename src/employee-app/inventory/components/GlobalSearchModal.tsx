// src/employee-app/inventory/components/GlobalSearchModal.tsx
import React, { useState, useMemo } from 'react';
import { X, Search, Edit3, Trash2 } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { InventoryItem, InventoryFrequency } from '../../types';
import { getCategoryNameOnly } from '../utils';
import { getStockStatus } from '../stockUtils';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateCount: (itemId: number | string, frequency: InventoryFrequency) => void;
  onReportWaste: (itemId: number | string, frequency: InventoryFrequency) => void;
}

interface SearchResult extends InventoryItem {
  frequency: InventoryFrequency;
  frequencyLabel: string;
  frequencyIcon: string;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  onUpdateCount, 
  onReportWaste 
}) => {
  const { dailyItems, weeklyItems, monthlyItems, customCategories } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');

  // Combine all items with their frequency information
  const allItems: SearchResult[] = useMemo(() => {
    const results: SearchResult[] = [];
    
    dailyItems.forEach(item => results.push({
      ...item,
      frequency: 'daily' as InventoryFrequency,
      frequencyLabel: 'Daily',
      frequencyIcon: '🔥'
    }));
    
    weeklyItems.forEach(item => results.push({
      ...item,
      frequency: 'weekly' as InventoryFrequency,
      frequencyLabel: 'Weekly',
      frequencyIcon: '📅'
    }));
    
    monthlyItems.forEach(item => results.push({
      ...item,
      frequency: 'monthly' as InventoryFrequency,
      frequencyLabel: 'Monthly',
      frequencyIcon: '📦'
    }));
    
    return results;
  }, [dailyItems, weeklyItems, monthlyItems]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return allItems.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      getCategoryNameOnly(item.category, customCategories).toLowerCase().includes(query)
    );
  }, [searchQuery, allItems, customCategories]);

  const handleUpdateCount = (item: SearchResult) => {
    onUpdateCount(item.id, item.frequency);
    onClose();
  };

  const handleReportWaste = (item: SearchResult) => {
    onReportWaste(item.id, item.frequency);
    onClose();
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'ok': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Search className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">Global Inventory Search</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Search Input */}
          <div className="mt-4 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search across all inventory items (daily, weekly, monthly)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              autoFocus
            />
          </div>
          
          {/* Results Summary */}
          {searchQuery && (
            <div className="mt-3 text-sm text-gray-600">
              {filteredItems.length === 0 
                ? 'No items found matching your search'
                : `Found ${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''}`
              }
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {!searchQuery ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Start typing to search</h3>
              <p className="text-sm">Search across all daily, weekly, and monthly inventory items</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No items found</h3>
              <p className="text-sm">Try adjusting your search terms or check the spelling</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const stockStatus = getStockStatus(item.currentStock, item.minLevel);
                const categoryName = getCategoryNameOnly(item.category, customCategories);
                
                return (
                  <div
                    key={`${item.frequency}-${item.id}`}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                  >
                    {/* Item Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-800 truncate">{item.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{categoryName}</p>
                      </div>
                      <div className="flex items-center ml-2">
                        <span className="text-xs font-medium text-gray-600">
                          {item.frequencyIcon} {item.frequencyLabel}
                        </span>
                      </div>
                    </div>

                    {/* Stock Info */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Current Stock:</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded-md border ${getStockStatusColor(stockStatus)}`}>
                          {item.currentStock} {item.unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Min Level:</span>
                        <span className="text-sm text-gray-800">{item.minLevel} {item.unit}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateCount(item)}
                        className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center justify-center"
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Update Count
                      </button>
                      <button
                        onClick={() => handleReportWaste(item)}
                        className="flex-1 bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Report Waste
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;