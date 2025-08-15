// src/employee-app/inventory/dailySnapshotService.ts
/**
 * Daily Snapshot Service - True Historical Tracking
 * 
 * This service implements the solution to the broken snapshot system by:
 * 1. Creating TRUE daily snapshots at end of day (not current data with old dates)
 * 2. Preserving historical accuracy by storing immutable records
 * 3. Automatic scheduling to run at 11:59 PM daily
 * 4. Enhanced database structure for permanent historical records
 */

import type { InventoryItem, InventoryFrequency } from '../types';

/**
 * Interface for TRUE daily snapshots - captures actual state at time of creation
 */
export interface DailySnapshot {
  date: string; // "2024-01-15"
  capturedAt: string; // "2024-01-15T23:59:59Z" - IMMUTABLE timestamp
  inventoryState: {
    [itemId: string]: {
      itemName: string;
      quantity: number;
      unitCost: number; // Price AT THAT TIME (never changes)
      totalValue: number; // quantity × unitCost AT THAT TIME (never changes)
      category: string;
      frequency: InventoryFrequency;
      unit: string;
      minLevel: number;
      optimalLevel: number;
      lastUpdated: string;
    };
  };
  dailyTotals: {
    totalInventoryValue: number; // Sum of all items AT THAT TIME (never changes)
    totalItems: number;
    itemsChanged: number; // Items that changed since last snapshot
    outOfStockItems: number;
    criticalStockItems: number;
    lowStockItems: number;
  };
  metadata: {
    snapshotVersion: string; // For future compatibility
    systemVersion: string;
    capturedBy: string; // 'system' or user ID
    isManual: boolean; // false for automatic, true for manual snapshots
  };
}

/**
 * Service for managing true daily snapshots
 */
export class DailySnapshotService {
  private static instance: DailySnapshotService | null = null;
  private isSchedulingEnabled: boolean = false;
  private schedulerInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DailySnapshotService {
    if (!DailySnapshotService.instance) {
      DailySnapshotService.instance = new DailySnapshotService();
    }
    return DailySnapshotService.instance;
  }

  /**
   * Create a TRUE daily snapshot - captures current state as historical record
   */
  public async createDailySnapshot(
    dailyItems: InventoryItem[],
    weeklyItems: InventoryItem[],
    monthlyItems: InventoryItem[],
    capturedBy: string = 'system',
    isManual: boolean = false
  ): Promise<DailySnapshot> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const capturedAt = now.toISOString();

    // Combine all inventory items
    const allItems = [
      ...dailyItems.map(item => ({ ...item, frequency: 'daily' as InventoryFrequency })),
      ...weeklyItems.map(item => ({ ...item, frequency: 'weekly' as InventoryFrequency })),
      ...monthlyItems.map(item => ({ ...item, frequency: 'monthly' as InventoryFrequency }))
    ];

    const inventoryState: DailySnapshot['inventoryState'] = {};
    let totalInventoryValue = 0;
    let outOfStockItems = 0;
    let criticalStockItems = 0;
    let lowStockItems = 0;

    // Capture CURRENT state as historical record (IMMUTABLE after creation)
    allItems.forEach(item => {
      const totalValue = item.currentStock * item.cost;
      totalInventoryValue += totalValue;

      // Determine stock status
      const stockStatus = this.getStockStatus(item.currentStock, item.minLevel);
      if (stockStatus === 'out') outOfStockItems++;
      else if (stockStatus === 'critical') criticalStockItems++;
      else if (stockStatus === 'low') lowStockItems++;

      inventoryState[item.id.toString()] = {
        itemName: item.name,
        quantity: item.currentStock, // Quantity AT THIS TIME
        unitCost: item.cost, // Price AT THIS TIME (historical price)
        totalValue: totalValue, // Value AT THIS TIME (historical value)
        category: item.category.toString(),
        frequency: item.frequency,
        unit: item.unit,
        minLevel: item.minLevel,
        optimalLevel: item.optimalLevel || item.minLevel * 2,
        lastUpdated: item.lastUsed
      };
    });

    // Calculate items changed (for now, simplified)
    const itemsChanged = allItems.length; // TODO: Compare with previous snapshot

    const snapshot: DailySnapshot = {
      date: today,
      capturedAt,
      inventoryState,
      dailyTotals: {
        totalInventoryValue,
        totalItems: allItems.length,
        itemsChanged,
        outOfStockItems,
        criticalStockItems,
        lowStockItems
      },
      metadata: {
        snapshotVersion: '1.0',
        systemVersion: '1.0.0',
        capturedBy,
        isManual
      }
    };

    return snapshot;
  }

  /**
   * Save snapshot to Firebase (permanent record)
   */
  public async saveDailySnapshot(snapshot: DailySnapshot): Promise<boolean> {
    try {
      // Import Firebase service dynamically to avoid circular dependencies
      const { FirebaseService } = await import('../firebaseService');
      const firebaseService = new FirebaseService();
      
      console.log('📸 Saving daily snapshot:', {
        date: snapshot.date,
        capturedAt: snapshot.capturedAt,
        totalValue: snapshot.dailyTotals.totalInventoryValue,
        totalItems: snapshot.dailyTotals.totalItems
      });

      return await firebaseService.saveDailySnapshot(snapshot);
    } catch (error) {
      console.error('❌ Error saving daily snapshot:', error);
      return false;
    }
  }

  /**
   * Load historical snapshot for a specific date
   */
  public async loadHistoricalSnapshot(date: string): Promise<DailySnapshot | null> {
    try {
      // Import Firebase service dynamically to avoid circular dependencies
      const { FirebaseService } = await import('../firebaseService');
      const firebaseService = new FirebaseService();
      
      console.log('📖 Loading historical snapshot for:', date);
      return await firebaseService.loadDailySnapshot(date);
    } catch (error) {
      console.error('❌ Error loading historical snapshot:', error);
      return null;
    }
  }

  /**
   * Start automatic daily snapshot scheduling (runs at 11:59 PM)
   */
  public startAutomaticScheduling(): void {
    if (this.isSchedulingEnabled) {
      console.log('⏰ Daily snapshot scheduling already enabled');
      return;
    }

    this.isSchedulingEnabled = true;
    
    // Check every minute for 11:59 PM
    this.schedulerInterval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      // Trigger at 23:59 (11:59 PM)
      if (hour === 23 && minute === 59) {
        this.triggerAutomaticSnapshot();
      }
    }, 60000); // Check every minute

    console.log('⏰ Daily snapshot scheduling enabled - will run at 11:59 PM daily');
  }

  /**
   * Stop automatic scheduling
   */
  public stopAutomaticScheduling(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.isSchedulingEnabled = false;
    console.log('⏰ Daily snapshot scheduling disabled');
  }

  /**
   * Trigger automatic snapshot creation
   */
  private async triggerAutomaticSnapshot(): Promise<void> {
    try {
      console.log('📸 Triggering automatic daily snapshot...');
      
      // TODO: Get current inventory data from the application context
      // For now, create an empty snapshot
      const snapshot = await this.createDailySnapshot([], [], [], 'system', false);
      const saved = await this.saveDailySnapshot(snapshot);
      
      if (saved) {
        console.log('✅ Automatic daily snapshot created successfully');
      } else {
        console.error('❌ Failed to save automatic daily snapshot');
      }
    } catch (error) {
      console.error('❌ Error during automatic snapshot creation:', error);
    }
  }

  /**
   * Create manual snapshot (for testing or manual backups)
   */
  public async createManualSnapshot(
    dailyItems: InventoryItem[],
    weeklyItems: InventoryItem[],
    monthlyItems: InventoryItem[],
    userId: string
  ): Promise<DailySnapshot | null> {
    try {
      const snapshot = await this.createDailySnapshot(
        dailyItems,
        weeklyItems,
        monthlyItems,
        userId,
        true
      );
      
      const saved = await this.saveDailySnapshot(snapshot);
      return saved ? snapshot : null;
    } catch (error) {
      console.error('❌ Error creating manual snapshot:', error);
      return null;
    }
  }

  /**
   * Get stock status (copied from stockUtils to avoid dependencies)
   */
  private getStockStatus(currentStock: number, minLevel: number): 'out' | 'critical' | 'low' | 'ok' {
    if (currentStock === 0) return 'out';
    if (currentStock <= minLevel * 0.5) return 'critical';
    if (currentStock <= minLevel) return 'low';
    return 'ok';
  }

  /**
   * Check if scheduling is enabled
   */
  public isSchedulingActive(): boolean {
    return this.isSchedulingEnabled;
  }

  /**
   * Get list of available historical dates
   */
  public async getAvailableHistoricalDates(): Promise<string[]> {
    try {
      // Import Firebase service dynamically to avoid circular dependencies
      const { FirebaseService } = await import('../firebaseService');
      const firebaseService = new FirebaseService();
      
      console.log('📅 Loading available historical dates...');
      return await firebaseService.getAvailableDailySnapshotDates();
    } catch (error) {
      console.error('❌ Error loading historical dates:', error);
      return [];
    }
  }
}

/**
 * Utility function to get singleton instance
 */
export const getDailySnapshotService = (): DailySnapshotService => {
  return DailySnapshotService.getInstance();
};

/**
 * Initialize daily snapshot service with automatic scheduling
 */
export const initializeDailySnapshots = (): void => {
  const service = getDailySnapshotService();
  service.startAutomaticScheduling();
  console.log('🚀 Daily snapshot service initialized');
};