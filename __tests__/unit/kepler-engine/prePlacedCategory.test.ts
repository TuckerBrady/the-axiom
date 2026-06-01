// Pending tests — pre-placed Latch is categorized 'protocol'.
// Contract: project-docs/SPECS/SPEC_KEPLER_ENGINE.md Section 3.5 (G5).
// Driving level: K1-3 (Junction 7), which pre-places a Latch.
//
// Archaeology Bug B: the prePlaced() helper categorizes only configNode/scanner/
// transmitter as 'protocol', so a pre-placed Latch is mis-categorized 'physics'.
//
// PHASE 3 ACTIVATED: prePlaced() now categorizes via the canonical getPieceCategory
// (latch/inverter/counter => 'protocol') and assigns pre-placed Latches an explicit
// latchMode default of 'write'. (G5, REQ-PREPLACED-CAT-1; REQ-LATCH-PREPLACE-1)

import { getLevelById, prePlaced } from '../../../src/game/levels';

describe('Pre-placed Latch categorization (3.5.1)', () => {
  it('[REQ-PREPLACED-CAT-1] K1-3 pre-placed Latch has category protocol', () => {
    const level = getLevelById('K1-3');
    expect(level).toBeDefined();
    const latch = level!.prePlacedPieces.find(p => p.type === 'latch');
    expect(latch).toBeDefined();
    expect(latch!.category).toBe('protocol');
  });

  it('[REQ-PREPLACED-CAT-1] no pre-placed Latch is categorized physics', () => {
    const level = getLevelById('K1-3');
    const physicsLatches = level!.prePlacedPieces.filter(
      p => p.type === 'latch' && p.category === 'physics',
    );
    expect(physicsLatches).toHaveLength(0);
  });

  it('[REQ-LATCH-PREPLACE-1] K1-3 pre-placed Latch sets latchMode explicitly to write', () => {
    const level = getLevelById('K1-3');
    const latch = level!.prePlacedPieces.find(p => p.type === 'latch');
    expect(latch!.latchMode).toBe('write');
  });

  // Exercise the prePlaced() factory directly (not just hardcoded level data),
  // confirming the canonical category map is what categorizes each type.
  it('[REQ-PREPLACED-CAT-1] prePlaced factory categorizes protocol pieces as protocol', () => {
    expect(prePlaced('latch', 0, 0).category).toBe('protocol');
    expect(prePlaced('inverter', 0, 0).category).toBe('protocol');
    expect(prePlaced('counter', 0, 0).category).toBe('protocol');
  });

  it('[REQ-PREPLACED-CAT-1] prePlaced factory keeps physics pieces as physics', () => {
    expect(prePlaced('conveyor', 0, 0).category).toBe('physics');
    expect(prePlaced('splitter', 0, 0).category).toBe('physics');
    expect(prePlaced('bridge', 0, 0).category).toBe('physics');
  });

  it('[REQ-LATCH-PREPLACE-1] prePlaced Latch defaults latchMode to write and is overridable', () => {
    expect(prePlaced('latch', 0, 0).latchMode).toBe('write');
    expect(prePlaced('latch', 0, 0, { latchMode: 'read' }).latchMode).toBe('read');
    // Non-latch pieces carry no latchMode by default.
    expect(prePlaced('conveyor', 0, 0).latchMode).toBeUndefined();
  });
});
