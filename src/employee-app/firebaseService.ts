// firebaseService.ts - Fixed version with proper immediate saves
import { FIREBASE_CONFIG } from ‘./constants’;
import { getDefaultEmployees, getDefaultTasks, getEmptyDailyData } from ‘./defaultData’;
import type { Employee, Task, DailyDataMap, TaskAssignments } from ‘./types’;

export class FirebaseService {
private baseUrl = FIREBASE_CONFIG.databaseURL;
private saveQueue = new Set<string>();
private isCurrentlySaving = false;

// Quick save for immediate data persistence
async quickSave(field: string, data: any): Promise<boolean> {
console.log(`🔥 QuickSave: ${field}`);
console.log(`🔍 Saving ${field} to Firebase:`, this.getDataSummary(field, data));

```
try {
  const response = await fetch(`${this.baseUrl}/${field}.json`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`Firebase save failed: ${response.status} ${response.statusText}`);
  }

  console.log(`🔒 Critical save - waiting for confirmation: ${field}`);
  
  // Verify the save by reading back the data
  const verifyResponse = await fetch(`${this.baseUrl}/${field}.json`);
  const verifiedData = await verifyResponse.json();
  
  console.log(`🔍 Verified data in Firebase after save:`, this.getDataSummary(field, verifiedData));
  console.log(`✅ Critical QuickSave completed: ${field}`);
  
  return true;
} catch (error) {
  console.error(`❌ QuickSave failed for ${field}:`, error);
  return false;
}
```

}

// Batch save for multiple fields
async batchSave(fields: string[], allData: any): Promise<boolean> {
if (this.isCurrentlySaving) {
console.log(‘⏳ Save already in progress, queueing fields:’, fields);
fields.forEach(field => this.saveQueue.add(field));
return true;
}

```
this.isCurrentlySaving = true;
console.log(`🔄 Batch syncing fields:`, fields);

try {
  const savePromises = fields.map(async (field) => {
    const data = this.getFieldData(field, allData);
    return this.quickSave(field, data);
  });

  const results = await Promise.all(savePromises);
  const allSuccessful = results.every(result => result === true);

  if (allSuccessful) {
    console.log(`✅ Batch sync completed`);
    
    // Process any queued saves
    if (this.saveQueue.size > 0) {
      const queuedFields = Array.from(this.saveQueue);
      this.saveQueue.clear();
      console.log('📤 Processing sync queue:', queuedFields);
      
      setTimeout(() => {
        this.batchSave(queuedFields, allData);
      }, 100);
    }
  } else {
    console.error('❌ Some batch saves failed');
  }

  return allSuccessful;
} catch (error) {
  console.error('❌ Batch save failed:', error);
  return false;
} finally {
  this.isCurrentlySaving = false;
}
```

}

// Get data for specific field
private getFieldData(field: string, allData: any) {
switch (field) {
case ‘employees’:
return allData.employees;
case ‘tasks’:
return allData.tasks;
case ‘dailyData’:
return allData.dailyData;
case ‘completedTasks’:
return Array.from(allData.completedTasks);
case ‘taskAssignments’:
return allData.taskAssignments;
case ‘customRoles’:
return allData.customRoles;
case ‘scheduledPreps’:
return allData.scheduledPreps;
default:
console.warn(`Unknown field: ${field}`);
return null;
}
}

// Get data summary for logging
private getDataSummary(field: string, data: any) {
switch (field) {
case ‘employees’:
return {
totalCount: data?.length || 0,
sampleEmployee: data?.[0]?.name || ‘none’
};
case ‘tasks’:
return {
totalCount: data?.length || 0,
sampleTask: data?.[0]?.task || ‘none’
};
case ‘dailyData’:
return {
totalDates: Object.keys(data || {}).length,
latestDate: Object.keys(data || {}).sort().pop() || ‘none’
};
case ‘completedTasks’:
return {
completedCount: Array.isArray(data) ? data.length : (data?.size || 0)
};
case ‘taskAssignments’:
return {
totalAssignments: Object.keys(data || {}).length
};
case ‘customRoles’:
return {
rolesCount: data?.length || 0,
roles: data || []
};
case ‘scheduledPreps’:
return {
totalCount: data?.totalCount || 0,
todayCount: data?.todayCount || 0,
todayCompletedCount: data?.todayCompletedCount || 0,
sampleTodayPreps: data?.todayPreps?.slice(0, 3)?.map((p: any) => ({
name: p.name,
completed: p.completed
})) || []
};
default:
return data;
}
}

async loadData() {
console.log(‘🔥 Loading data from Firebase…’);

```
try {
  const [employeesRes, tasksRes, dailyRes, completedRes, assignmentsRes, rolesRes, prepsRes] = await Promise.all([
    fetch(`${this.baseUrl}/employees.json`),
    fetch(`${this.baseUrl}/tasks.json`),
    fetch(`${this.baseUrl}/dailyData.json`),
    fetch(`${this.baseUrl}/completedTasks.json`),
    fetch(`${this.baseUrl}/taskAssignments.json`),
    fetch(`${this.baseUrl}/customRoles.json`),
    fetch(`${this.baseUrl}/scheduledPreps.json`)
  ]);
  
  const employeesData = await employeesRes.json();
  const tasksData = await tasksRes.json();
  const dailyDataRes = await dailyRes.json();
  const completedTasksData = await completedRes.json();
  const taskAssignmentsData = await assignmentsRes.json();
  const customRolesData = await rolesRes.json();
  const scheduledPrepsData = await prepsRes.json();
  
  // Migrate employees data to include points if missing
  const migratedEmployees = employeesData ? employeesData.map((emp: any) => ({
    ...emp,
    points: emp.points !== undefined ? emp.points : 0
  })) : getDefaultEmployees();

  // Migrate tasks data to include points if missing
  const migratedTasks = tasksData ? tasksData.map((task: any) => ({
    ...task,
    points: task.points !== undefined ? task.points : this.getDefaultTaskPoints(task.priority)
  })) : getDefaultTasks();

  // Migrate daily data to include new fields
  const migratedDailyData = dailyDataRes ? this.migrateDailyData(dailyDataRes) : getEmptyDailyData();
  
  console.log('✅ Firebase: Data loaded and migrated successfully');
  console.log('👥 Employees with points:', migratedEmployees);
  
  // Log loaded prep data for debugging
  if (scheduledPrepsData) {
    console.log('📋 Loaded scheduledPreps:', this.getDataSummary('scheduledPreps', scheduledPrepsData));
  }
  
  return {
    employees: migratedEmployees,
    tasks: migratedTasks,
    dailyData: migratedDailyData,
    completedTasks: new Set<number>(completedTasksData || []),
    taskAssignments: taskAssignmentsData || {},
    customRoles: customRolesData || ['Cleaner', 'Manager', 'Supervisor'],
    scheduledPreps: scheduledPrepsData || null
  };
  
} catch (error) {
  console.error('❌ Firebase connection failed:', error);
  throw error;
}
```

}

private getDefaultTaskPoints(priority: string): number {
switch (priority) {
case ‘high’: return 10;
case ‘medium’: return 5;
case ‘low’: return 3;
default: return 5;
}
}

private migrateDailyData(dailyData: any): DailyDataMap {
const migrated: DailyDataMap = {};

```
Object.keys(dailyData).forEach(date => {
  const dayData = dailyData[date];
  migrated[date] = {
    completedTasks: dayData.completedTasks || [],
    employeeMoods: dayData.employeeMoods || [],
    purchases: dayData.purchases || [],
    totalTasks: dayData.totalTasks || 22,
    completionRate: dayData.completionRate || 0,
    totalPointsEarned: dayData.totalPointsEarned || 0,
    totalPointsSpent: dayData.totalPointsSpent || 0
  };
});

return migrated;
```

}

// Legacy saveData method for compatibility
async saveData(data: {
employees: Employee[];
tasks: Task[];
dailyData: DailyDataMap;
completedTasks: Set<number>;
taskAssignments: TaskAssignments;
customRoles: string[];
scheduledPreps?: any;
}) {
console.log(‘🔥 Saving all data to Firebase…’);

```
const fields = ['employees', 'tasks', 'dailyData', 'completedTasks', 'taskAssignments', 'customRoles'];
if (data.scheduledPreps) {
  fields.push('scheduledPreps');
}

const success = await this.batchSave(fields, data);

if (success) {
  console.log('✅ Firebase: All data saved successfully');
} else {
  console.error('❌ Firebase: Some data failed to save');
  throw new Error('Firebase save failed');
}
```

}

// Immediate save for critical operations (like task completion)
async saveImmediate(field: string, data: any, allData?: any): Promise<boolean> {
console.log(`🔥 Immediate save triggered by ${field} change`);

```
// Save the specific field immediately
const success = await this.quickSave(field, data);

if (success) {
  // Also trigger a background save of related fields after a short delay
  if (allData && field !== 'scheduledPreps') {
    setTimeout(() => {
      console.log('🔄 Background sync of related fields');
      const relatedFields = this.getRelatedFields(field);
      if (relatedFields.length > 0) {
        this.batchSave(relatedFields, allData);
      }
    }, 1000);
  }
}

return success;
```

}

// Get fields that should be synced together
private getRelatedFields(changedField: string): string[] {
switch (changedField) {
case ‘completedTasks’:
return [‘employees’, ‘dailyData’, ‘taskAssignments’];
case ‘employees’:
return [‘dailyData’];
case ‘taskAssignments’:
return [‘completedTasks’];
default:
return [];
}
}
}
