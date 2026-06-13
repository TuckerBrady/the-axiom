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

  it('Scanner no longer runs the glow traveler — the crash vector is removed', () => {
    // 2026-06-13: the IN->TRAIL glow arc (runValueTravel) was replaced by the
    // in-place arrival fill, so the null-measurement glow-travel crash vector
    // no longer exists. The Scanner updates tape state directly.
    expect(interactionsSrc).not.toMatch(/runValueTravel/);
    expect(interactionsSrc).toMatch(/setHighlight\(ctx, `trail-\$\{pulse\}`, 'arrived'\)/);
    expect(interactionsSrc).toMatch(/setVisualTrailOverride\(prev =>/);
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
