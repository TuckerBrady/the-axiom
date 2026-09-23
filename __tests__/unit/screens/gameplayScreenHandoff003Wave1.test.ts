// Source-contract tests for Handoff 003 Wave 1 (AXM-004), the requirements
// not already covered by a dedicated test file: REQ-G-01 (MIN_CELL clamp
// removal + touch-target hitSlop) and REQ-G-14 / REQ-G-15 (dot grid +
// blown-cell scar tokens). REQ-G-04 (tape colors) is covered by
// TapeColorsAndBeam.test.ts; REQ-G-07 (wire colors) by WireOverlay.test.ts;
// REQ-G-08 pt 1 (void quote) by failureHandlers.test.ts,
// useGameplayFailure.test.tsx and GameplayModals.test.tsx; REQ-G-11 (dead
// styles) by gateOutcomeColoring.test.ts. GameplayScreen.tsx is exercised
// end-to-end on device via Maestro — here the contract is verified by
// source inspection, matching this file's existing test convention (see
// WireOverlay.test.ts, TapeColorsAndBeam.test.ts, GameplayModals.test.tsx).

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const screenSrc = read('src/screens/GameplayScreen.tsx');
const boardPieceSrc = read('src/components/gameplay/BoardPiece.tsx');

describe('REQ-G-01 — MIN_CELL clamp removed, touch targets preserved via hitSlop', () => {
  it('does not declare a MIN_CELL floor', () => {
    expect(screenSrc).not.toMatch(/const MIN_CELL\s*=/);
  });

  it('CELL_SIZE computation keeps MAX_CELL but no longer clamps to a minimum', () => {
    expect(screenSrc).toMatch(
      /Math\.min\(MAX_CELL, Math\.floor\(Math\.min\(availW \/ numColumns, availH \/ numRows\)\)\)/,
    );
    // The removed clamp — Math.max(MIN_CELL, ...) — must not reappear.
    expect(screenSrc).not.toMatch(/Math\.max\(MIN_CELL/);
  });

  it('pads the ghost-cell TouchableOpacity to the 44pt touch-target floor via hitSlop', () => {
    expect(screenSrc).toMatch(/const MIN_TOUCH_TARGET = 44;/);
    expect(screenSrc).toMatch(
      /const ghostCellSlop = Math\.max\(0, \(MIN_TOUCH_TARGET - CELL_SIZE\) \/ 2\);/,
    );
    expect(screenSrc).toMatch(
      /hitSlop=\{\{ top: ghostCellSlop, bottom: ghostCellSlop, left: ghostCellSlop, right: ghostCellSlop \}\}/,
    );
  });

  it('BoardPiece pads its Pressable to the 44pt touch-target floor via hitSlop, independent of the drawn piece size', () => {
    expect(boardPieceSrc).toMatch(/const MIN_TOUCH_TARGET = 44;/);
    expect(boardPieceSrc).toMatch(
      /const touchSlop = Math\.max\(0, \(MIN_TOUCH_TARGET - pieceSize\) \/ 2\);/,
    );
    expect(boardPieceSrc).toMatch(
      /hitSlop=\{\{ top: touchSlop, bottom: touchSlop, left: touchSlop, right: touchSlop \}\}/,
    );
  });
});

describe('REQ-G-14 — dot grid no longer draws a phantom row/column', () => {
  it('iterates numRows x numColumns, not (numRows + 1) x (numColumns + 1)', () => {
    expect(screenSrc).toMatch(
      /Array\.from\(\{ length: numRows \}, \(_, y\) =>\s*\n\s*Array\.from\(\{ length: numColumns \}, \(_, x\) => \(/,
    );
    expect(screenSrc).not.toMatch(/length: numRows \+ 1/);
    expect(screenSrc).not.toMatch(/length: numColumns \+ 1/);
  });
});

describe('REQ-G-15 — damaged cells use palette tokens, not off-token oranges', () => {
  // The clause is "no off-token colour in the damaged-cell drawing". The
  // drawing it originally described — a copper/red blast crater inlined in
  // GameplayScreen — was replaced on 2026-09-20 by the "missing plate"
  // treatment Tucker approved, which lives in DamagedCell.tsx and carries no
  // colour at all. The token rule is asserted against its new home; the
  // off-token-orange ban below is unchanged.
  const damagedCellSrc = read('src/components/gameplay/DamagedCell.tsx');

  it('draws the damaged cell from tokens only — no colour literals', () => {
    expect(damagedCellSrc).toMatch(/from '\.\.\/\.\.\/theme\/tokens'/);
    expect(damagedCellSrc.match(/#[0-9A-Fa-f]{3,8}/g) ?? []).toEqual([]);
  });

  it('no longer inlines the crater in GameplayScreen', () => {
    expect(screenSrc).toMatch(/<DamagedCell\b/);
    expect(screenSrc).not.toMatch(/Blast pit/);
  });

  it('no longer contains the off-token scar oranges', () => {
    expect(screenSrc).not.toMatch(/rgba\(176,106,44/);
    expect(screenSrc).not.toMatch(/rgba\(200,72,40/);
    expect(damagedCellSrc).not.toMatch(/rgba\(176,106,44/);
    expect(damagedCellSrc).not.toMatch(/rgba\(200,72,40/);
  });
});

describe('REQ-G-04 (glow traveler) — tints to destination layer via props, not remount', () => {
  it('derives glowTravelerColor from tape.glowTravelerState.layer via a tokens.ts lookup, not a hardcoded hex', () => {
    expect(screenSrc).toMatch(
      /const glowTravelerColor = GLOW_TRAVELER_COLORS\[tape\.glowTravelerState\.layer \?\? 'trail'\];/,
    );
    expect(screenSrc).not.toMatch(/'#00E5FF'/);
  });

  it('applies the derived color to the same already-mounted RNAnimated.View host (border/background/shadow/text), not a new host', () => {
    // Exactly one glow-traveler host in the render tree.
    const hostMatches = screenSrc.match(/<RNAnimated\.View[\s\S]*?styles\.glowTraveler,/g) ?? [];
    expect(hostMatches.length).toBe(1);
    expect(screenSrc).toMatch(/borderColor: glowTravelerColor,/);
    expect(screenSrc).toMatch(/backgroundColor: glowTravelerTint,/);
    expect(screenSrc).toMatch(/shadowColor: glowTravelerColor,/);
  });
});
