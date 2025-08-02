// migrationUtils.ts - Enhanced with missing prep migration functions
import type { Employee, Task, ScheduledPrep, PrepItem, PrepSelections, DailyDataMap } from './types';
import { getFormattedDate } from './utils';
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData } from './defaultData';

export const migrateEmployeeData = (employees: any[]): Employee[] => {
  if (!employees || !Array.isArray(employees)) return getDefaultEmployees();
  
  return employees.map(emp => ({
    id: emp.id || 0,
    name: emp.name || 'Unknown',
    mood: emp.mood || 3,
    lastUpdated: emp.lastUpdated || 'Not updated',
    role: emp.role || 'Cleaner',
    lastMoodDate: emp.lastMoodDate || null,
    points: typeof emp.points === 'number' ? emp.points : 0 // Ensure points is always a number
  }));
};

export const migrateTaskData = (tasks: any[]): Task[] => {
  if (!tasks || !Array.isArray(tasks)) return getDefaultTasks();
  
  return tasks.map(task => ({
    id: task.id || 0,
    task: task.task || 'Unknown Task',
    location: task.location || 'Unknown Location',
    priority: task.priority || 'medium',
    estimatedTime: task.estimatedTime || '30 min',
    points: typeof task.points === 'number' ? task.points : getDefaultPointsForPriority(task.priority)
  }));
};

// NEW: Missing migrateScheduledPreps function
export const migrateScheduledPreps = (scheduledPreps: any[]): ScheduledPrep[] => {
  if (!scheduledPreps || !Array.isArray(scheduledPreps)) return [];
  
  return scheduledPreps.map(prep => ({
    id: prep.id || Date.now() + Math.random(),
    prepId: prep.prepId || 0,
    name: prep.name || 'Unknown Prep',
    category: prep.category || 'muut',
    estimatedTime: prep.estimatedTime || '30 min',
    isCustom: prep.isCustom || false,
    hasRecipe: prep.hasRecipe || false,
    recipe: prep.recipe || null,
    scheduledDate: prep.scheduledDate || getFormattedDate(new Date()),
    priority: prep.priority || 'medium',
    timeSlot: prep.timeSlot || '',
    completed: typeof prep.completed === 'boolean' ? prep.completed : false, // CRITICAL: Ensure completed status is boolean
    assignedTo: prep.assignedTo || null,
    notes: prep.notes || ''
  }));
};

// NEW: Migrate prep items
export const migratePrepItems = (prepItems: any[]): PrepItem[] => {
  if (!prepItems || !Array.isArray(prepItems)) return [];
  
  return prepItems.map(item => ({
    id: item.id || Date.now() + Math.random(),
    name: item.name || 'Unknown Prep',
    category: item.category || 'muut',
    estimatedTime: item.estimatedTime || '30 min',
    isCustom: typeof item.isCustom === 'boolean' ? item.isCustom : false,
    hasRecipe: typeof item.hasRecipe === 'boolean' ? item.hasRecipe : false,
    recipe: item.recipe || null,
    frequency: typeof item.frequency === 'number' ? item.frequency : 1
  }));
};

// NEW: Migrate prep selections
export const migratePrepSelections = (prepSelections: any): PrepSelections => {
  if (!prepSelections || typeof prepSelections !== 'object') return {};
  
  const migrated: PrepSelections = {};
  Object.keys(prepSelections).forEach(key => {
    const selection = prepSelections[key];
    migrated[key] = {
      priority: selection.priority || 'medium',
      timeSlot: selection.timeSlot || '',
      selected: typeof selection.selected === 'boolean' ? selection.selected : false
    };
  });
  
  return migrated;
};

// NEW: Migrate daily data
export const migrateDailyData = (dailyData: any): DailyDataMap => {
  if (!dailyData || typeof dailyData !== 'object') return getEmptyDailyData();
  
  const migrated: DailyDataMap = {};
  Object.keys(dailyData).forEach(date => {
    const dayData = dailyData[date];
    migrated[date] = {
      completedTasks: Array.isArray(dayData.completedTasks) ? dayData.completedTasks : [],
      employeeMoods: Array.isArray(dayData.employeeMoods) ? dayData.employeeMoods : [],
      purchases: Array.isArray(dayData.purchases) ? dayData.purchases : [],
      totalTasks: typeof dayData.totalTasks === 'number' ? dayData.totalTasks : 22,
      completionRate: typeof dayData.completionRate === 'number' ? dayData.completionRate : 0,
      totalPointsEarned: typeof dayData.totalPointsEarned === 'number' ? dayData.totalPointsEarned : 0,
      totalPointsSpent: typeof dayData.totalPointsSpent === 'number' ? dayData.totalPointsSpent : 0
    };
  });
  
  return migrated;
};

const getDefaultPointsForPriority = (priority: string): number => {
  switch (priority) {
    case 'high': return 10;
    case 'medium': return 5;
    case 'low': return 3;
    default: return 5;
  }
};

export const forceDataMigration = async () => {
  console.log('🔄 Starting forced data migration...');
  
  // This function can be called to force migrate existing Firebase data
  // You can call this from the browser console if needed
  
  const baseUrl = 'https://hamptown-panel-default-rtdb.firebaseio.com';
  
  try {
    // Load existing data
    const [employeesRes, tasksRes, scheduledPrepsRes, prepItemsRes, prepSelectionsRes, dailyDataRes] = await Promise.all([
      fetch(`${baseUrl}/employees.json`),
      fetch(`${baseUrl}/tasks.json`),
      fetch(`${baseUrl}/scheduledPreps.json`),
      fetch(`${baseUrl}/prepItems.json`),
      fetch(`${baseUrl}/prepSelections.json`),
      fetch(`${baseUrl}/dailyData.json`)
    ]);
    
    const [existingEmployees, existingTasks, existingScheduledPreps, existingPrepItems, existingPrepSelections, existingDailyData] = await Promise.all([
      employeesRes.json(),
      tasksRes.json(),
      scheduledPrepsRes.json(),
      prepItemsRes.json(),
      prepSelectionsRes.json(),
      dailyDataRes.json()
    ]);
    
    // Migrate data
    const migratedEmployees = migrateEmployeeData(existingEmployees || []);
    const migratedTasks = migrateTaskData(existingTasks || []);
    const migratedScheduledPreps = migrateScheduledPreps(existingScheduledPreps || []);
    const migratedPrepItems = migratePrepItems(existingPrepItems || []);
    const migratedPrepSelections = migratePrepSelections(existingPrepSelections || {});
    const migratedDailyData = migrateDailyData(existingDailyData || {});
    
    // Save migrated data back
    await Promise.all([
      fetch(`${baseUrl}/employees.json`, {
        method: 'PUT',
        body: JSON.stringify(migratedEmployees)
      }),
      fetch(`${baseUrl}/tasks.json`, {
        method: 'PUT',
        body: JSON.stringify(migratedTasks)
      }),
      fetch(`${baseUrl}/scheduledPreps.json`, {
        method: 'PUT',
        body: JSON.stringify(migratedScheduledPreps)
      }),
      fetch(`${baseUrl}/prepItems.json`, {
        method: 'PUT',
        body: JSON.stringify(migratedPrepItems)
      }),
      fetch(`${baseUrl}/prepSelections.json`, {
        method: 'PUT',
        body: JSON.stringify(migratedPrepSelections)
      }),
      fetch(`${baseUrl}/dailyData.json`, {
        method: 'PUT',
        body: JSON.stringify(migratedDailyData)
      })
    ]);
    
    console.log('✅ Enhanced data migration completed successfully');
    console.log('👥 Migrated employees:', migratedEmployees);
    console.log('📋 Migrated tasks:', migratedTasks);
    console.log('🍳 Migrated scheduled preps:', migratedScheduledPreps);
    console.log('📝 Migrated prep items:', migratedPrepItems);
    console.log('📊 Migrated daily data:', Object.keys(migratedDailyData).length, 'days');
    
    return { 
      employees: migratedEmployees, 
      tasks: migratedTasks,
      scheduledPreps: migratedScheduledPreps,
      prepItems: migratedPrepItems,
      prepSelections: migratedPrepSelections,
      dailyData: migratedDailyData
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// NEW: Utility to get data summary for debugging
export const getDataSummary = (dataType: string, data: any) => {
  if (!data) return { type: dataType, count: 0, sample: null };
  
  if (Array.isArray(data)) {
    return {
      type: dataType,
      count: data.length,
      sample: data.slice(0, 3)
    };
  }
  
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    return {
      type: dataType,
      count: keys.length,
      sample: keys.slice(0, 3).reduce((acc, key) => {
        acc[key] = data[key];
        return acc;
      }, {} as any)
    };
  }
  
  return { type: dataType, count: 1, sample: data };
};

// NEW: Utility to validate migrated data
export const validateMigratedData = (data: any, dataType: string): boolean => {
  try {
    switch (dataType) {
      case 'employees':
        return Array.isArray(data) && data.every(emp => 
          typeof emp.id === 'number' && 
          typeof emp.name === 'string' && 
          typeof emp.points === 'number'
        );
        
      case 'tasks':
        return Array.isArray(data) && data.every(task => 
          typeof task.id === 'number' && 
          typeof task.task === 'string' && 
          typeof task.points === 'number'
        );
        
      case 'scheduledPreps':
        return Array.isArray(data) && data.every(prep => 
          typeof prep.id !== 'undefined' && 
          typeof prep.name === 'string' && 
          typeof prep.completed === 'boolean'
        );
        
      case 'prepItems':
        return Array.isArray(data) && data.every(item => 
          typeof item.id !== 'undefined' && 
          typeof item.name === 'string'
        );
        
      default:
        return true;
    }
  } catch (error) {
    console.error(`❌ Validation failed for ${dataType}:`, error);
    return false;
  }
};

// NEW: Clean up function to remove invalid entries
export const cleanupData = (data: any[], dataType: string): any[] => {
  return data.filter(item => {
    switch (dataType) {
      case 'employees':
        return item && typeof item.name === 'string' && item.name.trim() !== '';
        
      case 'tasks':
        return item && typeof item.task === 'string' && item.task.trim() !== '';
        
      case 'scheduledPreps':
        return item && typeof item.name === 'string' && item.name.trim() !== '';
        
      case 'prepItems':
        return item && typeof item.name === 'string' && item.name.trim() !== '';
        
      default:
        return true;
    }
  });
};
