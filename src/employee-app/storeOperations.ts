// storeOperations.ts
// Операційний CRUD для storeItems через OperationManager
import { OperationManager, SyncOperation } from './OperationManager';
import { StoreItem } from './types';
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

export function addStoreItem(storeItems: StoreItem[], setStoreItems: (updater: (prev: StoreItem[]) => StoreItem[]) => void, newItem: StoreItem) {
  const op = opManager.createOperation('ADD_TASK', newItem, 'storeItems');
  offlineQueue.enqueue(op);
  setStoreItems(prev => applyStoreItemOperation(prev, op));
}

export function updateStoreItem(storeItems: StoreItem[], id: number, field: keyof StoreItem, value: any, setStoreItems: (updater: (prev: StoreItem[]) => StoreItem[]) => void) {
  const oldItem = storeItems.find(i => i.id === id);
  if (!oldItem) throw new Error('StoreItem not found');
  const updatedItem = { ...oldItem, [field]: value };
  const op = opManager.createOperation('ADD_TASK', updatedItem, 'storeItems');
  offlineQueue.enqueue(op);
  setStoreItems(prev => applyStoreItemOperation(prev, op));
}

export function deleteStoreItem(storeItems: StoreItem[], id: number, setStoreItems: (updater: (prev: StoreItem[]) => StoreItem[]) => void) {
  const oldItem = storeItems.find(i => i.id === id);
  if (!oldItem) throw new Error('StoreItem not found');
  const op = opManager.createOperation('DELETE_ITEM', oldItem, 'storeItems');
  offlineQueue.enqueue(op);
  setStoreItems(prev => applyStoreItemOperation(prev, op));
}

export function applyStoreItemOperation(storeItems: StoreItem[], op: SyncOperation): StoreItem[] {
  const newState = opManager.applyOperation(op, { storeItems });
  return newState.storeItems;
}

export function resolveStoreItemConflicts(ops: SyncOperation[]): SyncOperation[] {
  return opManager.resolveConflicts(ops);
}

export function rollbackStoreItemOperations(ops: SyncOperation[], storeItems: StoreItem[]): StoreItem[] {
  const newState = opManager.rollbackOperations(ops, { storeItems });
  return newState.storeItems;
}
