// src/employee-app/inventory/InventoryContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  InventoryItem, 
  DatabaseItem, 
  ActivityLogEntry, 
  InventoryFrequency, 
  InventoryCategory, 
  WasteReason, 
  ActivityType,
  InventoryContextType 
} from './types';
import { generateId, showToast } from './utils';

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

interface InventoryProviderProps {
  children: React.ReactNode;
}

// Sample initial data
const initialDailyItems: InventoryItem[] = [
  { id: 1, name: "Fresh Lettuce", category: "produce", currentStock: 12, minLevel: 8, unit: "heads", lastUsed: "2024-07-28", cost: 2.50 },
  { id: 2, name: "Ground Beef", category: "meat", currentStock: 8, minLevel: 15, unit: "lbs", lastUsed: "2024-07-28", cost: 6.99 },
  { id: 3, name: "Milk", category: "dairy", currentStock: 4, minLevel: 6, unit: "gallons", lastUsed: "2024-07-28", cost: 4.25 },
  { id: 4, name: "Bread Rolls", category: "bread", currentStock: 2, minLevel: 5, unit: "dozens", lastUsed: "2024-07-28", cost: 3.50 },
  { id: 5, name: "Coca Cola", category: "beverages", currentStock: 15, minLevel: 10, unit: "cases", lastUsed: "2024-07-28", cost: 12.99 }
];

const initialWeeklyItems: InventoryItem[] = [
  { id: 9, name: "Olive Oil", category: "cooking", currentStock: 8, minLevel: 4, unit: "bottles", lastUsed: "2024-07-25", cost: 12.99 },
  { id: 10, name: "Flour", category: "baking", currentStock: 25, minLevel: 10, unit: "lbs", lastUsed: "2024-07-26", cost: 8.50 },
  { id: 11, name: "Rice", category: "grains", currentStock: 45, minLevel: 20, unit: "lbs", lastUsed: "2024-07-24", cost: 15.99 }
];

const initialMonthlyItems: InventoryItem[] = [
  { id: 14, name: "Dish Soap", category: "cleaning", currentStock: 8, minLevel: 3, unit: "bottles", lastUsed: "2024-07-01", cost: 4.99 },
  { id: 15, name: "Paper Towels", category: "supplies", currentStock: 24, minLevel: 12, unit: "rolls", lastUsed: "2024-07-01", cost: 2.25 }
];

const initialActivityLog: ActivityLogEntry[] = [
  { id: 1, type: "count_update", item: "Ground Beef", quantity: 8, unit: "lbs", employee: "John Smith", timestamp: "2024-07-28 11:30", notes: "End of day count" },
  { id: 2, type: "waste", item: "Lettuce", quantity: 2, unit: "heads", employee: "Sarah Johnson", timestamp: "2024-07-28 10:15", notes: "Wilted overnight", reason: "expired" }
];

export const InventoryProvider: React.FC<InventoryProviderProps> = ({ children }) => {
  // State
  const [dailyItems, setDailyItems] = useState<InventoryItem[]>(initialDailyItems);
  const [weeklyItems, setWeeklyItems] = useState<InventoryItem[]>(initialWeeklyItems);
  const [monthlyItems, setMonthlyItems] = useState<InventoryItem[]>(initialMonthlyItems);
  const [databaseItems, setDatabaseItems] = useState<DatabaseItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(initialActivityLog);
  const [selectedItems, setSelectedItems] = useState<Set<number | string>>(new Set());
  const [currentTab, setCurrentTab] = useState<InventoryFrequency | 'reports'>('daily');

  // Helper function to get items by frequency
  const getItemsByFrequency = (frequency: InventoryFrequency): InventoryItem[] => {
    switch (frequency) {
      case 'daily': return dailyItems;
      case 'weekly': return weeklyItems;
      case 'monthly': return monthlyItems;
      default: return [];
    }
  };

  // Helper function to set items by frequency
  const setItemsByFrequency = (frequency: InventoryFrequency, items: InventoryItem[]): void => {
    switch (frequency) {
      case 'daily': setDailyItems(items); break;
      case 'weekly': setWeeklyItems(items); break;
      case 'monthly': setMonthlyItems(items); break;
    }
  };

  // Add activity entry
  const addActivityEntry = useCallback((entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: ActivityLogEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date().toLocaleString()
    };
    setActivityLog(prev => [newEntry, ...prev]);
  }, []);

  // Update item stock
  const updateItemStock = useCallback((
    itemId: number | string, 
    newStock: number, 
    frequency: InventoryFrequency, 
    employee: string, 
    notes?: string
  ) => {
    const items = getItemsByFrequency(frequency);
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
      showToast('Item not found!');
      return;
    }

    const oldStock = item.currentStock;
    const updatedItems = items.map(i => 
      i.id === itemId 
        ? { ...i, currentStock: newStock, lastUsed: new Date().toISOString().split('T')[0] }
        : i
    );

    setItemsByFrequency(frequency, updatedItems);
    
    addActivityEntry({
      type: 'count_update',
      item: item.name,
      quantity: newStock,
      unit: item.unit,
      employee,
      notes: notes || `Count updated from ${oldStock} to ${newStock}`
    });

    showToast(`Successfully updated ${item.name} count to ${newStock} ${item.unit}!`);
  }, [addActivityEntry]);

  // Report waste
  const reportWaste = useCallback((
    itemId: number | string,
    amount: number,
    reason: WasteReason,
    frequency: InventoryFrequency,
    employee: string,
    notes?: string
  ) => {
    const items = getItemsByFrequency(frequency);
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
      showToast('Item not found!');
      return;
    }

    if (amount > item.currentStock) {
      showToast('Waste amount cannot exceed current stock!');
      return;
    }

    const updatedItems = items.map(i => 
      i.id === itemId 
        ? { ...i, currentStock: i.currentStock - amount }
        : i
    );

    setItemsByFrequency(frequency, updatedItems);
    
    addActivityEntry({
      type: 'waste',
      item: item.name,
      quantity: amount,
      unit: item.unit,
      employee,
      notes: notes || `Waste reported: ${reason}`,
      reason
    });

    showToast(`Successfully reported waste of ${amount} ${item.unit} ${item.name}!`);
  }, [addActivityEntry]);

  // Import from Excel
  const importFromExcel = useCallback((data: any[]) => {
    setDatabaseItems(prev => [...prev, ...data]);
    showToast(`Imported ${data.length} items to database`);
    
    addActivityEntry({
      type: 'import',
      item: 'Excel Import',
      quantity: data.length,
      unit: 'items',
      employee: 'System'
    });
  }, [addActivityEntry]);

  // Add manual item
  const addManualItem = useCallback((item: Omit<DatabaseItem, 'id' | 'frequency'>) => {
    const newItem: DatabaseItem = {
      ...item,
      id: generateId(),
      frequency: 'database'
    };
    
    setDatabaseItems(prev => [...prev, newItem]);
    showToast('Item added to database successfully');
    
    addActivityEntry({
      type: 'manual_add',
      item: item.name,
      quantity: 1,
      unit: 'item',
      employee: 'Current User'
    });
  }, [addActivityEntry]);

  // Assign items to category
  const assignToCategory = useCallback((
    itemIds: (number | string)[],
    frequency: InventoryFrequency,
    category: InventoryCategory,
    minLevel: number,
    initialStock: number
  ) => {
    const selectedItemsData = databaseItems.filter(item => itemIds.includes(item.id));
    
    selectedItemsData.forEach(item => {
      const newItem: InventoryItem = {
        id: generateId(),
        name: item.name,
        category: category,
        currentStock: initialStock,
        minLevel: minLevel,
        unit: item.unit || 'pieces',
        lastUsed: new Date().toISOString().split('T')[0],
        cost: item.cost || 0,
        ean: item.ean || ''
      };
      
      const items = getItemsByFrequency(frequency);
      setItemsByFrequency(frequency, [...items, newItem]);
    });
    
    // Remove from database
    setDatabaseItems(prev => prev.filter(item => !itemIds.includes(item.id)));
    setSelectedItems(new Set());
    
    showToast(`Assigned ${selectedItemsData.length} items to ${frequency} category`);
  }, [databaseItems]);

  // Delete items
  const deleteItems = useCallback((itemIds: (number | string)[]) => {
    if (itemIds.length === 0) return;
    
    setDatabaseItems(prev => prev.filter(item => !itemIds.includes(item.id)));
    setSelectedItems(new Set());
    showToast(`Deleted ${itemIds.length} items from database`);
  }, []);

  // Toggle item selection
  const toggleItemSelection = useCallback((itemId: number | string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Switch tab
  const switchTab = useCallback((tab: InventoryFrequency | 'reports') => {
    setCurrentTab(tab);
    setSelectedItems(new Set()); // Clear selections when switching tabs
  }, []);

  const value: InventoryContextType = {
    // Data
    dailyItems,
    weeklyItems,
    monthlyItems,
    databaseItems,
    activityLog,
    selectedItems,
    
    // UI State
    currentTab,
    
    // Actions
    setDailyItems,
    setWeeklyItems,
    setMonthlyItems,
    setDatabaseItems,
    setActivityLog,
    addActivityEntry,
    updateItemStock,
    reportWaste,
    importFromExcel,
    addManualItem,
    assignToCategory,
    deleteItems,
    toggleItemSelection,
    clearSelection,
    switchTab
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
