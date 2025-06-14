// SessionExpiryDetector.tsx - Detects and handles expired sessions
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, RefreshCw, AlertTriangle, Wifi } from 'lucide-react';

interface SessionExpiryDetectorProps {
  children: React.ReactNode;
  expiryTimeMinutes?: number; // Default 5 minutes
  onSessionExpired?: () => void;
  isOnline?: boolean;
}

const SessionExpiryDetector: React.FC<SessionExpiryDetectorProps> = ({
  children,
  expiryTimeMinutes = 5,
  onSessionExpired,
  isOnline = true
}) => {
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  
  const inactiveStartTime = useRef<number | null>(null);
  const warningTimer = useRef<NodeJS.Timeout | null>(null);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const expiryTimer = useRef<NodeJS.Timeout | null>(null);

  const EXPIRY_TIME_MS = expiryTimeMinutes * 60 * 1000; // Convert to milliseconds
  const WARNING_TIME_MS = EXPIRY_TIME_MS - 60000; // Show warning 1 minute before expiry

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsTabVisible(isVisible);

      if (isVisible) {
        // Tab became visible - reset timers
        console.log('📱 Tab became visible - resetting session timers');
        resetSessionTimers();
        setShowWarning(false);
        setTimeUntilExpiry(null);
        
        // If session was expired, don't auto-reset - force user to refresh
        if (isSessionExpired) {
          console.log('⚠️ Session was expired - keeping expired state');
          return;
        }
        
        inactiveStartTime.current = null;
      } else {
        // Tab became hidden - start inactivity tracking
        console.log('👁️ Tab became hidden - starting inactivity timer');
        inactiveStartTime.current = Date.now();
        startInactivityTimers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also listen for focus/blur events as backup
    const handleFocus = () => {
      if (document.hidden === false) {
        handleVisibilityChange();
      }
    };
    
    const handleBlur = () => {
      if (document.hidden === true) {
        handleVisibilityChange();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      resetSessionTimers();
    };
  }, [isSessionExpired]);

  // Start inactivity timers
  const startInactivityTimers = () => {
    resetSessionTimers(); // Clear any existing timers

    // Warning timer (1 minute before expiry)
    warningTimer.current = setTimeout(() => {
      if (!isTabVisible && inactiveStartTime.current) {
        console.log('⚠️ Showing session expiry warning');
        setShowWarning(true);
        startCountdown();
      }
    }, WARNING_TIME_MS);

    // Expiry timer (full expiry time)
    expiryTimer.current = setTimeout(() => {
      if (!isTabVisible && inactiveStartTime.current) {
        console.log('🚨 Session expired due to inactivity');
        setIsSessionExpired(true);
        setShowWarning(false);
        setTimeUntilExpiry(null);
        onSessionExpired?.();
      }
    }, EXPIRY_TIME_MS);
  };

  // Start countdown for warning
  const startCountdown = () => {
    let remainingTime = 60; // 60 seconds countdown
    setTimeUntilExpiry(remainingTime);

    countdownTimer.current = setInterval(() => {
      remainingTime -= 1;
      setTimeUntilExpiry(remainingTime);

      if (remainingTime <= 0) {
        if (countdownTimer.current) {
          clearInterval(countdownTimer.current);
        }
      }
    }, 1000);
  };

  // Reset all timers
  const resetSessionTimers = () => {
    if (warningTimer.current) {
      clearTimeout(warningTimer.current);
      warningTimer.current = null;
    }
    if (expiryTimer.current) {
      clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
  };

  // Force refresh page
  const handleRefreshPage = () => {
    console.log('🔄 Forcing page refresh due to expired session');
    window.location.reload();
  };

  // Extend session (dismiss warning)
  const handleExtendSession = () => {
    console.log('⏰ Session extended by user');
    setShowWarning(false);
    setTimeUntilExpiry(null);
    resetSessionTimers();
    inactiveStartTime.current = null;
    
    // Restart the timers if tab is still hidden
    if (!isTabVisible) {
      inactiveStartTime.current = Date.now();
      startInactivityTimers();
    }
  };

  // Session expired modal
  if (isSessionExpired) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center z-[9999]">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        {/* Main modal */}
        <div className="relative z-10 max-w-md w-full mx-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold mb-2">Session Expired</h2>
              <p className="text-red-100 text-sm">Your session has been inactive for too long</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className="text-6xl mb-4">⏰</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Data May Be Outdated
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Your tab has been inactive for more than {expiryTimeMinutes} minutes. 
                  To prevent saving outdated information, please refresh to load the latest data.
                </p>
              </div>

              {/* Connection status */}
              <div className={`flex items-center justify-center space-x-2 p-3 rounded-lg ${
                isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                <Wifi className={`w-4 h-4 ${isOnline ? '' : 'text-red-500'}`} />
                <span className="text-sm font-medium">
                  {isOnline ? 'Connected to internet' : 'No internet connection'}
                </span>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleRefreshPage}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-4 rounded-lg 
                           hover:from-blue-600 hover:to-purple-600 transition-all duration-300 font-semibold
                           shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Refresh & Get Latest Data</span>
                </button>
                
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    🔒 This protects your data from conflicts with other devices
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Session warning modal
  if (showWarning && timeUntilExpiry !== null) {
    return (
      <>
        {children}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9998]">
          <div className="max-w-sm w-full mx-4">
            <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Warning header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Session Expiring Soon</h3>
                <p className="text-orange-100 text-sm">Your session will expire in</p>
              </div>

              {/* Countdown */}
              <div className="p-6 text-center">
                <div className="text-4xl font-bold text-red-600 mb-2">
                  {timeUntilExpiry}s
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Tab has been inactive for {expiryTimeMinutes - 1} minutes
                </p>

                {/* Action buttons */}
                <div className="space-y-2">
                  <button
                    onClick={handleExtendSession}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 
                             transition-colors font-semibold"
                  >
                    Stay Active
                  </button>
                  <button
                    onClick={handleRefreshPage}
                    className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 
                             transition-colors text-sm"
                  >
                    Refresh Now
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mt-3">
                  💡 This prevents saving outdated data
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Normal render - just show children
  return <>{children}</>;
};

export default SessionExpiryDetector;

// Additional hook for session expiry management
export const useSessionExpiry = (onExpired?: () => void) => {
  const [isExpired, setIsExpired] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  
  const resetSession = useCallback(() => {
    setIsExpired(false);
    setIsWarning(false);
  }, []);
  
  const expireSession = useCallback(() => {
    setIsExpired(true);
    onExpired?.();
  }, [onExpired]);
  
  return {
    isExpired,
    isWarning,
    resetSession,
    expireSession
  };
};
