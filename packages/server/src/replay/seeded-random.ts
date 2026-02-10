/**
 * Seeded Random Number Generator using Mulberry32 algorithm.
 * Provides deterministic random numbers for replay functionality.
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  getSeed(): number {
    return this.seed;
  }

  reset(seed: number): void {
    this.seed = seed;
  }
}
