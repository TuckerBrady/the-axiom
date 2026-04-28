jest.mock('../../../src/game/engagement/bubbleHelpers', () => {
  const actual = jest.requireActual('../../../src/game/engagement/bubbleHelpers');
  return {
    ...actual,
    wait: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('../../../src/game/engagement/valueTravelAnimation', () => ({
  runValueTravel: jest.fn(() => Promise.resolve()),
  resetGlowTraveler: jest.fn(),
}));

jest.mock('../../../src/store/gameStore', () => ({
  useGameStore: {
    getState: jest.fn(() => ({
      machineState: {
        dataTrail: { cells: [0, 1, 0], headPosition: 0 },
        outputTape: [-1, -1, -1],
      },
    })),
  },
}));

import * as fs from 'fs';
import * as path from 'path';
import { runConfigNodeInteraction } from '../../../src/game/engagement/interactions';
import type {
  EngagementContext,
  ExecutionStep,
  GateOutcomeMap,
} from '../../../src/game/engagement/types';

const gameplayScreenSource = fs.readFileSync(
  path.resolve(__dirname, '../../../src/screens/GameplayScreen.tsx'),
  'utf8',
);
// Prompt 99B — OUT tape rendering moved to TapeCell.tsx.
const tapeCellSource = fs.readFileSync(
  path.resolve(__dirname, '../../../src/components/gameplay/TapeCell.tsx'),
  'utf8',
);
const tapeBarShellSource = fs.readFileSync(
  path.resolve(__dirname, '../../../src/components/gameplay/TapeBarShell.tsx'),
  'utf8',
);

function buildCtx(): {
  ctx: EngagementContext;
  gateOutcomes: GateOutcomeMap;
  barUpdates: Array<Record<string, number | null>>;
  outputOverrideUpdates: Array<number[] | null>;
  highlightSets: Array<[string, string]>;
} {
  const gateOutcomes: GateOutcomeMap = new Map();
  const barUpdates: Array<Record<string, number | null>> = [];
  const outputOverrideUpdates: Array<number[] | null> = [];
  const highlightSets: Array<[string, string]> = [];

  const ctx = {
    setPieceAnimState: jest.fn(),
    setTapeBarState: jest.fn((arg: unknown) => {
      if (typeof arg === 'function') {
        const next = (arg as (p: Record<string, number | null>) => Record<string, number | null>)(
          { inIndex: null, trailIndex: null, outIndex: null },
        );
        barUpdates.push(next);
      } else {
        barUpdates.push(arg as Record<string, number | null>);
      }
    }),
    setGlowTravelerState: jest.fn(),
    valueTravelRefs: {
      x: { setValue: jest.fn() },
      y: { setValue: jest.fn() },
      scale: { setValue: jest.fn() },
      opacity: { setValue: jest.fn() },
    },
    gateOutcomes: { current: gateOutcomes },
    flashTimersRef: { current: [] as ReturnType<typeof setTimeout>[] },
    currentPulseRef: { current: 0 },
    getPieceCenter: jest.fn(() => ({ x: 10, y: 20 })),
    setTapeCellHighlights: jest.fn((arg: unknown) => {
      if (typeof arg === 'function') {
        const result = (arg as (p: Map<string, string>) => Map<string, string>)(
          new Map(),
        );
        for (const [k, v] of result) highlightSets.push([k, v]);
      }
    }),
    setVisualTrailOverride: jest.fn(),
    setVisualOutputOverride: jest.fn((arg: unknown) => {
      if (typeof arg === 'function') {
        const seed: number[] = [-1, -1, -1];
        const next = (arg as (p: number[] | null) => number[] | null)(seed);
        outputOverrideUpdates.push(next);
      } else {
        outputOverrideUpdates.push(arg as number[] | null);
      }
    }),
    cacheRef: {
      current: {
        board: { x: 0, y: 0 },
        input: { x: 100, y: 200, w: 20, h: 30 },
        trail: { x: 100, y: 300, w: 20, h: 30 },
        output: { x: 100, y: 400, w: 20, h: 30 },
      },
    },
    runId: 1,
    currentRunIdRef: { current: 1 },
  } as unknown as EngagementContext;

  return { ctx, gateOutcomes, barUpdates, outputOverrideUpdates, highlightSets };
}

function step(type: string, pieceId: string, success = true): ExecutionStep {
  return { pieceId, type, success } as ExecutionStep;
}

describe('gate-outcome coloring — interactions', () => {
  it("records 'passed' outcome when the gate passes", async () => {
    const { ctx, gateOutcomes } = buildCtx();
    ctx.currentPulseRef.current = 2;
    await runConfigNodeInteraction(ctx, step('configNode', 'p-c', true));
    expect(gateOutcomes.get(2)).toBe('passed');
  });

  it("records 'blocked' outcome when the gate fails", async () => {
    const { ctx, gateOutcomes } = buildCtx();
    ctx.currentPulseRef.current = 1;
    await runConfigNodeInteraction(ctx, step('configNode', 'p-c', false));
    expect(gateOutcomes.get(1)).toBe('blocked');
  });

  it('blocked gate slides OUT bar and sets OUT cell highlight', async () => {
    const { ctx, barUpdates, highlightSets } = buildCtx();
    ctx.currentPulseRef.current = 2;
    await runConfigNodeInteraction(ctx, step('configNode', 'p-c', false));
    const outBarUpdate = barUpdates.find(u => u.outIndex === 2);
    expect(outBarUpdate).toBeDefined();
    const outHighlight = highlightSets.find(
      ([k, v]) => k === 'out-2' && v === 'gate-block',
    );
    expect(outHighlight).toBeDefined();
  });

  it('blocked gate writes the -2 sentinel into visualOutputOverride at the pulse index', async () => {
    const { ctx, outputOverrideUpdates } = buildCtx();
    ctx.currentPulseRef.current = 2;
    await runConfigNodeInteraction(ctx, step('configNode', 'p-c', false));
    const sentinelWrite = outputOverrideUpdates.find(
      u => Array.isArray(u) && u[2] === -2,
    );
    expect(sentinelWrite).toBeDefined();
  });

  it('passed gate does NOT set the OUT bar or write the -2 sentinel', async () => {
    const { ctx, barUpdates, outputOverrideUpdates, highlightSets } = buildCtx();
    ctx.currentPulseRef.current = 0;
    await runConfigNodeInteraction(ctx, step('configNode', 'p-c', true));
    const outBarUpdate = barUpdates.find(u => u.outIndex === 0);
    expect(outBarUpdate).toBeUndefined();
    const sentinelWrite = outputOverrideUpdates.find(
      u => Array.isArray(u) && u.some(v => v === -2),
    );
    expect(sentinelWrite).toBeUndefined();
    const outBlockHighlight = highlightSets.find(
      ([k, v]) => k === 'out-0' && v === 'gate-block',
    );
    expect(outBlockHighlight).toBeUndefined();
  });
});

describe('GateOutcomeMap', () => {
  it('clears cleanly between replay loops', () => {
    const map: GateOutcomeMap = new Map();
    map.set(0, 'passed');
    map.set(1, 'blocked');
    map.set(2, 'passed');
    expect(map.size).toBe(3);
    map.clear();
    expect(map.size).toBe(0);
    expect(map.get(0)).toBeUndefined();
  });
});

describe('OUT tape rendering — source contract (extracted to TapeCell + TapeBarShell in Prompt 99B)', () => {
  it('green styling requires hasValue (Prompt 104 Fix 3 — preserved through Prompt 106)', () => {
    // The green cell style must only appear when the Transmitter has
    // physically written a value. A bare `gatePassed && styles.tapeCellGatePassed`
    // would color the cell green at the Config Node step, which looks
    // like "data printed at the gate" to the player.
    expect(tapeCellSource).toMatch(
      /styleAsPassed = !!gatePassed && cellHasWrittenValue/,
    );
    expect(tapeCellSource).toMatch(
      /styleAsPassed && styles\.tapeCellGatePassed/,
    );
    expect(tapeCellSource).not.toMatch(
      /(?<!\()gatePassed && styles\.tapeCellGatePassed/,
    );
  });

  it('red blocked styling only applies when no value was written (Prompt 106 Fix 1)', () => {
    // When the Transmitter wrote the value upstream and a Config Node
    // blocked downstream, the cell must show the value with neutral
    // styling — not red. Red blocked styling is reserved for cells
    // where the Transmitter never reached.
    expect(tapeCellSource).toMatch(
      /styleAsBlocked = !!gateBlocked && !cellHasWrittenValue/,
    );
    expect(tapeCellSource).toMatch(
      /styleAsBlocked && styles\.tapeCellGateBlocked/,
    );
    // The OUT-cell derivation logic still lives in TapeBarShell.tsx —
    // it computes gateBlocked / isBlocked before passing per-cell
    // props down to TapeCell.
    expect(tapeBarShellSource).toMatch(
      /const gateBlocked = outcome === 'blocked' \|\| isBlocked;/,
    );
    expect(tapeBarShellSource).toMatch(/const isBlocked = rawWritten === -2;/);
  });

  it('always shows the written value when hasValue is true (Prompt 106 Fix 1)', () => {
    // The display predicate is hasValue alone. A downstream block does
    // not erase the value the Transmitter already wrote upstream.
    expect(tapeCellSource).toMatch(
      /cellHasWrittenValue \? written : gateBlocked \? '·' : '_'/,
    );
    // The pre-Prompt-106 ternary (`gatePassed && hasValue ? written : gateBlocked ? '·' : '_'`)
    // would fall through to '·' on hasValue=true && gateBlocked=true,
    // hiding a value that was already on the tape. Make sure no future
    // refactor reintroduces it.
    expect(tapeCellSource).not.toMatch(
      /gatePassed && hasValue\s*\n?\s*\?\s*written/,
    );
  });

  it('keeps the legacy tapeCellCorrect / tapeCellWrong styles for Kepler reuse', () => {
    // Legacy styles intentionally retained in GameplayScreen.tsx.
    expect(gameplayScreenSource).toMatch(/tapeCellCorrect: \{/);
    expect(gameplayScreenSource).toMatch(/tapeCellWrong: \{/);
    expect(gameplayScreenSource).toMatch(
      /Legacy: retained for non-gate output comparison \(Kepler Belt\)/,
    );
  });

  it('hasValue excludes both -1 (empty) and -2 (blocked) sentinels', () => {
    expect(tapeBarShellSource).toMatch(
      /written !== undefined && written !== -1 && written !== -2/,
    );
  });
});
