// src/employee-app/inventory/types.ts
export type InventoryFrequency = 'daily' | 'weekly' | 'monthly' | 'database';
export type InventoryCategory = 'produce' | 'meat' | 'dairy' | 'bread' | 'beverages' | 'cooking' | 'baking' | 'grains' | 'cleaning' | 'supplies' | 'packaging' | 'tukku' | 'uncategorized';
export type StockStatus = 'critical' | 'low' | 'normal';
export type WasteReason = 'expired' | 'overcooked' | 'dropped' | 'overordered' | 'customer-return' | 'other';
export type ActivityType = 'count_update' | 'waste' | 'import' | 'manual_add';

export interface InventoryItem {
  id: number | string;
  name: string;
  category: InventoryCategory;
  currentStock: number;
  minLevel: number;
  unit: string;
  lastUsed: string;
  cost: number;
  ean?: string;
  frequency?: InventoryFrequency;
}

export interface DatabaseItem {
  id: number | string;
  name: string;
  ean?: string;
  unit?: string;
  cost?: number;
  costWithTax?: number;
  type?: InventoryCategory | string; // Allow any string for uncategorized items
  frequency: InventoryFrequency;
}

export interface ActivityLogEntry {
  id: number | string;
  type: ActivityType;
  item: string;
  quantity: number;
  unit: string;
  employee: string;
  timestamp: string;
  notes?: string;
  reason?: WasteReason;
}

export interface InventoryTabProps {
  currentUser: any;
  connectionStatus: string;
}

export interface InventoryContextType {
  // Data
  dailyItems: InventoryItem[];
  weeklyItems: InventoryItem[];
  monthlyItems: InventoryItem[];
  databaseItems: DatabaseItem[];
  activityLog: ActivityLogEntry[];
  selectedItems: Set<number | string>;
  
  // UI State
  currentTab: InventoryFrequency | 'reports';
  
  // Actions
  setDailyItems: (items: InventoryItem[]) => void;
  setWeeklyItems: (items: InventoryItem[]) => void;
  setMonthlyItems: (items: InventoryItem[]) => void;
  setDatabaseItems: (items: DatabaseItem[]) => void;
  setActivityLog: (log: ActivityLogEntry[]) => void;
  addActivityEntry: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void;
  updateItemStock: (itemId: number | string, newStock: number, frequency: InventoryFrequency, employee: string, notes?: string) => void;
  reportWaste: (itemId: number | string, amount: number, reason: WasteReason, frequency: InventoryFrequency, employee: string, notes?: string) => void;
  importFromExcel: (data: any[]) => void;
  addManualItem: (item: Omit<DatabaseItem, 'id' | 'frequency'>) => void;
  assignToCategory: (itemIds: (number | string)[], frequency: InventoryFrequency, category: InventoryCategory, minLevel: number, initialStock: number) => void;
  deleteItems: (itemIds: (number | string)[]) => void;
  toggleItemSelection: (itemId: number | string) => void;
  clearSelection: () => void;
  switchTab: (tab: InventoryFrequency | 'reports') => void;
}
