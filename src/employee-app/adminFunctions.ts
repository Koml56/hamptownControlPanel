// adminFunctions.ts
import { ADMIN_PASSWORD } from './constants';
import type { Employee, Task, ActiveTab } from './types';

export const handleAdminLogin = (
  password: string,
  setIsAdmin: (isAdmin: boolean) => void,
  setActiveTab: (tab: ActiveTab) => void,
  setPassword: (password: string) => void
): boolean => {
  if (password === ADMIN_PASSWORD) {
    setIsAdmin(true);
    setActiveTab('admin');
    setPassword('');
    return true;
  } else {
    alert('Invalid password!');
    return false;
  }
};

// Employee Management
export const addEmployee = (
  name: string,
  role: string,
  employees: Employee[],
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void,
  setNewEmployeeName: (name: string) => void,
  setNewEmployeeRole: (role: string) => void,
  quickSave: (field: string, data: any) => Promise<any>
) => {
  if (name.trim()) {
    const newEmployee: Employee = {
      id: Math.max(...employees.map(e => e.id), 0) + 1,
      name: name.trim(),
      mood: 3,
      lastUpdated: 'Just added',
      role: role,
      lastMoodDate: null,
      points: 0
    };
    setEmployees(prev => {
      const updated = [...prev, newEmployee];
      quickSave('employees', updated);
      return updated;
    });
    setNewEmployeeName('');
    setNewEmployeeRole('Cleaner');
  }
};

export const removeEmployee = (
  id: number,
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void,
  quickSave: (field: string, data: any) => Promise<any>
) => {
  if (window.confirm('Are you sure you want to remove this employee?')) {
    setEmployees(prev => {
      const updated = prev.filter(emp => emp.id !== id);
      quickSave('employees', updated);
      return updated;
    });
  }
};

export const updateEmployee = (
  id: number,
  field: keyof Employee,
  value: string,
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void,
  quickSave: (field: string, data: any) => Promise<any>
) => {
  setEmployees(prev => {
    const updated = prev.map(emp => emp.id === id ? { ...emp, [field]: value } : emp);
    quickSave('employees', updated);
    return updated;
  });
};

// Task Management
export const addTask = (
  tasks: Task[],
  setTasks: (updater: (prev: Task[]) => Task[]) => void,
  setEditingTask: (id: number) => void,
  quickSave: (field: string, data: any) => Promise<any>
) => {
  const newTask: Task = {
    id: Math.max(...tasks.map(t => t.id), 0) + 1,
    task: 'New Task',
    location: 'Location',
    priority: 'medium',
    estimatedTime: '30 min',
    points: 5
  };
  setTasks(prev => {
    const updated = [...prev, newTask];
    quickSave('tasks', updated);
    return updated;
  });
  setEditingTask(newTask.id);
};

export const updateTask = (
  id: number,
  field: keyof Task,
  value: string,
  setTasks: (updater: (prev: Task[]) => Task[]) => void,
  quickSave: (field: string, data: any) => Promise<any>
) => {
  setTasks(prev => {
    const updated = prev.map(task => task.id === id ? { ...task, [field]: value } : task);
    quickSave('tasks', updated);
    return updated;
  });
};

export const removeTask = (
  id: number,
  setTasks: (updater: (prev: Task[]) => Task[]) => void,
  quickSave: (field: string, data: any) => Promise<any>
) => {
  if (window.confirm('Are you sure you want to remove this task?')) {
    setTasks(prev => {
      const updated = prev.filter(task => task.id !== id);
      quickSave('tasks', updated);
      return updated;
    });
  }
};

// Role Management
export const addCustomRole = (
  roleName: string,
  customRoles: string[],
  setCustomRoles: (updater: (prev: string[]) => string[]) => void,
  setNewRoleName: (name: string) => void,
  quickSave: (field: string, data: any) => Promise<any>
) => {
  if (roleName.trim() && !customRoles.includes(roleName.trim())) {
    setCustomRoles(prev => {
      const updated = [...prev, roleName.trim()];
      quickSave('customRoles', updated);
      return updated;
    });
    setNewRoleName('');
  }
};

export const removeCustomRole = (
  roleName: string,
  employees: Employee[],
  setCustomRoles: (updater: (prev: string[]) => string[]) => void,
  quickSave: (field: string, data: any) => Promise<any>
) => {
  // Don't allow removing if employees are using this role
  const employeesWithRole = employees.filter(emp => emp.role === roleName);
  if (employeesWithRole.length > 0) {
    alert(`Cannot remove role "${roleName}" - ${employeesWithRole.length} employee(s) are using it.`);
    return;
  }
  
  if (window.confirm(`Are you sure you want to remove the role "${roleName}"?`)) {
    setCustomRoles(prev => {
      const updated = prev.filter(role => role !== roleName);
      quickSave('customRoles', updated);
      return updated;
    });
  }
};

export { addPrepItem, updatePrepItem, deletePrepItem } from './prepOperations';
export { addStoreItem, updateStoreItem, deleteStoreItem } from './storeOperations';
export { updateDailyData } from './dailyDataOperations';
export { addCompletedTask, removeCompletedTask } from './completedTasksOperations';