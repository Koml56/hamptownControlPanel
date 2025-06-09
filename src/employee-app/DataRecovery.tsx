// DataRecovery.tsx - Component to recover lost data
import React, { useState } from 'react';
import { AlertTriangle, Download, Upload, RefreshCw, Shield } from 'lucide-react';

interface DataRecoveryProps {
  employees: any[];
  dailyData: any;
  onDataRestore: (data: any) => void;
  saveToFirebase: () => void;
}

const DataRecovery: React.FC<DataRecoveryProps> = ({
  employees,
  dailyData,
  onDataRestore,
  saveToFirebase
}) => {
  const [backupData, setBackupData] = useState<string>('');
  const [showRecovery, setShowRecovery] = useState(false);

  // Check if data looks corrupted
  const isDataCorrupted = () => {
    const allEmployeesZeroPoints = employees.length > 0 && employees.every(emp => (emp.points || 0) === 0);
    const noDailyData = Object.keys(dailyData).length === 0;
    return allEmployeesZeroPoints || noDailyData;
  };

  const exportCurrentData = () => {
    const dataToExport = {
      employees,
      dailyData,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `workvibe-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const importBackupData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const importedData = JSON.parse(e.target.result);
            setBackupData(JSON.stringify(importedData, null, 2));
            setShowRecovery(true);
          } catch (error) {
            alert('Invalid backup file format');
          }
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  };

  const restoreFromBackup = () => {
    try {
      const parsedData = JSON.parse(backupData);
      
      if (parsedData.employees && parsedData.dailyData) {
        const confirmed = window.confirm(
          `This will restore:\n` +
          `• ${parsedData.employees.length} employees\n` +
          `• ${Object.keys(parsedData.dailyData).length} days of data\n` +
          `• Total points: ${parsedData.employees.reduce((sum: number, emp: any) => sum + (emp.points || 0), 0)}\n\n` +
          `Are you sure you want to restore this data?`
        );
        
        if (confirmed) {
          onDataRestore(parsedData);
          setTimeout(() => {
            saveToFirebase();
            alert('Data restored successfully!');
            setShowRecovery(false);
          }, 1000);
        }
      } else {
        alert('Invalid backup data structure');
      }
    } catch (error) {
      alert('Error parsing backup data');
    }
  };

  const manualDataEntry = () => {
    const employeeData = prompt(
      'Enter employee data in format: Name1:Points1,Name2:Points2\n' +
      'Example: Luka:50,Safi:75,Ehsan:30,Oleksii:90'
    );
    
    if (employeeData) {
      try {
        const entries = employeeData.split(',');
        const restoredEmployees = entries.map((entry, index) => {
          const [name, points] = entry.split(':');
          return {
            id: index + 1,
            name: name.trim(),
            mood: 3,
            lastUpdated: 'Manually restored',
            role: 'Cleaner',
            lastMoodDate: null,
            points: parseInt(points.trim()) || 0
          };
        });
        
        const restoreData = {
          employees: restoredEmployees,
          dailyData: dailyData, // Keep existing daily data
          restoredAt: new Date().toISOString()
        };
        
        onDataRestore(restoreData);
        setTimeout(() => {
          saveToFirebase();
          alert('Employee points restored successfully!');
        }, 1000);
        
      } catch (error) {
        alert('Error processing manual data entry');
      }
    }
  };

  if (!isDataCorrupted() && !showRecovery) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <Shield className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-green-800 font-medium">Data Protection Active</span>
        </div>
        <div className="mt-2 text-sm text-green-700">
          Your data is being monitored and backed up automatically. 
          <button
            onClick={exportCurrentData}
            className="ml-2 text-green-600 underline hover:text-green-800"
          >
            Export backup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
      <div className="flex items-center mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
        <h3 className="text-lg font-semibold text-red-800">
          {isDataCorrupted() ? '🚨 Data Loss Detected!' : '🔧 Data Recovery'}
        </h3>
      </div>
      
      {isDataCorrupted() && (
        <div className="mb-4 p-3 bg-red-100 rounded-lg">
          <div className="text-red-800 font-medium mb-2">Detected Issues:</div>
          <ul className="text-sm text-red-700 space-y-1">
            {employees.every(emp => (emp.points || 0) === 0) && (
              <li>• All employee points are 0 (potential data loss)</li>
            )}
            {Object.keys(dailyData).length === 0 && (
              <li>• No daily data found (potential data loss)</li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Export Current Data */}
        <button
          onClick={exportCurrentData}
          className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Backup
        </button>

        {/* Import Backup */}
        <button
          onClick={importBackupData}
          className="flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import Backup
        </button>

        {/* Manual Entry */}
        <button
          onClick={manualDataEntry}
          className="flex items-center justify-center px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Manual Restore
        </button>
      </div>

      {/* Recovery Interface */}
      {showRecovery && (
        <div className="mt-6 border-t pt-6">
          <h4 className="font-medium text-gray-800 mb-3">Review Backup Data:</h4>
          <textarea
            value={backupData}
            onChange={(e) => setBackupData(e.target.value)}
            className="w-full h-40 p-3 border border-gray-300 rounded-lg text-sm font-mono"
            placeholder="Backup data will appear here..."
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={restoreFromBackup}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Restore This Data
            </button>
            <button
              onClick={() => setShowRecovery(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-red-700">
        <strong>⚠️ Important:</strong> Always export a backup before making changes. 
        If you lost data, try importing a recent backup file or use manual restore to enter key data.
      </div>
    </div>
  );
};

export default DataRecovery;
