// localStorage-sync.test.ts - Test to reproduce multi-tab sync issue
import { MultiDeviceSyncService } from './multiDeviceSync';

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
  const storageEvent = { key, newValue, oldValue, storageArea: localStorage };
  eventListeners['storage']?.forEach(callback => callback(storageEvent));
};

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

  test('should sync prepSelections across multiple tabs', async () => {
    let prepSelections1: Record<number, any> = {};
    let prepSelections2: Record<number, any> = {};

    // Set up callbacks for prepSelections
    service1.onFieldChange('prepSelections', (data) => {
      prepSelections1 = data || {};
      service1.updateFieldState('prepSelections', prepSelections1);
      console.log('Tab1 prepSelections updated:', prepSelections1);
    });
    
    service2.onFieldChange('prepSelections', (data) => {
      prepSelections2 = data || {};
      service2.updateFieldState('prepSelections', prepSelections2);
      console.log('Tab2 prepSelections updated:', prepSelections2);
    });

    // Connect both services
    await service1.connect();
    await service2.connect();

    // Tab 1 selects prep items
    prepSelections1 = {
      1: { quantity: 2, priority: 'high', timeSlot: 'morning' },
      2: { quantity: 1, priority: 'medium', timeSlot: 'midday' }
    };
    
    service1.updateFieldState('prepSelections', prepSelections1);
    await service1.syncData('prepSelections', prepSelections1);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Fire storage event for cross-tab sync
    fireStorageEvent(
      'workVibe_sync_prepSelections',
      JSON.stringify(prepSelections1)
    );
    await new Promise(resolve => setTimeout(resolve, 100));

    // Tab 2 should receive the prep selections
    expect(prepSelections2).toEqual(prepSelections1);

    // Tab 2 adds another prep selection
    prepSelections2 = {
      ...prepSelections2,
      3: { quantity: 3, priority: 'low', timeSlot: 'afternoon' }
    };
    
    service2.updateFieldState('prepSelections', prepSelections2);
    await service2.syncData('prepSelections', prepSelections2);

    // Fire storage event back to Tab 1
    fireStorageEvent(
      'workVibe_sync_prepSelections',
      JSON.stringify(prepSelections2)
    );
    await new Promise(resolve => setTimeout(resolve, 100));

    // Both tabs should have all prep selections
    expect(prepSelections1).toEqual(prepSelections2);
    expect(Object.keys(prepSelections1)).toHaveLength(3);
  });

  test('should sync scheduledPreps across multiple tabs', async () => {
    let scheduledPreps1: any[] = [];
    let scheduledPreps2: any[] = [];

    // Set up callbacks for scheduledPreps
    service1.onFieldChange('scheduledPreps', (data) => {
      scheduledPreps1 = Array.isArray(data) ? data : [];
      service1.updateFieldState('scheduledPreps', scheduledPreps1);
      console.log('Tab1 scheduledPreps updated:', scheduledPreps1.length);
    });
    
    service2.onFieldChange('scheduledPreps', (data) => {
      scheduledPreps2 = Array.isArray(data) ? data : [];
      service2.updateFieldState('scheduledPreps', scheduledPreps2);
      console.log('Tab2 scheduledPreps updated:', scheduledPreps2.length);
    });

    await service1.connect();
    await service2.connect();

    // Tab 1 schedules prep items
    scheduledPreps1 = [
      {
        id: 1,
        name: 'Dice Onions',
        scheduledDate: '2024-01-16',
        completed: false,
        priority: 'high',
        timeSlot: 'morning'
      },
      {
        id: 2,
        name: 'Prep Salad Mix',
        scheduledDate: '2024-01-16',
        completed: false,
        priority: 'medium',
        timeSlot: 'midday'
      }
    ];
    
    service1.updateFieldState('scheduledPreps', scheduledPreps1);
    await service1.syncData('scheduledPreps', scheduledPreps1);

    // Fire storage event for cross-tab sync
    fireStorageEvent(
      'workVibe_sync_scheduledPreps',
      JSON.stringify(scheduledPreps1)
    );
    await new Promise(resolve => setTimeout(resolve, 100));

    // Tab 2 should receive the scheduled preps
    expect(scheduledPreps2).toEqual(scheduledPreps1);

    // Tab 2 completes a prep task
    scheduledPreps2 = scheduledPreps2.map(prep => 
      prep.id === 1 ? { ...prep, completed: true } : prep
    );
    
    service2.updateFieldState('scheduledPreps', scheduledPreps2);
    await service2.syncData('scheduledPreps', scheduledPreps2);

    // Fire storage event back to Tab 1
    fireStorageEvent(
      'workVibe_sync_scheduledPreps',
      JSON.stringify(scheduledPreps2)
    );
    await new Promise(resolve => setTimeout(resolve, 100));

    // Both tabs should have the updated scheduled preps
    expect(scheduledPreps1).toEqual(scheduledPreps2);
    expect(scheduledPreps1.find(p => p.id === 1)?.completed).toBe(true);
  });

  test('should handle rapid prep task completion across tabs', async () => {
    let scheduledPreps1: any[] = [];
    let scheduledPreps2: any[] = [];

    service1.onFieldChange('scheduledPreps', (data) => {
      scheduledPreps1 = Array.isArray(data) ? data : [];
      service1.updateFieldState('scheduledPreps', scheduledPreps1);
    });
    
    service2.onFieldChange('scheduledPreps', (data) => {
      scheduledPreps2 = Array.isArray(data) ? data : [];
      service2.updateFieldState('scheduledPreps', scheduledPreps2);
    });

    await service1.connect();
    await service2.connect();

    // Initialize with several prep tasks
    const initialPreps = [
      { id: 1, name: 'Prep A', completed: false },
      { id: 2, name: 'Prep B', completed: false },
      { id: 3, name: 'Prep C', completed: false },
      { id: 4, name: 'Prep D', completed: false }
    ];

    scheduledPreps1 = [...initialPreps];
    service1.updateFieldState('scheduledPreps', scheduledPreps1);
    await service1.syncData('scheduledPreps', scheduledPreps1);

    fireStorageEvent('workVibe_sync_scheduledPreps', JSON.stringify(scheduledPreps1));
    await new Promise(resolve => setTimeout(resolve, 50));

    // Rapid completion from both tabs (simulating race condition)
    // Tab 1 completes tasks 1 and 2
    scheduledPreps1 = scheduledPreps1.map(prep => 
      prep.id <= 2 ? { ...prep, completed: true } : prep
    );
    
    // Tab 2 completes tasks 2 and 3 (overlapping with Tab 1)
    scheduledPreps2 = scheduledPreps2.map(prep => 
      prep.id === 2 || prep.id === 3 ? { ...prep, completed: true } : prep
    );

    // Both sync simultaneously
    await Promise.all([
      service1.syncData('scheduledPreps', scheduledPreps1),
      service2.syncData('scheduledPreps', scheduledPreps2)
    ]);

    // Final state should have tasks 1, 2, and 3 completed
    const expectedCompletedIds = [1, 2, 3];
    
    // Check that both tabs eventually converge to the same state
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const tab1CompletedIds = scheduledPreps1.filter(p => p.completed).map(p => p.id).sort();
    const tab2CompletedIds = scheduledPreps2.filter(p => p.completed).map(p => p.id).sort();
    
    // Both tabs should have the same completed tasks (conflict resolution)
    expect(tab1CompletedIds).toEqual(tab2CompletedIds);
    
    // Should include all completed tasks from both tabs
    expectedCompletedIds.forEach(id => {
      expect(tab1CompletedIds).toContain(id);
    });
  });
});