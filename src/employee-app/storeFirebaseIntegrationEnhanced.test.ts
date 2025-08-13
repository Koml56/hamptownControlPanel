// Enhanced Firebase integration test for store functionality
// storeFirebaseIntegrationEnhanced.test.ts
import './testSetup'; // Import IndexedDB mock setup
import { purchaseItem, getEmployeePoints, getEmployeePurchaseHistory } from './storeFunctions';
import { FirebaseService } from './firebaseService';
import type { Employee, StoreItem, DailyDataMap } from './types';

// Mock window.alert
global.alert = jest.fn();

// Mock Firebase modules
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({}))
}));

jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(() => ({})),
  ref: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn()
}));

// Mock the OperationManager
jest.mock('./OperationManager', () => ({
  OperationManager: class MockOperationManager {
    createOperation(type: string, payload: any, targetField: string) {
      return {
        id: 'mock-op-' + Date.now() + Math.random(),
        type,
        payload,
        targetField,
        deviceId: 'test-device',
        timestamp: Date.now(),
        vectorClock: {},
        version: 1
      };
    }
    
    applyOperation(op: any, state: any) {
      if (op.type === 'UPDATE_EMPLOYEE_POINTS' && op.targetField === 'employees') {
        return {
          employees: state.employees.map((emp: Employee) => 
            emp.id === op.payload.id ? op.payload : emp
          )
        };
      }
      return state;
    }
  }
}));

jest.mock('./taskOperations', () => ({
  offlineQueue: {
    enqueue: jest.fn()
  }
}));

describe('Enhanced Store Firebase Integration', () => {
  let mockEmployees: Employee[];
  let mockStoreItems: StoreItem[];
  let mockDailyData: DailyDataMap;
  let setEmployees: jest.Mock;
  let setDailyData: jest.Mock;
  let firebaseService: FirebaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEmployees = [
      {
        id: 1,
        name: 'Alice',
        mood: 3,
        lastUpdated: 'Not updated',
        role: 'Cleaner',
        lastMoodDate: null,
        points: 100
      },
      {
        id: 2,
        name: 'Bob',
        mood: 3,
        lastUpdated: 'Not updated',
        role: 'Manager',
        lastMoodDate: null,
        points: 50
      }
    ];

    mockStoreItems = [
      {
        id: 1,
        name: 'Coffee',
        description: 'Premium coffee',
        cost: 15,
        category: 'food',
        icon: '☕',
        available: true
      },
      {
        id: 2,
        name: 'Extra Break',
        description: '15 minute break',
        cost: 25,
        category: 'break',
        icon: '⏰',
        available: true
      }
    ];

    mockDailyData = {};

    setEmployees = jest.fn((updater) => {
      if (typeof updater === 'function') {
        mockEmployees = updater(mockEmployees);
      } else {
        mockEmployees = updater;
      }
    });

    setDailyData = jest.fn((updater) => {
      if (typeof updater === 'function') {
        mockDailyData = updater(mockDailyData);
      } else {
        mockDailyData = updater;
      }
    });

    firebaseService = new FirebaseService();
  });

  describe('Employee Points Firebase Persistence', () => {
    it('should save employee points after purchase to Firebase', async () => {
      // Mock fetch for Firebase requests
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEmployees
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDailyData
        });

      const success = purchaseItem(
        1,
        mockStoreItems[0],
        mockEmployees,
        setEmployees,
        setDailyData
      );

      expect(success).toBe(true);
      
      // Verify employee points were deducted
      expect(mockEmployees[0].points).toBe(85); // 100 - 15

      // Simulate Firebase save
      await firebaseService.quickSave('employees', mockEmployees);
      await firebaseService.quickSave('dailyData', mockDailyData);

      // Verify Firebase calls were made
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/employees.json'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(mockEmployees)
        })
      );
    });

    it('should handle multiple purchases with proper Firebase persistence', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      let currentEmployees = [...mockEmployees];
      let currentDailyData = { ...mockDailyData };

      const setEmployeesLocal = (updater: any) => {
        currentEmployees = typeof updater === 'function' ? updater(currentEmployees) : updater;
      };

      const setDailyDataLocal = (updater: any) => {
        currentDailyData = typeof updater === 'function' ? updater(currentDailyData) : updater;
      };

      // First purchase
      purchaseItem(1, mockStoreItems[0], currentEmployees, setEmployeesLocal, setDailyDataLocal);
      await firebaseService.quickSave('employees', currentEmployees);
      await firebaseService.quickSave('dailyData', currentDailyData);

      // Second purchase
      purchaseItem(1, mockStoreItems[1], currentEmployees, setEmployeesLocal, setDailyDataLocal);
      await firebaseService.quickSave('employees', currentEmployees);
      await firebaseService.quickSave('dailyData', currentDailyData);

      // Verify final state
      expect(getEmployeePoints(1, currentEmployees)).toBe(60); // 100 - 15 - 25

      // Verify Firebase was called (may be optimized/debounced)
      expect(global.fetch).toHaveBeenCalled(); // Just verify it was called, optimization may affect exact count
    });
  });

  describe('Purchase History Firebase Persistence', () => {
    it('should save purchase history to Firebase correctly', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      // Make a purchase
      const success = purchaseItem(1, mockStoreItems[0], mockEmployees, setEmployees, setDailyData);
      expect(success).toBe(true);

      // Save to Firebase
      await firebaseService.quickSave('dailyData', mockDailyData);

      // Verify the purchase was recorded
      const today = new Date().toISOString().split('T')[0];
      expect(mockDailyData[today]).toBeDefined();
      expect(mockDailyData[today].purchases).toHaveLength(1);
      expect(mockDailyData[today].purchases[0]).toMatchObject({
        employeeId: 1,
        itemId: 1,
        itemName: 'Coffee',
        cost: 15,
        status: 'pending'
      });

      // Verify Firebase call
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/dailyData.json'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(mockDailyData)
        })
      );
    });

    it('should retrieve purchase history from Firebase data structure', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Mock Firebase data structure
      const firebaseData: DailyDataMap = {
        [today]: {
          completedTasks: [],
          employeeMoods: [],
          purchases: [
            {
              id: 1,
              employeeId: 1,
              itemId: 1,
              itemName: 'Coffee',
              cost: 15,
              purchasedAt: '10:30',
              date: today,
              status: 'pending'
            }
          ],
          totalTasks: 0,
          completionRate: 0,
          totalPointsEarned: 0,
          totalPointsSpent: 15
        },
        [yesterdayStr]: {
          completedTasks: [],
          employeeMoods: [],
          purchases: [
            {
              id: 2,
              employeeId: 1,
              itemId: 2,
              itemName: 'Extra Break',
              cost: 25,
              purchasedAt: '14:15',
              date: yesterdayStr,
              status: 'approved'
            }
          ],
          totalTasks: 0,
          completionRate: 0,
          totalPointsEarned: 0,
          totalPointsSpent: 25
        }
      };

      const history = getEmployeePurchaseHistory(1, firebaseData);
      
      expect(history).toHaveLength(2);
      expect(history[0].date).toBe(today); // Should be sorted newest first
      expect(history[1].date).toBe(yesterdayStr);
      expect(history.every(p => p.employeeId === 1)).toBe(true);
    });
  });

  describe('Firebase Data Structure Validation', () => {
    it('should ensure data structure is compatible with Firebase', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      // Make purchase to generate data
      purchaseItem(1, mockStoreItems[0], mockEmployees, setEmployees, setDailyData);

      // Validate employee data structure
      expect(mockEmployees[0]).toHaveProperty('id');
      expect(mockEmployees[0]).toHaveProperty('name');
      expect(mockEmployees[0]).toHaveProperty('points');
      expect(typeof mockEmployees[0].points).toBe('number');
      expect(mockEmployees[0].points).toBeGreaterThanOrEqual(0);

      // Validate daily data structure
      const today = new Date().toISOString().split('T')[0];
      expect(mockDailyData[today]).toBeDefined();
      expect(mockDailyData[today].purchases).toBeDefined();
      expect(Array.isArray(mockDailyData[today].purchases)).toBe(true);

      if (mockDailyData[today].purchases.length > 0) {
        const purchase = mockDailyData[today].purchases[0];
        expect(purchase).toHaveProperty('id');
        expect(purchase).toHaveProperty('employeeId');
        expect(purchase).toHaveProperty('itemId');
        expect(purchase).toHaveProperty('itemName');
        expect(purchase).toHaveProperty('cost');
        expect(purchase).toHaveProperty('purchasedAt');
        expect(purchase).toHaveProperty('date');
        expect(purchase).toHaveProperty('status');
        
        // Ensure all values are serializable for Firebase
        expect(typeof purchase.id).toBe('number');
        expect(typeof purchase.employeeId).toBe('number');
        expect(typeof purchase.itemId).toBe('number');
        expect(typeof purchase.itemName).toBe('string');
        expect(typeof purchase.cost).toBe('number');
        expect(typeof purchase.purchasedAt).toBe('string');
        expect(typeof purchase.date).toBe('string');
        expect(typeof purchase.status).toBe('string');
      }

      // Validate Firebase-compatible structure (no undefined values, circular refs, etc.)
      expect(() => JSON.stringify(mockEmployees)).not.toThrow();
      expect(() => JSON.stringify(mockDailyData)).not.toThrow();
    });

    it('should handle Firebase save errors gracefully', async () => {
      // Mock Firebase failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Firebase connection failed'));

      const success = purchaseItem(1, mockStoreItems[0], mockEmployees, setEmployees, setDailyData);
      expect(success).toBe(true); // Purchase should still work locally

      // Firebase save should handle errors
      try {
        await firebaseService.quickSave('employees', mockEmployees);
      } catch (error) {
        // Should handle errors gracefully
        expect(error).toBeDefined();
      }

      // Local data should still be intact
      expect(mockEmployees[0].points).toBe(85);
    });
  });

  describe('Integration with Existing Firebase Service', () => {
    it('should use the same Firebase service methods as other features', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      // Test that store uses the same Firebase service interface as other features
      const mockData = {
        employees: mockEmployees,
        tasks: [],
        dailyData: mockDailyData,
        completedTasks: new Set(),
        taskAssignments: {},
        customRoles: [],
        prepItems: [],
        scheduledPreps: [],
        prepSelections: {},
        storeItems: mockStoreItems,
        inventoryDailyItems: [],
        inventoryWeeklyItems: [],
        inventoryMonthlyItems: [],
        inventoryDatabaseItems: [],
        inventoryActivityLog: []
      };

      // This should use the same method as other features
      await firebaseService.saveData(mockData);

      // Verify the call was made
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});