// Source-contract test for AXM-001 D-05's board overlay chip: exact
// numeric values (count, storedValue, configValue) render outside the
// rotated View in BoardPiece.tsx, at an 11pt floor, instead of as
// SvgText inside PieceIcon (unreadable at 5-9pt). The .ts unit project
// cannot render the JSX-using component, so this verifies the
// contract by source inspection, matching BoardPieceFlash.test.ts.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const src = fs.readFileSync(
  path.resolve(repoRoot, 'src/components/gameplay/BoardPiece.tsx'),
  'utf8',
);

describe('BoardPiece — D-05 board overlay chip', () => {
  it('derives the overlay value from the piece, not from PieceIcon', () => {
    expect(src).toMatch(/function boardOverlayValue\(piece: PlacedPiece\): string \| null/);
    expect(src).toMatch(/case 'counter':/);
    expect(src).toMatch(/case 'latch':/);
    expect(src).toMatch(/case 'configNode':/);
  });

  it('renders the chip outside the rotated View (as a sibling, after it closes)', () => {
    const rotatedViewIndex = src.indexOf("transform: [{ rotate: `${!isPrePlaced ? piece.rotation");
    const chipIndex = src.indexOf('overlayChip');
    expect(rotatedViewIndex).toBeGreaterThan(-1);
    expect(chipIndex).toBeGreaterThan(rotatedViewIndex);
  });

  it('the chip is non-interactive (pointerEvents="none") so it never blocks piece taps', () => {
    expect(src).toMatch(/overlayChip[\s\S]{0,80}pointerEvents="none"/);
  });

  it('the chip text sits at the 11pt floor', () => {
    expect(src).toMatch(/overlayChipText:\s*\{\s*[\s\S]*?fontSize:\s*FontSizes\.floor/);
  });

  it('only renders when a value exists (null suppresses the chip)', () => {
    expect(src).toMatch(/overlayValue !== null &&/);
  });
});
