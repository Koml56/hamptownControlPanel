// stockUtils.test.ts - Tests for stock management utilities
import { handleStockUpdate, getStockStatus, markAsOrdered } from './stockUtils';
import { InventoryItem } from '../types';

describe('stockUtils', () => {
  const mockItem: InventoryItem = {
    id: 1,
    name: 'Test Item',
    category: 'food',
    currentStock: 2,
    minLevel: 10,
    optimalLevel: 20,
    unit: 'pieces',
    lastUsed: '2025-01-01',
    cost: 5.0,
    frequency: 'daily'
  };

  describe('handleStockUpdate', () => {
    it('should clear ordered status when stock is replenished above critical levels', () => {
      // Create item with ordered status and critical stock (20% of minLevel = 2)
      const orderedItem: InventoryItem = {
        ...mockItem,
        currentStock: 2, // 20% of 10 = critical
        orderedStatus: {
          isOrdered: true,
          orderedDate: new Date(),
          orderedQuantity: 10,
          expectedDelivery: new Date()
        }
      };

      // Update stock to above critical (6 > 20% of 10)
      const { updatedItem } = handleStockUpdate(orderedItem, 6);

      // Ordered status should be cleared
      expect(updatedItem.orderedStatus).toBeUndefined();
      expect(updatedItem.currentStock).toBe(6);
    });

    it('should clear ordered status when stock moves to "ok" level', () => {
      const orderedItem: InventoryItem = {
        ...mockItem,
        currentStock: 1, // Critical level
        orderedStatus: {
          isOrdered: true,
          orderedDate: new Date(),
          orderedQuantity: 15
        }
      };

      // Update to "ok" level (>50% of minLevel)
      const { updatedItem } = handleStockUpdate(orderedItem, 8); // 80% of 10

      expect(updatedItem.orderedStatus).toBeUndefined();
    });

    it('should keep ordered status when stock remains at critical levels', () => {
      const orderedItem: InventoryItem = {
        ...mockItem,
        currentStock: 1,
        orderedStatus: {
          isOrdered: true,
          orderedDate: new Date(),
          orderedQuantity: 5
        }
      };

      // Update but still at critical level
      const { updatedItem } = handleStockUpdate(orderedItem, 2); // Still 20% of 10

      expect(updatedItem.orderedStatus).toBeDefined();
      expect(updatedItem.orderedStatus?.isOrdered).toBe(true);
    });

    it('should keep ordered status when stock decreases', () => {
      const orderedItem: InventoryItem = {
        ...mockItem,
        currentStock: 2,
        orderedStatus: {
          isOrdered: true,
          orderedDate: new Date(),
          orderedQuantity: 8
        }
      };

      // Stock decreases (consumption, not delivery)
      const { updatedItem } = handleStockUpdate(orderedItem, 1);

      expect(updatedItem.orderedStatus).toBeDefined();
      expect(updatedItem.orderedStatus?.isOrdered).toBe(true);
    });

    it('should not affect items without ordered status', () => {
      const normalItem: InventoryItem = {
        ...mockItem,
        currentStock: 2
        // No orderedStatus
      };

      const { updatedItem } = handleStockUpdate(normalItem, 8);

      expect(updatedItem.orderedStatus).toBeUndefined();
      expect(updatedItem.currentStock).toBe(8);
    });

    it('should clear ordered status when stock moves from critical to low', () => {
      const orderedItem: InventoryItem = {
        ...mockItem,
        currentStock: 1, // Critical (10% of 10)
        orderedStatus: {
          isOrdered: true,
          orderedDate: new Date(),
          orderedQuantity: 10
        }
      };

      // Update to low level (30% of minLevel)
      const { updatedItem } = handleStockUpdate(orderedItem, 3);

      expect(updatedItem.orderedStatus).toBeUndefined();
    });
  });

  describe('getStockStatus', () => {
    it('should return correct status for different stock levels', () => {
      expect(getStockStatus(0, 10)).toBe('out');
      expect(getStockStatus(1, 10)).toBe('critical'); // 10%
      expect(getStockStatus(2, 10)).toBe('critical'); // 20%
      expect(getStockStatus(3, 10)).toBe('low'); // 30%
      expect(getStockStatus(5, 10)).toBe('low'); // 50%
      expect(getStockStatus(6, 10)).toBe('ok'); // 60%
    });
  });

  describe('markAsOrdered integration', () => {
    it('should allow re-ordering after ordered status is cleared', () => {
      // Start with critical item
      const criticalItem: InventoryItem = {
        ...mockItem,
        currentStock: 2 // Critical level
      };

      // Mark as ordered
      const [orderedItem] = markAsOrdered([criticalItem], ['1'], [10]);
      expect(orderedItem.orderedStatus?.isOrdered).toBe(true);

      // Simulate delivery - stock increases above critical
      const { updatedItem: restockedItem } = handleStockUpdate(orderedItem, 8);
      expect(restockedItem.orderedStatus).toBeUndefined();

      // Stock decreases to critical again
      const { updatedItem: lowStockItem } = handleStockUpdate(restockedItem, 1);
      expect(lowStockItem.orderedStatus).toBeUndefined();
      expect(getStockStatus(lowStockItem.currentStock, lowStockItem.minLevel)).toBe('critical');

      // Should be able to mark as ordered again
      const [reorderedItem] = markAsOrdered([lowStockItem], ['1'], [15]);
      expect(reorderedItem.orderedStatus?.isOrdered).toBe(true);
    });
  });
});