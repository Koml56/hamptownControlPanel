// migrationUtils.ts
import type { Employee, Task } from './types';

export const migrateEmployeeData = (employees: any[]): Employee[] => {
  if (!employees || !Array.isArray(employees)) return [];
  
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
  if (!tasks || !Array.isArray(tasks)) return [];
  
  return tasks.map(task => ({
    id: task.id || 0,
    task: task.task || 'Unknown Task',
    location: task.location || 'Unknown Location',
    priority: task.priority || 'medium',
    estimatedTime: task.estimatedTime || '30 min',
    points: typeof task.points === 'number' ? task.points : getDefaultPointsForPriority(task.priority)
  }));
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
    const employeesRes = await fetch(`${baseUrl}/employees.json`);
    const tasksRes = await fetch(`${baseUrl}/tasks.json`);
    
    const existingEmployees = await employeesRes.json();
    const existingTasks = await tasksRes.json();
    
    // Migrate data
    const migratedEmployees = migrateEmployeeData(existingEmployees || []);
    const migratedTasks = migrateTaskData(existingTasks || []);
    
    // Save migrated data back
    await Promise.all([
      fetch(`${baseUrl}/employees.json`, {
        method: 'PUT',
        body: JSON.stringify(migratedEmployees)
      }),
      fetch(`${baseUrl}/tasks.json`, {
        method: 'PUT',
        body: JSON.stringify(migratedTasks)
      })
    ]);
    
    console.log('✅ Data migration completed successfully');
    console.log('👥 Migrated employees:', migratedEmployees);
    console.log('📋 Migrated tasks:', migratedTasks);
    
    return { employees: migratedEmployees, tasks: migratedTasks };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};