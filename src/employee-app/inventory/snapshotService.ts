// src/employee-app/inventory/snapshotService.ts
import { 
  createStockCountSnapshot
} from './stockCountSnapshots';
import type { 
  InventoryItem, 
  StockCountHistoryEntry, 
  InventoryFrequency 
} from '../types';

/**
 * Enhanced validation utilities for snapshot service
 */
export class SnapshotValidation {
  /**
   * Validates inventory item data
   */
  static validateInventoryItem(item: any): item is InventoryItem {
    if (!item || typeof item !== 'object') {
      return false;
    }

    // Required fields validation
    const requiredFields = ['id', 'name', 'category', 'currentStock', 'minLevel', 'unit', 'cost'];
    for (const field of requiredFields) {
      if (item[field] === undefined || item[field] === null) {
        console.warn(`⚠️ Invalid item - missing field: ${field}`, item);
        return false;
      }
    }

    // Type validation
    if (typeof item.currentStock !== 'number' || item.currentStock < 0) {
      console.warn('⚠️ Invalid item - currentStock must be a non-negative number', item);
      return false;
    }

    if (typeof item.minLevel !== 'number' || item.minLevel < 0) {
      console.warn('⚠️ Invalid item - minLevel must be a non-negative number', item);
      return false;
    }

    if (typeof item.cost !== 'number' || item.cost < 0) {
      console.warn('⚠️ Invalid item - cost must be a non-negative number', item);
      return false;
    }

    return true;
  }

  /**
   * Sanitizes inventory item data
   */
  static sanitizeInventoryItem(item: any): InventoryItem | null {
    if (!this.validateInventoryItem(item)) {
      return null;
    }

    return {
      ...item,
      currentStock: Math.max(0, Number(item.currentStock) || 0),
      minLevel: Math.max(0, Number(item.minLevel) || 0),
      cost: Math.max(0, Number(item.cost) || 0),
      optimalLevel: item.optimalLevel ? Math.max(0, Number(item.optimalLevel)) : item.minLevel * 2,
      lastUsed: item.lastUsed || new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Validates snapshot data integrity
   */
  static validateSnapshot(snapshot: any): boolean {
    if (!snapshot || typeof snapshot !== 'object') {
      return false;
    }

    const requiredFields = ['date', 'frequency', 'timestamp', 'totalItems', 'totalValue', 'itemCounts', 'summary'];
    for (const field of requiredFields) {
      if (snapshot[field] === undefined || snapshot[field] === null) {
        console.warn(`⚠️ Invalid snapshot - missing field: ${field}`);
        return false;
      }
    }

    // Validate item counts structure
    if (typeof snapshot.itemCounts !== 'object') {
      console.warn('⚠️ Invalid snapshot - itemCounts must be an object');
      return false;
    }

    return true;
  }
}

/**
 * Enhanced error handling utilities
 */
export class SnapshotErrorHandler {
  /**
   * Wraps async operations with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      console.error(`❌ Error in ${context}:`, error);
      
      // Log additional context for debugging
      if (error instanceof Error) {
        console.error(`Stack trace:`, error.stack);
      }
      
      if (fallback !== undefined) {
        console.log(`🔄 Using fallback value for ${context}`);
        return fallback;
      }
      
      return null;
    }
  }

  /**
   * Validates and retries Firebase operations
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw new Error(lastError?.message || 'Operation failed after retries');
  }
}

// Helper functions for creating snapshots - export the key functions
export const createStockSnapshot = async (
  items: InventoryItem[],
  frequency: InventoryFrequency,
  currentUser: string = 'System'
): Promise<StockCountHistoryEntry> => {
  try {
    // Import the Firebase service
    const { addStockCountSnapshot } = await import('../firebaseService');
    
    // FIXED: Use the correct function for single frequency snapshots
    const snapshot = createStockCountSnapshot(items, frequency, undefined, currentUser);

    // Convert StockCountSnapshot to StockCountHistoryEntry
    const historyEntry: StockCountHistoryEntry = {
      snapshotId: `${frequency}_${snapshot.date.replace(/-/g, '')}`,
      date: snapshot.date,
      frequency: snapshot.frequency,
      snapshot: snapshot
    };

    // Save to Firebase
    await addStockCountSnapshot(historyEntry);

    return historyEntry;
  } catch (error) {
    console.error(`❌ Error creating ${frequency} snapshot:`, error);
    throw error;
  }
};

export const generateSnapshotSummary = (snapshot: any) => {
  if (!snapshot || !snapshot.itemCounts) {
    return {
      dailyItemsCount: 0,
      weeklyItemsCount: 0,
      monthlyItemsCount: 0,
      totalInventoryValue: 0,
      outOfStockItems: 0,
      criticalStockItems: 0,
      lowStockItems: 0
    };
  }

  const items = Object.values(snapshot.itemCounts) as any[];
  let dailyItemsCount = 0;
  let weeklyItemsCount = 0;
  let monthlyItemsCount = 0;
  let outOfStockItems = 0;
  let criticalStockItems = 0;
  let lowStockItems = 0;

  items.forEach(item => {
    // FIXED: Add null check for item and item.frequency
    if (!item) return;
    
    if (item.frequency === 'daily') dailyItemsCount++;
    if (item.frequency === 'weekly') weeklyItemsCount++;
    if (item.frequency === 'monthly') monthlyItemsCount++;

    // Use the same logic as getStockStatus for consistency
    if (item.currentStock === 0) {
      outOfStockItems++;
    } else if (item.minLevel > 0) {
      const percentage = (item.currentStock / item.minLevel) * 100;
      if (percentage <= 20) {
        criticalStockItems++;
      } else if (percentage <= 50) {
        lowStockItems++;
      }
    }
  });

  return {
    dailyItemsCount,
    weeklyItemsCount,
    monthlyItemsCount,
    totalInventoryValue: snapshot.totalValue || 0,
    outOfStockItems,
    criticalStockItems,
    lowStockItems
  };
};

/**
 * Enhanced Snapshot Automation Service
 * Handles automatic creation and management of stock count snapshots with robust error handling
 */
export class SnapshotService {
  private firebaseService: any;
  private snapshots: StockCountHistoryEntry[] = [];
  private isInitialized = false;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor(firebaseService: any) {
    this.firebaseService = firebaseService;
  }

  /**
   * Initialize the service with existing snapshots and validation
   */
  async initialize(existingSnapshots: StockCountHistoryEntry[] = []) {
    return SnapshotErrorHandler.withErrorHandling(async () => {
      // Validate and sanitize existing snapshots
      this.snapshots = existingSnapshots.filter(snapshot => {
        if (!SnapshotValidation.validateSnapshot(snapshot)) {
          console.warn('⚠️ Skipping invalid snapshot during initialization:', snapshot);
          return false;
        }
        return true;
      });

      this.isInitialized = true;
      console.log('📸 SnapshotService initialized with', this.snapshots.length, 'valid snapshots');
      
      return this.snapshots.length;
    }, 'SnapshotService initialization', 0);
  }

  /**
   * Get all snapshots with error handling
   */
  async getAllSnapshots(): Promise<StockCountHistoryEntry[]> {
    const result = await SnapshotErrorHandler.withErrorHandling(async () => {
      if (!this.isInitialized) {
        console.warn('⚠️ SnapshotService not initialized, returning empty array');
        return [];
      }

      return this.snapshots.filter(snapshot => 
        SnapshotValidation.validateSnapshot(snapshot)
      );
    }, 'Getting all snapshots', []);
    
    return result || [];
  }

  /**
   * Health check for the snapshot service
   */
  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check initialization
    if (!this.isInitialized) {
      issues.push('Service not initialized');
    }

    // Check snapshot data integrity
    const invalidSnapshots = this.snapshots.filter(s => !SnapshotValidation.validateSnapshot(s));
    if (invalidSnapshots.length > 0) {
      issues.push(`${invalidSnapshots.length} invalid snapshots found`);
    }

    return {
      healthy: issues.length === 0,
      issues
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