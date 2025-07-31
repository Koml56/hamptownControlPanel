// src/employee-app/inventory/utils.ts
import type { InventoryCategory, StockStatus, InventoryFrequency } from './types';

export const getCategoryIcon = (category: InventoryCategory | string | undefined): string => {
  if (!category) return '❓';
  
  // Handle known categories
  switch (category as InventoryCategory) {
    case 'produce': return '🥬';
    case 'meat': return '🥩';
    case 'dairy': return '🥛';
    case 'bread': return '🍞';
    case 'beverages': return '🥤';
    case 'cooking': return '🫒';
    case 'baking': return '🌾';
    case 'grains': return '🌾';
    case 'cleaning': return '🧽';
    case 'supplies': return '📦';
    case 'packaging': return '📦';
    case 'tukku': return '🏪';
    case 'uncategorized': return '❓';
    default: 
      // Handle unknown string categories
      return '📋';
  }
};

export const getCategoryColor = (category: InventoryCategory | string | undefined): string => {
  if (!category) return 'gray';
  
  // Handle known categories
  switch (category as InventoryCategory) {
    case 'produce': return 'green';
    case 'meat': return 'red';
    case 'dairy': return 'blue';
    case 'bread': return 'yellow';
    case 'beverages': return 'purple';
    case 'cooking': return 'orange';
    case 'baking': return 'amber';
    case 'grains': return 'yellow';
    case 'cleaning': return 'gray';
    case 'supplies': return 'gray';
    case 'packaging': return 'gray';
    case 'tukku': return 'indigo';
    case 'uncategorized': return 'gray';
    default: 
      // Handle unknown string categories
      return 'slate';
  }
};

export const getStockStatus = (currentStock: number, minLevel: number): { status: StockStatus; color: string } => {
  if (currentStock === 0) {
    return { status: 'critical', color: 'red' };
  } else if (currentStock <= minLevel * 0.5) {
    return { status: 'critical', color: 'red' };
  } else if (currentStock <= minLevel) {
    return { status: 'low', color: 'yellow' };
  }
  return { status: 'normal', color: 'green' };
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

export const generateId = (): number => {
  return Date.now() + Math.floor(Math.random() * 1000);
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
  const validTypes = [
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/csv' // .csv
  ];
  
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
