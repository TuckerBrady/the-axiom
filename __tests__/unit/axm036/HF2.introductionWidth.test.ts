/**
 * AXM-036 hotfix HF-2 — post-repair COGS dialog width (TestFlight build 50).
 *
 * Tucker, build 50: "Cogs dialog text boxes need to be adjusted width after
 * you fix him. The ones prior to being fixed are good now."
 *
 * Reproduced on the Android emulator (axm_compact, 360dp): the pre-repair
 * Distress TRANSMISSION card spans x 32..688 px (16dp inset, same as its
 * CORE INTEGRITY bar, P11). The post-repair Introduction card ("INTRODUCTION
 * 01 / 03") spans x 0..720 px, edge to edge.
 *
 * Root cause, same class as P11: IntroductionScreen's DialogueCard host is
 * `position: 'absolute', left: 0, right: 0` inside `cardsSection`, whose
 * `paddingHorizontal: Spacing.lg` an absolute child ignores (Yoga positions
 * absolute children against the parent's border box, not its padding box).
 *
 * Fix: one inset constant, INTRO_INSET = Spacing.lg (the Distress inset),
 * used by the card host's left/right and by the header; cardsSection carries
 * no horizontal padding of its own.
 */

import * as fs from 'fs';
import * as path from 'path';

const ONBOARDING_DIR = path.resolve(__dirname, '../../../src/screens/onboarding');
const INTRO_PATH = path.join(ONBOARDING_DIR, 'IntroductionScreen.tsx');

describe('IntroductionScreen — HF-2 post-repair COGS card width', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(INTRO_PATH, 'utf-8');
  });

  test('[HF-2] single inset constant equal to the Distress inset (Spacing.lg)', () => {
    const declarations = source.match(/const\s+INTRO_INSET\s*=\s*Spacing\.lg\s*;/g) ?? [];
    expect(declarations).toHaveLength(1);
  });

  test('[HF-2] the absolute card host is inset by INTRO_INSET, not 0', () => {
    expect(source).toMatch(
      /position:\s*'absolute'\s*,\s*left:\s*INTRO_INSET\s*,\s*right:\s*INTRO_INSET/,
    );
    expect(source).not.toMatch(/position:\s*'absolute'\s*,\s*left:\s*0\s*,\s*right:\s*0/);
  });

  test('[HF-2] cardsSection has no horizontal padding (absolute children ignore it)', () => {
    const match = source.match(/cardsSection:\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match ? match[1] : '').not.toMatch(/paddingHorizontal/);
  });

  test('[HF-2] the header uses the same inset as the card', () => {
    expect(source).toMatch(/header:\s*\{[^}]*paddingHorizontal:\s*INTRO_INSET[^}]*\}/);
  });
});

describe('Onboarding COGS cards — HF-2 sweep', () => {
  test('[HF-2] no onboarding screen hosts a card inline at absolute left: 0 / right: 0', () => {
    const offenders = fs
      .readdirSync(ONBOARDING_DIR)
      .filter(f => f.endsWith('.tsx'))
      .filter(f =>
        // The inline card-host form (`style={[{ position: 'absolute', left: 0,
        // right: 0 }, cardStyle]}`). A multi-line StyleSheet entry such as
        // Distress's bottom fade is a full-width backdrop, not a card.
        /\{[ \t]*position:[ \t]*'absolute'[ \t]*,[ \t]*left:[ \t]*0[ \t]*,[ \t]*right:[ \t]*0[ \t]*\}/.test(
          fs.readFileSync(path.join(ONBOARDING_DIR, f), 'utf-8'),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
