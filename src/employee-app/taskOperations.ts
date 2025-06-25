// taskOperations.ts
// Операційний CRUD для задач через OperationManager
import { OperationManager, SyncOperation } from './OperationManager';
import { Task } from './types';
import { WebSocketManager } from './WebSocketManager';
import { OfflineQueue } from './OfflineQueue';

const DEVICE_ID = (() => {
  // Генеруємо або отримуємо deviceId для цього пристрою
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('deviceId', id);
  }
  return id;
})();

const opManager = new OperationManager(DEVICE_ID);

// WebSocketManager для задач
const WS_URL = 'wss://your-sync-server.example/ws'; // TODO: замінити на реальний URL
export const wsManager = new WebSocketManager(WS_URL);
export const offlineQueue = new OfflineQueue();

export function addTaskOperation(tasks: Task[], task: Task): SyncOperation {
  return opManager.createOperation('ADD_TASK', task, 'tasks');
}

export function updateTaskOperation(tasks: Task[], id: number, field: keyof Task, value: any): SyncOperation {
  const oldTask = tasks.find(t => t.id === id);
  if (!oldTask) throw new Error('Task not found');
  const updatedTask = { ...oldTask, [field]: value };
  return opManager.createOperation('ADD_TASK', updatedTask, 'tasks'); // Можна зробити тип 'UPDATE_TASK' якщо потрібно
}

export function completeTaskOperation(tasks: Task[], id: number): SyncOperation {
  const oldTask = tasks.find(t => t.id === id);
  if (!oldTask) throw new Error('Task not found');
  const updatedTask = { ...oldTask, completed: true };
  return opManager.createOperation('COMPLETE_TASK', updatedTask, 'tasks');
}

export function deleteTaskOperation(tasks: Task[], id: number): SyncOperation {
  const oldTask = tasks.find(t => t.id === id);
  if (!oldTask) throw new Error('Task not found');
  return opManager.createOperation('DELETE_ITEM', oldTask, 'tasks');
}

export function applyTaskOperation(tasks: Task[], op: SyncOperation): Task[] {
  const newState = opManager.applyOperation(op, { tasks });
  return newState.tasks;
}

export function resolveTaskConflicts(ops: SyncOperation[]): SyncOperation[] {
  return opManager.resolveConflicts(ops);
}

export function rollbackTaskOperations(ops: SyncOperation[], tasks: Task[]): Task[] {
  const newState = opManager.rollbackOperations(ops, { tasks });
  return newState.tasks;
}

export function sendTaskOperationWithOffline(op: SyncOperation, priority: 'critical' | 'normal' | 'background' = 'normal') {
  if (navigator.onLine) {
    try {
      wsManager.sendOperation(op, priority);
    } catch (e) {
      offlineQueue.enqueue(op);
    }
  } else {
    offlineQueue.enqueue(op);
  }
}
