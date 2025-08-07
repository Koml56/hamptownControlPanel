// storeOperationsNew.test.ts
// Test the new store operations with Firebase integration
import { createPurchaseOperation, applyPurchaseOperation, applyEmployeePointsOperation } from './storeOperations';
import { Employee, StoreItem, DailyDataMap } from './types';

// Mock OperationManager to avoid IndexedDB dependency
jest.mock('./OperationManager', () => ({
  OperationManager: class MockOperationManager {
    createOperation(type: string, payload: any, targetField: string) {
      return {
        id: 'mock-op-' + Date.now(),
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

// Mock offline queue
jest.mock('./taskOperations', () => ({
  offlineQueue: {
    enqueue: jest.fn()
  }
}));

describe('Store Operations with Firebase Integration', () => {
  const mockEmployees: Employee[] = [
    {
      id: 1,
      name: 'Test Employee',
      mood: 3,
      lastUpdated: 'Test',
      role: 'Cleaner',
      lastMoodDate: null,
      points: 50
    }
  ];

  const mockStoreItem: StoreItem = {
    id: 1,
    name: 'Test Coffee',
    description: 'A test coffee item',
    cost: 10,
    category: 'food',
    icon: '☕',
    available: true
  };

  const mockDailyData: DailyDataMap = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPurchaseOperation', () => {
    it('should create purchase and employee operations successfully', () => {
      const result = createPurchaseOperation(1, mockStoreItem, mockEmployees);
      
      expect(result).not.toBeNull();
      expect(result!.purchase).toMatchObject({
        employeeId: 1,
        itemId: 1,
        itemName: 'Test Coffee',
        cost: 10,
        status: 'pending'
      });
      expect(result!.purchaseOp.type).toBe('PURCHASE_ITEM');
      expect(result!.employeeOp.type).toBe('UPDATE_EMPLOYEE_POINTS');
    });

    it('should return null for non-existent employee', () => {
      const result = createPurchaseOperation(999, mockStoreItem, mockEmployees);
      expect(result).toBeNull();
    });

    it('should return null for insufficient points', () => {
      const poorEmployee = { ...mockEmployees[0], points: 5 };
      const result = createPurchaseOperation(1, mockStoreItem, [poorEmployee]);
      expect(result).toBeNull();
    });

    it('should return null for unavailable item', () => {
      const unavailableItem = { ...mockStoreItem, available: false };
      const result = createPurchaseOperation(1, unavailableItem, mockEmployees);
      expect(result).toBeNull();
    });
  });

  describe('applyEmployeePointsOperation', () => {
    it('should update employee points correctly', () => {
      const operation = {
        id: 'test-op',
        type: 'UPDATE_EMPLOYEE_POINTS' as const,
        payload: { ...mockEmployees[0], points: 40 },
        targetField: 'employees',
        deviceId: 'test-device',
        timestamp: Date.now(),
        vectorClock: {},
        version: 1
      };

      const result = applyEmployeePointsOperation(mockEmployees, operation);
      
      expect(result).toHaveLength(1);
      expect(result[0].points).toBe(40);
    });
  });

  describe('applyPurchaseOperation', () => {
    it('should add purchase to daily data correctly', () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const purchase = {
        id: Date.now(),
        employeeId: 1,
        itemId: 1,
        itemName: 'Test Coffee',
        cost: 10,
        purchasedAt: '12:00',
        date: todayStr,
        status: 'pending' as const
      };

      const operation = {
        id: 'test-op',
        type: 'PURCHASE_ITEM' as const,
        payload: { purchase, date: todayStr },
        targetField: 'dailyData',
        deviceId: 'test-device',
        timestamp: Date.now(),
        vectorClock: {},
        version: 1
      };

      const result = applyPurchaseOperation(mockDailyData, operation);
      
      expect(result[todayStr]).toBeDefined();
      expect(result[todayStr].purchases).toHaveLength(1);
      expect(result[todayStr].purchases[0]).toMatchObject(purchase);
      expect(result[todayStr].totalPointsSpent).toBe(10);
    });

    it('should handle non-purchase operations gracefully', () => {
      const operation = {
        id: 'test-op',
        type: 'ADD_TASK' as const,
        payload: {},
        targetField: 'dailyData',
        deviceId: 'test-device',
        timestamp: Date.now(),
        vectorClock: {},
        version: 1
      };

      const result = applyPurchaseOperation(mockDailyData, operation);
      expect(result).toBe(mockDailyData);
    });
  });

  describe('Integration Test', () => {
    it('should handle complete purchase flow', () => {
      // Create the operations
      const operationResult = createPurchaseOperation(1, mockStoreItem, mockEmployees);
      expect(operationResult).not.toBeNull();

      const { purchaseOp, employeeOp, purchase } = operationResult!;

      // Apply employee points operation
      const updatedEmployees = applyEmployeePointsOperation(mockEmployees, employeeOp);
      expect(updatedEmployees[0].points).toBe(40); // 50 - 10

      // Apply purchase operation
      const updatedDailyData = applyPurchaseOperation(mockDailyData, purchaseOp);
      const todayStr = purchase.date;
      expect(updatedDailyData[todayStr].purchases).toHaveLength(1);
      expect(updatedDailyData[todayStr].totalPointsSpent).toBe(10);
    });
  });
});