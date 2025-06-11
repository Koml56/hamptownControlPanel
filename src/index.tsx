import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ PWA Service Worker registered successfully:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('🔄 New version of WorkVibe available!');
                
                // You can show a toast or notification here
                if (window.confirm('New version of WorkVibe is available! Would you like to update?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ PWA Service Worker registration failed:', error);
      });

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'BACKGROUND_SYNC') {
        console.log('🔄 Background sync completed');
        // Handle background sync completion here
      }
    });
  });

  // Handle service worker updates
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🔄 Service Worker controller changed');
    window.location.reload();
  });
}

// PWA Install Prompt Handler
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📱 PWA install prompt triggered');
  e.preventDefault();
  deferredPrompt = e;
  
  // Show custom install UI
  showInstallPrompt();
});

window.addEventListener('appinstalled', () => {
  console.log('🎉 WorkVibe PWA was installed successfully!');
  deferredPrompt = null;
  
  // Hide install prompt
  hideInstallPrompt();
  
  // You can track this event for analytics
  if ((window as any).gtag) {
    (window as any).gtag('event', 'pwa_install', {
      event_category: 'engagement',
      event_label: 'WorkVibe PWA Install'
    });
  }
});

function showInstallPrompt() {
  const installButton = document.getElementById('pwa-install-btn');
  if (installButton) {
    installButton.style.display = 'block';
    installButton.onclick = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA install prompt: ${outcome}`);
        deferredPrompt = null;
        hideInstallPrompt();
      }
    };
  }
}

function hideInstallPrompt() {
  const installButton = document.getElementById('pwa-install-btn');
  if (installButton) {
    installButton.style.display = 'none';
  }
}

// Handle offline/online status
window.addEventListener('online', () => {
  console.log('🌐 Back online!');
  // You can show a success message or sync data
});

window.addEventListener('offline', () => {
  console.log('📵 Gone offline');
  // You can show an offline indicator
});

// Prevent zoom on iOS devices in standalone mode
document.addEventListener('touchstart', (event) => {
  if (event.touches.length > 1) {
    event.preventDefault();
  }
});

let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  const now = (new Date()).getTime();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// Add viewport height fix for mobile browsers
function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

setViewportHeight();
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', () => {
  setTimeout(setViewportHeight, 100);
});
