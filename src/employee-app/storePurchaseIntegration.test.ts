// storePurchaseIntegration.test.ts
// Integration test to validate end-to-end purchase flow with Firebase persistence
import { purchaseItem, getEmployeePurchaseHistory } from './storeFunctions';
import { FirebaseService } from './firebaseService';
import { Employee, StoreItem, DailyDataMap } from './types';
import { getFormattedDate } from './utils';

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

describe('Store Purchase Integration', () => {
  let firebaseService: FirebaseService;
  
  beforeEach(() => {
    firebaseService = new FirebaseService();
    jest.clearAllMocks();
  });

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

  test('should complete purchase flow and persist to Firebase', async () => {
    // Mock successful Firebase responses
    const mockResponse = { ok: true, json: () => Promise.resolve({}) };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

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

    // Create quickSave function that uses our Firebase service
    const quickSave = async (field: string, data: any): Promise<boolean> => {
      return await firebaseService.quickSave(field, data);
    };

    // Execute purchase
    const success = purchaseItem(
      mockEmployee.id,
      mockStoreItem,
      employees,
      setEmployees,
      setDailyData,
      quickSave
    );

    expect(success).toBe(true);
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify data updates
    expect(updatedEmployees[0].points).toBe(40);
    
    const today = getFormattedDate(new Date());
    expect(updatedDailyData[today]).toBeDefined();
    expect(updatedDailyData[today].purchases).toHaveLength(1);
    expect(updatedDailyData[today].totalPointsSpent).toBe(10);

    // Verify Firebase was called for both employees and dailyData
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/employees.json'),
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEmployees)
      })
    );

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/dailyData.json'),
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDailyData)
      })
    );

    // Verify purchase history retrieval
    const purchaseHistory = getEmployeePurchaseHistory(mockEmployee.id, updatedDailyData);
    expect(purchaseHistory).toHaveLength(1);
    expect(purchaseHistory[0].itemName).toBe(mockStoreItem.name);
    expect(purchaseHistory[0].cost).toBe(mockStoreItem.cost);
  });

  test('should handle Firebase save failures gracefully', async () => {
    // Mock failed Firebase response
    const mockFailedResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockFailedResponse);

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

    // Create quickSave function that uses our Firebase service
    const quickSave = async (field: string, data: any): Promise<boolean> => {
      return await firebaseService.quickSave(field, data);
    };

    // Execute purchase - should still succeed locally even if Firebase fails
    const success = purchaseItem(
      mockEmployee.id,
      mockStoreItem,
      employees,
      setEmployees,
      setDailyData,
      quickSave
    );

    expect(success).toBe(true);
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify local data is still updated despite Firebase failure
    expect(updatedEmployees[0].points).toBe(40);
    
    const today = getFormattedDate(new Date());
    expect(updatedDailyData[today]).toBeDefined();
    expect(updatedDailyData[today].purchases).toHaveLength(1);

    // Verify Firebase calls were attempted
    expect(global.fetch).toHaveBeenCalled();
  });

  test('should handle multiple purchases in same day', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({}) };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const richEmployee: Employee = { ...mockEmployee, points: 100 };
    const employees = [richEmployee];
    
    const today = getFormattedDate(new Date());
    const existingDailyData: DailyDataMap = {
      [today]: {
        completedTasks: [],
        employeeMoods: [],
        purchases: [{
          id: 999,
          employeeId: richEmployee.id,
          itemId: 2,
          itemName: 'Previous Purchase',
          cost: 5,
          purchasedAt: '10:00',
          date: today,
          status: 'pending'
        }],
        totalTasks: 22,
        completionRate: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 5
      }
    };
    
    let updatedEmployees: Employee[] = [];
    let updatedDailyData: DailyDataMap = existingDailyData;

    const setEmployees = (updater: (prev: Employee[]) => Employee[]) => {
      updatedEmployees = updater(employees);
    };

    const setDailyData = (updater: (prev: DailyDataMap) => DailyDataMap) => {
      updatedDailyData = updater(updatedDailyData);
    };

    const quickSave = async (field: string, data: any): Promise<boolean> => {
      return await firebaseService.quickSave(field, data);
    };

    // Execute second purchase
    const success = purchaseItem(
      richEmployee.id,
      mockStoreItem,
      employees,
      setEmployees,
      setDailyData,
      quickSave
    );

    expect(success).toBe(true);
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify second purchase was added
    expect(updatedDailyData[today].purchases).toHaveLength(2);
    expect(updatedDailyData[today].totalPointsSpent).toBe(15); // 5 + 10
    expect(updatedEmployees[0].points).toBe(90); // 100 - 10

    // Verify purchase history shows both purchases
    const purchaseHistory = getEmployeePurchaseHistory(richEmployee.id, updatedDailyData);
    expect(purchaseHistory).toHaveLength(2);
  });
});