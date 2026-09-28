/**
 * SWEEP-B51 H1 (AXM-040): the requisition store tab width model (H1-3).
 * The widest real tab set must fit one line at 360dp with the labels at
 * the 11px floor, or the fixed-size labels would ellipsize.
 */
import {
  REQ_TAB_LETTER_SPACING,
  REQ_TAB_PAD_X,
  SPACE_MONO_ADVANCE_EM,
  reqTabBarWidth,
  reqTabLabelWidth,
  reqTabWorstLabels,
} from '../../../src/components/gameplay/requisitionTabs';
import { PHYSICS_PIECE_TYPES, PROTOCOL_PIECE_TYPES } from '../../../src/game/piecePrices';
import { FontSizes } from '../../../src/theme/tokens';

describe('SWEEP-B51 H1 store tab widths', () => {
  it('[H1-3] tab width constants and the label width formula', () => {
    expect(REQ_TAB_LETTER_SPACING).toBe(1.2);
    expect(REQ_TAB_PAD_X).toBe(4);
    expect(SPACE_MONO_ADVANCE_EM).toBe(0.62);
    const perChar = FontSizes.floor * SPACE_MONO_ADVANCE_EM + REQ_TAB_LETTER_SPACING;
    expect(reqTabLabelWidth('')).toBe(0);
    expect(reqTabLabelWidth('INFRA')).toBeCloseTo(5 * perChar, 10);
    expect(reqTabLabelWidth('PROTOCOL (6)')).toBeCloseTo(12 * perChar, 10);
    expect(reqTabBarWidth([])).toBe(0);
    expect(reqTabBarWidth(['DATA', 'INFRA'])).toBeCloseTo(9 * perChar + 4 * REQ_TAB_PAD_X, 10);
  });

  it('[H1-3] the worst real tab labels come from the piece-type arrays', () => {
    expect(reqTabWorstLabels()).toEqual([
      `PHYSICS (${PHYSICS_PIECE_TYPES.length})`,
      `PROTOCOL (${PROTOCOL_PIECE_TYPES.length})`,
      'DATA (2)',
      'INFRA',
    ]);
  });

  it('[H1-3] the worst real tab labels fit one line at 360dp with 10 percent headroom', () => {
    const w = reqTabBarWidth(reqTabWorstLabels());
    expect(w).toBeLessThanOrEqual(0.9 * 360);
    // The contract's worked value, at today's counts of 5 Physics and 6 Protocol types.
    if (PHYSICS_PIECE_TYPES.length === 5 && PROTOCOL_PIECE_TYPES.length === 6) {
      expect(w).toBeCloseTo(320.72, 1);
    }
  });

  it('[H1-3] the worst real tab labels fit one line at 390dp', () => {
    expect(reqTabBarWidth(reqTabWorstLabels())).toBeLessThanOrEqual(0.9 * 390);
  });
});
