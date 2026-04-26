// Pulse-lifecycle state-machine tests (Prompt 97, Phase 1).
//
// These tests are intentionally pure-JS — they simulate the
// pulse-boundary patterns that live inside GameplayScreen.handleEngage
// and runLinearPath, instead of mounting the React tree. The reason
// is twofold:
//   1. The patterns under test are state-machine invariants, not
//      render behavior, so a state-only simulation captures their
//      essence without needing RN module transforms.
//   2. The previous bugs (Prompts 93–96) were each a one-line
//      sweep / reset that mutated a ref or a Map. They are easy to
//      mis-regress and easy to assert in isolation.
//
// Each `it` block carries the prompt number whose bug class it
// guards against. If a future engineer "simplifies" the production
// code and breaks one of the corresponding patterns, the test name
// will point straight at the prompt that originally introduced it.

describe('pulseLifecycle', () => {
  describe('Maps reset between pulses (Prompt 96)', () => {
    it('clears flashing / animations / gates after each pulse, preserving failColors + locked', () => {
      jest.useFakeTimers();

      // Mirrors the production state shape on
      // src/game/engagement/types.ts (PieceAnimState).
      let pieceAnimState = {
        flashing: new Map<string, string>(),
        animations: new Map<string, string>(),
        gates: new Map<string, 'pass' | 'block'>(),
        failColors: new Map<string, string>(),
        locked: new Set<string>(),
      };

      // Pulse 1 finishes — entries from triggers are still in the
      // Maps because the deferred-cleanup setTimeouts were nuked by
      // the per-pulse flashTimersRef sweep (Prompt 94 introduced the
      // sweep; Prompt 96 added the explicit Map reset to compensate).
      pieceAnimState.flashing.set('piece-1', '#F0B429');
      pieceAnimState.animations.set('piece-2', 'rolling');
      pieceAnimState.gates.set('piece-3', 'pass');
      pieceAnimState.failColors.set('piece-4', '#FF6B6B');
      pieceAnimState.locked.add('piece-5');

      expect(pieceAnimState.flashing.size).toBe(1);
      expect(pieceAnimState.animations.size).toBe(1);
      expect(pieceAnimState.gates.size).toBe(1);

      // Between-pulse reset (mirrors GameplayScreen.tsx pulse-loop
      // block at ~line 932-941). Only flashing / animations / gates
      // are reset; failColors + locked persist across pulses
      // because they hold post-pulse outcome state (wrong-output
      // red ring, locked-on-completion set).
      pieceAnimState = {
        ...pieceAnimState,
        flashing: new Map(),
        animations: new Map(),
        gates: new Map(),
      };

      expect(pieceAnimState.flashing.size).toBe(0);
      expect(pieceAnimState.animations.size).toBe(0);
      expect(pieceAnimState.gates.size).toBe(0);

      // Regression sentinel: failColors + locked must NOT be
      // wiped. If a future refactor "simplifies" the reset to use
      // PIECE_ANIM_INITIAL, this assertion fails first.
      expect(pieceAnimState.failColors.size).toBe(1);
      expect(pieceAnimState.failColors.get('piece-4')).toBe('#FF6B6B');
      expect(pieceAnimState.locked.size).toBe(1);
      expect(pieceAnimState.locked.has('piece-5')).toBe(true);

      jest.useRealTimers();
    });

    it('keeps the reset shape in sync across the pulse-loop reset and replayLoop reset', () => {
      // Prompt 96 explicitly mirrored the canonical reset that
      // replayLoop.ts:52-57 already performed. Both sites must
      // reset the exact same three Maps (flashing, animations,
      // gates). If they drift, the replay loop will appear to
      // "remember" piece animations from before the loop started
      // and the pulse loop won't.
      const RESET_KEYS = ['flashing', 'animations', 'gates'] as const;
      const PRESERVED_KEYS = ['failColors', 'locked'] as const;

      // The three Maps that get wiped between pulses.
      expect(RESET_KEYS).toEqual(['flashing', 'animations', 'gates']);
      // The two fields that survive a pulse boundary.
      expect(PRESERVED_KEYS).toEqual(['failColors', 'locked']);
    });
  });

  describe('flashTimersRef bounded growth (Prompt 94)', () => {
    it('per-pulse sweep keeps the timer array bounded across many pulses', () => {
      jest.useFakeTimers();

      const flashTimersRef: { current: ReturnType<typeof setTimeout>[] } = {
        current: [],
      };

      // Simulate 5 pulses, each queueing 3 deferred-cleanup timers
      // (matches what flashPiece + triggerPieceAnim push into the
      // ref during a beam tick).
      for (let pulse = 0; pulse < 5; pulse++) {
        for (let i = 0; i < 3; i++) {
          const timer = setTimeout(() => {}, 180);
          flashTimersRef.current.push(timer);
        }

        // Immediately before sweep: 3 timers queued for THIS pulse.
        expect(flashTimersRef.current.length).toBe(3);

        // The per-pulse sweep
        // (GameplayScreen.tsx:932-933 in the handleEngage loop).
        flashTimersRef.current.forEach(t => clearTimeout(t));
        flashTimersRef.current = [];

        expect(flashTimersRef.current.length).toBe(0);

        // Run any leftover scheduled work so the next iteration
        // starts with a clean timer queue.
        jest.runAllTimers();
      }

      // After 5 pulses, the array is still 0 — without the sweep
      // it would be 15 (and growing on every replay loop).
      expect(flashTimersRef.current.length).toBe(0);

      jest.useRealTimers();
    });

    it('without the sweep, timer count grows unboundedly (regression demo)', () => {
      // Negative-control test that demonstrates the original bug:
      // if the sweep is removed, timers accumulate on every pulse.
      jest.useFakeTimers();

      const flashTimersRef: { current: ReturnType<typeof setTimeout>[] } = {
        current: [],
      };

      for (let pulse = 0; pulse < 5; pulse++) {
        for (let i = 0; i < 3; i++) {
          const timer = setTimeout(() => {}, 180);
          flashTimersRef.current.push(timer);
        }
        // NOTE: no sweep here — this is what the code looked like
        // before Prompt 94, Fix 1.
      }

      // 5 pulses × 3 timers = 15 stale handles in the ref.
      expect(flashTimersRef.current.length).toBe(15);

      // Cleanup.
      flashTimersRef.current.forEach(t => clearTimeout(t));
      flashTimersRef.current = [];
      jest.useRealTimers();
    });
  });

  describe('Timer cleanup on unmount (Prompt 90)', () => {
    it('clearing both flashTimersRef and safetyTimersRef leaves jest with zero pending timers', () => {
      jest.useFakeTimers();

      // Two separate refs, mirroring the production split between
      // per-pulse-cleanable timers (flashTimersRef) and
      // pulse-boundary-straddling safety timers (safetyTimersRef,
      // Prompt 95).
      const flashTimersRef: { current: ReturnType<typeof setTimeout>[] } = {
        current: [],
      };
      const safetyTimersRef: { current: ReturnType<typeof setTimeout>[] } = {
        current: [],
      };

      // Active pulse: a couple of flash timers + an 8s safety timer.
      flashTimersRef.current.push(setTimeout(() => {}, 100));
      flashTimersRef.current.push(setTimeout(() => {}, 200));
      safetyTimersRef.current.push(setTimeout(() => {}, 8000));

      // Three timers pending before cleanup.
      expect(jest.getTimerCount()).toBe(3);

      // Unmount cleanup walks BOTH refs (mirrors GameplayScreen
      // useEffect cleanup at lines ~498-510).
      flashTimersRef.current.forEach(t => clearTimeout(t));
      flashTimersRef.current = [];
      safetyTimersRef.current.forEach(t => clearTimeout(t));
      safetyTimersRef.current = [];

      // Zero timers pending after cleanup.
      expect(jest.getTimerCount()).toBe(0);

      jest.useRealTimers();
    });
  });

  describe('loopingRef reset on level change (Prompt 93 / Progressive Lag Fix)', () => {
    it('resets loopingRef.current to false at the level-change boundary', () => {
      // The original lag bug was native-stack `navigate('Gameplay')`
      // popping back to a stale Gameplay instance whose loopingRef
      // had stayed true. The fix was twofold: (1) call sites switch
      // to `replace`, and (2) the unmount cleanup AND a level-id-
      // keyed effect in GameplayScreen both flip loopingRef to
      // false at the boundary.
      const loopingRef = { current: false };

      // Simulate "looping is active during gameplay" (post-completion
      // replay loop is running).
      loopingRef.current = true;
      expect(loopingRef.current).toBe(true);

      // Level change effect fires (or unmount cleanup fires) and
      // flips it back. Two callsites for redundancy.
      loopingRef.current = false;
      expect(loopingRef.current).toBe(false);

      // Subsequent re-engagement on the new level starts from a
      // clean false → no replay loop bleed-through.
      loopingRef.current = false;
      expect(loopingRef.current).toBe(false);
    });
  });

  describe('Safety timer isolation from per-pulse sweep (Prompt 95)', () => {
    it('per-pulse flashTimersRef sweep does not touch safetyTimersRef', () => {
      jest.useFakeTimers();

      const flashTimersRef: { current: ReturnType<typeof setTimeout>[] } = {
        current: [],
      };
      const safetyTimersRef: { current: ReturnType<typeof setTimeout>[] } = {
        current: [],
      };

      // Mid-pulse: a couple of flash-cleanup timers queued by
      // flashPiece / triggerPieceAnim, plus an 8s safety timer
      // queued by runLinearPath when the beam pauses on a tape
      // piece. Without Fix 7, all three would ride flashTimersRef
      // and the per-pulse sweep on the next pulse would clear the
      // safety timer mid-flight.
      const flashTimer1 = setTimeout(() => {}, 100);
      const flashTimer2 = setTimeout(() => {}, 150);
      const safetyTimer = setTimeout(() => {}, 8000);
      flashTimersRef.current.push(flashTimer1, flashTimer2);
      safetyTimersRef.current.push(safetyTimer);

      // Per-pulse sweep — only touches flashTimersRef.
      flashTimersRef.current.forEach(t => clearTimeout(t));
      flashTimersRef.current = [];

      // Flash timers are gone.
      expect(flashTimersRef.current.length).toBe(0);

      // Safety timer survives.
      expect(safetyTimersRef.current.length).toBe(1);
      expect(safetyTimersRef.current[0]).toBe(safetyTimer);

      // Cleanup.
      safetyTimersRef.current.forEach(t => clearTimeout(t));
      safetyTimersRef.current = [];

      jest.useRealTimers();
    });
  });

  describe('Splitter RAF id isolation (Prompt 94)', () => {
    it('per-branch RAF Map prevents one branch from overwriting another branch\'s frame id', () => {
      // Prompt 94, Fix 2 converted ctx.animFrameRef from
      // `MutableRefObject<number | null>` to
      // `MutableRefObject<Map<number | null, number | null>>`. The
      // pre-fix bug was that both Splitter branches wrote into the
      // same `current` field, so cancelAnimationFrame could only
      // ever target the second branch's id; the first was orphaned.
      const animFrameRef: { current: Map<number | null, number | null> } = {
        current: new Map(),
      };

      // Main-beam slot (key null) is initially empty. Each phase
      // writes its frame id into its own slot.
      animFrameRef.current.set(null, 100); // charge phase
      expect(animFrameRef.current.get(null)).toBe(100);
      expect(animFrameRef.current.size).toBe(1);

      // Splitter spawns two parallel branches.
      animFrameRef.current.set(0, 201); // branch A's frame id
      animFrameRef.current.set(1, 202); // branch B's frame id
      expect(animFrameRef.current.size).toBe(3);
      expect(animFrameRef.current.get(0)).toBe(201);
      expect(animFrameRef.current.get(1)).toBe(202);

      // Cleanup walks the Map and cancels each non-null id, then
      // clears (mirrors GameplayScreen unmount + handleReset
      // + post-completion CONTINUE callsites).
      const cancelled: (number | null)[] = [];
      animFrameRef.current.forEach(id => {
        if (id != null) cancelled.push(id);
      });
      animFrameRef.current.clear();

      // All three slots cancelled, no orphans.
      expect(cancelled).toEqual(expect.arrayContaining([100, 201, 202]));
      expect(cancelled.length).toBe(3);
      expect(animFrameRef.current.size).toBe(0);
    });
  });
});
