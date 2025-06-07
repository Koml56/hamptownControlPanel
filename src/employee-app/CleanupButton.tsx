// CleanupButton.tsx - Add this to your AdminPanel temporarily
import React, { useState } from 'react';
import { Trash2, BarChart3, RefreshCw } from 'lucide-react';
import { analyzeDailyData, runCleanupOnFirebaseData } from './cleanupUtils';
import type { DailyDataMap } from './types';

interface CleanupButtonProps {
  dailyData: DailyDataMap;
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void;
  saveToFirebase: () => void;
}

const CleanupButton: React.FC<CleanupButtonProps> = ({
  dailyData,
  setDailyData,
  saveToFirebase
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    console.log('🔍 Starting analysis...');
    
    const result = analyzeDailyData(dailyData);
    setAnalysisResult(result);
    
    setIsAnalyzing(false);
    alert(`Analysis complete!\n\nTotal days: ${result.totalDays}\nDays with duplicates: ${result.daysWithDuplicates}\nTotal duplicates: ${result.totalDuplicates}\n\nCheck console for detailed results.`);
  };

  const handleCleanup = async () => {
    if (!analysisResult || analysisResult.totalDuplicates === 0) {
      alert('No duplicates found to clean up. Run analysis first.');
      return;
    }

    const confirmed = window.confirm(
      `This will remove ${analysisResult.totalDuplicates} duplicate task completions from ${analysisResult.daysWithDuplicates} days.\n\nThis action cannot be undone. Continue?`
    );

    if (!confirmed) return;

    setIsCleaning(true);
    console.log('🧹 Starting cleanup...');

    try {
      await runCleanupOnFirebaseData(dailyData, setDailyData, saveToFirebase);
      alert('Cleanup completed successfully! Check console for details.');
      setAnalysisResult(null); // Reset analysis
    } catch (error) {
      console.error('Cleanup failed:', error);
      alert('Cleanup failed. Check console for errors.');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
        <Trash2 className="w-4 h-4 mr-2" />
        🧹 Data Cleanup Tools
      </h4>
      
      <div className="text-sm text-yellow-700 mb-4">
        These tools help identify and remove duplicate task completions that may have been created 
        when tasks were marked done → undone → done again.
      </div>

      {analysisResult && (
        <div className="bg-white rounded-lg p-3 mb-4 border">
          <h5 className="font-medium text-gray-800 mb-2">📊 Analysis Results:</h5>
          <div className="text-sm space-y-1">
            <div>• Total days analyzed: <strong>{analysisResult.totalDays}</strong></div>
            <div>• Days with duplicates: <strong>{analysisResult.daysWithDuplicates}</strong></div>
            <div>• Total duplicate completions: <strong className="text-red-600">{analysisResult.totalDuplicates}</strong></div>
          </div>
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <BarChart3 className="w-4 h-4 mr-2" />
          )}
          {isAnalyzing ? 'Analyzing...' : 'Analyze Data'}
        </button>
        
        <button
          onClick={handleCleanup}
          disabled={isCleaning || !analysisResult || analysisResult.totalDuplicates === 0}
          className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCleaning ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 mr-2" />
          )}
          {isCleaning ? 'Cleaning...' : 'Clean Duplicates'}
        </button>
      </div>
      
      <div className="text-xs text-yellow-600 mt-3">
        ⚠️ Always run analysis first. Cleanup modifies data permanently. Remove this component after cleanup.
      </div>
    </div>
  );
};

export default CleanupButton;
