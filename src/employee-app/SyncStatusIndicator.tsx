// SyncStatusIndicator.tsx - Enhanced with real multi-device sync status
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Check, Users, Smartphone, Monitor, Tablet, Globe, Settings, Eye, EyeOff, Activity } from 'lucide-react';
import type { DeviceInfo, SyncEvent } from './multiDeviceSync';

interface SyncStatusIndicatorProps {
  isLoading: boolean;
  lastSync: string | null;
  connectionStatus: 'connecting' | 'connected' | 'error';
  loadFromFirebase: () => void;
  // Multi-device sync props
  activeDevices: DeviceInfo[];
  syncEvents: SyncEvent[];
  deviceCount: number;
  isMultiDeviceEnabled: boolean;
  toggleMultiDeviceSync: () => void;
  refreshFromAllDevices: () => void;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  isLoading,
  lastSync,
  connectionStatus,
  loadFromFirebase,
  activeDevices,
  syncEvents,
  deviceCount,
  isMultiDeviceEnabled,
  toggleMultiDeviceSync,
  refreshFromAllDevices
}) => {
  const [showSyncPulse, setShowSyncPulse] = useState(false);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  const [recentSyncCount, setRecentSyncCount] = useState(0);

  // Show pulse animation when sync occurs
  useEffect(() => {
    if (syncEvents.length > 0) {
      const recentEvents = syncEvents.filter(event => 
        Date.now() - event.timestamp < 5000 // Last 5 seconds
      );
      
      setRecentSyncCount(recentEvents.length);
      
      if (recentEvents.length > 0) {
        setShowSyncPulse(true);
        const timer = setTimeout(() => {
          setShowSyncPulse(false);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [syncEvents]);

  const getStatusInfo = () => {
    if (isLoading) {
      return {
        icon: <RefreshCw className="w-4 h-4 animate-spin" />,
        text: 'Syncing...',
        color: 'border-blue-200 bg-blue-50',
        textColor: 'text-blue-700'
      };
    }

    if (connectionStatus === 'connected' && lastSync) {
      return {
        icon: showSyncPulse ? 
          <RefreshCw className="w-4 h-4 animate-spin text-green-600" /> : 
          <Check className="w-4 h-4" />,
        text: showSyncPulse ? 'Syncing...' : 'Synced',
        color: 'border-green-200 bg-green-50',
        textColor: 'text-green-700'
      };
    }

    if (connectionStatus === 'error') {
      return {
        icon: <WifiOff className="w-4 h-4" />,
        text: 'Offline',
        color: 'border-red-200 bg-red-50',
        textColor: 'text-red-700'
      };
    }

    return {
      icon: <Wifi className="w-4 h-4" />,
      text: 'Connecting...',
      color: 'border-yellow-200 bg-yellow-50',
      textColor: 'text-yellow-700'
    };
  };

  const getDeviceIcon = (device: DeviceInfo) => {
    if (device.name.includes('Mobile') || device.name.includes('iPhone') || device.name.includes('Android')) {
      return <Smartphone className="w-3 h-3" />;
    } else if (device.name.includes('Tablet') || device.name.includes('iPad')) {
      return <Tablet className="w-3 h-3" />;
    } else {
      return <Monitor className="w-3 h-3" />;
    }
  };

  const getDeviceColor = (device: DeviceInfo, index: number) => {
    const colors = ['text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500', 'text-pink-500'];
    return colors[index % colors.length];
  };

  const status = getStatusInfo();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Main Status Indicator */}
      <div 
        className={`
          backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border 
          transition-all duration-300 cursor-pointer hover:scale-105
          ${status.color} ${showSyncPulse ? 'animate-pulse' : ''}
        `}
        onClick={connectionStatus === 'error' ? loadFromFirebase : () => setShowDeviceDetails(!showDeviceDetails)}
        title={`
          Status: ${status.text}
          ${lastSync ? `Last sync: ${lastSync}` : ''}
          ${connectionStatus === 'error' ? 'Click to retry' : 'Click for device details'}
          ${isMultiDeviceEnabled ? `Active devices: ${deviceCount}` : 'Multi-device sync disabled'}
        `}
      >
        <div className="flex items-center space-x-2">
          {status.icon}
          <span className={`text-xs font-medium ${status.textColor}`}>
            {status.text}
          </span>
          
          {/* Multi-device indicator */}
          {connectionStatus === 'connected' && isMultiDeviceEnabled && (
            <div className="flex items-center space-x-1">
              <div className={`w-1 h-1 rounded-full bg-current opacity-30`} />
              <div className="flex items-center space-x-1">
                <Users className="w-3 h-3 opacity-60" />
                <span className="text-xs opacity-75">{deviceCount}</span>
              </div>
            </div>
          )}
          
          {/* Sync events indicator */}
          {recentSyncCount > 0 && (
            <div className="flex items-center space-x-1">
              <Activity className="w-3 h-3 opacity-60" />
              <span className="text-xs opacity-75">+{recentSyncCount}</span>
            </div>
          )}
        </div>
        
        {/* Real-time pulse indicator */}
        {showSyncPulse && (
          <div className="absolute -top-1 -right-1">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-ping" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full" />
          </div>
        )}
      </div>

      {/* Device Details Panel */}
      {showDeviceDetails && (
        <div className="absolute bottom-full right-0 mb-2 w-80 max-h-96 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <h3 className="font-medium text-gray-800">Multi-Device Sync</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMultiDeviceSync();
                    }}
                    className={`p-1 rounded transition-colors ${
                      isMultiDeviceEnabled 
                        ? 'text-green-600 hover:bg-green-100' 
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={`${isMultiDeviceEnabled ? 'Disable' : 'Enable'} multi-device sync`}
                  >
                    {isMultiDeviceEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeviceDetails(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {!isMultiDeviceEnabled ? (
                <div className="text-center py-6">
                  <EyeOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-3">Multi-device sync is disabled</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMultiDeviceSync();
                    }}
                    className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                  >
                    Enable Sync
                  </button>
                </div>
              ) : (
                <>
                  {/* Status Summary */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{deviceCount}</div>
                      <div className="text-xs text-gray-500">Active Devices</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{recentSyncCount}</div>
                      <div className="text-xs text-gray-500">Recent Syncs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{syncEvents.length}</div>
                      <div className="text-xs text-gray-500">Total Events</div>
                    </div>
                  </div>

                  {/* Active Devices */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Connected Devices</h4>
                    {activeDevices.length === 0 ? (
                      <div className="text-center py-3">
                        <Smartphone className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">No other devices detected</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeDevices.map((device, index) => (
                          <div key={device.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className={getDeviceColor(device, index)}>
                                {getDeviceIcon(device)}
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-800">
                                  {device.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {device.user}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`w-2 h-2 rounded-full ${
                                device.isActive ? 'bg-green-500' : 'bg-gray-300'
                              }`} />
                              <div className="text-xs text-gray-400">
                                {Math.round((Date.now() - device.lastSeen) / 1000)}s
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Sync Events */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
                    {syncEvents.length === 0 ? (
                      <div className="text-center py-3">
                        <Activity className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">No recent sync activity</p>
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {syncEvents.slice(-10).reverse().map((event, index) => (
                          <div key={`${event.timestamp}-${index}`} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                event.type === 'data_update' ? 'bg-blue-500' :
                                event.type === 'device_join' ? 'bg-green-500' :
                                event.type === 'device_leave' ? 'bg-red-500' :
                                'bg-purple-500'
                              }`} />
                              <span className="text-gray-600">
                                {event.type === 'data_update' ? `Updated ${event.field}` :
                                 event.type === 'device_join' ? 'Device joined' :
                                 event.type === 'device_leave' ? 'Device left' :
                                 'Conflict resolved'}
                              </span>
                            </div>
                            <span className="text-gray-400">
                              {Math.round((Date.now() - event.timestamp) / 1000)}s
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        refreshFromAllDevices();
                      }}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors flex items-center justify-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh All</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(`Device ID: ${activeDevices[0]?.id || 'Unknown'}`);
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200 transition-colors"
                      title="Copy device info"
                    >
                      📋
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDeviceDetails && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDeviceDetails(false)}
        />
      )}
    </div>
  );
};

export default SyncStatusIndicator;
