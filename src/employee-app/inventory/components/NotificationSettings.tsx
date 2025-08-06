// src/employee-app/inventory/components/NotificationSettings.tsx
import React, { useState, useEffect } from 'react';
import { Bell, BellOff, AlertTriangle, CheckCircle, Info, TestTube } from 'lucide-react';
import { 
  getNotificationSettings, 
  setNotificationEnabled, 
  isNotificationSupported,
  isPWAMode,
  isIOS,
  isServiceWorkerSupported,
  sendTestNotification,
  debugNotificationStatus
} from '../notificationService';

const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState(getNotificationSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Update settings when component mounts and periodically
  useEffect(() => {
    const updateSettings = () => {
      setSettings(getNotificationSettings());
    };

    updateSettings();
    
    // Check for permission changes every few seconds
    const interval = setInterval(updateSettings, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const handleToggleNotifications = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await setNotificationEnabled(!settings.enabled);
      
      if (result.success) {
        setSuccess(settings.enabled 
          ? 'Notifications disabled successfully' 
          : 'Notifications enabled successfully! You will now receive alerts when inventory levels change.'
        );
        setSettings(getNotificationSettings());
      } else {
        setError(result.error || 'Failed to update notification settings');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = () => {
    if (settings.enabled && settings.permission === 'granted') {
      sendTestNotification();
      setSuccess('Test notification sent! Check your device for the notification.');
    } else {
      setError('Notifications must be enabled first before sending test notifications.');
    }
  };

  const handleDebug = () => {
    debugNotificationStatus();
    setSuccess('Debug information logged to browser console (F12 > Console)');
  };

  const getStatusColor = () => {
    if (!isNotificationSupported()) return 'text-gray-500';
    if (settings.enabled && settings.permission === 'granted') return 'text-green-600';
    if (settings.permission === 'denied') return 'text-red-600';
    return 'text-yellow-600';
  };

  const getStatusIcon = () => {
    if (!isNotificationSupported()) return <AlertTriangle className="w-5 h-5" />;
    if (settings.enabled && settings.permission === 'granted') return <CheckCircle className="w-5 h-5" />;
    if (settings.permission === 'denied') return <BellOff className="w-5 h-5" />;
    return <Bell className="w-5 h-5" />;
  };

  const getStatusText = () => {
    if (!isNotificationSupported()) return 'Not supported in this browser';
    if (settings.enabled && settings.permission === 'granted') return 'Notifications enabled';
    if (settings.permission === 'denied') return 'Permission denied';
    if (settings.permission === 'default') return 'Permission not requested';
    return 'Notifications disabled';
  };

  const getAdvancedInfo = () => {
    const info = [];
    
    if (isPWAMode()) {
      info.push('PWA mode detected - using enhanced notifications for better mobile experience');
    }
    
    if (isIOS()) {
      info.push('iOS optimized notifications enabled');
    }
    
    if (isServiceWorkerSupported()) {
      info.push('Service Worker support available for background notifications');
    }
    
    if (settings.permission === 'granted') {
      info.push('Permission granted - notifications will work even when the app is closed');
    }
    
    return info;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Inventory Notifications</h3>
      </div>
      
      <div className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className={getStatusColor()}>
            {getStatusIcon()}
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{getStatusText()}</div>
            <div className="text-sm text-gray-600">
              Get notified when items are out of stock or running low (≤20%)
            </div>
          </div>
        </div>

        {/* Advanced Information */}
        {getAdvancedInfo().length > 0 && (
          <div className="space-y-2">
            {getAdvancedInfo().map((info, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{info}</span>
              </div>
            ))}
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800">{success}</div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          {/* Enable/Disable Toggle */}
          {isNotificationSupported() && (
            <button
              onClick={handleToggleNotifications}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                settings.enabled
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : settings.enabled ? (
                <BellOff className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {isLoading ? 'Updating...' : settings.enabled ? 'Disable Notifications' : 'Enable Notifications'}
            </button>
          )}

          {/* Test Notification */}
          {settings.enabled && settings.permission === 'granted' && (
            <button
              onClick={handleTestNotification}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <TestTube className="w-4 h-4" />
              Send Test Notification
            </button>
          )}

          {/* Debug Information */}
          <button
            onClick={handleDebug}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            <Info className="w-4 h-4" />
            Debug Info
          </button>
        </div>

        {/* Browser Permission Help */}
        {settings.permission === 'denied' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Permission Denied</h4>
            <p className="text-sm text-yellow-700 mb-3">
              To enable notifications, you need to allow them in your browser settings:
            </p>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Click the lock/notification icon in your browser's address bar</li>
              <li>Set notifications to "Allow"</li>
              <li>Refresh this page and try enabling notifications again</li>
            </ol>
          </div>
        )}

        {/* Not Supported Help */}
        {!isNotificationSupported() && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Notifications Not Supported</h4>
            <p className="text-sm text-gray-600">
              Your browser doesn't support notifications. Please use a modern browser like Chrome, Firefox, Safari, or Edge.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;