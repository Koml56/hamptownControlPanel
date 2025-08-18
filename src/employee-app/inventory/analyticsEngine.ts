// src/employee-app/inventory/analyticsEngine.ts
// Complete analytics calculation engine for inventory management

import type {
  HistoricalSnapshot,
  AnalyticsData,
  DateRange,
  ComparisonData,
  InventoryItem,
  ActivityLogEntry
} from '../types';

/**
 * Calculate storage growth over time from historical snapshots
 */
export const calculateStorageGrowth = (
  snapshots: HistoricalSnapshot[],
  dateRange: DateRange
): Array<{date: string, totalValue: number, totalItems: number, dailyItems: number, weeklyItems: number, monthlyItems: number}> => {
  if (!snapshots || snapshots.length === 0) return [];

  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);
  
  return snapshots
    .filter(snapshot => {
      const snapshotDate = new Date(snapshot.date);
      return snapshotDate >= startDate && snapshotDate <= endDate;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(snapshot => ({
      date: snapshot.date,
      totalValue: snapshot.totalValue,
      totalItems: snapshot.totalItems,
      // Calculate category breakdown from itemSnapshots
      dailyItems: snapshot.itemSnapshots.filter(item => 
        (item as any).frequency === 'daily'
      ).reduce((sum, item) => sum + item.value, 0),
      weeklyItems: snapshot.itemSnapshots.filter(item => 
        (item as any).frequency === 'weekly'  
      ).reduce((sum, item) => sum + item.value, 0),
      monthlyItems: snapshot.itemSnapshots.filter(item => 
        (item as any).frequency === 'monthly'
      ).reduce((sum, item) => sum + item.value, 0)
    }));
};

/**
 * Calculate order frequency from activity log
 */
export const calculateOrderFrequency = (
  activityLog: ActivityLogEntry[],
  dateRange: DateRange
): Array<{item: string, frequency: number, lastOrdered: string, avgOrderQuantity: number}> => {
  if (!activityLog || activityLog.length === 0) return [];

  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);

  // Filter orders within date range
  const orders = activityLog.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entry.type === 'manual_add' && 
           entryDate >= startDate && 
           entryDate <= endDate;
  });

  // Group by item
  const itemOrders: Record<string, {quantities: number[], dates: string[]}> = {};
  
  orders.forEach(order => {
    const itemName = order.item || '';
    if (!itemOrders[itemName]) {
      itemOrders[itemName] = { quantities: [], dates: [] };
    }
    itemOrders[itemName].quantities.push(order.quantity || 0);
    itemOrders[itemName].dates.push(order.timestamp);
  });

  // Calculate frequency and averages
  return Object.entries(itemOrders).map(([item, data]) => ({
    item,
    frequency: data.quantities.length,
    lastOrdered: data.dates.sort().pop() || '',
    avgOrderQuantity: data.quantities.reduce((sum, qty) => sum + qty, 0) / data.quantities.length
  })).sort((a, b) => b.frequency - a.frequency);
};

/**
 * Calculate waste analysis from activity log
 */
export const calculateWasteAnalysis = (
  activityLog: ActivityLogEntry[],
  dateRange: DateRange,
  allItems?: InventoryItem[] // Add items for cost lookup
): Array<{date: string, totalWaste: number, wasteValue: number, wasteByCategory: Record<string, number>}> => {
  if (!activityLog || activityLog.length === 0) return [];

  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);

  // Filter waste entries within date range
  const wasteEntries = activityLog.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entry.type === 'waste' && 
           entryDate >= startDate && 
           entryDate <= endDate;
  });

  // Group by date
  const wasteByDate: Record<string, {items: ActivityLogEntry[], totalWaste: number, totalValue: number}> = {};
  
  wasteEntries.forEach(entry => {
    const date = entry.timestamp.split('T')[0]; // Get YYYY-MM-DD
    if (!wasteByDate[date]) {
      wasteByDate[date] = { items: [], totalWaste: 0, totalValue: 0 };
    }
    wasteByDate[date].items.push(entry);
    wasteByDate[date].totalWaste += entry.quantity || 0;
    
    // Calculate cost by finding the item in the inventory
    const item = allItems?.find(item => item.name === entry.item);
    const itemCost = item?.cost || 0;
    wasteByDate[date].totalValue += (entry.quantity || 0) * itemCost;
  });

  // Convert to result format
  return Object.entries(wasteByDate).map(([date, data]) => {
    const wasteByCategory: Record<string, number> = {};
    data.items.forEach(item => {
      const category = (item as any).category || 'uncategorized';
      wasteByCategory[category] = (wasteByCategory[category] || 0) + (item.quantity || 0);
    });

    return {
      date,
      totalWaste: data.totalWaste,
      wasteValue: data.totalValue,
      wasteByCategory
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Calculate consumption trends over time
 */
export const calculateConsumptionTrends = (
  items: InventoryItem[],
  activityLog: ActivityLogEntry[],
  dateRange: DateRange
): Array<{date: string, itemName: string, consumed: number, remaining: number}> => {
  if (!items || items.length === 0 || !activityLog || activityLog.length === 0) return [];

  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);

  // Get consumption entries (count_update typically indicates usage)
  const consumptionEntries = activityLog.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entry.type === 'count_update' && 
           entryDate >= startDate && 
           entryDate <= endDate;
  });

  // Group by date and item
  const trendData: Record<string, Record<string, {consumed: number, remaining: number}>> = {};
  
  consumptionEntries.forEach(entry => {
    const date = entry.timestamp.split('T')[0];
    const itemName = entry.item || '';
    
    if (!trendData[date]) trendData[date] = {};
    if (!trendData[date][itemName]) {
      trendData[date][itemName] = { consumed: 0, remaining: 0 };
    }
    
    trendData[date][itemName].consumed += Math.abs(entry.quantity || 0);
    
    // Find current stock for remaining calculation
    const currentItem = items.find(item => item.name === itemName);
    trendData[date][itemName].remaining = currentItem?.currentStock || 0;
  });

  // Flatten to result format
  const results: Array<{date: string, itemName: string, consumed: number, remaining: number}> = [];
  Object.entries(trendData).forEach(([date, itemData]) => {
    Object.entries(itemData).forEach(([itemName, data]) => {
      results.push({
        date,
        itemName,
        consumed: data.consumed,
        remaining: data.remaining
      });
    });
  });

  return results.sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Create a daily snapshot from current inventory state
 */
export const createDailySnapshot = (
  dailyItems: InventoryItem[],
  weeklyItems: InventoryItem[],
  monthlyItems: InventoryItem[]
): HistoricalSnapshot => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const allItems = [...(dailyItems || []), ...(weeklyItems || []), ...(monthlyItems || [])];
  
  const totalValue = allItems.reduce((sum, item) => 
    sum + (item.currentStock * (item.cost || 0)), 0
  );

  const stockLevels = {
    critical: allItems.filter(item => {
      const minLevel = item.minLevel || 0;
      return item.currentStock > 0 && item.currentStock <= minLevel * 0.5;
    }).length,
    low: allItems.filter(item => {
      const minLevel = item.minLevel || 0;
      return item.currentStock > minLevel * 0.5 && item.currentStock <= minLevel;
    }).length,
    ok: allItems.filter(item => {
      const minLevel = item.minLevel || 0;
      return item.currentStock > minLevel;
    }).length,
    out: allItems.filter(item => item.currentStock === 0).length
  };

  const categoryBreakdown: Record<string, number> = {};
  allItems.forEach(item => {
    const category = item.category || 'uncategorized';
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + item.currentStock;
  });

  return {
    id: `snapshot_${today}_${now.getTime()}`,
    date: today,
    timestamp: now.getTime(),
    totalItems: allItems.length,
    totalValue,
    stockLevels,
    categoryBreakdown,
    itemSnapshots: allItems.map(item => ({
      itemId: item.id?.toString() || item.name,
      name: item.name,
      stock: item.currentStock,
      value: item.currentStock * (item.cost || 0),
      category: item.category || 'uncategorized'
    }))
  };
};

/**
 * Compare performance metrics between two snapshots
 */
export const comparePerformanceMetrics = (
  currentSnapshot: HistoricalSnapshot,
  previousSnapshot: HistoricalSnapshot
): ComparisonData => {
  if (!currentSnapshot || !previousSnapshot) {
    return {
      valueChange: 0,
      itemCountChange: 0,
      stockLevelChanges: {},
      percentageChanges: {}
    };
  }

  const valueChange = currentSnapshot.totalValue - previousSnapshot.totalValue;
  const itemCountChange = currentSnapshot.totalItems - previousSnapshot.totalItems;
  
  const stockLevelChanges = {
    critical: currentSnapshot.stockLevels.critical - previousSnapshot.stockLevels.critical,
    low: currentSnapshot.stockLevels.low - previousSnapshot.stockLevels.low,
    ok: currentSnapshot.stockLevels.ok - previousSnapshot.stockLevels.ok,
    out: currentSnapshot.stockLevels.out - previousSnapshot.stockLevels.out
  };

  const percentageChanges = {
    value: previousSnapshot.totalValue > 0 ? 
      ((valueChange / previousSnapshot.totalValue) * 100) : 0,
    items: previousSnapshot.totalItems > 0 ? 
      ((itemCountChange / previousSnapshot.totalItems) * 100) : 0,
    critical: previousSnapshot.stockLevels.critical > 0 ? 
      ((stockLevelChanges.critical / previousSnapshot.stockLevels.critical) * 100) : 0,
    low: previousSnapshot.stockLevels.low > 0 ? 
      ((stockLevelChanges.low / previousSnapshot.stockLevels.low) * 100) : 0,
    ok: previousSnapshot.stockLevels.ok > 0 ? 
      ((stockLevelChanges.ok / previousSnapshot.stockLevels.ok) * 100) : 0,
    out: previousSnapshot.stockLevels.out > 0 ? 
      ((stockLevelChanges.out / previousSnapshot.stockLevels.out) * 100) : 0
  };

  return {
    valueChange,
    itemCountChange,
    stockLevelChanges,
    percentageChanges
  };
};

/**
 * Generate comprehensive analytics data for a date range
 */
export const generateAnalyticsData = (
  snapshots: HistoricalSnapshot[],
  items: InventoryItem[],
  activityLog: ActivityLogEntry[],
  dateRange: DateRange
): AnalyticsData => {
  return {
    storageGrowth: calculateStorageGrowth(snapshots, dateRange),
    orderFrequency: calculateOrderFrequency(activityLog, dateRange),
    wasteAnalysis: calculateWasteAnalysis(activityLog, dateRange, items),
    consumptionTrends: calculateConsumptionTrends(items, activityLog, dateRange),
    performanceMetrics: {
      stockTurnoverRate: calculateStockTurnoverRate(activityLog, items, dateRange),
      wastePercentage: calculateWastePercentage(activityLog, dateRange),
      orderAccuracy: calculateOrderAccuracy(activityLog, dateRange),
      stockoutFrequency: calculateStockoutFrequency(snapshots, dateRange)
    }
  };
};

// Helper functions for performance metrics
const calculateStockTurnoverRate = (
  activityLog: ActivityLogEntry[],
  items: InventoryItem[],
  dateRange: DateRange
): number => {
  const avgInventoryValue = items.reduce((sum, item) => 
    sum + (item.currentStock * (item.cost || 0)), 0
  );
  
  const soldValue = activityLog
    .filter(entry => entry.type === 'count_update')
    .reduce((sum, entry) => {
      // Find the item cost from the items array
      const item = items.find(item => item.name === entry.item);
      const itemCost = item?.cost || 0;
      return sum + ((entry.quantity || 0) * itemCost);
    }, 0);
  
  return avgInventoryValue > 0 ? soldValue / avgInventoryValue : 0;
};

const calculateWastePercentage = (
  activityLog: ActivityLogEntry[],
  dateRange: DateRange
): number => {
  const totalWaste = activityLog
    .filter(entry => entry.type === 'waste')
    .reduce((sum, entry) => sum + (entry.quantity || 0), 0);
    
  const totalItems = activityLog
    .reduce((sum, entry) => sum + Math.abs(entry.quantity || 0), 0);
    
  return totalItems > 0 ? (totalWaste / totalItems) * 100 : 0;
};

const calculateOrderAccuracy = (
  activityLog: ActivityLogEntry[],
  dateRange: DateRange
): number => {
  // This is a simplified calculation - in reality you'd track order vs delivery discrepancies
  const orders = activityLog.filter(entry => entry.type === 'manual_add');
  const adjustments = activityLog.filter(entry => entry.type === 'count_update');
  
  return orders.length > 0 ? 
    Math.max(0, 100 - ((adjustments.length / orders.length) * 100)) : 100;
};

const calculateStockoutFrequency = (
  snapshots: HistoricalSnapshot[],
  dateRange: DateRange
): number => {
  if (!snapshots || snapshots.length === 0) return 0;
  
  const stockoutDays = snapshots.filter(snapshot => snapshot.stockLevels.out > 0).length;
  return snapshots.length > 0 ? (stockoutDays / snapshots.length) * 100 : 0;
};