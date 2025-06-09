// EmergencyRestore.tsx - Emergency data restoration when Firebase is empty
import React, { useState } from 'react';
import { AlertTriangle, Database, RefreshCw, CheckCircle, Upload } from 'lucide-react';

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

  // Your original employee data structure
  const getDefaultEmployees = () => [
    { id: 1, name: 'Luka', mood: 3, lastUpdated: 'Restored', role: 'Cleaner', lastMoodDate: null, points: 0 },
    { id: 2, name: 'Safi', mood: 3, lastUpdated: 'Restored', role: 'Cleaner', lastMoodDate: null, points: 0 },
    { id: 3, name: 'Ehsan', mood: 3, lastUpdated: 'Restored', role: 'Cleaner', lastMoodDate: null, points: 0 },
    { id: 4, name: 'Oleksii', mood: 3, lastUpdated: 'Restored', role: 'Manager', lastMoodDate: null, points: 0 }
  ];

  // Your original task data
  const getDefaultTasks = () => [
    { id: 1, task: 'Water all plants', location: 'Dining Area', priority: 'medium', estimatedTime: '10 min', points: 5 },
    { id: 2, task: 'Refill toilet paper', location: 'Restroom', priority: 'high', estimatedTime: '5 min', points: 8 },
    { id: 3, task: 'Sweep the floor', location: 'Kitchen', priority: 'high', estimatedTime: '15 min', points: 10 },
    { id: 4, task: 'Wipe refrigerator surfaces', location: 'Kitchen', priority: 'medium', estimatedTime: '10 min', points: 7 },
    { id: 5, task: 'Light glass wipe', location: 'Kitchen (kylmävitrini)', priority: 'low', estimatedTime: '5 min', points: 3 },
    { id: 6, task: 'Refill takeaway & snack boxes', location: 'Kitchen', priority: 'medium', estimatedTime: '10 min', points: 6 },
    { id: 7, task: 'Stock napkins', location: 'Kitchen', priority: 'medium', estimatedTime: '5 min', points: 4 },
    { id: 8, task: 'Wipe and disinfect tables', location: 'Dining Area', priority: 'high', estimatedTime: '20 min', points: 12 },
    { id: 9, task: 'Clean table legs', location: 'Dining Area', priority: 'low', estimatedTime: '15 min', points: 8 },
    { id: 10, task: 'Vacuum the floor', location: 'Dining Area', priority: 'high', estimatedTime: '20 min', points: 15 },
    { id: 11, task: 'Clean sink and mirror', location: 'Restroom', priority: 'high', estimatedTime: '10 min', points: 9 },
    { id: 12, task: 'Clean inside the toilet', location: 'Restroom', priority: 'high', estimatedTime: '15 min', points: 12 },
    { id: 13, task: 'Replace towel roll', location: 'Restroom', priority: 'medium', estimatedTime: '5 min', points: 4 },
    { id: 14, task: 'Final disinfection (POS, Foodora, Wolt)', location: 'POS / Front', priority: 'high', estimatedTime: '10 min', points: 10 },
    { id: 15, task: 'Sweep the floor', location: 'Kitchen (Floor)', priority: 'high', estimatedTime: '15 min', points: 10 },
    { id: 16, task: 'Mop the floor (every 2 days)', location: 'Kitchen (Floor)', priority: 'high', estimatedTime: '20 min', points: 15 },
    { id: 17, task: 'Full grill cleaning', location: 'Kitchen', priority: 'high', estimatedTime: '45 min', points: 25 },
    { id: 18, task: 'Sanitize all surfaces', location: 'Kitchen', priority: 'high', estimatedTime: '25 min', points: 18 },
    { id: 19, task: 'Wipe dishwasher surface', location: 'Apu-Kitchen', priority: 'medium', estimatedTime: '10 min', points: 6 },
    { id: 20, task: 'Replace hood filter (every 3 days)', location: 'Kitchen', priority: 'medium', estimatedTime: '15 min', points: 8 },
    { id: 21, task: 'Cover all food containers', location: 'Storage', priority: 'high', estimatedTime: '10 min', points: 7 },
    { id: 22, task: 'Organize containers', location: 'Apu-Kitchen', priority: 'low', estimatedTime: '15 min', points: 5 }
  ];

  const getDefaultStoreItems = () => [
    { id: 1, name: 'Free Coffee', description: 'Get a free coffee from the kitchen', cost: 10, category: 'food', icon: '☕', available: true },
    { id: 2, name: 'Free Lunch', description: 'Get a free meal from the restaurant', cost: 50, category: 'food', icon: '🍽️', available: true },
    { id: 3, name: 'Free Meal for Friend', description: 'Bring a friend for a free meal', cost: 80, category: 'social', icon: '👥', available: true },
    { id: 4, name: '30min Break Extension', description: 'Extend your break by 30 minutes', cost: 25, category: 'break', icon: '⏰', available: true },
    { id: 5, name: 'Early Leave (1 hour)', description: 'Leave work 1 hour early', cost: 60, category: 'break', icon: '🚪', available: true },
    { id: 6, name: 'Free Snack', description: 'Get any snack from the kitchen', cost: 15, category: 'food', icon: '🍿', available: true },
    { id: 7, name: 'Choose Next Week Schedule', description: 'Pick your preferred shifts next week', cost: 100, category: 'reward', icon: '📅', available: true },
    { id: 8, name: 'Team Building Activity', description: 'Organize a fun team activity', cost: 150, category: 'social', icon: '🎉', available: true },
    { id: 9, name: 'Free Dessert', description: 'Get any dessert from the menu', cost: 20, category: 'food', icon: '🍰', available: true },
    { id: 10, name: 'Reserved Parking Spot', description: 'Get the best parking spot for a week', cost: 40, category: 'reward', icon: '🚗', available: true }
  ];

  const getEmptyDailyData = () => {
    const today = new Date();
    const dailyData: any = {};
    
    // Create empty structure for last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      dailyData[dateStr] = {
        completedTasks: [],
        employeeMoods: [],
        purchases: [],
        totalTasks: 22,
        completionRate: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0
      };
    }
    
    return dailyData;
  };

  const restoreDefaultData = async () => {
    setIsRestoring(true);
    setRestoreStep(1);

    try {
      // Step 1: Restore employees
      console.log('🔄 Restoring employees...');
      setEmployees(getDefaultEmployees());
      setRestoreStep(2);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Restore tasks
      console.log('🔄 Restoring tasks...');
      setTasks(getDefaultTasks());
      setRestoreStep(3);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Restore daily data
      console.log('🔄 Restoring daily data...');
      setDailyData(getEmptyDailyData());
      setRestoreStep(4);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 4: Restore store items
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
        const entries = pointsData.split(',');
        const restoredEmployees = entries.map((entry, index) => {
          const [name, points] = entry.split(':');
          return {
            id: index + 1,
            name: name.trim(),
            mood: 3,
            lastUpdated: 'Points restored',
            role: index === 3 ? 'Manager' : 'Cleaner', // Assuming Oleksii is manager
            lastMoodDate: null,
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
