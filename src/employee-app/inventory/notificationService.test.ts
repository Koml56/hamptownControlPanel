// src/employee-app/inventory/notificationService.test.ts
import { 
  getNotificationSettings, 
  setNotificationEnabled, 
  isNotificationSupported, 
  sendInventoryNotification 
} from './notificationService';
import { InventoryItem } from '../types';

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: jest.fn().mockImplementation((title, options) => ({
    title,
    options,
    close: jest.fn(),
    onclick: null
  })),
  writable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (window.Notification as any).permission = 'default';
    (window.Notification as any).requestPermission = jest.fn().mockResolvedValue('granted');
  });

  describe('isNotificationSupported', () => {
    it('should return true when Notification is available', () => {
      expect(isNotificationSupported()).toBe(true);
    });

    it('should return false when Notification is not available', () => {
      // Mock window as undefined
      const originalWindow = global.window;
      delete (global as any).window;
      expect(isNotificationSupported()).toBe(false);
      global.window = originalWindow;
    });
  });

  describe('getNotificationSettings', () => {
    it('should return default settings when nothing in localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const settings = getNotificationSettings();
      expect(settings).toEqual({
        enabled: false,
        permission: 'default'
      });
    });

    it('should return enabled=true when localStorage has "true" AND permission is granted', () => {
      localStorageMock.getItem.mockReturnValue('true');
      (window.Notification as any).permission = 'granted';
      const settings = getNotificationSettings();
      expect(settings.enabled).toBe(true);
    });

    it('should return enabled=false when localStorage has "true" but permission is not granted', () => {
      localStorageMock.getItem.mockReturnValue('true');
      (window.Notification as any).permission = 'denied';
      const settings = getNotificationSettings();
      expect(settings.enabled).toBe(false);
      // Should also fix the localStorage inconsistency
      expect(localStorageMock.setItem).toHaveBeenCalledWith('inventory_notifications_enabled', 'false');
    });
  });

  describe('setNotificationEnabled', () => {
    it('should request permission and save to localStorage when enabling', async () => {
      (window.Notification as any).requestPermission.mockResolvedValue('granted');
      
      const result = await setNotificationEnabled(true);
      
      expect(window.Notification.requestPermission).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('inventory_notifications_enabled', 'true');
      expect(result.success).toBe(true);
      expect(result.permission).toBe('granted');
    });

    it('should return error when permission is denied', async () => {
      (window.Notification as any).requestPermission.mockResolvedValue('denied');
      
      const result = await setNotificationEnabled(true);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('inventory_notifications_enabled', 'false');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Notification permission denied');
      expect(result.permission).toBe('denied');
    });

    it('should save false to localStorage when disabling', async () => {
      const result = await setNotificationEnabled(false);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('inventory_notifications_enabled', 'false');
      expect(result.success).toBe(true);
    });
  });

  describe('sendInventoryNotification', () => {
    const mockItem: InventoryItem = {
      id: 1,
      name: 'Test Item',
      category: 'test',
      unit: 'pieces',
      currentStock: 0,
      minLevel: 10,
      optimalLevel: 20,
      frequency: 'daily',
      lastUsed: '2025-01-01',
      cost: 5.99
    };

    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('true');
      (window.Notification as any).permission = 'granted';
    });

    it('should send out of stock notification when stock goes to 0', () => {
      sendInventoryNotification(mockItem, 5);
      
      expect(window.Notification).toHaveBeenCalledWith(
        'Out of Stock Alert!',
        expect.objectContaining({
          body: 'We are out of Test Item. Immediate restocking required.',
          icon: '/hamptownControlPanel/favicon.ico',
          tag: 'inventory-1'
        })
      );
    });

    it('should send low stock notification when stock drops to 20% or below', () => {
      const lowStockItem = { ...mockItem, currentStock: 2 }; // 2/10 = 20%
      sendInventoryNotification(lowStockItem, 5);
      
      expect(window.Notification).toHaveBeenCalledWith(
        'Low Stock Alert!',
        expect.objectContaining({
          body: 'Only 20% left of Test Item. Consider restocking soon.',
          icon: '/hamptownControlPanel/favicon.ico',
          tag: 'inventory-1'
        })
      );
    });

    it('should not send notification when notifications are disabled', () => {
      localStorageMock.getItem.mockReturnValue('false');
      
      sendInventoryNotification(mockItem, 5);
      
      expect(window.Notification).not.toHaveBeenCalled();
    });

    it('should not send notification when permission is not granted', () => {
      (window.Notification as any).permission = 'denied';
      
      sendInventoryNotification(mockItem, 5);
      
      expect(window.Notification).not.toHaveBeenCalled();
    });

    it('should not send notification when stock level is improving', () => {
      const goodStockItem = { ...mockItem, currentStock: 15 }; // Above 20%
      sendInventoryNotification(goodStockItem, 5);
      
      expect(window.Notification).not.toHaveBeenCalled();
    });

    it('should not send duplicate notifications (same percentage level)', () => {
      // First call at 20%
      const lowStockItem = { ...mockItem, currentStock: 2 };
      sendInventoryNotification(lowStockItem, 3);
      
      // Second call still at 20%
      sendInventoryNotification(lowStockItem, 2);
      
      // Should only be called once
      expect(window.Notification).toHaveBeenCalledTimes(1);
    });

    it('should send notification when already low stock gets lower', () => {
      // Stock goes from 2 (20%) to 1 (10%) - both are ≤20%
      const veryLowStockItem = { ...mockItem, currentStock: 1 };
      sendInventoryNotification(veryLowStockItem, 2);
      
      expect(window.Notification).toHaveBeenCalledWith(
        'Low Stock Alert!',
        expect.objectContaining({
          body: 'Only 10% left of Test Item. Consider restocking soon.',
          icon: '/hamptownControlPanel/favicon.ico',
          tag: 'inventory-1'
        })
      );
    });

    it('should not send notification for small decreases in already low stock', () => {
      // Stock goes from 2.5 to 2.4 - less than 1 unit change
      const veryLowStockItem = { ...mockItem, currentStock: 2.4 };
      sendInventoryNotification(veryLowStockItem, 2.5);
      
      expect(window.Notification).not.toHaveBeenCalled();
    });
  });

  describe('checkInventoryChanges', () => {
    const mockItems: InventoryItem[] = [
      {
        id: 1,
        name: 'Test Item 1',
        category: 'test',
        unit: 'pieces',
        currentStock: 5,
        minLevel: 10,
        optimalLevel: 20,
        frequency: 'daily',
        lastUsed: '2025-01-01',
        cost: 5.99
      },
      {
        id: 2,
        name: 'Test Item 2',
        category: 'test',
        unit: 'pieces',
        currentStock: 15,
        minLevel: 20,
        optimalLevel: 40,
        frequency: 'daily',
        lastUsed: '2025-01-01',
        cost: 3.99
      }
    ];

    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('true');
      (window.Notification as any).permission = 'granted';
    });

    it('should check all items for changes and send notifications', () => {
      const previousItems = [
        { ...mockItems[0], currentStock: 5 }, // Was 5 (50%), now 1 (10%) - should notify
        { ...mockItems[1], currentStock: 20 } // Was OK, now same - no change
      ];

      const newItems = [
        { ...mockItems[0], currentStock: 1 }, // 1/10 = 10% (≤20%)
        { ...mockItems[1], currentStock: 20 } // No change
      ];

      const { checkInventoryChanges } = require('./notificationService');
      checkInventoryChanges(newItems, previousItems);
      
      // Should send notification for first item (already low, getting lower by ≥1 unit)
      expect(window.Notification).toHaveBeenCalledWith(
        'Low Stock Alert!',
        expect.objectContaining({
          body: 'Only 10% left of Test Item 1. Consider restocking soon.'
        })
      );
    });

    it('should send notifications when crossing the 20% threshold', () => {
      const previousItems = [
        { ...mockItems[0], currentStock: 3, minLevel: 10 }, // Was 30% (>20%)
      ];

      const newItems = [
        { ...mockItems[0], currentStock: 2, minLevel: 10 }, // Now 20% (≤20%)
      ];

      const { checkInventoryChanges } = require('./notificationService');
      checkInventoryChanges(newItems, previousItems);
      
      // Should send notification for crossing threshold
      expect(window.Notification).toHaveBeenCalledWith(
        'Low Stock Alert!',
        expect.objectContaining({
          body: 'Only 20% left of Test Item 1. Consider restocking soon.'
        })
      );
    });

    it('should not send notifications for items with no stock change', () => {
      const { checkInventoryChanges } = require('./notificationService');
      checkInventoryChanges(mockItems, mockItems);
      
      expect(window.Notification).not.toHaveBeenCalled();
    });

    it('should handle missing previous items gracefully', () => {
      const { checkInventoryChanges } = require('./notificationService');
      
      // Should not throw error
      expect(() => {
        checkInventoryChanges(mockItems, []);
        checkInventoryChanges([], mockItems);
        checkInventoryChanges(null as any, mockItems);
        checkInventoryChanges(mockItems, null as any);
      }).not.toThrow();
      
      expect(window.Notification).not.toHaveBeenCalled();
    });
  });
});