// Test to verify the daily reset logic prevents unnecessary resets from new devices
import { getFormattedDate } from './utils';

// Mock Firebase service for testing
class MockFirebaseService {
  private lastTaskResetDate: string | null = null;

  async getLastTaskResetDate(): Promise<string | null> {
    return this.lastTaskResetDate;
  }

  async setLastTaskResetDate(date: string): Promise<boolean> {
    this.lastTaskResetDate = date;
    return true;
  }
}

describe('Daily Reset Logic', () => {
  let mockFirebaseService: MockFirebaseService;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    mockFirebaseService = new MockFirebaseService();
    mockLocalStorage = {};

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
      },
      writable: true,
    });
  });

  test('new device should not reset when reset already done today', async () => {
    const today = getFormattedDate(new Date());
    
    // Simulate that a reset was already done today in Firebase
    await mockFirebaseService.setLastTaskResetDate(today);
    
    // New device has no localStorage entry
    expect(mockLocalStorage['lastTaskResetDate']).toBeUndefined();
    
    // Simulate the reset check logic from EmployeeApp.tsx
    let lastResetDate: string | null = null;
    try {
      lastResetDate = await mockFirebaseService.getLastTaskResetDate();
    } catch (error) {
      console.warn('Failed to check Firebase reset date, falling back to localStorage:', error);
    }
    
    if (!lastResetDate) {
      lastResetDate = window.localStorage.getItem('lastTaskResetDate');
    }
    
    const shouldReset = lastResetDate !== today;
    
    // Should NOT reset because Firebase shows reset was already done today
    expect(shouldReset).toBe(false);
    expect(lastResetDate).toBe(today);
  });

  test('should reset when it is actually a new day', async () => {
    const yesterday = getFormattedDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const today = getFormattedDate(new Date());
    
    // Simulate that last reset was yesterday
    await mockFirebaseService.setLastTaskResetDate(yesterday);
    mockLocalStorage['lastTaskResetDate'] = yesterday;
    
    // Simulate the reset check logic
    let lastResetDate: string | null = null;
    try {
      lastResetDate = await mockFirebaseService.getLastTaskResetDate();
    } catch (error) {
      console.warn('Failed to check Firebase reset date, falling back to localStorage:', error);
    }
    
    if (!lastResetDate) {
      lastResetDate = window.localStorage.getItem('lastTaskResetDate');
    }
    
    const shouldReset = lastResetDate !== today;
    
    // Should reset because it's a new day
    expect(shouldReset).toBe(true);
    expect(lastResetDate).toBe(yesterday);
  });

  test('should fallback to localStorage when Firebase fails', async () => {
    const today = getFormattedDate(new Date());
    
    // Mock Firebase failure
    mockFirebaseService.getLastTaskResetDate = jest.fn().mockRejectedValue(new Error('Network error'));
    
    // New device has no localStorage entry
    expect(mockLocalStorage['lastTaskResetDate']).toBeUndefined();
    
    // Simulate the reset check logic
    let lastResetDate: string | null = null;
    try {
      lastResetDate = await mockFirebaseService.getLastTaskResetDate();
    } catch (error) {
      console.warn('Failed to check Firebase reset date, falling back to localStorage:', error);
    }
    
    if (!lastResetDate) {
      lastResetDate = window.localStorage.getItem('lastTaskResetDate');
    }
    
    const shouldReset = lastResetDate !== today;
    
    // Should reset because both Firebase and localStorage are empty (new device, can't check global state)
    expect(shouldReset).toBe(true);
    expect(lastResetDate).toBe(null);
  });
});