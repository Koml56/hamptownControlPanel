// src/employee-app/inventory/components/DatabaseView.tsx
import React, { useState, useEffect } from 'react';
import { Upload, Plus, Download, Search, Edit3, Trash2, X, AlertTriangle, TrendingDown, Tag } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getCategoryIcon, getAllCategoryOptions } from '../utils';
import { InventoryFrequency, InventoryCategory, DatabaseItem } from '../../types';
import ImportModal from './ImportModal';
import ManualItemModal from './ManualItemModal';
import CategoryModal from './CategoryModal';
import CategoryEditor from './CategoryEditor';
import BulkActionsBar from './BulkActionsBar';

// Individual Item Edit Modal
interface ItemEditModalProps {
  item: DatabaseItem;
  onClose: () => void;
  onSave: (frequency: InventoryFrequency, category: InventoryCategory | string, minLevel: number, initialStock: number, box: boolean) => void;
  onUnassign: () => void;
}

const ItemEditModal: React.FC<ItemEditModalProps> = ({ item, onClose, onSave, onUnassign }) => {
  const { customCategories } = useInventory();
  const [frequency, setFrequency] = useState<InventoryFrequency>(item.assignedTo || 'daily');
  const [category, setCategory] = useState<InventoryCategory | string>(item.assignedCategory || 'produce');
  const [minLevel, setMinLevel] = useState(5);
  const [initialStock, setInitialStock] = useState(0);
  const [box, setBox] = useState(item.box || false);

  // Get all available categories
  const allCategoryOptions = getAllCategoryOptions(customCategories);

  const handleSave = () => {
    onSave(frequency, category, minLevel, initialStock, box);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Edit Item Assignment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">{getCategoryIcon(item.isAssigned && item.assignedCategory ? item.assignedCategory : (item.type || 'supplies'))}</span>
            <div>
              <h4 className="font-medium text-gray-800">{item.name}</h4>
              <p className="text-sm text-gray-600">{item.ean || 'No EAN'} • {item.unit || 'pieces'}</p>
              {item.isAssigned && (
                <p className="text-xs text-blue-600 mt-1">
                  Currently assigned to {item.assignedTo} - {item.assignedCategory}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              {allCategoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox"
                checked={box}
                onChange={(e) => setBox(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Box (allows fractional quantities like 0.5, 1.5, 2.5)</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              When enabled, this item can be counted in fractional quantities (e.g., 0.5 box, 1.5 boxes)
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Level {box ? '(boxes)' : ''}
              </label>
              <input 
                type="number" 
                min="0"
                step={box ? "0.1" : "1"}
                value={minLevel}
                onChange={(e) => setMinLevel(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder={box ? "e.g., 2.5" : "e.g., 5"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Stock {box ? '(boxes)' : ''}
              </label>
              <input 
                type="number" 
                min="0"
                step={box ? "0.1" : "1"}
                value={initialStock}
                onChange={(e) => setInitialStock(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder={box ? "e.g., 10.5" : "e.g., 20"}
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          {item.isAssigned && (
            <button 
              onClick={() => { onUnassign(); onClose(); }}
              className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Unassign
            </button>
          )}
          <button 
            onClick={handleSave}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            {item.isAssigned ? 'Update Assignment' : 'Assign to Inventory'}
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

const DatabaseView: React.FC = () => {
  const { 
    databaseItems, 
    selectedItems, 
    toggleItemSelection, 
    selectMultipleItems,
    clearSelection,
    deleteItems,
    assignToCategory,
    unassignFromCategory,
    cleanupDuplicates,
    customCategories
  } = useInventory();
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [preSelectedFrequency, setPreSelectedFrequency] = useState<string | undefined>(undefined);

  const handleAssignCategory = (frequency?: string) => {
    setPreSelectedFrequency(frequency);
    setShowCategoryModal(true);
  };
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState<DatabaseItem | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  // Get all available categories
  const allCategoryOptions = getAllCategoryOptions(customCategories);

  // Filter items
  const filteredItems = databaseItems.filter(item => {
    const matchesType = filterType === 'all' || 
                       (filterType === 'assigned' && item.isAssigned) ||
                       (filterType === 'unassigned' && !item.isAssigned) ||
                       (filterType === 'uncategorized' && (!item.type || item.type === '')) ||
                       item.type === filterType;
    const matchesSearch = !searchQuery || 
                         item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.ean && item.ean.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  // Reset selection when filter or search changes
  useEffect(() => {
    clearSelection();
    setSelectAll(false);
  }, [filterType, searchQuery, clearSelection]);

  // Update select all state when selection changes
  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectAll(false);
      return;
    }
    
    const allVisibleSelected = filteredItems.every(item => selectedItems.has(item.id));
    const someVisibleSelected = filteredItems.some(item => selectedItems.has(item.id));
    
    // Update select all state based on whether all visible items are selected
    setSelectAll(allVisibleSelected && someVisibleSelected);
  }, [selectedItems, filteredItems]);

  const handleSelectAll = () => {
    if (selectAll) {
      clearSelection();
      setSelectAll(false);
    } else {
      // FIXED: Use bulk selection for better performance
      const filteredItemIds = filteredItems.map(item => item.id);
      clearSelection(); // Clear first to avoid conflicts
      selectMultipleItems(filteredItemIds); // Then select all visible items
      setSelectAll(true);
    }
  };

  // Get appropriate label for "Select All" based on current filter
  const getSelectAllLabel = () => {
    const hasFilter = filterType !== 'all';
    const totalItems = databaseItems.length;
    const visibleItems = filteredItems.length;
    
    if (!hasFilter) {
      return `Select All (${totalItems})`;
    } else {
      return `Select All Visible (${visibleItems} of ${totalItems})`;
    }
  };

  const handleDeleteClick = () => {
    if (selectedItems.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteItems(Array.from(selectedItems));
    setShowDeleteConfirm(false);
    setSelectAll(false); // FIXED: Reset select all state after deletion
  };

  const handleItemClick = (item: DatabaseItem, event: React.MouseEvent) => {
    // Prevent opening edit modal when clicking checkbox
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      return;
    }
    setEditingItem(item);
  };

  const handleItemSave = (frequency: InventoryFrequency, category: InventoryCategory | string, minLevel: number, initialStock: number, box: boolean) => {
    if (editingItem) {
      assignToCategory([editingItem.id], frequency, category, minLevel, initialStock, box);
    }
  };

  const handleItemUnassign = () => {
    if (editingItem) {
      unassignFromCategory(editingItem.id);
    }
  };

  const handleExport = () => {
    if (databaseItems.length === 0) {
      alert('No items in database to export');
      return;
    }
    
    // Create CSV content
    const headers = ['Name', 'EAN', 'Unit', 'Price (excl. tax)', 'Price (incl. tax)', 'Type', 'Assigned To', 'Category'];
    const csvContent = [
      headers.join(','),
      ...databaseItems.map(item => [
        `"${item.name || ''}"`,
        item.ean || '',
        item.unit || '',
        item.cost || 0,
        item.costWithTax || 0,
        item.type || '',
        item.assignedTo || '',
        item.assignedCategory || ''
      ].join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database_items_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Statistics
  const assignedCount = databaseItems.filter(item => item.isAssigned).length;
  const unassignedCount = databaseItems.filter(item => !item.isAssigned).length;

  return (
    <div className="space-y-6">
      {/* Management Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">💾</span>
          Items Database Management
        </h2>
        <p className="text-gray-600 mb-4">Import items from Excel and assign them to inventory categories</p>
        
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{databaseItems.length}</div>
            <div className="text-sm text-blue-600">Total Items</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{assignedCount}</div>
            <div className="text-sm text-green-600">Assigned</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">{unassignedCount}</div>
            <div className="text-sm text-orange-600">Unassigned</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <button 
            onClick={() => setShowImportModal(true)}
            className="bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
          >
            <Upload className="w-5 h-5 mr-2" />
            Import from Excel
          </button>
          <button 
            onClick={() => setShowManualModal(true)}
            className="bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Manual Item
          </button>
          <button 
            onClick={() => setShowCategoryEditor(true)}
            className="bg-indigo-500 text-white px-4 py-3 rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center"
          >
            <Tag className="w-5 h-5 mr-2" />
            Manage Categories
          </button>
          <button 
            onClick={handleExport}
            className="bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center"
          >
            <Download className="w-5 h-5 mr-2" />
            Export Database
          </button>
          <button 
            onClick={cleanupDuplicates}
            className="bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Clean Duplicates
          </button>
        </div>
      </div>

      {/* Database Items */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Database Items</h3>
            <div className="text-sm text-gray-500">
              Click on items to edit individually, or use checkboxes for bulk actions
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={selectAll}
                onChange={handleSelectAll}
                className="rounded"
              />
              <label className="text-sm text-gray-600">{getSelectAllLabel()}</label>
            </div>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Items</option>
              <option value="assigned">✅ Assigned Items</option>
              <option value="unassigned">⏳ Unassigned Items</option>
              {allCategoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              <option value="uncategorized">❓ Uncategorized</option>
            </select>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search database..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-48 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📂</div>
              <h3 className="text-lg font-medium mb-2">No items found</h3>
              <p className="text-sm">
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your search or filter'
                  : 'Import items from Excel or add them manually to get started'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <div 
                  key={item.id}
                  onClick={(e) => handleItemClick(item, e)}
                  className={`cursor-pointer bg-white border rounded-xl p-4 transition-all hover:shadow-md ${
                    selectedItems.has(item.id) 
                      ? 'border-blue-500 bg-blue-50' 
                      : item.isAssigned 
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="mr-3 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-2xl mr-3">{getCategoryIcon(item.isAssigned && item.assignedCategory ? item.assignedCategory : (item.type || 'supplies'))}</span>
                      <div>
                        <h4 className="font-semibold text-gray-800">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.ean || 'No EAN'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {item.isAssigned ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                          ✅ {item.assignedTo}
                        </span>
                      ) : (
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                          ⏳ Unassigned
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Unit:</span> {item.unit || 'pieces'}
                    </div>
                    <div>
                      <span className="font-medium">Cost:</span> €{(item.cost || 0).toFixed(2)}
                    </div>
                  </div>
                  
                  {item.isAssigned && (
                    <div className="mt-2 text-xs text-gray-500">
                      <div>Category: <span className="font-medium capitalize">{item.assignedCategory}</span></div>
                      <div>Assigned: {item.assignedDate}</div>
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Click to {item.isAssigned ? 'edit assignment' : 'assign to inventory'}
                    </div>
                    <Edit3 className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar 
        onAssignCategory={handleAssignCategory}
        onDelete={handleDeleteClick}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-red-100 rounded-lg mr-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Confirm Deletion</h3>
                <p className="text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <span className="font-semibold">{selectedItems.size}</span> selected items? 
              This will permanently remove them from the database and any assigned inventory lists.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} />}
      {showManualModal && <ManualItemModal onClose={() => setShowManualModal(false)} />}
      {showCategoryModal && (
        <CategoryModal 
          onClose={() => {
            setShowCategoryModal(false);
            setPreSelectedFrequency(undefined);
          }}
          preSelectedFrequency={preSelectedFrequency}
        />
      )}
      {showCategoryEditor && (
        <CategoryEditor 
          onClose={() => setShowCategoryEditor(false)}
        />
      )}
      {editingItem && (
        <ItemEditModal 
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleItemSave}
          onUnassign={handleItemUnassign}
        />
      )}
    </div>
  );
};

export default DatabaseView;
