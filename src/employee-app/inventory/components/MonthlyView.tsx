// src/employee-app/inventory/components/MonthlyView.tsx
import React, { useState } from 'react';
import { Edit3, Trash2, Search, Package, Calendar } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useInventory } from '../InventoryContext';
import DraggableItemCard from './DraggableItemCard';
import CountModal from './CountModal';
import WasteModal from './WasteModal';
import { getAllCategoryOptions } from '../utils';

const MonthlyView: React.FC = () => {
  const { monthlyItems, customCategories, reorderItems } = useInventory();
  const [showCountModal, setShowCountModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get all available categories
  const allCategoryOptions = getAllCategoryOptions(customCategories);

  // Filter items
  const filteredItems = monthlyItems.filter(item => {
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = filteredItems.findIndex(item => item.id.toString() === active.id);
      const newIndex = filteredItems.findIndex(item => item.id.toString() === over?.id);
      
      // If we're filtering, we need to map back to the original array indices
      if (filteredItems.length === monthlyItems.length) {
        // No filtering - direct reorder
        reorderItems('monthly', oldIndex, newIndex);
      } else {
        // Items are filtered - we need to find original indices
        const activeItem = monthlyItems.find(item => item.id.toString() === active.id);
        const overItem = monthlyItems.find(item => item.id.toString() === over?.id);
        
        if (activeItem && overItem) {
          const originalOldIndex = monthlyItems.findIndex(item => item.id === activeItem.id);
          const originalNewIndex = monthlyItems.findIndex(item => item.id === overItem.id);
          reorderItems('monthly', originalOldIndex, originalNewIndex);
        }
      }
    }
  };

  const handleUpdateCount = (itemId: number | string) => {
    setSelectedItemId(itemId);
    setShowCountModal(true);
  };

  const handleReportWaste = (itemId: number | string) => {
    setSelectedItemId(itemId);
    setShowWasteModal(true);
  };

  // Calculate statistics for monthly items
  const totalItems = monthlyItems.length;
  const criticalItems = monthlyItems.filter(item => item.currentStock === 0).length;
  const lowStockItems = monthlyItems.filter(item => item.currentStock > 0 && item.currentStock <= item.minLevel).length;
  const totalValue = monthlyItems.reduce((sum, item) => sum + (item.cost * item.currentStock), 0);

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
              <Package className="w-6 h-6 mr-2 text-green-600" />
              Monthly Bulk Items
            </h2>
            <p className="text-gray-600">Items counted and updated monthly for bulk ordering and storage</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Last monthly count: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Total Items</div>
            <div className="text-2xl font-bold text-green-800">{totalItems}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-600 font-medium">Critical</div>
            <div className="text-2xl font-bold text-red-800">{criticalItems}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm text-yellow-600 font-medium">Low Stock</div>
            <div className="text-2xl font-bold text-yellow-800">{lowStockItems}</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Total Value</div>
            <div className="text-2xl font-bold text-blue-800">€{totalValue.toFixed(2)}</div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => setShowCountModal(true)}
            className="bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
          >
            <Edit3 className="w-5 h-5 mr-2" />
            Monthly Count Update
          </button>
          <button 
            onClick={() => setShowWasteModal(true)}
            className="bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Report Waste/Damage
          </button>
        </div>
      </div>

      {/* Monthly Items Grid */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Monthly Items Inventory</h3>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {allCategoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search monthly items..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-48 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* Results Summary */}
          {(searchQuery || categoryFilter !== 'all') && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredItems.length} of {totalItems} monthly items
              {searchQuery && ` matching "${searchQuery}"`}
              {categoryFilter !== 'all' && ` in ${categoryFilter} category`}
            </div>
          )}
        </div>
        
        <div className="p-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || categoryFilter !== 'all' ? 'No items match your filters' : 'No monthly items yet'}
              </h3>
              <p className="text-sm">
                {searchQuery || categoryFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Add items from the database to start tracking monthly inventory'
                }
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredItems.map(item => item.id.toString())}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map(item => (
                    <DraggableItemCard
                      key={item.id}
                      item={item}
                      onUpdateCount={handleUpdateCount}
                      onReportWaste={handleReportWaste}
                      customCategories={customCategories}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Monthly Planning Tips */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Package className="w-5 h-5 mr-2 text-green-600" />
          Monthly Inventory Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">📦 Bulk Items Management</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Review monthly consumption patterns</li>
              <li>• Check expiration dates on bulk items</li>
              <li>• Plan storage space for large orders</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">📊 Cost Optimization</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Compare supplier prices monthly</li>
              <li>• Track seasonal price variations</li>
              <li>• Identify bulk discount opportunities</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Critical Items Alert for Monthly */}
      {criticalItems > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-red-100 rounded-lg mr-3">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Monthly Items Need Attention</h3>
              <p className="text-red-600 text-sm">
                {criticalItems} monthly items are out of stock and may need immediate ordering
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {monthlyItems
              .filter(item => item.currentStock === 0)
              .map(item => (
                <div key={item.id} className="bg-white p-3 rounded-lg border-l-4 border-red-500">
                  <div className="font-medium text-gray-800">{item.name}</div>
                  <div className="text-sm text-red-600">
                    Out of stock - Min required: {item.minLevel} {item.unit}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{item.category}</div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Modals */}
      {showCountModal && (
        <CountModal 
          frequency="monthly"
          selectedItemId={selectedItemId}
          onClose={() => {
            setShowCountModal(false);
            setSelectedItemId(null);
          }} 
        />
      )}
      {showWasteModal && (
        <WasteModal 
          frequency="monthly"
          selectedItemId={selectedItemId}
          onClose={() => {
            setShowWasteModal(false);
            setSelectedItemId(null);
          }} 
        />
      )}
    </div>
  );
};

export default MonthlyView;
