// PrepDebugComponent.tsx - Debug tool for testing prep completion save/load
import React, { useState } from 'react';
import { RefreshCw, Database, Eye, TestTube } from 'lucide-react';
import { getFormattedDate } from './utils';
import type { ScheduledPrep, ConnectionStatus } from './types';

interface PrepDebugComponentProps {
  scheduledPreps: ScheduledPrep[];
  connectionStatus: ConnectionStatus;
  quickSave: (field: string, data: any) => Promise<boolean>;
  loadFromFirebase: () => Promise<void>;
}

const PrepDebugComponent: React.FC<PrepDebugComponentProps> = ({
  scheduledPreps,
  connectionStatus,
  quickSave,
  loadFromFirebase
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<string>('');

  const todayStr = getFormattedDate(new Date());
  const todayPreps = scheduledPreps.filter(prep => prep.scheduledDate === todayStr);
  const todayCompleted = todayPreps.filter(prep => prep.completed === true);

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 DEBUG: Force refreshing from Firebase...');
      await loadFromFirebase();
      setLastTestResult(`✅ Refresh completed at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      setLastTestResult(`❌ Refresh failed: ${error}`);
      console.error('❌ DEBUG: Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleForceSave = async () => {
    try {
      console.log('🔥 DEBUG: Force saving scheduledPreps to Firebase...');
      const success = await quickSave('scheduledPreps', scheduledPreps);
      setLastTestResult(success 
        ? `✅ Save completed at ${new Date().toLocaleTimeString()}`
        : `❌ Save failed at ${new Date().toLocaleTimeString()}`
      );
    } catch (error) {
      setLastTestResult(`❌ Save failed: ${error}`);
      console.error('❌ DEBUG: Save failed:', error);
    }
  };

  const handleTestCompletionCycle = async () => {
    if (todayPreps.length === 0) {
      setLastTestResult('❌ No today\'s preps to test');
      return;
    }

    try {
      console.log('🧪 DEBUG: Testing completion cycle...');
      
      // Step 1: Save current state
      console.log('Step 1: Saving current state');
      await quickSave('scheduledPreps', scheduledPreps);
      
      // Step 2: Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 3: Reload from Firebase
      console.log('Step 2: Reloading from Firebase');
      await loadFromFirebase();
      
      setLastTestResult(`✅ Test cycle completed at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      setLastTestResult(`❌ Test cycle failed: ${error}`);
      console.error('❌ DEBUG: Test cycle failed:', error);
    }
  };

  const handleVerifyFirebaseData = async () => {
    try {
      console.log('🔍 DEBUG: Verifying Firebase data...');
      const response = await fetch('https://hamptown-panel-default-rtdb.firebaseio.com/scheduledPreps.json');
      const firebaseData = await response.json();
      
      if (firebaseData) {
        const firebaseTodayPreps = firebaseData.filter((prep: any) => prep.scheduledDate === todayStr);
        const firebaseTodayCompleted = firebaseTodayPreps.filter((prep: any) => prep.completed === true);
        
        console.log('🔍 Firebase verification result:', {
          firebaseTotal: firebaseData.length,
          firebaseTodayCount: firebaseTodayPreps.length,
          firebaseTodayCompleted: firebaseTodayCompleted.length,
          localTotal: scheduledPreps.length,
          localTodayCount: todayPreps.length,
          localTodayCompleted: todayCompleted.length,
          matches: firebaseTodayCompleted.length === todayCompleted.length
        });
        
        setLastTestResult(
          firebaseTodayCompleted.length === todayCompleted.length
            ? `✅ Data matches Firebase (${firebaseTodayCompleted.length}/${firebaseTodayPreps.length} completed)`
            : `❌ Data mismatch: Local=${todayCompleted.length}, Firebase=${firebaseTodayCompleted.length}`
        );
      } else {
        setLastTestResult('❌ No data found in Firebase');
      }
    } catch (error) {
      setLastTestResult(`❌ Verification failed: ${error}`);
      console.error('❌ DEBUG: Verification failed:', error);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <TestTube className="w-5 h-5 text-yellow-600 mr-2" />
          <h3 className="font-bold text-yellow-800">🧪 Prep Debug Panel</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center px-3 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300 text-sm"
        >
          <Eye className="w-4 h-4 mr-1" />
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="bg-white rounded p-2 text-center">
          <div className="text-sm font-medium text-gray-600">Total Preps</div>
          <div className="text-lg font-bold text-blue-600">{scheduledPreps.length}</div>
        </div>
        <div className="bg-white rounded p-2 text-center">
          <div className="text-sm font-medium text-gray-600">Today's Preps</div>
          <div className="text-lg font-bold text-green-600">{todayPreps.length}</div>
        </div>
        <div className="bg-white rounded p-2 text-center">
          <div className="text-sm font-medium text-gray-600">Completed</div>
          <div className="text-lg font-bold text-purple-600">{todayCompleted.length}</div>
        </div>
        <div className="bg-white rounded p-2 text-center">
          <div className="text-sm font-medium text-gray-600">Completion %</div>
          <div className="text-lg font-bold text-orange-600">
            {todayPreps.length > 0 ? Math.round((todayCompleted.length / todayPreps.length) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center space-x-4 mb-3 text-sm">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span>Firebase: {connectionStatus}</span>
        </div>
        <div className="flex items-center">
          <Database className="w-4 h-4 mr-1 text-blue-500" />
          <span>Last Test: {lastTestResult || 'None'}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleForceSave}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 flex items-center"
        >
          <Database className="w-4 h-4 mr-1" />
          Force Save
        </button>
        <button
          onClick={handleForceRefresh}
          disabled={isRefreshing}
          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 flex items-center disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Force Reload
        </button>
        <button
          onClick={handleTestCompletionCycle}
          className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
        >
          Test Cycle
        </button>
        <button
          onClick={handleVerifyFirebaseData}
          className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
        >
          Verify Firebase
        </button>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="border-t pt-3">
          <h4 className="font-medium text-gray-700 mb-2">Today's Prep Details:</h4>
          {todayPreps.length > 0 ? (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {todayPreps.map(prep => (
                <div key={prep.id} className="flex items-center justify-between p-2 bg-white rounded text-sm">
                  <span className="font-medium">{prep.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    prep.completed 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {prep.completed ? '✅ Done' : '⏳ Pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm italic">No prep items scheduled for today</div>
          )}
        </div>
      )}

      <div className="text-xs text-yellow-600 mt-2">
        💡 This debug panel helps test prep completion save/load cycles. Remove in production.
      </div>
    </div>
  );
};

export default PrepDebugComponent;
