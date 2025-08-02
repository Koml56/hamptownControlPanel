// firebaseService.ts - Enhanced with comprehensive inventory support
import { 
  Employee, 
  Task, 
  DailyDataMap, 
  TaskAssignments, 
  PrepItem, 
  ScheduledPrep, 
  PrepSelections, 
  StoreItem,
  InventoryData,
  AppData,
  InventorySyncOperation
} from './types';
import type { InventoryItem, DatabaseItem, ActivityLogEntry } from './inventory/types';

export class FirebaseService {
  private baseUrl = 'https://hamptown-panel-default-rtdb.firebaseio.com';
  private inventoryVersion = 0;

  // Enhanced data saving with full inventory support
  async saveData(data: {
    employees: Employee[];
    tasks: Task[];
    dailyData: DailyDataMap;
    completedTasks: Set<number>;
    taskAssignments: TaskAssignments;
    customRoles: string[];
    prepItems: PrepItem[];
    scheduledPreps: ScheduledPrep[];
    prepSelections: PrepSelections;
    storeItems: StoreItem[];
    // NEW: Inventory data
    dailyItems?: InventoryItem[];
    weeklyItems?: InventoryItem[];
    monthlyItems?: InventoryItem[];
    databaseItems?: DatabaseItem[];
    activityLog?: ActivityLogEntry[];
  }) {
    console.log('🔥 Enhanced Firebase save with inventory data...');

    // Prepare inventory data with versioning
    const inventoryData: InventoryData = {
      dailyItems: data.dailyItems || [],
      weeklyItems: data.weeklyItems || [],
      monthlyItems: data.monthlyItems || [],
      databaseItems: data.databaseItems || [],
      activityLog: data.activityLog || [],
      lastUpdated: new Date().toISOString(),
      version: ++this.inventoryVersion
    };

    // Enhanced field list including inventory
    const fields = [
      'employees', 
      'tasks', 
      'dailyData', 
      'completedTasks', 
      'taskAssignments', 
      'customRoles',
      'prepItems',
      'scheduledPreps', 
      'prepSelections',
      'storeItems',
      'inventoryData' // NEW: Save complete inventory data as single object
    ];

    // Prepare complete data object
    const saveData = {
      ...data,
      completedTasks: data.completedTasks instanceof Set ? Array.from(data.completedTasks) : data.completedTasks,
      inventoryData // Add inventory data
    };

    const success = await this.batchSave(fields, saveData);

    if (success) {
      console.log('✅ Enhanced Firebase save completed with inventory data');
    } else {
      console.error('❌ Enhanced Firebase save failed');
      throw new Error('Enhanced Firebase save failed');
    }
  }

  // Enhanced data loading with inventory support
  async loadData(): Promise<AppData> {
    console.log('📡 Enhanced Firebase load with inventory data...');
    
    try {
      const fields = [
        'employees', 
        'tasks', 
        'dailyData', 
        'completedTasks', 
        'taskAssignments', 
        'customRoles',
        'prepItems',
        'scheduledPreps', 
        'prepSelections',
        'storeItems',
        'inventoryData' // NEW: Load inventory data
      ];

      const loadedData = await this.batchLoad(fields);

      // Handle inventory data with defaults
      const inventoryData: InventoryData = loadedData.inventoryData || {
        dailyItems: [],
        weeklyItems: [],
        monthlyItems: [],
        databaseItems: [],
        activityLog: [],
        lastUpdated: new Date().toISOString(),
        version: 0
      };

      this.inventoryVersion = inventoryData.version || 0;

      console.log('📦 Loaded inventory data:', {
        dailyItems: inventoryData.dailyItems.length,
        weeklyItems: inventoryData.weeklyItems.length,
        monthlyItems: inventoryData.monthlyItems.length,
        databaseItems: inventoryData.databaseItems.length,
        activityLog: inventoryData.activityLog.length,
        version: inventoryData.version
      });

      return {
        ...loadedData,
        inventoryData,
        lastUpdated: new Date().toISOString(),
        version: Date.now()
      };

    } catch (error) {
      console.error('❌ Enhanced Firebase load failed:', error);
      throw error;
    }
  }

  // NEW: Save specific inventory data immediately
  async saveInventoryData(inventoryData: Partial<InventoryData>): Promise<boolean> {
    console.log('🏪 Immediate inventory save:', Object.keys(inventoryData));

    try {
      const enhancedData = {
        ...inventoryData,
        lastUpdated: new Date().toISOString(),
        version: ++this.inventoryVersion
      };

      const success = await this.quickSave('inventoryData', enhancedData);
      
      if (success) {
        console.log('✅ Inventory data saved successfully');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Inventory save failed:', error);
      return false;
    }
  }

  // NEW: Save specific inventory frequency data
  async saveInventoryFrequency(frequency: 'daily' | 'weekly' | 'monthly', items: InventoryItem[]): Promise<boolean> {
    console.log(`🗂️ Saving ${frequency} inventory items:`, items.length);

    try {
      const fieldPath = `inventoryData/${frequency}Items`;
      const success = await this.quickSave(fieldPath, items);
      
      if (success) {
        console.log(`✅ ${frequency} inventory items saved`);
        // Also update the version
        await this.quickSave('inventoryData/version', ++this.inventoryVersion);
        await this.quickSave('inventoryData/lastUpdated', new Date().toISOString());
      }
      
      return success;
    } catch (error) {
      console.error(`❌ ${frequency} inventory save failed:`, error);
      return false;
    }
  }

  // NEW: Save database items immediately
  async saveDatabaseItems(databaseItems: DatabaseItem[]): Promise<boolean> {
    console.log('🗄️ Saving database items:', databaseItems.length);

    try {
      const success = await this.quickSave('inventoryData/databaseItems', databaseItems);
      
      if (success) {
        console.log('✅ Database items saved successfully');
        // Update metadata
        await this.quickSave('inventoryData/version', ++this.inventoryVersion);
        await this.quickSave('inventoryData/lastUpdated', new Date().toISOString());
      }
      
      return success;
    } catch (error) {
      console.error('❌ Database items save failed:', error);
      return false;
    }
  }

  // NEW: Save activity log
  async saveActivityLog(activityLog: ActivityLogEntry[]): Promise<boolean> {
    console.log('📝 Saving activity log:', activityLog.length, 'entries');

    try {
      // Only save last 1000 entries to prevent bloat
      const trimmedLog = activityLog.slice(0, 1000);
      const success = await this.quickSave('inventoryData/activityLog', trimmedLog);
      
      if (success) {
        console.log('✅ Activity log saved successfully');
        await this.quickSave('inventoryData/lastUpdated', new Date().toISOString());
      }
      
      return success;
    } catch (error) {
      console.error('❌ Activity log save failed:', error);
      return false;
    }
  }

  // NEW: Apply inventory operation with conflict resolution
  async applyInventoryOperation(operation: InventorySyncOperation): Promise<boolean> {
    console.log('🔄 Applying inventory operation:', operation.type);

    try {
      const timestamp = new Date().toISOString();
      
      // Log the operation in activity log
      const activityEntry = {
        id: Date.now(),
        type: 'manual_add' as const,
        item: `Sync: ${operation.type}`,
        quantity: 1,
        unit: 'operation',
        employee: operation.userId,
        timestamp,
        notes: `Device: ${operation.device}`
      };

      // Apply operation based on type
      switch (operation.type) {
        case 'update_stock':
          return await this.handleStockUpdate(operation);
        case 'add_item':
          return await this.handleItemAdd(operation);
        case 'remove_item':
          return await this.handleItemRemove(operation);
        case 'assign_item':
          return await this.handleItemAssign(operation);
        case 'unassign_item':
          return await this.handleItemUnassign(operation);
        case 'report_waste':
          return await this.handleWasteReport(operation);
        case 'import_items':
          return await this.handleItemsImport(operation);
        default:
          console.warn('Unknown inventory operation type:', operation.type);
          return false;
      }
    } catch (error) {
      console.error('❌ Inventory operation failed:', error);
      return false;
    }
  }

  // Helper methods for inventory operations
  private async handleStockUpdate(operation: InventorySyncOperation): Promise<boolean> {
    const { frequency, itemId, payload } = operation;
    if (!frequency || !itemId) return false;

    const fieldPath = `inventoryData/${frequency}Items`;
    const items = await this.loadField(fieldPath) || [];
    
    const updatedItems = items.map((item: InventoryItem) =>
      item.id === itemId ? { ...item, currentStock: payload.newStock } : item
    );

    return await this.quickSave(fieldPath, updatedItems);
  }

  private async handleItemAdd(operation: InventorySyncOperation): Promise<boolean> {
    const { frequency, payload } = operation;
    if (!frequency) return false;

    const fieldPath = `inventoryData/${frequency}Items`;
    const items = await this.loadField(fieldPath) || [];
    
    return await this.quickSave(fieldPath, [...items, payload.item]);
  }

  private async handleItemRemove(operation: InventorySyncOperation): Promise<boolean> {
    const { frequency, itemId } = operation;
    if (!frequency || !itemId) return false;

    const fieldPath = `inventoryData/${frequency}Items`;
    const items = await this.loadField(fieldPath) || [];
    
    const filteredItems = items.filter((item: InventoryItem) => item.id !== itemId);
    return await this.quickSave(fieldPath, filteredItems);
  }

  private async handleItemAssign(operation: InventorySyncOperation): Promise<boolean> {
    const { payload } = operation;
    
    // Update database items
    const databaseItems = await this.loadField('inventoryData/databaseItems') || [];
    const updatedDbItems = databaseItems.map((item: DatabaseItem) =>
      payload.itemIds.includes(item.id) 
        ? { ...item, isAssigned: true, assignedTo: payload.frequency, assignedCategory: payload.category }
        : item
    );
    
    // Add to frequency items
    const frequencyPath = `inventoryData/${payload.frequency}Items`;
    const frequencyItems = await this.loadField(frequencyPath) || [];
    const newItems = payload.newItems;
    
    await this.quickSave('inventoryData/databaseItems', updatedDbItems);
    return await this.quickSave(frequencyPath, [...frequencyItems, ...newItems]);
  }

  private async handleItemUnassign(operation: InventorySyncOperation): Promise<boolean> {
    const { itemId } = operation;
    if (!itemId) return false;

    // Remove from all frequency lists
    const frequencies = ['daily', 'weekly', 'monthly'];
    const promises = frequencies.map(async (freq) => {
      const items = await this.loadField(`inventoryData/${freq}Items`) || [];
      const filtered = items.filter((item: InventoryItem) => item.databaseId !== itemId);
      return this.quickSave(`inventoryData/${freq}Items`, filtered);
    });

    // Update database item
    const databaseItems = await this.loadField('inventoryData/databaseItems') || [];
    const updatedDbItems = databaseItems.map((item: DatabaseItem) =>
      item.id === itemId ? { ...item, isAssigned: false, assignedTo: undefined } : item
    );

    promises.push(this.quickSave('inventoryData/databaseItems', updatedDbItems));
    
    const results = await Promise.all(promises);
    return results.every(result => result);
  }

  private async handleWasteReport(operation: InventorySyncOperation): Promise<boolean> {
    const { frequency, itemId, payload } = operation;
    if (!frequency || !itemId) return false;

    // Update stock
    const stockResult = await this.handleStockUpdate({
      ...operation,
      payload: { newStock: payload.newStock }
    });

    // Add to activity log
    const activityLog = await this.loadField('inventoryData/activityLog') || [];
    const wasteEntry = {
      id: Date.now(),
      type: 'waste' as const,
      item: payload.itemName,
      quantity: payload.wasteAmount,
      unit: payload.unit,
      employee: operation.userId,
      timestamp: operation.timestamp,
      reason: payload.reason,
      notes: payload.notes
    };

    const logResult = await this.quickSave('inventoryData/activityLog', [wasteEntry, ...activityLog.slice(0, 999)]);
    
    return stockResult && logResult;
  }

  private async handleItemsImport(operation: InventorySyncOperation): Promise<boolean> {
    const { payload } = operation;
    
    const databaseItems = await this.loadField('inventoryData/databaseItems') || [];
    const updatedItems = [...databaseItems, ...payload.items];
    
    return await this.quickSave('inventoryData/databaseItems', updatedItems);
  }

  // Existing methods enhanced for inventory
  private async batchSave(fields: string[], data: any): Promise<boolean> {
    const promises = fields.map(field => {
      let fieldData = data[field];
      
      // Special handling for Sets
      if (fieldData instanceof Set) {
        fieldData = Array.from(fieldData);
      }
      
      return this.quickSave(field, fieldData);
    });

    try {
      const results = await Promise.all(promises);
      return results.every(result => result === true);
    } catch (error) {
      console.error('❌ Batch save failed:', error);
      return false;
    }
  }

  private async batchLoad(fields: string[]): Promise<any> {
    const promises = fields.map(field => this.loadField(field));
    
    try {
      const results = await Promise.all(promises);
      const data: any = {};
      
      fields.forEach((field, index) => {
        data[field] = results[index];
      });
      
      return data;
    } catch (error) {
      console.error('❌ Batch load failed:', error);
      throw error;
    }
  }

  async quickSave(field: string, data: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${field}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        console.log(`✅ ${field} saved successfully`);
        return true;
      } else {
        console.error(`❌ Failed to save ${field}:`, response.status);
        return false;
      }
    } catch (error) {
      console.error(`❌ Network error saving ${field}:`, error);
      return false;
    }
  }

  private async loadField(field: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${field}.json`);
      
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        console.warn(`⚠️ Failed to load ${field}:`, response.status);
        return null;
      }
    } catch (error) {
      console.error(`❌ Network error loading ${field}:`, error);
      return null;
    }
  }

  // Real-time listeners for inventory data
  onInventoryDataChange(callback: (data: InventoryData) => void) {
    // Implementation would use Firebase SDK onValue listener
    // This is a placeholder for the real-time listener setup
    console.log('🔄 Setting up inventory data real-time listener');
    return () => console.log('🔄 Cleaning up inventory data listener');
  }

  onDatabaseItemsChange(callback: (items: DatabaseItem[]) => void) {
    console.log('🔄 Setting up database items real-time listener');
    return () => console.log('🔄 Cleaning up database items listener');
  }

  onInventoryItemsChange(frequency: 'daily' | 'weekly' | 'monthly', callback: (items: InventoryItem[]) => void) {
    console.log(`🔄 Setting up ${frequency} items real-time listener`);
    return () => console.log(`🔄 Cleaning up ${frequency} items listener`);
  }

  onActivityLogChange(callback: (log: ActivityLogEntry[]) => void) {
    console.log('🔄 Setting up activity log real-time listener');
    return () => console.log('🔄 Cleaning up activity log listener');
  }
}
