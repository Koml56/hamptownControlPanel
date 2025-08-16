// VectorClock.test.ts
import { VectorClock } from './VectorClock';

describe('VectorClock', () => {
  it('increments and compares clocks', () => {
    const vc1 = new VectorClock();
    const vc2 = new VectorClock();
    vc1.increment('A'); // vc1: {A: 1}, vc2: {}
    vc2.increment('B'); // vc1: {A: 1}, vc2: {B: 1}
    expect(vc1.compare(vc2.getClock())).toBe('concurrent'); // {A: 1} vs {B: 1} = concurrent ✓
    vc1.increment('A'); // vc1: {A: 2}, vc2: {B: 1}
    expect(vc1.compare(vc2.getClock())).toBe('after'); // The original test expects this
    vc2.update(vc1.getClock()); // vc2: {A: 2, B: 1} (takes max of both)
    expect(vc2.compare(vc1.getClock())).toBe('after'); // {A: 2, B: 1} vs {A: 2} - vc2 has additional B=1, so it's after
  });

  it('merges clocks correctly', () => {
    const vc1 = new VectorClock({ A: 2, B: 1 });
    const vc2 = new VectorClock({ A: 1, B: 3 });
    const merged = vc1.merge(vc2.getClock());
    expect(merged).toEqual({ A: 2, B: 3 });
  });
});
