// WebSocketManager.ts
// Менеджер WebSocket для real-time sync з підтримкою пріоритетів, автоматичного відновлення та обробки операцій
import type { SyncOperation } from './OperationManager';

type Priority = 'critical' | 'normal' | 'background';

type OperationCallback = (operation: SyncOperation) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private url: string;
  private listeners: OperationCallback[] = [];
  private isConnected = false;
  private pendingQueue: { op: SyncOperation; priority: Priority }[] = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.flushQueue();
        resolve();
      };
      this.ws.onclose = () => {
        this.isConnected = false;
        this.handleReconnection();
      };
      this.ws.onerror = (err) => {
        this.isConnected = false;
        this.handleReconnection();
        reject(err);
      };
      this.ws.onmessage = (event) => {
        try {
          const op: SyncOperation = JSON.parse(event.data);
          this.listeners.forEach(cb => cb(op));
        } catch (e) {
          console.error('WS: Failed to parse operation', e);
        }
      };
    });
  }

  sendOperation(op: SyncOperation, priority: Priority = 'normal'): void {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ...op, priority }));
    } else {
      this.pendingQueue.push({ op, priority });
    }
  }

  onOperationReceived(cb: OperationCallback): void {
    this.listeners.push(cb);
  }

  handleReconnection(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(() => {
        this.handleReconnection();
      });
    }, delay);
  }

  private flushQueue() {
    if (!this.isConnected || !this.ws) return;
    // Критичні — одразу, інші — з затримкою
    const critical = this.pendingQueue.filter(q => q.priority === 'critical');
    const normal = this.pendingQueue.filter(q => q.priority === 'normal');
    const background = this.pendingQueue.filter(q => q.priority === 'background');
    [...critical, ...normal, ...background].forEach(({ op, priority }, idx) => {
      setTimeout(() => {
        this.sendOperation(op, priority);
      }, priority === 'critical' ? 0 : priority === 'normal' ? 100 * idx : 1000 * idx);
    });
    this.pendingQueue = [];
  }
}
