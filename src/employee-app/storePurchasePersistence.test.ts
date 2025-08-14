// storePurchasePersistence.test.ts
// Test to reproduce and validate the purchase persistence issue
import { purchaseItem, getEmployeePurchaseHistory } from './storeFunctions';
import { Employee, StoreItem, DailyDataMap } from './types';
import { getFormattedDate } from './utils';

describe('Store Purchase Persistence', () => {
  const mockEmployee: Employee = {
    id: 1,
    name: 'Test Employee',
    mood: 3,
    lastUpdated: '2024-01-01',
    role: 'Cleaner',
    lastMoodDate: null,
    points: 50
  };

  const mockStoreItem: StoreItem = {
    id: 1,
    name: 'Free Coffee',
    description: 'Get a free coffee',
    cost: 10,
    category: 'food',
    icon: '☕',
    available: true
  };

  test('should update dailyData with purchase immediately', () => {
    const employees = [mockEmployee];
    const dailyData: DailyDataMap = {};
    
    let updatedEmployees: Employee[] = [];
    let updatedDailyData: DailyDataMap = {};

    const setEmployees = (updater: (prev: Employee[]) => Employee[]) => {
      updatedEmployees = updater(employees);
    };

    const setDailyData = (updater: (prev: DailyDataMap) => DailyDataMap) => {
      updatedDailyData = updater(dailyData);
    };

    // Mock quickSave function
    const mockQuickSave = jest.fn().mockResolvedValue(true);

    const success = purchaseItem(
      mockEmployee.id,
      mockStoreItem,
      employees,
      setEmployees,
      setDailyData,
      mockQuickSave
    );

    expect(success).toBe(true);
    
    // Check employee points were deducted
    expect(updatedEmployees[0].points).toBe(40);
    
    // Check purchase was added to dailyData
    const today = getFormattedDate(new Date());
    expect(updatedDailyData[today]).toBeDefined();
    expect(updatedDailyData[today].purchases).toHaveLength(1);
    
    const purchase = updatedDailyData[today].purchases[0];
    expect(purchase.employeeId).toBe(mockEmployee.id);
    expect(purchase.itemId).toBe(mockStoreItem.id);
    expect(purchase.cost).toBe(mockStoreItem.cost);
    expect(purchase.status).toBe('pending');

    // Check that quickSave was called for both employees and dailyData
    expect(mockQuickSave).toHaveBeenCalledTimes(2);
    expect(mockQuickSave).toHaveBeenCalledWith('employees', updatedEmployees);
    expect(mockQuickSave).toHaveBeenCalledWith('dailyData', updatedDailyData);
  });

  test('should retrieve purchase history correctly', () => {
    const today = getFormattedDate(new Date());
    const dailyData: DailyDataMap = {
      [today]: {
        completedTasks: [],
        employeeMoods: [],
        purchases: [{
          id: 123,
          employeeId: mockEmployee.id,
          itemId: mockStoreItem.id,
          itemName: mockStoreItem.name,
          cost: mockStoreItem.cost,
          purchasedAt: '14:30',
          date: today,
          status: 'pending'
        }],
        totalTasks: 22,
        completionRate: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 10
      }
    };

    const history = getEmployeePurchaseHistory(mockEmployee.id, dailyData);
    
    expect(history).toHaveLength(1);
    expect(history[0].employeeId).toBe(mockEmployee.id);
    expect(history[0].itemName).toBe(mockStoreItem.name);
    expect(history[0].cost).toBe(mockStoreItem.cost);
  });

  test('should work without quickSave function (backward compatibility)', () => {
    const employees = [mockEmployee];
    const dailyData: DailyDataMap = {};
    
    let updatedEmployees: Employee[] = [];
    let updatedDailyData: DailyDataMap = {};

    const setEmployees = (updater: (prev: Employee[]) => Employee[]) => {
      updatedEmployees = updater(employees);
    };

    const setDailyData = (updater: (prev: DailyDataMap) => DailyDataMap) => {
      updatedDailyData = updater(dailyData);
    };

    // Test without quickSave parameter
    const success = purchaseItem(
      mockEmployee.id,
      mockStoreItem,
      employees,
      setEmployees,
      setDailyData
    );

    expect(success).toBe(true);
    
    // Check employee points were deducted
    expect(updatedEmployees[0].points).toBe(40);
    
    // Check purchase was added to dailyData
    const today = getFormattedDate(new Date());
    expect(updatedDailyData[today]).toBeDefined();
    expect(updatedDailyData[today].purchases).toHaveLength(1);
  });

  test('should handle insufficient points correctly', () => {
    const poorEmployee: Employee = { ...mockEmployee, points: 5 };
    const employees = [poorEmployee];
    const dailyData: DailyDataMap = {};
    
    let updatedEmployees: Employee[] = [];
    let updatedDailyData: DailyDataMap = {};

    const setEmployees = (updater: (prev: Employee[]) => Employee[]) => {
      updatedEmployees = updater(employees);
    };

    const setDailyData = (updater: (prev: DailyDataMap) => DailyDataMap) => {
      updatedDailyData = updater(dailyData);
    };

    // Mock alert to prevent it from showing during tests
    const originalAlert = global.alert;
    global.alert = jest.fn();

    const success = purchaseItem(
      poorEmployee.id,
      mockStoreItem,
      employees,
      setEmployees,
      setDailyData
    );

    expect(success).toBe(false);
    expect(updatedEmployees).toEqual([]);
    expect(updatedDailyData).toEqual({});
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining('Insufficient points')
    );

    // Restore original alert
    global.alert = originalAlert;
  });

  test('should handle unavailable items correctly', () => {
    const unavailableItem: StoreItem = { ...mockStoreItem, available: false };
    const employees = [mockEmployee];
    const dailyData: DailyDataMap = {};
    
    let updatedEmployees: Employee[] = [];
    let updatedDailyData: DailyDataMap = {};

    const setEmployees = (updater: (prev: Employee[]) => Employee[]) => {
      updatedEmployees = updater(employees);
    };

    const setDailyData = (updater: (prev: DailyDataMap) => DailyDataMap) => {
      updatedDailyData = updater(dailyData);
    };

    // Mock alert to prevent it from showing during tests
    const originalAlert = global.alert;
    global.alert = jest.fn();

    const success = purchaseItem(
      mockEmployee.id,
      unavailableItem,
      employees,
      setEmployees,
      setDailyData
    );

    expect(success).toBe(false);
    expect(updatedEmployees).toEqual([]);
    expect(updatedDailyData).toEqual({});
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining('Insufficient points')
    );

    // Restore original alert
    global.alert = originalAlert;
  });
});