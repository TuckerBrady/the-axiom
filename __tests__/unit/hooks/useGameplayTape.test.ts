// React 18+ requires this flag set before any act() calls so the
// concurrent renderer treats this as a test environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: {
  act: (cb: () => void | Promise<void>) => Promise<void>;
  create: (
    el: React.ReactElement,
  ) => { update: (el: React.ReactElement) => void; unmount: () => void };
} = require('react-test-renderer');
import { useGameplayTape } from '../../../src/hooks/useGameplayTape';
import type { LevelDefinition } from '../../../src/game/types';
import {
  TAPE_BAR_INITIAL,
  GLOW_TRAVELER_INITIAL,
} from '../../../src/game/engagement';

type HookResult = ReturnType<typeof useGameplayTape>;

let captured: HookResult | null = null;

function Harness(props: { level: LevelDefinition | null }) {
  captured = useGameplayTape(props.level);
  return null;
}

function makeLevel(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id: overrides.id ?? 'A1-1',
    name: 'Level A1-1',
    sector: 'axiom',
    description: '',
    cogsLine: '',
    gridWidth: 8,
    gridHeight: 7,
    prePlacedPieces: [],
    availablePieces: [],
    dataTrail: { cells: [], headPosition: 0 },
    objectives: [],
    optimalPieces: 1,
    ...overrides,
  } as LevelDefinition;
}

afterEach(() => {
  captured = null;
});

describe('useGameplayTape', () => {
  describe('initial state', () => {
    it('starts with null visual overrides', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: makeLevel() }));
      });
      expect(captured!.visualTrailOverride).toBeNull();
      expect(captured!.visualOutputOverride).toBeNull();
    });

    it('starts with empty tapeCellHighlights map', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: makeLevel() }));
      });
      expect(captured!.tapeCellHighlights.size).toBe(0);
    });

    it('starts with TAPE_BAR_INITIAL tapeBarState', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: makeLevel() }));
      });
      expect(captured!.tapeBarState).toEqual(TAPE_BAR_INITIAL);
    });

    it('starts with GLOW_TRAVELER_INITIAL glowTravelerState', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: makeLevel() }));
      });
      expect(captured!.glowTravelerState).toEqual(GLOW_TRAVELER_INITIAL);
    });

    it('gateOutcomesRef starts as an empty Map', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: makeLevel() }));
      });
      expect(captured!.gateOutcomesRef.current.size).toBe(0);
    });

    it('accepts null level without crashing', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: null }));
      });
      expect(captured).not.toBeNull();
      expect(captured!.visualTrailOverride).toBeNull();
    });
  });

  describe('ref stability across renders', () => {
    it('Animated.Values are stable across re-renders', async () => {
      let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(
          React.createElement(Harness, { level: makeLevel({ id: 'A1-1' }) }),
        );
      });
      const firstX = captured!.glowTravelerX;
      const firstY = captured!.glowTravelerY;
      const firstScale = captured!.glowTravelerScale;
      const firstOpacity = captured!.glowTravelerOpacity;

      await TestRenderer.act(async () => {
        renderer.update(
          React.createElement(Harness, { level: makeLevel({ id: 'A1-1' }) }),
        );
      });

      expect(captured!.glowTravelerX).toBe(firstX);
      expect(captured!.glowTravelerY).toBe(firstY);
      expect(captured!.glowTravelerScale).toBe(firstScale);
      expect(captured!.glowTravelerOpacity).toBe(firstOpacity);
    });

    it('measurement refs are stable across re-renders', async () => {
      let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(
          React.createElement(Harness, { level: makeLevel() }),
        );
      });
      const inputRef = captured!.inputTapeCellsRef;
      const trailRef = captured!.dataTrailCellsRef;
      const outputRef = captured!.outputTapeCellsRef;
      const gateRef = captured!.gateOutcomesRef;

      await TestRenderer.act(async () => {
        renderer.update(React.createElement(Harness, { level: makeLevel() }));
      });

      expect(captured!.inputTapeCellsRef).toBe(inputRef);
      expect(captured!.dataTrailCellsRef).toBe(trailRef);
      expect(captured!.outputTapeCellsRef).toBe(outputRef);
      expect(captured!.gateOutcomesRef).toBe(gateRef);
    });

    it('tapeSetters dispatch functions are stable across re-renders', async () => {
      let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(
          React.createElement(Harness, { level: makeLevel() }),
        );
      });
      const setHighlights = captured!.tapeSetters.setTapeCellHighlights;
      const setBarState = captured!.tapeSetters.setTapeBarState;
      const setTrail = captured!.tapeSetters.setVisualTrailOverride;
      const setOutput = captured!.tapeSetters.setVisualOutputOverride;

      await TestRenderer.act(async () => {
        renderer.update(React.createElement(Harness, { level: makeLevel() }));
      });

      expect(captured!.tapeSetters.setTapeCellHighlights).toBe(setHighlights);
      expect(captured!.tapeSetters.setTapeBarState).toBe(setBarState);
      expect(captured!.tapeSetters.setVisualTrailOverride).toBe(setTrail);
      expect(captured!.tapeSetters.setVisualOutputOverride).toBe(setOutput);
    });

    it('valueTravelRefs point to the same Animated.Values across renders', async () => {
      let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(
          React.createElement(Harness, { level: makeLevel() }),
        );
      });
      const vtX = captured!.valueTravelRefs.x;
      const vtY = captured!.valueTravelRefs.y;

      await TestRenderer.act(async () => {
        renderer.update(React.createElement(Harness, { level: makeLevel() }));
      });

      expect(captured!.valueTravelRefs.x).toBe(vtX);
      expect(captured!.valueTravelRefs.y).toBe(vtY);
      // valueTravelRefs x/y are the same objects as glowTravelerX/Y
      expect(captured!.valueTravelRefs.x).toBe(captured!.glowTravelerX);
      expect(captured!.valueTravelRefs.y).toBe(captured!.glowTravelerY);
    });
  });

  describe('resetTape()', () => {
    it('clears tapeCellHighlights to empty map', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: makeLevel() }));
      });

      await TestRenderer.act(async () => {
        captured!.tapeSetters.setTapeCellHighlights(new Map([['in-0', 'read']]));
      });
      expect(captured!.tapeCellHighlights.size).toBe(1);

      await TestRenderer.act(async () => {
        captured!.resetTape();
      });
      expect(captured!.tapeCellHighlights.size).toBe(0);
    });

    it('resets tapeBarState to TAPE_BAR_INITIAL', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: makeLevel() }));
      });

      await TestRenderer.act(async () => {
        captured!.tapeSetters.setTapeBarState({ inIndex: 2, trailIndex: 1, outIndex: 0 });
      });
      expect(captured!.tapeBarState.inIndex).toBe(2);

      await TestRenderer.act(async () => {
        captured!.resetTape();
      });
      expect(captured!.tapeBarState).toEqual(TAPE_BAR_INITIAL);
    });

    it('resets glowTravelerState to GLOW_TRAVELER_INITIAL', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: makeLevel() }));
      });

      await TestRenderer.act(async () => {
        captured!.tapeSetters.setGlowTravelerState({
          visible: true, value: '1', fromX: 0, fromY: 0, toX: 100, toY: 100, phase: 'travel',
        });
      });
      expect(captured!.glowTravelerState.visible).toBe(true);

      await TestRenderer.act(async () => {
        captured!.resetTape();
      });
      expect(captured!.glowTravelerState).toEqual(GLOW_TRAVELER_INITIAL);
    });

    it('clears visualTrailOverride to null', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: makeLevel() }));
      });

      await TestRenderer.act(async () => {
        captured!.tapeSetters.setVisualTrailOverride([0, 1, null]);
      });
      expect(captured!.visualTrailOverride).not.toBeNull();

      await TestRenderer.act(async () => {
        captured!.resetTape();
      });
      expect(captured!.visualTrailOverride).toBeNull();
    });

    it('clears visualOutputOverride to null', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: makeLevel() }));
      });

      await TestRenderer.act(async () => {
        captured!.tapeSetters.setVisualOutputOverride([-1, -1, -1]);
      });
      expect(captured!.visualOutputOverride).not.toBeNull();

      await TestRenderer.act(async () => {
        captured!.resetTape();
      });
      expect(captured!.visualOutputOverride).toBeNull();
    });

    it('clears gateOutcomesRef map', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: makeLevel() }));
      });
      captured!.gateOutcomesRef.current.set(0, 'passed');
      captured!.gateOutcomesRef.current.set(1, 'blocked');
      expect(captured!.gateOutcomesRef.current.size).toBe(2);

      await TestRenderer.act(async () => {
        captured!.resetTape();
      });
      expect(captured!.gateOutcomesRef.current.size).toBe(0);
    });

    it('resets Animated.Values via resetGlowTraveler (opacity to 0, scale to 1)', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: makeLevel() }));
      });

      // Drive opacity to non-zero via setValue (mock Animated.Value tracks this)
      captured!.glowTravelerOpacity.setValue(1);
      captured!.glowTravelerScale.setValue(1.25);

      await TestRenderer.act(async () => {
        captured!.resetTape();
      });

      // After resetGlowTraveler, opacity should be 0 and scale should be 1
      expect((captured!.glowTravelerOpacity as unknown as { __getValue(): number }).__getValue()).toBe(0);
      expect((captured!.glowTravelerScale as unknown as { __getValue(): number }).__getValue()).toBe(1);
    });
  });
});
