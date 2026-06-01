// Pending tests — pre-placed Latch is categorized 'protocol'.
// Contract: project-docs/SPECS/SPEC_KEPLER_ENGINE.md Section 3.5 (G5).
// Driving level: K1-3 (Junction 7), which pre-places a Latch.
//
// Archaeology Bug B: the prePlaced() helper categorizes only configNode/scanner/
// transmitter as 'protocol', so a pre-placed Latch is mis-categorized 'physics'.
//
// PENDING STATUS: `describe.skip` — activates once Phase 3 fixes prePlaced() and the
// K1-3 level data lands its pre-placed Latch.

import { getLevelById } from '../../../src/game/levels';

describe.skip('Pre-placed Latch categorization (3.5.1)', () => {
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
});
