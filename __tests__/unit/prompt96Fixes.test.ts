// Source-contract guards for the Prompt 96 fix — between pulses,
// reset the flashing / animations / gates Maps on pieceAnimState.
//
// Background: Prompt 94 introduced a per-pulse sweep that clears
// flashTimersRef. That sweep also kills the deferred cleanup timers
// flashPiece / triggerPieceAnim queue to delete entries from those
// Maps. Without explicit Map resets the terminal-piece purple flash
// persists forever and PieceIcon's memo skips re-triggering piece
// animations on pulses 2+ (so the beam appears to skip pieces).

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const screenSrc = read('src/screens/GameplayScreen.tsx');

describe('Prompt 96 — reset pieceAnimState maps between pulses', () => {
  it('per-pulse loop block contains a setPieceAnimState call after the timer sweep', () => {
    // Anchor on the pulse loop and require the setPieceAnimState call
    // to appear before engageRunPulse, after the flashTimersRef sweep.
    const loopBlock = screenSrc.match(
      /for \(let p = 0; p < pulses\.length; p\+\+\) \{[\s\S]*?await engageRunPulse/,
    );
    expect(loopBlock).not.toBeNull();
    expect(loopBlock?.[0]).toMatch(/flashTimersRef\.current\.forEach/);
    expect(loopBlock?.[0]).toMatch(/setPieceAnimState\(prev => \(\{/);
  });

  it('the inter-pulse setPieceAnimState resets flashing / animations / gates to empty Maps', () => {
    const loopBlock = screenSrc.match(
      /for \(let p = 0; p < pulses\.length; p\+\+\) \{[\s\S]*?await engageRunPulse/,
    );
    expect(loopBlock).not.toBeNull();
    const block = loopBlock?.[0] ?? '';
    expect(block).toMatch(/flashing:\s*new Map\(\)/);
    expect(block).toMatch(/animations:\s*new Map\(\)/);
    expect(block).toMatch(/gates:\s*new Map\(\)/);
  });

  it('the inter-pulse reset preserves failColors and locked (uses ...prev spread)', () => {
    // failColors hold the wrong-output red ring state; locked holds
    // the post-run lock-ring set. Both must outlive a pulse boundary.
    const loopBlock = screenSrc.match(
      /for \(let p = 0; p < pulses\.length; p\+\+\) \{[\s\S]*?await engageRunPulse/,
    );
    const block = loopBlock?.[0] ?? '';
    expect(block).toMatch(/setPieceAnimState\(prev => \(\{\s*\.\.\.prev,/);
    expect(block).not.toMatch(/failColors:\s*new Map/);
    expect(block).not.toMatch(/locked:\s*new Set/);
  });

  it('mirrors the shape used by replayLoop reset (the canonical reference)', () => {
    // replayLoop.ts:52-57 is the canonical reset shape. Both call
    // sites should keep the same three keys so future edits stay in
    // sync; if replayLoop changes shape, this test catches drift.
    const replaySrc = read('src/game/engagement/replayLoop.ts');
    const replayReset = replaySrc.match(
      /ctx\.setPieceAnimState\(prev => \(\{[\s\S]*?\}\)\);/,
    );
    expect(replayReset).not.toBeNull();
    const reset = replayReset?.[0] ?? '';
    expect(reset).toMatch(/flashing:\s*new Map\(\)/);
    expect(reset).toMatch(/animations:\s*new Map\(\)/);
    expect(reset).toMatch(/gates:\s*new Map\(\)/);
  });
});
