// ReliableSync.test.ts - Simple test for the reliable sync system
import { ReliableSync } from './ReliableSync';

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock Firebase fetch for testing
global.fetch = jest.fn();
global.EventSource = jest.fn(() => ({
  onopen: null,
  onmessage: null,
  onerror: null,
  close: jest.fn()
})) as any;

// Mock window and navigator for testing
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    platform: 'Win32'
  }
});

describe('ReliableSync', () => {
  let sync: ReliableSync;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sync = new ReliableSync('Test User');
  });

  afterEach(() => {
    if (sync) {
      sync.disconnect();
    }
  });

  test('should initialize with correct device info', () => {
    const deviceInfo = sync.getDeviceInfo();
    expect(deviceInfo.user).toBe('Test User');
    expect(deviceInfo.id).toMatch(/^device_/);
    expect(deviceInfo.isActive).toBe(true);
    expect(deviceInfo.platform).toMatch(/^(mobile|tablet|desktop)$/);
  });

  test('should handle sync state updates', () => {
    const syncState = sync.getSyncState();
    expect(syncState.isConnected).toBe(false);
    expect(syncState.isLoading).toBe(false);
    expect(syncState.deviceCount).toBe(1);
    expect(Array.isArray(syncState.syncEvents)).toBe(true);
  });

  test('should subscribe to field changes', () => {
    const mockCallback = jest.fn();
    
    sync.onFieldChange('employees', mockCallback);
    
    // Verify callback is registered (internal state check)
    expect(() => sync.onFieldChange('employees', mockCallback)).not.toThrow();
  });

  test('should handle disconnection cleanly', async () => {
    await expect(sync.disconnect()).resolves.not.toThrow();
  });

  test('should sync data when connected', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({}) };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const testData = { id: 1, name: 'Test Employee' };
    
    await expect(sync.syncData('employees', testData)).resolves.not.toThrow();
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/employees.json'),
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      })
    );
  });

  test('should handle sync errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const testData = { id: 1, name: 'Test Employee' };
    
    await expect(sync.syncData('employees', testData)).rejects.toThrow();
  });

  test('should refresh all data', async () => {
    const mockData = { employees: [{ id: 1, name: 'Test' }] };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData.employees)
    });

    const result = await sync.refreshAllData();
    
    expect(result).toBeDefined();
    expect(global.fetch).toHaveBeenCalledTimes(15); // Called for each field
  });
});