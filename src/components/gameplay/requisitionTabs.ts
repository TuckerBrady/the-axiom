// SWEEP-B51 H1 (AXM-040): the requisition store tab bar width model.
//
// The tab labels render at FontSizes.floor (11) always, with no auto-shrink
// (Android's auto-shrink shrank inactive labels to about 5px, smoke W-1).
// The tabs size to their labels, so the widest real label set must fit the
// row. These helpers estimate that width from Space Mono's glyph advance so
// a test can prove the fit at 360dp.

import { PHYSICS_PIECE_TYPES, PROTOCOL_PIECE_TYPES } from '../../game/piecePrices';
import { FontSizes } from '../../theme/tokens';

export const REQ_TAB_LETTER_SPACING = 1.2;
export const REQ_TAB_PAD_X = 4;
export const SPACE_MONO_ADVANCE_EM = 0.62; // measured 0.612, rounded up

/** Estimated rendered width (dp) of one tab label at the 11px floor. */
export function reqTabLabelWidth(label: string): number {
  return label.length * (FontSizes.floor * SPACE_MONO_ADVANCE_EM + REQ_TAB_LETTER_SPACING);
}

/** Estimated width (dp) of a tab bar whose tabs size to these labels. */
export function reqTabBarWidth(labels: string[]): number {
  return labels.reduce((sum, label) => sum + reqTabLabelWidth(label) + 2 * REQ_TAB_PAD_X, 0);
}

/** The widest labels the store can show, derived from the purchasable piece types. */
export function reqTabWorstLabels(): string[] {
  return [
    `PHYSICS (${PHYSICS_PIECE_TYPES.length})`,
    `PROTOCOL (${PROTOCOL_PIECE_TYPES.length})`,
    'DATA (2)',
    'INFRA',
  ];
}
