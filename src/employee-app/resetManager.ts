// resetManager.ts - Centralized daily reset logic with proper debouncing and cooldown
import { getFormattedDate } from './utils';

interface ResetState {
  lastResetTimestamp: number;
  lastResetDate: string;
  cooldownPeriod: number; // milliseconds
  isResetting: boolean;
}

class DailyResetManager {
  private state: ResetState = {
    lastResetTimestamp: 0,
    lastResetDate: '',
    cooldownPeriod: 5 * 60 * 1000, // 5 minutes cooldown
    isResetting: false
  };

  private firebaseService: any;
  private quickSave: any;
  private setShowDailyResetNotification: any;

  constructor(firebaseService: any, quickSave: any, setShowDailyResetNotification: any) {
    this.firebaseService = firebaseService;
    this.quickSave = quickSave;
    this.setShowDailyResetNotification = setShowDailyResetNotification;
    this.loadResetState();
  }

  private loadResetState() {
    const lastTimestamp = localStorage.getItem('lastResetTimestamp');
    const lastDate = localStorage.getItem('lastTaskResetDate');
    
    this.state.lastResetTimestamp = lastTimestamp ? parseInt(lastTimestamp, 10) : 0;
    this.state.lastResetDate = lastDate || '';
  }

  private saveResetState() {
    localStorage.setItem('lastResetTimestamp', this.state.lastResetTimestamp.toString());
    localStorage.setItem('lastTaskResetDate', this.state.lastResetDate);
  }

  // Check if we're in cooldown period to prevent rapid resets
  private isInCooldown(): boolean {
    const now = Date.now();
    return (now - this.state.lastResetTimestamp) < this.state.cooldownPeriod;
  }

  // Check if a reset is needed based on date change only
  async shouldPerformReset(completedTasksCount: number, taskAssignmentsCount: number): Promise<boolean> {
    if (this.state.isResetting || this.isInCooldown()) {
      return false;
    }

    const today = getFormattedDate(new Date());
    const lastResetDate = await this.firebaseService.getLastTaskResetDate?.() || this.state.lastResetDate;

    // Only reset if it's a new day AND there are tasks/assignments to reset
    return lastResetDate !== today && (completedTasksCount > 0 || taskAssignmentsCount > 0);
  }

  // Perform the actual reset with proper locking
  async performReset(completedTasksCount: number, taskAssignmentsCount: number): Promise<boolean> {
    if (this.state.isResetting) {
      console.log('🚫 Reset already in progress, skipping');
      return false;
    }

    if (this.isInCooldown()) {
      console.log('🚫 Reset in cooldown period, skipping');
      return false;
    }

    if (!(await this.shouldPerformReset(completedTasksCount, taskAssignmentsCount))) {
      return false;
    }

    this.state.isResetting = true;
    const today = getFormattedDate(new Date());
    
    try {
      console.log('🌅 [RESET-MANAGER] Starting daily reset for', today);
      
      // Distributed lock mechanism
      const lockKey = `daily_reset_lock_${today}`;
      const deviceId = localStorage.getItem('deviceId') || `device-${Date.now()}`;
      const lockExpiry = Date.now() + 30000; // 30 second lock

      const lockResult = await this.firebaseService.acquireResetLock?.(lockKey, deviceId, lockExpiry);
      
      if (lockResult === true) {
        console.log('🔒 [RESET-MANAGER] Reset lock acquired, performing reset');
        
        const saveResults = await Promise.all([
          this.quickSave('completedTasks', []),
          this.quickSave('taskAssignments', {})
        ]);
        
        if (saveResults.every(result => result === true)) {
          await this.firebaseService.setLastTaskResetDate?.(today);
          
          // Update our local state
          this.state.lastResetTimestamp = Date.now();
          this.state.lastResetDate = today;
          this.saveResetState();
          
          console.log('✅ [RESET-MANAGER] Daily reset completed successfully');
          
          // Show notification
          this.setShowDailyResetNotification(true);
          setTimeout(() => {
            this.setShowDailyResetNotification(false);
          }, 8000);
          
          // Release the lock
          await this.firebaseService.releaseResetLock?.(lockKey, deviceId);
          console.log('🔓 [RESET-MANAGER] Reset lock released');
          
          return true;
        } else {
          console.error('❌ [RESET-MANAGER] Failed to save to Firebase');
          
          // Release the lock on failure
          await this.firebaseService.releaseResetLock?.(lockKey, deviceId);
          
          return false;
        }
        
      } else {
        console.log('⏳ [RESET-MANAGER] Another device is handling the daily reset, skipping');
        return false;
      }
      
    } catch (error) {
      console.error('❌ [RESET-MANAGER] Error during reset:', error);
      
      // Try to release lock on error
      try {
        const lockKey = `daily_reset_lock_${getFormattedDate(new Date())}`;
        const deviceId = localStorage.getItem('deviceId') || `device-${Date.now()}`;
        await this.firebaseService.releaseResetLock?.(lockKey, deviceId);
      } catch (releaseError) {
        console.error('❌ [RESET-MANAGER] Failed to release lock after error:', releaseError);
      }
      
      return false;
    } finally {
      this.state.isResetting = false;
    }
  }

  // Check if we should show the reset notification (separate from reset logic)
  shouldShowNotification(): boolean {
    const lastNotificationDate = localStorage.getItem('lastDailyResetNotification');
    const today = getFormattedDate(new Date());
    
    return (
      this.state.lastResetDate === today && 
      lastNotificationDate !== today
    );
  }

  // Mark notification as shown
  markNotificationShown() {
    const today = getFormattedDate(new Date());
    localStorage.setItem('lastDailyResetNotification', today);
  }

  // Get current reset state for debugging
  getState(): ResetState {
    return { ...this.state };
  }
}

export default DailyResetManager;