// App.tsx - Updated with session expiry detection and offline handling
import React, { useState, useEffect } from 'react';
import EmployeeApp from './employee-app/EmployeeApp';
import OfflineDetector from './employee-app/OfflineDetector';
import SessionExpiryDetector from './employee-app/SessionExpiryDetector';

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 App: Back online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('📵 App: Gone offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle session expiry
  const handleSessionExpired = () => {
    console.log('🚨 App: Session expired due to inactivity');
    
    // Optional: Clear any cached data or tokens
    localStorage.removeItem('workVibe_tempData');
    
    // Optional: Track analytics
    if ((window as any).gtag) {
      (window as any).gtag('event', 'session_expired', {
        event_category: 'session',
        event_label: 'inactive_timeout'
      });
    }
  };

  return (
    <div className="App">
      <SessionExpiryDetector
        expiryTimeMinutes={5} // 5 minutes of inactivity
        onSessionExpired={handleSessionExpired}
        isOnline={isOnline}
      >
        <OfflineDetector>
          <EmployeeApp />
        </OfflineDetector>
      </SessionExpiryDetector>
    </div>
  );
}

export default App;
