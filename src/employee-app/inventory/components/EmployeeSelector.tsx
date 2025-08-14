// src/employee-app/inventory/components/EmployeeSelector.tsx
import React from 'react';
import { Employee } from '../../types';

interface EmployeeSelectorProps {
  employees: Employee[];
  selectedEmployeeId: number | null;
  onEmployeeSelect: (employeeId: number, employeeName: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// localStorage key for storing selected employee
const SELECTED_EMPLOYEE_KEY = 'inventory_selected_employee';

// Save selected employee to localStorage - now syncs with global selection
export const saveSelectedEmployee = (employeeId: number, employeeName: string) => {
  const employeeData = { id: employeeId, name: employeeName };
  localStorage.setItem(SELECTED_EMPLOYEE_KEY, JSON.stringify(employeeData));
  
  // Also update the global currentUser name in localStorage to keep them in sync
  localStorage.setItem('currentUserName', employeeName);
};

// Load selected employee from localStorage - fallback to global currentUser
export const loadSelectedEmployee = (): { id: number; name: string } | null => {
  try {
    const saved = localStorage.getItem(SELECTED_EMPLOYEE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    
    // Fallback to global currentUser name if no inventory-specific selection exists
    const globalUserName = localStorage.getItem('currentUserName');
    if (globalUserName) {
      // Return a partial object, the calling code will need to find the full employee data
      return { id: -1, name: globalUserName };
    }
    
    return null;
  } catch (error) {
    console.error('Error loading saved employee:', error);
    return null;
  }
};

// NEW: Initialize employee selection based on global currentUser
export const initializeEmployeeSelection = (currentUser: any, employees: any[]): { id: number; name: string } | null => {
  // First, try to find the currentUser in the employees list
  const currentEmployee = employees.find(emp => emp.id === currentUser.id || emp.name === currentUser.name);
  if (currentEmployee) {
    return { id: currentEmployee.id, name: currentEmployee.name };
  }
  
  // Fallback to saved selection, then to first employee
  const saved = loadSelectedEmployee();
  if (saved && saved.id !== -1) {
    // Verify saved employee still exists
    const employee = employees.find(emp => emp.id === saved.id);
    if (employee) {
      return saved;
    }
  }
  
  // Final fallback to first employee
  if (employees.length > 0) {
    return { id: employees[0].id, name: employees[0].name };
  }
  
  return null;
};

const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({
  employees,
  selectedEmployeeId,
  onEmployeeSelect,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const handleEmployeeClick = (employee: Employee) => {
    onEmployeeSelect(employee.id, employee.name);
    saveSelectedEmployee(employee.id, employee.name);
    onClose();
  };

  // Get role color for the dot indicator
  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'manager': return 'bg-blue-500';
      case 'cleaner': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="absolute top-16 left-4 bg-white border rounded-lg shadow-lg z-40 w-64">
      <div className="p-3 border-b bg-gray-50">
        <div className="text-sm font-medium text-gray-700">Switch Employee</div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {employees.map((employee) => {
          const isSelected = selectedEmployeeId === employee.id;
          
          return (
            <button
              key={employee.id}
              onClick={() => handleEmployeeClick(employee)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between ${
                isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
              }`}
            >
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${getRoleColor(employee.role)}`}></div>
                <div>
                  <div className="font-medium text-gray-800">{employee.name}</div>
                  <div className="text-xs text-gray-500">
                    {employee.role} • {employee.points} pts
                  </div>
                </div>
              </div>
              {isSelected && (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="lucide lucide-check w-4 h-4 text-blue-500"
                >
                  <path d="M20 6 9 17l-5-5"></path>
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeeSelector;