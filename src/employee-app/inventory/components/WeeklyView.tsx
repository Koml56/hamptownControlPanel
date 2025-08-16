// src/employee-app/inventory/components/WeeklyView.tsx
import React, { useState } from 'react';
import { Edit3, Trash2, Search, Calendar, TrendingUp, Clock } from 'lucide-react';
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

const WeeklyView: React.FC = () => {
  const { weeklyItems, customCategories, reorderItems } = useInventory();
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

  // Filter items
  const filteredItems = weeklyItems.filter(item => {
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter
  const categories = [...new Set(weeklyItems.map(item => item.category))];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = filteredItems.findIndex(item => item.id.toString() === active.id);
      const newIndex = filteredItems.findIndex(item => item.id.toString() === over?.id);
      
      // If we're filtering, we need to map back to the original array indices
      if (filteredItems.length === weeklyItems.length) {
        // No filtering - direct reorder
        reorderItems('weekly', oldIndex, newIndex);
      } else {
        // Items are filtered - we need to find original indices
        const activeItem = weeklyItems.find(item => item.id.toString() === active.id);
        const overItem = weeklyItems.find(item => item.id.toString() === over?.id);
        
        if (activeItem && overItem) {
          const originalOldIndex = weeklyItems.findIndex(item => item.id === activeItem.id);
          const originalNewIndex = weeklyItems.findIndex(item => item.id === overItem.id);
          reorderItems('weekly', originalOldIndex, originalNewIndex);
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

  // Calculate statistics for weekly items
  const totalItems = weeklyItems.length;
  const criticalItems = weeklyItems.filter(item => item.currentStock === 0).length;
  const lowStockItems = weeklyItems.filter(item => item.currentStock > 0 && item.currentStock <= item.minLevel).length;
  const totalValue = weeklyItems.reduce((sum, item) => sum + (item.cost * item.currentStock), 0);

  // Calculate days until next weekly count (assuming weekly counts happen on Mondays)
  const today = new Date();
  const daysUntilMonday = (1 + 7 - today.getDay()) % 7;
  const nextCountDate = new Date(today);
  nextCountDate.setDate(today.getDate() + daysUntilMonday);

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
              <Calendar className="w-6 h-6 mr-2 text-yellow-600" />
              Weekly Reorder Items
            </h2>
            <p className="text-gray-600">Items counted and updated weekly for regular restocking</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Next count: {nextCountDate.toLocaleDateString()}</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm text-yellow-600 font-medium">Total Items</div>
            <div className="text-2xl font-bold text-yellow-800">{totalItems}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-600 font-medium">Critical</div>
            <div className="text-2xl font-bold text-red-800">{criticalItems}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-orange-600 font-medium">Low Stock</div>
            <div className="text-2xl font-bold text-orange-800">{lowStockItems}</div>
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
            Weekly Count Update
          </button>
          <button 
            onClick={() => setShowWasteModal(true)}
            className="bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Report Waste
          </button>
        </div>
      </div>

      {/* Weekly Items Grid */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Weekly Items Status</h3>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category} className="capitalize">
                    {category}
                  </option>
                ))}
              </select>
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search weekly items..." 
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
              Showing {filteredItems.length} of {totalItems} weekly items
              {searchQuery && ` matching "${searchQuery}"`}
              {categoryFilter !== 'all' && ` in ${categoryFilter} category`}
            </div>
          )}
        </div>
        
        <div className="p-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || categoryFilter !== 'all' ? 'No items match your filters' : 'No weekly items yet'}
              </h3>
              <p className="text-sm">
                {searchQuery || categoryFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Add items from the database to start tracking weekly inventory'
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

      {/* Weekly Planning Insights */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-yellow-600" />
          Weekly Inventory Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">📅 Weekly Patterns</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Monitor weekend vs weekday usage</li>
              <li>• Track seasonal demand changes</li>
              <li>• Identify peak consumption days</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">🔄 Reorder Strategy</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Set reorder points based on lead times</li>
              <li>• Consider supplier delivery schedules</li>
              <li>• Account for weekend availability</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Weekly Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h4 className="font-semibold text-gray-800 mb-3">This Week's Turnover</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Fast Moving:</span>
              <span className="font-medium">{weeklyItems.filter(item => item.currentStock < item.minLevel * 0.5).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Normal:</span>
              <span className="font-medium">{weeklyItems.filter(item => item.currentStock >= item.minLevel * 0.5 && item.currentStock <= item.minLevel).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Slow Moving:</span>
              <span className="font-medium">{weeklyItems.filter(item => item.currentStock > item.minLevel).length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h4 className="font-semibold text-gray-800 mb-3">Reorder Recommendations</h4>
          <div className="space-y-2">
            {weeklyItems
              .filter(item => item.currentStock <= item.minLevel)
              .slice(0, 3)
              .map(item => (
                <div key={item.id} className="text-sm">
                  <div className="font-medium text-gray-700">{item.name}</div>
                  <div className="text-gray-500">Order: {item.minLevel * 2} {item.unit}</div>
                </div>
              ))
            }
            {weeklyItems.filter(item => item.currentStock <= item.minLevel).length === 0 && (
              <p className="text-gray-500 text-sm">All items adequately stocked</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h4 className="font-semibold text-gray-800 mb-3">Cost Analysis</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Avg. Cost/Item:</span>
              <span className="font-medium">€{totalItems > 0 ? (totalValue / totalItems).toFixed(2) : '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Weekly Budget:</span>
              <span className="font-medium">€{(totalValue * 0.25).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Reorder Value:</span>
              <span className="font-medium text-orange-600">
                €{weeklyItems
                  .filter(item => item.currentStock <= item.minLevel)
                  .reduce((sum, item) => sum + (item.cost * item.minLevel), 0)
                  .toFixed(2)
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCountModal && (
        <CountModal 
          frequency="weekly"
          selectedItemId={selectedItemId}
          onClose={() => {
            setShowCountModal(false);
            setSelectedItemId(null);
          }} 
        />
      )}
      {showWasteModal && (
        <WasteModal 
          frequency="weekly"
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

export default WeeklyView;
