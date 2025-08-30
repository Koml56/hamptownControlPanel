// OperationManager.ts
// Клас для генерації, застосування, вирішення конфліктів та rollback операцій
import { VectorClock } from './VectorClock';

export interface SyncOperation {
  id: string;
  type: 'ADD_TASK' | 'UPDATE_EMPLOYEE' | 'COMPLETE_TASK' | 'DELETE_ITEM' | 'ADD_STORE_ITEM' | 'UPDATE_STORE_ITEM' | 'DELETE_STORE_ITEM' | 'TOGGLE_TASK_COMPLETION' | 'TOGGLE_PREP_SELECTION';
  payload: any;
  timestamp: number;
  deviceId: string;
  vectorClock: Record<string, number>;
  targetField: string;
  version: number;
}

export class OperationManager {
  private deviceId: string;
  private vectorClock: VectorClock;

  constructor(deviceId: string, initialClock?: Record<string, number>) {
    this.deviceId = deviceId;
    this.vectorClock = new VectorClock(initialClock);
  }

  createOperation(type: SyncOperation['type'], payload: any, targetField: string): SyncOperation {
    this.vectorClock.increment(this.deviceId);
    const op: SyncOperation = {
      id: `${this.deviceId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      payload,
      timestamp: Date.now(),
      deviceId: this.deviceId,
      vectorClock: this.vectorClock.getClock(),
      targetField,
      version: (this.vectorClock.getClock()[this.deviceId] || 0),
    };
    return op;
  }

  applyOperation(operation: SyncOperation, currentState: any): any {
    if (operation.targetField === 'tasks') {
      switch (operation.type) {
        case 'ADD_TASK':
          return { ...currentState, tasks: [...currentState.tasks, operation.payload] };
        case 'COMPLETE_TASK':
          return {
            ...currentState,
            tasks: currentState.tasks.map((t: any) =>
              t.id === operation.payload.id ? { ...t, completed: true } : t
            ),
          };
        case 'DELETE_ITEM':
          return {
            ...currentState,
            tasks: currentState.tasks.filter((t: any) => t.id !== operation.payload.id),
          };
        case 'UPDATE_EMPLOYEE':
          // ...інша логіка
          return currentState;
        default:
          return currentState;
      }
    }
    // Store items operations
    if (operation.targetField === 'storeItems') {
      switch (operation.type) {
        case 'ADD_STORE_ITEM':
          return { ...currentState, storeItems: [...currentState.storeItems, operation.payload] };
        case 'UPDATE_STORE_ITEM':
          return {
            ...currentState,
            storeItems: currentState.storeItems.map((item: any) =>
              item.id === operation.payload.id ? { ...item, ...operation.payload } : item
            ),
          };
        case 'DELETE_STORE_ITEM':
          return {
            ...currentState,
            storeItems: currentState.storeItems.filter((item: any) => item.id !== operation.payload.id),
          };
        default:
          return currentState;
      }
    }
    // Employee operations
    if (operation.targetField === 'employees') {
      switch (operation.type) {
        case 'UPDATE_EMPLOYEE':
          return {
            ...currentState,
            employees: currentState.employees.map((e: any) =>
              e.id === operation.payload.id ? { ...e, ...operation.payload } : e
            ),
          };
        case 'DELETE_ITEM':
          return {
            ...currentState,
            employees: currentState.employees.filter((e: any) => e.id !== operation.payload.id),
          };
        default:
          return currentState;
      }
    }
    
    // Completed tasks operations
    if (operation.targetField === 'completedTasks') {
      switch (operation.type) {
        case 'TOGGLE_TASK_COMPLETION':
          const taskId = operation.payload.taskId;
          const currentCompletedTasks = new Set(currentState.completedTasks || []);
          
          if (operation.payload.completed) {
            currentCompletedTasks.add(taskId);
          } else {
            currentCompletedTasks.delete(taskId);
          }
          
          return {
            ...currentState,
            completedTasks: currentCompletedTasks
          };
        default:
          return currentState;
      }
    }
    
    // Prep selections operations
    if (operation.targetField === 'prepSelections') {
      switch (operation.type) {
        case 'TOGGLE_PREP_SELECTION':
          const { selected, selectionKey } = operation.payload;
          const currentSelections = { ...currentState.prepSelections || {} };
          
          if (selected) {
            currentSelections[selectionKey] = {
              priority: operation.payload.priority || 'medium',
              timeSlot: operation.payload.timeSlot || '',
              selected: true
            };
          } else {
            delete currentSelections[selectionKey];
          }
          
          return {
            ...currentState,
            prepSelections: currentSelections
          };
        default:
          return currentState;
      }
    }
    
    // Scheduled preps operations  
    if (operation.targetField === 'scheduledPreps') {
      switch (operation.type) {
        case 'TOGGLE_PREP_SELECTION':
          const currentScheduledPreps = [...(currentState.scheduledPreps || [])];
          const { prepId: schedPrepId, selected: schedSelected, scheduledPrep } = operation.payload;
          
          if (schedSelected && scheduledPrep) {
            // Add new scheduled prep
            currentScheduledPreps.push(scheduledPrep);
          } else {
            // Remove scheduled prep
            const index = currentScheduledPreps.findIndex(p => 
              p.prepId === schedPrepId && p.scheduledDate === operation.payload.scheduledDate
            );
            if (index !== -1) {
              currentScheduledPreps.splice(index, 1);
            }
          }
          
          return {
            ...currentState,
            scheduledPreps: currentScheduledPreps
          };
        default:
          return currentState;
      }
    }
    
    // ...інші targetField
    return currentState;
  }

  resolveConflicts(operations: SyncOperation[]): SyncOperation[] {
    // Групуємо по targetField+payload.id, залишаємо "найсвіжішу" за vectorClock
    const opMap = new Map<string, SyncOperation>();
    for (const op of operations) {
      const key = `${op.targetField}:${op.payload.id || op.id}`;
      if (!opMap.has(key)) {
        opMap.set(key, op);
      } else {
        const existing = opMap.get(key)!;
        const cmp = new VectorClock(existing.vectorClock).compare(op.vectorClock);
        if (cmp === 'before') {
          opMap.set(key, op);
        } else if (cmp === 'concurrent') {
          // Вирішуємо за timestamp
          if (op.timestamp > existing.timestamp) opMap.set(key, op);
        }
      }
    }
    return Array.from(opMap.values());
  }

  rollbackOperations(operations: SyncOperation[], currentState: any): any {
    // For example: just remove applied operations
    let state = { ...currentState };
    for (const op of operations) {
      if (op.targetField === 'tasks') {
        switch (op.type) {
          case 'ADD_TASK':
            state.tasks = state.tasks.filter((t: any) => t.id !== op.payload.id);
            break;
          case 'COMPLETE_TASK':
            state.tasks = state.tasks.map((t: any) =>
              t.id === op.payload.id ? { ...t, completed: false } : t
            );
            break;
          case 'DELETE_ITEM':
            state.tasks = [...state.tasks, op.payload];
            break;
        }
      }
      if (op.targetField === 'storeItems') {
        switch (op.type) {
          case 'ADD_STORE_ITEM':
            state.storeItems = state.storeItems.filter((item: any) => item.id !== op.payload.id);
            break;
          case 'UPDATE_STORE_ITEM':
            // For rollback, we'd need to store the previous state, but for simplicity, skip complex rollback
            console.warn('Store item update rollback not fully implemented');
            break;
          case 'DELETE_STORE_ITEM':
            state.storeItems = [...state.storeItems, op.payload];
            break;
        }
      }
    }
    return state;
  }
}
