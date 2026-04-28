// React 18+ requires this flag set before any act() calls so the
// concurrent renderer treats this as a test environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// cancelAnimationFrame is not provided by jsdom; stub it so the
// cancelAllFrames Map.forEach loop doesn't throw.
if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  (globalThis as { cancelAnimationFrame?: (id: number) => void }).cancelAnimationFrame =
    (id: number) => clearTimeout(id);
}

import * as React from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: {
  act: (cb: () => void | Promise<void>) => Promise<void> | void;
  create: (
    el: React.ReactElement,
  ) => { update: (el: React.ReactElement) => void; unmount: () => void };
} = require('react-test-renderer');
import { useBeamEngine } from '../../../src/hooks/useBeamEngine';
import type { PlacedPiece } from '../../../src/game/types';
import {
  BEAM_INITIAL,
  PIECE_ANIM_INITIAL,
  CHARGE_INITIAL,
} from '../../../src/game/engagement';

type HookResult = ReturnType<typeof useBeamEngine>;

let captured: HookResult | null = null;

function Harness(props: { pieces: PlacedPiece[] }) {
  captured = useBeamEngine(props.pieces);
  return null;
}

const NO_PIECES: PlacedPiece[] = [];

function makePiece(id: string): PlacedPiece {
  return {
    id,
    type: 'conveyor',
    category: 'physics',
    gridX: 0,
    gridY: 0,
    ports: [],
    rotation: 0,
  };
}

afterEach(() => {
  captured = null;
});

describe('useBeamEngine', () => {
  describe('initial state', () => {
    beforeEach(() => {
      TestRenderer.act(() => {
        TestRenderer.create(React.createElement(Harness, { pieces: NO_PIECES }));
      });
    });

    it('beamState matches BEAM_INITIAL', () => {
      const s = captured!.beamState;
      expect(s.heads).toEqual(BEAM_INITIAL.heads);
      expect(s.phase).toBe(BEAM_INITIAL.phase);
      expect(s.headColor).toBe(BEAM_INITIAL.headColor);
      expect(s.trails).toEqual(BEAM_INITIAL.trails);
      expect(s.branchTrails).toEqual(BEAM_INITIAL.branchTrails);
      expect(s.voidPulse).toBeNull();
    });

    it('pieceAnimState matches PIECE_ANIM_INITIAL (all Maps empty)', () => {
      const s = captured!.pieceAnimState;
      expect(s.flashing.size).toBe(PIECE_ANIM_INITIAL.flashing.size);
      expect(s.flashCounter.size).toBe(PIECE_ANIM_INITIAL.flashCounter.size);
      expect(s.animations.size).toBe(PIECE_ANIM_INITIAL.animations.size);
      expect(s.gates.size).toBe(PIECE_ANIM_INITIAL.gates.size);
      expect(s.failColors.size).toBe(PIECE_ANIM_INITIAL.failColors.size);
    });

    it('chargeState matches CHARGE_INITIAL', () => {
      expect(captured!.chargeState.pos).toBeNull();
      expect(captured!.chargeState.progress).toBe(CHARGE_INITIAL.progress);
    });

    it('currentPulseIndex starts at 0', () => {
      expect(captured!.currentPulseIndex).toBe(0);
    });

    it('lockRingCenter and voidBurstCenter start null', () => {
      expect(captured!.lockRingCenter).toBeNull();
      expect(captured!.voidBurstCenter).toBeNull();
    });

    it('flashColor starts null', () => {
      expect(captured!.flashColor).toBeNull();
    });

    it('runIdRef starts at 0', () => {
      expect(captured!.runIdRef.current).toBe(0);
    });

    it('terminalSuccessCountRef starts at 0', () => {
      expect(captured!.terminalSuccessCountRef.current).toBe(0);
    });

    it('currentPulseRef starts at 0', () => {
      expect(captured!.currentPulseRef.current).toBe(0);
    });

    it('loopingRef starts false', () => {
      expect(captured!.loopingRef.current).toBe(false);
    });

    it('animFrameRef is an empty Map', () => {
      expect(captured!.animFrameRef.current.size).toBe(0);
    });

    it('flashTimersRef is an empty array', () => {
      expect(captured!.flashTimersRef.current).toEqual([]);
    });

    it('safetyTimersRef is an empty array', () => {
      expect(captured!.safetyTimersRef.current).toEqual([]);
    });

    it('cacheRef starts with zero board position and null tape measures', () => {
      const c = captured!.cacheRef.current;
      expect(c.board).toEqual({ x: 0, y: 0 });
      expect(c.input).toBeNull();
      expect(c.trail).toBeNull();
      expect(c.output).toBeNull();
    });

    it('pieceAnimProps is an empty Map when no pieces are passed', () => {
      expect(captured!.pieceAnimProps.size).toBe(0);
    });
  });

  describe('Animated.Values and ref stability', () => {
    it('Animated.Values retain the same reference across re-renders', () => {
      let renderer: { update: (el: React.ReactElement) => void } | null = null;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(
          React.createElement(Harness, { pieces: NO_PIECES }),
        );
      });
      const opacity = captured!.beamOpacity;
      const charge = captured!.chargeProgressAnim;
      const lock = captured!.lockRingProgressAnim;
      const voidAnim = captured!.voidPulseRingProgressAnim;

      TestRenderer.act(() => {
        renderer!.update(React.createElement(Harness, { pieces: NO_PIECES }));
      });

      expect(captured!.beamOpacity).toBe(opacity);
      expect(captured!.chargeProgressAnim).toBe(charge);
      expect(captured!.lockRingProgressAnim).toBe(lock);
      expect(captured!.voidPulseRingProgressAnim).toBe(voidAnim);
    });

    it('mutable refs retain the same reference across re-renders', () => {
      let renderer: { update: (el: React.ReactElement) => void } | null = null;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(
          React.createElement(Harness, { pieces: NO_PIECES }),
        );
      });
      const animFrame = captured!.animFrameRef;
      const looping = captured!.loopingRef;
      const flash = captured!.flashTimersRef;
      const safety = captured!.safetyTimersRef;
      const cache = captured!.cacheRef;
      const runId = captured!.runIdRef;

      TestRenderer.act(() => {
        renderer!.update(React.createElement(Harness, { pieces: NO_PIECES }));
      });

      expect(captured!.animFrameRef).toBe(animFrame);
      expect(captured!.loopingRef).toBe(looping);
      expect(captured!.flashTimersRef).toBe(flash);
      expect(captured!.safetyTimersRef).toBe(safety);
      expect(captured!.cacheRef).toBe(cache);
      expect(captured!.runIdRef).toBe(runId);
    });
  });

  describe('cancelAllFrames', () => {
    beforeEach(() => {
      TestRenderer.act(() => {
        TestRenderer.create(React.createElement(Harness, { pieces: NO_PIECES }));
      });
    });

    it('clears the animFrameRef Map', () => {
      captured!.animFrameRef.current.set(null, 42);
      captured!.animFrameRef.current.set(0, 99);
      expect(captured!.animFrameRef.current.size).toBe(2);

      TestRenderer.act(() => {
        captured!.cancelAllFrames();
      });

      expect(captured!.animFrameRef.current.size).toBe(0);
    });

    it('clears the flashTimersRef array', () => {
      const t = setTimeout(() => {}, 9999);
      captured!.flashTimersRef.current = [t];

      TestRenderer.act(() => {
        captured!.cancelAllFrames();
      });

      expect(captured!.flashTimersRef.current).toEqual([]);
      clearTimeout(t);
    });

    it('clears the safetyTimersRef array', () => {
      const t = setTimeout(() => {}, 9999);
      captured!.safetyTimersRef.current = [t];

      TestRenderer.act(() => {
        captured!.cancelAllFrames();
      });

      expect(captured!.safetyTimersRef.current).toEqual([]);
      clearTimeout(t);
    });

    it('sets loopingRef to false', () => {
      captured!.loopingRef.current = true;

      TestRenderer.act(() => {
        captured!.cancelAllFrames();
      });

      expect(captured!.loopingRef.current).toBe(false);
    });
  });

  describe('resetBeam', () => {
    beforeEach(() => {
      TestRenderer.act(() => {
        TestRenderer.create(React.createElement(Harness, { pieces: NO_PIECES }));
      });
    });

    it('resets react state back to initial values', () => {
      TestRenderer.act(() => {
        captured!.setCurrentPulseIndex(3);
        captured!.setFlashColor('#FF0000');
        captured!.setLockRingCenter({ x: 10, y: 10 });
        captured!.setVoidBurstCenter({ x: 20, y: 20 });
      });

      TestRenderer.act(() => {
        captured!.resetBeam();
      });

      expect(captured!.currentPulseIndex).toBe(0);
      expect(captured!.flashColor).toBeNull();
      expect(captured!.lockRingCenter).toBeNull();
      expect(captured!.voidBurstCenter).toBeNull();
      expect(captured!.beamState.phase).toBe('idle');
      expect(captured!.chargeState.pos).toBeNull();
    });

    it('resets terminalSuccessCountRef to 0', () => {
      captured!.terminalSuccessCountRef.current = 7;

      TestRenderer.act(() => {
        captured!.resetBeam();
      });

      expect(captured!.terminalSuccessCountRef.current).toBe(0);
    });

    it('resets currentPulseRef to 0', () => {
      captured!.currentPulseRef.current = 4;

      TestRenderer.act(() => {
        captured!.resetBeam();
      });

      expect(captured!.currentPulseRef.current).toBe(0);
    });

    it('clears measurement cache', () => {
      captured!.cacheRef.current = {
        board: { x: 100, y: 200 },
        input: { x: 10, y: 20, w: 50, h: 30 },
        trail: null,
        output: null,
      };

      TestRenderer.act(() => {
        captured!.resetBeam();
      });

      expect(captured!.cacheRef.current.board).toEqual({ x: 0, y: 0 });
      expect(captured!.cacheRef.current.input).toBeNull();
    });

    it('internally calls cancelAllFrames (animFrameRef cleared, loopingRef reset)', () => {
      captured!.animFrameRef.current.set(null, 1);
      captured!.loopingRef.current = true;

      TestRenderer.act(() => {
        captured!.resetBeam();
      });

      expect(captured!.animFrameRef.current.size).toBe(0);
      expect(captured!.loopingRef.current).toBe(false);
    });
  });

  describe('pieceAnimProps memoization', () => {
    it('same pieces array identity produces the same Map reference across re-renders', () => {
      const pieces = [makePiece('p1')];
      let renderer: { update: (el: React.ReactElement) => void } | null = null;
      TestRenderer.act(() => {
        renderer = TestRenderer.create(
          React.createElement(Harness, { pieces }),
        );
      });
      const firstMap = captured!.pieceAnimProps;

      TestRenderer.act(() => {
        renderer!.update(React.createElement(Harness, { pieces }));
      });

      expect(captured!.pieceAnimProps).toBe(firstMap);
    });

    it('produces a new Map when pieceAnimState changes', () => {
      const pieces = [makePiece('p1')];
      TestRenderer.act(() => {
        TestRenderer.create(React.createElement(Harness, { pieces }));
      });
      const firstMap = captured!.pieceAnimProps;

      TestRenderer.act(() => {
        captured!.setPieceAnimState(prev => ({
          ...prev,
          animations: new Map([['p1', 'flash']]),
        }));
      });

      expect(captured!.pieceAnimProps).not.toBe(firstMap);
      expect(captured!.pieceAnimProps.get('p1')?.animType).toBe('flash');
    });

    it('reflects gateResult, failColor, flashColor, and flashCounter per piece', () => {
      const pieces = [makePiece('p2')];
      TestRenderer.act(() => {
        TestRenderer.create(React.createElement(Harness, { pieces }));
      });

      TestRenderer.act(() => {
        captured!.setPieceAnimState(prev => ({
          ...prev,
          gates: new Map([['p2', 'pass']]),
          failColors: new Map([['p2', '#FF0000']]),
          flashing: new Map([['p2', '#8B5CF6']]),
          flashCounter: new Map([['p2', 3]]),
        }));
      });

      const props = captured!.pieceAnimProps.get('p2');
      expect(props?.gateResult).toBe('pass');
      expect(props?.failColor).toBe('#FF0000');
      expect(props?.flashColor).toBe('#8B5CF6');
      expect(props?.flashCounter).toBe(3);
    });
  });
});
