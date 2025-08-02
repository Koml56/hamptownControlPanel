// types.ts - Updated with comprehensive inventory support
import type { InventoryItem, DatabaseItem, ActivityLogEntry, InventoryFrequency, InventoryCategory } from './inventory/types';

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

// ================== NEW: INVENTORY DATA TYPES ==================

// Enhanced inventory data types for Firebase
export interface InventoryData {
  dailyItems: InventoryItem[];
  weeklyItems: InventoryItem[];
  monthlyItems: InventoryItem[];
  databaseItems: DatabaseItem[];
  activityLog: ActivityLogEntry[];
  lastUpdated: string;
  version: number;
}

// Complete app data structure for Firebase
export interface AppData {
  employees: Employee[];
  tasks: Task[];
  dailyData: DailyDataMap;
  completedTasks: number[];
  taskAssignments: TaskAssignments;
  customRoles: string[];
  prepItems: PrepItem[];
  scheduledPreps: ScheduledPrep[];
  prepSelections: PrepSelections;
  storeItems: StoreItem[];
  // NEW: Add inventory data
  inventoryData: InventoryData;
  // Metadata
  lastUpdated: string;
  version: number;
}

// Inventory sync operations for real-time updates
export interface InventorySyncOperation {
  type: 'update_stock' | 'add_item' | 'remove_item' | 'assign_item' | 'unassign_item' | 'report_waste' | 'import_items';
  payload: any;
  frequency?: InventoryFrequency;
  itemId?: number | string;
  timestamp: string;
  userId: string;
  device: string;
}

// Extended sync event types
export type SyncEventType = 
  | 'data_update' 
  | 'device_join' 
  | 'device_leave' 
  | 'conflict_resolution' 
  | 'full_sync'
  | 'inventory_update'
  | 'inventory_conflict';

export interface SyncEvent {
  type: SyncEventType;
  timestamp: number;
  deviceId: string;
  deviceName: string;
  data?: any;
  field?: string;
  description?: string;
  inventoryData?: Partial<InventoryData>;
}

// Enhanced device info with inventory sync capabilities
export interface DeviceInfo {
  id: string;
  name: string;
  lastSeen: number;
  user: string;
  platform: string;
  isActive: boolean;
  browserInfo: string;
  ipAddress?: string;
  inventoryVersion?: number;
  lastInventorySync?: number;
}

// Task sync operation interface (existing)
export interface SyncOperation {
  type: string;
  payload: any;
  timestamp: string;
  userId: string;
  device: string;
}

// Re-export inventory types for convenience
export type {
  InventoryItem,
  DatabaseItem,
  ActivityLogEntry,
  InventoryFrequency,
  InventoryCategory,
  WasteReason,
  ActivityType,
  StockStatus
} from './inventory/types';

// Extended InventoryContextType with Firebase support
export interface InventoryContextType {
  // Data
  dailyItems: InventoryItem[];
  weeklyItems: InventoryItem[];
  monthlyItems: InventoryItem[];
  databaseItems: DatabaseItem[];
  activityLog: ActivityLogEntry[];
  selectedItems: Set<number | string>;
  
  // UI State
  currentTab: InventoryFrequency | 'reports';
  
  // Actions
  setDailyItems: (items: InventoryItem[]) => void;
  setWeeklyItems: (items: InventoryItem[]) => void;
  setMonthlyItems: (items: InventoryItem[]) => void;
  setDatabaseItems: (items: DatabaseItem[]) => void;
  setActivityLog: (log: ActivityLogEntry[]) => void;
  addActivityEntry: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void;
  updateItemStock: (itemId: number | string, newStock: number, frequency: InventoryFrequency, employee: string, notes?: string) => void;
  reportWaste: (itemId: number | string, amount: number, reason: WasteReason, frequency: InventoryFrequency, employee: string, notes?: string) => void;
  importFromExcel: (data: any[]) => void;
  addManualItem: (item: Omit<DatabaseItem, 'id' | 'frequency'>) => void;
  assignToCategory: (itemIds: (number | string)[], frequency: InventoryFrequency, category: InventoryCategory, minLevel: number, initialStock: number) => void;
  unassignFromCategory: (itemId: number | string) => void;
  cleanupDuplicates: () => void;
  deleteItems: (itemIds: (number | string)[]) => void;
  toggleItemSelection: (itemId: number | string) => void;
  clearSelection: () => void;
  switchTab: (tab: InventoryFrequency | 'reports') => void;
  connectionStatus?: ConnectionStatus;
}

export interface InventoryTabProps {
  currentUser: CurrentUser;
  connectionStatus: ConnectionStatus;
}
