// RealTimeSyncIndicator.tsx - Shows real-time sync status
import React from 'react';
import { Wifi, WifiOff, Users, Monitor } from 'lucide-react';
import { useSyncStatus } from './useRealTimeSync';

interface RealTimeSyncIndicatorProps {
  className?: string;
}

const RealTimeSyncIndicator: React.FC<RealTimeSyncIndicatorProps> = ({ 
  className = '' 
}) => {
  const { connectedDevices, isConnected, deviceList } = useSyncStatus();
  
  const indicatorStyle = {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    background: isConnected ? '#10b981' : '#ef4444',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  };
  
  const [showDetails, setShowDetails] = React.useState(false);
  
  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };
  
  return (
    <>
      <div 
        style={indicatorStyle}
        className={className}
        onClick={toggleDetails}
        title={`${connectedDevices} device(s) connected - Click for details`}
      >
        {isConnected ? (
          <Wifi size={14} />
        ) : (
          <WifiOff size={14} />
        )}
        <Users size={14} />
        <span>{connectedDevices}</span>
        {connectedDevices > 1 && (
          <span className="animate-pulse">●</span>
        )}
      </div>
      
      {showDetails && (
        <div
          style={{
            position: 'fixed',
            bottom: '70px',
            right: '20px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1001,
            minWidth: '200px',
            maxWidth: '300px'
          }}
        >
          <div style={{ 
            fontWeight: '600', 
            marginBottom: '8px',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Monitor size={14} />
            Real-Time Sync Status
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <strong>Status:</strong>{' '}
            <span style={{ color: isConnected ? '#10b981' : '#ef4444' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <strong>Devices:</strong> {connectedDevices} connected
          </div>
          
          {deviceList.length > 0 && (
            <div>
              <strong>Connected Devices:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                {deviceList.map((device, index) => (
                  <li key={device.id} style={{ margin: '2px 0' }}>
                    {device.name}
                    {device.id.includes(sessionStorage.getItem('hamptown_device_id') || '') && (
                      <span style={{ color: '#10b981', fontWeight: '600' }}> (This device)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div style={{ 
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '11px',
            color: '#6b7280'
          }}>
            Real-time sync active for:
            <br />• Cleaning Tasks
            <br />• Today's Preps  
            <br />• Plan Preps
          </div>
          
          <button
            onClick={toggleDetails}
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};

export default RealTimeSyncIndicator;