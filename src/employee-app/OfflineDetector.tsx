// OfflineDetector.tsx - Enhanced for PC connectivity detection
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Globe, Router, Cable, RefreshCw, Monitor, Smartphone } from 'lucide-react';

interface OfflineDetectorProps {
  children: React.ReactNode;
}

const OfflineDetector: React.FC<OfflineDetectorProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [connectionType, setConnectionType] = useState<'unknown' | 'wifi' | 'ethernet' | 'mobile'>('unknown');
  const [lastSuccessfulPing, setLastSuccessfulPing] = useState<Date | null>(null);

  // Detect device type and connection
  const detectDeviceAndConnection = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
    
    // Try to detect connection type (limited browser support)
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      setConnectionType(connection.effectiveType || 'unknown');
    } else if (isMobile) {
      setConnectionType('mobile');
    } else {
      setConnectionType('ethernet');
    }
  };

  // Enhanced connectivity test - tests actual Firebase access
  const testRealConnectivity = async (): Promise<boolean> => {
    try {
      console.log('🔍 Testing real connectivity...');
      
      // Test multiple endpoints in parallel for faster detection
      const tests = [
        // Primary: Firebase test
        fetch('https://hamptown-panel-default-rtdb.firebaseio.com/.json', { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        }).then(response => {
          console.log('🔥 Firebase test:', response.ok ? 'SUCCESS' : 'FAILED');
          return response.ok;
        }),
        
        // Secondary: Google test (fast CDN)
        fetch('https://www.google.com/favicon.ico', { 
          method: 'HEAD',
          cache: 'no-cache',
          mode: 'no-cors',
          signal: AbortSignal.timeout(3000)
        }).then(() => {
          console.log('🌐 Google test: SUCCESS');
          return true;
        }),
        
        // Tertiary: Cloudflare DNS test
        fetch('https://1.1.1.1', { 
          method: 'HEAD',
          cache: 'no-cache',
          mode: 'no-cors',
          signal: AbortSignal.timeout(3000)
        }).then(() => {
          console.log('☁️ Cloudflare test: SUCCESS');
          return true;
        })
      ];
      
      // Wait for any test to succeed (race condition)
      const results = await Promise.allSettled(tests);
      const hasConnection = results.some(result => 
        result.status === 'fulfilled' && result.value === true
      );
      
      if (hasConnection) {
        setLastSuccessfulPing(new Date());
        console.log('✅ Connectivity confirmed');
      } else {
        console.log('❌ All connectivity tests failed');
      }
      
      return hasConnection;
      
    } catch (error) {
      console.warn('⚠️ Connectivity test error:', error);
      return false;
    }
  };

  // PC-specific network interface detection
  const detectPCNetworkChange = () => {
    // For PC: Monitor network interface changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', () => {
          console.log('🔄 Network interface changed, testing connectivity...');
          testRealConnectivity().then(setIsOnline);
        });
      }
    }
  };

  useEffect(() => {
    detectDeviceAndConnection();
    detectPCNetworkChange();

    // Initial connectivity test
    testRealConnectivity().then(setIsOnline);

    const handleOnline = async () => {
      console.log('🌐 Browser says: Online');
      // Don't trust browser - test real connectivity
      const reallyOnline = await testRealConnectivity();
      setIsOnline(reallyOnline);
      if (reallyOnline) {
        setRetryCount(0);
      }
    };

    const handleOffline = () => {
      console.log('📴 Browser says: Offline');
      setIsOnline(false);
    };

    // Browser events (unreliable but still useful)
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Enhanced polling for PC detection
    const connectivityInterval = setInterval(async () => {
      if (!isOnline) {
        // When offline, test more frequently
        const reallyOnline = await testRealConnectivity();
        setIsOnline(reallyOnline);
      } else {
        // When online, test less frequently but still verify
        const stillOnline = await testRealConnectivity();
        if (!stillOnline) {
          console.log('🚨 Connection lost detected via polling');
          setIsOnline(false);
        }
      }
    }, isOnline ? 10000 : 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectivityInterval);
    };
  }, [isOnline]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    console.log(`🔄 Manual retry attempt ${retryCount + 1}`);
    
    const connected = await testRealConnectivity();
    setIsOnline(connected);
    
    if (!connected) {
      setTimeout(() => {
        // Auto-retry in 2 seconds if manual retry failed
        testRealConnectivity().then(setIsOnline);
      }, 2000);
    }
    
    setIsRetrying(false);
  };

  // Show children when online
  if (isOnline) {
    return <>{children}</>;
  }

  // Get device icon
  const getDeviceIcon = () => {
    switch (connectionType) {
      case 'mobile': return <Smartphone className="w-5 h-5 text-blue-400" />;
      case 'ethernet': return <Cable className="w-5 h-5 text-green-400" />;
      case 'wifi': return <Wifi className="w-5 h-5 text-purple-400" />;
      default: return <Monitor className="w-5 h-5 text-orange-400" />;
    }
  };

  // Beautiful offline screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Icon section */}
        <div className="mb-8 relative">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-700/50 shadow-2xl">
            <WifiOff className="w-16 h-16 text-red-400 animate-pulse" />
          </div>
          
          {/* Floating disconnection indicators */}
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        </div>

        {/* Sad emoji and main message */}
        <div className="mb-6">
          <div className="text-6xl mb-4 animate-bounce">😞</div>
          <h1 className="text-3xl font-bold text-white mb-2">
            No Internet Connection
          </h1>
          <p className="text-slate-300 text-lg">
            Can't reach Firebase servers
          </p>
          
          {/* Connection details */}
          <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-slate-400">
            {getDeviceIcon()}
            <span>
              {connectionType === 'ethernet' && 'Ethernet Connection'}
              {connectionType === 'wifi' && 'WiFi Connection'}
              {connectionType === 'mobile' && 'Mobile Connection'}
              {connectionType === 'unknown' && 'Network Connection'}
            </span>
          </div>
          
          {lastSuccessfulPing && (
            <div className="text-xs text-slate-500 mt-2">
              Last connected: {lastSuccessfulPing.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Enhanced connection steps for PC */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-slate-700/30">
          <h3 className="text-white font-semibold mb-4 flex items-center justify-center">
            <Cable className="w-5 h-5 mr-2 text-blue-400" />
            Connection Troubleshooting:
          </h3>
          
          <div className="space-y-3 text-left">
            {connectionType === 'ethernet' || connectionType === 'unknown' ? (
              <>
                <div className="flex items-center text-slate-300">
                  <Cable className="w-4 h-4 mr-3 text-green-400" />
                  <span>Check ethernet cable is plugged in securely</span>
                </div>
                <div className="flex items-center text-slate-300">
                  <Router className="w-4 h-4 mr-3 text-orange-400" />
                  <span>Verify router/modem is powered on</span>
                </div>
                <div className="flex items-center text-slate-300">
                  <Wifi className="w-4 h-4 mr-3 text-purple-400" />
                  <span>Try switching to WiFi if available</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center text-slate-300">
                  <Wifi className="w-4 h-4 mr-3 text-purple-400" />
                  <span>Check WiFi connection is active</span>
                </div>
                <div className="flex items-center text-slate-300">
                  <Router className="w-4 h-4 mr-3 text-orange-400" />
                  <span>Move closer to WiFi router</span>
                </div>
                <div className="flex items-center text-slate-300">
                  <Cable className="w-4 h-4 mr-3 text-green-400" />
                  <span>Try ethernet connection if available</span>
                </div>
              </>
            )}
            <div className="flex items-center text-slate-300">
              <Globe className="w-4 h-4 mr-3 text-blue-400" />
              <span>Test internet in another app/browser</span>
            </div>
          </div>
        </div>

        {/* Retry section */}
        <div className="space-y-4">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-white
              transition-all duration-300 transform hover:scale-105
              ${isRetrying 
                ? 'bg-slate-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
              }
            `}
          >
            <div className="flex items-center justify-center">
              {isRetrying ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Test Connection
                </>
              )}
            </div>
          </button>

          {retryCount > 0 && (
            <p className="text-slate-400 text-sm">
              Test attempts: {retryCount} • Auto-checking every 3 seconds...
            </p>
          )}
        </div>

        {/* Fun message */}
        <div className="mt-8 text-slate-400 text-sm">
          <p>🌟 Testing Firebase, Google, and Cloudflare connectivity</p>
          <p className="mt-1">Your work data is safe and waiting for you 💾</p>
        </div>

        {/* Enhanced status indicators */}
        <div className="mt-6 flex justify-center space-x-4">
          <div className="flex items-center text-xs text-slate-500">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            Firebase: Unreachable
          </div>
          <div className="flex items-center text-xs text-slate-500">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
            Network: {connectionType}
          </div>
        </div>
      </div>

      {/* Simple floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default OfflineDetector;
