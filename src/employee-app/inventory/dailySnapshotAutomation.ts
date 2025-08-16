// src/employee-app/inventory/dailySnapshotAutomation.ts
import type { StockCountHistoryEntry, InventoryFrequency } from '../types';
import { createComprehensiveSnapshot, createComprehensiveDailySnapshot } from './stockCountSnapshots';
import { SnapshotErrorHandler } from './snapshotService';

export interface DailySnapshotConfig {
  enableAutomation: boolean;
  snapshotTime: string; // HH:MM format, e.g., "23:59"
  retentionDays: number; // How many days to keep snapshots
  frequencies: InventoryFrequency[]; // Which frequencies to snapshot
}

export const DEFAULT_SNAPSHOT_CONFIG: DailySnapshotConfig = {
  enableAutomation: true,
  snapshotTime: "23:59", // Just before midnight
  retentionDays: 365, // Keep for 1 year
  frequencies: ['daily', 'weekly', 'monthly']
};

/**
 * Daily Snapshot Automation Service
 * Prevents historical data corruption by ensuring regular snapshots are created
 */
export class DailySnapshotAutomation {
  private config: DailySnapshotConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private lastSnapshotDate: string | null = null;
  private firebaseService: any;

  constructor(firebaseService: any, config: DailySnapshotConfig = DEFAULT_SNAPSHOT_CONFIG) {
    this.firebaseService = firebaseService;
    this.config = config;
  }

  /**
   * Start the daily snapshot automation
   */
  start() {
    if (!this.config.enableAutomation) {
      console.log('📸 Daily snapshot automation is disabled');
      return;
    }

    console.log('📸 Starting daily snapshot automation...');
    console.log(`⏰ Scheduled for ${this.config.snapshotTime} daily`);
    
    // Check immediately if we need a snapshot for today
    this.checkAndCreateSnapshot();
    
    // Set up interval to check every hour
    this.intervalId = setInterval(() => {
      this.checkAndCreateSnapshot();
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Stop the daily snapshot automation
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('📸 Daily snapshot automation stopped');
    }
  }

  /**
   * Check if a snapshot is needed and create it
   */
  private async checkAndCreateSnapshot() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Only create snapshot at the specified time
    const [targetHour, targetMinute] = this.config.snapshotTime.split(':').map(Number);
    const [currentHour, currentMinute] = [now.getHours(), now.getMinutes()];

    // Check if it's time for the daily snapshot (within 1 hour window)
    const isSnapshotTime = (
      currentHour === targetHour && 
      Math.abs(currentMinute - targetMinute) <= 30
    ) || (
      // Also allow if we missed the exact time but it's within an hour
      currentHour === (targetHour + 1) % 24 && 
      currentMinute <= 30
    );

    if (!isSnapshotTime) {
      return; // Not time yet
    }

    // Don't create multiple snapshots for the same day
    if (this.lastSnapshotDate === today) {
      return; // Already created today
    }

    try {
      console.log(`📸 Creating automated daily snapshot for ${today}...`);
      
      // Get current inventory data from Firebase
      const inventoryData = await this.firebaseService.loadData();
      
      if (!inventoryData) {
        console.error('❌ Could not load inventory data for snapshot');
        return;
      }

      // Create comprehensive snapshot (existing format for compatibility)
      const snapshot = createComprehensiveSnapshot(
        inventoryData.inventoryDailyItems || [],
        inventoryData.inventoryWeeklyItems || [],
        inventoryData.inventoryMonthlyItems || [],
        today
      );

      // Create enhanced daily snapshot (new comprehensive format)
      const dailySnapshot = createComprehensiveDailySnapshot(
        inventoryData.inventoryDailyItems || [],
        inventoryData.inventoryWeeklyItems || [],
        inventoryData.inventoryMonthlyItems || [],
        inventoryData.inventoryActivityLog || [],
        inventoryData.employees || [],
        'system_automatic',
        today
      );

      // Format for storage (existing format)
      const historyEntry: StockCountHistoryEntry = {
        snapshotId: `auto_daily_${today.replace(/-/g, '')}`,
        date: today,
        frequency: 'daily',
        snapshot
      };

      // Save both snapshots to Firebase
      const existingSnapshots = inventoryData.stockCountSnapshots || [];
      const existingDailySnapshots = inventoryData.dailyInventorySnapshots || [];
      
      const updatedSnapshots = [...existingSnapshots, historyEntry];
      const updatedDailySnapshots = [...existingDailySnapshots, dailySnapshot];

      // Save snapshots and daily snapshots
      await this.firebaseService.quickSave('stockCountSnapshots', updatedSnapshots);
      await this.firebaseService.quickSave('dailyInventorySnapshots', updatedDailySnapshots);

      this.lastSnapshotDate = today;
      
      console.log(`✅ Automated daily snapshot created successfully for ${today}`);
      console.log(`📊 Snapshot contains ${snapshot.totalItems} items with total value $${snapshot.totalValue.toFixed(2)}`);
      console.log(`📈 Enhanced daily snapshot saved with ${Object.keys(dailySnapshot.items).length} items and compliance data`);

      // Clean up old snapshots if needed
      await this.cleanupOldSnapshots(updatedSnapshots);

    } catch (error) {
      console.error('❌ Failed to create automated daily snapshot:', error);
    }
  }

  /**
   * Clean up old snapshots based on retention policy
   */
  private async cleanupOldSnapshots(snapshots: StockCountHistoryEntry[]) {
    return SnapshotErrorHandler.withErrorHandling(async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      // Filter out snapshots older than retention period
      // Only remove automated snapshots, keep manual ones
      const filteredSnapshots = snapshots.filter(snapshot => {
        const isOld = snapshot.date < cutoffDateStr;
        const isAutomated = snapshot.snapshotId.startsWith('auto_');
        
        // Keep if not old OR not automated (manual snapshots are preserved)
        return !isOld || !isAutomated;
      });

      if (filteredSnapshots.length < snapshots.length) {
        const removedCount = snapshots.length - filteredSnapshots.length;
        console.log(`🧹 Cleaned up ${removedCount} old automated snapshots (retention: ${this.config.retentionDays} days)`);
        
        // Save cleaned up snapshots
        await this.firebaseService.quickSave('stockCountSnapshots', filteredSnapshots);
      }
    }, 'Daily snapshot cleanup', undefined);
  }

  /**
   * Manually trigger a snapshot creation
   */
  async createManualSnapshot(reason: string = 'Manual trigger'): Promise<boolean> {
    const result = await SnapshotErrorHandler.withErrorHandling(async () => {
      const today = new Date().toISOString().split('T')[0];
      console.log(`📸 Creating manual snapshot for ${today}: ${reason}`);
      
      await this.checkAndCreateSnapshot();
      return true;
    }, 'Manual snapshot creation', false);
    
    return result !== null ? result : false;
  }

  /**
   * Get snapshot automation status
   */
  getStatus() {
    return {
      enabled: this.config.enableAutomation,
      isRunning: this.intervalId !== null,
      lastSnapshotDate: this.lastSnapshotDate,
      nextSnapshotTime: this.config.snapshotTime,
      retentionDays: this.config.retentionDays
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DailySnapshotConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    // Restart automation if it was running
    if (this.intervalId) {
      this.stop();
      this.start();
    }
    
    console.log('📸 Daily snapshot automation config updated:', this.config);
  }
}

// Singleton instance
let automationInstance: DailySnapshotAutomation | null = null;

/**
 * Get or create the singleton automation instance
 */
export const getDailySnapshotAutomation = (firebaseService?: any, config?: DailySnapshotConfig): DailySnapshotAutomation => {
  if (!automationInstance && firebaseService) {
    automationInstance = new DailySnapshotAutomation(firebaseService, config);
  }
  
  if (!automationInstance) {
    throw new Error('DailySnapshotAutomation not initialized. Please provide firebaseService instance.');
  }
  
  return automationInstance;
};

/**
 * Initialize and start daily snapshot automation
 */
export const initializeDailySnapshotAutomation = (
  firebaseService: any, 
  config?: DailySnapshotConfig
): DailySnapshotAutomation => {
  const automation = getDailySnapshotAutomation(firebaseService, config);
  automation.start();
  
  console.log('📸 Daily snapshot automation initialized and started');
  return automation;
};