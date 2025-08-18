// storeManagement.test.ts
// Test store management CRUD operations and Firebase sync
import { OperationManager } from './OperationManager';
import { StoreItem } from './types';

// Mock the offline queue dependency
jest.mock('./taskOperations', () => ({
  offlineQueue: {
    enqueue: jest.fn()
  }
}));

describe('Store Management', () => {
  const sampleStoreItems: StoreItem[] = [
    {
      id: 1,
      name: 'Free Coffee',
      description: 'Get a free coffee from the kitchen',
      cost: 10,
      category: 'food',
      icon: '☕',
      available: true
    },
    {
      id: 2,
      name: '30min Break',
      description: 'Take an extra 30 minute break',
      cost: 25,
      category: 'break',
      icon: '⏰',
      available: true
    }
  ];

  test('should handle store item operations for multi-device sync', () => {
    const opManager = new OperationManager('test-device');
    
    // Test ADD operation
    const newItem = {
      id: 3,
      name: 'Test Item',
      description: 'Test',
      cost: 20,
      category: 'reward' as const,
      icon: '🎁',
      available: true
    };
    
    const addOp = opManager.createOperation('ADD_STORE_ITEM', newItem, 'storeItems');
    const resultAfterAdd = opManager.applyOperation(addOp, { storeItems: sampleStoreItems });
    expect(resultAfterAdd.storeItems).toHaveLength(3);
    expect(resultAfterAdd.storeItems[2]).toEqual(newItem);

    // Test UPDATE operation
    const updatedItem = { ...sampleStoreItems[0], cost: 20 };
    const updateOp = opManager.createOperation('UPDATE_STORE_ITEM', updatedItem, 'storeItems');
    const resultAfterUpdate = opManager.applyOperation(updateOp, { storeItems: sampleStoreItems });
    expect(resultAfterUpdate.storeItems[0].cost).toBe(20);

    // Test DELETE operation
    const deleteOp = opManager.createOperation('DELETE_STORE_ITEM', sampleStoreItems[0], 'storeItems');
    const resultAfterDelete = opManager.applyOperation(deleteOp, { storeItems: sampleStoreItems });
    expect(resultAfterDelete.storeItems).toHaveLength(1);
    expect(resultAfterDelete.storeItems[0].id).toBe(2);
  });

  test('should create valid operation types', () => {
    const opManager = new OperationManager('test-device');
    
    const addOp = opManager.createOperation('ADD_STORE_ITEM', {}, 'storeItems');
    expect(addOp.type).toBe('ADD_STORE_ITEM');
    expect(addOp.targetField).toBe('storeItems');
    expect(addOp.deviceId).toBe('test-device');
    expect(addOp.id).toBeDefined();
    expect(addOp.timestamp).toBeDefined();
    expect(addOp.vectorClock).toBeDefined();
  });

  test('should resolve conflicts between operations', () => {
    const opManager = new OperationManager('test-device');
    
    const op1 = opManager.createOperation('UPDATE_STORE_ITEM', { id: 1, cost: 15 }, 'storeItems');
    const op2 = opManager.createOperation('UPDATE_STORE_ITEM', { id: 1, cost: 20 }, 'storeItems');
    
    const resolved = opManager.resolveConflicts([op1, op2]);
    expect(resolved).toHaveLength(1);
    // Should keep the operation with later timestamp
    expect(resolved[0].payload.cost).toBe(20);
  });
});