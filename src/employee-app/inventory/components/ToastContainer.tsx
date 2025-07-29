// src/employee-app/inventory/components/ToastContainer.tsx
import React from 'react';

const ToastContainer: React.FC = () => {
  return (
    <div 
      id="toastContainer" 
      className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 space-y-2"
      style={{ minWidth: '300px' }}
    />
  );
};

export default ToastContainer;
