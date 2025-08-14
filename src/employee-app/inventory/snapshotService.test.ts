// src/employee-app/inventory/snapshotService.test.ts
import { createStockSnapshot, generateSnapshotSummary } from './snapshotService';
import type { InventoryItem, StockCountSnapshot } from '../types';

// Mock the Firebase service
jest.mock('../firebaseService', () => ({
  addStockCountSnapshot: jest.fn().mockResolvedValue({ id: 'mock-id' }),
  getStockCountSnapshots: jest.fn().mockResolvedValue([])
}));

// Mock the stockUtils
jest.mock('./stockUtils', () => ({
  getStockStatus: jest.fn((currentStock: number, minLevel: number) => {
    if (currentStock === 0) return 'out';
    if (currentStock <= minLevel * 0.5) return 'critical';
    if (currentStock <= minLevel) return 'low';
    return 'ok';
  })
}));

describe('SnapshotService', () => {
  const mockDailyItems: InventoryItem[] = [
    {
      id: '1',
      name: 'Milk',
      category: 'dairy',
      currentStock: 10,
      minLevel: 5,
      unit: 'liters',
      cost: 2.5,
      lastUsed: '2024-01-15',
      optimalLevel: 15
    },
    {
      id: '2',
      name: 'Bread',
      category: 'bakery',
      currentStock: 3,
      minLevel: 5,
      unit: 'loaves',
      cost: 1.5,
      lastUsed: '2024-01-15',
      optimalLevel: 10
    }
  ];

  const mockWeeklyItems: InventoryItem[] = [
    {
      id: '3',
      name: 'Chicken',
      category: 'meat',
      currentStock: 8,
      minLevel: 3,
      unit: 'kg',
      cost: 15.0,
      lastUsed: '2024-01-14',
      optimalLevel: 12
    }
  ];

  const mockMonthlyItems: InventoryItem[] = [
    {
      id: '4',
      name: 'Oregano',
      category: 'spices',
      currentStock: 0,
      minLevel: 1,
      unit: 'bottles',
      cost: 5.0,
      lastUsed: '2024-01-10',
      optimalLevel: 3
    }
  ];

  describe('createStockSnapshot', () => {
    test('creates snapshot for daily items', async () => {
      const result = await createStockSnapshot(mockDailyItems, 'daily', 'John Doe');
      
      expect(result).toBeDefined();
      expect(result.snapshot.frequency).toBe('daily');
      expect(result.snapshot.totalItems).toBe(2);
      expect(result.snapshot.totalValue).toBe(29.5); // (10*2.5) + (3*1.5)
      expect(Object.keys(result.snapshot.itemCounts)).toHaveLength(2);
    });

    test('creates snapshot for weekly items', async () => {
      const result = await createStockSnapshot(mockWeeklyItems, 'weekly', 'Jane Smith');
      
      expect(result.snapshot.frequency).toBe('weekly');
      expect(result.snapshot.totalItems).toBe(1);
      expect(result.snapshot.totalValue).toBe(120); // 8*15.0
    });

    test('creates snapshot for monthly items', async () => {
      const result = await createStockSnapshot(mockMonthlyItems, 'monthly', 'Bob Wilson');
      
      expect(result.snapshot.frequency).toBe('monthly');
      expect(result.snapshot.totalItems).toBe(1);
      expect(result.snapshot.totalValue).toBe(0); // 0*5.0
    });

    test('includes correct item details in snapshot', async () => {
      const result = await createStockSnapshot(mockDailyItems, 'daily', 'Test User');
      
      const milkItem = result.snapshot.itemCounts['1'];
      expect(milkItem).toBeDefined();
      expect(milkItem.itemName).toBe('Milk');
      expect(milkItem.category).toBe('dairy');
      expect(milkItem.currentStock).toBe(10);
      expect(milkItem.minLevel).toBe(5);
      expect(milkItem.unitCost).toBe(2.5);
      expect(milkItem.totalValue).toBe(25);
      expect(milkItem.countedBy).toBe('Test User');
    });

    test('handles empty item list', async () => {
      const result = await createStockSnapshot([], 'daily', 'Test User');
      
      expect(result.snapshot.totalItems).toBe(0);
      expect(result.snapshot.totalValue).toBe(0);
      expect(Object.keys(result.snapshot.itemCounts)).toHaveLength(0);
    });

    test('calculates correct summary statistics', async () => {
      const allItems = [...mockDailyItems, ...mockWeeklyItems, ...mockMonthlyItems];
      const result = await createStockSnapshot(allItems, 'daily', 'Test User');
      
      const summary = result.snapshot.summary;
      expect(summary.totalInventoryValue).toBe(149.5);
      expect(summary.outOfStockItems).toBe(1); // Oregano
      expect(summary.criticalStockItems).toBe(0);
      expect(summary.lowStockItems).toBe(1); // Bread (3 <= 5)
    });

    test('sets correct timestamp and date', async () => {
      const beforeTest = new Date();
      const result = await createStockSnapshot(mockDailyItems, 'daily', 'Test User');
      const afterTest = new Date();
      
      const snapshotTime = new Date(result.snapshot.timestamp);
      expect(snapshotTime.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(snapshotTime.getTime()).toBeLessThanOrEqual(afterTest.getTime());
      
      expect(result.snapshot.date).toBe(new Date().toISOString().split('T')[0]);
    });

    test('handles items with missing or invalid data', async () => {
      const invalidItems = [
        {
          id: '1',
          name: 'Valid Item',
          category: 'test',
          currentStock: 5,
          minLevel: 2,
          unit: 'pieces',
          cost: 1.0,
          lastUsed: '2024-01-15',
          optimalLevel: 10
        },
        {
          id: '2',
          name: 'Invalid Item',
          category: 'test',
          currentStock: -1, // Invalid stock
          minLevel: 0,
          unit: '',
          cost: 0,
          lastUsed: '',
          optimalLevel: 0
        }
      ] as InventoryItem[];
      
      const result = await createStockSnapshot(invalidItems, 'daily', 'Test User');
      
      expect(result.snapshot.totalItems).toBe(2);
      expect(result.snapshot.itemCounts['1']).toBeDefined();
      expect(result.snapshot.itemCounts['2']).toBeDefined();
      
      // Should handle invalid data gracefully
      const invalidItem = result.snapshot.itemCounts['2'];
      expect(invalidItem.currentStock).toBe(0); // Should be normalized
      expect(invalidItem.totalValue).toBe(0);
    });
  });

  describe('generateSnapshotSummary', () => {
    test('generates correct summary for valid snapshot', () => {
      const mockSnapshot: StockCountSnapshot = {
        date: '2024-01-15',
        frequency: 'daily',
        timestamp: '2024-01-15T23:59:59Z',
        totalItems: 3,
        totalValue: 100,
        itemCounts: {
          '1': {
            
            itemName: 'Item 1',
            category: 'test',
            frequency: 'daily',
            currentStock: 10,
            minLevel: 5,
            unit: 'pieces',
            unitCost: 2,
            totalValue: 20,
            lastCountDate: '2024-01-15',
            countedBy: 'Test User',
            optimalLevel: 15
          },
          '2': {
            
            itemName: 'Item 2',
            category: 'test',
            frequency: 'daily',
            currentStock: 2,
            minLevel: 5,
            unit: 'pieces',
            unitCost: 3,
            totalValue: 6,
            lastCountDate: '2024-01-15',
            countedBy: 'Test User',
            optimalLevel: 10
          },
          '3': {
            
            itemName: 'Item 3',
            category: 'test',
            frequency: 'daily',
            currentStock: 0,
            minLevel: 1,
            unit: 'pieces',
            unitCost: 5,
            totalValue: 0,
            lastCountDate: '2024-01-15',
            countedBy: 'Test User',
            optimalLevel: 5
          }
        },
        summary: {
          dailyItemsCount: 0,
          weeklyItemsCount: 0,
          monthlyItemsCount: 0,
          totalInventoryValue: 0,
          outOfStockItems: 0,
          criticalStockItems: 0,
          lowStockItems: 0
        }
      };

      const summary = generateSnapshotSummary(mockSnapshot);

      expect(summary.totalInventoryValue).toBe(100);
      expect(summary.outOfStockItems).toBe(1); // Item 3
      expect(summary.criticalStockItems).toBe(0);
      expect(summary.lowStockItems).toBe(1); // Item 2
      expect(summary.dailyItemsCount).toBe(3);
    });

    test('handles empty snapshot', () => {
      const emptySnapshot: StockCountSnapshot = {
        date: '2024-01-15',
        frequency: 'daily',
        timestamp: '2024-01-15T23:59:59Z',
        totalItems: 0,
        totalValue: 0,
        itemCounts: {},
        summary: {
          dailyItemsCount: 0,
          weeklyItemsCount: 0,
          monthlyItemsCount: 0,
          totalInventoryValue: 0,
          outOfStockItems: 0,
          criticalStockItems: 0,
          lowStockItems: 0
        }
      };

      const summary = generateSnapshotSummary(emptySnapshot);

      expect(summary.totalInventoryValue).toBe(0);
      expect(summary.outOfStockItems).toBe(0);
      expect(summary.criticalStockItems).toBe(0);
      expect(summary.lowStockItems).toBe(0);
      expect(summary.dailyItemsCount).toBe(0);
    });

    test('counts items by frequency correctly', () => {
      const mixedSnapshot: StockCountSnapshot = {
        date: '2024-01-15',
        frequency: 'daily',
        timestamp: '2024-01-15T23:59:59Z',
        totalItems: 3,
        totalValue: 30,
        itemCounts: {
          '1': {
            
            itemName: 'Daily Item',
            category: 'test',
            frequency: 'daily',
            currentStock: 5,
            minLevel: 2,
            unit: 'pieces',
            unitCost: 2,
            totalValue: 10,
            lastCountDate: '2024-01-15',
            countedBy: 'Test User',
            optimalLevel: 8
          },
          '2': {
            
            itemName: 'Weekly Item',
            category: 'test',
            frequency: 'weekly',
            currentStock: 5,
            minLevel: 2,
            unit: 'pieces',
            unitCost: 2,
            totalValue: 10,
            lastCountDate: '2024-01-15',
            countedBy: 'Test User',
            optimalLevel: 8
          },
          '3': {
            
            itemName: 'Monthly Item',
            category: 'test',
            frequency: 'monthly',
            currentStock: 5,
            minLevel: 2,
            unit: 'pieces',
            unitCost: 2,
            totalValue: 10,
            lastCountDate: '2024-01-15',
            countedBy: 'Test User',
            optimalLevel: 8
          }
        },
        summary: {
          dailyItemsCount: 0,
          weeklyItemsCount: 0,
          monthlyItemsCount: 0,
          totalInventoryValue: 0,
          outOfStockItems: 0,
          criticalStockItems: 0,
          lowStockItems: 0
        }
      };

      const summary = generateSnapshotSummary(mixedSnapshot);

      expect(summary.dailyItemsCount).toBe(1);
      expect(summary.weeklyItemsCount).toBe(1);
      expect(summary.monthlyItemsCount).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      const { addStockCountSnapshot } = require('../firebaseService');
      addStockCountSnapshot.mockRejectedValueOnce(new Error('Network error'));

      await expect(createStockSnapshot(mockDailyItems, 'daily', 'Test User'))
        .rejects.toThrow('Network error');
    });

    test('handles malformed item data', async () => {
      const malformedItems = [
        null,
        undefined,
        {},
        {
          id: '1',
          name: 'Valid Item',
          category: 'test',
          currentStock: 5,
          minLevel: 2,
          unit: 'pieces',
          cost: 1.0,
          lastUsed: '2024-01-15',
          optimalLevel: 10
        }
      ] as any[];

      // Should not crash with malformed data
      const result = await createStockSnapshot(malformedItems, 'daily', 'Test User');
      expect(result).toBeDefined();
      
      // Should only process valid items
      expect(result.snapshot.totalItems).toBe(1);
    });

    test('validates snapshot data integrity', () => {
      const invalidSnapshot = {
        date: '2024-01-15',
        frequency: 'daily',
        timestamp: '2024-01-15T23:59:59Z',
        totalItems: 1,
        totalValue: 100,
        itemCounts: {
          '1': null, // Invalid item
          '2': {
            
            itemName: 'Valid Item',
            category: 'test',
            frequency: 'daily',
            currentStock: 10,
            minLevel: 5,
            unit: 'pieces',
            unitCost: 10,
            totalValue: 100,
            lastCountDate: '2024-01-15',
            countedBy: 'Test User',
            optimalLevel: 15
          }
        },
        summary: {
          dailyItemsCount: 0,
          weeklyItemsCount: 0,
          monthlyItemsCount: 0,
          totalInventoryValue: 0,
          outOfStockItems: 0,
          criticalStockItems: 0,
          lowStockItems: 0
        }
      } as any;

      // Should handle invalid items gracefully
      const summary = generateSnapshotSummary(invalidSnapshot);
      expect(summary).toBeDefined();
      expect(summary.dailyItemsCount).toBe(1); // Only count valid items
    });
  });

  describe('Performance', () => {
    test('handles large datasets efficiently', async () => {
      const largeItemSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        name: `Item ${i}`,
        category: 'test',
        currentStock: i % 10,
        minLevel: 5,
        unit: 'pieces',
        cost: 1.0,
        lastUsed: '2024-01-15',
        optimalLevel: 10
      })) as InventoryItem[];

      const startTime = Date.now();
      const result = await createStockSnapshot(largeItemSet, 'daily', 'Test User');
      const endTime = Date.now();

      expect(result.snapshot.totalItems).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('maintains accuracy with floating point calculations', async () => {
      const precisionItems = [
        {
          id: '1',
          name: 'Precision Item 1',
          category: 'test',
          currentStock: 3.33,
          minLevel: 2,
          unit: 'kg',
          cost: 1.11,
          lastUsed: '2024-01-15',
          optimalLevel: 5
        },
        {
          id: '2',
          name: 'Precision Item 2',
          category: 'test',
          currentStock: 2.67,
          minLevel: 1,
          unit: 'kg',
          cost: 0.89,
          lastUsed: '2024-01-15',
          optimalLevel: 4
        }
      ] as InventoryItem[];

      const result = await createStockSnapshot(precisionItems, 'daily', 'Test User');
      
      // Check precision is maintained
      expect(result.snapshot.itemCounts['1'].totalValue).toBeCloseTo(3.6963, 4);
      expect(result.snapshot.itemCounts['2'].totalValue).toBeCloseTo(2.3763, 4);
      expect(result.snapshot.totalValue).toBeCloseTo(6.0726, 4);
    });
  });
});