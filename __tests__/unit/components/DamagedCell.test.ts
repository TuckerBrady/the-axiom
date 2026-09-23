// Source-contract tests for the damaged-cell treatment (this repo's
// established pattern for react-native-svg components — see
// AxiomShipCanon.test.ts, BoardGrid.test.ts).
//
// Tucker approved this design 2026-09-20 after seeing four treatments
// rendered at board scale. The two things it has to keep apart:
//
//   1. TERRAIN damage (level.damagedCells) — a missing deck plate. No text,
//      no red, no dashed border, no colour at all, so it never competes with
//      the beam, the tape bars or a piece.
//   2. A cell blown during the CURRENT run — the same plate plus an ember
//      still crawling in the crack, in an existing warm token.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const cellSrc = read('src/components/gameplay/DamagedCell.tsx');
const geomSrc = read('src/components/gameplay/damagedCellGeometry.ts');
const screenSrc = read('src/screens/GameplayScreen.tsx');
const hookSrc = read('src/hooks/useGameplayFailure.ts');

describe('DamagedCell — treatment 1, the missing plate', () => {
  it('is a memoized default export with size / x / y / live props', () => {
    expect(cellSrc).toMatch(/export default React\.memo\(DamagedCellComponent/);
    expect(cellSrc).toMatch(/size:\s*number/);
    expect(cellSrc).toMatch(/live\?:\s*boolean/);
  });

  it('draws with react-native-svg primitives', () => {
    expect(cellSrc).toMatch(/from 'react-native-svg'/);
    expect(cellSrc).toMatch(/<Rect\b/);
    expect(cellSrc).toMatch(/<Path\b/);
  });

  it('renders NO text — the treatment must survive a small cell unlabelled', () => {
    expect(cellSrc).not.toMatch(/<Text\b/);
    expect(cellSrc).not.toMatch(/SvgText/);
    expect(cellSrc).not.toMatch(/BLOWN/);
  });

  it('uses no dashed border', () => {
    expect(cellSrc).not.toMatch(/strokeDasharray/);
  });

  it('carries no red — the plate is colourless so it never reads as an error', () => {
    expect(cellSrc).not.toMatch(/Colors\.red\b/);
    expect(cellSrc).not.toMatch(/gateBlock/);
  });

  it('reads as recessed: a rim light, a shadowed near wall, a lit far wall', () => {
    expect(cellSrc).toMatch(/g\.rimLight/);
    expect(cellSrc).toMatch(/g\.wallShadow/);
    expect(cellSrc).toMatch(/g\.wallLight/);
    expect(geomSrc).toMatch(/rimLight:/);
    expect(geomSrc).toMatch(/wallShadow:/);
  });

  it('shows the fractures and the two bracket stubs', () => {
    expect(cellSrc).toMatch(/g\.fractures\.map/);
    expect(cellSrc).toMatch(/g\.brackets\.map/);
  });

  it('takes every colour from an existing token — nothing invented', () => {
    const literals = cellSrc.match(/#[0-9A-Fa-f]{3,8}/g) ?? [];
    expect(literals).toEqual([]);
    expect(cellSrc).toMatch(/from '\.\.\/\.\.\/theme\/tokens'/);
  });

  it('scales from the cell size — no bare pixel constants in the drawing', () => {
    expect(cellSrc).toMatch(/damagedCellGeometry\(size\)/);
    // The geometry module is the only place numbers live, and every one of
    // them is a fraction of `s`.
    expect(geomSrc).toMatch(/const s = Math\.max\(0, size\)/);
  });

  it('is not a piece — it never imports or renders PieceIcon', () => {
    // PieceIcon.tsx stays the single source of truth for PIECE rendering.
    // (It is named in comments here for exactly that reason; what must not
    // exist is an import or a render of it.)
    expect(cellSrc).not.toMatch(/import[^;]*PieceIcon/);
    expect(cellSrc).not.toMatch(/<PieceIcon\b/);
    expect(cellSrc).not.toMatch(/PieceType/);
  });
});

describe('DamagedCell — treatment 2, the live burn', () => {
  it('uses an existing warm token for the ember, not a new colour', () => {
    expect(cellSrc).toMatch(/stroke=\{Colors\.tapeOutBar\}/);
  });

  it('pulses the ember rather than showing a static badge', () => {
    expect(cellSrc).toMatch(/Animated\.loop\(/);
    expect(cellSrc).toMatch(/EMBER_PULSE_MS/);
  });

  it('[REQ-A-1] never uses the native driver on this board animation', () => {
    expect(cellSrc).toMatch(/useNativeDriver: false/);
    expect(cellSrc).not.toMatch(/useNativeDriver: true/);
  });

  it('[REQ-A-1/A-2] keeps emberOpacity on exactly one animated host', () => {
    const hosts = cellSrc.match(/<AnimatedPath\b/g) ?? [];
    expect(hosts).toHaveLength(1);
    const consumers = cellSrc.match(/\{emberOpacity as unknown as number\}/g) ?? [];
    expect(consumers).toHaveLength(1);
  });

  it('[REQ-A-2] renders that host unconditionally — no ternary mounts it', () => {
    // The host must not sit behind `live ? ... : null` or `live && ...`.
    expect(cellSrc).not.toMatch(/live\s*\?[\s\S]{0,200}<AnimatedPath/);
    expect(cellSrc).not.toMatch(/live\s*&&[\s\S]{0,200}<AnimatedPath/);
  });

  it('stops and clears the pulse on cleanup', () => {
    expect(cellSrc).toMatch(/pulse\.stop\(\)/);
  });
});

describe('GameplayScreen — delegates the drawing', () => {
  it('renders DamagedCell instead of inlining the old crater SVG', () => {
    expect(screenSrc).toMatch(/import DamagedCell from '\.\.\/components\/gameplay\/DamagedCell'/);
    expect(screenSrc).toMatch(/<DamagedCell\b/);
    expect(screenSrc).not.toMatch(/Blown cell scars/);
    expect(screenSrc).not.toMatch(/Blast pit/);
    expect(screenSrc).not.toMatch(/Radial scorch cracks/);
  });

  it('marks only current-run craters live', () => {
    expect(screenSrc).toMatch(/live=\{liveBurnCells\.has\(key\)\}/);
  });

  it('settles previous burns when a new run starts', () => {
    expect(screenSrc).toMatch(/settleLiveBurns\(\)/);
  });
});

describe('useGameplayFailure — live-burn bookkeeping', () => {
  it('exposes liveBurnCells and settleLiveBurns', () => {
    expect(hookSrc).toMatch(/liveBurnCells:\s*Set<string>/);
    expect(hookSrc).toMatch(/settleLiveBurns:\s*\(\)\s*=>\s*void/);
  });
});
