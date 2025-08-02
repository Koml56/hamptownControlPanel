// index.ts - Enhanced main export file with comprehensive inventory support
// ===================================================================

// ================== CORE TYPES ==================
export * from './types';
export type {
  InventoryItem,
  DatabaseItem,
  ActivityLogEntry,
  InventoryFrequency,
  InventoryCategory,
  WasteReason,
  ActivityType,
  InventoryContextType,
  InventoryTabProps
} from './inventory/types';

// ================== CONFIGURATION ==================
export * from './constants';

// ================== UTILITIES ==================
export * from './utils';
export * from './inventory/utils';

// ================== DEFAULT DATA ==================
export * from './defaultData';

// ================== FIREBASE SERVICES ==================
// Enhanced Firebase service with inventory support
export { FirebaseService } from './firebaseService';

// ================== CUSTOM HOOKS ==================
// Enhanced hooks with inventory Firebase integration
export { useFirebaseData, useAuth, useTaskRealtimeSync } from './hooks';

// Inventory-specific hooks
export { useInventory } from './inventory/InventoryContext';

// ================== BUSINESS LOGIC FUNCTIONS ==================
export * from './moodFunctions';
export * from './taskFunctions';
export * from './adminFunctions';
export * from './storeFunctions';
export * from './migrationUtils';

// NEW: Inventory business logic
export * from './inventory/inventoryFunctions';

// ================== REACT COMPONENTS ==================

// Core Components
export { default as MoodTracker } from './MoodTracker';
export { default as TaskManager } from './TaskManager';
export { default as Store } from './Store';
export { default as AdminPanel } from './AdminPanel';
export { default as DailyReports } from './DailyReports';
export { default as PrepListPrototype } from './PrepListPrototype';

// Enhanced Inventory Components
export { default as RestaurantInventory } from './inventory/RestaurantInventory';
export { InventoryProvider } from './inventory/InventoryContext';

// Inventory Sub-components
export { default as DatabaseView } from './inventory/components/DatabaseView';
export { default as DailyView } from './inventory/components/DailyView';
export { default as WeeklyView } from './inventory/components/WeeklyView';
export { default as MonthlyView } from './inventory/components/MonthlyView';
export { default as ReportsView } from './inventory/components/ReportsView';
export { default as ToastContainer } from './inventory/components/ToastContainer';

// ================== SYNC & OPERATIONS ==================
export { default as SyncStatusIndicator } from './SyncStatusIndicator';
export * from './taskOperations';
export * from './employeeOperations';

// NEW: Inventory sync operations
export * from './inventory/inventoryOperations';

// ================== MAIN APP COMPONENT ==================
// Enhanced EmployeeApp with inventory support
export { default as EmployeeApp } from './EmployeeApp';
export { default } from './EmployeeApp'; // Default export for easier importing

// ================== INVENTORY-SPECIFIC EXPORTS ==================

// Context and Providers
export {
  InventoryProvider,
  useInventory
} from './inventory/InventoryContext';

// Component Categories
export const InventoryComponents = {
  // Main Components
  RestaurantInventory: require('./inventory/RestaurantInventory').default,
  
  // View Components
  DatabaseView: require('./inventory/components/DatabaseView').default,
  DailyView: require('./inventory/components/DailyView').default,
  WeeklyView: require('./inventory/components/WeeklyView').default,
  MonthlyView: require('./inventory/components/MonthlyView').default,
  ReportsView: require('./inventory/components/ReportsView').default,
  
  // UI Components
  ToastContainer: require('./inventory/components/ToastContainer').default,
  
  // Provider
  InventoryProvider: require('./inventory/InventoryContext').InventoryProvider
};

// Inventory Utilities
export const InventoryUtils = {
  generateId: require('./inventory/utils').generateId,
  showToast: require('./inventory/utils').showToast,
  getStockStatus: require('./inventory/utils').getStockStatus,
  formatCurrency: require('./inventory/utils').formatCurrency,
  exportToExcel: require('./inventory/utils').exportToExcel,
  validateEAN: require('./inventory/utils').validateEAN
};

// Firebase Integration Helpers
export const InventoryFirebase = {
  // Enhanced Firebase service methods for inventory
  saveInventoryData: (firebaseService: any) => firebaseService.saveInventoryData,
  saveInventoryFrequency: (firebaseService: any) => firebaseService.saveInventoryFrequency,
  saveDatabaseItems: (firebaseService: any) => firebaseService.saveDatabaseItems,
  saveActivityLog: (firebaseService: any) => firebaseService.saveActivityLog,
  applyInventoryOperation: (firebaseService: any) => firebaseService.applyInventoryOperation,
  
  // Real-time listeners
  onInventoryDataChange: (firebaseService: any) => firebaseService.onInventoryDataChange,
  onDatabaseItemsChange: (firebaseService: any) => firebaseService.onDatabaseItemsChange,
  onInventoryItemsChange: (firebaseService: any) => firebaseService.onInventoryItemsChange,
  onActivityLogChange: (firebaseService: any) => firebaseService.onActivityLogChange
};

// ================== QUICK START GUIDE ==================
/*
QUICK START GUIDE FOR ENHANCED INVENTORY SYSTEM:

1. BASIC SETUP:
```typescript
import { EmployeeApp, InventoryProvider, RestaurantInventory, useFirebaseData } from './employee-app';

// The EmployeeApp now includes inventory tab with Firebase sync
function App() {
  return <EmployeeApp />;
}
```

2. STANDALONE INVENTORY USAGE:
```typescript
import { RestaurantInventory, InventoryProvider } from './employee-app';

function InventoryApp() {
  return (
    <InventoryProvider>
      <RestaurantInventory 
        currentUser={{ id: 1, name: 'John' }}
        connectionStatus="connected"
      />
    </InventoryProvider>
  );
}
```

3. CUSTOM INVENTORY INTEGRATION:
```typescript
import { useInventory, useFirebaseData } from './employee-app';

function CustomComponent() {
  const {
    dailyItems,
    weeklyItems, 
    monthlyItems,
    databaseItems,
    updateItemStock,
    reportWaste,
    assignToCategory
  } = useInventory();
  
  const { 
    connectionStatus,
    saveInventoryData,
    applyInventoryOperation 
  } = useFirebaseData();
  
  // Your custom logic here
}
```

4. FIREBASE CONFIGURATION:
Ensure your FIREBASE_CONFIG in constants.ts is properly set up:
```typescript
export const FIREBASE_CONFIG = {
  databaseURL: 'your-firebase-database-url',
  // ... other config
};
```

5. INVENTORY DATA STRUCTURE:
The system automatically manages:
- dailyItems: InventoryItem[] (daily inventory checks)
- weeklyItems: InventoryItem[] (weekly inventory checks)  
- monthlyItems: InventoryItem[] (monthly inventory checks)
- databaseItems: DatabaseItem[] (master item database)
- activityLog: ActivityLogEntry[] (all inventory activities)

6. REAL-TIME SYNC:
All inventory changes are automatically synced across devices:
- Stock updates
- Item assignments
- Waste reports
- Database changes
- Activity logging

7. MULTI-DEVICE SUPPORT:
The system handles:
- Conflict resolution
- Offline mode
- Automatic sync when reconnected
- Real-time updates across all connected devices

8. FEATURES INCLUDED:
- ✅ Real-time Firebase sync
- ✅ Multi-device conflict resolution
- ✅ Offline mode support
- ✅ Stock level tracking
- ✅ Waste reporting
- ✅ Excel import/export
- ✅ Activity logging
- ✅ Item categorization
- ✅ Automatic assignments
- ✅ Analytics and reports
- ✅ User-friendly notifications
- ✅ Mobile-responsive design
*/

// ================== VERSION INFO ==================
export const INVENTORY_SYSTEM_VERSION = {
  version: '2.0.0',
  features: [
    'Firebase Real-time Sync',
    'Multi-device Support', 
    'Offline Mode',
    'Conflict Resolution',
    'Enhanced UI/UX',
    'Excel Integration',
    'Activity Logging',
    'Stock Management',
    'Waste Tracking',
    'Analytics & Reports'
  ],
  lastUpdated: '2025-01-XX',
  description: 'Enhanced restaurant inventory management system with Firebase integration and real-time multi-device synchronization'
};

// ================== DEVELOPMENT HELPERS ==================
export const DevHelpers = {
  // Debug inventory state
  logInventoryState: () => {
    console.group('🏪 Inventory System State');
    console.log('Components loaded:', Object.keys(InventoryComponents));
    console.log('Utils available:', Object.keys(InventoryUtils));
    console.log('Firebase methods:', Object.keys(InventoryFirebase));
    console.log('Version:', INVENTORY_SYSTEM_VERSION.version);
    console.groupEnd();
  },
  
  // Test Firebase connection
  testFirebaseConnection: async (firebaseService: any) => {
    try {
      console.log('🧪 Testing Firebase connection...');
      const testData = { test: true, timestamp: Date.now() };
      const success = await firebaseService.quickSave('test', testData);
      console.log(success ? '✅ Firebase connected' : '❌ Firebase failed');
      return success;
    } catch (error) {
      console.error('❌ Firebase test failed:', error);
      return false;
    }
  }
};

// ================== ERROR BOUNDARIES ==================
export class InventoryErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('🚨 Inventory System Error:', error, errorInfo);
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Inventory System Error
          </h2>
          <p className="text-red-600 mb-4">
            Something went wrong with the inventory system. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return (this.props as any).children;
  }
}
