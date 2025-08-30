// taskOperations.ts
// Операційний CRUD для задач через OperationManager
import { OperationManager, SyncOperation } from './OperationManager';
import { Task } from './types';
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

// Real-time individual task completion operations
export function createTaskCompletionToggleOperation(
  taskId: number, 
  completed: boolean, 
  points: number,
  employeeId: number,
  taskName: string
): SyncOperation {
  return opManager.createOperation('TOGGLE_TASK_COMPLETION', {
    taskId,
    completed,
    points,
    employeeId,
    taskName,
    timestamp: Date.now()
  }, 'completedTasks');
}

export function applyTaskCompletionToggle(completedTasks: Set<number>, op: SyncOperation): Set<number> {
  if (op.type !== 'TOGGLE_TASK_COMPLETION') return completedTasks;
  
  const newCompletedTasks = new Set(completedTasks);
  const { taskId, completed } = op.payload;
  
  if (completed) {
    newCompletedTasks.add(taskId);
  } else {
    newCompletedTasks.delete(taskId);
  }
  
  return newCompletedTasks;
}

export async function syncTaskCompletionToggle(
  taskId: number,
  completed: boolean,
  points: number,
  employeeId: number,
  taskName: string,
  completedTasks: Set<number>,
  setCompletedTasks: (tasks: Set<number>) => void,
  immediateSync?: (operation: SyncOperation) => Promise<void>
) {
  console.log(`🚀 [REAL-TIME] Task completion toggle: ${taskName} (${completed ? 'completed' : 'uncompleted'})`);
  
  // Create operation
  const op = createTaskCompletionToggleOperation(taskId, completed, points, employeeId, taskName);
  
  // Apply locally immediately
  const newCompletedTasks = applyTaskCompletionToggle(completedTasks, op);
  setCompletedTasks(newCompletedTasks);
  
  // Add to offline queue for reliability
  offlineQueue.enqueue(op);
  
  // Immediate sync to other devices
  if (immediateSync) {
    try {
      await immediateSync(op);
      console.log(`✅ [REAL-TIME] Task completion synced immediately: ${taskName}`);
    } catch (error) {
      console.error(`❌ [REAL-TIME] Failed to sync task completion: ${taskName}`, error);
    }
  }
}
