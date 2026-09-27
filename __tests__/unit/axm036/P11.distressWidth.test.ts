/**
 * AXM-036 P11 — Distress TRANSMISSION card width = CORE INTEGRITY bar width (F11).
 *
 * Source-structure check in the style of __tests__/unit/SettingsScreen.audit.test.ts.
 *
 * Finding: the CORE INTEGRITY track fills `integritySection`, which has
 * `paddingHorizontal: Spacing.lg`. The TRANSMISSION cards are absolute
 * `left: 0, right: 0` inside `cardsSection`, which has its own
 * `paddingHorizontal: 16` (Spacing.lg's numeric value duplicated, not shared).
 * The absolute positioning ignores that padding, so the card runs wider than
 * the bar (screenshot 21).
 *
 * P11-1: one inset constant, DISTRESS_INSET = Spacing.lg. integritySection's
 * paddingHorizontal uses it. The card wrapper uses left/right: DISTRESS_INSET.
 * cardsSection has no horizontal padding.
 */

import * as fs from 'fs';
import * as path from 'path';

const DISTRESS_PATH = path.resolve(
  __dirname,
  '../../../src/screens/onboarding/DistressScreen.tsx',
);

describe('DistressScreen — P11 distress card width', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(DISTRESS_PATH, 'utf-8');
  });

  test('[P11-1] single inset constant', () => {
    // Exactly one declaration of DISTRESS_INSET, derived from Spacing.lg.
    const declarations = source.match(/const\s+DISTRESS_INSET\s*=\s*Spacing\.lg\s*;/g) ?? [];
    expect(declarations).toHaveLength(1);
  });

  test('[P11-1] card wrapper insets equal the bar\'s', () => {
    // integritySection's paddingHorizontal must reference DISTRESS_INSET.
    const integritySectionMatch = source.match(
      /integritySection:\s*\{[^}]*paddingHorizontal:\s*DISTRESS_INSET[^}]*\}/,
    );
    expect(integritySectionMatch).not.toBeNull();

    // The card wrapper (the absolute-positioned host around DialogueCard's
    // content) must use DISTRESS_INSET for both left and right, not a literal 0.
    const cardWrapperMatch = source.match(
      /position:\s*'absolute'\s*,\s*left:\s*DISTRESS_INSET\s*,\s*right:\s*DISTRESS_INSET/,
    );
    expect(cardWrapperMatch).not.toBeNull();
  });

  test('[P11-1] cardsSection has no horizontal padding', () => {
    const cardsSectionMatch = source.match(/cardsSection:\s*\{([^}]*)\}/);
    expect(cardsSectionMatch).not.toBeNull();
    const body = cardsSectionMatch ? cardsSectionMatch[1] : '';
    expect(body).not.toMatch(/paddingHorizontal/);
  });
});
