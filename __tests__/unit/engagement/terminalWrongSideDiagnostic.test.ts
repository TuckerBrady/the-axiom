import { detectTerminalWrongSide } from '../../../src/game/engagement/terminalWrongSideDiagnostic';

const src = { pieceId: 's', type: 'source', timestamp: 0, success: true };
const conv = { pieceId: 'c', type: 'conveyor', timestamp: 1, success: true };
const rej = { pieceId: 't', type: 'terminalRejected', timestamp: 2, success: false, side: 'top' as const };
const hit = { pieceId: 't', type: 'terminal', timestamp: 2, success: true };

describe('detectTerminalWrongSide', () => {
  it('[5.2] true on a failed run containing a rejection', () => {
    expect(detectTerminalWrongSide([src, conv, rej])).toBe(true);
  });
  it('[5.3] false on a successful run even with a rejection present', () => {
    expect(detectTerminalWrongSide([src, conv, rej, hit])).toBe(false);
  });
  it('[5.2] false on a failed run with no rejection', () => {
    expect(detectTerminalWrongSide([src, conv])).toBe(false);
  });
  it('[4.7] terminalRejected is not a gating piece for the Transmitter detector', () => {
    const { GATING_PIECE_TYPES } = require('../../../src/game/engagement/transmitterPlacementDiagnostic');
    expect(GATING_PIECE_TYPES).not.toContain('terminalRejected');
  });
});
