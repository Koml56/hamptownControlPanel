// SyncStatusIndicator.tsx - Enhanced with real device names and improved sync status
import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, Globe, Users, Eye, EyeOff, Smartphone, Monitor, Tablet } from 'lucide-react';
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
  const [recentSyncEvent, setRecentSyncEvent] = useState<SyncEvent | null>(null);
  
  // Start from bottom right corner
  const [position, setPosition] = useState({ 
    x: 'right' as 'left' | 'right', 
    y: window.innerHeight - 100
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, startY: 0, startSide: 'right' as 'left' | 'right' });
  const orbRef = useRef<HTMLDivElement>(null);

  // Update position on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        ...prev,
        y: Math.min(prev.y, window.innerHeight - 100)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show pulse animation when sync occurs
  useEffect(() => {
    if (syncEvents.length > 0) {
      const recentEvents = syncEvents.filter(event => 
        Date.now() - event.timestamp < 3000
      );
      
      if (recentEvents.length > 0) {
        const latestEvent = recentEvents[0];
        setRecentSyncEvent(latestEvent);
        setShowSyncPulse(true);
        
        const timer = setTimeout(() => {
          setShowSyncPulse(false);
          setRecentSyncEvent(null);
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [syncEvents]);

  // Calculate smart popup positioning
  const getPopupPosition = () => {
    const popupWidth = 320; // Increased width for better device display
    const popupHeight = 450; // Increased height for more content
    const orbSize = 40;
    const gap = 8;

    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    
    const shouldShowAbove = position.y + popupHeight + gap > screenHeight - 20;
    
    let translateX = '0px';
    if (position.x === 'left') {
      translateX = `${orbSize + gap}px`;
      if (64 + popupWidth > screenWidth) {
        translateX = `-${popupWidth - orbSize - gap}px`;
      }
    } else {
      translateX = `-${popupWidth + gap}px`;
      if (popupWidth + gap > screenWidth - 64) {
        translateX = `${orbSize + gap}px`;
      }
    }

    let translateY = '0px';
    if (shouldShowAbove) {
      translateY = `-${popupHeight + gap}px`;
    } else {
      translateY = `${orbSize + gap}px`;
    }

    return { translateX, translateY, isAbove: shouldShowAbove };
  };

  // Get device icon based on platform
  const getDeviceIcon = (deviceInfo: DeviceInfo) => {
    if (deviceInfo.platform === 'mobile') {
      return <Smartphone className="w-3 h-3" />;
    } else if (deviceInfo.platform === 'tablet') {
      return <Tablet className="w-3 h-3" />;
    } else {
      return <Monitor className="w-3 h-3" />;
    }
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  // Mouse/touch handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const rect = orbRef.current?.getBoundingClientRect();
    if (rect) {
      setDragPosition({ x: rect.left, y: rect.top });
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        startY: position.y,
        startSide: position.x
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    const rect = orbRef.current?.getBoundingClientRect();
    if (rect) {
      setDragPosition({ x: rect.left, y: rect.top });
      setDragStart({
        x: touch.clientX,
        y: touch.clientY,
        startY: position.y,
        startSide: position.x
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      const newX = Math.max(16, Math.min(window.innerWidth - 56, 
        (dragStart.startSide === 'left' ? 16 : window.innerWidth - 56) + deltaX));
      const newY = Math.max(24, Math.min(window.innerHeight - 64, dragStart.startY + deltaY));
      
      setDragPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;
      
      const newX = Math.max(16, Math.min(window.innerWidth - 56, 
        (dragStart.startSide === 'left' ? 16 : window.innerWidth - 56) + deltaX));
      const newY = Math.max(24, Math.min(window.innerHeight - 64, dragStart.startY + deltaY));
      
      setDragPosition({ x: newX, y: newY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      const finalSide = (dragStart.startSide === 'left' ? 16 : window.innerWidth - 56) + deltaX > window.innerWidth / 2 ? 'right' : 'left';
      const finalY = Math.max(24, Math.min(window.innerHeight - 64, dragStart.startY + deltaY));
      
      setPosition({ x: finalSide, y: finalY });
      setIsDragging(false);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging) return;
      
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;
      
      const finalSide = (dragStart.startSide === 'left' ? 16 : window.innerWidth - 56) + deltaX > window.innerWidth / 2 ? 'right' : 'left';
      const finalY = Math.max(24, Math.min(window.innerHeight - 64, dragStart.startY + deltaY));
      
      setPosition({ x: finalSide, y: finalY });
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragStart]);

  const getStatusInfo = () => {
    if (isLoading) {
      return {
        icon: <RefreshCw className="w-3 h-3 animate-spin" />,
        text: recentSyncEvent ? `Syncing ${recentSyncEvent.field || 'data'}` : 'Syncing',
        bgColor: 'bg-blue-500/90',
        pulseColor: 'bg-blue-400'
      };
    }

    if (connectionStatus === 'connected' && lastSync) {
      return {
        icon: showSyncPulse ? 
          <RefreshCw className="w-3 h-3 animate-spin" /> : 
          (isMultiDeviceEnabled && deviceCount > 1 ? <Users className="w-3 h-3" /> : <Globe className="w-3 h-3" />),
        text: showSyncPulse ? (recentSyncEvent ? `Syncing ${recentSyncEvent.field || 'data'}` : 'Syncing') : 
              (isMultiDeviceEnabled ? `${deviceCount} devices` : 'Online'),
        bgColor: 'bg-emerald-500/90',
        pulseColor: 'bg-emerald-400'
      };
    }

    if (connectionStatus === 'error') {
      return {
        icon: <WifiOff className="w-3 h-3" />,
        text: 'Offline',
        bgColor: 'bg-red-500/90',
        pulseColor: 'bg-red-400'
      };
    }

    return {
      icon: <Wifi className="w-3 h-3" />,
      text: 'Connecting',
      bgColor: 'bg-amber-500/90',
      pulseColor: 'bg-amber-400'
    };
  };

  const status = getStatusInfo();
  const popupPos = getPopupPosition();

  return (
    <>
      {/* Compact draggable floating orb */}
      <div 
        ref={orbRef}
        className={`
          fixed z-50 transition-all duration-300 ease-out
          ${isDragging ? 'transition-none' : ''}
          ${isDragging ? 'scale-110 cursor-grabbing' : 'cursor-grab hover:scale-105'}
        `}
        style={{ 
          left: isDragging ? `${dragPosition.x}px` : (position.x === 'left' ? '16px' : undefined),
          right: isDragging ? undefined : (position.x === 'right' ? '16px' : undefined),
          top: isDragging ? `${dragPosition.y}px` : `${position.y}px`
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Compact orb container */}
        <div className="relative">
          {/* Shadow layers */}
          <div className="absolute inset-0 rounded-full bg-black/10 blur-md scale-110" />
          
          {/* Main compact orb */}
          <div 
            className={`
              relative w-10 h-10 rounded-full transform transition-all duration-300
              ${showSyncPulse ? 'animate-pulse' : ''}
            `}
            onClick={(e) => {
              if (!isDragging) {
                e.stopPropagation();
                if (connectionStatus === 'error') {
                  loadFromFirebase();
                } else {
                  setShowDetails(!showDetails);
                }
              }
            }}
            title={`${status.text}${lastSync ? ` - Last sync: ${lastSync}` : ''}`}
          >
            {/* Glass background */}
            <div className={`
              absolute inset-0 rounded-full backdrop-blur-xl ${status.bgColor}
              border border-white/40 shadow-lg
            `} />
            
            {/* Inner reflection */}
            <div className="absolute inset-0.5 rounded-full bg-gradient-to-tr from-white/25 to-transparent" />
            
            {/* Icon container */}
            <div className="relative flex items-center justify-center w-full h-full text-white">
              {status.icon}
            </div>
            
            {/* Device count badge */}
            {connectionStatus === 'connected' && isMultiDeviceEnabled && deviceCount > 1 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full backdrop-blur-xl bg-blue-500/95 
                            border border-white/60 shadow-md flex items-center justify-center text-xs font-bold text-white">
                {deviceCount}
              </div>
            )}
            
            {/* Pulse rings when syncing */}
            {showSyncPulse && (
              <>
                <div className="absolute inset-0 rounded-full animate-ping">
                  <div className={`w-full h-full rounded-full ${status.pulseColor}/50 border border-current`} />
                </div>
                <div className="absolute inset-0 rounded-full animate-ping" style={{ animationDelay: '150ms' }}>
                  <div className={`w-full h-full rounded-full ${status.pulseColor}/30 border border-current scale-125`} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Enhanced details popup */}
        {showDetails && !isDragging && (
          <div 
            className="absolute z-40 w-80"
            style={{
              transform: `translate(${popupPos.translateX}, ${popupPos.translateY})`,
              transformOrigin: popupPos.isAbove ? 'bottom center' : 'top center'
            }}
          >
            {/* Visual connection line */}
            <div 
              className={`absolute w-0.5 bg-gradient-to-b from-blue-500/30 to-purple-500/30 ${
                popupPos.isAbove 
                  ? 'bottom-0 h-2 translate-y-full' 
                  : 'top-0 h-2 -translate-y-full'
              }`}
              style={{
                left: position.x === 'left' ? '-9px' : 'calc(100% + 8px)'
              }}
            />
            
            <div className="relative bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/50 overflow-hidden">
              {/* Enhanced header */}
              <div className="bg-gradient-to-r from-blue-500/15 to-purple-500/15 px-4 py-3 border-b border-white/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Globe className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-800">Multi-Device Sync</span>
                      <div className="text-xs text-gray-600">
                        {isMultiDeviceEnabled ? `${deviceCount} device${deviceCount !== 1 ? 's' : ''} connected` : 'Disabled'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetails(false);
                    }}
                    className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm border border-white/40 
                             text-gray-600 hover:text-gray-800 hover:bg-white/50 transition-all duration-200
                             flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
                {/* Status section */}
                <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Connection Status</span>
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-500' :
                      connectionStatus === 'connecting' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                  </div>
                  <div className="text-xs text-gray-600">
                    {connectionStatus === 'connected' ? 'Connected to Firebase' :
                     connectionStatus === 'connecting' ? 'Connecting...' :
                     'Connection failed'}
                  </div>
                  {lastSync && (
                    <div className="text-xs text-gray-500 mt-1">
                      Last sync: {lastSync}
                    </div>
                  )}
                </div>

                {/* Multi-device toggle */}
                <div className="bg-white/40 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Real-time Sync</span>
                        <div className="text-xs text-gray-500">Sync across devices</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMultiDeviceSync();
                      }}
                      className={`relative w-12 h-6 rounded-full transition-all duration-200 ${
                        isMultiDeviceEnabled 
                          ? 'bg-emerald-500' 
                          : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ${
                        isMultiDeviceEnabled ? 'left-6' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Connected devices */}
                {isMultiDeviceEnabled && (
                  <div className="bg-white/30 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Connected Devices ({activeDevices.length})</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          refreshFromAllDevices();
                        }}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
                      >
                        Refresh
                      </button>
                    </div>
                    
                    {activeDevices.length > 0 ? (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {activeDevices.map((device, index) => (
                          <div key={device.id} className="flex items-center justify-between p-2 bg-white/40 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                device.isActive ? 'bg-green-500' : 'bg-gray-400'
                              }`} />
                              <div className="text-blue-600">
                                {getDeviceIcon(device)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-gray-700 truncate">
                                  {device.name}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {device.user} • {device.browserInfo}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              {formatTimeAgo(device.lastSeen)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-xs text-gray-500">
                        No other devices connected
                      </div>
                    )}
                  </div>
                )}

                {/* Recent sync events */}
                {isMultiDeviceEnabled && syncEvents.length > 0 && (
                  <div className="bg-white/30 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                    <div className="text-sm font-medium text-gray-700 mb-2">Recent Activity</div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {syncEvents.slice(0, 5).map((event, index) => (
                        <div key={index} className="text-xs text-gray-600 flex items-center justify-between">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              event.type === 'data_update' ? 'bg-blue-500' :
                              event.type === 'device_join' ? 'bg-green-500' :
                              event.type === 'device_leave' ? 'bg-red-500' :
                              'bg-purple-500'
                            }`} />
                            <span className="truncate">
                              {event.description || `${event.field || 'Data'} ${event.type === 'data_update' ? 'updated' : event.type.replace('_', ' ')}`}
                            </span>
                          </div>
                          <span className="text-gray-400 whitespace-nowrap ml-2">
                            {formatTimeAgo(event.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (connectionStatus === 'error') {
                        loadFromFirebase();
                      } else {
                        refreshFromAllDevices();
                      }
                    }}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-500 to-purple-500 
                             text-white rounded-lg hover:from-blue-600 hover:to-purple-600 
                             transition-all duration-300 text-xs font-semibold shadow-md transform hover:scale-105"
                  >
                    {connectionStatus === 'error' ? 'Reconnect' : 'Refresh All'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close details */}
      {showDetails && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setShowDetails(false)}
        />
      )}
    </>
  );
};

export default SyncStatusIndicator;
