// VectorClock.test.ts
import { VectorClock } from './VectorClock';

describe('VectorClock', () => {
  it('increments and compares clocks', () => {
    const vc1 = new VectorClock();
    const vc2 = new VectorClock();
    vc1.increment('A');
    vc2.increment('B');
    expect(vc1.compare(vc2.getClock())).toBe('concurrent');
    vc1.increment('A');
    expect(vc1.compare(vc2.getClock())).toBe('after');
    vc2.update(vc1.getClock());
    expect(vc2.compare(vc1.getClock())).toBe('after');
  });

  it('merges clocks correctly', () => {
    const vc1 = new VectorClock({ A: 2, B: 1 });
    const vc2 = new VectorClock({ A: 1, B: 3 });
    const merged = vc1.merge(vc2.getClock());
    expect(merged).toEqual({ A: 2, B: 3 });
  });
});
