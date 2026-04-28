// React 18+ requires this flag set before any act() calls so the
// concurrent renderer treats this as a test environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: {
  act: (cb: () => void | Promise<void>) => Promise<void> | void;
  create: (
    el: React.ReactElement,
  ) => { update: (el: React.ReactElement) => void; unmount: () => void };
} = require('react-test-renderer');
import { useGameplayModals } from '../../../src/hooks/useGameplayModals';
import type { LevelDefinition } from '../../../src/game/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type HookResult = ReturnType<typeof useGameplayModals>;

let captured: HookResult | null = null;

function Harness(props: { level: LevelDefinition | null }) {
  captured = useGameplayModals(props.level);
  return null;
}

function makeLevel(id: string, sector: string): LevelDefinition {
  return {
    id,
    name: `Level ${id}`,
    sector,
    description: '',
    cogsLine: '',
    gridWidth: 8,
    gridHeight: 7,
    prePlacedPieces: [],
    availablePieces: [],
    dataTrail: { cells: [], headPosition: 0 },
    objectives: [],
    optimalPieces: 1,
  };
}

afterEach(async () => {
  captured = null;
  await AsyncStorage.clear();
});

describe('useGameplayModals', () => {
  describe('initial state', () => {
    it('returns every modal flag as false and every data slot as null/empty', () => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1', 'axiom') }),
        );
      });
      const m = captured!;
      expect(m.showPauseModal).toBe(false);
      expect(m.showAbandonConfirm).toBe(false);
      expect(m.showVoid).toBe(false);
      expect(m.showResults).toBe(false);
      expect(m.showCompletionCard).toBe(false);
      expect(m.showWrongOutput).toBe(false);
      expect(m.wrongOutputData).toBeNull();
      expect(m.showInsufficientPulses).toBe(false);
      expect(m.pulseResultData).toBeNull();
      expect(m.showOutOfLives).toBe(false);
      expect(m.showEconomyIntro).toBe(false);
      expect(m.showSystemRestored).toBeNull();
      expect(m.showCompletionScene).toBe(false);
      expect(m.completionText).toBe('');
      expect(m.showDisciplineCard).toBe(false);
      expect(m.showTeachCard).toBeNull();
      expect(m.scoreResult).toBeNull();
      expect(m.cogsScoreComment).toBe('');
      expect(m.firstTimeBonus).toBe(false);
      expect(m.elaborationMult).toBe(1);
    });

    it('derives anyModalOpen=false at initial render', () => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1', 'axiom') }),
        );
      });
      expect(captured!.anyModalOpen).toBe(false);
    });
  });

  describe('setters', () => {
    beforeEach(() => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1', 'axiom') }),
        );
      });
    });

    it('setShowPauseModal flips the flag', () => {
      TestRenderer.act(() => {
        captured!.setShowPauseModal(true);
      });
      expect(captured!.showPauseModal).toBe(true);
    });

    it('setShowResults flips showResults and propagates into anyModalOpen', () => {
      TestRenderer.act(() => {
        captured!.setShowResults(true);
      });
      expect(captured!.showResults).toBe(true);
      expect(captured!.anyModalOpen).toBe(true);
    });

    it('setWrongOutputData stores the diagnostic payload', () => {
      const payload = { expected: [1, 0, 1], produced: [1, 1, 1] };
      TestRenderer.act(() => {
        captured!.setWrongOutputData(payload);
      });
      expect(captured!.wrongOutputData).toEqual(payload);
    });

    it('setPulseResultData stores the per-pulse payload', () => {
      const payload = { results: [true, false, true], required: 3, achieved: 2 };
      TestRenderer.act(() => {
        captured!.setPulseResultData(payload);
      });
      expect(captured!.pulseResultData).toEqual(payload);
    });

    it('setShowSystemRestored stores the system label string', () => {
      TestRenderer.act(() => {
        captured!.setShowSystemRestored('Life Support');
      });
      expect(captured!.showSystemRestored).toBe('Life Support');
    });

    it('setScoreResult stores the score breakdown', () => {
      const score = {
        stars: 3,
        score: 100,
        breakdown: {
          efficiency: 30,
          protocolPrecision: 25,
          chainIntegrity: 20,
          disciplineBonus: 15,
          speedBonus: 10,
          elaboration: 0,
        },
      };
      TestRenderer.act(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        captured!.setScoreResult(score as any);
      });
      expect(captured!.scoreResult?.stars).toBe(3);
    });
  });

  describe('anyModalOpen derivation', () => {
    beforeEach(() => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1', 'axiom') }),
        );
      });
    });

    it.each([
      ['showPauseModal', 'setShowPauseModal'],
      ['showVoid', 'setShowVoid'],
      ['showResults', 'setShowResults'],
      ['showWrongOutput', 'setShowWrongOutput'],
      ['showInsufficientPulses', 'setShowInsufficientPulses'],
      ['showOutOfLives', 'setShowOutOfLives'],
      ['showCompletionCard', 'setShowCompletionCard'],
    ])('flips when %s flips', (_flag, setter) => {
      TestRenderer.act(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (captured as any)![setter](true);
      });
      expect(captured!.anyModalOpen).toBe(true);
    });

    it('flips when showEconomyIntro flips', () => {
      TestRenderer.act(() => {
        captured!.setShowEconomyIntro(true);
      });
      expect(captured!.anyModalOpen).toBe(true);
    });

    it('does NOT flip for non-blocking flags (showSystemRestored, showCompletionScene, showDisciplineCard, showTeachCard)', () => {
      TestRenderer.act(() => {
        captured!.setShowSystemRestored('Foo');
      });
      expect(captured!.anyModalOpen).toBe(false);
      TestRenderer.act(() => {
        captured!.setShowCompletionScene(true);
      });
      expect(captured!.anyModalOpen).toBe(false);
      TestRenderer.act(() => {
        captured!.setShowDisciplineCard(true);
      });
      expect(captured!.anyModalOpen).toBe(false);
      TestRenderer.act(() => {
        captured!.setShowTeachCard(['line']);
      });
      expect(captured!.anyModalOpen).toBe(false);
    });
  });

  describe('economy intro effect', () => {
    it('does NOT fire on Axiom levels regardless of seen flag', async () => {
      await AsyncStorage.removeItem('axiom_economy_intro_seen');
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-3', 'axiom') }),
        );
      });
      expect(captured!.showEconomyIntro).toBe(false);
    });

    it('fires on non-Axiom levels when the seen flag is unset', async () => {
      await AsyncStorage.removeItem('axiom_economy_intro_seen');
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('K1-1', 'kepler') }),
        );
      });
      expect(captured!.showEconomyIntro).toBe(true);
    });

    it('does NOT fire on non-Axiom levels when the seen flag is set', async () => {
      await AsyncStorage.setItem('axiom_economy_intro_seen', '1');
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('K1-1', 'kepler') }),
        );
      });
      expect(captured!.showEconomyIntro).toBe(false);
    });

    it('does not fire when level is null', async () => {
      await AsyncStorage.removeItem('axiom_economy_intro_seen');
      await TestRenderer.act(async () => {
        TestRenderer.create(React.createElement(Harness, { level: null }));
      });
      expect(captured!.showEconomyIntro).toBe(false);
    });
  });
});
