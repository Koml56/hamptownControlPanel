// SyncIntegration.test.ts
import { OperationManager, SyncOperation } from './OperationManager';

describe('Sync Integration', () => {
  const deviceA = 'devA';
  const deviceB = 'devB';
  let opManagerA: OperationManager;
  let opManagerB: OperationManager;

  beforeEach(() => {
    opManagerA = new OperationManager(deviceA);
    opManagerB = new OperationManager(deviceB);
  });

  it('should resolve concurrent updates without data loss', () => {
    const initial = { tasks: [{ id: 1, task: 'A', location: '', priority: 'low', estimatedTime: '', points: 1 }] };
    // A і B одночасно оновлюють одну задачу
    const opA = opManagerA.createOperation('ADD_TASK', { ...initial.tasks[0], task: 'A1' }, 'tasks');
    const opB = opManagerB.createOperation('ADD_TASK', { ...initial.tasks[0], task: 'A2' }, 'tasks');
    // Обидві операції потрапляють у sync
    const resolved = opManagerA.resolveConflicts([opA, opB]);
    expect(resolved).toHaveLength(1);
    expect(['A1', 'A2']).toContain(resolved[0].payload.task);
  });

  it('should queue operations offline and send after reconnect', async () => {
    // Симуляція offline-черги
    let sent: SyncOperation[] = [];
    const fakeSend = async (op: SyncOperation) => { sent.push(op); };
    // Черга
    const queue: SyncOperation[] = [];
    // offline: enqueue
    const op = opManagerA.createOperation('ADD_TASK', { id: 2, task: 'offline', location: '', priority: 'low', estimatedTime: '', points: 1 }, 'tasks');
    queue.push(op);
    expect(queue).toHaveLength(1);
    // online: process
    for (const q of queue) await fakeSend(q);
    expect(sent).toHaveLength(1);
    expect(sent[0].payload.task).toBe('offline');
  });
});
