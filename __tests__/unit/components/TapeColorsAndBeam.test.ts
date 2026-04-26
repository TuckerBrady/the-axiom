// Source-contract guards for Prompt 91. The unit-tier project does
// not transform RN modules, so we verify behavior by inspecting the
// source file shape. Each describe block pins one of the six fixes
// from TestFlight build 4 feedback so a future refactor cannot
// silently revert them.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const screenSrc = read('src/screens/GameplayScreen.tsx');
const levelsSrc = read('src/game/levels.ts');
const beamSrc = read('src/game/engagement/beamAnimation.ts');
const valueTravelSrc = read('src/game/engagement/valueTravelAnimation.ts');
const interactionsSrc = read('src/game/engagement/interactions.ts');
const typesSrc = read('src/game/engagement/types.ts');

describe('Prompt 91 — Tape colors + indicator bars + level data + beam', () => {
  describe('Fix 1 — IN tape green/yellow palette', () => {
    it('declares dedicated IN-tape cell + text styles', () => {
      expect(screenSrc).toMatch(/tapeCellIn:\s*\{/);
      expect(screenSrc).toMatch(/tapeCellInActive:\s*\{[\s\S]*?borderColor:\s*'#BFFF3F'[\s\S]*?backgroundColor:\s*'rgba\(191,255,63,0\.14\)'/);
      expect(screenSrc).toMatch(/tapeCellTextIn:\s*\{[\s\S]*?color:\s*'#BFFF3F'/);
    });

    it('applies the IN-specific styles in the IN tape rendering block (not TRAIL)', () => {
      // The IN render block uses styles.tapeCellIn / tapeCellTextIn.
      expect(screenSrc).toMatch(/styles\.tapeCellIn,\s*\n[\s\S]*?isActive && styles\.tapeCellInActive/);
      expect(screenSrc).toMatch(/styles\.tapeCellTextIn,\s*\n[\s\S]*?isActive && styles\.tapeCellTextInActive/);
    });

    it('does NOT change TRAIL or OUT tape colors', () => {
      // TRAIL still uses Colors.neonGreen for its inline text style.
      expect(screenSrc).toMatch(/styles\.tapeCellText, \{ color: Colors\.neonGreen \}/);
      // OUT keeps the gate-passed / gate-blocked styles.
      expect(screenSrc).toMatch(/tapeCellGatePassed:\s*\{[\s\S]*?borderColor:\s*'#00FF87'/);
      expect(screenSrc).toMatch(/tapeCellGateBlocked:\s*\{[\s\S]*?borderColor:\s*'#FF3B3B'/);
    });
  });

  describe('Fix 2 — Indicator bar stacks above the cell wraps', () => {
    it('sets zIndex + elevation on the tapeIndicatorBar so the purple tapeHead does not poke through', () => {
      const bar = screenSrc.match(/tapeIndicatorBar:\s*\{[\s\S]*?\},/);
      expect(bar).not.toBeNull();
      expect(bar?.[0]).toMatch(/zIndex:\s*2/);
      expect(bar?.[0]).toMatch(/elevation:\s*2/);
    });
  });

  describe('Fix 3 — A1-7 scanner moved from board to tray', () => {
    it("removes the prePlaced scanner from A1-7", () => {
      const a17 = levelsSrc.match(/levelA1_7:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a17).not.toBeNull();
      expect(a17?.[0]).not.toMatch(/prePlaced\('scanner'/);
    });

    it('adds scanner to A1-7 availablePieces', () => {
      const a17 = levelsSrc.match(/levelA1_7:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a17?.[0]).toMatch(/availablePieces:\s*\[[^\]]*'scanner'[^\]]*\]/);
    });

    it('bumps optimalPieces from 7 to 8', () => {
      const a17 = levelsSrc.match(/levelA1_7:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a17?.[0]).toMatch(/optimalPieces:\s*8/);
      expect(a17?.[0]).not.toMatch(/optimalPieces:\s*7/);
    });

    it('does not reference boardScanner in any A1-7 tutorial step', () => {
      const a17 = levelsSrc.match(/levelA1_7:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a17?.[0]).not.toMatch(/boardScanner/);
    });
  });

  describe('Fix 4 — Beam stops at piece center on tape pause', () => {
    it('snaps the beam head + truncated trail to waypoints[i] when entering a tape pause', () => {
      // The tape-pause block now applies a frame with `head: wp` and
      // a re-built trail at exactly wpDist before pauseEnd is set.
      expect(beamSrc).toMatch(/const wp = waypoints\[i\];/);
      expect(beamSrc).toMatch(/applyFrame\(\{[\s\S]*?head:\s*wp[\s\S]*?\}\);/);
      expect(beamSrc).toMatch(/wpDist >= sg\.e/);
      expect(beamSrc).toMatch(/wpDist > sg\.s/);
    });
  });

  describe('Fix 5 — Beam dims during tape processing, brightens after', () => {
    it('declares dimBeam / brightenBeam helpers driven by ctx.beamOpacity', () => {
      expect(beamSrc).toMatch(/const BEAM_DIM_OPACITY = 0\.3/);
      expect(beamSrc).toMatch(/const BEAM_BRIGHT_OPACITY = 1/);
      expect(beamSrc).toMatch(/const BEAM_DIM_DURATION_MS = 200/);
      expect(beamSrc).toMatch(/function dimBeam\(ctx: EngagementContext\)/);
      expect(beamSrc).toMatch(/function brightenBeam\(ctx: EngagementContext\)/);
      expect(beamSrc).toMatch(/Animated\.timing\(ctx\.beamOpacity[\s\S]*?useNativeDriver:\s*true/);
    });

    it('calls dimBeam when entering the tape pause and brightenBeam on settle (via settleTapePause)', () => {
      // dimBeam fires alongside pauseEnd assignment.
      expect(beamSrc).toMatch(/dimBeam\(ctx\);/);
      // After Prompt 98 the three settle paths (.then / .catch /
      // safety timer) all route through settleTapePause, which
      // calls brightenBeam exactly once when the in-flight counter
      // reaches zero. The original "≥ 3 brightenBeam callsites"
      // assertion no longer holds — that's a deliberate
      // architectural improvement (one settle helper instead of
      // three duplicated bodies). Pin the new shape: brightenBeam
      // is called inside the counter-zero branch of settleTapePause.
      expect(beamSrc).toMatch(
        /if \(inFlightTapePauses === 0\) \{\s*pauseEnd = performance\.now\(\);\s*brightenBeam\(ctx\);/,
      );
      // And confirm all three settle paths are wired to
      // settleTapePause (Prompt 98 Fix 3 — already pinned in
      // prompt98Fixes.test, restated here for clarity at this
      // attribution boundary).
      expect(beamSrc).toMatch(/setTimeout\(settleTapePause, 8000\)/);
      expect(beamSrc).toMatch(/\.then\([^)]*\) => \{\s*clearTimeout\(safetyTimer\);\s*settleTapePause\(\);/);
      expect(beamSrc).toMatch(/\.catch\([^)]*\) => \{\s*clearTimeout\(safetyTimer\);\s*settleTapePause\(\);/);
    });

    it('exposes beamOpacity on the EngagementContext interface', () => {
      expect(typesSrc).toMatch(/beamOpacity:\s*Animated\.Value/);
    });

    it('GameplayScreen creates beamOpacity and wraps the beam SVG in an animated opacity layer', () => {
      expect(screenSrc).toMatch(/const beamOpacity = useRef\(new RNAnimated\.Value\(1\)\)\.current/);
      expect(screenSrc).toMatch(/<RNAnimated\.View[\s\S]*?opacity:\s*beamOpacity[\s\S]*?<Svg/);
      // handleEngage resets to 1 at the start of each run.
      expect(screenSrc).toMatch(/beamOpacity\.setValue\(1\)/);
      // The animated layer is closed before the outer wrapper closes.
      expect(screenSrc).toMatch(/<\/Svg>\s*\n\s*<\/RNAnimated\.View>/);
    });
  });

  describe('Fix 6 — IN→TRAIL value handoff is synchronous on landing', () => {
    it('runValueTravel accepts an onArrive callback that fires at Phase 2 completion', () => {
      expect(valueTravelSrc).toMatch(/onArrive\?:\s*\(\)\s*=>\s*void/);
      expect(valueTravelSrc).toMatch(/onArrive\?\.\(\);/);
    });

    it('runValueTravel fades opacity smoothly (no instant snap) during impact', () => {
      // The instant `refs.opacity.setValue(0)` is replaced by an
      // Animated.timing impact-fade.
      expect(valueTravelSrc).toMatch(/Animated\.timing\(refs\.opacity[\s\S]*?toValue:\s*0[\s\S]*?duration:\s*250/);
    });

    it('runValueTravel no longer has the 700ms post-impact wait', () => {
      expect(valueTravelSrc).not.toMatch(/setTimeout\(\s*\(\)\s*=>\s*\{\s*resolve\(\);\s*\},\s*700\s*\);/);
    });

    it('Scanner interaction passes the trail-write highlight via the onArrive callback', () => {
      // The setHighlight + setTapeBarState + setVisualTrailOverride
      // calls now live inside the onArrive lambda passed to
      // runValueTravel, not after the await.
      const scannerBlock = interactionsSrc.match(/runValueTravel\(\s*ctx,[\s\S]*?\}\,?\s*\)\s*;/);
      expect(scannerBlock).not.toBeNull();
      expect(scannerBlock?.[0]).toMatch(/setHighlight\(ctx, `trail-\$\{pulse\}`, 'write'\)/);
      expect(scannerBlock?.[0]).toMatch(/setTapeBarState\(prev =>/);
      expect(scannerBlock?.[0]).toMatch(/setVisualTrailOverride\(prev =>/);
    });
  });
});
