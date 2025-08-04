// OfflineDetector.tsx - Temporarily disabled for testing
import React from 'react';

interface OfflineDetectorProps {
  children: React.ReactNode;
}

const OfflineDetector: React.FC<OfflineDetectorProps> = ({ children }) => {
  // TEMPORARILY DISABLED FOR TESTING: Always return children as if online
  // This is to bypass network restrictions in the testing environment
  console.log('🧪 OfflineDetector bypassed for testing environment');
  return <>{children}</>;
};

export default OfflineDetector;