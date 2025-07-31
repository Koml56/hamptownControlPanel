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

// Empty initial data - no default items
const initialDailyItems: InventoryItem[] = [];
const initialWeeklyItems: InventoryItem[] = [];
const initialMonthlyItems: InventoryItem[] = [];
const initialActivityLog: ActivityLogEntry[] = [];

export const InventoryProvider: React.FC<InventoryProviderProps> = ({ children }) => {
  // State - All start with empty arrays
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
      frequency: 'database',
      isAssigned: false
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

  // Assign items to category - FIXED: Keep items in database and track assignment
  const assignToCategory = useCallback((
    itemIds: (number | string)[],
    frequency: InventoryFrequency,
    category: InventoryCategory,
    minLevel: number,
    initialStock: number
  ) => {
    const selectedItemsData = databaseItems.filter(item => itemIds.includes(item.id));
    console.log('Assigning items:', selectedItemsData.length, 'to', frequency, category);
    
    // Create inventory items for each selected database item
    const newInventoryItems: InventoryItem[] = selectedItemsData.map(item => ({
      id: generateId(),
      name: item.name,
      category: category,
      currentStock: initialStock,
      minLevel: minLevel,
      unit: item.unit || 'pieces',
      lastUsed: new Date().toISOString().split('T')[0],
      cost: item.cost || 0,
      ean: item.ean || '',
      databaseId: item.id // Link back to database item
    }));

    // Add to the appropriate frequency list
    const currentItems = getItemsByFrequency(frequency);
    setItemsByFrequency(frequency, [...currentItems, ...newInventoryItems]);
    
    // Update database items to show assignment status - DON'T REMOVE THEM
    setDatabaseItems(prev => prev.map(item => 
      itemIds.includes(item.id) 
        ? { 
            ...item, 
            isAssigned: true,
            assignedTo: frequency,
            assignedCategory: category,
            assignedDate: new Date().toISOString().split('T')[0]
          }
        : item
    ));
    
    setSelectedItems(new Set());
    
    showToast(`Successfully assigned ${selectedItemsData.length} items to ${frequency} - ${category}`);
    
    // Add activity log entry
    addActivityEntry({
      type: 'manual_add',
      item: `${selectedItemsData.length} items`,
      quantity: selectedItemsData.length,
      unit: 'items',
      employee: 'Current User',
      notes: `Assigned to ${frequency} - ${category}`
    });
  }, [databaseItems, addActivityEntry]);

  // Unassign item from category - brings it back to unassigned status
  const unassignFromCategory = useCallback((itemId: number | string) => {
    // Find the database item
    const dbItem = databaseItems.find(item => item.id === itemId);
    if (!dbItem) {
      showToast('Database item not found!');
      return;
    }

    if (!dbItem.isAssigned) {
      showToast('Item is not currently assigned!');
      return;
    }

    // Remove from inventory lists
    ['daily', 'weekly', 'monthly'].forEach(freq => {
      const items = getItemsByFrequency(freq as InventoryFrequency);
      const updatedItems = items.filter(item => item.databaseId !== itemId);
      setItemsByFrequency(freq as InventoryFrequency, updatedItems);
    });

    // Update database item to show unassigned status
    setDatabaseItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            isAssigned: false,
            assignedTo: undefined,
            assignedCategory: undefined,
            assignedDate: undefined
          }
        : item
    ));

    showToast(`Successfully unassigned ${dbItem.name} from inventory`);
  }, [databaseItems]);

  // Delete items from database
  const deleteItems = useCallback((itemIds: (number | string)[]) => {
    if (itemIds.length === 0) return;
    
    // Also remove from inventory lists if assigned
    itemIds.forEach(itemId => {
      ['daily', 'weekly', 'monthly'].forEach(freq => {
        const items = getItemsByFrequency(freq as InventoryFrequency);
        const updatedItems = items.filter(item => item.databaseId !== itemId);
        setItemsByFrequency(freq as InventoryFrequency, updatedItems);
      });
    });
    
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
    unassignFromCategory,
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
