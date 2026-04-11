import { SeededRandom, dateToSeed } from '../../src/game/seededRandom';

describe('SeededRandom', () => {
  it('same seed produces same sequence', () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(42);
    for (let i = 0; i < 10; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('different seeds produce different sequences', () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(99);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() returns values in [0, 1)', () => {
    const rng = new SeededRandom(123);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt returns values in [min, max]', () => {
    const rng = new SeededRandom(55);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextInt(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it('pick returns an element from the array', () => {
    const rng = new SeededRandom(77);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it('shuffle returns all elements', () => {
    const rng = new SeededRandom(88);
    const arr = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle(arr);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('shuffle does not mutate original', () => {
    const rng = new SeededRandom(88);
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    rng.shuffle(arr);
    expect(arr).toEqual(copy);
  });

  it('handles seed <= 0', () => {
    const rng = new SeededRandom(0);
    expect(rng.next()).toBeGreaterThanOrEqual(0);
  });

  it('handles negative seed', () => {
    const rng = new SeededRandom(-10);
    expect(rng.next()).toBeGreaterThanOrEqual(0);
  });
});

describe('dateToSeed', () => {
  it('converts YYYY-MM-DD to numeric seed', () => {
    expect(dateToSeed('2026-04-15')).toBe(20260415);
  });

  it('converts single-digit month/day', () => {
    expect(dateToSeed('2026-01-05')).toBe(20260105);
  });
});
