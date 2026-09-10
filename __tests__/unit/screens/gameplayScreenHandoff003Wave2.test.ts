// Source-contract tests for Handoff 003 Wave 2 (AXM-005) requirements not
// already covered by a dedicated test file: REQ-G-02's engage-row
// persistence (the Parts Tray half lives in PieceTray.test.ts; the beam
// color/crossfade half of REQ-G-05 lives in beamAnimation.test.ts,
// BeamOverlay.test.ts and chargePhase.test.ts; REQ-G-16 lives in
// interactions.test.ts; REQ-G-17 in RequisitionPanel.test.ts; REQ-G-03 in
// ArcWheel.test.ts, RequisitionPanel.test.ts and SpecSheetPanel.test.ts).
// GameplayScreen.tsx is exercised end-to-end on device via Maestro — here
// the contract is verified by source inspection, matching this file's
// established convention (see WireOverlay.test.ts, TapeColorsAndBeam.test.ts).

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const screenSrc = read('src/screens/GameplayScreen.tsx');

describe('REQ-G-02 — the engage row stays mounted through ENGAGE, hidden via style not existence', () => {
  it('no longer gates the engage row on a conditional mount', () => {
    expect(screenSrc).not.toMatch(
      /\{!isExecuting && !showResults && !showVoid && !debugMode && \(\s*<View style=\{styles\.engageRow\}>/,
    );
  });

  it('derives engageRowHidden from the same run-state flags the old mount gate used', () => {
    expect(screenSrc).toMatch(
      /const engageRowHidden = isExecuting \|\| showResults \|\| showVoid \|\| debugMode;/,
    );
  });

  it('applies opacity 0 and pointerEvents none to the row when hidden, without unmounting it', () => {
    expect(screenSrc).toMatch(
      /style=\{\[styles\.engageRow, engageRowHidden && \{ opacity: 0 \}\]\}/,
    );
    expect(screenSrc).toMatch(/pointerEvents=\{engageRowHidden \? 'none' : 'auto'\}/);
  });

  it('disables both RESET and ENGAGE while hidden, so a stray touch during the transition cannot fire either', () => {
    expect(screenSrc).toMatch(/disabled=\{engageRowHidden\}/); // RESET
    expect(screenSrc).toMatch(/disabled=\{engageRowHidden \|\| !hasPlacedPieces\}/); // ENGAGE
  });
});

// REQ-G-03 (Handoff 003) / DEC-2 (ratified 2026-09-10): dragHoverCellValid
// was held pending the amber decision; now cleared to match ghostInnerValid
// (copper) instead of the Physics beam amber.
describe('REQ-G-03 — dragHoverCellValid matches ghostInnerValid (copper), not the beam amber', () => {
  it('uses Colors.copper, not the old #F0B429 literal', () => {
    expect(screenSrc).toMatch(/dragHoverCellValid:\s*\{\s*borderColor:\s*Colors\.copper,/);
    expect(screenSrc).not.toMatch(/dragHoverCellValid:\s*\{\s*borderColor:\s*'#F0B429',/);
  });
});
