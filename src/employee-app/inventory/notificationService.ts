// src/employee-app/inventory/notificationService.ts
import { InventoryItem } from '../types';

// Local storage key for notification preferences
const NOTIFICATION_PREF_KEY = 'inventory_notifications_enabled';

export interface NotificationSettings {
  enabled: boolean;
  permission: NotificationPermission;
}

// Get notification preference from localStorage (device-specific)
export const getNotificationSettings = (): NotificationSettings => {
  const enabled = typeof window !== 'undefined' && localStorage.getItem(NOTIFICATION_PREF_KEY) === 'true';
  const permission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';
  
  return { enabled, permission };
};

// Set notification preference in localStorage
export const setNotificationEnabled = async (enabled: boolean): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  if (enabled && 'Notification' in window) {
    // Request permission when enabling notifications
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      localStorage.setItem(NOTIFICATION_PREF_KEY, 'true');
      return true;
    } else {
      localStorage.setItem(NOTIFICATION_PREF_KEY, 'false');
      return false;
    }
  } else {
    localStorage.setItem(NOTIFICATION_PREF_KEY, enabled ? 'true' : 'false');
    return enabled;
  }
};

// Check if notifications are supported
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

// Calculate stock percentage
const getStockPercentage = (currentStock: number, minLevel: number): number => {
  if (minLevel === 0) return currentStock > 0 ? 100 : 0;
  return (currentStock / minLevel) * 100;
};

// Send notification for inventory status
export const sendInventoryNotification = (item: InventoryItem, previousStock: number): void => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  
  const settings = getNotificationSettings();
  
  // Only send if notifications are enabled and permission granted
  if (!settings.enabled || settings.permission !== 'granted') {
    return;
  }

  const currentPercentage = getStockPercentage(item.currentStock, item.minLevel);
  const previousPercentage = getStockPercentage(previousStock, item.minLevel);
  
  let title: string | null = null;
  let body: string | null = null;
  let icon = '/favicon.ico'; // Use the app's favicon

  // Check for out of stock condition (0 stock)
  if (item.currentStock === 0 && previousStock > 0) {
    title = 'Out of Stock Alert!';
    body = `We are out of ${item.name}. Immediate restocking required.`;
  }
  // Check for low stock condition (≤20% of minimum level)
  else if (currentPercentage <= 20 && currentPercentage > 0 && previousPercentage > 20) {
    title = 'Low Stock Alert!';
    body = `Only ${Math.round(currentPercentage)}% left of ${item.name}. Consider restocking soon.`;
  }

  // Send notification if conditions are met
  if (title && body) {
    try {
      const notification = new Notification(title, {
        body,
        icon,
        badge: icon,
        tag: `inventory-${item.id}`, // Prevent duplicate notifications for same item
        requireInteraction: false, // Don't require user interaction to dismiss
        silent: false
      });

      // Auto-close notification after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      // Optional: Add click handler to focus the app
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }
};

// Test notification function for UI testing
export const sendTestNotification = (): void => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  
  const settings = getNotificationSettings();
  
  if (!settings.enabled || settings.permission !== 'granted') {
    return;
  }

  try {
    const notification = new Notification('Test Notification', {
      body: 'Inventory notifications are working correctly!',
      icon: '/favicon.ico',
      tag: 'test-notification'
    });

    setTimeout(() => {
      notification.close();
    }, 5000);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

  } catch (error) {
    console.error('Failed to send test notification:', error);
  }
};