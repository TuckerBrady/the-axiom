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

// REQ-G-06 (Handoff 003): the chip itself was correct — 11pt starWhite,
// outside the rotation transform — but its position wasn't. At
// `bottom: -2, right: -2` on a `cellSize - 4` pressable, a Counter's "0/2"
// sat mostly outside the piece box and clipped at the board's right/bottom
// edge, where the Terminal usually sits.
describe('BoardPiece — D-05 chip position (REQ-G-06)', () => {
  it('insets the chip inside the piece box (was bottom/right: -2)', () => {
    expect(src).toMatch(/overlayChip:\s*\{\s*position:\s*'absolute',\s*bottom:\s*1,\s*right:\s*1,/);
    expect(src).not.toMatch(/bottom:\s*-2,\s*right:\s*-2,/);
  });

  it('shrinks paddingHorizontal to 2 at three glyphs or more (else 3)', () => {
    expect(src).toMatch(
      /const chipPaddingH = \(overlayValue\?\.length \?\? 0\) >= 3 \? 2 : 3;/,
    );
    expect(src).toMatch(/paddingHorizontal:\s*chipPaddingH/);
  });

  it('holds the 11pt floor by dropping the denominator when the string would not fit, not the point size', () => {
    expect(src).toMatch(/function fitsAtFloor\(text: string, availableWidth: number\): boolean/);
    expect(src).toMatch(
      /const displayValue =\s*\n\s*overlayValue && piece\.type === 'counter' && !fitsAtFloor\(overlayValue, chipAvailableWidth\)\s*\n\s*\? String\(piece\.count \?\? 0\)/,
    );
    // The point size itself is never touched by the fallback.
    expect(src).not.toMatch(/fontSize:\s*10/);
  });

  it('the drop-denominator fallback only applies to counter (latch/configNode have no denominator to drop)', () => {
    expect(src).toMatch(/piece\.type === 'counter' && !fitsAtFloor/);
  });
});

// BoardPiece.tsx isn't importable in the unit-tier project (it pulls in
// react-native's Animated/Pressable) — mirrors the pattern used elsewhere
// in this suite (e.g. beamAnimation.test.ts's lerpHexColor reimplementation)
// to exercise the actual fit/drop decision as pure JS.
describe('BoardPiece — chip fit/drop decision (pure-JS reimplementation)', () => {
  const CHIP_CHAR_WIDTH_AT_FLOOR = 6.6;
  function fitsAtFloor(text: string, availableWidth: number): boolean {
    return text.length * CHIP_CHAR_WIDTH_AT_FLOOR <= availableWidth;
  }
  function resolveDisplayValue(
    overlayValue: string | null,
    pieceType: string,
    count: number,
    pieceSize: number,
  ): string | null {
    if (overlayValue === null) return null;
    const chipPaddingH = overlayValue.length >= 3 ? 2 : 3;
    const chipAvailableWidth = pieceSize - 2 - 2 - chipPaddingH * 2;
    return pieceType === 'counter' && !fitsAtFloor(overlayValue, chipAvailableWidth)
      ? String(count)
      : overlayValue;
  }

  it('a spacious cell (48pt, matching the acceptance snapshot) keeps the full "0/2"', () => {
    expect(resolveDisplayValue('0/2', 'counter', 0, 44)).toBe('0/2');
  });

  it('a very dense grid (~25pt piece) drops the denominator to just the count', () => {
    expect(resolveDisplayValue('0/2', 'counter', 0, 25)).toBe('0');
  });

  it('never drops the denominator for latch or configNode (no denominator to drop)', () => {
    expect(resolveDisplayValue('1', 'latch', 0, 20)).toBe('1');
    expect(resolveDisplayValue('1', 'configNode', 0, 20)).toBe('1');
  });
});
