// prep-types.ts - FIXED: Corrected quickSave return type to match implementation
export interface PrepItem {
  id: number;
  name: string;
  category: string;
  estimatedTime: string;
  isCustom: boolean;
  hasRecipe: boolean;
  frequency: number; // Days between preparations
  recipe: Recipe | null;
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
  scheduledDate: string; // YYYY-MM-DD format
  priority: Priority;
  timeSlot: string;
  completed: boolean;
  assignedTo: number | null;
  notes: string;
}

export interface PrepSelections {
  [key: string]: { // Format: "YYYY-MM-DD-prepId"
    priority: Priority;
    timeSlot: string;
    selected: boolean;
  };
}

export interface Recipe {
  ingredients: string;
  instructions: string;
}

export interface CurrentUser {
  id: number;
  name: string;
}

export interface TimeSlot {
  id: string;
  name: string;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface PriorityInfo {
  id: Priority;
  name: string;
  color: string;
  icon: string;
}

export type Priority = 'low' | 'medium' | 'high';
export type ConnectionStatus = 'connecting' | 'connected' | 'error';

export interface PrepListPrototypeProps {
  currentUser: CurrentUser;
  connectionStatus: ConnectionStatus;
  // Firebase data from main hooks
  prepItems: PrepItem[];
  scheduledPreps: ScheduledPrep[];
  prepSelections: PrepSelections;
  // Firebase setters from main hooks
  setPrepItems: (updater: (prev: PrepItem[]) => PrepItem[]) => void;
  setScheduledPreps: (updater: (prev: ScheduledPrep[]) => ScheduledPrep[]) => void;
  setPrepSelections: (updater: (prev: PrepSelections) => PrepSelections) => void;
  // Firebase actions - FIXED: Changed return type from Promise<void> to Promise<boolean>
  quickSave: (field: string, data: any) => Promise<boolean>;
  syncOperationImmediate?: (field: string, data: any) => Promise<boolean>;
}
