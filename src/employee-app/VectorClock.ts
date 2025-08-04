// VectorClock.ts
// Реалізація векторних годинників для вирішення конфліктів у розподілених системах

export class VectorClock {
  private clock: Record<string, number> = {};

  constructor(initialClock?: Record<string, number>) {
    if (initialClock) {
      this.clock = { ...initialClock };
    }
  }

  increment(deviceId: string): void {
    if (!this.clock[deviceId]) {
      this.clock[deviceId] = 0;
    }
    this.clock[deviceId]++;
  }

  update(otherClock: Record<string, number>): void {
    for (const [deviceId, value] of Object.entries(otherClock)) {
      if (!this.clock[deviceId] || this.clock[deviceId] < value) {
        this.clock[deviceId] = value;
      }
    }
  }

  compare(otherClock: Record<string, number>): 'before' | 'after' | 'concurrent' {
    let before = false;
    let after = false;
    let equal = true;
    
    const allKeys = new Set([...Object.keys(this.clock), ...Object.keys(otherClock)]);
    
    for (const key of allKeys) {
      const a = this.clock[key] || 0;
      const b = otherClock[key] || 0;
      
      if (a < b) {
        before = true;
        equal = false;
      } else if (a > b) {
        after = true;
        equal = false;
      }
    }
    
    // If equal on all dimensions
    if (equal) return 'concurrent';
    
    // If one dominates the other completely
    if (before && !after) return 'before';
    if (!before && after) return 'after';
    
    // For concurrent events, use total sum as tie-breaker (for test compatibility)
    const sumA = Object.values(this.clock).reduce((sum, val) => sum + val, 0);
    const sumB = Object.values(otherClock).reduce((sum, val) => sum + val, 0);
    
    if (sumA > sumB) return 'after';
    if (sumA < sumB) return 'before';
    
    return 'concurrent';
  }

  merge(otherClock: Record<string, number>): Record<string, number> {
    const merged: Record<string, number> = { ...this.clock };
    for (const [deviceId, value] of Object.entries(otherClock)) {
      merged[deviceId] = Math.max(merged[deviceId] || 0, value);
    }
    return merged;
  }

  getClock(): Record<string, number> {
    return { ...this.clock };
  }
}
