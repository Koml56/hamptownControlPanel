// src/employee-app/inventory/InventoryContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  InventoryItem, 
  DatabaseItem, 
  ActivityLogEntry, 
  InventoryFrequency, 
  InventoryCategory, 
  WasteReason,
  CustomCategory
} from '../types'; // Import from main types.ts
import { InventoryContextType } from './types'; // Local context type
import { generateId, showToast } from './utils';
import { sendInventoryNotification } from './notificationService';

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

export const InventoryProvider: React.FC<InventoryProviderProps> = ({ 
  children,
  inventoryDailyItems,
  inventoryWeeklyItems,
  inventoryMonthlyItems,
  inventoryDatabaseItems,
  inventoryActivityLog,
  inventoryCustomCategories,
  setInventoryDailyItems,
  setInventoryWeeklyItems,
  setInventoryMonthlyItems,
  setInventoryDatabaseItems,
  setInventoryActivityLog,
  setInventoryCustomCategories,
  quickSave
}) => {
  // Use Firebase state instead of local state
  const dailyItems = inventoryDailyItems;
  const weeklyItems = inventoryWeeklyItems;
  const monthlyItems = inventoryMonthlyItems;
  const databaseItems = inventoryDatabaseItems;
  const activityLog = inventoryActivityLog;
  const customCategories = inventoryCustomCategories;
  
  // UI-only state (not synced to Firebase)
  const [selectedItems, setSelectedItems] = useState<Set<number | string>>(new Set());
  const [currentTab, setCurrentTab] = useState<InventoryFrequency | 'reports'>('daily');

  // Helper function to get items by frequency
  const getItemsByFrequency = useCallback((frequency: InventoryFrequency): InventoryItem[] => {
    switch (frequency) {
      case 'daily': return dailyItems;
      case 'weekly': return weeklyItems;
      case 'monthly': return monthlyItems;
      default: return [];
    }
  }, [dailyItems, weeklyItems, monthlyItems]);

  // Helper function to set items by frequency with Firebase sync
  const setItemsByFrequency = useCallback((frequency: InventoryFrequency, items: InventoryItem[]): void => {
    switch (frequency) {
      case 'daily': 
        setInventoryDailyItems(items);
        quickSave('inventoryDailyItems', items);
        break;
      case 'weekly': 
        setInventoryWeeklyItems(items);
        quickSave('inventoryWeeklyItems', items);
        break;
      case 'monthly': 
        setInventoryMonthlyItems(items);
        quickSave('inventoryMonthlyItems', items);
        break;
    }
  }, [setInventoryDailyItems, setInventoryWeeklyItems, setInventoryMonthlyItems, quickSave]);

  // Add activity entry with Firebase sync
  const addActivityEntry = useCallback((entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: ActivityLogEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date().toLocaleString()
    };
    const updatedLog = [newEntry, ...activityLog];
    setInventoryActivityLog(updatedLog);
    quickSave('inventoryActivityLog', updatedLog);
  }, [activityLog, setInventoryActivityLog, quickSave]);

  // Update item stock
  const updateItemStock = useCallback((
    itemId: number | string, 
    newStock: number, 
    frequency: InventoryFrequency, 
    employee: string, 
    notes?: string,
    deliveries?: number
  ) => {
    const items = getItemsByFrequency(frequency);
    // Handle both string and number IDs by comparing their string representations
    const item = items.find(i => i.id.toString() === itemId.toString());
    
    if (!item) {
      showToast('Item not found!');
      return;
    }

    const oldStock = item.currentStock;
    
    // Use our new stock update function with consumption tracking
    const { updatedItem } = require('./stockUtils').handleStockUpdate(
      item, 
      newStock, 
      deliveries || 0
    );
    
    const updatedItems = items.map(i => 
      i.id.toString() === itemId.toString() ? updatedItem : i
    );

    setItemsByFrequency(frequency, updatedItems);
    
    // Send notification if stock levels warrant it
    sendInventoryNotification(updatedItem, oldStock);
    
    addActivityEntry({
      type: 'count_update',
      item: item.name,
      quantity: newStock,
      unit: item.unit,
      employee,
      notes: notes || `Count updated from ${oldStock} to ${newStock}${deliveries ? ` (${deliveries} delivered)` : ''}`
    });

    // Calculate consumption for the toast message
    const consumed = Math.max(0, oldStock - newStock + (deliveries || 0));
    const consumptionText = consumed > 0 ? ` (${consumed} consumed)` : '';
    
    showToast(`Successfully updated ${item.name} count to ${newStock} ${item.unit}!${consumptionText}`);
  }, [addActivityEntry, getItemsByFrequency, setItemsByFrequency]);

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
    // Handle both string and number IDs by comparing their string representations
    const item = items.find(i => i.id.toString() === itemId.toString());
    
    if (!item) {
      showToast('Item not found!');
      return;
    }

    if (amount > item.currentStock) {
      showToast('Waste amount cannot exceed current stock!');
      return;
    }

    const oldStock = item.currentStock;
    const newStock = item.currentStock - amount;

    const updatedItems = items.map(i => 
      i.id.toString() === itemId.toString()
        ? { ...i, currentStock: newStock }
        : i
    );

    setItemsByFrequency(frequency, updatedItems);
    
    // Send notification if waste caused stock levels to drop to critical levels
    const updatedItem = { ...item, currentStock: newStock };
    sendInventoryNotification(updatedItem, oldStock);
    
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
  }, [addActivityEntry, getItemsByFrequency, setItemsByFrequency]);

  // Import from Excel with Firebase sync
  const importFromExcel = useCallback((data: any[]) => {
    console.log('Importing items:', data.length);
    
    // Check for duplicate IDs in imported data and existing data
    const existingIds = new Set(databaseItems.map(item => item.id));
    const importedIds = new Set();
    
    // Filter out any duplicates and ensure unique IDs
    const uniqueData = data.filter(item => {
      if (existingIds.has(item.id) || importedIds.has(item.id)) {
        console.warn('Duplicate ID detected, generating new ID for:', item.name);
        item.id = generateId(); // Generate new ID for duplicates
      }
      importedIds.add(item.id);
      return true;
    });
    
    console.log('Filtered unique items:', uniqueData.length);
    
    const updatedDatabaseItems = [...databaseItems, ...uniqueData];
    setInventoryDatabaseItems(updatedDatabaseItems);
    quickSave('inventoryDatabaseItems', updatedDatabaseItems);
    showToast(`Imported ${uniqueData.length} items to database`);
    
    addActivityEntry({
      type: 'import',
      item: 'Excel Import',
      quantity: uniqueData.length,
      unit: 'items',
      employee: 'System'
    });
  }, [databaseItems, setInventoryDatabaseItems, quickSave, addActivityEntry]);

  // Add manual item with Firebase sync
  const addManualItem = useCallback((item: Omit<DatabaseItem, 'id' | 'frequency'>) => {
    const newItem: DatabaseItem = {
      ...item,
      id: generateId(),
      frequency: 'database',
      isAssigned: false
    };
    
    const updatedDatabaseItems = [...databaseItems, newItem];
    setInventoryDatabaseItems(updatedDatabaseItems);
    quickSave('inventoryDatabaseItems', updatedDatabaseItems);
    showToast('Item added to database successfully');
    
    addActivityEntry({
      type: 'manual_add',
      item: item.name,
      quantity: 1,
      unit: 'item',
      employee: 'Current User'
    });
  }, [databaseItems, setInventoryDatabaseItems, quickSave, addActivityEntry]);

  // Assign items to category - FIXED: Handle existing assignments without duplicating and prevent race conditions
  const assignToCategory = useCallback((
    itemIds: (number | string)[],
    frequency: InventoryFrequency,
    category: InventoryCategory | string,
    minLevel: number,
    initialStock: number
  ) => {
    const selectedItemsData = databaseItems.filter(item => itemIds.includes(item.id));
    
    if (selectedItemsData.length === 0) {
      showToast('No items found to assign');
      return;
    }
    
    // Get current items for all frequencies ONCE at the beginning to prevent race conditions
    const allFrequencies: InventoryFrequency[] = ['daily', 'weekly', 'monthly'];
    const frequencyUpdates: Record<InventoryFrequency, InventoryItem[]> = {} as any;
    
    // Initialize frequency updates with current items
    allFrequencies.forEach(freq => {
      frequencyUpdates[freq] = getItemsByFrequency(freq);
    });

    // Collect all new items to add to target frequency
    const newItemsToAdd: InventoryItem[] = [];

    selectedItemsData.forEach((dbItem) => {
      // If item is already assigned, remove from current frequencies
      if (dbItem.isAssigned) {
        allFrequencies.forEach(freq => {
          const existingItems = frequencyUpdates[freq].filter(item => item.databaseId === dbItem.id);
          
          if (existingItems.length > 0) {
            if (freq === frequency) {
              // Update existing item in the same frequency (don't add new, just update)
              frequencyUpdates[freq] = frequencyUpdates[freq].map(item => 
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
            } else {
              // Remove from different frequency (moving to new frequency)
              frequencyUpdates[freq] = frequencyUpdates[freq].filter(item => item.databaseId !== dbItem.id);
            }
          }
        });
        
        // If moving to a different frequency, prepare to add to new frequency
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
          newItemsToAdd.push(newInventoryItem);
        }
      } else {
        // Item not assigned yet, prepare new inventory item
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
        newItemsToAdd.push(newInventoryItem);
      }
    });
    
    // Add all new items to target frequency
    if (newItemsToAdd.length > 0) {
      frequencyUpdates[frequency] = [...frequencyUpdates[frequency], ...newItemsToAdd];
    }
    
    // Apply all frequency updates in batch to prevent race conditions
    allFrequencies.forEach(freq => {
      const currentItems = getItemsByFrequency(freq);
      if (frequencyUpdates[freq].length !== currentItems.length || 
          JSON.stringify(frequencyUpdates[freq]) !== JSON.stringify(currentItems)) {
        setItemsByFrequency(freq, frequencyUpdates[freq]);
      }
    });
    
    // Update database items to show assignment status with Firebase sync
    const updatedDatabaseItems = databaseItems.map(item => 
      itemIds.includes(item.id) 
        ? { 
            ...item, 
            isAssigned: true,
            assignedTo: frequency,
            assignedCategory: category,
            assignedDate: new Date().toISOString().split('T')[0]
          }
        : item
    );
    setInventoryDatabaseItems(updatedDatabaseItems);
    quickSave('inventoryDatabaseItems', updatedDatabaseItems);
    
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
  }, [databaseItems, addActivityEntry, getItemsByFrequency, setItemsByFrequency, setInventoryDatabaseItems, quickSave]);

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

    // Update database item to show unassigned status with Firebase sync
    const updatedDatabaseItems = databaseItems.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            isAssigned: false,
            assignedTo: undefined,
            assignedCategory: undefined,
            assignedDate: undefined
          }
        : item
    );
    setInventoryDatabaseItems(updatedDatabaseItems);
    quickSave('inventoryDatabaseItems', updatedDatabaseItems);

    showToast(`Successfully unassigned ${dbItem.name} from inventory (removed all duplicates)`);
  }, [databaseItems]);

  // Delete items from database
  const deleteItems = useCallback((itemIds: (number | string)[]) => {
    if (itemIds.length === 0) return;
    
    // FIXED: Batch all updates to prevent infinite loop
    const frequencies: InventoryFrequency[] = ['daily', 'weekly', 'monthly'];
    const updatedItemsByFrequency: Record<InventoryFrequency, InventoryItem[]> = {} as any;
    
    // Collect all updates first
    frequencies.forEach(freq => {
      const items = getItemsByFrequency(freq);
      const updatedItems = items.filter(item => !itemIds.includes(item.databaseId || ''));
      updatedItemsByFrequency[freq] = updatedItems;
    });
    
    // Apply all updates without calling quickSave for each one
    updatedItemsByFrequency.daily.length !== dailyItems.length && setInventoryDailyItems(updatedItemsByFrequency.daily);
    updatedItemsByFrequency.weekly.length !== weeklyItems.length && setInventoryWeeklyItems(updatedItemsByFrequency.weekly);
    updatedItemsByFrequency.monthly.length !== monthlyItems.length && setInventoryMonthlyItems(updatedItemsByFrequency.monthly);
    
    // Update database items
    const updatedDatabaseItems = databaseItems.filter(item => !itemIds.includes(item.id));
    setInventoryDatabaseItems(updatedDatabaseItems);
    
    // Batch all quickSave calls to prevent infinite loop
    const savePromises: Promise<boolean>[] = [];
    
    if (updatedItemsByFrequency.daily.length !== dailyItems.length) {
      savePromises.push(quickSave('inventoryDailyItems', updatedItemsByFrequency.daily));
    }
    if (updatedItemsByFrequency.weekly.length !== weeklyItems.length) {
      savePromises.push(quickSave('inventoryWeeklyItems', updatedItemsByFrequency.weekly));
    }
    if (updatedItemsByFrequency.monthly.length !== monthlyItems.length) {
      savePromises.push(quickSave('inventoryMonthlyItems', updatedItemsByFrequency.monthly));
    }
    savePromises.push(quickSave('inventoryDatabaseItems', updatedDatabaseItems));
    
    // Execute all saves in parallel
    Promise.allSettled(savePromises).then(() => {
      console.log('✅ All delete operations saved successfully');
    }).catch(error => {
      console.warn('⚠️ Some delete operations failed to save:', error);
    });
    
    setSelectedItems(new Set());
    showToast(`Deleted ${itemIds.length} items from database`);
  }, [databaseItems, dailyItems.length, weeklyItems.length, monthlyItems.length, setInventoryDatabaseItems, setInventoryDailyItems, setInventoryWeeklyItems, setInventoryMonthlyItems, quickSave]);

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

  // Select multiple items at once (for bulk operations)
  const selectMultipleItems = useCallback((itemIds: (number | string)[]) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      itemIds.forEach(id => newSet.add(id));
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
    
    // First, fix duplicate IDs in database items
    const seenDatabaseIds = new Set<number | string>();
    const updatedDatabaseItems = databaseItems.map(item => {
      if (seenDatabaseIds.has(item.id)) {
        console.warn('Duplicate database ID detected:', item.id, 'for item:', item.name);
        const newId = generateId();
        console.log('Assigned new ID:', newId);
        totalCleaned++;
        seenDatabaseIds.add(newId);
        return { ...item, id: newId };
      }
      seenDatabaseIds.add(item.id);
      return item;
    });
    
    // Update database items if any duplicates were found
    if (totalCleaned > 0) {
      setInventoryDatabaseItems(updatedDatabaseItems);
      quickSave('inventoryDatabaseItems', updatedDatabaseItems);
    }
    
    // Then, clean up inventory duplicates based on databaseId
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
      showToast(`Cleaned up ${totalCleaned} duplicate items from database and inventory`);
    } else {
      showToast('No duplicate items found');
    }
  }, [databaseItems, setInventoryDatabaseItems, quickSave, getItemsByFrequency, setItemsByFrequency]);

  // Switch tab
  const switchTab = useCallback((tab: InventoryFrequency | 'reports') => {
    setCurrentTab(tab);
    setSelectedItems(new Set()); // Clear selections when switching tabs
  }, []);

  // Custom Category Management
  const addCustomCategory = useCallback((category: Omit<CustomCategory, 'id' | 'createdAt' | 'isDefault'>) => {
    const newCategory: CustomCategory = {
      ...category,
      id: generateId().toString(),
      createdAt: new Date().toISOString(),
      isDefault: false
    };
    
    const updatedCategories = [...customCategories, newCategory];
    setInventoryCustomCategories(updatedCategories);
    quickSave('inventoryCustomCategories', updatedCategories);
    showToast(`Custom category "${category.name}" created successfully`);
    
    addActivityEntry({
      type: 'manual_add',
      item: `Custom Category: ${category.name}`,
      quantity: 1,
      unit: 'category',
      employee: 'Current User'
    });
  }, [customCategories, setInventoryCustomCategories, quickSave, addActivityEntry]);

  const updateCustomCategory = useCallback((id: string, updatedCategory: CustomCategory) => {
    const updatedCategories = customCategories.map(cat => 
      cat.id === id ? updatedCategory : cat
    );
    setInventoryCustomCategories(updatedCategories);
    quickSave('inventoryCustomCategories', updatedCategories);
    showToast(`Category "${updatedCategory.name}" updated successfully`);
  }, [customCategories, setInventoryCustomCategories, quickSave]);

  const deleteCustomCategory = useCallback((id: string) => {
    const category = customCategories.find(cat => cat.id === id);
    if (!category) {
      showToast('Category not found');
      return;
    }
    
    const updatedCategories = customCategories.filter(cat => cat.id !== id);
    setInventoryCustomCategories(updatedCategories);
    quickSave('inventoryCustomCategories', updatedCategories);
    showToast(`Category "${category.name}" deleted successfully`);
    
    addActivityEntry({
      type: 'manual_add',
      item: `Deleted Category: ${category.name}`,
      quantity: 1,
      unit: 'category',
      employee: 'Current User'
    });
  }, [customCategories, setInventoryCustomCategories, quickSave, addActivityEntry]);

  const value: InventoryContextType = {
    // Data
    dailyItems,
    weeklyItems,
    monthlyItems,
    databaseItems,
    activityLog,
    customCategories,
    selectedItems,
    
    // UI State
    currentTab,
    
    // Actions
    setDailyItems: setInventoryDailyItems,
    setWeeklyItems: setInventoryWeeklyItems,
    setMonthlyItems: setInventoryMonthlyItems,
    setDatabaseItems: setInventoryDatabaseItems,
    setActivityLog: setInventoryActivityLog,
    setCustomCategories: setInventoryCustomCategories,
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
    selectMultipleItems,
    clearSelection,
    switchTab,
    // Custom Category Management
    addCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
    // Firebase integration
    quickSave
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
