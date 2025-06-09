// EmergencyRestore.tsx - Emergency data restoration using existing defaultData
import React, { useState } from 'react';
import { AlertTriangle, Database, RefreshCw, CheckCircle, Upload } from 'lucide-react';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData, getDefaultStoreItems } from './defaultData';

interface EmergencyRestoreProps {
  saveToFirebase: () => void;
  setEmployees: (employees: any[]) => void;
  setDailyData: (dailyData: any) => void;
  setTasks: (tasks: any[]) => void;
  setStoreItems: (items: any[]) => void;
  setCustomRoles: (roles: string[]) => void;
}

const EmergencyRestore: React.FC<EmergencyRestoreProps> = ({
  saveToFirebase,
  setEmployees,
  setDailyData,
  setTasks,
  setStoreItems,
  setCustomRoles
}) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStep, setRestoreStep] = useState(0);

  const restoreDefaultData = async () => {
    setIsRestoring(true);
    setRestoreStep(1);

    try {
      // Step 1: Restore employees using defaultData
      console.log('🔄 Restoring employees...');
      setEmployees(getDefaultEmployees());
      setRestoreStep(2);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Restore tasks using defaultData
      console.log('🔄 Restoring tasks...');
      setTasks(getDefaultTasks());
      setRestoreStep(3);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Restore daily data using defaultData
      console.log('🔄 Restoring daily data...');
      setDailyData(getEmptyDailyData());
      setRestoreStep(4);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 4: Restore store items using defaultData
      console.log('🔄 Restoring store items...');
      setStoreItems(getDefaultStoreItems());
      setRestoreStep(5);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 5: Restore custom roles
      console.log('🔄 Restoring custom roles...');
      setCustomRoles(['Cleaner', 'Manager', 'Supervisor']);
      setRestoreStep(6);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 6: Save to Firebase
      console.log('🔄 Saving to Firebase...');
      saveToFirebase();
      setRestoreStep(7);
      await new Promise(resolve => setTimeout(resolve, 2000));

      setRestoreStep(8);
      console.log('✅ Emergency restoration completed!');

    } catch (error) {
      console.error('❌ Emergency restoration failed:', error);
      alert('Restoration failed. Please try again or contact support.');
    } finally {
      setIsRestoring(false);
    }
  };

  const manualPointsRestore = () => {
    const pointsData = prompt(
      'Enter employee points data:\n' +
      'Format: Luka:50,Safi:75,Ehsan:30,Oleksii:90\n\n' +
      'This will restore your employees with their points:'
    );

    if (pointsData) {
      try {
        // Get default employees first
        const defaultEmployees = getDefaultEmployees();
        const entries = pointsData.split(',');
        
        const restoredEmployees = entries.map((entry, index) => {
          const [name, points] = entry.split(':');
          const defaultEmp = defaultEmployees.find(emp => emp.name.toLowerCase() === name.trim().toLowerCase()) || defaultEmployees[index];
          
          return {
            ...defaultEmp,
            name: name.trim(),
            lastUpdated: 'Points restored',
            points: parseInt(points.trim()) || 0
          };
        });

        setEmployees(restoredEmployees);
        setTimeout(() => {
          saveToFirebase();
          alert('Points restored successfully!');
        }, 1000);

      } catch (error) {
        alert('Error processing points data. Please check the format.');
      }
    }
  };

  const steps = [
    'Preparing restoration...',
    'Restoring employees...',
    'Restoring tasks...',
    'Restoring daily data...',
    'Restoring store items...',
    'Restoring settings...',
    'Saving to Firebase...',
    'Validating data...',
    'Restoration complete!'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-96 mx-4 shadow-2xl">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-4">
            🚨 Emergency Data Restoration
          </h2>
          <div className="text-gray-700 mb-6">
            Firebase database is empty or corrupted. All data needs to be restored immediately.
          </div>

          {isRestoring ? (
            <div className="space-y-4">
              <div className="text-lg font-medium text-blue-600">
                {steps[restoreStep]}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(restoreStep / (steps.length - 1)) * 100}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-center">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                <span className="text-sm text-gray-600">
                  Step {restoreStep + 1} of {steps.length}
                </span>
              </div>
            </div>
          ) : restoreStep === 8 ? (
            <div className="space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <div className="text-lg font-medium text-green-600">
                ✅ Emergency restoration completed!
              </div>
              <div className="text-sm text-gray-600">
                Your app has been restored with default data. You can now start using it normally.
              </div>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600"
              >
                Reload App
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={restoreDefaultData}
                className="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 flex items-center justify-center"
              >
                <Database className="w-5 h-5 mr-2" />
                Restore Default Data
              </button>

              <button
                onClick={manualPointsRestore}
                className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 flex items-center justify-center"
              >
                <Upload className="w-5 h-5 mr-2" />
                Manual Points Restore
              </button>

              <div className="text-xs text-gray-500 mt-4">
                <strong>Default restore:</strong> Recreates all employees, tasks, and settings with fresh data.<br/>
                <strong>Manual restore:</strong> Restore employees with their previous points if you remember them.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmergencyRestore;
