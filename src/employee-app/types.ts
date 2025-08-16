// types.ts
export interface Employee {
  id: number;
  name: string;
  mood: number;
  lastUpdated: string;
  role: string;
  lastMoodDate: string | null;
  points: number; // New: employee points balance
}

export interface Task {
  id: number;
  task: string;
  location: string;
  priority: Priority;
  estimatedTime: string;
  points: number; // New: points awarded for completing this task
}

export interface StoreItem {
  id: number;
  name: string;
  description: string;
  cost: number; // Points required to purchase
  category: 'food' | 'break' | 'reward' | 'social';
  icon: string; // Emoji or icon
  available: boolean;
}

export interface Purchase {
  id: number;
  employeeId: number;
  itemId: number;
  itemName: string;
  cost: number;
  purchasedAt: string;
  date: string;
  status: 'pending' | 'approved' | 'redeemed';
}

// New: Prep List Management Types
export interface Recipe {
  ingredients: string;
  instructions: string;
}

export interface PrepItem {
  id: number;
  name: string;
  category: string;
  estimatedTime: string;
  isCustom: boolean;
  hasRecipe: boolean;
  recipe: Recipe | null;
  frequency: number; // How often this prep should be done (in days)
}

export interface ScheduledPrep {
  id: number;
  prepId: number;
  name: string;
  category: string;
  estimatedTime: string;
  isCustom: boolean;
  hasRecipe: boolean;
  recipe: Recipe | null;
  scheduledDate: string;
  priority: Priority;
  timeSlot: string;
  completed: boolean;
  assignedTo: number | null;
  notes: string;
}

export interface PrepSelections {
  [key: string]: {
    priority: Priority;
    timeSlot: string;
    selected: boolean;
  };
}

export interface DailyData {
  completedTasks: Array<{
    taskId: number;
    employeeId: number;
    completedAt: string;
    taskName: string;
    date: string;
    pointsEarned: number; // New: points earned from this task
  }>;
  employeeMoods: Array<{
    employeeId: number;
    mood: number;
    updatedAt: string;
  }>;
  purchases: Array<Purchase>; // New: daily purchases
  totalTasks: number;
  completionRate: number;
  totalPointsEarned: number; // New: total points earned today
  totalPointsSpent: number; // New: total points spent today
}

export interface DailyDataMap {
  [date: string]: DailyData;
}

export interface TaskAssignments {
  [taskId: number]: number;
}

export interface CurrentUser {
  id: number;
  name: string;
}

export type Priority = 'low' | 'medium' | 'high';
export type ConnectionStatus = 'connecting' | 'connected' | 'error';
export type ActiveTab = 'mood' | 'tasks' | 'store' | 'admin' | 'reports' | 'prep' | 'inventory';

// Admin Panel Props Interface
export interface AdminPanelProps {
  employees: Employee[];
  tasks: Task[];
  customRoles: string[];
  storeItems: StoreItem[];
  prepItems: PrepItem[];
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
  setCustomRoles: (updater: (prev: string[]) => string[]) => void;
  setStoreItems: (updater: (prev: StoreItem[]) => StoreItem[]) => void;
  setPrepItems: (updater: (prev: PrepItem[]) => PrepItem[]) => void;
  quickSave: (field: string, data: any) => Promise<any>;
}

// Inventory Types - moved from inventory/types.ts for Firebase integration
export type InventoryFrequency = 'daily' | 'weekly' | 'monthly' | 'database' | 'outofstock';
export type InventoryCategory = 'meat' | 'dairy' | 'uncategorized';
export type StockStatus = 'out' | 'critical' | 'low' | 'ok';
export type WasteReason = 'expired' | 'overcooked' | 'dropped' | 'overordered' | 'customer-return' | 'other';
export type ActivityType = 'count_update' | 'waste' | 'import' | 'manual_add';

// Custom Category Management
export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
  isDefault: boolean;
}

export interface InventoryItem {
  id: number | string;
  name: string;
  category: InventoryCategory | string;
  currentStock: number; // Now supports decimal values when box=true
  minLevel: number; // Also supports decimal values when box=true
  optimalLevel?: number; // Optional for backward compatibility, default to 2x minimum
  unit: string;
  lastUsed: string;
  cost: number;
  ean?: string;
  frequency?: InventoryFrequency;
  databaseId?: number | string; // Link to original database item
  unitPackSize?: number; // How items are packaged (e.g., 12 bottles per box)
  consumptionHistory?: ConsumptionData[]; // Track consumption over time
  orderedStatus?: {
    isOrdered: boolean;
    orderedDate?: Date;
    orderedQuantity?: number;
    expectedDelivery?: Date;
  };
  box?: boolean; // Whether this item is measured in boxes (allows fractional quantities like 0.5, 1.5, etc.)
}

export interface DatabaseItem {
  id: number | string;
  name: string;
  ean?: string;
  unit?: string;
  cost?: number;
  costWithTax?: number;
  type?: InventoryCategory | string; // Allow any string for uncategorized items
  frequency: InventoryFrequency;
  // Assignment tracking
  assignedTo?: InventoryFrequency; // Which frequency it's assigned to (daily/weekly/monthly)
  assignedCategory?: InventoryCategory | string; // Which category it's assigned to
  assignedDate?: string; // When it was assigned
  isAssigned?: boolean; // Whether it's currently assigned to any inventory list
  box?: boolean; // Whether this item is measured in boxes (allows fractional quantities like 0.5, 1.5, etc.)
}

export interface ActivityLogEntry {
  id: number | string;
  type: ActivityType;
  item: string;
  quantity: number;
  unit: string;
  employee: string;
  timestamp: string;
  notes?: string;
  reason?: WasteReason;
}

// Out of Stock / Consumption Tracking Types
export interface ConsumptionData {
  itemId: string;
  date: Date;
  previousStock: number;
  currentStock: number;
  received: number; // New deliveries
  consumed: number; // Calculated: previous + received - current
}

export interface ForecastData {
  itemId: string;
  averageDailyConsumption: number;
  daysRemaining: number;
  recommendedOrderQty: number;
  usualOrderThreshold: number; // % of minimum when usually ordered
  lastOrderDate?: Date;
}

export interface SeasonalPattern {
  month: number;
  coefficient: number; // 1.0 = normal, 2.0 = double consumption
}

export interface HolidayPattern {
  date: string; // "2024-02-14"
  items: {
    itemId: string;
    consumptionMultiplier: number;
    actualConsumption: number;
  }[];
}

export interface HolidayAlert {
  holiday: string;
  daysUntil: number;
  lastYearData: HolidayPattern;
  recommendations: {
    itemId: string;
    itemName: string;
    increasePercent: number;
  }[];
}

// Enhanced InventoryItem with consumption tracking
export interface EnhancedInventoryItem extends InventoryItem {
  minimumLevel: number; // Alias for minLevel for consistency
  optimalLevel: number;
  unitPackSize?: number; // e.g., milk comes in 12L boxes
  consumptionHistory: ConsumptionData[];
  forecast?: ForecastData;
  frequency: InventoryFrequency; // Required for enhanced items
  status?: 'out' | 'critical' | 'low' | 'ok';
  daysRemaining?: number;
  recommendedOrder?: number;
}

// Enhanced Daily Inventory Snapshot for Compliance & Business Requirements
export interface DailyInventorySnapshot {
  // Basic metadata
  date: string; // "YYYY-MM-DD" format
  timestamp: string; // ISO string when snapshot was created
  snapshotId: string; // Unique identifier
  createdBy: string; // Employee who triggered snapshot
  
  // Complete inventory state (IMMUTABLE - never changes after creation)
  inventoryValue: {
    total: number;
    dailyItems: number;
    weeklyItems: number;
    monthlyItems: number;
  };
  
  // Every single item with exact state (PRESERVED from snapshot date)
  items: {
    [itemId: string]: {
      // Item identification
      id: string;
      name: string;
      category: string;
      frequency: InventoryFrequency;
      
      // Stock information (IMMUTABLE - never changes after creation)
      currentStock: number;
      unit: string;
      minimumLevel: number;
      
      // Financial data (PRESERVED from snapshot date)
      unitCost: number; // ⚠️ Price at time of snapshot
      totalValue: number; // currentStock × unitCost
      
      // Operational data
      lastCountDate: string;
      countedBy: string;
      location: string;
      notes: string;
      
      // Quality tracking
      expirationDate?: string;
      lotNumber?: string;
      supplier?: string;
      optimalLevel: number;
    };
  };
  
  // Daily activity summary
  dailyActivity: {
    itemsReceived: {
      [itemId: string]: {
        quantity: number;
        cost: number;
        supplier: string;
        timestamp: string;
      };
    };
    itemsUsed: {
      [itemId: string]: {
        quantity: number;
        purpose: string;
        timestamp: string;
      };
    };
    itemsWasted: {
      [itemId: string]: {
        quantity: number;
        reason: string;
        cost: number;
        timestamp: string;
      };
    };
  };
  
  // Compliance data
  compliance: {
    temperatureLog?: TemperatureReading[];
    inspectionNotes?: string;
    healthDeptVisit?: boolean;
    auditFlags?: string[];
  };
  
  // Employee activity
  employeeActivity: {
    [employeeId: string]: {
      countsPerformed: number;
      itemsUpdated: string[];
      hoursWorked: number;
      notes: string;
    };
  };
}

// Temperature reading for compliance tracking
export interface TemperatureReading {
  timestamp: string;
  location: string; // e.g., "walk-in cooler", "freezer", "prep area"
  temperature: number; // in Fahrenheit
  recordedBy: string;
  withinRange: boolean;
  notes?: string;
}

// Stock Count History Types - NEW Feature
export interface StockCountSnapshot {
  date: string; // YYYY-MM-DD
  frequency: InventoryFrequency;
  timestamp: string; // ISO string when snapshot was created
  totalItems: number;
  totalValue: number;
  itemCounts: {
    [itemId: string]: {
      itemName: string;
      category: string;
      frequency: InventoryFrequency;
      currentStock: number;
      unit: string;
      unitCost: number;
      totalValue: number;
      lastCountDate: string;
      countedBy: string;
      minLevel: number;
      optimalLevel: number;
    };
  };
  summary: {
    dailyItemsCount: number;
    weeklyItemsCount: number;
    monthlyItemsCount: number;
    totalInventoryValue: number;
    outOfStockItems: number;
    criticalStockItems: number;
    lowStockItems: number;
  };
}

export interface StockCountHistoryEntry {
  snapshotId: string;
  date: string;
  frequency: InventoryFrequency;
  snapshot: StockCountSnapshot;
}

// Enhanced types for stock count history views
export interface HistoricalStockData {
  date: string;
  itemId: string;
  itemName: string;
  category: string;
  frequency: InventoryFrequency;
  stockLevel: number;
  unit: string;
  unitCost: number;
  totalValue: number;
  stockStatus: 'out' | 'critical' | 'low' | 'ok';
}

export interface StockCountComparison {
  currentDate: string;
  previousDate: string;
  itemComparisons: {
    [itemId: string]: {
      itemName: string;
      current: number;
      previous: number;
      change: number;
      changePercent: number;
    };
  };
  summaryChanges: {
    totalValueChange: number;
    totalValueChangePercent: number;
    itemsCountChange: number;
    outOfStockChange: number;
  };
}
