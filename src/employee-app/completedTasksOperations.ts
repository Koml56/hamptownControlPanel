// completedTasksOperations.ts
// Операційний CRUD для completedTasks через OperationManager
import { OperationManager, SyncOperation } from './OperationManager';
import { wsManager, offlineQueue } from './taskOperations';

const DEVICE_ID = (() => {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('deviceId', id);
  }
  return id;
})();

const opManager = new OperationManager(DEVICE_ID);

export function addCompletedTask(
  completedTasks: Set<number>,
  taskId: number,
  setCompletedTasks: (tasks: Set<number>) => void
) {
  const op = opManager.createOperation('COMPLETE_TASK', { id: taskId }, 'completedTasks');
  if (navigator.onLine) {
    try { wsManager.sendOperation(op, 'critical'); } catch { offlineQueue.enqueue(op); }
  } else { offlineQueue.enqueue(op); }
  setCompletedTasks(new Set([...Array.from(completedTasks), taskId]));
}

export function removeCompletedTask(
  completedTasks: Set<number>,
  taskId: number,
  setCompletedTasks: (tasks: Set<number>) => void
) {
  const op = opManager.createOperation('DELETE_ITEM', { id: taskId }, 'completedTasks');
  if (navigator.onLine) {
    try { wsManager.sendOperation(op, 'critical'); } catch { offlineQueue.enqueue(op); }
  } else { offlineQueue.enqueue(op); }
  setCompletedTasks(new Set(Array.from(completedTasks).filter(id => id !== taskId)));
}

export function applyCompletedTaskOperation(completedTasks: Set<number>, op: SyncOperation): Set<number> {
  if (op.targetField !== 'completedTasks') return completedTasks;
  if (op.type === 'COMPLETE_TASK') {
    return new Set([...Array.from(completedTasks), op.payload.id]);
  } else if (op.type === 'DELETE_ITEM') {
    return new Set(Array.from(completedTasks).filter(id => id !== op.payload.id));
  }
  return completedTasks;
}

export function resolveCompletedTaskConflicts(ops: SyncOperation[]): SyncOperation[] {
  return opManager.resolveConflicts(ops);
}

export function rollbackCompletedTaskOperations(ops: SyncOperation[], completedTasks: Set<number>): Set<number> {
  // Для простоти: не застосовуємо зміни
  return completedTasks;
}
