// CrossTabOperationManager.test.ts
// Tests for cross-tab operation coordination

import { CrossTabOperationManager } from './CrossTabOperationManager';

// Mock localStorage for Node.js test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    length: 0,
    key: () => null
  };
})();

// Assign localStorage mock to global object
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('CrossTabOperationManager', () => {
  let manager1: CrossTabOperationManager;
  let manager2: CrossTabOperationManager;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Create two managers simulating different tabs
    manager1 = new CrossTabOperationManager('device-1');
    manager2 = new CrossTabOperationManager('device-2');
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
  });

  test('should allow operation from first device', () => {
    const allowed = manager1.shouldAllowOperation(1, 'TOGGLE_TASK', 1000);
    expect(allowed).toBe(true);
  });

  test('should block operation from second device when first is pending', () => {
    // First device starts operation
    const allowed1 = manager1.shouldAllowOperation(1, 'TOGGLE_TASK', 1000);
    expect(allowed1).toBe(true);

    // Second device should be blocked
    const allowed2 = manager2.shouldAllowOperation(1, 'TOGGLE_TASK', 1000);
    expect(allowed2).toBe(false);
  });

  test('should allow operation from second device after first completes', () => {
    // First device starts and completes operation
    const allowed1 = manager1.shouldAllowOperation(1, 'TOGGLE_TASK', 1000);
    expect(allowed1).toBe(true);
    
    manager1.completeOperation(1);

    // Second device should now be allowed
    const allowed2 = manager2.shouldAllowOperation(1, 'TOGGLE_TASK', 1000);
    expect(allowed2).toBe(true);
  });

  test('should allow operations on different tasks simultaneously', () => {
    // First device operates on task 1
    const allowed1 = manager1.shouldAllowOperation(1, 'TOGGLE_TASK', 1000);
    expect(allowed1).toBe(true);

    // Second device should be allowed to operate on task 2
    const allowed2 = manager2.shouldAllowOperation(2, 'TOGGLE_TASK', 1000);
    expect(allowed2).toBe(true);
  });

  test('should report correct status', () => {
    manager1.shouldAllowOperation(1, 'TOGGLE_TASK', 1000);
    manager1.shouldAllowOperation(2, 'ASSIGN_TASK', 1000);

    const status = manager1.getStatus();
    expect(status.deviceId).toBe('device-1');
    expect(status.ownOperations).toBe(2);
    expect(status.pendingCount).toBe(2);
  });

  test('should clean up expired operations', (done) => {
    // Use short expiry for testing
    const allowed = manager1.shouldAllowOperation(1, 'TOGGLE_TASK', 100);
    expect(allowed).toBe(true);

    // After expiry, second device should be allowed
    setTimeout(() => {
      const allowed2 = manager2.shouldAllowOperation(1, 'TOGGLE_TASK', 1000);
      expect(allowed2).toBe(true);
      done();
    }, 150);
  });
});