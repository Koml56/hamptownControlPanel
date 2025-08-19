// localStorage-sync.test.ts - Test to reproduce multi-tab sync issue
import { MultiDeviceSyncService } from './multiDeviceSync';

// Mock localStorage for Node.js test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    length: Object.keys(store).length,
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

// Mock window.addEventListener for storage events
const eventListeners: Record<string, Function[]> = {};
const mockAddEventListener = (event: string, callback: Function) => {
  if (!eventListeners[event]) eventListeners[event] = [];
  eventListeners[event].push(callback);
};

const mockRemoveEventListener = (event: string, callback: Function) => {
  if (eventListeners[event]) {
    const index = eventListeners[event].indexOf(callback);
    if (index > -1) eventListeners[event].splice(index, 1);
  }
};

// Fire storage event to simulate cross-tab communication
const fireStorageEvent = (key: string, newValue: string | null, oldValue: string | null = null) => {
  const storageEvent = { key, newValue, oldValue, storageArea: localStorageMock };
  eventListeners['storage']?.forEach(callback => callback(storageEvent));
};

// Set up global mocks
global.localStorage = localStorageMock as any;
global.sessionStorage = localStorageMock as any; // Same mock for sessionStorage
global.navigator = { userAgent: 'Test Environment' } as any;
global.document = {
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
  hidden: false
} as any;
global.window = {
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener
} as any;

describe('LocalStorage Multi-Tab Sync', () => {
  let service1: MultiDeviceSyncService;
  let service2: MultiDeviceSyncService;
  let completedTasks1: Set<number>;
  let completedTasks2: Set<number>;

  beforeEach(() => {
    // Clear localStorage and event listeners before each test
    localStorage.clear();
    Object.keys(eventListeners).forEach(key => {
      eventListeners[key] = [];
    });
    
    // Create two sync services (simulating two tabs)
    service1 = new MultiDeviceSyncService('Tab1-User');
    service2 = new MultiDeviceSyncService('Tab2-User');
    
    // Initialize completed tasks
    completedTasks1 = new Set<number>();
    completedTasks2 = new Set<number>();
    
    // Set up callbacks for completedTasks
    service1.onFieldChange('completedTasks', (data) => {
      if (data instanceof Set) {
        completedTasks1 = data;
      } else if (Array.isArray(data)) {
        completedTasks1 = new Set(data);
      }
      // Update the service with the new state for proper merging
      service1.updateFieldState('completedTasks', completedTasks1);
      console.log('Tab1 completedTasks updated:', Array.from(completedTasks1));
    });
    
    service2.onFieldChange('completedTasks', (data) => {
      if (data instanceof Set) {
        completedTasks2 = data;
      } else if (Array.isArray(data)) {
        completedTasks2 = new Set(data);
      }
      // Update the service with the new state for proper merging
      service2.updateFieldState('completedTasks', completedTasks2);
      console.log('Tab2 completedTasks updated:', Array.from(completedTasks2));
    });
  });

  afterEach(async () => {
    // Clean up services
    if (service1) await service1.disconnect();
    if (service2) await service2.disconnect();
  });

  test('should reproduce the multi-tab sync issue', async () => {
    // Step 1: Connect Tab 1
    await service1.connect();
    
    // Tab 1 completes tasks 1, 2, 3 (23 points total: 5+8+10)
    completedTasks1.add(1);
    completedTasks1.add(2);
    completedTasks1.add(3);
    
    // Update the sync service with current state
    service1.updateFieldState('completedTasks', completedTasks1);
    
    // Sync Tab 1's changes to localStorage
    await service1.syncData('completedTasks', completedTasks1);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for debounced sync
    
    console.log('After Tab1 sync - localStorage:', localStorage.getItem('workVibe_sync_completedTasks'));
    console.log('Tab1 completedTasks:', Array.from(completedTasks1));
    
    // Step 2: Connect Tab 2 (should load existing data)
    await service2.connect();
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
    
    console.log('After Tab2 connect - Tab2 completedTasks:', Array.from(completedTasks2));
    
    // ISSUE: Tab 2 should show 3 completed tasks but likely shows 0
    expect(completedTasks2.size).toBe(3); // This should pass but likely fails
    expect(completedTasks2.has(1)).toBe(true);
    expect(completedTasks2.has(2)).toBe(true);
    expect(completedTasks2.has(3)).toBe(true);
    
    // Step 3: Tab 2 completes task 4  
    const originalTab2Tasks = new Set(completedTasks2);
    originalTab2Tasks.add(4);
    completedTasks2 = originalTab2Tasks;
    
    // Update the sync service with current state
    service2.updateFieldState('completedTasks', completedTasks2);
    
    await service2.syncData('completedTasks', completedTasks2);
    await new Promise(resolve => setTimeout(resolve, 200)); // Wait for cross-tab sync
    
    // Manually fire storage event to simulate Tab 2's change affecting Tab 1
    fireStorageEvent(
      'workVibe_sync_completedTasks', 
      JSON.stringify(Array.from(completedTasks2))
    );
    
    console.log('After Tab2 sync - localStorage:', localStorage.getItem('workVibe_sync_completedTasks'));
    console.log('Final Tab1 completedTasks:', Array.from(completedTasks1));
    console.log('Final Tab2 completedTasks:', Array.from(completedTasks2));
    
    // ISSUE: Both tabs should have all 4 tasks, but likely data was overwritten
    expect(completedTasks1.size).toBe(4); // Should have tasks 1,2,3,4
    expect(completedTasks2.size).toBe(4); // Should have tasks 1,2,3,4
  });
});