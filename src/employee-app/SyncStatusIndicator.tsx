// Enhanced SyncStatusIndicator.tsx - With session status
import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, Globe, Users, Eye, EyeOff, Clock, AlertTriangle } from 'lucide-react';
import type { DeviceInfo, SyncEvent } from './multiDeviceSync';
import type { ConnectionStatus } from './types';

interface SyncStatusIndicatorProps {
  isLoading: boolean;
  lastSync: string | null;
  connectionStatus: ConnectionStatus;
  loadFromFirebase: () => void;
  // Session status props
  isSessionValid?: boolean;
  refreshSession?: () => void;
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
  isSessionValid = true,
  refreshSession = () => {},
  activeDevices = [],
  syncEvents = [],
  deviceCount = 1,
  isMultiDeviceEnabled = false,
  toggleMultiDeviceSync = () => {},
  refreshFromAllDevices = () => {}
}) => {
  const [showSyncPulse, setShowSyncPulse] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
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
        Date.now() - (event as any).timestamp < 3000
      );
      
      if (recentEvents.length > 0) {
        setShowSyncPulse(true);
        const timer = setTimeout(() => {
          setShowSyncPulse(false);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [syncEvents]);

  // Calculate smart popup positioning
  const getPopupPosition = () => {
    const popupWidth = 256;
    const popupHeight = 400; // Increased for session status
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
    // Session expired takes priority
    if (!isSessionValid) {
      return {
        icon: <AlertTriangle className="w-3 h-3 animate-pulse" />,
        text: 'Session Expired',
        bgColor: 'bg-red-500/90',
        pulseColor: 'bg-red-400'
      };
    }

    if (isLoading) {
      return {
        icon: <RefreshCw className="w-3 h-3 animate-spin" />,
        text: 'Syncing',
        bgColor: 'bg-blue-500/90',
        pulseColor: 'bg-blue-400'
      };
    }

    if (connectionStatus === 'connected' && lastSync) {
      return {
        icon: showSyncPulse ? 
          <RefreshCw className="w-3 h-3 animate-spin" /> : 
          <Globe className="w-3 h-3" />,
        text: showSyncPulse ? 'Syncing' : 'Online',
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
                } else if (!isSessionValid) {
                  refreshSession();
                } else {
                  setShowDetails(!showDetails);
                }
              }
            }}
            title={`${status.text}${lastSync ? ` - ${lastSync}` : ''}${!isSessionValid ? ' (Click to refresh)' : ''}`}
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
            
            {/* Session expired warning badge */}
            {!isSessionValid && (
              <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full backdrop-blur-xl bg-red-500/95 
                            border border-white/60 shadow-md flex items-center justify-center">
                <AlertTriangle className="w-2 h-2 text-white" />
              </div>
            )}
            
            {/* Pulse rings when syncing */}
            {showSyncPulse && (
              <>
                <div className="absolute inset-0 rounded-full animate-ping">
                  <div className={`w-full h-full rounded-full ${status.pulseColor}/50 border border-current`} />
                </div>
                <div className="absolute inset-0 rounded-full animate-ping animation-delay-150">
                  <div className={`w-full h-full rounded-full ${status.pulseColor}/30 border border-current scale-125`} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Anchored details popup */}
        {showDetails && !isDragging && (
          <div 
            className="absolute z-40 w-64"
            style={{
              transform: `translate(${popupPos.translateX}, ${popupPos.translateY})`,
              transformOrigin: popupPos.isAbove ? 'bottom center' : 'top center'
            }}
          >
            <div className="relative bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/50 overflow-hidden">
              {/* Compact header */}
              <div className="bg-gradient-to-r from-blue-500/15 to-purple-500/15 px-4 py-3 border-b border-white/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Globe className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">Sync Status</span>
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

              {/* Compact content */}
              <div className="p-4 space-y-3">
                {/* Session status (if expired) */}
                {!isSessionValid && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-semibold text-red-800">Session Expired</span>
                    </div>
                    <p className="text-xs text-red-600 mb-2">
                      Tab was inactive for too long. Data operations are blocked.
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        refreshSession();
                        window.location.reload();
                      }}
                      className="w-full py-1 px-2 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                    >
                      Refresh Page
                    </button>
                  </div>
                )}

                {/* Mini stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-2 text-center border border-white/30">
                    <div className="text-lg font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {deviceCount}
                    </div>
                    <div className="text-xs text-gray-600">Devices</div>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-2 text-center border border-white/30">
                    <div className="text-lg font-bold bg-gradient-to-br from-emerald-600 to-green-600 bg-clip-text text-transparent">
                      {syncEvents.length}
                    </div>
                    <div className="text-xs text-gray-600">Events</div>
                  </div>
                </div>

                {/* Session validity indicator */}
                <div className="bg-white/40 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">Session</span>
                    </div>
                    <div className={`w-8 h-8 rounded-full backdrop-blur-sm border transition-all duration-200 flex items-center justify-center ${
                      isSessionValid 
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600' 
                        : 'bg-red-500/20 border-red-500/40 text-red-600'
                    }`}>
                      {isSessionValid ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </div>
                  </div>
                </div>

                {/* Multi-device toggle */}
                <div className="bg-white/40 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">Multi-sync</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMultiDeviceSync();
                      }}
                      className={`w-8 h-8 rounded-full backdrop-blur-sm border transition-all duration-200 flex items-center justify-center ${
                        isMultiDeviceEnabled 
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/30' 
                          : 'bg-gray-500/20 border-gray-500/40 text-gray-500 hover:bg-gray-500/30'
                      }`}
                    >
                      {isMultiDeviceEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Last sync */}
                {lastSync && (
                  <div className="text-center bg-white/30 backdrop-blur-sm rounded-lg p-2 border border-white/30">
                    <div className="text-xs text-gray-500">Last sync</div>
                    <div className="text-xs font-semibold text-gray-700">{lastSync}</div>
                  </div>
                )}

                {/* Compact action button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectionStatus === 'error') {
                      loadFromFirebase();
                    } else if (!isSessionValid) {
                      refreshSession();
                      window.location.reload();
                    } else {
                      refreshFromAllDevices();
                    }
                  }}
                  disabled={!isSessionValid && connectionStatus !== 'error'}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold shadow-md transform hover:scale-105 transition-all duration-300 ${
                    !isSessionValid 
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600'
                      : connectionStatus === 'error'
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
                  }`}
                >
                  {!isSessionValid ? 'Refresh Session' :
                   connectionStatus === 'error' ? 'Reconnect' : 'Refresh'}
                </button>
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
