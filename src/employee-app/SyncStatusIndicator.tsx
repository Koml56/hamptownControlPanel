// SyncStatusIndicator.tsx - Simple blurry round design
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Check, Users, Globe, Eye, EyeOff } from 'lucide-react';
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
  const [showDetails, setShowDetails] = useState(false);
  const [recentSyncCount, setRecentSyncCount] = useState(0);

  // Show pulse animation when sync occurs
  useEffect(() => {
    if (syncEvents.length > 0) {
      const recentEvents = syncEvents.filter(event => 
        Date.now() - event.timestamp < 3000 // Last 3 seconds
      );
      
      setRecentSyncCount(recentEvents.length);
      
      if (recentEvents.length > 0) {
        setShowSyncPulse(true);
        const timer = setTimeout(() => {
          setShowSyncPulse(false);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [syncEvents]);

  const getStatusInfo = () => {
    if (isLoading) {
      return {
        icon: <RefreshCw className="w-5 h-5 animate-spin" />,
        text: 'Syncing',
        bgColor: 'bg-blue-500/80',
        pulseColor: 'bg-blue-400'
      };
    }

    if (connectionStatus === 'connected' && lastSync) {
      return {
        icon: showSyncPulse ? 
          <RefreshCw className="w-5 h-5 animate-spin" /> : 
          <Check className="w-5 h-5" />,
        text: showSyncPulse ? 'Syncing' : 'Synced',
        bgColor: 'bg-green-500/80',
        pulseColor: 'bg-green-400'
      };
    }

    if (connectionStatus === 'error') {
      return {
        icon: <WifiOff className="w-5 h-5" />,
        text: 'Offline',
        bgColor: 'bg-red-500/80',
        pulseColor: 'bg-red-400'
      };
    }

    return {
      icon: <Wifi className="w-5 h-5" />,
      text: 'Connecting',
      bgColor: 'bg-yellow-500/80',
      pulseColor: 'bg-yellow-400'
    };
  };

  const status = getStatusInfo();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Main floating status indicator - Simple round design */}
      <div className="relative">
        {/* Blurred backdrop */}
        <div 
          className={`
            w-14 h-14 rounded-full backdrop-blur-xl shadow-2xl border border-white/20
            transition-all duration-300 cursor-pointer transform hover:scale-110
            ${status.bgColor}
            ${showSyncPulse ? 'animate-pulse' : ''}
          `}
          onClick={connectionStatus === 'error' ? loadFromFirebase : () => setShowDetails(!showDetails)}
          title={`
            ${status.text}${lastSync ? ` - Last: ${lastSync}` : ''}
            ${connectionStatus === 'error' ? ' - Click to retry' : ' - Click for details'}
          `}
        >
          {/* Content */}
          <div className="flex items-center justify-center w-full h-full text-white">
            {status.icon}
          </div>
          
          {/* Multi-device indicator */}
          {connectionStatus === 'connected' && isMultiDeviceEnabled && deviceCount > 1 && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-lg">
              {deviceCount}
            </div>
          )}
          
          {/* Sync activity pulse */}
          {showSyncPulse && (
            <div className="absolute inset-0 rounded-full animate-ping">
              <div className={`w-full h-full rounded-full ${status.pulseColor} opacity-75`} />
            </div>
          )}
          
          {/* Outer glow for connection status */}
          <div className={`absolute inset-0 rounded-full ${status.pulseColor} opacity-20 blur-xl scale-150`} />
        </div>

        {/* Compact details popup */}
        {showDetails && (
          <div className="absolute bottom-full right-0 mb-4 w-72">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-3 border-b border-gray-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-800">Sync Status</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetails(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-gray-800">{deviceCount}</div>
                    <div className="text-xs text-gray-500">Devices</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-800">{recentSyncCount}</div>
                    <div className="text-xs text-gray-500">Recent</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-800">{syncEvents.length}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                </div>

                {/* Multi-device toggle */}
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Multi-device sync</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMultiDeviceSync();
                    }}
                    className={`p-1 rounded-lg transition-colors ${
                      isMultiDeviceEnabled 
                        ? 'text-green-600 hover:bg-green-100' 
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {isMultiDeviceEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>

                {/* Last sync */}
                {lastSync && (
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Last sync</div>
                    <div className="text-sm font-medium text-gray-700">{lastSync}</div>
                  </div>
                )}

                {/* Action button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectionStatus === 'error') {
                      loadFromFirebase();
                    } else {
                      refreshFromAllDevices();
                    }
                  }}
                  className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors text-sm font-medium"
                >
                  {connectionStatus === 'error' ? 'Reconnect' : 'Refresh All'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Click outside to close */}
        {showDetails && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDetails(false)}
          />
        )}
      </div>
    </div>
  );
};

export default SyncStatusIndicator;
