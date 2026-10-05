// AXM-046 PR 1, R1.2 — ordered checkpoints and the checkpoint_missed failure.
// Clause: AXM-046 DESIGN_SPEC DR-1. A scored pulse is a pulse whose beam the
// Terminal accepted (the spec's A1-2 scores only P2 and P5).
// Written red first.

import { executeMachine } from '../../../src/game/engine';
import { checkpointsPassed, evaluateRunRequirements, runMachine } from '../../../src/game/runLoop';
import { fixtureLevel, piece, pre, stateFor, stateForLevel, E, S } from '../../fixtures/axm046EngineFixtures';

// Source (0,0) east along row 0: cells (1,0)..(4,0), Terminal at (5,0).
// The first two entries are the Source and Terminal; slice(2) is the route.
// T-Bot DR-1 ruling (PR #100 review): credit comes only from the path that
// reached the accepting Terminal, so the engine records that path on request.
const TRACK = { trackPath: true } as const;

function straightBoard(gate?: { at: number; value: 0 | 1 }) {
  const pieces = [pre('source', 0, 0), pre('terminal', 5, 0)];
  for (let x = 1; x <= 4; x++) {
    pieces.push(gate && gate.at === x
      ? piece('configNode', x, 0, { configValue: gate.value })
      : piece('conveyor', x, 0, { rotation: E }));
  }
  return pieces;
}

describe('DR-1 the engine reports checkpoints passed, in pass order', () => {
  it('lists checkpoint indices in the order the beam passed them', () => {
    const pieces = straightBoard();
    const steps = executeMachine(stateFor(pieces), 0, TRACK);
    expect(checkpointsPassed(steps, pieces, [{ x: 2, y: 0 }, { x: 4, y: 0 }])).toEqual([0, 1]);
    expect(checkpointsPassed(steps, pieces, [{ x: 4, y: 0 }, { x: 2, y: 0 }])).toEqual([1, 0]);
  });

  it('a cell the beam never reached is not passed', () => {
    const pieces = straightBoard();
    const steps = executeMachine(stateFor(pieces), 0, TRACK);
    expect(checkpointsPassed(steps, pieces, [{ x: 2, y: 3 }])).toEqual([]);
  });

  it('a gate that held on the checkpoint cell does not count as passing it', () => {
    const pieces = straightBoard({ at: 3, value: 1 });
    const steps = executeMachine(stateFor(pieces, [0]), 0, TRACK);
    expect(checkpointsPassed(steps, pieces, [{ x: 3, y: 0 }])).toEqual([]);
  });

  it('any piece may sit on a checkpoint, the Terminal included', () => {
    const pieces = straightBoard();
    const steps = executeMachine(stateFor(pieces), 0, TRACK);
    expect(checkpointsPassed(steps, pieces, [{ x: 5, y: 0 }])).toEqual([0]);
  });

  it('the run records the checkpoints per pulse', () => {
    const level = fixtureLevel({
      prePlacedPieces: [pre('source', 0, 0), pre('terminal', 5, 0)],
      checkpoints: [{ x: 2, y: 0 }],
      pulseCount: 2,
    });
    const run = runMachine(level, stateForLevel(level, straightBoard().slice(2)), 1);
    expect(run.checkpointsPerPulse).toEqual([[0], [0]]);
  });
});

describe('DR-1 success requires every checkpoint, in order, on every scored pulse', () => {
  const route = () => straightBoard().slice(2);

  it('passes when every checkpoint is hit in list order', () => {
    const level = fixtureLevel({
      prePlacedPieces: [pre('source', 0, 0), pre('terminal', 5, 0)],
      checkpoints: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
    });
    const run = runMachine(level, stateForLevel(level, route()), 1);
    expect(evaluateRunRequirements(level, run)).toEqual({ passed: true });
  });

  it('out of order fails as checkpoint_missed carrying the 0-based index of the first one out of order', () => {
    const level = fixtureLevel({
      prePlacedPieces: [pre('source', 0, 0), pre('terminal', 5, 0)],
      checkpoints: [{ x: 3, y: 0 }, { x: 1, y: 0 }],
    });
    const run = runMachine(level, stateForLevel(level, route()), 1);
    expect(evaluateRunRequirements(level, run).failure).toEqual({ kind: 'checkpoint_missed', index: 1, pulse: 1 });
  });

  it('a checkpoint off the path fails as checkpoint_missed with its index', () => {
    const level = fixtureLevel({
      prePlacedPieces: [pre('source', 0, 0), pre('terminal', 5, 0)],
      checkpoints: [{ x: 1, y: 0 }, { x: 2, y: 2 }],
    });
    const run = runMachine(level, stateForLevel(level, route()), 1);
    expect(evaluateRunRequirements(level, run).failure).toEqual({ kind: 'checkpoint_missed', index: 1, pulse: 1 });
  });

  it('a pulse the Terminal never accepted is not scored, so its checkpoints are not required', () => {
    // Gate 1 at (1,0) reads TRAIL[N]: blocked on P1 (0), open on P2 (1). The
    // checkpoint at (3,0) is downstream of the gate, missed on P1 only.
    const level = fixtureLevel({
      prePlacedPieces: [pre('source', 0, 0), pre('terminal', 5, 0)],
      dataTrail: { cells: [0, 1], headPosition: 0 },
      checkpoints: [{ x: 3, y: 0 }],
      pulseCount: 2,
    });
    const run = runMachine(level, stateForLevel(level, straightBoard({ at: 1, value: 1 }).slice(2)), 1);
    expect(run.reachedPerPulse).toEqual([false, true]);
    expect(evaluateRunRequirements(level, run)).toEqual({ passed: true });
  });

  it('works on a turning route (Gear on the checkpoint)', () => {
    const level = fixtureLevel({
      prePlacedPieces: [pre('source', 0, 0), pre('terminal', 1, 2)],
      checkpoints: [{ x: 1, y: 0 }],
    });
    const run = runMachine(level, stateForLevel(level, [
      piece('gear', 1, 0),
      piece('conveyor', 1, 1, { rotation: S }),
    ]), 1);
    expect(run.reachedPerPulse).toEqual([true]);
    expect(evaluateRunRequirements(level, run)).toEqual({ passed: true });
  });

  it('flags off: a level with no checkpoints never fails on them', () => {
    const level = fixtureLevel({ prePlacedPieces: [pre('source', 0, 0), pre('terminal', 5, 0)] });
    const run = runMachine(level, stateForLevel(level, route()), 1);
    expect(run.checkpointsPerPulse).toEqual([[]]);
    expect(evaluateRunRequirements(level, run)).toEqual({ passed: true });
  });
});

describe('DR-1 ruling (#100 review): only the path that reached the accepting Terminal counts, in path order', () => {
  // Splitter at (1,0). East: (2,0) Conveyor -> Terminal (3,0), the delivering
  // branch. South: (1,1) Conveyor -> (1,2) Conveyor, a stub that dead-ends.
  function splitBoard() {
    return [
      piece('splitter', 1, 0),
      piece('conveyor', 2, 0, { rotation: E }),
      piece('conveyor', 1, 1, { rotation: S }),
      piece('conveyor', 1, 2, { rotation: S }),
    ];
  }
  const level = (checkpoints: { x: number; y: number }[]) => fixtureLevel({
    prePlacedPieces: [pre('source', 0, 0), pre('terminal', 3, 0)],
    checkpoints,
  });

  it('a Splitter stub onto a checkpoint does not satisfy it', () => {
    const l = level([{ x: 1, y: 2 }]);
    const run = runMachine(l, stateForLevel(l, splitBoard()), 1);
    expect(run.reachedPerPulse).toEqual([true]);
    expect(run.checkpointsPerPulse).toEqual([[]]);
    expect(evaluateRunRequirements(l, run).failure).toEqual({ kind: 'checkpoint_missed', index: 0, pulse: 1 });
  });

  it('checkpoints on the delivering branch count, the shared Splitter cell included', () => {
    const l = level([{ x: 1, y: 0 }, { x: 2, y: 0 }]);
    const run = runMachine(l, stateForLevel(l, splitBoard()), 1);
    expect(run.checkpointsPerPulse).toEqual([[0, 1]]);
    expect(evaluateRunRequirements(l, run)).toEqual({ passed: true });
  });

  it('a stub checkpoint the BFS fires between two path checkpoints is not credited', () => {
    // BFS order is (1,0), (1,1) stub, (2,0); the old rule passed this list.
    const l = level([{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }]);
    const run = runMachine(l, stateForLevel(l, splitBoard()), 1);
    expect(evaluateRunRequirements(l, run).failure).toEqual({ kind: 'checkpoint_missed', index: 1, pulse: 1 });
  });

  it('a delivering path is checked in its own order', () => {
    const l = level([{ x: 2, y: 0 }, { x: 1, y: 0 }]);
    const run = runMachine(l, stateForLevel(l, splitBoard()), 1);
    expect(run.checkpointsPerPulse).toEqual([[1, 0]]);
    expect(evaluateRunRequirements(l, run).failure).toEqual({ kind: 'checkpoint_missed', index: 1, pulse: 1 });
  });

  it('two branches into a Merger both deliver, but neither branch precedes the other', () => {
    // Source (0,1) -> Splitter (1,1). Branch A: Gear (1,0), Conveyor (2,0),
    // Gear (3,0), into the Merger's top. Branch B: Conveyor (2,1) into the
    // Merger's west side. Merger (3,1) -> Conveyor (4,1) -> Terminal (5,1).
    const pieces = () => [
      piece('splitter', 1, 1),
      piece('gear', 1, 0),
      piece('conveyor', 2, 0, { rotation: E }),
      piece('gear', 3, 0),
      piece('conveyor', 2, 1, { rotation: E }),
      piece('merger', 3, 1),
      piece('conveyor', 4, 1, { rotation: E }),
    ];
    const at = (checkpoints: { x: number; y: number }[]) => fixtureLevel({
      prePlacedPieces: [pre('source', 0, 1), pre('terminal', 5, 1)],
      checkpoints,
    });
    const parallel = at([{ x: 2, y: 0 }, { x: 2, y: 1 }]);
    const run = runMachine(parallel, stateForLevel(parallel, pieces()), 1);
    expect(run.reachedPerPulse).toEqual([true]);
    // Both branch cells are on the delivering path: both feed the Merger.
    expect([...run.checkpointsPerPulse[0]].sort()).toEqual([0, 1]);
    // Parallel branches have no path order, so "1 then 2" fails.
    expect(evaluateRunRequirements(parallel, run).failure).toEqual({ kind: 'checkpoint_missed', index: 1, pulse: 1 });
    // A branch cell, then a cell after the Merger, is in path order.
    const serial = at([{ x: 2, y: 0 }, { x: 4, y: 1 }]);
    const run2 = runMachine(serial, stateForLevel(serial, pieces()), 1);
    expect(evaluateRunRequirements(serial, run2)).toEqual({ passed: true });
  });
});
