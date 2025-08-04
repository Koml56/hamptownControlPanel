// ProfessionalSync.test.ts - Comprehensive tests for professional multi-device sync
import { ProfessionalMultiDeviceSync } from '../ProfessionalMultiDeviceSync';
import { EnhancedSyncIntegration } from '../EnhancedSyncIntegration';

describe('Professional Multi-Device Sync', () => {
  let syncService: ProfessionalMultiDeviceSync;
  let integration: EnhancedSyncIntegration;

  beforeEach(() => {
    // Mock Firebase URL
    global.fetch = jest.fn();
    global.EventSource = jest.fn(() => ({
      onopen: null,
      onmessage: null,
      onerror: null,
      close: jest.fn()
    })) as any;

    syncService = new ProfessionalMultiDeviceSync('Test User');
    integration = new EnhancedSyncIntegration('Test User');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with professional grade features', () => {
    const deviceInfo = syncService.getDeviceInfo();
    expect(deviceInfo.user).toBe('Test User');
    expect(deviceInfo.version).toBe('2.0.0');
    expect(deviceInfo.id).toMatch(/^prof_/);
  });

  test('should handle connection with proper error handling', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({})
    });

    await expect(syncService.connect()).resolves.not.toThrow();
  });

  test('should calculate checksums for data integrity', () => {
    const testData = { employees: [{ id: 1, name: 'Test', points: 100 }] };
    const checksum = (syncService as any).calculateChecksum(testData);
    expect(typeof checksum).toBe('string');
    expect(checksum.length).toBeGreaterThan(0);
  });

  test('integration should handle conflict resolution', () => {
    const localEmployees = [{ id: 1, name: 'John', points: 100 }];
    const remoteEmployees = [{ id: 1, name: 'John', points: 150 }];
    
    const resolved = (integration as any).mergeEmployees(localEmployees, remoteEmployees);
    expect(resolved).toBeDefined();
    expect(resolved.length).toBeGreaterThanOrEqual(1);
  });

  test('should provide comprehensive sync metrics', () => {
    const metrics = integration.getPerformanceMetrics();
    expect(metrics).toHaveProperty('avgSyncTime');
    expect(metrics).toHaveProperty('syncSuccessRate');
    expect(metrics).toHaveProperty('conflictRate');
    expect(metrics).toHaveProperty('eventCount');
  });
});