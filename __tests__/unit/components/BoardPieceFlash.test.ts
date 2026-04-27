// Source-contract tests for BoardPiece's native-driven flash (Prompt
// 99C, Fix 1 option b). The .ts unit project cannot render the
// JSX-using component, so these tests verify the contract by source
// inspection. Behavioral coverage of the rendered fade lives in
// Maestro.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const pieceSrc = fs.readFileSync(
  path.resolve(repoRoot, 'src/components/gameplay/BoardPiece.tsx'),
  'utf8',
);
const bubbleSrc = fs.readFileSync(
  path.resolve(repoRoot, 'src/game/engagement/bubbleHelpers.ts'),
  'utf8',
);

describe('BoardPiece — native-driven flash overlay (Prompt 99C, Fix 1)', () => {
  it('allocates a per-piece flashOpacity Animated.Value via useRef', () => {
    expect(pieceSrc).toMatch(
      /const flashOpacity = useRef\(new Animated\.Value\(0\)\)\.current/,
    );
  });

  it('renders an Animated.View overlay whose opacity reads flashOpacity', () => {
    expect(pieceSrc).toMatch(/<Animated\.View[\s\S]*?opacity:\s*flashOpacity/);
  });

  it('runs an Animated.sequence of two 90ms timings, both native', () => {
    const sequenceMatch = pieceSrc.match(
      /Animated\.sequence\(\s*\[[\s\S]*?\]\s*\)/,
    );
    expect(sequenceMatch).toBeTruthy();
    const body = sequenceMatch![0];
    const timings = body.match(/Animated\.timing\([\s\S]*?\}\)/g) ?? [];
    expect(timings.length).toBe(2);
    timings.forEach(t => {
      expect(t).toMatch(/useNativeDriver:\s*true/);
      expect(t).toMatch(/duration:\s*FLASH_HALF_MS/);
    });
    expect(pieceSrc).toMatch(/FLASH_HALF_MS\s*=\s*90/);
  });

  it('triggers the sequence on flashCounter advance, not on color change', () => {
    // Counter-based trigger so successive flashes of the SAME color
    // still fire (a recurring source piece flash, for instance).
    expect(pieceSrc).toMatch(
      /useEffect\([\s\S]*?lastCounterRef\.current[\s\S]*?\[flashCounter,\s*flashColor,\s*flashOpacity\]/,
    );
  });

  it('flashColor + flashCounter live on PieceAnimProps so siblings do not re-render', () => {
    expect(pieceSrc).toMatch(/flashColor:\s*string \| null/);
    expect(pieceSrc).toMatch(/flashCounter:\s*number/);
    expect(pieceSrc).toMatch(/a\.flashColor === b\.flashColor/);
    expect(pieceSrc).toMatch(/a\.flashCounter === b\.flashCounter/);
  });
});

describe('flashPiece — single setPieceAnimState, no flash-off setTimeout', () => {
  it('does not schedule a setTimeout to clear the flash entry', () => {
    // Prompt 99C, Fix 1 step 3: the flash-off setTimeout(..., 180)
    // and the flashTimersRef.current.push(t) tracking are both gone.
    // The native opacity sequence drives both halves.
    const flashFnMatch = bubbleSrc.match(
      /export function flashPiece\([\s\S]*?\n\}/,
    );
    expect(flashFnMatch).toBeTruthy();
    const body = flashFnMatch![0];
    expect(body).not.toMatch(/setTimeout/);
    expect(body).not.toMatch(/flashTimersRef/);
  });

  it('writes flashing AND increments flashCounter inside one setter call', () => {
    const flashFnMatch = bubbleSrc.match(
      /export function flashPiece\([\s\S]*?\n\}/,
    );
    expect(flashFnMatch).toBeTruthy();
    const body = flashFnMatch![0];
    // One setPieceAnimState invocation; both fields touched in the
    // same updater so the change is one render, not two.
    const setterCount = (body.match(/setPieceAnimState\(/g) ?? []).length;
    expect(setterCount).toBe(1);
    expect(body).toMatch(/flashing\.set/);
    expect(body).toMatch(/flashCounter\.set/);
  });
});

describe('FlashBatch — per-tick batching of multi-piece flashes', () => {
  it('makeFlashBatch creates an empty container with flashes/animations/gates', () => {
    expect(bubbleSrc).toMatch(/export function makeFlashBatch/);
    expect(bubbleSrc).toMatch(/flashes:\s*\[\]/);
    expect(bubbleSrc).toMatch(/animations:\s*\[\]/);
    expect(bubbleSrc).toMatch(/gates:\s*\[\]/);
  });

  it('applyFlashBatch dispatches a single setPieceAnimState for the batch', () => {
    const applyMatch = bubbleSrc.match(
      /export function applyFlashBatch\([\s\S]*?\n\}/,
    );
    expect(applyMatch).toBeTruthy();
    const body = applyMatch![0];
    const setterCount = (body.match(/setPieceAnimState\(/g) ?? []).length;
    expect(setterCount).toBe(1);
  });
});
