// stockUtils.ts - Advanced stock management utilities
import { InventoryItem, ConsumptionData, InventoryFrequency } from '../types';

/**
 * CORRECT THRESHOLDS as per requirements
 */
export const getStockStatus = (currentStock: number, minimumLevel: number) => {
  if (minimumLevel === 0) return 'unknown';
  
  const percentage = (currentStock / minimumLevel) * 100;
  
  if (currentStock === 0) return 'out';           // 0% - RED - Out of stock
  if (percentage <= 20) return 'critical';        // ≤20% - ORANGE - Critical  
  if (percentage <= 50) return 'low';             // ≤50% - YELLOW - Low
  return 'ok';                                    // >50% - GREEN - OK
};

/**
 * Calculate recommended order quantity
 */
export const calculateRecommendedOrder = (
  currentStock: number,
  minimumLevel: number,
  optimalLevel: number,
  avgDailyConsumption: number,
  daysToNextDelivery: number = 3
): number => {
  // If no consumption data, use simple formula
  if (!avgDailyConsumption || avgDailyConsumption === 0) {
    return Math.max(0, optimalLevel - currentStock);
  }
  
  // Smart formula with consumption
  const expectedConsumption = avgDailyConsumption * daysToNextDelivery;
  const targetStock = optimalLevel || minimumLevel * 2; // Optimal is 2x minimum
  const toOrder = targetStock - currentStock + expectedConsumption;
  
  return Math.max(0, Math.ceil(toOrder));
};

/**
 * Set minimum level and auto-set optimal level
 */
export const setMinimumLevel = (item: InventoryItem, minimum: number): InventoryItem => {
  return {
    ...item,
    minLevel: minimum,
    optimalLevel: minimum * 2 // Default optimal = 2x minimum
  };
};

/**
 * Track consumption between inventory checks
 */
export const trackConsumption = (
  frequency: InventoryFrequency,
  previousCount: number,
  currentCount: number,
  deliveries: number = 0
): number => {
  const consumed = previousCount + deliveries - currentCount;
  return Math.max(0, consumed); // Can't have negative consumption
};

/**
 * Calculate average daily consumption from history
 */
export const getAverageDailyConsumption = (
  history: ConsumptionData[],
  frequency: InventoryFrequency
): number => {
  if (history.length < 2) return 0;
  
  // Take last 7 days for daily, 4 weeks for weekly, 3 months for monthly
  const periods = {
    daily: 7,
    weekly: 28,
    monthly: 90,
    database: 30,
    outofstock: 30
  };
  
  const daysToAnalyze = periods[frequency];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToAnalyze);
  
  const relevantHistory = history.filter(h => h.date > cutoffDate);
  if (relevantHistory.length === 0) return 0;
  
  const totalConsumed = relevantHistory.reduce((sum, h) => sum + h.consumed, 0);
  const daysCovered = Math.ceil(
    (new Date().getTime() - relevantHistory[0].date.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return totalConsumed / daysCovered;
};

/**
 * Handle stock update with consumption tracking
 */
export const handleStockUpdate = (
  item: InventoryItem,
  newStock: number,
  deliveries: number = 0
): { updatedItem: InventoryItem; consumptionEntry: ConsumptionData } => {
  const consumptionEntry: ConsumptionData = {
    itemId: item.id.toString(),
    date: new Date(),
    previousStock: item.currentStock,
    currentStock: newStock,
    consumed: Math.max(0, item.currentStock - newStock + deliveries), // If stock decreased
    received: deliveries
  };
  
  // Update consumption history
  const updatedHistory = [...(item.consumptionHistory || []), consumptionEntry];
  
  // Keep only last 100 entries to prevent bloat
  if (updatedHistory.length > 100) {
    updatedHistory.splice(0, updatedHistory.length - 100);
  }
  
  const updatedItem: InventoryItem = {
    ...item,
    currentStock: newStock,
    lastUsed: new Date().toISOString(),
    consumptionHistory: updatedHistory,
    // Ensure optimal level is set
    optimalLevel: item.optimalLevel || item.minLevel * 2
  };
  
  return { updatedItem, consumptionEntry };
};

/**
 * Mark items as ordered
 */
export const markAsOrdered = (
  items: InventoryItem[],
  itemIds: string[],
  quantities: number[]
): InventoryItem[] => {
  return items.map(item => {
    const orderIndex = itemIds.indexOf(item.id.toString());
    if (orderIndex === -1) return item;
    
    return {
      ...item,
      orderedStatus: {
        isOrdered: true,
        orderedDate: new Date(),
        orderedQuantity: quantities[orderIndex],
        expectedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // +3 days
      }
    };
  });
};

/**
 * Calculate forecast days remaining
 */
export const calculateDaysRemaining = (
  currentStock: number,
  avgDailyConsumption: number
): number => {
  if (avgDailyConsumption <= 0 || currentStock <= 0) return 0;
  return Math.floor(currentStock / avgDailyConsumption);
};

/**
 * Get items that need ordering (based on new thresholds)
 */
export const getItemsNeedingOrder = (items: InventoryItem[]): InventoryItem[] => {
  return items.filter(item => {
    const status = getStockStatus(item.currentStock, item.minLevel);
    return ['out', 'critical', 'low'].includes(status) && !item.orderedStatus?.isOrdered;
  });
};