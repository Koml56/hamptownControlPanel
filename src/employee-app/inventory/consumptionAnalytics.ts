// src/employee-app/inventory/consumptionAnalytics.ts
import { ConsumptionData, ForecastData, EnhancedInventoryItem, InventoryItem, HolidayAlert, InventoryFrequency } from '../types';
import { getStockStatus, calculateRecommendedOrder, getAverageDailyConsumption, calculateDaysRemaining } from './stockUtils';

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

export const enhanceItemWithForecast = (
  item: InventoryItem,
  frequency: InventoryFrequency
): EnhancedInventoryItem => {
  // Use real consumption history if available, otherwise generate sample data for demo
  const consumptionHistory = item.consumptionHistory || generateSampleConsumptionHistory(item, frequency);
  
  // Calculate average daily consumption using new algorithm
  const averageDailyConsumption = getAverageDailyConsumption(consumptionHistory, frequency);
  
  // Calculate days remaining
  const daysRemaining = calculateDaysRemaining(item.currentStock, averageDailyConsumption);
  
  // Ensure optimal level is set
  const optimalLevel = item.optimalLevel || item.minLevel * 2;
  
  // Calculate recommended order quantity
  const recommendedOrderQty = calculateRecommendedOrder(
    item.currentStock,
    item.minLevel,
    optimalLevel,
    averageDailyConsumption,
    3 // 3 days to next delivery
  );
  
  const forecast: ForecastData = {
    itemId: item.id.toString(),
    averageDailyConsumption,
    daysRemaining,
    recommendedOrderQty,
    usualOrderThreshold: detectOrderPattern(consumptionHistory, item.minLevel)
  };

  // Use new status calculation
  const status = getStockStatus(item.currentStock, item.minLevel) as 'out' | 'critical' | 'low' | 'ok';

  return {
    ...item,
    minimumLevel: item.minLevel,
    optimalLevel,
    consumptionHistory,
    forecast,
    frequency,
    status,
    daysRemaining: forecast.daysRemaining,
    recommendedOrder: forecast.recommendedOrderQty
  };
};

/**
 * Generate sample consumption history for demo purposes
 * This simulates realistic consumption patterns
 */
const generateSampleConsumptionHistory = (item: InventoryItem, frequency: InventoryFrequency): ConsumptionData[] => {
  const history: ConsumptionData[] = [];
  const now = new Date();
  
  // Generate different patterns based on frequency
  const daysToGenerate = frequency === 'daily' ? 14 : 
                          frequency === 'weekly' ? 56 : 180;
  
  // Base consumption rate (as a fraction of minimum level per day)
  const baseRate = frequency === 'daily' ? 0.2 : 
                   frequency === 'weekly' ? 0.05 : 0.015;
  
  let currentStock = item.currentStock;
  
  for (let i = daysToGenerate; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    
    // Add some randomness to consumption (70% to 130% of base rate)
    const variability = 0.7 + Math.random() * 0.6;
    const dailyConsumption = Math.max(0, item.minLevel * baseRate * variability);
    
    // Simulate occasional deliveries when stock gets low
    const received = currentStock <= item.minLevel * 0.3 && Math.random() < 0.3 
      ? item.minLevel * (1.5 + Math.random()) 
      : 0;
    
    const previousStock = currentStock;
    currentStock = Math.max(0, currentStock + received - dailyConsumption);
    
    history.push({
      itemId: item.id.toString(),
      date,
      previousStock,
      currentStock,
      received,
      consumed: dailyConsumption
    });
  }
  
  return history;
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
    .filter(item => {
      const status = getStockStatus(item.currentStock, item.minimumLevel);
      return ['out', 'critical', 'low'].includes(status);
    })
    .sort((a, b) => {
      // Sort by urgency: out first, then by days remaining
      if (a.status === 'out' && b.status !== 'out') return -1;
      if (b.status === 'out' && a.status !== 'out') return 1;
      return (a.daysRemaining || 0) - (b.daysRemaining || 0);
    });
};

// Holiday patterns for Finland
export const HOLIDAYS_FINLAND = {
  'NEW_YEAR': { date: '01-01', name: 'New Year', floating: false },
  'EPIPHANY': { date: '01-06', name: 'Epiphany', floating: false },
  'VALENTINES': { date: '02-14', name: "Valentine's Day", floating: false },
  'EASTER': { date: null, name: 'Easter', floating: true },
  'MAY_DAY': { date: '05-01', name: 'Vappu', floating: false },
  'MIDSUMMER': { date: null, name: 'Juhannus', floating: true },
  'INDEPENDENCE': { date: '12-06', name: 'Independence Day', floating: false },
  'CHRISTMAS': { date: '12-24', name: 'Christmas Eve', floating: false }
};

export const checkUpcomingHolidays = (daysAhead: number = 21): HolidayAlert[] => {
  const today = new Date();
  const alerts: HolidayAlert[] = [];
  
  Object.entries(HOLIDAYS_FINLAND).forEach(([key, holiday]) => {
    if (!holiday.date || holiday.floating) return; // Skip floating holidays for now
    
    const [month, day] = holiday.date.split('-').map(Number);
    const thisYear = new Date(today.getFullYear(), month - 1, day);
    const nextYear = new Date(today.getFullYear() + 1, month - 1, day);
    
    const holidayDate = thisYear >= today ? thisYear : nextYear;
    const daysUntil = Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil <= daysAhead && daysUntil > 0) {
      alerts.push({
        holiday: holiday.name,
        daysUntil,
        lastYearData: {
          date: holiday.date,
          items: [] // Would be populated with historical data
        },
        recommendations: [] // Would be populated with consumption-based recommendations
      });
    }
  });
  
  return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
};