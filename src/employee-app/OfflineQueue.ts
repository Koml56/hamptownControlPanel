// OfflineQueue.ts
// Черга для offline-операцій з IndexedDB, пріоритетами та вирішенням конфліктів
import type { SyncOperation } from './OperationManager';

export class OfflineQueue {
  private queue: SyncOperation[] = [];
  private db: IDBDatabase | null = null;
  private dbName = 'SyncOfflineQueue';
  private storeName = 'operations';
  private _lastLogTime: number | null = null;

  constructor() {
    this.initDB();
  }

  private initDB() {
    const request = indexedDB.open(this.dbName, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(this.storeName)) {
        db.createObjectStore(this.storeName, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      this.db = request.result;
      this.loadQueueFromDB();
    };
    request.onerror = () => {
      console.error('OfflineQueue: Failed to open IndexedDB');
    };
  }

  private loadQueueFromDB() {
    if (!this.db) return;
    const tx = this.db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const req = store.getAll();
    req.onsuccess = () => {
      this.queue = req.result || [];
    };
  }

  enqueue(operation: SyncOperation) {
    this.queue.push(operation);
    this.saveOperationToDB(operation);
  }

  private saveOperationToDB(operation: SyncOperation) {
    if (!this.db) return;
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    store.put(operation);
  }

  private saveQueueToDB() {
    if (!this.db) return;
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    // Очищаємо store і записуємо поточну чергу
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      for (const op of this.queue) {
        store.put(op);
      }
    };
  }

  // === Очищення та компакція журналу операцій ===
  compactOperationLog() {
    // Для кожного targetField+payload.id залишаємо лише останню операцію
    const opMap = new Map<string, SyncOperation>();
    for (const op of this.queue) {
      const key = `${op.targetField}:${op.payload.id || op.id}`;
      opMap.set(key, op); // остання операція перезаписує попередню
    }
    this.queue = Array.from(opMap.values());
    this.saveQueueToDB();
  }

  // === TTL для offline-операцій ===
  cleanExpiredOperations(ttlMs = 7 * 24 * 60 * 60 * 1000) { // 7 днів за замовчуванням
    const now = Date.now();
    this.queue = this.queue.filter(op => now - op.timestamp < ttlMs);
    this.saveQueueToDB();
  }

  // === Пріоритетна обробка черги ===
  // === Batch-обробка для Layer 2/3 ===
  async processQueue(sendFn: (op: SyncOperation) => Promise<void>) {
    this.compactOperationLog();
    this.cleanExpiredOperations();
    // Критичні — одразу, інші — batch
    const critical = this.queue.filter(q => q.type === 'COMPLETE_TASK');
    const normal = this.queue.filter(q => q.type === 'ADD_TASK' || q.type === 'UPDATE_EMPLOYEE');
    const background = this.queue.filter(q => q.type === 'DELETE_ITEM');
    for (const op of critical) {
      await sendFn(op);
      this.removeOperationFromDB(op.id);
    }
    // Batch для normal
    if (normal.length) {
      await Promise.all(normal.map(async op => {
        await sendFn(op);
        this.removeOperationFromDB(op.id);
      }));
    }
    // Batch для background з затримкою
    background.forEach((op, i) => {
      setTimeout(async () => {
        await sendFn(op);
        this.removeOperationFromDB(op.id);
      }, 1000 * i);
    });
    this.loadQueueFromDB();
  }

  // === Видалення застосованих операцій ===
  removeAppliedOperations(appliedIds: string[]) {
    this.queue = this.queue.filter(op => !appliedIds.includes(op.id));
    this.saveQueueToDB();
  }

  private removeOperationFromDB(id: string) {
    if (!this.db) return;
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    store.delete(id);
    this.queue = this.queue.filter(op => op.id !== id);
  }

  prioritizeOperations(): SyncOperation[] {
    // Критичні спочатку, потім normal, потім background
    return [
      ...this.queue.filter(op => op.type === 'COMPLETE_TASK'),
      ...this.queue.filter(op => op.type === 'ADD_TASK' || op.type === 'UPDATE_EMPLOYEE'),
      ...this.queue.filter(op => op.type === 'DELETE_ITEM'),
    ];
  }

  resolveQueueConflicts() {
    // TODO: Використати OperationManager.resolveConflicts для черги
  }

  // === Логування з throttle ===
  logThrottled(message: string) {
    if (!this._lastLogTime || Date.now() - this._lastLogTime > 2000) {
      console.log('[OfflineQueue]', message);
      this._lastLogTime = Date.now();
    }
  }

  // === Моніторинг продуктивності ===
  monitorPerformance(label: string, fn: () => void) {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    if (duration > 100) {
      this.logThrottled(`⚠️ ${label} took ${Math.round(duration)}ms`);
    }
  }
}
