// issueReproduction.test.ts  
// Test that demonstrates the specific issue mentioned in the problem statement
import { purchaseItem, getEmployeePurchaseHistory } from './storeFunctions';
import { Employee, StoreItem, DailyDataMap } from './types';
import { getFormattedDate } from './utils';

describe('Issue Reproduction: Store Purchase Persistence', () => {
  test('BEFORE FIX: Purchase data would be lost without immediate save', () => {
    const employee: Employee = {
      id: 1,
      name: 'Test Employee',
      mood: 3,
      lastUpdated: '2024-01-01',
      role: 'Cleaner',
      lastMoodDate: null,
      points: 50
    };

    const storeItem: StoreItem = {
      id: 1,
      name: 'Free Coffee',
      description: 'Get a free coffee',
      cost: 10,
      category: 'food',
      icon: '☕',
      available: true
    };

    const employees = [employee];
    const dailyData: DailyDataMap = {};
    
    let updatedEmployees: Employee[] = [];
    let updatedDailyData: DailyDataMap = {};

    const setEmployees = (updater: (prev: Employee[]) => Employee[]) => {
      updatedEmployees = updater(employees);
    };

    const setDailyData = (updater: (prev: DailyDataMap) => DailyDataMap) => {
      updatedDailyData = updater(dailyData);
    };

    // Simulate the old behavior (no immediate save)
    const success = purchaseItem(
      employee.id,
      storeItem,
      employees,
      setEmployees,
      setDailyData
      // No quickSave parameter - this is how it used to work
    );

    // Verify the purchase succeeds locally
    expect(success).toBe(true);
    expect(updatedEmployees[0].points).toBe(40); // Points deducted
    
    const today = getFormattedDate(new Date());
    expect(updatedDailyData[today].purchases).toHaveLength(1);
    
    // BUT: In the old system, this data would only be saved to Firebase 
    // after a 2-second debounce, and could be lost if user refreshed page
    // or if there was a network issue
    console.log('❌ OLD BEHAVIOR: Purchase data exists locally but might not persist to Firebase immediately');
  });

  test('AFTER FIX: Purchase data is immediately saved to Firebase', async () => {
    const employee: Employee = {
      id: 1,
      name: 'Test Employee',
      mood: 3,
      lastUpdated: '2024-01-01',
      role: 'Cleaner',
      lastMoodDate: null,
      points: 50
    };

    const storeItem: StoreItem = {
      id: 1,
      name: 'Free Coffee',
      description: 'Get a free coffee',
      cost: 10,
      category: 'food',
      icon: '☕',
      available: true
    };

    const employees = [employee];
    const dailyData: DailyDataMap = {};
    
    let updatedEmployees: Employee[] = [];
    let updatedDailyData: DailyDataMap = {};
    let savedEmployees: Employee[] | null = null;
    let savedDailyData: DailyDataMap | null = null;

    const setEmployees = (updater: (prev: Employee[]) => Employee[]) => {
      updatedEmployees = updater(employees);
    };

    const setDailyData = (updater: (prev: DailyDataMap) => DailyDataMap) => {
      updatedDailyData = updater(dailyData);
    };

    // Mock quickSave function that captures saved data
    const quickSave = jest.fn().mockImplementation(async (field: string, data: any) => {
      if (field === 'employees') {
        savedEmployees = data;
      } else if (field === 'dailyData') {
        savedDailyData = data;
      }
      return true; // Simulate successful save
    });

    // Execute purchase with immediate save
    const success = purchaseItem(
      employee.id,
      storeItem,
      employees,
      setEmployees,
      setDailyData,
      quickSave // NEW: immediate save function
    );

    // Verify the purchase succeeds
    expect(success).toBe(true);
    
    // Verify local data is updated
    expect(updatedEmployees[0].points).toBe(40);
    
    const today = getFormattedDate(new Date());
    expect(updatedDailyData[today].purchases).toHaveLength(1);
    expect(updatedDailyData[today].totalPointsSpent).toBe(10);

    // NEW: Verify immediate Firebase saves were triggered
    expect(quickSave).toHaveBeenCalledTimes(2);
    expect(quickSave).toHaveBeenCalledWith('employees', updatedEmployees);
    expect(quickSave).toHaveBeenCalledWith('dailyData', updatedDailyData);
    
    // Verify the saved data matches the local data
    expect(savedEmployees).toEqual(updatedEmployees);
    expect(savedDailyData).toEqual(updatedDailyData);

    // Verify purchase history works correctly after save
    const purchaseHistory = getEmployeePurchaseHistory(employee.id, updatedDailyData);
    expect(purchaseHistory).toHaveLength(1);
    expect(purchaseHistory[0].itemName).toBe(storeItem.name);
    expect(purchaseHistory[0].cost).toBe(storeItem.cost);
    expect(purchaseHistory[0].status).toBe('pending');

    console.log('✅ NEW BEHAVIOR: Purchase data immediately saved to Firebase and purchase history populated');
  });

  test('ISSUE VERIFICATION: Empty purchase history problem is fixed', () => {
    // Simulate the reported issue: "Purchase history shows empty even after successful purchases"
    const employee: Employee = {
      id: 1,
      name: 'Test Employee',
      mood: 3,
      lastUpdated: '2024-01-01',
      role: 'Cleaner',
      lastMoodDate: null,
      points: 100
    };

    const coffee: StoreItem = {
      id: 1,
      name: 'Free Coffee',
      description: 'Get a free coffee',
      cost: 10,
      category: 'food',
      icon: '☕',
      available: true
    };

    const break30min: StoreItem = {
      id: 2,
      name: '30min Break',
      description: 'Extra 30 minute break',
      cost: 25,
      category: 'break',
      icon: '⏰',
      available: true
    };

    const employees = [employee];
    const dailyData: DailyDataMap = {};
    
    let currentEmployees = employees;
    let currentDailyData = dailyData;

    const setEmployees = (updater: (prev: Employee[]) => Employee[]) => {
      currentEmployees = updater(currentEmployees);
    };

    const setDailyData = (updater: (prev: DailyDataMap) => DailyDataMap) => {
      currentDailyData = updater(currentDailyData);
    };

    const mockQuickSave = jest.fn().mockResolvedValue(true);

    // Make first purchase
    const success1 = purchaseItem(
      employee.id,
      coffee,
      currentEmployees,
      setEmployees,
      setDailyData,
      mockQuickSave
    );

    // Make second purchase  
    const success2 = purchaseItem(
      employee.id,
      break30min,
      currentEmployees,
      setEmployees,
      setDailyData,
      mockQuickSave
    );

    expect(success1).toBe(true);
    expect(success2).toBe(true);

    // Verify employee points are correctly deducted
    expect(currentEmployees[0].points).toBe(65); // 100 - 10 - 25

    // Verify purchase history is NOT empty (this was the original bug)
    const purchaseHistory = getEmployeePurchaseHistory(employee.id, currentDailyData);
    expect(purchaseHistory).toHaveLength(2);
    
    // Verify purchase details are correct
    expect(purchaseHistory.find(p => p.itemName === 'Free Coffee')).toBeDefined();
    expect(purchaseHistory.find(p => p.itemName === '30min Break')).toBeDefined();
    
    // Verify total points spent tracking
    const today = getFormattedDate(new Date());
    expect(currentDailyData[today].totalPointsSpent).toBe(35);

    // Verify both purchases and employees data were saved immediately
    expect(mockQuickSave).toHaveBeenCalledTimes(4); // 2 purchases × 2 saves each (employees + dailyData)

    console.log('✅ ISSUE FIXED: Purchase history now correctly shows all purchases after immediate Firebase saves');
  });
});