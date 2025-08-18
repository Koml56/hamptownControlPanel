// PrepMultiDeviceSync.test.ts - Test for multi-device prep list sync issue
import { FirebaseService } from './firebaseService';
import { MultiDeviceSyncService } from './multiDeviceSync';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Prep List Multi-Device Sync', () => {
  let firebaseService: FirebaseService;
  let syncServiceA: MultiDeviceSyncService;
  let syncServiceB: MultiDeviceSyncService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    
    firebaseService = new FirebaseService();
    syncServiceA = new MultiDeviceSyncService('DeviceA');
    syncServiceB = new MultiDeviceSyncService('DeviceB');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not drop rapid saves when multiple devices save simultaneously', async () => {
    // Mock successful Firebase responses
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({})
    } as Response);

    const scheduledPreps = [
      { id: 1, name: 'Prep vegetables', completed: false, scheduledDate: '2024-01-01' },
      { id: 2, name: 'Marinate chicken', completed: false, scheduledDate: '2024-01-01' }
    ];

    // Device A toggles prep 1
    const prepsA = scheduledPreps.map(p => p.id === 1 ? { ...p, completed: true } : p);
    
    // Device B toggles prep 2 (almost simultaneously)
    const prepsB = scheduledPreps.map(p => p.id === 2 ? { ...p, completed: true } : p);

    // Both devices save within 2 seconds (rapid saves)
    const savePromiseA = firebaseService.quickSave('scheduledPreps', prepsA);
    const savePromiseB = firebaseService.quickSave('scheduledPreps', prepsB);

    const [resultA, resultB] = await Promise.all([savePromiseA, savePromiseB]);

    // Both saves should succeed (queued, not dropped)
    expect(resultA).toBe(true);
    expect(resultB).toBe(true);
    
    // Wait for debounced saves to execute
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // At least one fetch should have been called (for the final merged save)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/scheduledPreps.json'),
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('should distinguish between own operations and legitimate concurrent updates', async () => {
    const callbacks: Array<(data: any) => void> = [];
    let callbackCallCount = 0;

    // Mock sync callback registration
    syncServiceA.onFieldChange('scheduledPreps', (data) => {
      callbackCallCount++;
      callbacks.forEach(cb => cb(data));
    });

    const testData = [
      { id: 1, name: 'Test prep', completed: true, scheduledDate: '2024-01-01' }
    ];

    // Device A syncs its own data
    await syncServiceA.syncData('scheduledPreps', testData);

    // Simulate Device A receiving its own update back from Firebase
    // This should be filtered out as our own operation
    const processDataUpdate = (syncServiceA as any).processDataUpdate.bind(syncServiceA);
    processDataUpdate({ scheduledPreps: testData });

    // Device A should not process its own update
    expect(callbackCallCount).toBe(0);

    // Simulate a legitimate update from Device B with different device ID
    const deviceBData = [
      { id: 1, name: 'Test prep', completed: false, scheduledDate: '2024-01-01' }
    ];

    // Wait enough time to pass the throttle period
    await new Promise(resolve => setTimeout(resolve, 3100));

    // This should be processed as it's from a different device
    processDataUpdate({ scheduledPreps: deviceBData });

    // This legitimate update should be processed
    expect(callbackCallCount).toBe(1);
  });

  it('should handle verification failures gracefully without immediate state reversion', async () => {
    // Mock Firebase save success but verification failure
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'Test prep', completed: false, scheduledDate: '2024-01-01' } // Different state
        ])
      } as Response);

    const result = await firebaseService.quickSave('scheduledPreps', [
      { id: 1, name: 'Test prep', completed: true, scheduledDate: '2024-01-01' }
    ]);

    // Save should still succeed even if verification shows different state
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});