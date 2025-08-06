// src/employee-app/inventory/notificationService.ts
import { InventoryItem } from '../types';

// Local storage key for notification preferences
const NOTIFICATION_PREF_KEY = 'inventory_notifications_enabled';

export interface NotificationSettings {
  enabled: boolean;
  permission: NotificationPermission;
}

export interface NotificationResult {
  success: boolean;
  error?: string;
  permission?: NotificationPermission;
}

// Get notification preference from localStorage (device-specific) with validation
export const getNotificationSettings = (): NotificationSettings => {
  if (typeof window === 'undefined') {
    return { enabled: false, permission: 'denied' };
  }

  const stored = localStorage.getItem(NOTIFICATION_PREF_KEY);
  const permission = 'Notification' in window ? Notification.permission : 'denied';
  
  // Only consider notifications enabled if both localStorage says true AND permission is granted
  const enabled = stored === 'true' && permission === 'granted';
  
  // Debug logging
  console.log('🔍 Notification settings:', {
    stored,
    permission,
    enabled,
    supported: 'Notification' in window
  });
  
  // If localStorage says enabled but permission isn't granted, fix the inconsistency
  if (stored === 'true' && permission !== 'granted') {
    console.warn('⚠️ Notification settings inconsistent - localStorage says enabled but permission not granted');
    localStorage.setItem(NOTIFICATION_PREF_KEY, 'false');
    return { enabled: false, permission };
  }
  
  return { enabled, permission };
};

// Set notification preference in localStorage with enhanced error handling
export const setNotificationEnabled = async (enabled: boolean): Promise<{ success: boolean; error?: string; permission?: NotificationPermission }> => {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window not available' };
  }
  
  if (!enabled) {
    // Disabling notifications - always succeeds
    localStorage.setItem(NOTIFICATION_PREF_KEY, 'false');
    console.log('🔕 Notifications disabled by user');
    return { success: true, permission: Notification.permission };
  }

  if (!('Notification' in window)) {
    return { success: false, error: 'Notifications not supported in this browser' };
  }

  try {
    console.log('🔔 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('🔔 Permission result:', permission);
    
    if (permission === 'granted') {
      localStorage.setItem(NOTIFICATION_PREF_KEY, 'true');
      console.log('✅ Notifications enabled successfully');
      return { success: true, permission };
    } else if (permission === 'denied') {
      localStorage.setItem(NOTIFICATION_PREF_KEY, 'false');
      return { 
        success: false, 
        error: 'Notification permission denied. Please enable notifications in your browser settings.',
        permission 
      };
    } else {
      // Permission is 'default' - user dismissed dialog without choice
      localStorage.setItem(NOTIFICATION_PREF_KEY, 'false');
      return { 
        success: false, 
        error: 'Permission request was dismissed. Please try again and allow notifications.',
        permission 
      };
    }
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    localStorage.setItem(NOTIFICATION_PREF_KEY, 'false');
    return { 
      success: false, 
      error: `Failed to request permission: ${error instanceof Error ? error.message : 'Unknown error'}`,
      permission: Notification.permission
    };
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
  // FIXED: Improved low stock condition - alert on any significant decrease in low stock levels
  else if (currentPercentage <= 20 && currentPercentage > 0) {
    // Alert if crossing the 20% threshold OR if already low and getting significantly lower
    const shouldAlert = previousPercentage > 20 || // Crossing threshold
                       (previousPercentage <= 20 && (previousStock - item.currentStock) >= 1); // Getting lower when already low
    
    if (shouldAlert) {
      title = 'Low Stock Alert!';
      body = `Only ${Math.round(currentPercentage)}% left of ${item.name}. Consider restocking soon.`;
    }
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

// ADDED: Check for inventory changes and send notifications for cross-device sync
export const checkInventoryChanges = (
  newItems: InventoryItem[], 
  previousItems: InventoryItem[]
): void => {
  if (!newItems || !previousItems) return;
  
  // Create maps for efficient lookup
  const previousMap = new Map(previousItems.map(item => [item.id.toString(), item]));
  
  // Check each new item against its previous state
  newItems.forEach(newItem => {
    const previousItem = previousMap.get(newItem.id.toString());
    
    if (previousItem && previousItem.currentStock !== newItem.currentStock) {
      // Stock changed - check if we should send notification
      sendInventoryNotification(newItem, previousItem.currentStock);
    }
  });
};

// ADDED: Debugging function to help troubleshoot notification issues
export const debugNotificationStatus = (): void => {
  if (typeof window === 'undefined') {
    console.log('🔍 Debug: Running in server environment');
    return;
  }

  const settings = getNotificationSettings();
  const stored = localStorage.getItem(NOTIFICATION_PREF_KEY);
  
  console.log('🔍 Notification Debug Status:', {
    browserSupported: 'Notification' in window,
    permission: Notification.permission,
    localStorage: stored,
    settingsEnabled: settings.enabled,
    settingsPermission: settings.permission,
    userAgent: navigator.userAgent,
    protocol: window.location.protocol,
    isSecureContext: window.isSecureContext
  });

  // Try sending a debug notification if enabled
  if (settings.enabled && settings.permission === 'granted') {
    console.log('🔍 Attempting debug notification...');
    sendTestNotification();
  }
};