// Beam-animation pause/resume race fix tests (Prompt 98).
//
// The bug class: when multiple tape-piece interactions resolve out
// of order, the per-runLinearPath pause bookkeeping can race in
// three ways. Each test below pins one of the guards:
//
//   Fix 1 — pauseStart guard. If pauseEnd is non-zero but
//           pauseStart was already zeroed by a prior settle,
//           pauseAccum must NOT add the entire app uptime.
//   Fix 2 — In-flight tape-pause counter. The pause must NOT be
//           released until ALL parallel tape promises have settled.
//   Fix 3 — Per-pause resolved flag. The 8 s safety timer must not
//           decrement the counter a second time after the promise
//           has already settled.
//
// Two layers of testing:
//   (a) Source-contract assertions that pin the production patterns
//       in beamAnimation.ts so a future "simplification" cannot
//       silently regress them.
//   (b) Pure-JS state-machine simulations that exercise the counter
//       + resolver pattern in isolation. These don't import the
//       production runLinearPath (which needs a full RAF + RN mock
//       harness) — they replay the algorithm Tucker described and
//       prove its correctness across the failure modes from the
//       prompt's test list.

import * as fs from 'fs';
import * as path from 'path';

const beamSrc = fs.readFileSync(
  path.resolve(__dirname, '../../src/game/engagement/beamAnimation.ts'),
  'utf8',
);

describe('Prompt 98 — beam pause/resume race fix', () => {
  describe('Fix 1 — pauseStart guard', () => {
    it('the tick-loop pause-accumulation block guards on pauseStart > 0', () => {
      expect(beamSrc).toMatch(
        /if \(pauseEnd > 0\) \{\s*[\s\S]*?if \(pauseStart > 0\) \{\s*pauseAccum \+= \(pauseEnd - pauseStart\);/,
      );
    });

    it('still zeroes both fields after the (guarded) accumulation', () => {
      const block = beamSrc.match(
        /if \(pauseEnd > 0\) \{[\s\S]*?pauseEnd = 0;\s*pauseStart = 0;\s*\}/,
      );
      expect(block).not.toBeNull();
    });
  });

  describe('Fix 2 — in-flight tape-pause counter', () => {
    it('declares inFlightTapePauses inside runLinearPath (closure-scoped)', () => {
      // Closure scope, NOT module scope: each Splitter branch runs
      // its own runLinearPath with its own pauseStart / pauseEnd /
      // pauseAccum, so the counter must follow that scoping.
      const fnBlock = beamSrc.match(
        /export function runLinearPath\([\s\S]*?\n\}/,
      );
      expect(fnBlock).not.toBeNull();
      expect(fnBlock?.[0]).toMatch(/let inFlightTapePauses = 0;/);
    });

    it('only sets pauseStart / pauseEnd on the FIRST in-flight pause', () => {
      expect(beamSrc).toMatch(
        /if \(inFlightTapePauses === 0\) \{\s*[\s\S]*?pauseStart = now2;\s*pauseEnd = now2 \+ 1e9;\s*\}\s*inFlightTapePauses\+\+;/,
      );
    });

    it('only releases the pause when the LAST in-flight tape pause settles', () => {
      // settleTapePause decrements the counter, then sets pauseEnd
      // only when the counter reaches 0. brightenBeam fires on the
      // same edge.
      expect(beamSrc).toMatch(
        /inFlightTapePauses--;\s*if \(inFlightTapePauses === 0\) \{\s*pauseEnd = performance\.now\(\);\s*brightenBeam\(ctx\);\s*\}/,
      );
    });
  });

  describe('Fix 3 — per-pause resolved flag prevents double-decrement', () => {
    it('creates a fresh tapeResolver { resolved: false } per tape pause', () => {
      expect(beamSrc).toMatch(
        /const tapeResolver = \{ resolved: false \};/,
      );
    });

    it('settleTapePause is idempotent — early-returns if already resolved', () => {
      expect(beamSrc).toMatch(
        /const settleTapePause = \(\): void => \{\s*if \(tapeResolver\.resolved\) return;\s*tapeResolver\.resolved = true;/,
      );
    });

    it('both the promise settle path AND the safety timer route through settleTapePause', () => {
      // Safety timer first — when it fires it calls settleTapePause.
      expect(beamSrc).toMatch(/setTimeout\(settleTapePause, 8000\)/);
      // Both .then() and .catch() chains call settleTapePause after
      // clearing the safety timer.
      expect(beamSrc).toMatch(
        /\.then\(\(\) => \{\s*clearTimeout\(safetyTimer\);\s*settleTapePause\(\);\s*\}\)\s*\.catch\(\(\) => \{\s*clearTimeout\(safetyTimer\);\s*settleTapePause\(\);\s*\}\);/,
      );
    });
  });

  describe('State-machine simulation — counter + resolver', () => {
    // Reproduces the production logic with plain JS so the failure
    // modes from the prompt's test list can be exercised end-to-end.

    type Sim = {
      pauseStart: number;
      pauseEnd: number;
      pauseAccum: number;
      inFlight: number;
      brightens: number;
    };

    function newSim(): Sim {
      return { pauseStart: 0, pauseEnd: 0, pauseAccum: 0, inFlight: 0, brightens: 0 };
    }

    function startTapePause(sim: Sim, now: number): { resolver: { resolved: boolean }; settle: (resolveAt: number) => void } {
      // Mirror runLinearPath:
      //   if (inFlightTapePauses === 0) { pauseStart = now2; pauseEnd = now2 + 1e9; }
      //   inFlightTapePauses++;
      if (sim.inFlight === 0) {
        sim.pauseStart = now;
        sim.pauseEnd = now + 1e9;
      }
      sim.inFlight++;
      const resolver = { resolved: false };
      const settle = (resolveAt: number): void => {
        if (resolver.resolved) return;
        resolver.resolved = true;
        sim.inFlight--;
        if (sim.inFlight === 0) {
          sim.pauseEnd = resolveAt;
          sim.brightens++;
        }
      };
      return { resolver, settle };
    }

    function tickAccumulate(sim: Sim, now: number): void {
      // Mirror the tick-loop accumulation block (Fix 1's guard).
      if (sim.pauseEnd > 0 && now < sim.pauseEnd) return;
      if (sim.pauseEnd > 0) {
        if (sim.pauseStart > 0) {
          sim.pauseAccum += sim.pauseEnd - sim.pauseStart;
        }
        sim.pauseEnd = 0;
        sim.pauseStart = 0;
      }
    }

    it('Test 1 — two tape pauses resolving out of order do not pollute pauseAccum', () => {
      const sim = newSim();
      const a = startTapePause(sim, 1000);
      const b = startTapePause(sim, 1000);
      expect(sim.inFlight).toBe(2);

      // Resolve B first (out of order), then A.
      b.settle(1300);
      expect(sim.inFlight).toBe(1);
      expect(sim.pauseEnd).toBe(1000 + 1e9); // still in pause sentinel
      expect(sim.brightens).toBe(0);

      a.settle(1450);
      expect(sim.inFlight).toBe(0);
      expect(sim.pauseEnd).toBe(1450); // released only after BOTH settle
      expect(sim.brightens).toBe(1);

      // Tick after release: accumulation runs, pauseAccum = 1450-1000 = 450.
      tickAccumulate(sim, 1500);
      expect(sim.pauseAccum).toBe(450);
      expect(sim.pauseStart).toBe(0);
      expect(sim.pauseEnd).toBe(0);
    });

    it('Test 2 — counter increments / decrements correctly across two pauses in order', () => {
      const sim = newSim();
      const a = startTapePause(sim, 2000);
      const b = startTapePause(sim, 2000);
      expect(sim.inFlight).toBe(2);

      a.settle(2200);
      expect(sim.inFlight).toBe(1);
      expect(sim.pauseEnd).toBe(2000 + 1e9);

      b.settle(2350);
      expect(sim.inFlight).toBe(0);
      expect(sim.pauseEnd).toBe(2350);
      expect(sim.brightens).toBe(1);
    });

    it('Test 3 — safety timer firing AFTER promise resolution does not double-decrement', () => {
      const sim = newSim();
      const { resolver, settle } = startTapePause(sim, 3000);
      expect(sim.inFlight).toBe(1);

      // Promise resolves first.
      settle(3500);
      expect(sim.inFlight).toBe(0);
      expect(resolver.resolved).toBe(true);
      expect(sim.brightens).toBe(1);

      // Safety timer fires later — must be a no-op.
      settle(11000); // simulate the 8 s safety net firing late
      expect(sim.inFlight).toBe(0); // NOT -1
      expect(sim.brightens).toBe(1); // NOT 2
    });

    it('Test 4 — single tape piece (normal case) is unchanged', () => {
      const sim = newSim();
      const { settle } = startTapePause(sim, 4000);
      expect(sim.inFlight).toBe(1);
      expect(sim.pauseStart).toBe(4000);

      settle(4400);
      expect(sim.inFlight).toBe(0);
      expect(sim.pauseEnd).toBe(4400);
      expect(sim.brightens).toBe(1);

      tickAccumulate(sim, 4500);
      expect(sim.pauseAccum).toBe(400);
    });

    it('Test 5 — safety timer firing BEFORE promise (force-resume) — counter never goes negative', () => {
      const sim = newSim();
      const { resolver, settle } = startTapePause(sim, 5000);

      // Safety timer fires first (force-resume after 8 s).
      settle(13000);
      expect(sim.inFlight).toBe(0);
      expect(resolver.resolved).toBe(true);
      expect(sim.pauseEnd).toBe(13000);
      expect(sim.brightens).toBe(1);

      // Promise resolves later — must be a no-op.
      settle(13500);
      expect(sim.inFlight).toBe(0); // never negative
      expect(sim.brightens).toBe(1); // not double-brightened
    });

    it('Fix 1 regression demo — without the pauseStart > 0 guard, accumulator would be corrupted', () => {
      // Demonstrates the original bug shape: pauseEnd set, pauseStart
      // zeroed, then naive `pauseAccum += pauseEnd - pauseStart`
      // would add the entire app uptime.
      const naive = newSim();
      naive.pauseEnd = 99999;
      naive.pauseStart = 0; // raced — already zeroed by an earlier settle
      const bad = naive.pauseEnd - naive.pauseStart;
      expect(bad).toBe(99999); // corruption — would land in pauseAccum

      // Fix 1's guarded path skips the addition entirely.
      tickAccumulate(naive, 100000);
      expect(naive.pauseAccum).toBe(0); // skipped, NOT 99999
      expect(naive.pauseStart).toBe(0);
      expect(naive.pauseEnd).toBe(0);
    });
  });
});
