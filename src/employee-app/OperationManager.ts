// OperationManager.ts
// Клас для генерації, застосування, вирішення конфліктів та rollback операцій
import { VectorClock } from './VectorClock';

export interface SyncOperation {
  id: string;
  type: 'ADD_TASK' | 'UPDATE_EMPLOYEE' | 'COMPLETE_TASK' | 'DELETE_ITEM';
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
    // Додаємо підтримку для співробітників
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
    // Для прикладу: просто видаляємо застосовані операції
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
    }
    return state;
  }
}
