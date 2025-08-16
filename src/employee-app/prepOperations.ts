// prepOperations.ts
// Операційний CRUD для prepItems через OperationManager
import { OperationManager, SyncOperation } from './OperationManager';
import { PrepItem } from './prep-types';
import { offlineQueue } from './taskOperations';

const DEVICE_ID = (() => {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('deviceId', id);
  }
  return id;
})();

const opManager = new OperationManager(DEVICE_ID);

export function addPrepItemOperation(prepItems: PrepItem[], item: PrepItem): SyncOperation {
  return opManager.createOperation('ADD_TASK', item, 'prepItems');
}

export function updatePrepItemOperation(prepItems: PrepItem[], id: number, field: keyof PrepItem, value: any): SyncOperation {
  const oldItem = prepItems.find(i => i.id === id);
  if (!oldItem) throw new Error('PrepItem not found');
  const updatedItem = { ...oldItem, [field]: value };
  return opManager.createOperation('ADD_TASK', updatedItem, 'prepItems'); // або UPDATE_PREP_ITEM
}

export function deletePrepItemOperation(prepItems: PrepItem[], id: number): SyncOperation {
  const oldItem = prepItems.find(i => i.id === id);
  if (!oldItem) throw new Error('PrepItem not found');
  return opManager.createOperation('DELETE_ITEM', oldItem, 'prepItems');
}

export function applyPrepItemOperation(prepItems: PrepItem[], op: SyncOperation): PrepItem[] {
  const newState = opManager.applyOperation(op, { prepItems });
  return newState.prepItems;
}

export function resolvePrepItemConflicts(ops: SyncOperation[]): SyncOperation[] {
  return opManager.resolveConflicts(ops);
}

export function rollbackPrepItemOperations(ops: SyncOperation[], prepItems: PrepItem[]): PrepItem[] {
  const newState = opManager.rollbackOperations(ops, { prepItems });
  return newState.prepItems;
}

// Операційний CRUD для prepItems через OperationManager
export function addPrepItem(
  prepItems: PrepItem[],
  setPrepItems: (updater: (prev: PrepItem[]) => PrepItem[]) => void,
  newItem: PrepItem
) {
  const op = addPrepItemOperation(prepItems, newItem);
  offlineQueue.enqueue(op);
  setPrepItems(prev => applyPrepItemOperation(prev, op));
}

export function updatePrepItem(
  id: number,
  field: keyof PrepItem,
  value: any,
  setPrepItems: (updater: (prev: PrepItem[]) => PrepItem[]) => void
) {
  setPrepItems(prev => {
    const op = updatePrepItemOperation(prev, id, field, value);
    offlineQueue.enqueue(op);
    return applyPrepItemOperation(prev, op);
  });
}

export function deletePrepItem(
  id: number,
  setPrepItems: (updater: (prev: PrepItem[]) => PrepItem[]) => void
) {
  setPrepItems(prev => {
    const op = deletePrepItemOperation(prev, id);
    offlineQueue.enqueue(op);
    return applyPrepItemOperation(prev, op);
  });
}
