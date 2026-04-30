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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameplayTutorial } from '../../../src/hooks/useGameplayTutorial';
import type { LevelDefinition } from '../../../src/game/types';

type HookResult = ReturnType<typeof useGameplayTutorial>;

let captured: HookResult | null = null;

function Harness(props: {
  level: LevelDefinition | null;
  isAxiomLevel: boolean;
  isLevelPreviouslyCompleted: boolean;
}) {
  captured = useGameplayTutorial(
    props.level,
    props.isAxiomLevel,
    props.isLevelPreviouslyCompleted,
  );
  return null;
}

function makeLevel(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id: overrides.id ?? 'A1-1',
    name: overrides.name ?? 'Level A1-1',
    sector: overrides.sector ?? 'axiom',
    description: '',
    cogsLine: '',
    gridWidth: 8,
    gridHeight: 7,
    prePlacedPieces: overrides.prePlacedPieces ?? [],
    availablePieces: [],
    dataTrail: { cells: [], headPosition: 0 },
    objectives: [],
    optimalPieces: 1,
    tutorialSteps: overrides.tutorialSteps ?? [{ id: 's1', text: 'step', target: 'sourceNode' }],
    tutorialHints: overrides.tutorialHints ?? [],
    ...overrides,
  } as LevelDefinition;
}

afterEach(async () => {
  captured = null;
  await AsyncStorage.clear();
});

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

describe('useGameplayTutorial', () => {
  describe('initial state', () => {
    it('starts with no current hint and not complete/skipped', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            level: makeLevel(),
            isAxiomLevel: true,
            isLevelPreviouslyCompleted: false,
          }),
        );
      });
      expect(captured!.tutorialComplete).toBe(false);
      expect(captured!.tutorialSkipped).toBe(false);
      expect(captured!.currentHint).toBeNull();
    });

    it('returns stable refs across renders', async () => {
      let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(
          React.createElement(Harness, {
            level: makeLevel(),
            isAxiomLevel: true,
            isLevelPreviouslyCompleted: false,
          }),
        );
      });
      const firstRefs = captured!.tutorialTargetRefs;
      const firstArcWheelRef = captured!.arcWheelMainRef;
      const firstSourceRef = captured!.sourceNodeRef;

      await TestRenderer.act(async () => {
        renderer.update(
          React.createElement(Harness, {
            level: makeLevel(),
            isAxiomLevel: true,
            isLevelPreviouslyCompleted: false,
          }),
        );
      });
      expect(captured!.tutorialTargetRefs).toBe(firstRefs);
      expect(captured!.arcWheelMainRef).toBe(firstArcWheelRef);
      expect(captured!.sourceNodeRef).toBe(firstSourceRef);
    });
  });

  describe('tutorialIsActive derivation', () => {
    it('is true on Axiom levels with steps when not complete or previously completed', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            level: makeLevel(),
            isAxiomLevel: true,
            isLevelPreviouslyCompleted: false,
          }),
        );
      });
      expect(captured!.tutorialIsActive).toBe(true);
      expect(captured!.tutorialIsActiveRef.current).toBe(true);
    });

    it('is false when the level was previously completed', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            level: makeLevel(),
            isAxiomLevel: true,
            isLevelPreviouslyCompleted: true,
          }),
        );
      });
      expect(captured!.tutorialIsActive).toBe(false);
      expect(captured!.tutorialIsActiveRef.current).toBe(false);
    });

    it('is false on non-Axiom levels', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            level: makeLevel({ sector: 'kepler' }),
            isAxiomLevel: false,
            isLevelPreviouslyCompleted: false,
          }),
        );
      });
      expect(captured!.tutorialIsActive).toBe(false);
    });

    it('is false when there are no tutorial steps', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            level: makeLevel({ tutorialSteps: [] }),
            isAxiomLevel: true,
            isLevelPreviouslyCompleted: false,
          }),
        );
      });
      expect(captured!.tutorialIsActive).toBe(false);
    });
  });

  describe('hydration from AsyncStorage', () => {
    it('reads completion flag from AsyncStorage', async () => {
      await AsyncStorage.setItem('axiom_tutorial_complete_A1-1', '1');
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            level: makeLevel(),
            isAxiomLevel: true,
            isLevelPreviouslyCompleted: false,
          }),
        );
      });
      await TestRenderer.act(async () => {
        await flush();
      });
      expect(captured!.tutorialComplete).toBe(true);
    });

    it('reads skipped flag from AsyncStorage', async () => {
      await AsyncStorage.setItem('axiom_tutorial_skipped_A1-1', '1');
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            level: makeLevel(),
            isAxiomLevel: true,
            isLevelPreviouslyCompleted: false,
          }),
        );
      });
      await TestRenderer.act(async () => {
        await flush();
      });
      expect(captured!.tutorialSkipped).toBe(true);
    });
  });

  describe('triggerHints deduplication', () => {
    it('only fires once per trigger key (in-render dedupe)', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            level: makeLevel({
              tutorialSteps: [],
              tutorialHints: [
                { key: 'h1', text: 'first hint', trigger: 'onEngage' },
                { key: 'h2', text: 'second hint', trigger: 'onEngage' },
              ],
            }),
            isAxiomLevel: true,
            isLevelPreviouslyCompleted: false,
          }),
        );
      });
      await TestRenderer.act(async () => {
        await captured!.triggerHints('onEngage');
      });
      expect(captured!.currentHint?.key).toBe('h1');

      // Second call to same trigger should be deduped — currentHint stays h1.
      await TestRenderer.act(async () => {
        await captured!.triggerHints('onEngage');
      });
      expect(captured!.currentHint?.key).toBe('h1');
    });

    it('clears hintTriggered on level change so a new level can re-fire same trigger', async () => {
      let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(
          React.createElement(Harness, {
            level: makeLevel({
              id: 'A1-1',
              tutorialSteps: [],
              tutorialHints: [{ key: 'h1', text: 'first', trigger: 'onEngage' }],
            }),
            isAxiomLevel: true,
            isLevelPreviouslyCompleted: false,
          }),
        );
      });
      await TestRenderer.act(async () => {
        await captured!.triggerHints('onEngage');
      });
      expect(captured!.currentHint?.key).toBe('h1');

      // Dismiss the hint so we can verify the second one triggers.
      await TestRenderer.act(async () => {
        captured!.dismissHint();
      });

      // Switch level — hintTriggered should clear.
      await TestRenderer.act(async () => {
        renderer.update(
          React.createElement(Harness, {
            level: makeLevel({
              id: 'A1-2',
              tutorialSteps: [],
              tutorialHints: [{ key: 'h2', text: 'second', trigger: 'onEngage' }],
            }),
            isAxiomLevel: true,
            isLevelPreviouslyCompleted: false,
          }),
        );
      });
      // After the level change clears hintTriggered, the same trigger
      // can fire again on the new level's hints.
      await TestRenderer.act(async () => {
        await captured!.triggerHints('onEngage');
      });
      expect(captured!.currentHint?.key).toBe('h2');
    });
  });

  describe('tutorialSpotlightCells', () => {
    it('emits a spotlight cell for each Source and Terminal pre-placed piece', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            level: makeLevel({
              prePlacedPieces: [
                { id: 's', type: 'source', gridX: 1, gridY: 2, rotation: 0, isPrePlaced: true } as never,
                { id: 't', type: 'terminal', gridX: 5, gridY: 6, rotation: 0, isPrePlaced: true } as never,
                { id: 'o', type: 'obstacle', gridX: 3, gridY: 3, rotation: 0, isPrePlaced: true } as never,
              ],
            }),
            isAxiomLevel: true,
            isLevelPreviouslyCompleted: false,
          }),
        );
      });
      expect(captured!.tutorialSpotlightCells).toHaveLength(2);
      expect(captured!.tutorialSpotlightCells.find(c => c.col === 1 && c.row === 2)?.color).toBe('#8B5CF6');
      expect(captured!.tutorialSpotlightCells.find(c => c.col === 5 && c.row === 6)?.color).toBe('#00C48C');
    });
  });
});
