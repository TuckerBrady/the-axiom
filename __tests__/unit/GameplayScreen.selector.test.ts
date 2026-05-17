/**
 * Static analysis: GameplayScreen must use Zustand selectors.
 *
 * React 18 / Zustand v5 require selectors on every store hook call.
 * Calling `useStore()` with no selector returns the entire state
 * object; useSyncExternalStore calls getSnapshot multiple times per
 * render to verify snapshot stability, and a state-object identity
 * that flips between calls (from any concurrent set()) triggers
 * "The result of getSnapshot should be cached to avoid an infinite
 * loop" and "Maximum update depth exceeded" on entering a level.
 *
 * This test scans src/screens/GameplayScreen.tsx and fails CI on
 * any regression where one of the screen's store hooks is called
 * without a selector argument.
 */

import * as fs from 'fs';
import * as path from 'path';

const SCREEN_PATH = path.resolve(
  __dirname,
  '../../src/screens/GameplayScreen.tsx',
);

describe('GameplayScreen Zustand selector usage', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(SCREEN_PATH, 'utf-8');
  });

  it('imports useShallow from zustand/react/shallow', () => {
    expect(source).toContain('useShallow');
  });

  it('does not call useGameStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useGameStore\(\)/);
  });

  it('does not call useLivesStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useLivesStore\(\)/);
  });

  it('does not call useEconomyStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useEconomyStore\(\)/);
  });

  it('does not call useRequisitionStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useRequisitionStore\(\)/);
  });

  it('wraps the arcWheelPieces filter selector with useShallow (no raw filter selector)', () => {
    // .filter() returns a new array reference on every invocation, so a
    // bare `useRequisitionStore(s => s.inventory.pieces.filter(...))`
    // produces an unstable getSnapshot result and re-triggers the
    // useSyncExternalStore infinite-loop bug fixed in PROMPT_117.
    // The selector must be wrapped with useShallow so element-wise
    // shallow equality short-circuits the re-render.
    expect(source).not.toContain('useRequisitionStore(s => s.inventory.pieces.filter');
  });
});
