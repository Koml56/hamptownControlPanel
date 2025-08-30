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

// Real-time individual prep selection operations
export function createPrepSelectionToggleOperation(
  prepId: number,
  selected: boolean,
  selectionKey: string,
  scheduledDate: string,
  scheduledPrep?: any
): SyncOperation {
  return opManager.createOperation('TOGGLE_PREP_SELECTION', {
    prepId,
    selected,
    selectionKey,
    scheduledDate,
    scheduledPrep,
    priority: 'medium',
    timeSlot: '',
    timestamp: Date.now()
  }, 'prepSelections');
}

export function applyPrepSelectionToggle(
  prepSelections: any,
  scheduledPreps: any[],
  op: SyncOperation
): { prepSelections: any, scheduledPreps: any[] } {
  if (op.type !== 'TOGGLE_PREP_SELECTION') {
    return { prepSelections, scheduledPreps };
  }
  
  const { prepId, selected, selectionKey, scheduledDate, scheduledPrep } = op.payload;
  const newPrepSelections = { ...prepSelections };
  const newScheduledPreps = [...scheduledPreps];
  
  if (selected) {
    // Add selection
    newPrepSelections[selectionKey] = {
      priority: op.payload.priority || 'medium',
      timeSlot: op.payload.timeSlot || '',
      selected: true
    };
    
    // Add to scheduled preps if provided
    if (scheduledPrep) {
      newScheduledPreps.push(scheduledPrep);
    }
  } else {
    // Remove selection
    delete newPrepSelections[selectionKey];
    
    // Remove from scheduled preps
    const index = newScheduledPreps.findIndex(p => 
      p.prepId === prepId && p.scheduledDate === scheduledDate
    );
    if (index !== -1) {
      newScheduledPreps.splice(index, 1);
    }
  }
  
  return { prepSelections: newPrepSelections, scheduledPreps: newScheduledPreps };
}

export async function syncPrepSelectionToggle(
  prepId: number,
  selected: boolean,
  selectionKey: string,
  scheduledDate: string,
  scheduledPrep: any | undefined,
  prepSelections: any,
  scheduledPreps: any[],
  setPrepSelections: (updater: (prev: any) => any) => void,
  setScheduledPreps: (updater: (prev: any[]) => any[]) => void,
  immediateSync?: (operation: SyncOperation) => Promise<void>
) {
  console.log(`🚀 [REAL-TIME] Prep selection toggle: ${prepId} (${selected ? 'selected' : 'deselected'})`);
  
  // Create operation
  const op = createPrepSelectionToggleOperation(prepId, selected, selectionKey, scheduledDate, scheduledPrep);
  
  // Apply locally immediately using updater functions
  setPrepSelections(prev => {
    const { prepSelections: newPrepSelections } = 
      applyPrepSelectionToggle(prev, scheduledPreps, op);
    return newPrepSelections;
  });
  
  setScheduledPreps(prev => {
    const { scheduledPreps: newScheduledPreps } = 
      applyPrepSelectionToggle(prepSelections, prev, op);
    return newScheduledPreps;
  });
  
  // Add to offline queue for reliability
  offlineQueue.enqueue(op);
  
  // Immediate sync to other devices
  if (immediateSync) {
    try {
      await immediateSync(op);
      console.log(`✅ [REAL-TIME] Prep selection synced immediately: ${prepId}`);
    } catch (error) {
      console.error(`❌ [REAL-TIME] Failed to sync prep selection: ${prepId}`, error);
    }
  }
}
