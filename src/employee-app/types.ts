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
export type ActiveTab = 'mood' | 'tasks' | 'store' | 'admin' | 'reports' | 'prep';

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
}
