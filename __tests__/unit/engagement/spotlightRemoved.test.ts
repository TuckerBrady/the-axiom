// Source-contract guard for Prompt 88: the ghost spotlight system has
// been fully removed. The colored indicator bars (TapeBarState) are now
// the sole visual indicator for tape interactions. Both systems were
// rendering simultaneously on A1-8 prior to this prompt, which looked
// broken.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

describe('Prompt 88 — ghost spotlight removed', () => {
  it('spotlightHelpers.ts is deleted', () => {
    const helpersPath = path.resolve(
      repoRoot,
      'src/game/engagement/spotlightHelpers.ts',
    );
    expect(fs.existsSync(helpersPath)).toBe(false);
  });

  describe('GameplayScreen.tsx', () => {
    const src = read('src/screens/GameplayScreen.tsx');

    it('does not declare spotlightState / setSpotlightState', () => {
      expect(src).not.toMatch(/\bspotlightState\b/);
      expect(src).not.toMatch(/\bsetSpotlightState\b/);
    });

    it('does not import SPOTLIGHT_INITIAL or SpotlightState from engagement', () => {
      expect(src).not.toMatch(/SPOTLIGHT_INITIAL/);
      expect(src).not.toMatch(/\bSpotlightState\b/);
    });

    it('does not render the ghost-beam Polygon / SvgLinearGradient / Stop', () => {
      // SVG primitives that were only used by the spotlight block.
      expect(src).not.toMatch(/<Polygon\b/);
      expect(src).not.toMatch(/<SvgLinearGradient\b/);
      expect(src).not.toMatch(/<Stop\b/);
      // The block's identifying comment.
      expect(src).not.toMatch(/Ghost Spotlight/);
    });

    it('still renders the indicator bars (TapeBarState) — the replacement system', () => {
      expect(src).toMatch(/TAPE_BAR_INITIAL/);
      expect(src).toMatch(/setTapeBarState/);
    });

    it('still renders the glow traveler (kept per prompt instruction)', () => {
      expect(src).toMatch(/glowTraveler/);
    });
  });

  describe('engagement/interactions.ts', () => {
    const src = read('src/game/engagement/interactions.ts');

    it('does not import or call showSpotlight / updateSpotlightValue / hideSpotlight', () => {
      expect(src).not.toMatch(/spotlightHelpers/);
      expect(src).not.toMatch(/showSpotlight/);
      expect(src).not.toMatch(/updateSpotlightValue/);
      expect(src).not.toMatch(/hideSpotlight/);
    });

    it('still calls flashPiece + wait — animation pacing is preserved', () => {
      // Per the prompt, the wait() calls that surrounded spotlight calls
      // pace the indicator bar animation and must not be removed.
      expect(src).toMatch(/await wait\(120 \* speed\)/);
      expect(src).toMatch(/await wait\(250 \* speed\)/);
      expect(src).toMatch(/await wait\(300 \* speed\)/);
      expect(src).toMatch(/await wait\(80 \* speed\)/);
      expect(src).toMatch(/await wait\(150 \* speed\)/);
    });
  });

  describe('engagement/types.ts', () => {
    const src = read('src/game/engagement/types.ts');

    it('does not export SpotlightBeam / SpotlightState / SPOTLIGHT_INITIAL', () => {
      expect(src).not.toMatch(/SpotlightBeam/);
      expect(src).not.toMatch(/\bSpotlightState\b/);
      expect(src).not.toMatch(/SPOTLIGHT_INITIAL/);
    });

    it('does not include setSpotlightState on EngagementContext', () => {
      expect(src).not.toMatch(/setSpotlightState/);
    });
  });

  describe('engagement/index.ts', () => {
    const src = read('src/game/engagement/index.ts');

    it('does not re-export the spotlight types or initializer', () => {
      expect(src).not.toMatch(/SpotlightBeam/);
      expect(src).not.toMatch(/\bSpotlightState\b/);
      expect(src).not.toMatch(/SPOTLIGHT_INITIAL/);
    });
  });
});
