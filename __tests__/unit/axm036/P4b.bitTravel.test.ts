// AXM-036 P4b (F13 a, c) — bit travel: IN → Scanner → TRAIL, and
// Transmitter → OUT. Red on origin/master: runScannerInteraction and
// runTransmitterInteraction there have no travel step at all (the
// Scanner path is the single tape-to-tape "arrival fill", and the
// Transmitter reveals the OUT cell immediately) — every clause below
// either fails to compile against master's exports, or fails on timing/
// ordering.

const mockOutputTapeRef: { current: (number | undefined)[] } = { current: [] };
jest.mock('../../../src/store/gameStore', () => ({
  useGameStore: {
    getState: () => ({ machineState: { outputTape: mockOutputTapeRef.current } }),
  },
}));

import { Animated } from 'react-native';
import {
  runScannerInteraction,
  runTransmitterInteraction,
} from '../../../src/game/engagement/interactions';
import { runLinearPath } from '../../../src/game/engagement/beamAnimation';
import { bitTravelPoint } from '../../../src/game/engagement/beamData';
import { BIT_TRAVEL_MS } from '../../../src/game/engagement/constants';
import type { BeamState, ExecutionStep } from '../../../src/game/engagement/types';
import { installFakeClock, makeHarnessCtx } from './helpers/beamHarness';

// [P4b-5] is the first test in this repo to drive runLinearPath (see
// beamAnimation.ts's REQ-G-05 crossfade cleanup) under the shared
// `__tests__/__mocks__/react-native.ts` Animated.Value mock, which has
// never needed a `stopAnimation` method before (out of this package's
// Scope — beamAnimation.ts's own crossfade logic is untouched by P4b).
// A tiny, additive, test-local shim rather than an edit to that shared
// mock file: a no-op is exactly what the real Animated.Value.stopAnimation
// does here, since this mock's `timing().start()` already resolves
// synchronously (nothing is left running to stop).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedValueProto = (Animated.Value as any).prototype;
if (typeof AnimatedValueProto.stopAnimation !== 'function') {
  AnimatedValueProto.stopAnimation = function stopAnimation(
    cb?: (value: number) => void,
  ): void {
    cb?.(this.__getValue?.() ?? 0);
  };
}

function step(type: string, pieceId: string, success = true): ExecutionStep {
  return { pieceId, type, success } as ExecutionStep;
}

function travelerLog(log: { key: string; value: unknown; t: number }[]) {
  return log
    .filter(e => e.key === 'setBeamState')
    .map(e => ({ t: e.t, traveler: (e.value as BeamState).traveler }));
}

describe('[P4b-6] bitTravelPoint interpolates', () => {
  it('[P4b-6] bitTravelPoint interpolates', () => {
    const from = { x: 0, y: 10 };
    const to = { x: 100, y: 20 };
    expect(bitTravelPoint(from, to, 0)).toEqual({ x: 0, y: 10 });
    expect(bitTravelPoint(from, to, 1)).toEqual({ x: 100, y: 20 });
    expect(bitTravelPoint(from, to, 0.5)).toEqual({ x: 50, y: 15 });
  });
});

describe('[P4b-3] scanner: in read, then two travels, then trail arrived', () => {
  async function runAtPulse(pulse: number, speed: number) {
    const clock = installFakeClock();
    try {
      const harness = makeHarnessCtx({
        clockNow: clock.now,
        cellSize: 60,
        pieceCenters: { 'p-s': { x: 10, y: 20 } },
        inputTape: [1, 1],
        board: { x: 0, y: 0 },
        input: { x: 100, y: 200, w: 20, h: 30 },
        trail: { x: 100, y: 300, w: 20, h: 30 },
        output: { x: 100, y: 400, w: 20, h: 30 },
      });
      harness.ctx.currentPulseRef.current = pulse;

      const promise = runScannerInteraction(harness.ctx, step('scanner', 'p-s'));
      await clock.advance((120 + 2 * BIT_TRAVEL_MS) * speed + 200);
      await promise;

      const inReadIdx = harness.log.findIndex(
        e => e.key === 'setTapeCellHighlights' &&
          (e.value as Map<string, string>).get(`in-${pulse}`) === 'read',
      );
      const travelStartIdx = harness.log.findIndex(
        e => e.key === 'setBeamState' && (e.value as BeamState).traveler.visible,
      );
      const trailArrivedIdx = harness.log.findIndex(
        e => e.key === 'setTapeCellHighlights' &&
          (e.value as Map<string, string>).get(`trail-${pulse}`) === 'arrived',
      );

      expect(inReadIdx).toBeGreaterThanOrEqual(0);
      expect(travelStartIdx).toBeGreaterThan(inReadIdx);
      expect(trailArrivedIdx).toBeGreaterThan(travelStartIdx);

      const startT = harness.log[inReadIdx].t;
      const trailArrivedT = harness.log[trailArrivedIdx].t;
      const expectedMin = 2 * BIT_TRAVEL_MS * speed;
      expect(trailArrivedT - startT).toBeGreaterThanOrEqual(expectedMin);
      expect(trailArrivedT - startT).toBeLessThan(expectedMin + 200);

      // Endpoints (P4b-4's endpoint clause, reused here since this is the
      // scanner run that already has cache measurements set up):
      // IN(N) → Scanner → TRAIL(N), in board-local coordinates
      // (cache measurement minus the board origin).
      const travelers = travelerLog(harness.log).filter(e => e.traveler.visible);
      const first = travelers[0].traveler;
      const last = travelers[travelers.length - 1].traveler;
      // IN cell N local coords: x = 100 + N*(20+3) + 10, y = 200 + 15.
      expect(first).toEqual({ visible: true, x: 100 + pulse * 23 + 10, y: 215, value: 1, r: 0.18 * 60 });
      // TRAIL cell N local coords: x = 100 + N*(20+3) + 10, y = 300 + 15.
      expect(last).toEqual({ visible: true, x: 100 + pulse * 23 + 10, y: 315, value: 1, r: 0.18 * 60 });
    } finally {
      clock.restore();
    }
  }

  it('[P4b-3] scanner: in read, then two travels, then trail arrived (speed 2.0, pulse 0)', async () => {
    await runAtPulse(0, 2.0);
  });

  it('[P4b-3] scanner: in read, then two travels, then trail arrived (speed 1.0, pulse 1)', async () => {
    await runAtPulse(1, 1.0);
  });
});

describe('[P4b-4] transmitter: out-N is not set before BIT_TRAVEL_MS * speed', () => {
  async function runAtPulse(pulse: number, speed: number) {
    const clock = installFakeClock();
    try {
      mockOutputTapeRef.current = pulse === 0 ? [1] : [1, 1];
      const harness = makeHarnessCtx({
        clockNow: clock.now,
        cellSize: 60,
        pieceCenters: { 'p-t': { x: 10, y: 20 } },
        board: { x: 0, y: 0 },
        output: { x: 100, y: 400, w: 20, h: 30 },
      });
      harness.ctx.currentPulseRef.current = pulse;

      const promise = runTransmitterInteraction(harness.ctx, step('transmitter', 'p-t'));
      await clock.advance(BIT_TRAVEL_MS * speed + 200);
      await promise;

      const outArrivedIdx = harness.log.findIndex(
        e => e.key === 'setTapeCellHighlights' &&
          (e.value as Map<string, string>).get(`out-${pulse}`) === 'arrived',
      );
      expect(outArrivedIdx).toBeGreaterThanOrEqual(0);
      const outArrivedT = harness.log[outArrivedIdx].t;
      expect(outArrivedT).toBeGreaterThanOrEqual(BIT_TRAVEL_MS * speed);
      expect(outArrivedT).toBeLessThan(BIT_TRAVEL_MS * speed + 200);

      // [P4b-4] traveler endpoints: Transmitter centre → OUT(N).
      const travelers = travelerLog(harness.log).filter(e => e.traveler.visible);
      expect(travelers[0].traveler).toEqual({ visible: true, x: 10, y: 20, value: 1, r: 0.18 * 60 });
      const last = travelers[travelers.length - 1].traveler;
      // OUT cell N local coords: x = 100 + N*(20+3) + 10, y = 400 + 15.
      expect(last).toEqual({ visible: true, x: 100 + pulse * 23 + 10, y: 415, value: 1, r: 0.18 * 60 });
    } finally {
      clock.restore();
    }
  }

  it('[P4b-4] transmitter: out-N is not set before BIT_TRAVEL_MS * speed (speed 2.0)', async () => {
    await runAtPulse(0, 2.0);
  });

  it('[P4b-4] transmitter: out-N is not set before BIT_TRAVEL_MS * speed (speed 1.0)', async () => {
    await runAtPulse(1, 1.0);
  });
});

describe('[P4b-5] transmitter trigger never precedes head arrival', () => {
  it('[P4b-5] transmitter trigger never precedes head arrival', async () => {
    const clock = installFakeClock();
    try {
      mockOutputTapeRef.current = [1];
      const harness = makeHarnessCtx({
        clockNow: clock.now,
        cellSize: 60,
        pieceCenters: {
          // Scanner opens the path (in place of a Source) so every
          // segment's color (getBeamColor: scanner/configNode/
          // transmitter all '#00D4FF') is identical — no
          // Physics/Protocol category boundary anywhere on this path,
          // so beamAnimation.ts's crossfade never engages. Deliberate:
          // this test is only about the pause/resume ordering guarantee
          // (P4b-5), not the crossfade (P4a, unrelated to this package).
          scn: { x: 0, y: 0 },
          txm: { x: 400, y: 0 },
          term: { x: 600, y: 0 },
        },
        // No inputTape → the Scanner leg carries no value (F13-a's
        // "no input value" branch, P4b-3), isolating this test to the
        // ordering guarantee this clause is actually about.
        inputTape: undefined,
        board: { x: 0, y: 0 },
        output: { x: 100, y: 400, w: 20, h: 30 },
      });
      harness.ctx.currentPulseRef.current = 0;

      const steps: ExecutionStep[] = [
        step('scanner', 'scn'),
        step('transmitter', 'txm'),
        step('terminal', 'term'),
      ];

      const resultPromise = runLinearPath(harness.ctx, steps, null, 1);
      await clock.advance(4000);
      await resultPromise;

      const scannerFlashIdx = harness.log.findIndex(
        e => e.key === 'setPieceAnimState' &&
          (e.value as { flashing: Map<string, string> }).flashing.get('scn') !== undefined,
      );
      const transmitterTravelIdx = harness.log.findIndex(
        e => e.key === 'setBeamState' &&
          (e.value as BeamState).traveler.visible &&
          (e.value as BeamState).traveler.x === 400,
      );

      expect(scannerFlashIdx).toBeGreaterThanOrEqual(0);
      expect(transmitterTravelIdx).toBeGreaterThan(scannerFlashIdx);
      // The Transmitter's own travel must not start before the Scanner's
      // interaction (which gates the beam earlier on the same path) has
      // begun — i.e., time never runs backward relative to the path order.
      expect(harness.log[transmitterTravelIdx].t).toBeGreaterThanOrEqual(
        harness.log[scannerFlashIdx].t,
      );
    } finally {
      clock.restore();
    }
  });
});
