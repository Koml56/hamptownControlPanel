// SyncStatusIndicator.tsx - Shows real-time sync status
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Check, Users, Smartphone } from 'lucide-react';

interface SyncStatusIndicatorProps {
  isLoading: boolean;
  lastSync: string | null;
  connectionStatus: 'connecting' | 'connected' | 'error';
  syncCount: number;
  loadFromFirebase: () => void;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  isLoading,
  lastSync,
  connectionStatus,
  syncCount,
  loadFromFirebase
}) => {
  const [showSyncPulse, setShowSyncPulse] = useState(false);
  const [deviceCount, setDeviceCount] = useState(1);

  // Show pulse animation when sync occurs
  useEffect(() => {
    if (syncCount > 0) {
      setShowSyncPulse(true);
      // Simulate device count (in real app, this could come from Firebase presence)
      setDeviceCount(Math.floor(Math.random() * 3) + 2); // 2-4 devices
      
      const timer = setTimeout(() => {
        setShowSyncPulse(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [syncCount]);

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

  const status = getStatusInfo();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div 
        className={`
          backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border 
          transition-all duration-300 cursor-pointer hover:scale-105
          ${status.color} ${showSyncPulse ? 'animate-pulse' : ''}
        `}
        onClick={connectionStatus === 'error' ? loadFromFirebase : undefined}
        title={`
          Status: ${status.text}
          ${lastSync ? `Last sync: ${lastSync}` : ''}
          ${connectionStatus === 'error' ? 'Click to retry' : ''}
          ${syncCount > 0 ? `Updates received: ${syncCount}` : ''}
        `}
      >
        <div className="flex items-center space-x-2">
          {status.icon}
          <span className={`text-xs font-medium ${status.textColor}`}>
            {status.text}
          </span>
          
          {/* Multi-device indicator */}
          {connectionStatus === 'connected' && (
            <div className="flex items-center space-x-1">
              <div className={`w-1 h-1 rounded-full bg-current opacity-30`} />
              <div className="flex items-center space-x-1">
                <Smartphone className="w-3 h-3 opacity-60" />
                <span className="text-xs opacity-75">{deviceCount}</span>
              </div>
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

      {/* Detailed status tooltip on hover */}
      {connectionStatus === 'connected' && (
        <div className="absolute bottom-full right-0 mb-2 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            <div className="flex items-center space-x-2 mb-1">
              <Users className="w-3 h-3" />
              <span>Multi-device sync active</span>
            </div>
            {lastSync && (
              <div>Last sync: {lastSync}</div>
            )}
            {syncCount > 0 && (
              <div>Updates: {syncCount}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
