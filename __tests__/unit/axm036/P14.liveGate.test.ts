// AXM-036 P14 — evaluateLiveGate (contract clause P14-1). Pure predicate: a
// non-blank expected cell must both match the produced tape AND have reached
// the Terminal on its pulse. BLANK cells are exempt from the delivery check
// (a legitimately blocked pulse produces no output and never fires the
// Terminal — SE-TM-002).

import { evaluateLiveGate } from '../../../src/game/spec/liveGate';
import { BLANK } from '../../../src/game/types';

describe('evaluateLiveGate', () => {
  test('[P14-1] a matching tape with every non-blank pulse delivered passes', () => {
    const expected = [1, 1, BLANK, 1];
    const output = [1, 1, BLANK, 1];
    const reachedPerPulse = [true, true, false, true];

    const result = evaluateLiveGate(expected, output, reachedPerPulse);

    expect(result).toEqual({ tapeMatches: true, undelivered: [], passed: true });
  });

  test('[P14-1] a matching tape with an undelivered non-blank pulse fails and lists the index', () => {
    const expected = [1, 1, BLANK, 1];
    const output = [1, 1, BLANK, 1];
    // Pulse 1's non-blank value matches the output tape but never reached the
    // Terminal.
    const reachedPerPulse = [true, false, false, true];

    const result = evaluateLiveGate(expected, output, reachedPerPulse);

    expect(result.tapeMatches).toBe(true);
    expect(result.undelivered).toEqual([1]);
    expect(result.passed).toBe(false);
  });

  test('[P14-1] blank pulses need not reach the Terminal', () => {
    // A1-7's expected tape (levels.ts), with the floor solve's actual
    // per-pulse Terminal-reached pattern: the three blocked (BLANK) pulses
    // never reach the Terminal, and that is fine.
    const expected = [1, 1, BLANK, 1, BLANK, BLANK, 1, 1];
    const output = [1, 1, BLANK, 1, BLANK, BLANK, 1, 1];
    const reachedPerPulse = [true, true, false, true, false, false, true, true];

    const result = evaluateLiveGate(expected, output, reachedPerPulse);

    expect(result.tapeMatches).toBe(true);
    expect(result.undelivered).toEqual([]);
    expect(result.passed).toBe(true);
  });

  test('[P14-1] tape mismatch fails regardless of delivery', () => {
    const expected = [1, 1, BLANK, 1];
    const output = [1, 0, BLANK, 1];
    const reachedPerPulse = [true, true, false, true];

    const result = evaluateLiveGate(expected, output, reachedPerPulse);

    expect(result.tapeMatches).toBe(false);
    expect(result.passed).toBe(false);
  });
});
