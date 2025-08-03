// OfflineDetector.tsx - Beautiful offline connection screen
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Globe, Router, Cable, RefreshCw } from 'lucide-react';

interface OfflineDetectorProps {
  children: React.ReactNode;
}

const OfflineDetector: React.FC<OfflineDetectorProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Connection restored');
      setIsOnline(true);
      setRetryCount(0);
    };

    const handleOffline = () => {
      console.log('📴 Connection lost');
      setIsOnline(false);
    };

    // Test actual internet connectivity, not just network interface
    const testConnectivity = async () => {
      try {
        // Test multiple endpoints for reliability
        const testUrls = [
          'https://www.google.com/favicon.ico',
          'https://httpbin.org/get',
          'https://jsonplaceholder.typicode.com/posts/1'
        ];
        
        const promises = testUrls.map(url => 
          fetch(url, { 
            method: 'HEAD', 
            cache: 'no-cache',
            mode: 'no-cors' // Avoid CORS issues
          }).then(() => true).catch(() => false)
        );
        
        const results = await Promise.all(promises);
        const hasConnection = results.some(result => result);
        
        if (hasConnection !== isOnline) {
          setIsOnline(hasConnection);
        }
      } catch (error) {
        console.warn('Connectivity test failed:', error);
        setIsOnline(false);
      }
    };

    // Initial connectivity test
    testConnectivity();

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Test connectivity every 5 seconds when offline
    const interval = setInterval(() => {
      if (!isOnline) {
        testConnectivity();
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      // Test Firebase specifically
      const response = await fetch('https://hamptown-panel-default-rtdb.firebaseio.com/.json', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        setIsOnline(true);
        setRetryCount(0);
      } else {
        throw new Error('Firebase unreachable');
      }
    } catch (error) {
      console.warn('Retry failed:', error);
      // Will retry automatically in 5 seconds
    } finally {
      setIsRetrying(false);
    }
  };

  // Show children when online
  if (isOnline) {
    return <>{children}</>;
  }

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
            Oops! Looks like you're not connected to the internet
          </p>
        </div>

        {/* Connection steps */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-slate-700/30">
          <h3 className="text-white font-semibold mb-4 flex items-center justify-center">
            <Cable className="w-5 h-5 mr-2 text-blue-400" />
            Please check your connection:
          </h3>
          
          <div className="space-y-3 text-left">
            <div className="flex items-center text-slate-300">
              <Router className="w-4 h-4 mr-3 text-orange-400" />
              <span>Make sure your router is powered on</span>
            </div>
            <div className="flex items-center text-slate-300">
              <Cable className="w-4 h-4 mr-3 text-green-400" />
              <span>Check ethernet cable connections</span>
            </div>
            <div className="flex items-center text-slate-300">
              <Globe className="w-4 h-4 mr-3 text-blue-400" />
              <span>Verify your internet service is active</span>
            </div>
            <div className="flex items-center text-slate-300">
              <Wifi className="w-4 h-4 mr-3 text-purple-400" />
              <span>Try connecting to WiFi if available</span>
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
                  Checking Connection...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Try Again
                </>
              )}
            </div>
          </button>

          {retryCount > 0 && (
            <p className="text-slate-400 text-sm">
              Retry attempts: {retryCount} • Auto-checking every 5 seconds...
            </p>
          )}
        </div>

        {/* Fun message */}
        <div className="mt-8 text-slate-400 text-sm">
          <p>🌟 Don't worry, we'll keep trying to reconnect!</p>
          <p className="mt-1">Your work data is safe and waiting for you 💾</p>
        </div>

        {/* Status indicators */}
        <div className="mt-6 flex justify-center space-x-4">
          <div className="flex items-center text-xs text-slate-500">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            Network: Disconnected
          </div>
          <div className="flex items-center text-xs text-slate-500">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
            Firebase: Unreachable
          </div>
        </div>
      </div>

      {/* Simple floating particles without complex animations */}
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
