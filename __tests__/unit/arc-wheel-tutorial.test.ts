// Arc Wheel Tutorial — useGameplayTutorial hook coverage
// Covers the onPiecePlaced / onPieceTapped callbacks, level-change
// resets, and ref stability added in the arc-wheel-tutorial spec.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: {
  act: (cb: () => void | Promise<void>) => Promise<void>;
  create: (el: React.ReactElement) => { update: (el: React.ReactElement) => void; unmount: () => void };
} = require('react-test-renderer');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameplayTutorial } from '../../src/hooks/useGameplayTutorial';
import type { LevelDefinition } from '../../src/game/types';

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

function makeLevel(id = 'A1-1', overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id,
    name: `Level ${id}`,
    sector: 'axiom',
    description: '',
    cogsLine: '',
    gridWidth: 8,
    gridHeight: 7,
    prePlacedPieces: [],
    availablePieces: ['conveyor'],
    dataTrail: { cells: [], headPosition: 0 },
    objectives: [],
    optimalPieces: 1,
    tutorialSteps: [{ id: 's1', label: 'STEP', message: 'go', targetRef: 'sourceNode', eyeState: 'blue' }],
    tutorialHints: [],
    ...overrides,
  } as LevelDefinition;
}

afterEach(async () => {
  captured = null;
  await AsyncStorage.clear();
});

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

describe('arc-wheel-tutorial — useGameplayTutorial', () => {
  // ── 1: onPiecePlaced fires lastPlacedTrigger with correct type ──────────────
  it('1: onPiecePlaced fires lastPlacedTrigger with the placed piece type', async () => {
    await TestRenderer.act(async () => {
      TestRenderer.create(React.createElement(Harness, {
        level: makeLevel(),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    await TestRenderer.act(async () => {
      captured!.onPiecePlaced('conveyor', 2, 3);
    });
    expect(captured!.lastPlacedTrigger?.type).toBe('conveyor');
  });

  // ── 2: onPiecePlaced increments seq monotonically ───────────────────────────
  it('2: onPiecePlaced increments seq on each call', async () => {
    await TestRenderer.act(async () => {
      TestRenderer.create(React.createElement(Harness, {
        level: makeLevel(),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    await TestRenderer.act(async () => {
      captured!.onPiecePlaced('conveyor', 2, 3);
    });
    const seq1 = captured!.lastPlacedTrigger!.seq;
    await TestRenderer.act(async () => {
      captured!.onPiecePlaced('gear', 4, 5);
    });
    const seq2 = captured!.lastPlacedTrigger!.seq;
    expect(seq2).toBeGreaterThan(seq1);
  });

  // ── 3: same piece type placed twice still increments seq ────────────────────
  it('3: placing the same type twice still increments seq (dedup prevention)', async () => {
    await TestRenderer.act(async () => {
      TestRenderer.create(React.createElement(Harness, {
        level: makeLevel(),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    await TestRenderer.act(async () => {
      captured!.onPiecePlaced('conveyor', 1, 1);
    });
    const seq1 = captured!.lastPlacedTrigger!.seq;
    await TestRenderer.act(async () => {
      captured!.onPiecePlaced('conveyor', 1, 2);
    });
    const seq2 = captured!.lastPlacedTrigger!.seq;
    expect(seq2).toBeGreaterThan(seq1);
    expect(captured!.lastPlacedTrigger!.type).toBe('conveyor');
  });

  // ── 4: onPiecePlaced updates tutorialPlacedGridPos ─────────────────────────
  it('4: onPiecePlaced stores the placed piece grid coordinates', async () => {
    await TestRenderer.act(async () => {
      TestRenderer.create(React.createElement(Harness, {
        level: makeLevel(),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    await TestRenderer.act(async () => {
      captured!.onPiecePlaced('conveyor', 3, 5);
    });
    expect(captured!.tutorialPlacedGridPos).toEqual({ gridX: 3, gridY: 5 });
  });

  // ── 5: onPieceTapped fires lastTappedTrigger with correct type ──────────────
  it('5: onPieceTapped fires lastTappedTrigger with the tapped piece type', async () => {
    await TestRenderer.act(async () => {
      TestRenderer.create(React.createElement(Harness, {
        level: makeLevel(),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    await TestRenderer.act(async () => {
      captured!.onPieceTapped('configNode');
    });
    expect(captured!.lastTappedTrigger?.type).toBe('configNode');
  });

  // ── 6: onPieceTapped increments seq monotonically ───────────────────────────
  it('6: onPieceTapped increments seq on each call', async () => {
    await TestRenderer.act(async () => {
      TestRenderer.create(React.createElement(Harness, {
        level: makeLevel(),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    await TestRenderer.act(async () => {
      captured!.onPieceTapped('configNode');
    });
    const seq1 = captured!.lastTappedTrigger!.seq;
    await TestRenderer.act(async () => {
      captured!.onPieceTapped('conveyor');
    });
    const seq2 = captured!.lastTappedTrigger!.seq;
    expect(seq2).toBeGreaterThan(seq1);
  });

  // ── 7: same piece type tapped twice still increments seq ────────────────────
  it('7: tapping the same type twice still increments seq (dedup prevention)', async () => {
    await TestRenderer.act(async () => {
      TestRenderer.create(React.createElement(Harness, {
        level: makeLevel(),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    await TestRenderer.act(async () => {
      captured!.onPieceTapped('configNode');
    });
    const seq1 = captured!.lastTappedTrigger!.seq;
    await TestRenderer.act(async () => {
      captured!.onPieceTapped('configNode');
    });
    const seq2 = captured!.lastTappedTrigger!.seq;
    expect(seq2).toBeGreaterThan(seq1);
  });

  // ── 8: lastPlacedTrigger resets to null on level change ─────────────────────
  it('8: lastPlacedTrigger resets to null when level changes', async () => {
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness, {
        level: makeLevel('A1-1'),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    await TestRenderer.act(async () => {
      captured!.onPiecePlaced('conveyor', 1, 1);
    });
    expect(captured!.lastPlacedTrigger).not.toBeNull();

    await TestRenderer.act(async () => {
      renderer.update(React.createElement(Harness, {
        level: makeLevel('A1-2'),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    await TestRenderer.act(async () => { await flush(); });
    expect(captured!.lastPlacedTrigger).toBeNull();
  });

  // ── 9: lastTappedTrigger resets to null on level change ─────────────────────
  it('9: lastTappedTrigger resets to null when level changes', async () => {
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness, {
        level: makeLevel('A1-1'),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    await TestRenderer.act(async () => {
      captured!.onPieceTapped('configNode');
    });
    expect(captured!.lastTappedTrigger).not.toBeNull();

    await TestRenderer.act(async () => {
      renderer.update(React.createElement(Harness, {
        level: makeLevel('A1-2'),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    await TestRenderer.act(async () => { await flush(); });
    expect(captured!.lastTappedTrigger).toBeNull();
  });

  // ── 10: tutorialPlacedGridPos resets to null on level change ────────────────
  it('10: tutorialPlacedGridPos resets to null when level changes', async () => {
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness, {
        level: makeLevel('A1-1'),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    await TestRenderer.act(async () => {
      captured!.onPiecePlaced('conveyor', 2, 3);
    });
    expect(captured!.tutorialPlacedGridPos).toEqual({ gridX: 2, gridY: 3 });

    await TestRenderer.act(async () => {
      renderer.update(React.createElement(Harness, {
        level: makeLevel('A1-2'),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    await TestRenderer.act(async () => { await flush(); });
    expect(captured!.tutorialPlacedGridPos).toBeNull();
  });

  // ── 11: arcWheelMainRef identity is stable across renders ───────────────────
  it('11: arcWheelMainRef has a stable object identity across re-renders', async () => {
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness, {
        level: makeLevel(),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    const ref1 = captured!.arcWheelMainRef;

    await TestRenderer.act(async () => {
      renderer.update(React.createElement(Harness, {
        level: makeLevel(),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    expect(captured!.arcWheelMainRef).toBe(ref1);
  });

  // ── 12: placedPieceRef identity is stable across renders ────────────────────
  it('12: placedPieceRef has a stable object identity across re-renders', async () => {
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness, {
        level: makeLevel(),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    const ref1 = captured!.placedPieceRef;

    await TestRenderer.act(async () => {
      renderer.update(React.createElement(Harness, {
        level: makeLevel(),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    expect(captured!.placedPieceRef).toBe(ref1);
  });

  // ── 13: tutorialTargetRefs includes arcWheelMain and placedPiece ────────────
  it('13: tutorialTargetRefs memo includes arcWheelMain and placedPiece pointing to the correct refs', async () => {
    await TestRenderer.act(async () => {
      TestRenderer.create(React.createElement(Harness, {
        level: makeLevel(),
        isAxiomLevel: true,
        isLevelPreviouslyCompleted: false,
      }));
    });
    const { tutorialTargetRefs, arcWheelMainRef, placedPieceRef } = captured!;
    expect(tutorialTargetRefs.arcWheelMain).toBe(arcWheelMainRef);
    expect(tutorialTargetRefs.placedPiece).toBe(placedPieceRef);
  });
});
