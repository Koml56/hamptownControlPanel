// storeOperations.ts
// Store items CRUD operations with proper Firebase sync and multi-device support
import { OperationManager, SyncOperation } from './OperationManager';
import { StoreItem, Employee, Purchase, DailyDataMap } from './types';
import { offlineQueue } from './taskOperations';
import { getFormattedDate } from './utils';

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
  const op = opManager.createOperation('ADD_STORE_ITEM', newItem, 'storeItems');
  offlineQueue.enqueue(op);
  setStoreItems(prev => applyStoreItemOperation(prev, op));
}

export function updateStoreItem(storeItems: StoreItem[], id: number, field: keyof StoreItem, value: any, setStoreItems: (updater: (prev: StoreItem[]) => StoreItem[]) => void) {
  const oldItem = storeItems.find(i => i.id === id);
  if (!oldItem) throw new Error('StoreItem not found');
  const updatedItem = { ...oldItem, [field]: value };
  const op = opManager.createOperation('UPDATE_STORE_ITEM', updatedItem, 'storeItems');
  offlineQueue.enqueue(op);
  setStoreItems(prev => applyStoreItemOperation(prev, op));
}

export function deleteStoreItem(storeItems: StoreItem[], id: number, setStoreItems: (updater: (prev: StoreItem[]) => StoreItem[]) => void) {
  const oldItem = storeItems.find(i => i.id === id);
  if (!oldItem) throw new Error('StoreItem not found');
  const op = opManager.createOperation('DELETE_STORE_ITEM', oldItem, 'storeItems');
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

// Purchase Operations using OperationManager pattern
export function createPurchaseOperation(
  employeeId: number,
  item: StoreItem,
  employees: Employee[]
): { purchaseOp: SyncOperation; employeeOp: SyncOperation; purchase: Purchase } | null {
  const employee = employees.find(emp => emp.id === employeeId);
  
  if (!employee) {
    console.error(`Employee with id ${employeeId} not found`);
    return null;
  }

  if (employee.points < item.cost || !item.available) {
    console.error(`Cannot afford item or item unavailable`);
    return null;
  }

  const today = new Date();
  const todayStr = getFormattedDate(today);
  const now = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  // Create purchase record
  const purchase: Purchase = {
    id: Date.now(),
    employeeId,
    itemId: item.id,
    itemName: item.name,
    cost: item.cost,
    purchasedAt: now,
    date: todayStr,
    status: 'pending'
  };

  // Create operation for the purchase
  const purchaseOp = opManager.createOperation('PURCHASE_ITEM', {
    purchase,
    date: todayStr
  }, 'dailyData');

  // Create operation for employee points deduction
  const updatedEmployee = { ...employee, points: employee.points - item.cost };
  const employeeOp = opManager.createOperation('UPDATE_EMPLOYEE_POINTS', updatedEmployee, 'employees');

  return { purchaseOp, employeeOp, purchase };
}

export function executePurchaseOperation(
  employeeId: number,
  item: StoreItem,
  employees: Employee[],
  dailyData: DailyDataMap,
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void,
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void
): boolean {
  const operations = createPurchaseOperation(employeeId, item, employees);
  
  if (!operations) {
    return false;
  }

  const { purchaseOp, employeeOp, purchase } = operations;

  try {
    // Enqueue operations for offline support
    offlineQueue.enqueue(purchaseOp);
    offlineQueue.enqueue(employeeOp);

    // Apply employee points deduction
    setEmployees(prev => applyEmployeePointsOperation(prev, employeeOp));

    // Apply purchase to daily data
    setDailyData(prev => applyPurchaseOperation(prev, purchaseOp));

    console.log("🛒 Purchase operation completed successfully:", purchase);
    return true;
  } catch (error) {
    console.error("❌ Error during purchase operation:", error);
    return false;
  }
}

export function applyEmployeePointsOperation(employees: Employee[], op: SyncOperation): Employee[] {
  const newState = opManager.applyOperation(op, { employees });
  return newState.employees;
}

export function applyPurchaseOperation(dailyData: DailyDataMap, op: SyncOperation): DailyDataMap {
  if (op.type !== 'PURCHASE_ITEM') {
    return dailyData;
  }

  const { purchase, date } = op.payload;
  const todayData = dailyData[date] || {
    completedTasks: [],
    employeeMoods: [],
    purchases: [],
    totalTasks: 22,
    completionRate: 0,
    totalPointsEarned: 0,
    totalPointsSpent: 0
  };

  const updatedPurchases = Array.isArray(todayData.purchases)
    ? [...todayData.purchases, purchase]
    : [purchase];

  const newTotalSpent = (todayData.totalPointsSpent || 0) + purchase.cost;

  return {
    ...dailyData,
    [date]: {
      ...todayData,
      purchases: updatedPurchases,
      totalPointsSpent: newTotalSpent
    }
  };
}
