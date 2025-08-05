// src/employee-app/inventory/consumptionAnalytics.ts
import { ConsumptionData, ForecastData, EnhancedInventoryItem, InventoryItem, HolidayAlert, InventoryFrequency } from '../types';

export const calculateAverageConsumption = (
  history: ConsumptionData[],
  frequency: 'daily' | 'weekly' | 'monthly'
): number => {
  if (history.length < 2) return 0;
  
  const periods = frequency === 'daily' ? 7 : 
                  frequency === 'weekly' ? 4 : 3;
  
  const recentHistory = history.slice(-periods);
  const totalConsumption = recentHistory.reduce((sum, h) => sum + h.consumed, 0);
  
  // Convert to daily rate
  const days = frequency === 'daily' ? periods :
               frequency === 'weekly' ? periods * 7 : periods * 30;
  
  return totalConsumption / days;
};

export const forecastDaysRemaining = (
  currentStock: number,
  avgDailyConsumption: number,
  seasonalCoefficient: number = 1.0
): number => {
  if (avgDailyConsumption <= 0) return Infinity;
  return Math.floor(currentStock / (avgDailyConsumption * seasonalCoefficient));
};

export const detectOrderPattern = (
  history: ConsumptionData[],
  minimumLevel: number
): number => {
  // Find at what % of minimum the orders were typically made
  const orderPoints = history
    .filter((h, i) => i > 0 && h.received > 0)
    .map(h => (h.previousStock / minimumLevel) * 100);
  
  return orderPoints.length > 0 
    ? orderPoints.reduce((a, b) => a + b) / orderPoints.length
    : 20; // Default to 20% if no history
};

export const calculateRecommendedOrder = (
  item: InventoryItem,
  forecast: ForecastData
): number => {
  const { currentStock, minLevel } = item;
  const { averageDailyConsumption } = forecast;
  
  // Base calculation: bring stock up to optimal level
  const optimalStock = minLevel * 2; // Assume optimal is 2x minimum
  const baseOrder = Math.max(0, optimalStock - currentStock);
  
  // Adjust for consumption rate (7-day safety buffer)
  const safetyBuffer = averageDailyConsumption * 7;
  
  return Math.max(baseOrder, safetyBuffer);
};

export const enhanceItemWithForecast = (
  item: InventoryItem,
  frequency: InventoryFrequency
): EnhancedInventoryItem => {
  // Mock consumption history for demo
  const mockHistory: ConsumptionData[] = [];
  const averageDailyConsumption = Math.max(0.5, item.minLevel * 0.1); // Mock calculation
  
  const forecast: ForecastData = {
    itemId: item.id.toString(),
    averageDailyConsumption,
    daysRemaining: forecastDaysRemaining(item.currentStock, averageDailyConsumption),
    recommendedOrderQty: calculateRecommendedOrder(item, {
      itemId: item.id.toString(),
      averageDailyConsumption,
      daysRemaining: 0,
      recommendedOrderQty: 0,
      usualOrderThreshold: 20
    }),
    usualOrderThreshold: 20
  };

  const stockPercentage = (item.currentStock / item.minLevel) * 100;
  const status = stockPercentage === 0 ? 'out' :
                 stockPercentage < 10 ? 'critical' :
                 stockPercentage < 30 ? 'low' : 'ok';

  return {
    ...item,
    minimumLevel: item.minLevel,
    optimalLevel: item.minLevel * 2,
    consumptionHistory: mockHistory,
    forecast,
    frequency,
    status,
    daysRemaining: forecast.daysRemaining,
    recommendedOrder: forecast.recommendedOrderQty
  };
};

export const getOutOfStockItems = (
  dailyItems: InventoryItem[],
  weeklyItems: InventoryItem[],
  monthlyItems: InventoryItem[]
): EnhancedInventoryItem[] => {
  const allItems = [
    ...dailyItems.map(i => ({ ...i, frequency: 'daily' as InventoryFrequency })),
    ...weeklyItems.map(i => ({ ...i, frequency: 'weekly' as InventoryFrequency })),
    ...monthlyItems.map(i => ({ ...i, frequency: 'monthly' as InventoryFrequency }))
  ];

  return allItems
    .map(item => enhanceItemWithForecast(item, item.frequency))
    .filter(item => item.currentStock <= item.minimumLevel * 0.3)
    .sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0));
};

export const checkUpcomingHolidays = (): HolidayAlert[] => {
  // Mock implementation for demo
  return [];
};