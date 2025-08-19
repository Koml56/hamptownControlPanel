// CrossTabDebugPanel.tsx
// Debug panel to show cross-tab operation coordination status

import React, { useState, useEffect } from 'react';
import { getCrossTabManagerStatus, getCrossTabDeviceId } from './taskFunctions';

interface CrossTabDebugPanelProps {
  isVisible?: boolean;
}

const CrossTabDebugPanel: React.FC<CrossTabDebugPanelProps> = ({ isVisible = false }) => {
  const [status, setStatus] = useState({ pendingCount: 0, ownOperations: 0, deviceId: '' });
  const [isExpanded, setIsExpanded] = useState(isVisible);

  useEffect(() => {
    const updateStatus = () => {
      setStatus(getCrossTabManagerStatus());
    };

    // Update status immediately
    updateStatus();

    // Update status every second
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const deviceId = getCrossTabDeviceId();

  if (!isExpanded) {
    return null; // Hide the sync debug panel
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 z-50 min-w-[300px]">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800">Cross-Tab Sync Debug</h3>
        <button 
          onClick={() => setIsExpanded(false)}
          className="text-gray-500 hover:text-gray-700 text-xl"
          title="Minimize"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Device ID:</span>
          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
            {deviceId.slice(-8)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Pending Operations:</span>
          <span className={`font-bold ${status.pendingCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {status.pendingCount}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Own Operations:</span>
          <span className={`font-bold ${status.ownOperations > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
            {status.ownOperations}
          </span>
        </div>
        
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Status: {status.pendingCount > 0 ? (
              <span className="text-orange-600 font-medium">Operations Active</span>
            ) : (
              <span className="text-green-600 font-medium">All Clear</span>
            )}
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-400">
          Open multiple tabs and try rapid clicking to see coordination in action.
        </div>
      </div>
    </div>
  );
};

export default CrossTabDebugPanel;