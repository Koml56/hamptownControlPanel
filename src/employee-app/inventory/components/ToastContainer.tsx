// src/employee-app/inventory/components/ToastContainer.tsx
import React, { useEffect } from 'react';

const ToastContainer: React.FC = () => {
  useEffect(() => {
    // Ensure the toast container DOM element exists
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'fixed top-4 right-4 z-50 space-y-2 pointer-events-none';
      document.body.appendChild(container);
    }

    // Cleanup function
    return () => {
      const existingContainer = document.getElementById('toastContainer');
      if (existingContainer && existingContainer.children.length === 0) {
        existingContainer.remove();
      }
    };
  }, []);

  return (
    <div 
      id="toastContainer" 
      className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none"
      style={{ zIndex: 9999 }}
    />
  );
};

export default ToastContainer;
