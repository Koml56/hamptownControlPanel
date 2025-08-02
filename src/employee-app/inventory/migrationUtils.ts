// inventory/migrationUtils.ts - Utilities for migrating existing inventory data to Firebase
import type { 
  InventoryItem, 
  DatabaseItem, 
  ActivityLogEntry, 
  InventoryFrequency,
  InventoryCategory,
  InventoryData
} from '../types';
import { generateId, showToast } from './utils';

// ================== MIGRATION TYPES ==================
interface LegacyInventoryItem {
  id?: number | string;
  name: string;
  category?: string;
  stock?: number;
  minStock?: number;
  unit?: string;
  cost?: number;
  ean?: string;
  frequency?: string;
  [key: string]: any;
}

interface LegacyInventoryData {
  daily?: LegacyInventoryItem[];
  weekly?: LegacyInventoryItem[];
  monthly?: LegacyInventoryItem[];
  database?: LegacyInventoryItem[];
  activities?: any[];
  version?: number;
}

interface MigrationResult {
  success: boolean;
  migratedData: InventoryData;
  warnings: string[];
  errors: string[];
  stats: {
    dailyItems: number;
    weeklyItems: number;
    monthlyItems: number;
    databaseItems: number;
    activityEntries: number;
  };
}

// ================== VALIDATION FUNCTIONS ==================
export const validateInventoryItem = (item: any): string[] => {
  const errors: string[] = [];
  
  if (!item.name || typeof item.name !== 'string') {
    errors.push('Item name is required and must be a string');
  }
  
  if (item.currentStock !== undefined && (typeof item.currentStock !== 'number' || item.currentStock < 0)) {
    errors.push('Current stock must be a non-negative number');
  }
  
  if (item.minLevel !== undefined && (typeof item.minLevel !== 'number' || item.minLevel < 0)) {
    errors.push('Minimum level must be a non-negative number');
  }
  
  if (item.cost !== undefined && (typeof item.cost !== 'number' || item.cost < 0)) {
    errors.push('Cost must be a non-negative number');
  }
  
  return errors;
};

export const validateDatabaseItem = (item: any): string[] => {
  const errors: string[] = [];
  
  if (!item.name || typeof item.name !== 'string') {
    errors.push('Database item name is required and must be a string');
  }
  
  if (item.frequency && !['daily', 'weekly', 'monthly', 'database'].includes(item.frequency)) {
    errors.push('Frequency must be one of: daily, weekly, monthly, database');
  }
  
  return errors;
};

// ================== CATEGORY MAPPING ==================
const mapLegacyCategory = (legacyCategory: string | undefined): InventoryCategory => {
  if (!legacyCategory) return 'uncategorized';
  
  const categoryMap: Record<string, InventoryCategory> = {
    'vegetables': 'produce',
    'fruits': 'produce',
    'produce': 'produce',
    'meat': 'meat',
    'chicken': 'meat',
    'beef': 'meat',
    'fish': 'meat',
    'dairy': 'dairy',
    'milk': 'dairy',
    'cheese': 'dairy',
    'bread': 'bread',
    'bakery': 'bread',
    'drinks': 'beverages',
    'beverages': 'beverages',
    'coffee': 'beverages',
    'cooking': 'cooking',
    'spices': 'cooking',
    'oils': 'cooking',
    'baking': 'baking',
    'flour': 'baking',
    'sugar': 'baking',
    'rice': 'grains',
    'pasta': 'grains',
    'grains': 'grains',
    'cleaning': 'cleaning',
    'supplies': 'supplies',
    'packaging': 'packaging',
    'tukku': 'tukku'
  };
  
  const normalized = legacyCategory.toLowerCase().trim();
  return categoryMap[normalized] || 'uncategorized';
};

// ================== ITEM MIGRATION FUNCTIONS ==================
export const migrateLegacyInventoryItem = (
  legacyItem: LegacyInventoryItem,
  frequency: InventoryFrequency
): { item: InventoryItem | null; warnings: string[]; errors: string[] } => {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Validate legacy item
  const validationErrors = validateInventoryItem(legacyItem);
  if (validationErrors.length > 0) {
    errors.push(...validationErrors);
    return { item: null, warnings, errors };
  }
  
  try {
    const migratedItem: InventoryItem = {
      id: legacyItem.id || generateId(),
      name: legacyItem.name.trim(),
      category: mapLegacyCategory(legacyItem.category),
      currentStock: legacyItem.stock || legacyItem.currentStock || 0,
      minLevel: legacyItem.minStock || legacyItem.minLevel || 1,
      unit: legacyItem.unit || 'pieces',
      lastUsed: new Date().toISOString().split('T')[0],
      cost: legacyItem.cost || 0,
      ean: legacyItem.ean || '',
      frequency,
      databaseId: legacyItem.databaseId || legacyItem.id
    };
    
    // Add warnings for data transformations
    if (legacyItem.category && mapLegacyCategory(legacyItem.category) === 'uncategorized') {
      warnings.push(`Category '${legacyItem.category}' was mapped to 'uncategorized'`);
    }
    
    if (!legacyItem.unit) {
      warnings.push('Unit was set to default value "pieces"');
    }
    
    if (legacyItem.stock !== undefined && legacyItem.currentStock !== undefined) {
      warnings.push('Both "stock" and "currentStock" found, used "currentStock"');
    }
    
    return { item: migratedItem, warnings, errors };
  } catch (error) {
    errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { item: null, warnings, errors };
  }
};

export const migrateLegacyDatabaseItem = (
  legacyItem: LegacyInventoryItem
): { item: DatabaseItem | null; warnings: string[]; errors: string[] } => {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Validate legacy item
  const validationErrors = validateDatabaseItem(legacyItem);
  if (validationErrors.length > 0) {
    errors.push(...validationErrors);
    return { item: null, warnings, errors };
  }
  
  try {
    const migratedItem: DatabaseItem = {
      id: legacyItem.id || generateId(),
      name: legacyItem.name.trim(),
      ean: legacyItem.ean || '',
      unit: legacyItem.unit || 'pieces',
      cost: legacyItem.cost || 0,
      costWithTax: legacyItem.costWithTax || (legacyItem.cost ? legacyItem.cost * 1.24 : 0),
      type: mapLegacyCategory(legacyItem.category),
      frequency: 'database',
      isAssigned: legacyItem.isAssigned || false,
      assignedTo: legacyItem.assignedTo as InventoryFrequency || undefined,
      assignedCategory: legacyItem.assignedCategory ? mapLegacyCategory(legacyItem.assignedCategory) : undefined,
      assignedDate: legacyItem.assignedDate || undefined
    };
    
    // Add warnings for data transformations
    if (!legacyItem.unit) {
      warnings.push('Unit was set to default value "pieces"');
    }
    
    if (legacyItem.costWithTax === undefined && legacyItem.cost) {
      warnings.push('CostWithTax was calculated as cost * 1.24');
    }
    
    return { item: migratedItem, warnings, errors };
  } catch (error) {
    errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { item: null, warnings, errors };
  }
};

// ================== ACTIVITY LOG MIGRATION ==================
export const migrateLegacyActivityEntry = (
  legacyEntry: any
): { entry: ActivityLogEntry | null; warnings: string[]; errors: string[] } => {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  if (!legacyEntry.item || !legacyEntry.type) {
    errors.push('Activity entry must have item and type');
    return { entry: null, warnings, errors };
  }
  
  try {
    const migratedEntry: ActivityLogEntry = {
      id: legacyEntry.id || generateId(),
      type: legacyEntry.type || 'manual_add',
      item: legacyEntry.item,
      quantity: legacyEntry.quantity || 0,
      unit: legacyEntry.unit || 'pieces',
      employee: legacyEntry.employee || legacyEntry.user || 'Unknown',
      timestamp: legacyEntry.timestamp || legacyEntry.date || new Date().toLocaleString(),
      notes: legacyEntry.notes || legacyEntry.description || '',
      reason: legacyEntry.reason
    };
    
    // Add warnings for data transformations
    if (!legacyEntry.employee && !legacyEntry.user) {
      warnings.push('Employee was set to "Unknown"');
    }
    
    if (!legacyEntry.timestamp && !legacyEntry.date) {
      warnings.push('Timestamp was set to current date');
    }
    
    return { entry: migratedEntry, warnings, errors };
  } catch (error) {
    errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { entry: null, warnings, errors };
  }
};

// ================== FULL DATA MIGRATION ==================
export const migrateInventoryData = async (
  legacyData: LegacyInventoryData | any,
  options: {
    validateData?: boolean;
    skipInvalidItems?: boolean;
    showProgress?: boolean;
  } = {}
): Promise<MigrationResult> => {
  const {
    validateData = true,
    skipInvalidItems = true,
    showProgress = false
  } = options;
  
  const result: MigrationResult = {
    success: false,
    migratedData: {
      dailyItems: [],
      weeklyItems: [],
      monthlyItems: [],
      databaseItems: [],
      activityLog: [],
      lastUpdated: new Date().toISOString(),
      version: 1
    },
    warnings: [],
    errors: [],
    stats: {
      dailyItems: 0,
      weeklyItems: 0,
      monthlyItems: 0,
      databaseItems: 0,
      activityEntries: 0
    }
  };
  
  try {
    console.log('🔄 Starting inventory data migration...');
    
    // Migrate daily items
    if (legacyData.daily || legacyData.dailyItems) {
      const dailyItems = legacyData.daily || legacyData.dailyItems || [];
      if (showProgress) console.log(`📦 Migrating ${dailyItems.length} daily items...`);
      
      for (const legacyItem of dailyItems) {
        const migration = migrateLegacyInventoryItem(legacyItem, 'daily');
        
        if (migration.item) {
          result.migratedData.dailyItems.push(migration.item);
          result.stats.dailyItems++;
        } else if (!skipInvalidItems) {
          result.errors.push(`Failed to migrate daily item: ${legacyItem.name || 'Unknown'}`);
        }
        
        result.warnings.push(...migration.warnings.map(w => `Daily item ${legacyItem.name}: ${w}`));
        result.errors.push(...migration.errors.map(e => `Daily item ${legacyItem.name}: ${e}`));
      }
    }
    
    // Migrate weekly items
    if (legacyData.weekly || legacyData.weeklyItems) {
      const weeklyItems = legacyData.weekly || legacyData.weeklyItems || [];
      if (showProgress) console.log(`📦 Migrating ${weeklyItems.length} weekly items...`);
      
      for (const legacyItem of weeklyItems) {
        const migration = migrateLegacyInventoryItem(legacyItem, 'weekly');
        
        if (migration.item) {
          result.migratedData.weeklyItems.push(migration.item);
          result.stats.weeklyItems++;
        } else if (!skipInvalidItems) {
          result.errors.push(`Failed to migrate weekly item: ${legacyItem.name || 'Unknown'}`);
        }
        
        result.warnings.push(...migration.warnings.map(w => `Weekly item ${legacyItem.name}: ${w}`));
        result.errors.push(...migration.errors.map(e => `Weekly item ${legacyItem.name}: ${e}`));
      }
    }
    
    // Migrate monthly items
    if (legacyData.monthly || legacyData.monthlyItems) {
      const monthlyItems = legacyData.monthly || legacyData.monthlyItems || [];
      if (showProgress) console.log(`📦 Migrating ${monthlyItems.length} monthly items...`);
      
      for (const legacyItem of monthlyItems) {
        const migration = migrateLegacyInventoryItem(legacyItem, 'monthly');
        
        if (migration.item) {
          result.migratedData.monthlyItems.push(migration.item);
          result.stats.monthlyItems++;
        } else if (!skipInvalidItems) {
          result.errors.push(`Failed to migrate monthly item: ${legacyItem.name || 'Unknown'}`);
        }
        
        result.warnings.push(...migration.warnings.map(w => `Monthly item ${legacyItem.name}: ${w}`));
        result.errors.push(...migration.errors.map(e => `Monthly item ${legacyItem.name}: ${e}`));
      }
    }
    
    // Migrate database items
    if (legacyData.database || legacyData.databaseItems) {
      const databaseItems = legacyData.database || legacyData.databaseItems || [];
      if (showProgress) console.log(`🗄️ Migrating ${databaseItems.length} database items...`);
      
      for (const legacyItem of databaseItems) {
        const migration = migrateLegacyDatabaseItem(legacyItem);
        
        if (migration.item) {
          result.migratedData.databaseItems.push(migration.item);
          result.stats.databaseItems++;
        } else if (!skipInvalidItems) {
          result.errors.push(`Failed to migrate database item: ${legacyItem.name || 'Unknown'}`);
        }
        
        result.warnings.push(...migration.warnings.map(w => `Database item ${legacyItem.name}: ${w}`));
        result.errors.push(...migration.errors.map(e => `Database item ${legacyItem.name}: ${e}`));
      }
    }
    
    // Migrate activity log
    if (legacyData.activities || legacyData.activityLog) {
      const activities = legacyData.activities || legacyData.activityLog || [];
      if (showProgress) console.log(`📝 Migrating ${activities.length} activity entries...`);
      
      for (const legacyEntry of activities) {
        const migration = migrateLegacyActivityEntry(legacyEntry);
        
        if (migration.entry) {
          result.migratedData.activityLog.push(migration.entry);
          result.stats.activityEntries++;
        } else if (!skipInvalidItems) {
          result.errors.push(`Failed to migrate activity entry: ${legacyEntry.id || 'Unknown'}`);
        }
        
        result.warnings.push(...migration.warnings.map(w => `Activity entry: ${w}`));
        result.errors.push(...migration.errors.map(e => `Activity entry: ${e}`));
      }
    }
    
    // Sort activity log by timestamp (newest first)
    result.migratedData.activityLog.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Determine success
    const hasData = result.stats.dailyItems > 0 || 
                   result.stats.weeklyItems > 0 || 
                   result.stats.monthlyItems > 0 || 
                   result.stats.databaseItems > 0;
    
    result.success = hasData && (skipInvalidItems || result.errors.length === 0);
    
    console.log('✅ Inventory data migration completed:', result.stats);
    
    if (showProgress) {
      showToast(
        `Migration completed: ${result.stats.dailyItems + result.stats.weeklyItems + result.stats.monthlyItems + result.stats.databaseItems} items migrated`,
        result.warnings.length > 0 ? 'warning' : 'success'
      );
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

// ================== FIREBASE MIGRATION HELPER ==================
export const migrateAndSaveToFirebase = async (
  legacyData: LegacyInventoryData | any,
  firebaseService: any,
  options: {
    backup?: boolean;
    validateData?: boolean;
    skipInvalidItems?: boolean;
    showProgress?: boolean;
  } = {}
): Promise<{ success: boolean; migrationResult: MigrationResult; backupResult?: any }> => {
  const {
    backup = true,
    validateData = true,
    skipInvalidItems = true,
    showProgress = true
  } = options;
  
  try {
    console.log('🚀 Starting Firebase migration process...');
    
    // Create backup if requested
    let backupResult;
    if (backup) {
      console.log('💾 Creating backup of existing data...');
      try {
        const existingData = await firebaseService.loadData();
        backupResult = await firebaseService.quickSave(
          `backup_inventory_${Date.now()}`,
          existingData.inventoryData || {}
        );
        console.log(backupResult ? '✅ Backup created' : '⚠️ Backup failed');
      } catch (error) {
        console.warn('⚠️ Backup failed, continuing with migration:', error);
      }
    }
    
    // Perform migration
    const migrationResult = await migrateInventoryData(legacyData, {
      validateData,
      skipInvalidItems,
      showProgress
    });
    
    if (!migrationResult.success) {
      throw new Error(`Migration failed: ${migrationResult.errors.join(', ')}`);
    }
    
    // Save migrated data to Firebase
    console.log('💾 Saving migrated data to Firebase...');
    const saveSuccess = await firebaseService.saveInventoryData(migrationResult.migratedData);
    
    if (!saveSuccess) {
      throw new Error('Failed to save migrated data to Firebase');
    }
    
    console.log('✅ Firebase migration completed successfully');
    
    if (showProgress) {
      showToast('Inventory data migrated and saved to Firebase successfully!', 'success');
    }
    
    return {
      success: true,
      migrationResult,
      backupResult
    };
    
  } catch (error) {
    console.error('❌ Firebase migration failed:', error);
    
    if (showProgress) {
      showToast(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
    
    return {
      success: false,
      migrationResult: {
        success: false,
        migratedData: {
          dailyItems: [],
          weeklyItems: [],
          monthlyItems: [],
          databaseItems: [],
          activityLog: [],
          lastUpdated: new Date().toISOString(),
          version: 0
        },
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        stats: {
          dailyItems: 0,
          weeklyItems: 0,
          monthlyItems: 0,
          databaseItems: 0,
          activityEntries: 0
        }
      }
    };
  }
};

// ================== EXPORT HELPERS ==================
export const exportMigrationReport = (migrationResult: MigrationResult): string => {
  const report = `
INVENTORY MIGRATION REPORT
==========================

Migration Status: ${migrationResult.success ? 'SUCCESS' : 'FAILED'}
Generated: ${new Date().toLocaleString()}

STATISTICS:
-----------
Daily Items: ${migrationResult.stats.dailyItems}
Weekly Items: ${migrationResult.stats.weeklyItems}
Monthly Items: ${migrationResult.stats.monthlyItems}
Database Items: ${migrationResult.stats.databaseItems}
Activity Entries: ${migrationResult.stats.activityEntries}

WARNINGS (${migrationResult.warnings.length}):
${migrationResult.warnings.length > 0 ? migrationResult.warnings.map(w => `- ${w}`).join('\n') : 'None'}

ERRORS (${migrationResult.errors.length}):
${migrationResult.errors.length > 0 ? migrationResult.errors.map(e => `- ${e}`).join('\n') : 'None'}

DATA STRUCTURE:
---------------
Daily Items: ${migrationResult.migratedData.dailyItems.length}
Weekly Items: ${migrationResult.migratedData.weeklyItems.length}
Monthly Items: ${migrationResult.migratedData.monthlyItems.length}
Database Items: ${migrationResult.migratedData.databaseItems.length}
Activity Log: ${migrationResult.migratedData.activityLog.length}

Last Updated: ${migrationResult.migratedData.lastUpdated}
Version: ${migrationResult.migratedData.version}
`;
  
  return report;
};
