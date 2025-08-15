// Test for the specific JSON.stringify error that causes Firebase save failures
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

describe('FirebaseService JSON.stringify Error Handling', () => {
  let firebaseService: FirebaseService;

  beforeEach(() => {
    firebaseService = new FirebaseService();
  });

  describe('getDataSizeInfo JSON.stringify error handling', () => {
    test('handles circular reference data without throwing error', () => {
      const getDataSizeInfo = (firebaseService as any).getDataSizeInfo.bind(firebaseService);
      
      // Create data with circular reference that will cause JSON.stringify to fail
      const circularData: any = { name: 'test' };
      circularData.self = circularData;
      
      const allDataWithCircular = {
        employees: [circularData],
        tasks: circularData
      };

      // These should not throw errors even with circular references
      expect(() => getDataSizeInfo('employees', allDataWithCircular)).not.toThrow();
      expect(() => getDataSizeInfo('tasks', allDataWithCircular)).not.toThrow();
      
      // Should return error info instead of throwing
      const employeesResult = getDataSizeInfo('employees', allDataWithCircular);
      expect(employeesResult).toHaveProperty('type');
      expect(employeesResult).toHaveProperty('sizeBytes');
    });

    test('handles non-serializable data (functions, symbols) without throwing error', () => {
      const getDataSizeInfo = (firebaseService as any).getDataSizeInfo.bind(firebaseService);
      
      // Create data with non-serializable values
      const nonSerializableData = {
        func: function() { return 'test'; },
        sym: Symbol('test'),
        undef: undefined
      };
      
      const allDataWithNonSerializable = {
        employees: [nonSerializableData],
        tasks: nonSerializableData
      };

      // These should not throw errors even with non-serializable data
      expect(() => getDataSizeInfo('employees', allDataWithNonSerializable)).not.toThrow();
      expect(() => getDataSizeInfo('tasks', allDataWithNonSerializable)).not.toThrow();
      
      // Should return error info instead of throwing
      const employeesResult = getDataSizeInfo('employees', allDataWithNonSerializable);
      expect(employeesResult).toHaveProperty('type');
      expect(employeesResult).toHaveProperty('sizeBytes');
    });

    test('handles BigInt values without throwing error', () => {
      const getDataSizeInfo = (firebaseService as any).getDataSizeInfo.bind(firebaseService);
      
      // BigInt is not serializable with JSON.stringify by default
      const bigIntData = {
        bigNumber: BigInt(12345)
      };
      
      const allDataWithBigInt = {
        employees: [bigIntData]
      };

      // This should not throw an error
      expect(() => getDataSizeInfo('employees', allDataWithBigInt)).not.toThrow();
      
      const result = getDataSizeInfo('employees', allDataWithBigInt);
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('sizeBytes');
    });
  });

  describe('getDataSample JSON.stringify error handling', () => {
    test('handles circular reference data without throwing error', () => {
      const getDataSample = (firebaseService as any).getDataSample.bind(firebaseService);
      
      // Create data with circular reference
      const circularData: any = { name: 'test' };
      circularData.self = circularData;
      
      const allDataWithCircular = {
        employees: [circularData]
      };

      // This should not throw an error
      expect(() => getDataSample('employees', allDataWithCircular)).not.toThrow();
      
      const result = getDataSample('employees', allDataWithCircular);
      expect(result).toHaveProperty('totalLength');
      expect(result).toHaveProperty('sample');
    });
  });

  describe('batchSave error handling with problematic data', () => {
    test('batch save handles non-serializable data gracefully without crashing', async () => {
      // Mock fetch to avoid actual network calls
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });

      // Create data that would cause JSON.stringify issues in logging
      const circularData: any = { name: 'test' };
      circularData.self = circularData;
      
      const allDataWithProblematicData = {
        employees: [circularData],
        tasks: [{ func: function() { return 'test'; } }],
        inventoryDailyItems: [{ bigNum: BigInt(123) }]
      };

      // The batch save should complete without throwing errors, but will return false due to failed saves
      const result = await (firebaseService as any).batchSave(['employees', 'tasks', 'inventoryDailyItems'], allDataWithProblematicData);
      
      // Result should be false because some fields can't be serialized, but it should not throw an error
      expect(result).toBe(false);
    });
  });
});