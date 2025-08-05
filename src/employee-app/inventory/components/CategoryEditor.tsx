// src/employee-app/inventory/components/CategoryEditor.tsx
import React, { useState } from 'react';
import { X, Plus, Edit3, Trash2, Tag, Palette } from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { CustomCategory } from '../../types';
import { defaultCategories } from '../utils';

interface CategoryEditorProps {
  onClose: () => void;
}

const CategoryEditor: React.FC<CategoryEditorProps> = ({ onClose }) => {
  const { customCategories, addCustomCategory, updateCustomCategory, deleteCustomCategory } = useInventory();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '📦',
    color: '#3B82F6'
  });

  // Default categories for reference
  // const defaultCategories = [...]; // Now imported from utils

  const commonIcons = ['📦', '🥬', '🥩', '🥛', '🍞', '🥤', '🧽', '🍽️', '🔧', '🎨', '🏷️', '⭐', '🎯', '💡'];
  const commonColors = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#F97316', '#6B7280', '#EC4899', '#14B8A6', '#84CC16'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCategory) {
      if (editingCategory.id.startsWith('default_')) {
        // For default categories, create a custom override
        addCustomCategory({
          name: formData.name.trim(),
          icon: formData.icon,
          color: formData.color
        });
      } else {
        // For custom categories, update normally
        updateCustomCategory(editingCategory.id, {
          ...editingCategory,
          name: formData.name.trim(),
          icon: formData.icon,
          color: formData.color
        });
      }
    } else {
      addCustomCategory({
        name: formData.name.trim(),
        icon: formData.icon,
        color: formData.color
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', icon: '📦', color: '#3B82F6' });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category: CustomCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      color: category.color
    });
    setShowForm(true);
  };

  const handleDelete = (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      deleteCustomCategory(categoryId);
    }
  };

  const handleEditDefault = (category: typeof defaultCategories[0]) => {
    // Convert default category to custom category format for editing
    setEditingCategory({
      id: `default_${category.id}`,
      name: category.name,
      icon: category.icon,
      color: category.color,
      createdAt: new Date().toISOString(),
      isDefault: true
    });
    setFormData({
      name: category.name,
      icon: category.icon,
      color: category.color
    });
    setShowForm(true);
  };

  const handleDeleteDefault = (category: typeof defaultCategories[0]) => {
    if (window.confirm(`Are you sure you want to remove the "${category.name}" category? This will create a custom override.`)) {
      // Create a custom category marked as deleted/hidden
      addCustomCategory({
        name: `REMOVED_${category.name}`,
        icon: '❌',
        color: '#EF4444'
      });
      alert('Default category marked as removed. You can restore it by editing the custom categories.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center">
            <Tag className="w-6 h-6 mr-2 text-blue-600" />
            Category Editor
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Default Categories Section */}
        <div className="mb-6">
          <h4 className="text-lg font-medium text-gray-700 mb-3">Default Categories</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {defaultCategories.map(category => (
              <div key={category.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative group">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{category.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{category.name}</div>
                    <div className="text-xs text-gray-500">Built-in</div>
                  </div>
                </div>
                <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                  <button
                    onClick={() => handleEditDefault(category)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Edit category"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDefault(category)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Remove category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Categories Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-medium text-gray-700">Custom Categories</h4>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Category
            </button>
          </div>

          {customCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              <Tag className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">No custom categories yet</p>
              <p className="text-sm">Create your first custom category to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {customCategories.map(category => (
                <div key={category.id} className="bg-white p-3 rounded-lg border-2 border-gray-200 relative group">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-3">{category.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{category.name}</div>
                      <div className="text-xs text-gray-500">Custom</div>
                    </div>
                  </div>
                  <div 
                    className="w-full h-2 rounded-full mb-2" 
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Edit category"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h5 className="font-medium text-blue-800 mb-3">
              {editingCategory 
                ? editingCategory.id.startsWith('default_')
                  ? 'Create Custom Override'
                  : 'Edit Category'
                : 'Add New Category'}
            </h5>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter category name..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-20 text-center text-lg"
                  />
                  <span className="text-sm text-gray-500">Or choose from common icons:</span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {commonIcons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`p-2 text-xl border rounded-lg hover:bg-gray-100 ${
                        formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 flex-1"
                    placeholder="#3B82F6"
                  />
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {commonColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-full h-8 rounded-lg border-2 ${
                        formData.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {editingCategory 
                    ? editingCategory.id.startsWith('default_')
                      ? 'Create Override'
                      : 'Update Category'
                    : 'Add Category'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryEditor;