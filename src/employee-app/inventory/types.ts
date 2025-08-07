// src/employee-app/inventory/types.ts
// Import inventory types from main types.ts for Firebase integration
import type {
  InventoryFrequency,
  InventoryCategory,
  InventoryItem,
  DatabaseItem,
  ActivityLogEntry,
  WasteReason,
  CustomCategory,
  Employee,
  CurrentUser
} from '../types';

export interface InventoryTabProps {
  currentUser: CurrentUser;
  connectionStatus: string;
  employees: Employee[];
  // Firebase props
  inventoryDailyItems: InventoryItem[];
  inventoryWeeklyItems: InventoryItem[];
  inventoryMonthlyItems: InventoryItem[];
  inventoryDatabaseItems: DatabaseItem[];
  inventoryActivityLog: ActivityLogEntry[];
  inventoryCustomCategories: CustomCategory[];
  setInventoryDailyItems: (items: InventoryItem[]) => void;
  setInventoryWeeklyItems: (items: InventoryItem[]) => void;
  setInventoryMonthlyItems: (items: InventoryItem[]) => void;
  setInventoryDatabaseItems: (items: DatabaseItem[]) => void;
  setInventoryActivityLog: (log: ActivityLogEntry[]) => void;
  setInventoryCustomCategories: (categories: CustomCategory[]) => void;
  quickSave: (field: string, data: any) => Promise<boolean>;
}

export interface InventoryContextType {
  // Data
  dailyItems: InventoryItem[];
  weeklyItems: InventoryItem[];
  monthlyItems: InventoryItem[];
  databaseItems: DatabaseItem[];
  activityLog: ActivityLogEntry[];
  customCategories: CustomCategory[];
  employees: Employee[];
  currentUser: CurrentUser;
  selectedItems: Set<number | string>;
  
  // UI State
  currentTab: InventoryFrequency | 'reports';
  
  // Actions
  setDailyItems: (items: InventoryItem[]) => void;
  setWeeklyItems: (items: InventoryItem[]) => void;
  setMonthlyItems: (items: InventoryItem[]) => void;
  setDatabaseItems: (items: DatabaseItem[]) => void;
  setActivityLog: (log: ActivityLogEntry[]) => void;
  setCustomCategories: (categories: CustomCategory[]) => void;
  addActivityEntry: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void;
  updateItemStock: (itemId: number | string, newStock: number, frequency: InventoryFrequency, employee: string, notes?: string, deliveries?: number) => void;
  reportWaste: (itemId: number | string, amount: number, reason: WasteReason, frequency: InventoryFrequency, employee: string, notes?: string) => void;
  importFromExcel: (data: any[]) => void;
  addManualItem: (item: Omit<DatabaseItem, 'id' | 'frequency'>) => void;
  assignToCategory: (itemIds: (number | string)[], frequency: InventoryFrequency, category: InventoryCategory | string, minLevel: number, initialStock: number) => void;
  unassignFromCategory: (itemId: number | string) => void;
  cleanupDuplicates: () => void;
  deleteItems: (itemIds: (number | string)[]) => void;
  toggleItemSelection: (itemId: number | string) => void;
  selectMultipleItems: (itemIds: (number | string)[]) => void;
  clearSelection: () => void;
  switchTab: (tab: InventoryFrequency | 'reports') => void;
  // Custom Category Management
  addCustomCategory: (category: Omit<CustomCategory, 'id' | 'createdAt' | 'isDefault'>) => void;
  updateCustomCategory: (id: string, category: CustomCategory) => void;
  deleteCustomCategory: (id: string) => void;
  // Firebase integration
  quickSave: (field: string, data: any) => Promise<boolean>;
}
