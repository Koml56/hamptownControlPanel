// CrossTabOperationManager.ts
// Manages operations across multiple tabs to prevent conflicts during rapid clicking

export interface PendingOperation {
  id: string;
  taskId: number;
  deviceId: string;
  timestamp: number;
  type: 'TOGGLE_TASK' | 'ASSIGN_TASK';
  expiresAt: number;
}

export class CrossTabOperationManager {
  private deviceId: string;
  private storageKey = 'hamptown_pending_operations';
  private lockKey = 'hamptown_operation_lock';
  
  constructor(deviceId: string) {
    this.deviceId = deviceId;
    this.cleanupExpiredOperations();
    
    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupExpiredOperations();
    }, 5000); // Clean up every 5 seconds
  }

  // Check if an operation is already pending for a task across any tab
  isPendingOperation(taskId: number): boolean {
    const pending = this.getPendingOperations();
    const now = Date.now();
    
    return pending.some(op => 
      op.taskId === taskId && 
      op.expiresAt > now
    );
  }

  // Register a new operation and check if it should proceed
  shouldAllowOperation(taskId: number, operationType: 'TOGGLE_TASK' | 'ASSIGN_TASK', debounceMs: number = 1000): boolean {
    const now = Date.now();
    
    // Get current pending operations
    const pending = this.getPendingOperations();
    
    // Check if there's already a recent operation for this task
    const recentOperation = pending.find(op => 
      op.taskId === taskId && 
      op.expiresAt > now
    );
    
    if (recentOperation) {
      console.warn(`⚠️ Operation blocked - another tab is processing task ${taskId}`, {
        existingOperation: recentOperation,
        requestedBy: this.deviceId,
        timeRemaining: recentOperation.expiresAt - now
      });
      return false;
    }
    
    // Register this operation
    const operation: PendingOperation = {
      id: `${this.deviceId}-${taskId}-${now}`,
      taskId,
      deviceId: this.deviceId,
      timestamp: now,
      type: operationType,
      expiresAt: now + debounceMs
    };
    
    this.addPendingOperation(operation);
    
    console.log(`✅ Operation allowed for task ${taskId} by device ${this.deviceId}`);
    return true;
  }

  // Mark an operation as completed
  completeOperation(taskId: number): void {
    const pending = this.getPendingOperations();
    const filtered = pending.filter(op => 
      !(op.taskId === taskId && op.deviceId === this.deviceId)
    );
    
    this.setPendingOperations(filtered);
    console.log(`🏁 Operation completed for task ${taskId} by device ${this.deviceId}`);
  }

  // Get all pending operations
  private getPendingOperations(): PendingOperation[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading pending operations:', error);
      return [];
    }
  }

  // Store pending operations
  private setPendingOperations(operations: PendingOperation[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(operations));
    } catch (error) {
      console.error('Error storing pending operations:', error);
    }
  }

  // Add a new pending operation
  private addPendingOperation(operation: PendingOperation): void {
    const pending = this.getPendingOperations();
    pending.push(operation);
    this.setPendingOperations(pending);
  }

  // Clean up expired operations
  private cleanupExpiredOperations(): void {
    const pending = this.getPendingOperations();
    const now = Date.now();
    const active = pending.filter(op => op.expiresAt > now);
    
    if (active.length !== pending.length) {
      this.setPendingOperations(active);
      console.log(`🧹 Cleaned up ${pending.length - active.length} expired operations`);
    }
  }

  // Get status for debugging
  getStatus(): { pendingCount: number; ownOperations: number; deviceId: string } {
    const pending = this.getPendingOperations();
    const ownOperations = pending.filter(op => op.deviceId === this.deviceId).length;
    
    return {
      pendingCount: pending.length,
      ownOperations,
      deviceId: this.deviceId
    };
  }
}