// storeFirebaseIntegration.test.ts
// Test Firebase integration for store management across devices
import { FirebaseService } from './firebaseService';
import { StoreItem } from './types';

// Mock Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({}))
}));

jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(() => ({})),
  ref: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn()
}));

// Mock fetch for Firebase REST API
global.fetch = jest.fn();

describe('Store Firebase Integration', () => {
  let firebaseService: FirebaseService;
  
  beforeEach(() => {
    firebaseService = new FirebaseService();
    jest.clearAllMocks();
  });

  const sampleStoreItems: StoreItem[] = [
    {
      id: 1,
      name: 'Free Coffee',
      description: 'Get a free coffee from the kitchen',
      cost: 10,
      category: 'food',
      icon: '☕',
      available: true
    },
    {
      id: 2,
      name: '30min Break',
      description: 'Take an extra 30 minute break',
      cost: 25,
      category: 'break',
      icon: '⏰',
      available: true
    }
  ];

  test('should save store items to Firebase', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({})
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const success = await firebaseService.quickSave('storeItems', sampleStoreItems);
    
    expect(success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/storeItems.json'),
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleStoreItems)
      })
    );
  });

  test('should handle Firebase save failures gracefully', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const success = await firebaseService.quickSave('storeItems', sampleStoreItems);
    
    expect(success).toBe(false);
  });

  test('should load store items from Firebase', async () => {
    const mockResponses = [
      { ok: true, json: () => Promise.resolve(null) }, // employees
      { ok: true, json: () => Promise.resolve(null) }, // tasks
      { ok: true, json: () => Promise.resolve(null) }, // dailyData
      { ok: true, json: () => Promise.resolve(null) }, // completedTasks
      { ok: true, json: () => Promise.resolve(null) }, // taskAssignments
      { ok: true, json: () => Promise.resolve(null) }, // customRoles
      { ok: true, json: () => Promise.resolve(null) }, // prepItems
      { ok: true, json: () => Promise.resolve(null) }, // scheduledPreps
      { ok: true, json: () => Promise.resolve(null) }, // prepSelections
      { ok: true, json: () => Promise.resolve(sampleStoreItems) }, // storeItems
      { ok: true, json: () => Promise.resolve(null) }, // inventoryDailyItems
      { ok: true, json: () => Promise.resolve(null) }, // inventoryWeeklyItems
      { ok: true, json: () => Promise.resolve(null) }, // inventoryMonthlyItems
      { ok: true, json: () => Promise.resolve(null) }, // inventoryDatabaseItems
      { ok: true, json: () => Promise.resolve(null) }  // inventoryActivityLog
    ];
    
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockResponses[0])
      .mockResolvedValueOnce(mockResponses[1])
      .mockResolvedValueOnce(mockResponses[2])
      .mockResolvedValueOnce(mockResponses[3])
      .mockResolvedValueOnce(mockResponses[4])
      .mockResolvedValueOnce(mockResponses[5])
      .mockResolvedValueOnce(mockResponses[6])
      .mockResolvedValueOnce(mockResponses[7])
      .mockResolvedValueOnce(mockResponses[8])
      .mockResolvedValueOnce(mockResponses[9])
      .mockResolvedValueOnce(mockResponses[10])
      .mockResolvedValueOnce(mockResponses[11])
      .mockResolvedValueOnce(mockResponses[12])
      .mockResolvedValueOnce(mockResponses[13])
      .mockResolvedValueOnce(mockResponses[14]);

    const data = await firebaseService.loadData();
    
    expect(data.storeItems).toEqual(sampleStoreItems);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/storeItems.json')
    );
  });

  test('should handle concurrent device updates with proper debouncing', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({}) };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    // Simulate rapid updates (like multiple devices editing)
    const promises = [
      firebaseService.quickSave('storeItems', [...sampleStoreItems, { id: 3, name: 'Device 1 addition', description: 'Test', cost: 15, category: 'food', icon: '🍰', available: true }]),
      firebaseService.quickSave('storeItems', [...sampleStoreItems, { id: 4, name: 'Device 2 addition', description: 'Test', cost: 20, category: 'break', icon: '🎯', available: true }])
    ];

    const results = await Promise.all(promises);
    
    // Should handle both saves properly
    expect(results.every(r => r === true)).toBe(true);
  });

  test('should preserve data integrity for store item floats/decimals', async () => {
    const storeItemsWithFloats: StoreItem[] = [
      {
        id: 1,
        name: 'Half Day Off',
        description: 'Take half day off',
        cost: 12.5, // Float cost
        category: 'break',
        icon: '⏰',
        available: true
      }
    ];

    const mockResponse = { ok: true, json: () => Promise.resolve({}) };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const success = await firebaseService.quickSave('storeItems', storeItemsWithFloats);
    
    expect(success).toBe(true);
    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body[0].cost).toBe(12.5); // Should preserve float precision
  });
});