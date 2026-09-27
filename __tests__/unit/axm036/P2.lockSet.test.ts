// AXM-036 P2 — no end-of-level lock frame on debris cells (F2).
//
// Ruling: runLockPhase locks every piece in ctx.machineStatePieces,
// including obstacle pieces (lockPhase.ts:68, pre-fix). Obstacles are
// terrain, not machine pieces that ever animate a lock state, so they
// must be excluded from the locked set passed to setLockedPieces.
//
// Test 1 exercises the real runLockPhase against a mocked ctx (same
// harness shape as chargeLockPhaseAnim.test.ts) and reads the Set
// passed to setPieceAnimState (the setLockedPieces setter).
//
// Test 2 is a source-only scan across src/ (same walker style as
// __tests__/lint/nativeDriverHostUniqueness.test.ts) that guarantees
// no second caller of setLockedPieces can re-lock obstacles by
// bypassing the lockPhase.ts filter.

import * as fs from 'fs';
import * as path from 'path';
import { Animated } from 'react-native';

describe('AXM-036 P2 — lock set excludes obstacles', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('[P2-1] runLockPhase locks source, conveyor, terminal but not obstacle', async () => {
    const { runLockPhase } = require('../../../src/game/engagement/lockPhase');

    const machineStatePieces = [
      { id: 'source-1', type: 'source' },
      { id: 'conveyor-1', type: 'conveyor' },
      { id: 'terminal-1', type: 'terminal' },
      { id: 'obstacle-1', type: 'obstacle' },
      { id: 'obstacle-2', type: 'obstacle' },
    ];

    const setPieceAnimState = jest.fn();

    const ctx: any = {
      setLockRingCenter: jest.fn(),
      setBeamState: jest.fn(),
      setPieceAnimState,
      lockAnim: null,
      lockRingProgressAnim: new Animated.Value(0),
      machineStatePieces,
      wires: [],
    };

    await runLockPhase(ctx, { x: 10, y: 10 });

    expect(setPieceAnimState).toHaveBeenCalled();

    // setLockedPieces(ctx.setPieceAnimState, locked) calls
    // ctx.setPieceAnimState(updaterFn). Invoke the updater against a
    // representative prev state to recover the `locked` Set it wrote.
    const updaterCalls = setPieceAnimState.mock.calls
      .map(([updater]: [(prev: unknown) => any]) =>
        typeof updater === 'function'
          ? updater({ locked: new Set<string>(), gates: new Map(), failColors: new Map() })
          : null,
      )
      .filter((result: any) => result && result.locked instanceof Set);

    expect(updaterCalls.length).toBeGreaterThan(0);
    const locked: Set<string> = updaterCalls[updaterCalls.length - 1].locked;

    expect(locked.has('source-1')).toBe(true);
    expect(locked.has('conveyor-1')).toBe(true);
    expect(locked.has('terminal-1')).toBe(true);
    expect(locked.has('obstacle-1')).toBe(false);
    expect(locked.has('obstacle-2')).toBe(false);
    expect(locked.size).toBe(3);
  });
});

describe('AXM-036 P2 — no second setLockedPieces caller', () => {
  it('[P2-1] setLockedPieces is called only from lockPhase.ts', () => {
    const srcRoot = path.resolve(__dirname, '../../../src');
    const offenders: string[] = [];

    function walk(dir: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;

        const rel = path.relative(srcRoot, full).replace(/\\/g, '/');
        // The definition itself (stateHelpers.ts) is allowed to
        // contain the identifier in its `export function` line.
        if (rel === 'game/engagement/stateHelpers.ts') continue;

        const text = fs.readFileSync(full, 'utf8');
        const callSites = text.match(/setLockedPieces\(/g) ?? [];
        if (callSites.length === 0) continue;

        if (rel !== 'game/engagement/lockPhase.ts') {
          offenders.push(rel);
        }
      }
    }

    walk(srcRoot);

    expect(offenders).toEqual([]);
  });
});
