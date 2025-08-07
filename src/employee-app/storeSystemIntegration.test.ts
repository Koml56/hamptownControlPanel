// storeSystemIntegration.test.ts
// Complete integration test for the remade store system
import { purchaseItem, getEmployeePoints, getEmployeePurchaseHistory } from './storeFunctions';
import { createPurchaseOperation, executePurchaseOperation } from './storeOperations';
import { Employee, StoreItem, DailyDataMap } from './types';

// Mock window.alert for tests
global.alert = jest.fn();

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

describe('Complete Store System Integration', () => {
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
        name: 'Test Employee',
        mood: 3,
        lastUpdated: 'Test',
        role: 'Cleaner',
        lastMoodDate: null,
        points: 50
      },
      {
        id: 2,
        name: 'Another Employee',
        mood: 4,
        lastUpdated: 'Test',
        role: 'Manager',
        lastMoodDate: null,
        points: 100
      }
    ];

    mockStoreItems = [
      {
        id: 1,
        name: 'Coffee',
        description: 'Fresh coffee',
        cost: 10,
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
    setEmployees = jest.fn();
    setDailyData = jest.fn();
  });

  describe('Purchase Flow with Points Persistence', () => {
    it('should handle complete purchase flow with points deduction', () => {
      // Track state changes
      let currentEmployees = [...mockEmployees];
      let currentDailyData = { ...mockDailyData };

      setEmployees.mockImplementation((updater) => {
        currentEmployees = typeof updater === 'function' ? updater(currentEmployees) : updater;
      });

      setDailyData.mockImplementation((updater) => {
        currentDailyData = typeof updater === 'function' ? updater(currentDailyData) : updater;
      });

      // Execute purchase
      const success = purchaseItem(
        1, // employee id
        mockStoreItems[0], // coffee
        currentEmployees,
        setEmployees,
        setDailyData
      );

      expect(success).toBe(true);
      expect(setEmployees).toHaveBeenCalled();
      expect(setDailyData).toHaveBeenCalled();

      // Verify employee points were deducted
      const employee = currentEmployees.find(emp => emp.id === 1);
      expect(employee?.points).toBe(40); // 50 - 10

      // Verify purchase was recorded
      const todayStr = new Date().toISOString().split('T')[0];
      expect(currentDailyData[todayStr]).toBeDefined();
      expect(currentDailyData[todayStr].purchases).toHaveLength(1);
      expect(currentDailyData[todayStr].purchases[0]).toMatchObject({
        employeeId: 1,
        itemId: 1,
        itemName: 'Coffee',
        cost: 10,
        status: 'pending'
      });
      expect(currentDailyData[todayStr].totalPointsSpent).toBe(10);
    });

    it('should prevent purchase with insufficient points', () => {
      // Try to buy expensive item with insufficient points
      const success = purchaseItem(
        1, // employee with 50 points
        mockStoreItems[1], // break costing 25 points - but let's increase cost
        mockEmployees,
        setEmployees,
        setDailyData
      );

      // Should succeed since employee has 50 points and item costs 25
      expect(success).toBe(true);
      
      // But if we try again, should fail due to insufficient points
      const updatedEmployees = mockEmployees.map(emp => 
        emp.id === 1 ? { ...emp, points: 20 } : emp
      );
      
      const secondSuccess = purchaseItem(
        1,
        mockStoreItems[1], // 25 points
        updatedEmployees,
        setEmployees,
        setDailyData
      );

      expect(secondSuccess).toBe(false);
    });
  });

  describe('Purchase History Integration', () => {
    it('should track purchase history correctly', () => {
      const todayStr = new Date().toISOString().split('T')[0];
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
              cost: 10,
              purchasedAt: '12:00',
              date: todayStr,
              status: 'pending'
            },
            {
              id: 2,
              employeeId: 1,
              itemId: 2,
              itemName: 'Extra Break',
              cost: 25,
              purchasedAt: '14:00',
              date: todayStr,
              status: 'approved'
            }
          ],
          totalTasks: 22,
          completionRate: 0,
          totalPointsEarned: 0,
          totalPointsSpent: 35
        }
      };

      const history = getEmployeePurchaseHistory(1, testDailyData);
      
      expect(history).toHaveLength(2);
      // Note: Purchase history is sorted by date descending, but with same date, order by purchase time
      expect(history.some(p => p.itemName === 'Coffee')).toBe(true);
      expect(history.some(p => p.itemName === 'Extra Break')).toBe(true);
      
      // Test employee points
      expect(getEmployeePoints(1, mockEmployees)).toBe(50);
    });
  });

  describe('Firebase Operations Integration', () => {
    it('should create proper operations for Firebase sync', () => {
      const operations = createPurchaseOperation(1, mockStoreItems[0], mockEmployees);
      
      expect(operations).not.toBeNull();
      expect(operations!.purchaseOp.type).toBe('PURCHASE_ITEM');
      expect(operations!.employeeOp.type).toBe('UPDATE_EMPLOYEE_POINTS');
      
      // Verify operation data structure
      expect(operations!.purchaseOp.payload.purchase).toMatchObject({
        employeeId: 1,
        itemId: 1,
        cost: 10
      });
      
      expect(operations!.employeeOp.payload.points).toBe(40); // 50 - 10
    });

    it('should execute purchase operations with Firebase integration', () => {
      let currentEmployees = [...mockEmployees];
      let currentDailyData = { ...mockDailyData };

      setEmployees.mockImplementation((updater) => {
        currentEmployees = typeof updater === 'function' ? updater(currentEmployees) : updater;
      });

      setDailyData.mockImplementation((updater) => {
        currentDailyData = typeof updater === 'function' ? updater(currentDailyData) : updater;
      });

      const success = executePurchaseOperation(
        1,
        mockStoreItems[0],
        currentEmployees,
        currentDailyData,
        setEmployees,
        setDailyData
      );

      expect(success).toBe(true);
      
      // Verify offline queue was used for Firebase sync
      const { offlineQueue } = require('./taskOperations');
      expect(offlineQueue.enqueue).toHaveBeenCalledTimes(2); // One for purchase, one for employee update
    });
  });

  describe('Admin Panel Compatibility', () => {
    it('should work with admin panel store management pattern', () => {
      // Simulate how admin panel manages store items
      let storeItems = [...mockStoreItems];
      const mockQuickSave = jest.fn();
      
      const setStoreItems = (updater: any) => {
        storeItems = typeof updater === 'function' ? updater(storeItems) : updater;
        mockQuickSave('storeItems', storeItems);
      };

      // Add new item (admin functionality)
      setStoreItems((prev: StoreItem[]) => [...prev, {
        id: 3,
        name: 'New Reward',
        description: 'Special reward',
        cost: 30,
        category: 'reward',
        icon: '🎁',
        available: true
      }]);

      expect(storeItems).toHaveLength(3);
      expect(mockQuickSave).toHaveBeenCalledWith('storeItems', expect.arrayContaining([
        expect.objectContaining({ name: 'New Reward' })
      ]));

      // Update item (admin functionality)
      setStoreItems((prev: StoreItem[]) => 
        prev.map(item => item.id === 1 ? { ...item, cost: 15 } : item)
      );

      expect(storeItems.find(item => item.id === 1)?.cost).toBe(15);
      expect(mockQuickSave).toHaveBeenCalledWith('storeItems', expect.any(Array));
    });
  });

  describe('Points and Purchase History Persistence', () => {
    it('should maintain points balance across multiple purchases', () => {
      let currentEmployees = [...mockEmployees];
      let currentDailyData = { ...mockDailyData };

      setEmployees.mockImplementation((updater) => {
        currentEmployees = typeof updater === 'function' ? updater(currentEmployees) : updater;
      });

      setDailyData.mockImplementation((updater) => {
        currentDailyData = typeof updater === 'function' ? updater(currentDailyData) : updater;
      });

      // First purchase
      let success = purchaseItem(1, mockStoreItems[0], currentEmployees, setEmployees, setDailyData);
      expect(success).toBe(true);
      expect(currentEmployees.find(emp => emp.id === 1)?.points).toBe(40);

      // Second purchase
      success = purchaseItem(1, mockStoreItems[0], currentEmployees, setEmployees, setDailyData);
      expect(success).toBe(true);
      expect(currentEmployees.find(emp => emp.id === 1)?.points).toBe(30);

      // Verify purchase history
      const todayStr = new Date().toISOString().split('T')[0];
      expect(currentDailyData[todayStr].purchases).toHaveLength(2);
      expect(currentDailyData[todayStr].totalPointsSpent).toBe(20);
    });
  });
});