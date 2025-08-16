// dailyDataOperations.ts
// Операційний CRUD для dailyData через OperationManager
import { OperationManager, SyncOperation } from './OperationManager';
import { DailyDataMap } from './types';
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

export function updateDailyData(
  dailyData: DailyDataMap,
  date: string,
  field: string,
  value: any,
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void
) {
  const updated = { ...dailyData[date], [field]: value };
  const op = opManager.createOperation('UPDATE_EMPLOYEE', { date, ...updated }, 'dailyData');
  offlineQueue.enqueue(op);
  setDailyData(prev => ({ ...prev, [date]: updated }));
}

export function applyDailyDataOperation(dailyData: DailyDataMap, op: SyncOperation): DailyDataMap {
  if (op.targetField !== 'dailyData') return dailyData;
  const { date, ...fields } = op.payload;
  return { ...dailyData, [date]: { ...dailyData[date], ...fields } };
}

export function resolveDailyDataConflicts(ops: SyncOperation[]): SyncOperation[] {
  return opManager.resolveConflicts(ops);
}

export function rollbackDailyDataOperations(ops: SyncOperation[], dailyData: DailyDataMap): DailyDataMap {
  // Для простоти: не застосовуємо зміни для payload.date
  return dailyData;
}
