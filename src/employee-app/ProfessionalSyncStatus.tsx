// ProfessionalSyncStatus.tsx - Enhanced sync status indicator
import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Smartphone, 
  Monitor, 
  Tablet, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Zap,
  Activity,
  Users
} from 'lucide-react';
import { DeviceInfo, SyncEvent } from './ProfessionalMultiDeviceSync';

interface ProfessionalSyncStatusProps {
  syncState: {
    isConnected: boolean;
    connectionQuality: 'excellent' | 'good' | 'poor';
    deviceCount: number;
    lastSync: number;
    syncEvents: SyncEvent[];
    isLoading: boolean;
    error: string | null;
  };
  activeDevices: DeviceInfo[];
  className?: string;
}

const getDeviceIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'mobile': return <Smartphone className="w-3 h-3" />;
    case 'tablet': return <Tablet className="w-3 h-3" />;
    default: return <Monitor className="w-3 h-3" />;
  }
};

const getConnectionColor = (quality: string, isConnected: boolean) => {
  if (!isConnected) return 'text-red-500';
  switch (quality) {
    case 'excellent': return 'text-green-500';
    case 'good': return 'text-yellow-500';
    case 'poor': return 'text-orange-500';
    default: return 'text-gray-500';
  }
};

const getConnectionBg = (quality: string, isConnected: boolean) => {
  if (!isConnected) return 'bg-red-50 border-red-200';
  switch (quality) {
    case 'excellent': return 'bg-green-50 border-green-200';
    case 'good': return 'bg-yellow-50 border-yellow-200';
    case 'poor': return 'bg-orange-50 border-orange-200';
    default: return 'bg-gray-50 border-gray-200';
  }
};

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

const ProfessionalSyncStatus: React.FC<ProfessionalSyncStatusProps> = ({
  syncState,
  activeDevices,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [recentEvents, setRecentEvents] = useState<SyncEvent[]>([]);

  useEffect(() => {
    // Keep only recent events (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 300000;
    const recent = syncState.syncEvents.filter(event => event.timestamp > fiveMinutesAgo);
    setRecentEvents(recent.slice(0, 5)); // Show max 5 events
  }, [syncState.syncEvents]);

  const { isConnected, connectionQuality, deviceCount, lastSync, isLoading, error } = syncState;

  const connectionColor = getConnectionColor(connectionQuality, isConnected);
  const connectionBg = getConnectionBg(connectionQuality, isConnected);

  return (
    <div className={`relative ${className}`}>
      {/* Compact Status Indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:shadow-md ${connectionBg}`}
        title={`Professional Sync: ${isConnected ? 'Connected' : 'Disconnected'} • ${deviceCount} devices`}
      >
        {/* Connection Icon */}
        {isConnected ? (
          <Wifi className={`w-4 h-4 ${connectionColor}`} />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
        )}

        {/* Device Count */}
        <div className="flex items-center space-x-1">
          <Users className="w-3 h-3 text-gray-600" />
          <span className="text-xs font-medium text-gray-700">{deviceCount}</span>
        </div>

        {/* Quality Indicator */}
        <div className={`flex items-center space-x-1 ${connectionColor}`}>
          {connectionQuality === 'excellent' && <CheckCircle className="w-3 h-3" />}
          {connectionQuality === 'good' && <AlertTriangle className="w-3 h-3" />}
          {connectionQuality === 'poor' && <AlertTriangle className="w-3 h-3" />}
          <span className="text-xs font-medium capitalize">{connectionQuality}</span>
        </div>

        {/* Last Sync */}
        {lastSync > 0 && (
          <div className="flex items-center space-x-1 text-gray-500">
            <Clock className="w-3 h-3" />
            <span className="text-xs">{formatTimeAgo(lastSync)}</span>
          </div>
        )}
      </button>

      {/* Detailed Status Panel */}
      {showDetails && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Professional Sync Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                {error}
              </div>
            )}

            {/* Connection Details */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Quality:</span>
                <span className={`font-medium ${connectionColor}`}>
                  {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Devices:</span>
                <span className="font-medium">{deviceCount}</span>
              </div>
              {lastSync > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Last Sync:</span>
                  <span className="font-medium">{formatTimeAgo(lastSync)}</span>
                </div>
              )}
            </div>

            {/* Active Devices */}
            {activeDevices.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Active Devices</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {activeDevices.slice(0, 5).map((device) => (
                    <div key={device.id} className="flex items-center justify-between text-xs bg-gray-50 rounded p-2">
                      <div className="flex items-center space-x-2">
                        {getDeviceIcon(device.platform)}
                        <span className="font-medium">{device.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">{device.user}</span>
                        <div className={`w-2 h-2 rounded-full ${device.isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                      </div>
                    </div>
                  ))}
                  {activeDevices.length > 5 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{activeDevices.length - 5} more devices
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Events */}
            {recentEvents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Activity className="w-4 h-4 mr-1" />
                  Recent Activity
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {recentEvents.map((event, index) => (
                    <div key={index} className="text-xs bg-gray-50 rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {event.type === 'data_update' && <Zap className="w-3 h-3 inline mr-1 text-blue-500" />}
                          {event.type === 'device_join' && <Users className="w-3 h-3 inline mr-1 text-green-500" />}
                          {event.type === 'conflict_resolution' && <AlertTriangle className="w-3 h-3 inline mr-1 text-yellow-500" />}
                          {event.type === 'error' && <AlertTriangle className="w-3 h-3 inline mr-1 text-red-500" />}
                          {event.field && `${event.field} `}
                          {event.type.replace('_', ' ')}
                        </span>
                        <span className="text-gray-500">{formatTimeAgo(event.timestamp)}</span>
                      </div>
                      {event.description && (
                        <div className="text-gray-600 mt-1 truncate">{event.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalSyncStatus;