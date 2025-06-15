// adminFunctions.ts
import { ADMIN_PASSWORD } from './constants';
import type { Employee, Task, Priority, ActiveTab } from './types';

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
  setNewEmployeeRole: (role: string) => void
) => {
  if (name.trim()) {
    const newEmployee: Employee = {
      id: Math.max(...employees.map(e => e.id)) + 1,
      name: name.trim(),
      mood: 3,
      lastUpdated: 'Just added',
      role: role,
      lastMoodDate: null,
      points: 0 // Added points property
    };
    setEmployees(prev => [...prev, newEmployee]);
    setNewEmployeeName('');
    setNewEmployeeRole('Cleaner');
  }
};

export const removeEmployee = (
  id: number,
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void
) => {
  if (window.confirm('Are you sure you want to remove this employee?')) {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
  }
};

export const updateEmployee = (
  id: number,
  field: keyof Employee,
  value: string,
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void
) => {
  setEmployees(prev => prev.map(emp => 
    emp.id === id ? { ...emp, [field]: value } : emp
  ));
};

// Task Management
export const addTask = (
  tasks: Task[],
  setTasks: (updater: (prev: Task[]) => Task[]) => void,
  setEditingTask: (id: number) => void
) => {
  const newTask: Task = {
    id: Math.max(...tasks.map(t => t.id)) + 1,
    task: 'New Task',
    location: 'Location',
    priority: 'medium',
    estimatedTime: '30 min',
    points: 5 // Added points property
  };
  setTasks(prev => [...prev, newTask]);
  setEditingTask(newTask.id);
};

export const updateTask = (
  id: number,
  field: keyof Task,
  value: string,
  setTasks: (updater: (prev: Task[]) => Task[]) => void
) => {
  setTasks(prev => prev.map(task => 
    task.id === id ? { 
      ...task, 
      [field]: field === 'priority' ? value as Priority : 
               field === 'points' ? parseInt(value) || 0 : value
    } : task
  ));
};

export const removeTask = (
  id: number,
  setTasks: (updater: (prev: Task[]) => Task[]) => void
) => {
  if (window.confirm('Are you sure you want to remove this task?')) {
    setTasks(prev => prev.filter(task => task.id !== id));
  }
};

// Role Management
export const addCustomRole = (
  roleName: string,
  customRoles: string[],
  setCustomRoles: (updater: (prev: string[]) => string[]) => void,
  setNewRoleName: (name: string) => void
) => {
  if (roleName.trim() && !customRoles.includes(roleName.trim())) {
    setCustomRoles(prev => [...prev, roleName.trim()]);
    setNewRoleName('');
  }
};

export const removeCustomRole = (
  roleName: string,
  employees: Employee[],
  setCustomRoles: (updater: (prev: string[]) => string[]) => void
) => {
  // Don't allow removing if employees are using this role
  const employeesWithRole = employees.filter(emp => emp.role === roleName);
  if (employeesWithRole.length > 0) {
    alert(`Cannot remove role "${roleName}" - ${employeesWithRole.length} employee(s) are using it.`);
    return;
  }
  
  if (window.confirm(`Are you sure you want to remove the role "${roleName}"?`)) {
    setCustomRoles(prev => prev.filter(role => role !== roleName));
  }
};