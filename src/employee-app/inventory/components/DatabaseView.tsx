// src/employee-app/inventory/components/DatabaseView.tsx
import React, { useState } from 'react';
import { Upload, Plus, Download, Search, Filter, AlertTriangle } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { getCategoryIcon } from '../utils';
import ImportModal from './ImportModal';
import ManualItemModal from './ManualItemModal';
import CategoryModal from './CategoryModal';
import BulkActionsBar from './BulkActionsBar';

const DatabaseView: React.FC = () => {
  const { 
    databaseItems, 
    selectedItems, 
    toggleItemSelection, 
    clearSelection,
    deleteItems,
    assignToCategory
  } = useInventory();
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  // Filter items
  const filteredItems = databaseItems.filter(item => {
    const matchesType = filterType === 'all' || 
                       (filterType === 'uncategorized' && (!item.type || item.type === '')) ||
                       item.type === filterType;
    const matchesSearch = !searchQuery || 
                         item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.ean && item.ean.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handleSelectAll = () => {
    if (selectAll) {
      clearSelection();
    } else {
      filteredItems.forEach(item => {
        if (!selectedItems.has(item.id)) {
          toggleItemSelection(item.id);
        }
      });
    }
    setSelectAll(!selectAll);
  };

  const handleDeleteClick = () => {
    if (selectedItems.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteItems(Array.from(selectedItems));
    setShowDeleteConfirm(false);
  };

  const handleExport = () => {
    if (databaseItems.length === 0) {
      alert('No items in database to export');
      return;
    }
    
    // Create CSV content
    const headers = ['Name', 'EAN', 'Unit', 'Price (excl. tax)', 'Price (incl. tax)', 'Type'];
    const csvContent = [
      headers.join(','),
      ...databaseItems.map(item => [
        `"${item.name}"`,
        item.ean || '',
        item.unit || '',
        item.cost || 0,
        item.costWithTax || 0,
        item.type || ''
      ].join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database_items_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Management Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">💾</span>
          Items Database Management
        </h2>
        <p className="text-gray-600 mb-4">Import items from Excel and organize them into categories</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            onClick={handleExport}
            className="bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center"
          >
            <Download className="w-5 h-5 mr-2" />
            Export Database
          </button>
        </div>
      </div>

      {/* Database Items */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Database Items</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                <label className="text-sm text-gray-600">Select All</label>
              </div>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Types</option>
                <option value="tukku">🏪 Tukku (Wholesale)</option>
                <option value="beverages">🥤 Beverages</option>
                <option value="packaging">📦 Packaging</option>
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
        </div>
        
        <div className="p-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📂</div>
              <h3 className="text-lg font-medium mb-2">No items in database</h3>
              <p className="text-sm">Import items from Excel or add them manually to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <div 
                  key={item.id}
                  onClick={() => toggleItemSelection(item.id)}
                  className={`cursor-pointer bg-white border rounded-xl p-4 transition-all hover:shadow-md ${
                    selectedItems.has(item.id) ? 'border-blue-500 bg-blue-50 scale-102' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-3 rounded"
                      />
                      <span className="text-2xl mr-3">{getCategoryIcon(item.type || 'supplies')}</span>
                      <div>
                        <h4 className="font-semibold text-gray-800">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.ean || 'No EAN'}</p>
                      </div>
                    </div>
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                      💾 Database
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Unit</div>
                      <div className="text-sm font-medium text-gray-700">{item.unit || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Type</div>
                      <div className="text-sm font-medium text-gray-700 capitalize">{item.type || 'Uncategorized'}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      <div>Price: €{(item.cost || 0).toFixed(2)}</div>
                      <div>With tax: €{(item.costWithTax || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar 
        onAssignCategory={() => setShowCategoryModal(true)}
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
              This will permanently remove them from the database.
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
      {showCategoryModal && <CategoryModal onClose={() => setShowCategoryModal(false)} />}
    </div>
  );
};

export default DatabaseView;
