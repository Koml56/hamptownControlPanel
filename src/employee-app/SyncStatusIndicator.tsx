// SyncStatusIndicator.tsx - Enhanced floating orb with glass-morphism
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Globe, Users, Eye, EyeOff } from 'lucide-react';
import type { DeviceInfo, SyncEvent } from './multiDeviceSync';
import type { ConnectionStatus } from './types';

interface SyncStatusIndicatorProps {
  isLoading: boolean;
  lastSync: string | null;
  connectionStatus: ConnectionStatus;
  loadFromFirebase: () => void;
  // Multi-device sync props
  activeDevices?: DeviceInfo[];
  syncEvents?: SyncEvent[];
  deviceCount?: number;
  isMultiDeviceEnabled?: boolean;
  toggleMultiDeviceSync?: () => void;
  refreshFromAllDevices?: () => void;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  isLoading,
  lastSync,
  connectionStatus,
  loadFromFirebase,
  activeDevices = [],
  syncEvents = [],
  deviceCount = 1,
  isMultiDeviceEnabled = false,
  toggleMultiDeviceSync = () => {},
  refreshFromAllDevices = () => {}
}) => {
  const [showSyncPulse, setShowSyncPulse] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [recentSyncCount, setRecentSyncCount] = useState(0);

  // Add custom CSS for animation delays - FIXED
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .animation-delay-150 {
        animation-delay: 150ms;
      }
      .animation-delay-300 {
        animation-delay: 300ms;
      }
    `;
    document.head.appendChild(style);
    
    // Fixed: Return a cleanup function that returns void
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
        icon: <RefreshCw className="w-6 h-6 animate-spin" />,
        text: 'Syncing',
        bgColor: 'bg-blue-500/80',
        pulseColor: 'bg-blue-400'
      };
    }

    if (connectionStatus === 'connected' && lastSync) {
      return {
        icon: showSyncPulse ? 
          <RefreshCw className="w-6 h-6 animate-spin" /> : 
          <Globe className="w-6 h-6 animate-pulse" />,
        text: showSyncPulse ? 'Syncing' : 'Online',
        bgColor: 'bg-emerald-500/80',
        pulseColor: 'bg-emerald-400'
      };
    }

    if (connectionStatus === 'error') {
      return {
        icon: <WifiOff className="w-6 h-6" />,
        text: 'Offline',
        bgColor: 'bg-red-500/80',
        pulseColor: 'bg-red-400'
      };
    }

    return {
      icon: <Wifi className="w-6 h-6 animate-pulse" />,
      text: 'Connecting',
      bgColor: 'bg-amber-500/80',
      pulseColor: 'bg-amber-400'
    };
  };

  const status = getStatusInfo();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Main floating status orb - Enhanced glass-morphism design */}
      <div className="relative">
        {/* Multiple shadow layers for depth */}
        <div className="absolute inset-0 rounded-full bg-black/10 blur-xl scale-110" />
        <div className="absolute inset-0 rounded-full bg-black/5 blur-2xl scale-125" />
        
        {/* Main orb container */}
        <div 
          className={`
            relative w-16 h-16 rounded-full cursor-pointer transform transition-all duration-500 ease-out
            hover:scale-105 hover:rotate-12 active:scale-95
            ${showSyncPulse ? 'animate-pulse scale-105' : ''}
          `}
          onClick={connectionStatus === 'error' ? loadFromFirebase : () => setShowDetails(!showDetails)}
          title={`
            ${status.text}${lastSync ? ` - Last: ${lastSync}` : ''}
            ${connectionStatus === 'error' ? ' - Click to retry' : ' - Click for details'}
          `}
        >
          {/* Glass orb with multiple layers */}
          <div className={`
            absolute inset-0 rounded-full backdrop-blur-2xl ${status.bgColor}
            border border-white/30 shadow-2xl
          `} />
          
          {/* Inner glass reflection */}
          <div className="absolute inset-0.5 rounded-full bg-gradient-to-tr from-white/20 to-transparent" />
          
          {/* Blurred inner border */}
          <div className="absolute inset-1 rounded-full border border-white/40 backdrop-blur-sm" />
          
          {/* Content container */}
          <div className="relative flex items-center justify-center w-full h-full text-white">
            {status.icon}
          </div>
          
          {/* Multi-device indicator with glass effect */}
          {connectionStatus === 'connected' && isMultiDeviceEnabled && deviceCount > 1 && (
            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full backdrop-blur-xl bg-blue-500/90 
                          border border-white/50 shadow-xl flex items-center justify-center text-xs font-bold text-white
                          transform hover:scale-110 transition-transform">
              {deviceCount}
            </div>
          )}
          
          {/* Animated sync rings */}
          {showSyncPulse && (
            <>
              <div className="absolute inset-0 rounded-full animate-ping">
                <div className={`w-full h-full rounded-full ${status.pulseColor}/60 border-2 border-current`} />
              </div>
              <div className="absolute inset-0 rounded-full animate-ping animation-delay-150">
                <div className={`w-full h-full rounded-full ${status.pulseColor}/40 border border-current scale-110`} />
              </div>
            </>
          )}
          
          {/* Ambient glow effect */}
          <div className={`absolute inset-0 rounded-full ${status.pulseColor}/30 blur-2xl scale-150 animate-pulse`} />
        </div>

        {/* Enhanced glass-morphism details popup */}
        {showDetails && (
          <div className="absolute bottom-full right-0 mb-6 w-80">
            {/* Multiple backdrop layers for depth */}
            <div className="absolute inset-0 bg-black/5 rounded-3xl blur-2xl scale-105" />
            <div className="absolute inset-0 bg-black/10 rounded-2xl blur-xl" />
            
            <div className="relative bg-white/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/40 overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 px-5 py-4 border-b border-white/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Sync Status</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetails(false);
                    }}
                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 
                             text-gray-600 hover:text-gray-800 hover:bg-white/40 transition-all duration-200
                             flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content with enhanced glass effects */}
              <div className="p-5 space-y-5">
                {/* Stats grid with glass cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 text-center border border-white/30">
                    <div className="text-xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {deviceCount}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Devices</div>
                  </div>
                  <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 text-center border border-white/30">
                    <div className="text-xl font-bold bg-gradient-to-br from-emerald-600 to-green-600 bg-clip-text text-transparent">
                      {recentSyncCount}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Recent</div>
                  </div>
                  <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 text-center border border-white/30">
                    <div className="text-xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {syncEvents.length}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Events</div>
                  </div>
                </div>

                {/* Multi-device toggle with glass effect */}
                <div className="bg-white/30 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Multi-device sync</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMultiDeviceSync();
                      }}
                      className={`w-10 h-10 rounded-full backdrop-blur-sm border transition-all duration-200 flex items-center justify-center ${
                        isMultiDeviceEnabled 
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/30' 
                          : 'bg-gray-500/20 border-gray-500/40 text-gray-500 hover:bg-gray-500/30'
                      }`}
                    >
                      {isMultiDeviceEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Active devices list */}
                {isMultiDeviceEnabled && activeDevices.length > 0 && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                    <div className="text-sm font-medium text-gray-700 mb-3">Active Devices</div>
                    <div className="space-y-2">
                      {activeDevices.slice(0, 3).map((device) => (
                        <div key={device.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${device.isCurrentDevice ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                            <span className="text-xs text-gray-600">
                              {device.name}
                              {device.isCurrentDevice && ' (You)'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(device.lastSeen).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                      {activeDevices.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{activeDevices.length - 3} more devices
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Last sync info */}
                {lastSync && (
                  <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
                    <div className="text-xs text-gray-500 mb-1">Last synchronization</div>
                    <div className="text-sm font-semibold text-gray-700">{lastSync}</div>
                  </div>
                )}

                {/* Recent sync events */}
                {syncEvents.length > 0 && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                    <div className="text-sm font-medium text-gray-700 mb-3">Recent Activity</div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {syncEvents.slice(0, 5).map((event) => (
                        <div key={event.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">
                            {event.action === 'sync' && '🔄'}
                            {event.action === 'update' && '📝'}
                            {event.action === 'connect' && '🔗'}
                            {event.action === 'disconnect' && '🔌'}
                            {' '}
                            {event.action}
                          </span>
                          <span className="text-gray-500">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action button with gradient */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectionStatus === 'error') {
                      loadFromFirebase();
                    } else {
                      refreshFromAllDevices();
                    }
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 
                           text-white rounded-xl hover:from-blue-600 hover:via-purple-600 hover:to-indigo-600 
                           transition-all duration-300 text-sm font-semibold shadow-lg transform hover:scale-105
                           backdrop-blur-sm border border-white/20"
                >
                  {connectionStatus === 'error' ? 'Reconnect Now' : 'Refresh All Devices'}
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
