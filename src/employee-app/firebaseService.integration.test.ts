// Integration test to verify the inventoryCustomCategories save issue is resolved
import { FirebaseService } from './firebaseService';
import type { CustomCategory } from './types';

// Mock fetch to simulate Firebase responses
global.fetch = jest.fn();

describe('FirebaseService inventoryCustomCategories Integration', () => {
  let firebaseService: FirebaseService;
  
  beforeEach(() => {
    firebaseService = new FirebaseService();
    jest.clearAllMocks();
    
    // Mock successful Firebase responses
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('{}')
    });
  });

  test('should reproduce the original bug scenario and verify it is fixed', async () => {
    const mockCustomCategories: CustomCategory[] = [
      {
        id: 'custom-1',
        name: 'Vegetables',
        icon: '🥬',
        color: '#10B981',
        createdAt: '2024-01-01T00:00:00.000Z',
        isDefault: false
      },
      {
        id: 'custom-2',
        name: 'Beverages',
        icon: '🥤',
        color: '#3B82F6',
        createdAt: '2024-01-01T00:00:00.000Z',
        isDefault: false
      }
    ];

    // Simulate the data structure that would come from the hooks
    const completeDataSet = {
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
      inventoryCustomCategories: mockCustomCategories, // This was the missing piece!
      stockCountSnapshots: [],
      dailyInventorySnapshots: [],
      inventoryHistoricalSnapshots: []
    };

    // This call should now succeed without the "Failed fields: Array ['inventoryCustomCategories']" error
    await expect(firebaseService.saveData(completeDataSet)).resolves.not.toThrow();
    
    // Verify that ALL fields, including inventoryCustomCategories, were processed
    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    
    // Should have at least 17 calls (one for each field in the saveData fields array)
    // May have additional calls for critical field verification
    expect(fetchCalls.length).toBeGreaterThanOrEqual(17);
    
    // Specifically verify inventoryCustomCategories was saved
    const inventoryCustomCategoriesCall = fetchCalls.find(call => 
      call[0].includes('/inventoryCustomCategories.json')
    );
    
    expect(inventoryCustomCategoriesCall).toBeDefined();
    expect(inventoryCustomCategoriesCall[1].method).toBe('PUT');
    expect(inventoryCustomCategoriesCall[1].body).toBe(JSON.stringify(mockCustomCategories));
    
    // Verify other inventory fields were also saved correctly
    const inventoryFields = [
      'inventoryDailyItems',
      'inventoryWeeklyItems', 
      'inventoryMonthlyItems',
      'inventoryDatabaseItems',
      'inventoryActivityLog',
      'stockCountSnapshots'
    ];
    
    inventoryFields.forEach(field => {
      const fieldCall = fetchCalls.find(call => call[0].includes(`/${field}.json`));
      expect(fieldCall).toBeDefined();
      expect(fieldCall[1].method).toBe('PUT');
    });
  });

  test('should handle real-world scenario with multiple custom categories', async () => {
    const realWorldCustomCategories: CustomCategory[] = [
      {
        id: 'bakery',
        name: 'Bakery Items',
        icon: '🍞',
        color: '#F59E0B',
        createdAt: '2024-01-15T08:30:00.000Z',
        isDefault: false
      },
      {
        id: 'cleaning',
        name: 'Cleaning Supplies',
        icon: '🧽',
        color: '#6B7280',
        createdAt: '2024-01-20T14:22:00.000Z',
        isDefault: false
      },
      {
        id: 'frozen',
        name: 'Frozen Foods',
        icon: '🧊',
        color: '#3B82F6',
        createdAt: '2024-01-22T10:15:00.000Z',
        isDefault: false
      }
    ];

    const realWorldData = {
      employees: [{ 
        id: 1, 
        name: 'John Doe', 
        role: 'manager',
        mood: 4,
        lastUpdated: '2024-01-22T10:00:00.000Z',
        lastMoodDate: '2024-01-22',
        points: 50
      }],
      tasks: [{ 
        id: 1, 
        task: 'Check inventory', 
        location: 'Storage Room',
        priority: 'medium' as const,
        estimatedTime: '30 min',
        points: 5 
      }],
      dailyData: { 
        '2024-01-22': { 
          completedTasks: [
            {
              taskId: 1,
              employeeId: 1,
              completedAt: '2024-01-22T10:30:00.000Z',
              taskName: 'Check inventory',
              date: '2024-01-22',
              pointsEarned: 5
            }
          ], 
          employeeMoods: [],
          purchases: [],
          totalTasks: 1,
          completionRate: 100,
          totalPointsEarned: 5,
          totalPointsSpent: 0
        } 
      },
      completedTasks: new Set([1]),
      taskAssignments: { 1: 1 },
      customRoles: ['manager', 'staff'],
      prepItems: [],
      scheduledPreps: [],
      prepSelections: {},
      storeItems: [],
      inventoryDailyItems: [
        { id: 1, name: 'Test Item', category: 'bakery', currentStock: 10, minLevel: 5, unit: 'pieces', lastUsed: '2024-01-22', cost: 2.50 }
      ],
      inventoryWeeklyItems: [],
      inventoryMonthlyItems: [],
      inventoryDatabaseItems: [],
      inventoryActivityLog: [],
      inventoryCustomCategories: realWorldCustomCategories,
      stockCountSnapshots: [],
      dailyInventorySnapshots: [],
      inventoryHistoricalSnapshots: []
    };

    await expect(firebaseService.saveData(realWorldData)).resolves.not.toThrow();
    
    // Verify the custom categories were saved with the correct data
    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const customCategoriesCall = fetchCalls.find(call => 
      call[0].includes('/inventoryCustomCategories.json')
    );
    
    expect(customCategoriesCall).toBeDefined();
    const savedData = JSON.parse(customCategoriesCall[1].body);
    expect(savedData).toHaveLength(3);
    expect(savedData[0].name).toBe('Bakery Items');
    expect(savedData[1].name).toBe('Cleaning Supplies');
    expect(savedData[2].name).toBe('Frozen Foods');
  });
});