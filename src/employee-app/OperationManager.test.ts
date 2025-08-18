// OperationManager.test.ts
import { OperationManager, SyncOperation } from './OperationManager';

describe('OperationManager', () => {
  const deviceA = 'devA';
  const deviceB = 'devB';
  let opManagerA: OperationManager;
  let opManagerB: OperationManager;

  beforeEach(() => {
    opManagerA = new OperationManager(deviceA);
    opManagerB = new OperationManager(deviceB);
  });

  it('should create and apply ADD_TASK operation', () => {
    const initial = { tasks: [] };
    const task = { id: 1, task: 'Test', location: '', priority: 'low', estimatedTime: '', points: 1 };
    const op = opManagerA.createOperation('ADD_TASK', task, 'tasks');
    const result = opManagerA.applyOperation(op, initial);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toEqual(task);
  });

  it('should resolve conflicts using vector clocks', () => {
    const task1 = { id: 1, task: 'A', location: '', priority: 'low', estimatedTime: '', points: 1 };
    const task2 = { id: 1, task: 'B', location: '', priority: 'low', estimatedTime: '', points: 1 };
    const op1 = opManagerA.createOperation('ADD_TASK', task1, 'tasks');
    const op2 = opManagerB.createOperation('ADD_TASK', task2, 'tasks');
    // Симулюємо одночасні зміни
    const resolved = opManagerA.resolveConflicts([op1, op2]);
    expect(resolved).toHaveLength(1);
    expect([task1.task, task2.task]).toContain(resolved[0].payload.task);
  });

  it('should rollback ADD_TASK operation', () => {
    const initial = { tasks: [{ id: 1, task: 'Test', location: '', priority: 'low', estimatedTime: '', points: 1 }] };
    const op = opManagerA.createOperation('ADD_TASK', initial.tasks[0], 'tasks');
    const rolledBack = opManagerA.rollbackOperations([op], initial);
    expect(rolledBack.tasks).toHaveLength(0);
  });

  // PREP ITEM TESTS
  it('should create and apply ADD_PREP_ITEM operation', () => {
    const initial = { prepItems: [] };
    const prepItem = { 
      id: 1, 
      name: 'Test Prep', 
      category: 'Vegetables', 
      estimatedTime: '30 min', 
      isCustom: false, 
      hasRecipe: false, 
      frequency: 1, 
      recipe: null 
    };
    const op = opManagerA.createOperation('ADD_PREP_ITEM', prepItem, 'prepItems');
    const result = opManagerA.applyOperation(op, initial);
    expect(result.prepItems).toHaveLength(1);
    expect(result.prepItems[0]).toEqual(prepItem);
  });

  it('should create and apply UPDATE_PREP_ITEM operation', () => {
    const prepItem = { 
      id: 1, 
      name: 'Test Prep', 
      category: 'Vegetables', 
      estimatedTime: '30 min', 
      isCustom: false, 
      hasRecipe: false, 
      frequency: 1, 
      recipe: null 
    };
    const initial = { prepItems: [prepItem] };
    const updatedItem = { ...prepItem, name: 'Updated Prep', estimatedTime: '45 min' };
    const op = opManagerA.createOperation('UPDATE_PREP_ITEM', updatedItem, 'prepItems');
    const result = opManagerA.applyOperation(op, initial);
    expect(result.prepItems).toHaveLength(1);
    expect(result.prepItems[0].name).toBe('Updated Prep');
    expect(result.prepItems[0].estimatedTime).toBe('45 min');
  });

  it('should create and apply DELETE_PREP_ITEM operation', () => {
    const prepItem = { 
      id: 1, 
      name: 'Test Prep', 
      category: 'Vegetables', 
      estimatedTime: '30 min', 
      isCustom: false, 
      hasRecipe: false, 
      frequency: 1, 
      recipe: null 
    };
    const initial = { prepItems: [prepItem] };
    const op = opManagerA.createOperation('DELETE_PREP_ITEM', prepItem, 'prepItems');
    const result = opManagerA.applyOperation(op, initial);
    expect(result.prepItems).toHaveLength(0);
  });

  it('should rollback ADD_PREP_ITEM operation', () => {
    const prepItem = { 
      id: 1, 
      name: 'Test Prep', 
      category: 'Vegetables', 
      estimatedTime: '30 min', 
      isCustom: false, 
      hasRecipe: false, 
      frequency: 1, 
      recipe: null 
    };
    const initial = { prepItems: [prepItem] };
    const op = opManagerA.createOperation('ADD_PREP_ITEM', prepItem, 'prepItems');
    const rolledBack = opManagerA.rollbackOperations([op], initial);
    expect(rolledBack.prepItems).toHaveLength(0);
  });
});
