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

    it('should return enabled=true when localStorage has "true"', () => {
      localStorageMock.getItem.mockReturnValue('true');
      const settings = getNotificationSettings();
      expect(settings.enabled).toBe(true);
    });
  });

  describe('setNotificationEnabled', () => {
    it('should request permission and save to localStorage when enabling', async () => {
      (window.Notification as any).requestPermission.mockResolvedValue('granted');
      
      const result = await setNotificationEnabled(true);
      
      expect(window.Notification.requestPermission).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('inventory_notifications_enabled', 'true');
      expect(result).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      (window.Notification as any).requestPermission.mockResolvedValue('denied');
      
      const result = await setNotificationEnabled(true);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('inventory_notifications_enabled', 'false');
      expect(result).toBe(false);
    });

    it('should save false to localStorage when disabling', async () => {
      const result = await setNotificationEnabled(false);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('inventory_notifications_enabled', 'false');
      expect(result).toBe(false);
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
      cost: 5.99,
      supplier: 'Test Supplier',
      notes: 'Test notes'
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
          icon: '/favicon.ico',
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
          icon: '/favicon.ico',
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
  });
});