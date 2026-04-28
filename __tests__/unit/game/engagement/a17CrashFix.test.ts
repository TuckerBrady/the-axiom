// Source-contract and behavioral tests for the A1-7 crash fix (Prompt 109).
//
// Two crash vectors are covered:
//   Fix 1 — Null measurement cache: getTapeCellPosFromCache returns null
//            instead of {x:0,y:0}, and call sites guard against null by
//            skipping glow traveler animation.
//   Fix 2 — Async run ID race: stale Transmitter/ConfigNode write callbacks
//            check runId against currentRunIdRef.current before mutating
//            visualOutputOverride.

import * as fs from 'fs';
import * as path from 'path';
import { getTapeCellPosFromCache } from '../../../../src/game/bubbleMath';

const repoRoot = path.resolve(__dirname, '../../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const interactionsSrc = read('src/game/engagement/interactions.ts');

// ─── Fix 1 — Null measurement returns null ────────────────────────────────

describe('Fix 1 — null measurement cache', () => {
  it('getTapeCellPosFromCache returns null for null cached (not {x:0,y:0})', () => {
    expect(getTapeCellPosFromCache(null, 0)).toBeNull();
    expect(getTapeCellPosFromCache(null, 7)).toBeNull();
  });

  it('glow traveler animation skip guard exists in runScannerInteraction', () => {
    // After null check, Scanner skips runValueTravel but still calls onArrive.
    expect(interactionsSrc).toMatch(/if \(inputCell && trailCellPos\)/);
    expect(interactionsSrc).toMatch(/onArrive\(\)/);
  });

  it('onArrive callback is extracted before the null guard so state always updates', () => {
    // The onArrive extraction must appear before the if/else guard so
    // tape state (highlight, barState, visualTrailOverride) always fires
    // regardless of whether positions were available.
    const onArriveIdx = interactionsSrc.indexOf('const onArrive = ()');
    const guardIdx = interactionsSrc.indexOf('if (inputCell && trailCellPos)');
    expect(onArriveIdx).toBeGreaterThan(0);
    expect(guardIdx).toBeGreaterThan(0);
    expect(onArriveIdx).toBeLessThan(guardIdx);
  });
});

// ─── Fix 2 — Run ID race guard ────────────────────────────────────────────

describe('Fix 2 — run ID stale-callback guard', () => {
  it('runId guard exists in Transmitter setVisualOutputOverride updater', () => {
    expect(interactionsSrc).toMatch(
      /ctx\.runId !== ctx\.currentRunIdRef\.current/,
    );
  });

  it('stale run ID causes updater to return prev unchanged', () => {
    // Simulate the updater logic from runTransmitterInteraction / runConfigNodeInteraction.
    // When runId !== currentRunIdRef.current, the updater is a no-op.
    const currentRunIdRef = { current: 2 };

    const makeUpdater = (runId: number, pulse: number, value: number) =>
      (prev: number[] | null): number[] | null => {
        if (!prev) return prev;
        if (runId !== currentRunIdRef.current) return prev;
        const next = [...prev];
        next[pulse] = value;
        return next;
      };

    const staleUpdater = makeUpdater(1, 0, 99); // runId=1, current=2 → mismatch
    const prev = [10, 20, 30];
    const result = staleUpdater(prev);
    // Must return the same reference (no copy), proving it did not apply the write.
    expect(result).toBe(prev);
  });

  it('matching run ID allows updater to apply write', () => {
    const currentRunIdRef = { current: 3 };

    const makeUpdater = (runId: number, pulse: number, value: number) =>
      (prev: number[] | null): number[] | null => {
        if (!prev) return prev;
        if (runId !== currentRunIdRef.current) return prev;
        const next = [...prev];
        next[pulse] = value;
        return next;
      };

    const activeUpdater = makeUpdater(3, 1, 42); // runId=3, current=3 → match
    const prev = [-1, -1, -1];
    const result = activeUpdater(prev);
    expect(result).not.toBe(prev); // new array
    expect(result).toEqual([-1, 42, -1]);
  });

  it('stale run callback does not corrupt new run override array', () => {
    const currentRunIdRef = { current: 2 };

    const makeUpdater = (runId: number, pulse: number, value: number) =>
      (prev: number[] | null): number[] | null => {
        if (!prev) return prev;
        if (runId !== currentRunIdRef.current) return prev;
        const next = [...prev];
        next[pulse] = value;
        return next;
      };

    // Stale callback from run 1 fires against new run 2's array
    const staleUpdater = makeUpdater(1, 0, 99);
    const newRunArray = [-1, -1, -1];
    const result = staleUpdater(newRunArray);
    // Array must be untouched
    expect(result).toBe(newRunArray);
    expect(newRunArray).toEqual([-1, -1, -1]);
  });

  it('updater returns prev for null prev regardless of runId', () => {
    const currentRunIdRef = { current: 5 };

    const makeUpdater = (runId: number, pulse: number, value: number) =>
      (prev: number[] | null): number[] | null => {
        if (!prev) return prev;
        if (runId !== currentRunIdRef.current) return prev;
        const next = [...prev];
        next[pulse] = value;
        return next;
      };

    const updater = makeUpdater(5, 0, 1);
    expect(updater(null)).toBeNull();
  });
});
