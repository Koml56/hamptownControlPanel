// Test for inventoryCustomCategories Firebase save issue
import { FirebaseService } from './firebaseService';
import type { CustomCategory } from './types';

// Mock fetch for testing
global.fetch = jest.fn();

describe('FirebaseService inventoryCustomCategories', () => {
  let firebaseService: FirebaseService;
  
  beforeEach(() => {
    firebaseService = new FirebaseService();
    jest.clearAllMocks();
  });

  test('should include inventoryCustomCategories in saveData method', async () => {
    const mockCustomCategories: CustomCategory[] = [
      {
        id: '1',
        name: 'Test Category',
        icon: '📦',
        color: '#FF0000',
        createdAt: '2024-01-01T00:00:00.000Z',
        isDefault: false
      }
    ];

    // Mock successful Firebase responses
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('{}')
    });

    // Test data with inventoryCustomCategories
    const testData = {
      employees: [],
      tasks: [],
      dailyData: {},
      completedTasks: new Set<number>(),
      taskAssignments: {},
      customRoles: [],
      prepItems: [],
      scheduledPreps: [],
      prepSelections: {},
      storeItems: [],
      inventoryDailyItems: [],
      inventoryWeeklyItems: [],
      inventoryMonthlyItems: [],
      inventoryDatabaseItems: [],
      inventoryActivityLog: [],
      inventoryCustomCategories: mockCustomCategories,
      stockCountSnapshots: [],
      dailyInventorySnapshots: []
    };

    // This should not throw an error
    await expect(firebaseService.saveData(testData)).resolves.not.toThrow();
    
    // Verify that inventoryCustomCategories was included in the save calls
    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const inventoryCustomCategoriesCall = fetchCalls.find(call => 
      call[0].includes('/inventoryCustomCategories.json')
    );
    
    expect(inventoryCustomCategoriesCall).toBeDefined();
    expect(inventoryCustomCategoriesCall[1].method).toBe('PUT');
    expect(inventoryCustomCategoriesCall[1].body).toBe(JSON.stringify(mockCustomCategories));
  });

  test('should handle undefined inventoryCustomCategories gracefully', async () => {
    // Mock successful Firebase responses
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('{}')
    });

    const testData = {
      employees: [],
      tasks: [],
      dailyData: {},
      completedTasks: new Set<number>(),
      taskAssignments: {},
      customRoles: [],
      prepItems: [],
      scheduledPreps: [],
      prepSelections: {},
      storeItems: [],
      inventoryDailyItems: [],
      inventoryWeeklyItems: [],
      inventoryMonthlyItems: [],
      inventoryDatabaseItems: [],
      inventoryActivityLog: [],
      inventoryCustomCategories: [], // Empty array
      stockCountSnapshots: [],
      dailyInventorySnapshots: []
    };

    // This should not throw an error even with empty array
    await expect(firebaseService.saveData(testData)).resolves.not.toThrow();
    
    // Verify that inventoryCustomCategories was still processed
    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const inventoryCustomCategoriesCall = fetchCalls.find(call => 
      call[0].includes('/inventoryCustomCategories.json')
    );
    
    expect(inventoryCustomCategoriesCall).toBeDefined();
    expect(inventoryCustomCategoriesCall[1].method).toBe('PUT');
    expect(inventoryCustomCategoriesCall[1].body).toBe(JSON.stringify([]));
  });
});