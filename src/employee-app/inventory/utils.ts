// src/employee-app/inventory/utils.ts
import { InventoryItem, InventoryCategory, StockStatus } from './types';

export const getCategoryIcon = (category: InventoryCategory | string): string => {
  const icons: Record<string, string> = {
    produce: "🥬",
    meat: "🥩", 
    dairy: "🥛",
    bread: "🍞",
    beverages: "🥤",
    cooking: "🛢️",
    baking: "🌾",
    grains: "🌾",
    cleaning: "🧽",
    supplies: "📦",
    packaging: "📦",
    tukku: "🏪",
    uncategorized: "❓"
  };
  return icons[category] || "📦";
};

export const getStockStatus = (item: InventoryItem): StockStatus => {
  if (item.currentStock === 0) return 'critical';
  if (item.currentStock <= item.minLevel) return 'low';
  return 'normal';
};

export const getStatusBadge = (status: StockStatus): string => {
  switch (status) {
    case 'normal':
      return '<span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">✅ Good Stock</span>';
    case 'low':
      return '<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">⚠️ Low Stock</span>';
    case 'critical':
      return '<span class="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium animate-pulse">🚨 Critical</span>';
    default:
      return '<span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">Unknown</span>';
  }
};

export const getFrequencyBadge = (frequency: string): string => {
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
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast bg-white/90 backdrop-blur-sm text-black p-3 mb-2 rounded-lg shadow-lg border';
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('opacity-0');
    toast.addEventListener('transitionend', () => {
      toast.remove();
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

export const parseExcelData = (json: any[][]): any[] => {
  if (json.length < 2) {
    throw new Error('File appears to be empty or invalid');
  }
  
  const header = json[0];
  const nameIdx = header.findIndex((h: any) => h && (h.toString().toLowerCase().includes('tuotenimi') || h.toString().toLowerCase().includes('catentdesc.name') || h.toString().toLowerCase().includes('name')));
  const eanIdx = header.findIndex((h: any) => h && h.toString().toLowerCase().includes('ean'));
  let unitIdx = header.findIndex((h: any) => h && h.toString().trim().toLowerCase() === 'pmy');
  
  if (unitIdx === -1) {
    unitIdx = header.findIndex((h: any) => h && h.toString().trim().toLowerCase() === 'baseunit_size');
  }
  
  const priceIdx = header.findIndex((h: any) => h && (h.toString().toLowerCase().includes('hinta veroton') || h.toString().toLowerCase().includes('price')));
  const priceTaxIdx = header.findIndex((h: any) => h && (h.toString().toLowerCase().includes('hinta verollinen') || h.toString().toLowerCase().includes('pricetax')));
  
  if (nameIdx === -1) {
    throw new Error('Could not find product name column');
  }
  
  const newItems = json.slice(1)
    .filter(row => row[nameIdx])
    .map((row, i) => ({
      id: generateId() + i,
      name: row[nameIdx] || '',
      ean: row[eanIdx] || '',
      unit: row[unitIdx] || '',
      cost: parseFloat(row[priceIdx]) || 0,
      costWithTax: parseFloat(row[priceTaxIdx]) || 0,
      type: '', // Will be categorized later
      frequency: 'database' as const
    }));
  
  return newItems;
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
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
