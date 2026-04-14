import { PICK_UP_LINES, PLACE_LINES, ENGAGE_LINES } from '../../src/constants/tutorialCopy';

describe('Tutorial copy arrays', () => {
  it('PICK_UP_LINES has exactly 5 entries', () => {
    expect(PICK_UP_LINES).toHaveLength(5);
  });

  it('PLACE_LINES has exactly 5 entries', () => {
    expect(PLACE_LINES).toHaveLength(5);
  });

  it('ENGAGE_LINES has exactly 5 entries', () => {
    expect(ENGAGE_LINES).toHaveLength(5);
  });

  it('all entries are non-empty strings', () => {
    for (const arr of [PICK_UP_LINES, PLACE_LINES, ENGAGE_LINES]) {
      for (const line of arr) {
        expect(typeof line).toBe('string');
        expect(line.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Rotation logic (simulated)', () => {
  it('pick-up rotation wraps at 5', () => {
    let idx = 0;
    const results: string[] = [];
    for (let i = 0; i < 6; i++) {
      results.push(PICK_UP_LINES[idx % PICK_UP_LINES.length]);
      idx++;
    }
    expect(results).toEqual([
      PICK_UP_LINES[0],
      PICK_UP_LINES[1],
      PICK_UP_LINES[2],
      PICK_UP_LINES[3],
      PICK_UP_LINES[4],
      PICK_UP_LINES[0], // wraps
    ]);
  });

  it('place rotation wraps at 5', () => {
    let idx = 0;
    const results: string[] = [];
    for (let i = 0; i < 6; i++) {
      results.push(PLACE_LINES[idx % PLACE_LINES.length]);
      idx++;
    }
    expect(results[5]).toBe(PLACE_LINES[0]);
  });

  it('engage rotation wraps at 5', () => {
    let idx = 0;
    const results: string[] = [];
    for (let i = 0; i < 6; i++) {
      results.push(ENGAGE_LINES[idx % ENGAGE_LINES.length]);
      idx++;
    }
    expect(results[5]).toBe(ENGAGE_LINES[0]);
  });
});
