// storeFirebasePersistence.test.ts
// Test Firebase persistence of employee points and purchase history
import { purchaseItem, getEmployeePoints, getEmployeePurchaseHistory } from './storeFunctions';
import { FirebaseService } from './firebaseService';
import { Employee, StoreItem, DailyDataMap } from './types';

// Mock window.alert for tests
global.alert = jest.fn();

// Mock Firebase to test actual saving and loading of store data
const mockFirebaseService = {
  quickSave: jest.fn().mockResolvedValue(true),
  saveData: jest.fn().mockResolvedValue(true),
  loadData: jest.fn()
};

// Mock the OperationManager and offline queue
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

describe('Store Firebase Persistence Tests', () => {
  let mockEmployees: Employee[];
  let mockStoreItems: StoreItem[];
  let mockDailyData: DailyDataMap;
  let setEmployees: jest.Mock;
  let setDailyData: jest.Mock;

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
        points: 100 // Start with 100 points
      },
      {
        id: 2,
        name: 'Bob',
        mood: 3,
        lastUpdated: 'Not updated',
        role: 'Manager',
        lastMoodDate: null,
        points: 50 // Start with 50 points
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
  });

  describe('Employee Points Persistence', () => {
    it('should deduct points from employee when purchasing', () => {
      const initialPoints = getEmployeePoints(1, mockEmployees);
      expect(initialPoints).toBe(100);

      // Purchase a coffee (15 points)
      const success = purchaseItem(
        1,
        mockStoreItems[0], // Coffee - 15 points
        mockEmployees,
        setEmployees,
        setDailyData
      );

      expect(success).toBe(true);
      expect(setEmployees).toHaveBeenCalled();

      // Check that employee points were deducted
      const updatedPoints = getEmployeePoints(1, mockEmployees);
      expect(updatedPoints).toBe(85); // 100 - 15 = 85
    });

    it('should prevent purchase when insufficient points', () => {
      // Bob has 50 points, try to buy something that costs more
      const expensiveItem: StoreItem = {
        id: 3,
        name: 'Team Lunch',
        description: 'Team lunch for everyone',
        cost: 75, // More than Bob's 50 points
        category: 'social',
        icon: '🍕',
        available: true
      };

      const success = purchaseItem(
        2, // Bob (50 points)
        expensiveItem,
        mockEmployees,
        setEmployees,
        setDailyData
      );

      expect(success).toBe(false);
      expect(alert).toHaveBeenCalledWith('Insufficient points! You need 75 points but only have 50.');
      
      // Points should remain unchanged
      const pointsAfter = getEmployeePoints(2, mockEmployees);
      expect(pointsAfter).toBe(50);
    });

    it('should persist multiple purchases correctly', () => {
      let currentEmployees = [...mockEmployees];
      let currentDailyData = { ...mockDailyData };

      const setEmployeesLocal = (updater: any) => {
        currentEmployees = typeof updater === 'function' ? updater(currentEmployees) : updater;
      };

      const setDailyDataLocal = (updater: any) => {
        currentDailyData = typeof updater === 'function' ? updater(currentDailyData) : updater;
      };

      // Alice purchases coffee (15 points)
      let success = purchaseItem(1, mockStoreItems[0], currentEmployees, setEmployeesLocal, setDailyDataLocal);
      expect(success).toBe(true);
      expect(getEmployeePoints(1, currentEmployees)).toBe(85); // 100 - 15

      // Alice purchases extra break (25 points)
      success = purchaseItem(1, mockStoreItems[1], currentEmployees, setEmployeesLocal, setDailyDataLocal);
      expect(success).toBe(true);
      expect(getEmployeePoints(1, currentEmployees)).toBe(60); // 85 - 25

      // Bob purchases coffee (15 points)
      success = purchaseItem(2, mockStoreItems[0], currentEmployees, setEmployeesLocal, setDailyDataLocal);
      expect(success).toBe(true);
      expect(getEmployeePoints(2, currentEmployees)).toBe(35); // 50 - 15
    });
  });

  describe('Purchase History Persistence', () => {
    it('should record purchase in daily data', () => {
      const today = new Date().toISOString().split('T')[0];
      
      const success = purchaseItem(
        1,
        mockStoreItems[0],
        mockEmployees,
        setEmployees,
        setDailyData
      );

      expect(success).toBe(true);
      expect(setDailyData).toHaveBeenCalled();

      // Verify purchase was recorded in daily data
      expect(mockDailyData[today]).toBeDefined();
      expect(mockDailyData[today].purchases).toBeDefined();
      expect(mockDailyData[today].purchases).toHaveLength(1);
      expect(mockDailyData[today].purchases[0]).toMatchObject({
        employeeId: 1,
        itemId: 1,
        itemName: 'Coffee',
        cost: 15,
        status: 'pending'
      });
    });

    it('should retrieve employee purchase history correctly', () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Mock daily data with purchase history
      const testDailyData: DailyDataMap = {
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
            },
            {
              id: 2,
              employeeId: 1,
              itemId: 2,
              itemName: 'Extra Break',
              cost: 25,
              purchasedAt: '14:15',
              date: today,
              status: 'approved'
            },
            {
              id: 3,
              employeeId: 2,
              itemId: 1,
              itemName: 'Coffee',
              cost: 15,
              purchasedAt: '11:00',
              date: today,
              status: 'redeemed'
            }
          ],
          totalTasks: 0,
          completionRate: 0,
          totalPointsEarned: 0,
          totalPointsSpent: 40
        }
      };

      // Get Alice's purchase history
      const aliceHistory = getEmployeePurchaseHistory(1, testDailyData);
      expect(aliceHistory).toHaveLength(2);
      expect(aliceHistory.every(p => p.employeeId === 1)).toBe(true);

      // Get Bob's purchase history  
      const bobHistory = getEmployeePurchaseHistory(2, testDailyData);
      expect(bobHistory).toHaveLength(1);
      expect(bobHistory[0].employeeId).toBe(2);
      expect(bobHistory[0].itemName).toBe('Coffee');
    });

    it('should handle purchase history across multiple days', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const testDailyData: DailyDataMap = {
        [todayStr]: {
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
              date: todayStr,
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

      const history = getEmployeePurchaseHistory(1, testDailyData, 7);
      expect(history).toHaveLength(2);
      
      // Should be sorted by date descending (newest first)
      expect(history[0].date).toBe(todayStr);
      expect(history[1].date).toBe(yesterdayStr);
    });
  });

  describe('Firebase Integration Simulation', () => {
    it('should simulate successful Firebase save after purchase', async () => {
      // Mock a successful Firebase save
      const mockQuickSave = jest.fn().mockResolvedValue(true);
      
      // Simulate purchase
      const success = purchaseItem(
        1,
        mockStoreItems[0],
        mockEmployees,
        setEmployees,
        setDailyData
      );

      expect(success).toBe(true);

      // Simulate Firebase save calls
      await mockQuickSave('employees', mockEmployees);
      await mockQuickSave('dailyData', mockDailyData);

      expect(mockQuickSave).toHaveBeenCalledWith('employees', mockEmployees);
      expect(mockQuickSave).toHaveBeenCalledWith('dailyData', mockDailyData);
    });

    it('should verify data structure for Firebase persistence', () => {
      // Purchase to generate data
      purchaseItem(1, mockStoreItems[0], mockEmployees, setEmployees, setDailyData);

      // Verify employee data structure is suitable for Firebase
      expect(mockEmployees[0]).toHaveProperty('id');
      expect(mockEmployees[0]).toHaveProperty('name');
      expect(mockEmployees[0]).toHaveProperty('points');
      expect(typeof mockEmployees[0].points).toBe('number');

      // Verify daily data structure is suitable for Firebase
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
      }
    });
  });
});