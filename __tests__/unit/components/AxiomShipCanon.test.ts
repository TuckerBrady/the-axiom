// AXM-001 — AXIOM_SHIP_CANON.md S-00/S-01/S-04. Source-contract tests
// (this repo's established pattern for SVG-rendering components) proving
// the Hub and Repair Progress consume the single shared geometry module
// rather than defining their own paths, and that the retired off-token
// colors are gone.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const hullSrc = read('src/components/ship/AxiomHull.tsx');
const hubShipSrc = read('src/components/hub/AxiomShip.tsx');
const repairProgressSrc = read('src/components/ShipRepairProgress.tsx');

describe('AXIOM_SHIP_CANON S-00 — single geometry, no consumer redefines paths', () => {
  it('AxiomShip (Hub) imports AxiomHull rather than drawing its own SVG paths', () => {
    expect(hubShipSrc).toMatch(/import AxiomHull[\s\S]*?from '\.\.\/ship\/AxiomHull'/);
    expect(hubShipSrc).not.toMatch(/<Path\b/);
    expect(hubShipSrc).not.toMatch(/<Polygon\b/);
  });

  it('ShipRepairProgress imports AxiomHull rather than drawing its own SVG paths', () => {
    expect(repairProgressSrc).toMatch(/import AxiomHull[\s\S]*?from '\.\/ship\/AxiomHull'/);
    expect(repairProgressSrc).not.toMatch(/<Path\b/);
    expect(repairProgressSrc).not.toMatch(/<Polygon\b/);
  });

  it('the retired off-token colors are gone from AxiomShip.tsx', () => {
    expect(hubShipSrc).not.toMatch(/#38BDF8/i);
    expect(hubShipSrc).not.toMatch(/#B87333/i);
    expect(hubShipSrc).not.toMatch(/#F87171/i);
  });

  it('AxiomHull is the only file defining the hull path data (D drawing commands)', () => {
    // Sanity check that the geometry actually lives in AxiomHull.tsx.
    expect(hullSrc).toMatch(/d="M240,180/);
  });
});

describe('AXIOM_SHIP_CANON S-01 — one drive, no twin nacelles', () => {
  it('renders exactly one Propulsion Core drive block group, not a symmetrical pair', () => {
    const matches = hullSrc.match(/Propulsion Core/g) ?? [];
    expect(matches.length).toBe(1);
  });
});

describe('AXIOM_SHIP_CANON S-04 — repair-state rule applied uniformly', () => {
  it('AxiomHull drives every zone stroke from strokeFor(), not a literal opacity', () => {
    const zoneGroupCount = (hullSrc.match(/opacity=\{(?:drive|battery|pod|relay|dome|wedge|hardpoints|canopy)\.opacity\}/g) ?? []).length;
    expect(zoneGroupCount).toBe(8);
  });

  it('AxiomShip (Hub) maps its on/off/dmg readout onto RepairState, not a fourth state', () => {
    expect(hubShipSrc).toMatch(/function toRepairState/);
    expect(hubShipSrc).toMatch(/'ONLINE'/);
    expect(hubShipSrc).toMatch(/'DERELICT'/);
  });
});
