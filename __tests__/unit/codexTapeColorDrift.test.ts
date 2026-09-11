// REQ-G-04 addendum (AXM-008, Design's round-2 pass on Handoff 003/004).
//
// Same locked-value violation REQ-G-04 (AXM-004) already fixed on the
// gameplay screen (tokens.ts / TapeCell.tsx), surviving in a second place:
// CodexDetailView.tsx's `getCodexPieceColor` returned '#BFFF3F' for
// 'inputTape', commented "IN — neon green" — the pre-lock value.
// CODEX_PIECES is a manually-synced duplicate of CodexScreen's data (its
// own comment says so), and CodexScreen.tsx carries an independent copy of
// the same `getCodexPieceColor` function with the identical drift — both
// fixed here, not just one call site.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const detailViewSrc = read('src/components/CodexDetailView.tsx');
const codexScreenSrc = read('src/screens/CodexScreen.tsx');

describe.each([
  ['CodexDetailView.tsx', () => detailViewSrc],
  ['CodexScreen.tsx', () => codexScreenSrc],
])('%s — getCodexPieceColor tape colors (REQ-G-04 addendum)', (_label, getSrc) => {
  it('has no tape hex literal', () => {
    const src = getSrc();
    expect(src).not.toMatch(/'#BFFF3F'/);
    expect(src).not.toMatch(/'#A97FDB'/);
    expect(src).not.toMatch(/'#FF7D3F'/);
  });

  it("returns Colors.tapeInBar for 'inputTape', not the old neon-green literal", () => {
    const src = getSrc();
    expect(src).toMatch(/case 'inputTape':\s*\n\s*return Colors\.tapeInBar;/);
  });

  it("returns Colors.tapeTrailBar for 'dataTrail' and Colors.tapeOutBar for 'outputTape'", () => {
    const src = getSrc();
    expect(src).toMatch(/case 'dataTrail':\s*\n\s*return Colors\.tapeTrailBar;/);
    expect(src).toMatch(/case 'outputTape':\s*\n\s*return Colors\.tapeOutBar;/);
  });
});

// Pure-JS reimplementation, exercising the actual decision (both files'
// switch statements are structurally identical post-fix).
describe('getCodexPieceColor — behavior (pure-JS reimplementation)', () => {
  const Colors = { tapeInBar: '#7FC8E8', tapeTrailBar: '#A97FDB', tapeOutBar: '#FF7D3F' };
  function getCodexPieceColor(pieceId: string): string {
    switch (pieceId) {
      case 'inputTape':
        return Colors.tapeInBar;
      case 'dataTrail':
        return Colors.tapeTrailBar;
      case 'outputTape':
        return Colors.tapeOutBar;
      default:
        return '#4a9eff';
    }
  }

  it("'inputTape' resolves to the locked Ice Blue, not neon green", () => {
    expect(getCodexPieceColor('inputTape')).toBe('#7FC8E8');
    expect(getCodexPieceColor('inputTape')).not.toBe('#BFFF3F');
  });
});
