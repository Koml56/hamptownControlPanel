// firebaseService.null-safety.test.ts
// Test for the specific null/undefined data issue that causes Firebase save errors
import { FirebaseService } from './firebaseService';

// Mock Firebase config to avoid actual Firebase calls
jest.mock('./constants', () => ({
  FIREBASE_CONFIG: {
    databaseURL: 'https://test.firebaseio.com'
  }
}));

// Mock Firebase SDK
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn()
}));

jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(),
  ref: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn()
}));

describe('FirebaseService Null Safety', () => {
  let firebaseService: FirebaseService;

  beforeEach(() => {
    firebaseService = new FirebaseService();
  });

  describe('getDataSizeInfo null safety', () => {
    test('handles null data without throwing error', () => {
      // Access the private method using bracket notation
      const getDataSizeInfo = (firebaseService as any).getDataSizeInfo.bind(firebaseService);
      
      // Test with allData that has null fields
      const allDataWithNulls = {
        employees: null,
        tasks: undefined,
        inventoryDailyItems: null
      };

      // These should not throw errors
      expect(() => getDataSizeInfo('employees', allDataWithNulls)).not.toThrow();
      expect(() => getDataSizeInfo('tasks', allDataWithNulls)).not.toThrow();
      expect(() => getDataSizeInfo('inventoryDailyItems', allDataWithNulls)).not.toThrow();
      
      // Check the actual return values
      const employeesResult = getDataSizeInfo('employees', allDataWithNulls);
      expect(employeesResult).toEqual({
        type: 'null',
        sizeBytes: 4
      });

      const tasksResult = getDataSizeInfo('tasks', allDataWithNulls);
      expect(tasksResult).toEqual({
        type: 'null',
        sizeBytes: 4
      });
    });

    test('handles unknown field names without throwing error', () => {
      const getDataSizeInfo = (firebaseService as any).getDataSizeInfo.bind(firebaseService);
      
      const allData = {
        employees: [{ name: 'Test' }]
      };

      // Unknown field should return null from getFieldData and be handled safely
      expect(() => getDataSizeInfo('unknownField', allData)).not.toThrow();
      
      const result = getDataSizeInfo('unknownField', allData);
      expect(result).toEqual({
        type: 'null',
        sizeBytes: 4
      });
    });

    test('still works correctly with valid data', () => {
      const getDataSizeInfo = (firebaseService as any).getDataSizeInfo.bind(firebaseService);
      
      const allData = {
        employees: [{ name: 'Test Employee' }],
        tasks: [{ name: 'Test Task' }],
        completedTasks: new Set([1, 2, 3]),
        taskAssignments: { '1': 'assigned' }
      };

      // Test array data
      const employeesResult = getDataSizeInfo('employees', allData);
      expect(employeesResult.type).toBe('array');
      expect(employeesResult.length).toBe(1);
      expect(employeesResult.sizeBytes).toBeGreaterThan(0);

      // Test completedTasks (Set gets converted to array in getFieldData)
      const completedTasksResult = getDataSizeInfo('completedTasks', allData);
      expect(completedTasksResult.type).toBe('array'); // Set is converted to array
      expect(completedTasksResult.length).toBe(3);
      expect(completedTasksResult.sizeBytes).toBeGreaterThan(0);

      // Test object data
      const assignmentsResult = getDataSizeInfo('taskAssignments', allData);
      expect(assignmentsResult.type).toBe('object');
      expect(assignmentsResult.keys).toBe(1);
      expect(assignmentsResult.sizeBytes).toBeGreaterThan(0);
    });
  });

  describe('getDataSample null safety', () => {
    test('handles null data without throwing error', () => {
      const getDataSample = (firebaseService as any).getDataSample.bind(firebaseService);
      
      const allDataWithNulls = {
        employees: null,
        inventoryActivityLog: undefined
      };

      // These should not throw errors
      expect(() => getDataSample('employees', allDataWithNulls)).not.toThrow();
      expect(() => getDataSample('inventoryActivityLog', allDataWithNulls)).not.toThrow();
      
      // Check the actual return values
      const employeesResult = getDataSample('employees', allDataWithNulls);
      expect(employeesResult).toEqual({
        type: 'null',
        value: null
      });

      const activityLogResult = getDataSample('inventoryActivityLog', allDataWithNulls);
      expect(activityLogResult).toEqual({
        type: 'null',
        value: undefined
      });
    });

    test('handles unknown field names without throwing error', () => {
      const getDataSample = (firebaseService as any).getDataSample.bind(firebaseService);
      
      const allData = {
        employees: [{ name: 'Test' }]
      };

      expect(() => getDataSample('unknownField', allData)).not.toThrow();
      
      const result = getDataSample('unknownField', allData);
      expect(result).toEqual({
        type: 'null',
        value: null
      });
    });
  });

  describe('batchSave with null data', () => {
    test('handles batch save with null fields gracefully', async () => {
      // Mock the fetch to avoid actual network calls
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });

      const allDataWithNulls = {
        employees: null,
        tasks: undefined,
        inventoryDailyItems: [],
        inventoryActivityLog: null
      };

      // This should not throw an error due to null data
      await expect(
        (firebaseService as any).batchSave(['employees', 'tasks', 'inventoryDailyItems', 'inventoryActivityLog'], allDataWithNulls)
      ).resolves.toBe(true);
    });
  });
});