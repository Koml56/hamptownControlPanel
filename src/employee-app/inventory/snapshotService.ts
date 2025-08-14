// src/employee-app/inventory/snapshotService.ts
import { 
  createAllFrequencySnapshots, 
  formatSnapshotForStorage,
  shouldCreateSnapshot,
  generateSnapshotId 
} from './stockCountSnapshots';
import type { 
  InventoryItem, 
  StockCountHistoryEntry, 
  InventoryFrequency 
} from '../types';

/**
 * Snapshot Automation Service
 * Handles automatic creation and management of stock count snapshots
 */
export class SnapshotService {
  private firebaseService: any;
  private snapshots: StockCountHistoryEntry[] = [];
  private isInitialized = false;

  constructor(firebaseService: any) {
    this.firebaseService = firebaseService;
  }

  /**
   * Initialize the service with existing snapshots
   */
  async initialize(existingSnapshots: StockCountHistoryEntry[] = []) {
    this.snapshots = existingSnapshots;
    this.isInitialized = true;
    console.log('📸 SnapshotService initialized with', this.snapshots.length, 'existing snapshots');
  }

  /**
   * Get the latest snapshot date for a specific frequency
   */
  private getLatestSnapshotDate(frequency: 'daily' | 'weekly' | 'monthly'): string | undefined {
    const frequencySnapshots = this.snapshots
      .filter(s => s.frequency === frequency)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return frequencySnapshots[0]?.date;
  }

  /**
   * Check if snapshots should be created and create them
   */
  async checkAndCreateSnapshots(
    dailyItems: InventoryItem[],
    weeklyItems: InventoryItem[],
    monthlyItems: InventoryItem[]
  ): Promise<void> {
    if (!this.isInitialized) {
      console.warn('⚠️ SnapshotService not initialized');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const frequencies: ('daily' | 'weekly' | 'monthly')[] = ['daily', 'weekly', 'monthly'];
    const itemsByFrequency = {
      daily: dailyItems,
      weekly: weeklyItems,
      monthly: monthlyItems
    };

    for (const frequency of frequencies) {
      const lastSnapshotDate = this.getLatestSnapshotDate(frequency);
      const shouldCreate = shouldCreateSnapshot(frequency, lastSnapshotDate);
      
      if (shouldCreate && itemsByFrequency[frequency].length > 0) {
        console.log(`📸 Creating ${frequency} snapshot for ${today}`);
        await this.createSnapshot(itemsByFrequency[frequency], frequency, today);
      }
    }
  }

  /**
   * Manually create a snapshot for a specific date and frequency
   */
  async createSnapshot(
    items: InventoryItem[],
    frequency: InventoryFrequency,
    date?: string
  ): Promise<StockCountHistoryEntry | null> {
    try {
      const snapshots = createAllFrequencySnapshots(
        frequency === 'daily' ? items : [],
        frequency === 'weekly' ? items : [],
        frequency === 'monthly' ? items : [],
        date
      );

      if (snapshots.length === 0) {
        console.warn('⚠️ No snapshots created for', frequency);
        return null;
      }

      const snapshot = snapshots[0]; // Take the first (and should be only) snapshot
      const entry = formatSnapshotForStorage(snapshot);

      // Save to Firebase
      const success = await this.firebaseService.saveStockCountSnapshot(entry);
      
      if (success) {
        // Add to local cache
        this.snapshots.push(entry);
        console.log('✅ Snapshot saved successfully:', entry.snapshotId);
        return entry;
      } else {
        console.error('❌ Failed to save snapshot to Firebase');
        return null;
      }
    } catch (error) {
      console.error('❌ Error creating snapshot:', error);
      return null;
    }
  }

  /**
   * Create a comprehensive snapshot with all frequencies
   */
  async createComprehensiveSnapshot(
    dailyItems: InventoryItem[],
    weeklyItems: InventoryItem[],
    monthlyItems: InventoryItem[],
    date?: string
  ): Promise<StockCountHistoryEntry[]> {
    const results: StockCountHistoryEntry[] = [];
    const snapshotDate = date || new Date().toISOString().split('T')[0];

    try {
      // Create snapshots for each frequency that has items
      if (dailyItems.length > 0) {
        const dailySnapshot = await this.createSnapshot(dailyItems, 'daily', snapshotDate);
        if (dailySnapshot) results.push(dailySnapshot);
      }

      if (weeklyItems.length > 0) {
        const weeklySnapshot = await this.createSnapshot(weeklyItems, 'weekly', snapshotDate);
        if (weeklySnapshot) results.push(weeklySnapshot);
      }

      if (monthlyItems.length > 0) {
        const monthlySnapshot = await this.createSnapshot(monthlyItems, 'monthly', snapshotDate);
        if (monthlySnapshot) results.push(monthlySnapshot);
      }

      console.log(`📸 Created ${results.length} comprehensive snapshots for ${snapshotDate}`);
      return results;
    } catch (error) {
      console.error('❌ Error creating comprehensive snapshots:', error);
      return results;
    }
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): StockCountHistoryEntry[] {
    return [...this.snapshots];
  }

  /**
   * Get snapshots for a specific date
   */
  getSnapshotsForDate(date: string): StockCountHistoryEntry[] {
    return this.snapshots.filter(s => s.date === date);
  }

  /**
   * Get snapshots for a date range
   */
  getSnapshotsForDateRange(startDate: string, endDate: string): StockCountHistoryEntry[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return this.snapshots.filter(s => {
      const snapshotDate = new Date(s.date);
      return snapshotDate >= start && snapshotDate <= end;
    });
  }

  /**
   * Get available snapshot dates
   */
  getAvailableDates(): string[] {
    const dates = new Set(this.snapshots.map(s => s.date));
    return Array.from(dates).sort().reverse(); // Most recent first
  }

  /**
   * Clean up old snapshots (keep last N snapshots per frequency)
   */
  async cleanupOldSnapshots(keepCount: number = 100): Promise<void> {
    try {
      const frequencies: ('daily' | 'weekly' | 'monthly')[] = ['daily', 'weekly', 'monthly'];
      
      for (const frequency of frequencies) {
        const frequencySnapshots = this.snapshots
          .filter(s => s.frequency === frequency)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (frequencySnapshots.length > keepCount) {
          const toDelete = frequencySnapshots.slice(keepCount);
          console.log(`🧹 Cleaning up ${toDelete.length} old ${frequency} snapshots`);
          
          // In a real implementation, you'd delete these from Firebase
          // For now, just remove from local cache
          this.snapshots = this.snapshots.filter(s => 
            !toDelete.some(d => d.snapshotId === s.snapshotId)
          );
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up snapshots:', error);
    }
  }

  /**
   * Force create a snapshot for testing purposes
   */
  async forceCreateSnapshot(
    dailyItems: InventoryItem[],
    weeklyItems: InventoryItem[],
    monthlyItems: InventoryItem[],
    date?: string
  ): Promise<StockCountHistoryEntry[]> {
    console.log('🔧 Force creating snapshots for testing...');
    return await this.createComprehensiveSnapshot(dailyItems, weeklyItems, monthlyItems, date);
  }

  /**
   * Check if we have historical data for a specific date
   */
  hasHistoricalData(date: string): boolean {
    return this.snapshots.some(s => s.date === date);
  }

  /**
   * Get summary statistics for all snapshots
   */
  getSummaryStats() {
    const totalSnapshots = this.snapshots.length;
    const dailySnapshots = this.snapshots.filter(s => s.frequency === 'daily').length;
    const weeklySnapshots = this.snapshots.filter(s => s.frequency === 'weekly').length;
    const monthlySnapshots = this.snapshots.filter(s => s.frequency === 'monthly').length;
    
    const dates = this.getAvailableDates();
    const oldestDate = dates.length > 0 ? dates[dates.length - 1] : null;
    const newestDate = dates.length > 0 ? dates[0] : null;

    return {
      totalSnapshots,
      dailySnapshots,
      weeklySnapshots,
      monthlySnapshots,
      availableDates: dates.length,
      oldestDate,
      newestDate
    };
  }
}

// Singleton instance
let snapshotServiceInstance: SnapshotService | null = null;

/**
 * Get or create the singleton SnapshotService instance
 */
export const getSnapshotService = (firebaseService?: any): SnapshotService => {
  if (!snapshotServiceInstance && firebaseService) {
    snapshotServiceInstance = new SnapshotService(firebaseService);
  }
  
  if (!snapshotServiceInstance) {
    throw new Error('SnapshotService not initialized. Please provide firebaseService instance.');
  }
  
  return snapshotServiceInstance;
};

/**
 * Initialize the snapshot service with existing data
 */
export const initializeSnapshotService = async (
  firebaseService: any, 
  existingSnapshots: StockCountHistoryEntry[] = []
): Promise<SnapshotService> => {
  const service = getSnapshotService(firebaseService);
  await service.initialize(existingSnapshots);
  return service;
};