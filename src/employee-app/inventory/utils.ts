// src/employee-app/inventory/utils.ts
import type { InventoryCategory, InventoryFrequency, CustomCategory } from '../types';

export const getCategoryIcon = (category: InventoryCategory | string | undefined, customCategories?: CustomCategory[]): string => {
  if (!category) return '❓';
  
  // First check if it's a custom category
  if (customCategories) {
    const customCategory = customCategories.find(cat => cat.name === category || cat.id === category);
    if (customCategory) {
      return customCategory.icon;
    }
  }
  
  // Handle known categories
  switch (category as InventoryCategory) {
    case 'meat': return '🥩';
    case 'dairy': return '🥛';
    case 'uncategorized': return '❓';
    default: 
      // Handle unknown string categories
      return '📋';
  }
};

export const getCategoryColor = (category: InventoryCategory | string | undefined, customCategories?: CustomCategory[]): string => {
  if (!category) return 'gray';
  
  // First check if it's a custom category
  if (customCategories) {
    const customCategory = customCategories.find(cat => cat.name === category || cat.id === category);
    if (customCategory) {
      return customCategory.color;
    }
  }
  
  // Handle known categories
  switch (category as InventoryCategory) {
    case 'meat': return 'red';
    case 'dairy': return 'blue';
    case 'uncategorized': return 'gray';
    default: 
      // Handle unknown string categories
      return 'slate';
  }
};

export const getStockStatus = (currentStock: number, minimumLevel: number): { status: 'out' | 'critical' | 'low' | 'ok'; color: string } => {
  if (minimumLevel === 0) return { status: 'ok', color: 'gray' };
  
  const percentage = (currentStock / minimumLevel) * 100;
  
  if (currentStock === 0) return { status: 'out', color: 'red' };           // 0% - RED - Out of stock
  if (percentage <= 20) return { status: 'critical', color: 'orange' };    // ≤20% - ORANGE - Critical  
  if (percentage <= 50) return { status: 'low', color: 'yellow' };         // ≤50% - YELLOW - Low
  return { status: 'ok', color: 'green' };                                 // >50% - GREEN - OK
};

export const getFrequencyBadge = (frequency: InventoryFrequency): string => {
  switch (frequency) {
    case 'daily':
      return '<span class="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">🔥 Daily</span>';
    case 'weekly':
      return '<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">📅 Weekly</span>';
    case 'monthly':
      return '<span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">📦 Monthly</span>';
    default:
      return '<span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">💾 Database</span>';
  }
};

export const showToast = (message: string): void => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return;
  
  const container = document.getElementById('toastContainer');
  if (!container) {
    // If no toast container exists, create one
    const newContainer = document.createElement('div');
    newContainer.id = 'toastContainer';
    newContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
    document.body.appendChild(newContainer);
  }
  
  const toastContainer = document.getElementById('toastContainer')!;
  const toast = document.createElement('div');
  toast.className = 'toast bg-white/90 backdrop-blur-sm text-black p-3 mb-2 rounded-lg shadow-lg border transform transition-all duration-300 translate-x-0 opacity-100';
  toast.textContent = message;
  
  toastContainer.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('animate-slide-in');
  });
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-full');
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode) {
        toast.remove();
      }
    });
  }, 3000);
};

export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

export const formatTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleString();
};

// Counter to ensure unique IDs even when called in rapid succession
let idCounter = 0;

export const generateId = (): number => {
  // Reset counter if it gets too large to prevent overflow
  if (idCounter >= 100000) {
    idCounter = 0;
  }
  
  // Use timestamp (in seconds) and counter for better uniqueness without overflow
  const timestamp = Math.floor(Date.now() / 1000); // Use seconds instead of milliseconds
  const counter = ++idCounter;
  
  // Combine timestamp and counter: timestamp * 100000 + counter
  // This ensures unique IDs as long as counter doesn't exceed 100000
  return timestamp * 100000 + counter;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

export const exportToCSV = (data: any[], filename: string): void => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }
  
  // Create CSV content
  const headers = ['Name', 'EAN', 'Unit', 'Price (excl. tax)', 'Price (incl. tax)', 'Type'];
  const csvContent = [
    headers.join(','),
    ...data.map(item => [
      `"${item.name || ''}"`,
      item.ean || '',
      item.unit || '',
      item.cost || 0,
      item.costWithTax || 0,
      item.type || ''
    ].join(','))
  ].join('\n');
  
  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const validateExcelFile = (file: File): { valid: boolean; error?: string } => {
  const validExtensions = ['.xls', '.xlsx', '.csv'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!validExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `Invalid file type. Please use .xls, .xlsx, or .csv files.`
    };
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    return {
      valid: false,
      error: 'File size too large. Please use files smaller than 10MB.'
    };
  }
  
  return { valid: true };
};

// Default categories configuration
export const defaultCategories = [
  { id: 'meat', name: 'Meat & Fish', icon: '🥩', color: '#EF4444' },
  { id: 'dairy', name: 'Dairy', icon: '🥛', color: '#3B82F6' }
];

export interface CategoryOption {
  value: string;
  label: string;
  icon: string;
  isCustom?: boolean;
}

// Get all available categories for select dropdowns
export const getAllCategoryOptions = (customCategories: CustomCategory[] = []): CategoryOption[] => {
  const defaultOptions: CategoryOption[] = defaultCategories.map(cat => ({
    value: cat.id,
    label: `${cat.icon} ${cat.name}`,
    icon: cat.icon,
    isCustom: false
  }));
  
  const customOptions: CategoryOption[] = customCategories.map(cat => ({
    value: cat.id,
    label: `${cat.icon} ${cat.name}`,
    icon: cat.icon,
    isCustom: true
  }));
  
  return [...defaultOptions, ...customOptions];
};

// Get category display name with icon
export const getCategoryDisplayName = (categoryValue: string, customCategories: CustomCategory[] = []): string => {
  // Check custom categories first
  const customCategory = customCategories.find(cat => cat.id === categoryValue);
  if (customCategory) {
    return `${customCategory.icon} ${customCategory.name}`;
  }
  
  // Check default categories
  const defaultCategory = defaultCategories.find(cat => cat.id === categoryValue);
  if (defaultCategory) {
    return `${defaultCategory.icon} ${defaultCategory.name}`;
  }
  
  // Fallback for unknown categories
  return categoryValue;
};
