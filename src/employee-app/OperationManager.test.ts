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
});
