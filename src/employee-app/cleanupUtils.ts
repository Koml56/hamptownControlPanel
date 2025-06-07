// cleanupUtils.ts - Utility to clean up duplicate task completions in daily data
import type { DailyDataMap } from './types';

export const cleanupDuplicateCompletions = (dailyData: DailyDataMap): DailyDataMap => {
  console.log('🧹 Starting cleanup of duplicate task completions...');
  
  const cleanedData: DailyDataMap = {};
  let totalDuplicatesRemoved = 0;
  
  Object.keys(dailyData).forEach(date => {
    const dayData = dailyData[date];
    
    if (!dayData || !Array.isArray(dayData.completedTasks)) {
      cleanedData[date] = dayData;
      return;
    }
    
    // Group completions by taskId and keep only the most recent one
    const completionsByTask = new Map();
    
    dayData.completedTasks.forEach((completion: any) => {
      const taskId = completion.taskId;
      
      if (!completionsByTask.has(taskId)) {
        // First completion for this task
        completionsByTask.set(taskId, completion);
      } else {
        // Duplicate found - keep the one with the latest timestamp
        const existing = completionsByTask.get(taskId);
        const existingTime = new Date(`${date} ${existing.completedAt}`).getTime();
        const newTime = new Date(`${date} ${completion.completedAt}`).getTime();
        
        if (newTime > existingTime) {
          console.log(`🔄 Replacing duplicate completion for task ${taskId} on ${date}`);
          completionsByTask.set(taskId, completion);
          totalDuplicatesRemoved++;
        } else {
          console.log(`🗑️ Removing duplicate completion for task ${taskId} on ${date}`);
          totalDuplicatesRemoved++;
        }
      }
    });
    
    // Convert back to array
    const cleanedCompletions = Array.from(completionsByTask.values());
    
    // Recalculate stats
    const newCompletionRate = Math.round((cleanedCompletions.length / (dayData.totalTasks || 22)) * 100);
    const newTotalPointsEarned = cleanedCompletions.reduce((sum: number, completion: any) => 
      sum + (completion.pointsEarned || 0), 0
    );
    
    cleanedData[date] = {
      ...dayData,
      completedTasks: cleanedCompletions,
      completionRate: newCompletionRate,
      totalPointsEarned: newTotalPointsEarned
    };
    
    if (cleanedCompletions.length !== dayData.completedTasks.length) {
      console.log(`📅 ${date}: Cleaned ${dayData.completedTasks.length - cleanedCompletions.length} duplicates`);
    }
  });
  
  console.log(`✅ Cleanup complete! Removed ${totalDuplicatesRemoved} duplicate completions total`);
  
  return cleanedData;
};

// Function to run cleanup on existing Firebase data
export const runCleanupOnFirebaseData = async (
  dailyData: DailyDataMap,
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void,
  saveToFirebase: () => void
) => {
  console.log('🚀 Running cleanup on Firebase data...');
  
  const cleanedData = cleanupDuplicateCompletions(dailyData);
  
  // Update the state with cleaned data
  setDailyData(() => cleanedData);
  
  // Save to Firebase
  setTimeout(() => {
    saveToFirebase();
    console.log('💾 Cleaned data saved to Firebase');
  }, 1000);
  
  return cleanedData;
};

// Debug function to analyze current data
export const analyzeDailyData = (dailyData: DailyDataMap) => {
  console.log('🔍 Analyzing daily data for duplicates...');
  
  let totalDays = 0;
  let daysWithDuplicates = 0;
  let totalDuplicates = 0;
  
  Object.keys(dailyData).forEach(date => {
    const dayData = dailyData[date];
    
    if (!dayData || !Array.isArray(dayData.completedTasks)) {
      return;
    }
    
    totalDays++;
    
    // Count duplicates by taskId
    const taskIds = dayData.completedTasks.map((c: any) => c.taskId);
    const uniqueTaskIds = new Set(taskIds);
    const duplicates = taskIds.length - uniqueTaskIds.size;
    
    if (duplicates > 0) {
      daysWithDuplicates++;
      totalDuplicates += duplicates;
      console.log(`📅 ${date}: ${duplicates} duplicates found in ${dayData.completedTasks.length} completions`);
    }
  });
  
  console.log(`📊 Analysis Results:`);
  console.log(`   Total days analyzed: ${totalDays}`);
  console.log(`   Days with duplicates: ${daysWithDuplicates}`);
  console.log(`   Total duplicate completions: ${totalDuplicates}`);
  
  return {
    totalDays,
    daysWithDuplicates,
    totalDuplicates
  };
};
