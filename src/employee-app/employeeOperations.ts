// employeeOperations.ts
// Операційний CRUD для співробітників через OperationManager
import { OperationManager, SyncOperation } from './OperationManager';
import { Employee } from './types';

const DEVICE_ID = (() => {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('deviceId', id);
  }
  return id;
})();

const opManager = new OperationManager(DEVICE_ID);

export function addEmployeeOperation(employees: Employee[], employee: Employee): SyncOperation {
  return opManager.createOperation('UPDATE_EMPLOYEE', employee, 'employees');
}

export function updateEmployeeOperation(employees: Employee[], id: number, field: keyof Employee, value: any): SyncOperation {
  const oldEmp = employees.find(e => e.id === id);
  if (!oldEmp) throw new Error('Employee not found');
  const updatedEmp = { ...oldEmp, [field]: value };
  return opManager.createOperation('UPDATE_EMPLOYEE', updatedEmp, 'employees');
}

export function deleteEmployeeOperation(employees: Employee[], id: number): SyncOperation {
  const oldEmp = employees.find(e => e.id === id);
  if (!oldEmp) throw new Error('Employee not found');
  return opManager.createOperation('DELETE_ITEM', oldEmp, 'employees');
}

export function applyEmployeeOperation(employees: Employee[], op: SyncOperation): Employee[] {
  const newState = opManager.applyOperation(op, { employees });
  return newState.employees;
}

export function resolveEmployeeConflicts(ops: SyncOperation[]): SyncOperation[] {
  return opManager.resolveConflicts(ops);
}

export function rollbackEmployeeOperations(ops: SyncOperation[], employees: Employee[]): Employee[] {
  const newState = opManager.rollbackOperations(ops, { employees });
  return newState.employees;
}
