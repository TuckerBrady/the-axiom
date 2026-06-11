// PROMPT_142 -- GAME-02: A1-4 enforces a minimum number of Gear-driven
// direction changes. reach_output alone lets a zero-bend or one-bend path
// pass once it reaches the Terminal; A1-4 ("we begin teaching the soul of
// the game") requires two bends. The min_direction_changes objective adds
// that gate.

import { levelA1_4 } from '../../../src/game/levels';
import {
  countDirectionChanges,
  meetsDirectionObjectives,
} from '../../../src/game/objectives';
import type { ExecutionStep } from '../../../src/game/types';

// Mirrors the `step()` fixture helper used in the engagement tests.
function step(type: string, pieceId: string, success = true): ExecutionStep {
  return { pieceId, type, timestamp: 0, success };
}

// A path that reaches the Terminal with `bends` Gear-driven direction
// changes. Each Gear is a distinct piece id so the unique-gear counter
// reflects the bend count.
function pathWithBends(bends: number): ExecutionStep[] {
  const steps: ExecutionStep[] = [step('source', 'p-src')];
  for (let i = 0; i < bends; i++) {
    steps.push(step('conveyor', `p-conv-${i}`));
    steps.push(step('gear', `p-gear-${i}`));
  }
  steps.push(step('conveyor', 'p-conv-last'));
  steps.push(step('terminal', 'p-term'));
  return steps;
}

describe('PROMPT_142 -- GAME-02: A1-4 enforces min_direction_changes', () => {
  it('A1-4 objectives include a min_direction_changes objective with count 2', () => {
    expect(levelA1_4.objectives).toEqual(
      expect.arrayContaining([{ type: 'min_direction_changes', count: 2 }]),
    );
  });

  it('still keeps the reach_output objective', () => {
    expect(levelA1_4.objectives).toEqual(
      expect.arrayContaining([{ type: 'reach_output' }]),
    );
  });

  it('counts Gear-driven direction changes by unique Gear in the executed path', () => {
    expect(countDirectionChanges(pathWithBends(0))).toBe(0);
    expect(countDirectionChanges(pathWithBends(1))).toBe(1);
    expect(countDirectionChanges(pathWithBends(2))).toBe(2);
  });

  it('a path through A1-4 with 0 Gear-driven direction changes fails the objective', () => {
    expect(meetsDirectionObjectives(levelA1_4.objectives, pathWithBends(0))).toBe(false);
  });

  it('a path through A1-4 with 1 Gear-driven direction change fails the objective', () => {
    expect(meetsDirectionObjectives(levelA1_4.objectives, pathWithBends(1))).toBe(false);
  });

  it('a path through A1-4 with 2+ Gear-driven direction changes passes the objective', () => {
    expect(meetsDirectionObjectives(levelA1_4.objectives, pathWithBends(2))).toBe(true);
    expect(meetsDirectionObjectives(levelA1_4.objectives, pathWithBends(3))).toBe(true);
  });

  it('a failed (unsuccessful) Gear step does not count toward the requirement', () => {
    const steps = pathWithBends(2).map(s =>
      s.type === 'gear' ? { ...s, success: false } : s,
    );
    expect(countDirectionChanges(steps)).toBe(0);
    expect(meetsDirectionObjectives(levelA1_4.objectives, steps)).toBe(false);
  });

  it('levels with no min_direction_changes objective are unaffected', () => {
    expect(meetsDirectionObjectives([{ type: 'reach_output' }], pathWithBends(0))).toBe(true);
  });
});
