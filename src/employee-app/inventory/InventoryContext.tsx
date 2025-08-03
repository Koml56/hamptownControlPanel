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

  // Assign items to category - FIXED: Handle existing assignments without duplicating
  const assignToCategory = useCallback((
    itemIds: (number | string)[],
    frequency: InventoryFrequency,
    category: InventoryCategory,
    minLevel: number,
    initialStock: number
  ) => {
    const selectedItemsData = databaseItems.filter(item => itemIds.includes(item.id));
    console.log('Assigning items:', selectedItemsData.length, 'to', frequency, category);
    
    selectedItemsData.forEach(dbItem => {
      // If item is already assigned, we need to handle it differently
      if (dbItem.isAssigned) {
        // Find existing inventory item(s) linked to this database item
        const allFrequencies: InventoryFrequency[] = ['daily', 'weekly', 'monthly'];
        
        allFrequencies.forEach(freq => {
          const items = getItemsByFrequency(freq);
          const existingItems = items.filter(item => item.databaseId === dbItem.id);
          
          if (existingItems.length > 0) {
            if (freq === frequency) {
              // Update existing item in the same frequency
              const updatedItems = items.map(item => 
                item.databaseId === dbItem.id 
                  ? { 
                      ...item, 
                      category: category,
                      minLevel: minLevel,
                      currentStock: initialStock,
                      lastUsed: new Date().toISOString().split('T')[0]
                    }
                  : item
              );
              setItemsByFrequency(freq, updatedItems);
            } else {
              // Remove from different frequency (moving to new frequency)
              const filteredItems = items.filter(item => item.databaseId !== dbItem.id);
              setItemsByFrequency(freq, filteredItems);
            }
          }
        });
        
        // If moving to a different frequency, add to new frequency
        if (dbItem.assignedTo !== frequency) {
          const newInventoryItem: InventoryItem = {
            id: generateId(),
            name: dbItem.name,
            category: category,
            currentStock: initialStock,
            minLevel: minLevel,
            unit: dbItem.unit || 'pieces',
            lastUsed: new Date().toISOString().split('T')[0],
            cost: dbItem.cost || 0,
            ean: dbItem.ean || '',
            databaseId: dbItem.id
          };
          
          const currentItems = getItemsByFrequency(frequency);
          setItemsByFrequency(frequency, [...currentItems, newInventoryItem]);
        }
      } else {
        // Item not assigned yet, create new inventory item
        const newInventoryItem: InventoryItem = {
          id: generateId(),
          name: dbItem.name,
          category: category,
          currentStock: initialStock,
          minLevel: minLevel,
          unit: dbItem.unit || 'pieces',
          lastUsed: new Date().toISOString().split('T')[0],
          cost: dbItem.cost || 0,
          ean: dbItem.ean || '',
          databaseId: dbItem.id
        };
        
        const currentItems = getItemsByFrequency(frequency);
        setItemsByFrequency(frequency, [...currentItems, newInventoryItem]);
      }
    });
    
    // Update database items to show assignment status
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
    
    showToast(`Successfully ${selectedItemsData.some(item => item.isAssigned) ? 'updated' : 'assigned'} ${selectedItemsData.length} items to ${frequency} - ${category}`);
    
    // Add activity log entry
    addActivityEntry({
      type: 'manual_add',
      item: `${selectedItemsData.length} items`,
      quantity: selectedItemsData.length,
      unit: 'items',
      employee: 'Current User',
      notes: `${selectedItemsData.some(item => item.isAssigned) ? 'Updated assignment to' : 'Assigned to'} ${frequency} - ${category}`
    });
  }, [databaseItems, addActivityEntry]);

  // Unassign item from category - brings it back to unassigned status and removes ALL duplicates
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

    // Remove ALL instances from inventory lists (including duplicates)
    ['daily', 'weekly', 'monthly'].forEach(freq => {
      const items = getItemsByFrequency(freq as InventoryFrequency);
      const updatedItems = items.filter(item => item.databaseId !== itemId);
      
      // Only update if there were changes
      if (updatedItems.length !== items.length) {
        setItemsByFrequency(freq as InventoryFrequency, updatedItems);
        console.log(`Removed ${items.length - updatedItems.length} duplicate(s) from ${freq}`);
      }
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

    showToast(`Successfully unassigned ${dbItem.name} from inventory (removed all duplicates)`);
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

  // Clean up duplicate items - removes duplicate assignments based on databaseId
  const cleanupDuplicates = useCallback(() => {
    let totalCleaned = 0;
    
    ['daily', 'weekly', 'monthly'].forEach(freq => {
      const items = getItemsByFrequency(freq as InventoryFrequency);
      const seen = new Set<number | string>();
      const uniqueItems = items.filter(item => {
        if (item.databaseId && seen.has(item.databaseId)) {
          totalCleaned++;
          return false; // Remove duplicate
        }
        if (item.databaseId) {
          seen.add(item.databaseId);
        }
        return true; // Keep unique item
      });
      
      if (uniqueItems.length !== items.length) {
        setItemsByFrequency(freq as InventoryFrequency, uniqueItems);
        console.log(`Cleaned ${items.length - uniqueItems.length} duplicates from ${freq}`);
      }
    });
    
    if (totalCleaned > 0) {
      showToast(`Cleaned up ${totalCleaned} duplicate items from inventory`);
    }
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
    cleanupDuplicates,
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
