// InventoryContext.tsx - Enhanced with Firebase integration and multi-device sync
import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { useFirebaseData } from '../hooks';
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
import { InventorySyncOperation } from '../types';
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

export const InventoryProvider: React.FC<InventoryProviderProps> = ({ children }) => {
  // Get Firebase data and functions
  const {
    // Inventory state from Firebase
    dailyItems,
    weeklyItems, 
    monthlyItems,
    databaseItems,
    activityLog,
    connectionStatus,
    // Inventory setters
    setDailyItems,
    setWeeklyItems,
    setMonthlyItems,
    setDatabaseItems,
    setActivityLog,
    // Firebase save functions
    saveInventoryFrequency,
    saveDatabaseItems,
    saveActivityLog,
    applyInventoryOperation,
    quickSave
  } = useFirebaseData();

  // Local UI state
  const [selectedItems, setSelectedItems] = React.useState<Set<number | string>>(new Set());
  const [currentTab, setCurrentTab] = React.useState<InventoryFrequency | 'reports'>('daily');
  
  // Refs for optimization
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveHash = useRef<string>('');

  // Initialize inventory data on mount
  useEffect(() => {
    console.log('🏪 Inventory context initialized with Firebase data:', {
      dailyItems: dailyItems.length,
      weeklyItems: weeklyItems.length, 
      monthlyItems: monthlyItems.length,
      databaseItems: databaseItems.length,
      activityLog: activityLog.length,
      connectionStatus
    });
  }, [dailyItems.length, weeklyItems.length, monthlyItems.length, databaseItems.length, activityLog.length, connectionStatus]);

  // Helper function to get items by frequency
  const getItemsByFrequency = useCallback((frequency: InventoryFrequency): InventoryItem[] => {
    switch (frequency) {
      case 'daily': return dailyItems;
      case 'weekly': return weeklyItems;
      case 'monthly': return monthlyItems;
      default: return [];
    }
  }, [dailyItems, weeklyItems, monthlyItems]);

  // Helper function to set items by frequency with Firebase save
  const setItemsByFrequency = useCallback(async (frequency: InventoryFrequency, items: InventoryItem[]): Promise<void> => {
    console.log(`🗂️ Setting ${frequency} items:`, items.length);
    
    // Update local state immediately for responsive UI
    switch (frequency) {
      case 'daily': 
        setDailyItems(items); 
        break;
      case 'weekly': 
        setWeeklyItems(items); 
        break;
      case 'monthly': 
        setMonthlyItems(items); 
        break;
    }

    // Save to Firebase with debouncing
    if (connectionStatus === 'connected') {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveInventoryFrequency(frequency, items);
          console.log(`✅ ${frequency} items saved to Firebase`);
        } catch (error) {
          console.error(`❌ Failed to save ${frequency} items:`, error);
          showToast(`Failed to sync ${frequency} items to cloud`);
        }
      }, 1000); // 1 second debounce
    }
  }, [connectionStatus, saveInventoryFrequency, setDailyItems, setWeeklyItems, setMonthlyItems]);

  // Enhanced add activity entry with Firebase sync
  const addActivityEntry = useCallback(async (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: ActivityLogEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date().toLocaleString()
    };

    // Update local state immediately
    const updatedLog = [newEntry, ...activityLog];
    setActivityLog(updatedLog);

    // Save to Firebase
    if (connectionStatus === 'connected') {
      try {
        await saveActivityLog(updatedLog);
        console.log('✅ Activity log saved to Firebase');
      } catch (error) {
        console.error('❌ Failed to save activity log:', error);
      }
    }

    // Create sync operation for multi-device
    const syncOperation: InventorySyncOperation = {
      type: 'report_waste',
      payload: { entry: newEntry },
      timestamp: new Date().toISOString(),
      userId: 'Current User',
      device: navigator.userAgent.split(' ')[0] || 'Unknown'
    };

    if (connectionStatus === 'connected') {
      try {
        await applyInventoryOperation(syncOperation);
      } catch (error) {
        console.error('❌ Failed to apply sync operation:', error);
      }
    }
  }, [activityLog, setActivityLog, connectionStatus, saveActivityLog, applyInventoryOperation]);

  // Enhanced update item stock with Firebase sync
  const updateItemStock = useCallback(async (
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

    // Update local state and save to Firebase
    await setItemsByFrequency(frequency, updatedItems);
    
    // Add activity entry
    await addActivityEntry({
      type: 'count_update',
      item: item.name,
      quantity: newStock - oldStock,
      unit: item.unit,
      employee,
      notes: notes || `Stock updated from ${oldStock} to ${newStock}`
    });

    // Create sync operation for multi-device
    const syncOperation: InventorySyncOperation = {
      type: 'update_stock',
      payload: { newStock, oldStock },
      frequency,
      itemId,
      timestamp: new Date().toISOString(),
      userId: employee,
      device: navigator.userAgent.split(' ')[0] || 'Unknown'
    };

    if (connectionStatus === 'connected') {
      try {
        await applyInventoryOperation(syncOperation);
      } catch (error) {
        console.error('❌ Failed to apply stock update sync:', error);
      }
    }

    showToast(`Successfully updated ${item.name} stock to ${newStock} ${item.unit}!`);
  }, [getItemsByFrequency, setItemsByFrequency, addActivityEntry, connectionStatus, applyInventoryOperation]);

  // Enhanced report waste with Firebase sync
  const reportWaste = useCallback(async (
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

    const newStock = item.currentStock - amount;
    const updatedItems = items.map(i => 
      i.id === itemId 
        ? { ...i, currentStock: newStock }
        : i
    );

    // Update local state and save to Firebase
    await setItemsByFrequency(frequency, updatedItems);
    
    // Add activity entry
    await addActivityEntry({
      type: 'waste',
      item: item.name,
      quantity: amount,
      unit: item.unit,
      employee,
      notes: notes || `Waste reported: ${reason}`,
      reason
    });

    // Create sync operation for multi-device
    const syncOperation: InventorySyncOperation = {
      type: 'report_waste',
      payload: { 
        wasteAmount: amount, 
        newStock, 
        reason, 
        itemName: item.name, 
        unit: item.unit,
        notes 
      },
      frequency,
      itemId,
      timestamp: new Date().toISOString(),
      userId: employee,
      device: navigator.userAgent.split(' ')[0] || 'Unknown'
    };

    if (connectionStatus === 'connected') {
      try {
        await applyInventoryOperation(syncOperation);
      } catch (error) {
        console.error('❌ Failed to apply waste report sync:', error);
      }
    }

    showToast(`Successfully reported waste of ${amount} ${item.unit} ${item.name}!`);
  }, [getItemsByFrequency, setItemsByFrequency, addActivityEntry, connectionStatus, applyInventoryOperation]);

  // Enhanced import from Excel with Firebase sync
  const importFromExcel = useCallback(async (data: DatabaseItem[]) => {
    // Update local state immediately
    const updatedDatabaseItems = [...databaseItems, ...data];
    setDatabaseItems(updatedDatabaseItems);
    
    // Save to Firebase
    if (connectionStatus === 'connected') {
      try {
        await saveDatabaseItems(updatedDatabaseItems);
        console.log('✅ Database items saved to Firebase after import');
      } catch (error) {
        console.error('❌ Failed to save imported items:', error);
        showToast('Items imported locally but failed to sync to cloud');
      }
    }

    // Add activity entry
    await addActivityEntry({
      type: 'import',
      item: 'Excel Import',
      quantity: data.length,
      unit: 'items',
      employee: 'System'
    });

    // Create sync operation for multi-device
    const syncOperation: InventorySyncOperation = {
      type: 'import_items',
      payload: { items: data },
      timestamp: new Date().toISOString(),
      userId: 'System',
      device: navigator.userAgent.split(' ')[0] || 'Unknown'
    };

    if (connectionStatus === 'connected') {
      try {
        await applyInventoryOperation(syncOperation);
      } catch (error) {
        console.error('❌ Failed to apply import sync:', error);
      }
    }

    showToast(`Imported ${data.length} items to database`);
  }, [databaseItems, setDatabaseItems, connectionStatus, saveDatabaseItems, addActivityEntry, applyInventoryOperation]);

  // Enhanced add manual item with Firebase sync
  const addManualItem = useCallback(async (item: Omit<DatabaseItem, 'id' | 'frequency'>) => {
    const newItem: DatabaseItem = {
      ...item,
      id: generateId(),
      frequency: 'database',
      isAssigned: false
    };
    
    // Update local state immediately
    const updatedDatabaseItems = [...databaseItems, newItem];
    setDatabaseItems(updatedDatabaseItems);
    
    // Save to Firebase
    if (connectionStatus === 'connected') {
      try {
        await saveDatabaseItems(updatedDatabaseItems);
        console.log('✅ Manual item saved to Firebase');
      } catch (error) {
        console.error('❌ Failed to save manual item:', error);
        showToast('Item added locally but failed to sync to cloud');
      }
    }

    // Add activity entry
    await addActivityEntry({
      type: 'manual_add',
      item: item.name,
      quantity: 1,
      unit: 'item',
      employee: 'Current User'
    });

    // Create sync operation for multi-device
    const syncOperation: InventorySyncOperation = {
      type: 'add_item',
      payload: { item: newItem },
      timestamp: new Date().toISOString(),
      userId: 'Current User',
      device: navigator.userAgent.split(' ')[0] || 'Unknown'
    };

    if (connectionStatus === 'connected') {
      try {
        await applyInventoryOperation(syncOperation);
      } catch (error) {
        console.error('❌ Failed to apply add item sync:', error);
      }
    }

    showToast('Item added to database successfully');
  }, [databaseItems, setDatabaseItems, connectionStatus, saveDatabaseItems, addActivityEntry, applyInventoryOperation]);

  // Enhanced assign items to category with Firebase sync
  const assignToCategory = useCallback(async (
    itemIds: (number | string)[],
    frequency: InventoryFrequency,
    category: InventoryCategory,
    minLevel: number,
    initialStock: number
  ) => {
    const selectedItemsData = databaseItems.filter(item => itemIds.includes(item.id));
    console.log('🔄 Assigning items with Firebase sync:', selectedItemsData.length, 'to', frequency, category);
    
    const newInventoryItems: InventoryItem[] = [];
    
    // Process each selected item
    selectedItemsData.forEach(dbItem => {
      // Handle existing assignments
      if (dbItem.isAssigned) {
        // Remove from previous assignment
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
              // Remove from different frequency
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
          
          newInventoryItems.push(newInventoryItem);
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
        
        newInventoryItems.push(newInventoryItem);
      }
    });

    // Add new items to frequency
    if (newInventoryItems.length > 0) {
      const currentItems = getItemsByFrequency(frequency);
      await setItemsByFrequency(frequency, [...currentItems, ...newInventoryItems]);
    }
    
    // Update database items to show assignment status
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
    setDatabaseItems(updatedDatabaseItems);

    // Save database items to Firebase
    if (connectionStatus === 'connected') {
      try {
        await saveDatabaseItems(updatedDatabaseItems);
        console.log('✅ Database items assignment saved to Firebase');
      } catch (error) {
        console.error('❌ Failed to save database items assignment:', error);
      }
    }
    
    setSelectedItems(new Set());
    
    showToast(`Successfully ${selectedItemsData.some(item => item.isAssigned) ? 'updated' : 'assigned'} ${selectedItemsData.length} items to ${frequency} - ${category}`);
    
    // Add activity entry
    await addActivityEntry({
      type: 'manual_add',
      item: `${selectedItemsData.length} items`,
      quantity: selectedItemsData.length,
      unit: 'items',
      employee: 'Current User',
      notes: `${selectedItemsData.some(item => item.isAssigned) ? 'Updated assignment to' : 'Assigned to'} ${frequency} - ${category}`
    });

    // Create sync operation for multi-device
    const syncOperation: InventorySyncOperation = {
      type: 'assign_item',
      payload: { 
        itemIds, 
        frequency, 
        category, 
        minLevel, 
        initialStock,
        newItems: newInventoryItems 
      },
      timestamp: new Date().toISOString(),
      userId: 'Current User',
      device: navigator.userAgent.split(' ')[0] || 'Unknown'
    };

    if (connectionStatus === 'connected') {
      try {
        await applyInventoryOperation(syncOperation);
      } catch (error) {
        console.error('❌ Failed to apply assign operation sync:', error);
      }
    }
  }, [databaseItems, getItemsByFrequency, setItemsByFrequency, setDatabaseItems, connectionStatus, saveDatabaseItems, addActivityEntry, applyInventoryOperation]);

  // Enhanced unassign from category with Firebase sync
  const unassignFromCategory = useCallback(async (itemId: number | string) => {
    const dbItem = databaseItems.find(item => item.id === itemId);
    if (!dbItem) {
      showToast('Database item not found!');
      return;
    }

    if (!dbItem.isAssigned) {
      showToast('Item is not currently assigned!');
      return;
    }

    // Remove ALL instances from inventory lists
    const updatePromises: Promise<void>[] = [];
    ['daily', 'weekly', 'monthly'].forEach(freq => {
      const items = getItemsByFrequency(freq as InventoryFrequency);
      const updatedItems = items.filter(item => item.databaseId !== itemId);
      
      if (updatedItems.length !== items.length) {
        updatePromises.push(setItemsByFrequency(freq as InventoryFrequency, updatedItems));
        console.log(`Removed ${items.length - updatedItems.length} duplicate(s) from ${freq}`);
      }
    });

    await Promise.all(updatePromises);

    // Update database item to show unassigned status
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
    setDatabaseItems(updatedDatabaseItems);

    // Save to Firebase
    if (connectionStatus === 'connected') {
      try {
        await saveDatabaseItems(updatedDatabaseItems);
        console.log('✅ Database items unassignment saved to Firebase');
      } catch (error) {
        console.error('❌ Failed to save database items unassignment:', error);
      }
    }

    // Create sync operation for multi-device
    const syncOperation: InventorySyncOperation = {
      type: 'unassign_item',
      payload: { itemId },
      itemId,
      timestamp: new Date().toISOString(),
      userId: 'Current User',
      device: navigator.userAgent.split(' ')[0] || 'Unknown'
    };

    if (connectionStatus === 'connected') {
      try {
        await applyInventoryOperation(syncOperation);
      } catch (error) {
        console.error('❌ Failed to apply unassign operation sync:', error);
      }
    }

    showToast(`Successfully unassigned ${dbItem.name} from inventory (removed all duplicates)`);
  }, [databaseItems, getItemsByFrequency, setItemsByFrequency, setDatabaseItems, connectionStatus, saveDatabaseItems, applyInventoryOperation]);

  // Enhanced delete items with Firebase sync
  const deleteItems = useCallback(async (itemIds: (number | string)[]) => {
    if (itemIds.length === 0) return;
    
    // Remove from inventory lists if assigned
    const updatePromises: Promise<void>[] = [];
    itemIds.forEach(itemId => {
      ['daily', 'weekly', 'monthly'].forEach(freq => {
        const items = getItemsByFrequency(freq as InventoryFrequency);
        const updatedItems = items.filter(item => item.databaseId !== itemId);
        if (updatedItems.length !== items.length) {
          updatePromises.push(setItemsByFrequency(freq as InventoryFrequency, updatedItems));
        }
      });
    });

    await Promise.all(updatePromises);
    
    // Update database items
    const updatedDatabaseItems = databaseItems.filter(item => !itemIds.includes(item.id));
    setDatabaseItems(updatedDatabaseItems);

    // Save to Firebase
    if (connectionStatus === 'connected') {
      try {
        await saveDatabaseItems(updatedDatabaseItems);
        console.log('✅ Database items deletion saved to Firebase');
      } catch (error) {
        console.error('❌ Failed to save database items deletion:', error);
      }
    }
    
    setSelectedItems(new Set());
    showToast(`Deleted ${itemIds.length} items from database`);

    // Create sync operation for multi-device
    const syncOperation: InventorySyncOperation = {
      type: 'remove_item',
      payload: { itemIds },
      timestamp: new Date().toISOString(),
      userId: 'Current User',
      device: navigator.userAgent.split(' ')[0] || 'Unknown'
    };

    if (connectionStatus === 'connected') {
      try {
        await applyInventoryOperation(syncOperation);
      } catch (error) {
        console.error('❌ Failed to apply delete operation sync:', error);
      }
    }
  }, [databaseItems, getItemsByFrequency, setItemsByFrequency, setDatabaseItems, connectionStatus, saveDatabaseItems, applyInventoryOperation]);

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

  // Clean up duplicate items with Firebase sync
  const cleanupDuplicates = useCallback(async () => {
    let totalCleaned = 0;
    const updatePromises: Promise<void>[] = [];
    
    ['daily', 'weekly', 'monthly'].forEach(freq => {
      const items = getItemsByFrequency(freq as InventoryFrequency);
      const seen = new Set<number | string>();
      const uniqueItems = items.filter(item => {
        if (item.databaseId && seen.has(item.databaseId)) {
          totalCleaned++;
          return false;
        }
        if (item.databaseId) {
          seen.add(item.databaseId);
        }
        return true;
      });
      
      if (uniqueItems.length !== items.length) {
        updatePromises.push(setItemsByFrequency(freq as InventoryFrequency, uniqueItems));
        console.log(`Cleaned ${items.length - uniqueItems.length} duplicates from ${freq}`);
      }
    });
    
    await Promise.all(updatePromises);
    
    if (totalCleaned > 0) {
      showToast(`Cleaned up ${totalCleaned} duplicate items from inventory`);
    }
  }, [getItemsByFrequency, setItemsByFrequency]);

  // Switch tab
  const switchTab = useCallback((tab: InventoryFrequency | 'reports') => {
    setCurrentTab(tab);
    setSelectedItems(new Set());
  }, []);

  // Connection status monitoring
  useEffect(() => {
    if (connectionStatus === 'connected') {
      console.log('🌐 Inventory Firebase connection established');
    } else if (connectionStatus === 'error') {
      console.warn('⚠️ Inventory Firebase connection error - working offline');
      showToast('Connection lost - inventory changes saved locally', 'warning');
    }
  }, [connectionStatus]);

  // Context value with all enhanced functions
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
    
    // Actions with Firebase integration
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
    switchTab,
    
    // Connection status for UI feedback
    connectionStatus
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
