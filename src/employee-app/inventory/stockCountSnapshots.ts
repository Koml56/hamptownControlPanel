// src/employee-app/inventory/stockCountSnapshots.ts
import type { 
  InventoryItem, 
  StockCountSnapshot,
  InventoryFrequency,
  StockCountHistoryEntry,
  DailyInventorySnapshot,
  ActivityLogEntry,
  Employee
} from '../types';
import { getStockStatus } from './stockUtils';

/**
 * Stock Count Snapshot Service
 * Handles creation and management of historical stock count snapshots
 */

/**
 * Generate a snapshot ID based on date and frequency
 */
export const generateSnapshotId = (date: string, frequency: InventoryFrequency): string => {
  const cleanDate = date.replace(/-/g, '');
  return `${frequency}_${cleanDate}`;
};

/**
 * Create a stock count snapshot for a specific date and frequency
 */
export const createStockCountSnapshot = (
  items: InventoryItem[],
  frequency: InventoryFrequency,
  date?: string,
  countedBy?: string
): StockCountSnapshot => {
  const snapshotDate = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const timestamp = new Date().toISOString();
  const defaultCountedBy = countedBy || 'System';
  
  // FIXED: Don't filter items by frequency here - assume all passed items are for this frequency
  // This allows the function to work correctly when called with items that should all be snapshot
  const filteredItems = items.filter(item => item && typeof item === 'object'); // Just filter out null/undefined
  
  const itemCounts: StockCountSnapshot['itemCounts'] = {};
  let totalValue = 0;
  let outOfStockItems = 0;
  let criticalStockItems = 0;
  let lowStockItems = 0;
  let validItemCount = 0; // Track valid items separately
  
  filteredItems.forEach(item => {
    // FIXED: Normalize invalid data instead of skipping it completely
    if (!item || !item.id || !item.name) {
      console.warn('⚠️ Skipping item with missing critical fields:', item);
      return;
    }

    validItemCount++; // Increment only for items with at least ID and name
    
    // Normalize invalid values
    const normalizedStock = Math.max(0, Number(item.currentStock) || 0);
    const normalizedCost = Math.max(0, Number(item.cost) || 0);
    const normalizedMinLevel = Math.max(0, Number(item.minLevel) || 0);
    
    const itemTotalValue = normalizedStock * normalizedCost;
    totalValue += itemTotalValue;
    
    const stockStatus = getStockStatus(normalizedStock, normalizedMinLevel);
    
    // Count stock status items
    if (stockStatus === 'out') outOfStockItems++;
    else if (stockStatus === 'critical') criticalStockItems++;
    else if (stockStatus === 'low') lowStockItems++;
    
    itemCounts[item.id.toString()] = {
      itemName: item.name || 'Unknown Item',
      category: (item.category || 'uncategorized').toString(),
      frequency: item.frequency || frequency, // Use item frequency if available, otherwise use snapshot frequency
      currentStock: normalizedStock,
      unit: item.unit || 'pieces',
      unitCost: normalizedCost,
      totalValue: itemTotalValue,
      lastCountDate: item.lastUsed || new Date().toISOString().split('T')[0],
      countedBy: defaultCountedBy,
      minLevel: normalizedMinLevel,
      optimalLevel: item.optimalLevel || normalizedMinLevel * 2
    };
  });
  
  // Count items by frequency for summary - use the snapshot frequency for all items
  const allItemsByFrequency = {
    daily: frequency === 'daily' ? validItemCount : 0,
    weekly: frequency === 'weekly' ? validItemCount : 0,
    monthly: frequency === 'monthly' ? validItemCount : 0
  };
  
  return {
    date: snapshotDate,
    frequency,
    timestamp,
    totalItems: validItemCount, // Use valid item count
    totalValue,
    itemCounts,
    summary: {
      dailyItemsCount: allItemsByFrequency.daily,
      weeklyItemsCount: allItemsByFrequency.weekly,
      monthlyItemsCount: allItemsByFrequency.monthly,
      totalInventoryValue: totalValue,
      outOfStockItems,
      criticalStockItems,
      lowStockItems
    }
  };
};

/**
 * Create snapshots for all frequencies (daily, weekly, monthly)
 */
export const createAllFrequencySnapshots = (
  dailyItems: InventoryItem[],
  weeklyItems: InventoryItem[],
  monthlyItems: InventoryItem[],
  date?: string
): StockCountSnapshot[] => {
  const snapshotDate = date || new Date().toISOString().split('T')[0];
  
  const snapshots: StockCountSnapshot[] = [];
  
  // Create snapshot for each frequency
  if (dailyItems.length > 0) {
    snapshots.push(createStockCountSnapshot(dailyItems, 'daily', snapshotDate));
  }
  
  if (weeklyItems.length > 0) {
    snapshots.push(createStockCountSnapshot(weeklyItems, 'weekly', snapshotDate));
  }
  
  if (monthlyItems.length > 0) {
    snapshots.push(createStockCountSnapshot(monthlyItems, 'monthly', snapshotDate));
  }
  
  return snapshots;
};

/**
 * Determine if a snapshot should be created based on frequency and timing
 */
export const shouldCreateSnapshot = (
  frequency: InventoryFrequency,
  lastSnapshotDate?: string
): boolean => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  if (!lastSnapshotDate) {
    return true; // No previous snapshot, create one
  }
  
  const lastDate = new Date(lastSnapshotDate);
  
  switch (frequency) {
    case 'daily':
      // Create daily snapshot if it's a new day
      return lastSnapshotDate !== today;
      
    case 'weekly':
      // Create weekly snapshot on Sunday (0) if last snapshot was not this week
      const isWeekEnd = now.getDay() === 0; // Sunday
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      return isWeekEnd && lastDate < weekStart;
      
    case 'monthly':
      // Create monthly snapshot on the last day of month if not created this month
      const isLastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      return isLastDayOfMonth && lastDate < monthStart;
      
    default:
      return false;
  }
};

/**
 * Format snapshot data for Firebase storage
 */
export const formatSnapshotForStorage = (
  snapshot: StockCountSnapshot
): StockCountHistoryEntry => {
  return {
    snapshotId: generateSnapshotId(snapshot.date, snapshot.frequency),
    date: snapshot.date,
    frequency: snapshot.frequency,
    snapshot
  };
};

/**
 * Get stock status counts from a snapshot
 */
export const getSnapshotStockStatusCounts = (snapshot: StockCountSnapshot) => {
  let outOfStock = 0;
  let critical = 0;
  let low = 0;
  let ok = 0;
  
  Object.values(snapshot.itemCounts).forEach(item => {
    const status = getStockStatus(item.currentStock, item.minLevel);
    switch (status) {
      case 'out':
        outOfStock++;
        break;
      case 'critical':
        critical++;
        break;
      case 'low':
        low++;
        break;
      case 'ok':
        ok++;
        break;
    }
  });
  
  return { outOfStock, critical, low, ok };
};

/**
 * Create a comprehensive snapshot that includes all inventory data
 */
export const createComprehensiveSnapshot = (
  dailyItems: InventoryItem[],
  weeklyItems: InventoryItem[],
  monthlyItems: InventoryItem[],
  date?: string
): StockCountSnapshot => {
  const snapshotDate = date || new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString();
  
  // Combine all items
  const allItems = [
    ...dailyItems.map(item => ({ ...item, frequency: 'daily' as InventoryFrequency })),
    ...weeklyItems.map(item => ({ ...item, frequency: 'weekly' as InventoryFrequency })),
    ...monthlyItems.map(item => ({ ...item, frequency: 'monthly' as InventoryFrequency }))
  ];
  
  const itemCounts: StockCountSnapshot['itemCounts'] = {};
  let totalValue = 0;
  let outOfStockItems = 0;
  let criticalStockItems = 0;
  let lowStockItems = 0;
  
  allItems.forEach(item => {
    const itemTotalValue = item.currentStock * item.cost;
    totalValue += itemTotalValue;
    
    const stockStatus = getStockStatus(item.currentStock, item.minLevel);
    
    // Count stock status items
    if (stockStatus === 'out') outOfStockItems++;
    else if (stockStatus === 'critical') criticalStockItems++;
    else if (stockStatus === 'low') lowStockItems++;
    
    itemCounts[item.id.toString()] = {
      itemName: item.name,
      category: item.category.toString(),
      frequency: item.frequency,
      currentStock: item.currentStock,
      unit: item.unit,
      unitCost: item.cost,
      totalValue: itemTotalValue,
      lastCountDate: item.lastUsed,
      countedBy: 'System',
      minLevel: item.minLevel,
      optimalLevel: item.optimalLevel || item.minLevel * 2
    };
  });
  
  return {
    date: snapshotDate,
    frequency: 'daily', // Use 'daily' as the comprehensive frequency
    timestamp,
    totalItems: allItems.length,
    totalValue,
    itemCounts,
    summary: {
      dailyItemsCount: dailyItems.length,
      weeklyItemsCount: weeklyItems.length,
      monthlyItemsCount: monthlyItems.length,
      totalInventoryValue: totalValue,
      outOfStockItems,
      criticalStockItems,
      lowStockItems
    }
  };
};

/**
 * Create a comprehensive daily inventory snapshot for compliance and business requirements
 * This snapshot includes all data needed for audits, compliance, and business analytics
 */
export const createComprehensiveDailySnapshot = (
  dailyItems: InventoryItem[],
  weeklyItems: InventoryItem[],
  monthlyItems: InventoryItem[],
  activityLog: ActivityLogEntry[],
  employees: Employee[],
  createdBy: string = 'system_automatic',
  date?: string
): DailyInventorySnapshot => {
  const snapshotDate = date || new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString();
  const snapshotId = `daily_${snapshotDate.replace(/-/g, '')}_${Date.now()}`;
  
  // Combine all items
  const allItems = [
    ...dailyItems.map(item => ({ ...item, frequency: 'daily' as InventoryFrequency })),
    ...weeklyItems.map(item => ({ ...item, frequency: 'weekly' as InventoryFrequency })),
    ...monthlyItems.map(item => ({ ...item, frequency: 'monthly' as InventoryFrequency }))
  ];
  
  // Calculate inventory values by frequency
  const dailyValue = dailyItems.reduce((sum, item) => sum + (item.currentStock * item.cost), 0);
  const weeklyValue = weeklyItems.reduce((sum, item) => sum + (item.currentStock * item.cost), 0);
  const monthlyValue = monthlyItems.reduce((sum, item) => sum + (item.currentStock * item.cost), 0);
  const totalValue = dailyValue + weeklyValue + monthlyValue;
  
  // Process items into snapshot format
  const snapshotItems: DailyInventorySnapshot['items'] = {};
  allItems.forEach(item => {
    if (item && item.id && item.name) {
      snapshotItems[item.id.toString()] = {
        id: item.id.toString(),
        name: item.name,
        category: item.category || 'uncategorized',
        frequency: item.frequency,
        currentStock: Math.max(0, Number(item.currentStock) || 0),
        unit: item.unit || 'pieces',
        minimumLevel: Math.max(0, Number(item.minLevel) || 0),
        unitCost: Math.max(0, Number(item.cost) || 0),
        totalValue: Math.max(0, Number(item.currentStock) || 0) * Math.max(0, Number(item.cost) || 0),
        lastCountDate: item.lastUsed || snapshotDate,
        countedBy: 'System',
        location: 'Main Storage', // Default location
        notes: '',
        optimalLevel: item.optimalLevel || Math.max(0, Number(item.minLevel) || 0) * 2
      };
    }
  });
  
  // Filter activity log for today
  const todayStart = new Date(snapshotDate);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(snapshotDate);
  todayEnd.setHours(23, 59, 59, 999);
  
  const todayActivity = activityLog.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= todayStart && entryDate <= todayEnd;
  });
  
  // Process daily activity
  const itemsReceived: DailyInventorySnapshot['dailyActivity']['itemsReceived'] = {};
  const itemsUsed: DailyInventorySnapshot['dailyActivity']['itemsUsed'] = {};
  const itemsWasted: DailyInventorySnapshot['dailyActivity']['itemsWasted'] = {};
  
  todayActivity.forEach(entry => {
    if (entry.type === 'manual_add') {
      if (!itemsReceived[entry.item]) {
        itemsReceived[entry.item] = {
          quantity: 0,
          cost: 0,
          supplier: 'Unknown',
          timestamp: entry.timestamp
        };
      }
      itemsReceived[entry.item].quantity += entry.quantity;
      
      // Calculate cost from inventory items
      const inventoryItem = allItems.find(item => item.name === entry.item);
      const itemCost = inventoryItem ? inventoryItem.cost : 0;
      itemsReceived[entry.item].cost += entry.quantity * itemCost;
    } else if (entry.type === 'count_update') {
      if (!itemsUsed[entry.item]) {
        itemsUsed[entry.item] = {
          quantity: 0,
          purpose: 'Stock Update',
          timestamp: entry.timestamp
        };
      }
      itemsUsed[entry.item].quantity += Math.abs(entry.quantity);
    } else if (entry.type === 'waste') {
      if (!itemsWasted[entry.item]) {
        itemsWasted[entry.item] = {
          quantity: 0,
          reason: entry.reason || 'Unknown',
          cost: 0,
          timestamp: entry.timestamp
        };
      }
      itemsWasted[entry.item].quantity += entry.quantity;
      
      // Calculate cost from inventory items
      const inventoryItem = allItems.find(item => item.name === entry.item);
      const itemCost = inventoryItem ? inventoryItem.cost : 0;
      itemsWasted[entry.item].cost += entry.quantity * itemCost;
    }
  });
  
  // Process employee activity
  const employeeActivity: DailyInventorySnapshot['employeeActivity'] = {};
  employees.forEach(employee => {
    const employeeActions = todayActivity.filter(entry => entry.employee === employee.name);
    const countsPerformed = employeeActions.filter(entry => entry.type === 'count_update').length;
    const itemsUpdated = [...new Set(employeeActions.map(entry => entry.item))];
    
    employeeActivity[employee.id.toString()] = {
      countsPerformed,
      itemsUpdated,
      hoursWorked: 8, // Default value - would need to be tracked separately
      notes: ''
    };
  });
  
  return {
    date: snapshotDate,
    timestamp,
    snapshotId,
    createdBy,
    inventoryValue: {
      total: totalValue,
      dailyItems: dailyValue,
      weeklyItems: weeklyValue,
      monthlyItems: monthlyValue
    },
    items: snapshotItems,
    dailyActivity: {
      itemsReceived,
      itemsUsed,
      itemsWasted
    },
    compliance: {
      temperatureLog: [], // Would be populated with actual temperature readings
      inspectionNotes: '',
      healthDeptVisit: false,
      auditFlags: []
    },
    employeeActivity
  };
};