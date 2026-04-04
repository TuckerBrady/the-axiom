/**
 * Deterministic pseudo-random number generator (LCG).
 * Same seed = same sequence for every player globally.
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }

  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

/**
 * Convert YYYY-MM-DD to a numeric seed.
 * '2026-04-15' → 20260415
 */
export function dateToSeed(dateString: string): number {
  const parts = dateString.split('-');
  return parseInt(parts[0], 10) * 10000 + parseInt(parts[1], 10) * 100 + parseInt(parts[2], 10);
}
