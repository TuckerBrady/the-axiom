// Source-contract guards for Prompt 90 (P0 tutorial performance fix).
// The unit-tier jest project does not transform react-native modules,
// so component lifecycle behavior is verified by inspecting the
// component's source. The TestFlight A1-8 freeze was caused by:
//
//   1. measureTarget retry setTimeouts not cleared on unmount → leaked
//      across A1-1 → A1-8 and accumulated stale callbacks.
//   2. Animation completion callbacks (setPhase, setTargetLayout) firing
//      on unmounted instances → React warning + dangling state updates.
//   3. JS-driver opacity animations during beam execution → bridge
//      saturation halved when the tutorial chrome moves to native driver.
//   4. GameplayScreen passing a fresh targetRefs object literal every
//      render → invalidated the overlay's measureTarget useCallback
//      every parent re-render.
//
// These tests pin the fixes so a future refactor doesn't silently
// regress performance.

import * as fs from 'fs';
import * as path from 'path';

const overlaySource = fs.readFileSync(
  path.resolve(__dirname, '../../../src/components/TutorialHUDOverlay.tsx'),
  'utf8',
);
const screenSource = fs.readFileSync(
  path.resolve(__dirname, '../../../src/screens/GameplayScreen.tsx'),
  'utf8',
);
const tutorialHookSource = fs.readFileSync(
  path.resolve(__dirname, '../../../src/hooks/useGameplayTutorial.ts'),
  'utf8',
);

describe('TutorialHUDOverlay lifecycle cleanup (Prompt 90)', () => {
  describe('mounted ref + cleanup', () => {
    it('declares a mountedRef initialized to true', () => {
      expect(overlaySource).toMatch(/const mountedRef = useRef\(true\)/);
    });

    it('flips mountedRef to false in the unmount cleanup', () => {
      expect(overlaySource).toMatch(/mountedRef\.current = false/);
    });

    it('clears every tracked timer on unmount', () => {
      expect(overlaySource).toMatch(/timersRef\.current\.forEach\(clearTimeout\)/);
    });

    it('stops every tracked animation on unmount', () => {
      expect(overlaySource).toMatch(/animationsRef\.current\.forEach\([\s\S]*?\.stop\(\)/);
    });

    it('exposes trackTimer + trackAnim helpers for the cleanup ledger', () => {
      expect(overlaySource).toMatch(/const trackTimer = useCallback/);
      expect(overlaySource).toMatch(/const trackAnim = useCallback/);
    });
  });

  describe('measureTarget retry cancellation', () => {
    it('routes the retry setTimeout through trackTimer', () => {
      expect(overlaySource).toMatch(/trackTimer\(setTimeout\(tryMeasure, 150\)\)/);
    });

    it('guards retry / onResult / tryMeasure with mountedRef', () => {
      // Spot-check that the retry chain checks mountedRef before
      // re-scheduling or invoking the cb.
      const retryRegion = overlaySource.match(/const retry = \(\) => \{[\s\S]*?const onResult/);
      expect(retryRegion).not.toBeNull();
      expect(retryRegion?.[0]).toMatch(/if \(!mountedRef\.current\) return/);
    });
  });

  describe('animation-completion callback safety', () => {
    it('guards flyOrbTo .start callback with mountedRef', () => {
      const fly = overlaySource.match(/const flyOrbTo = useCallback[\s\S]*?}, \[orbX, orbY, trackAnim\]\);/);
      expect(fly).not.toBeNull();
      expect(fly?.[0]).toMatch(/if \(!mountedRef\.current\) return;[\s\S]*?done\?\.\(\)/);
    });

    it('guards morphPortalIn outer + tail callbacks with mountedRef', () => {
      const morph = overlaySource.match(
        /const morphPortalIn = useCallback[\s\S]*?trackAnim\]\)\s*;/,
      );
      expect(morph).not.toBeNull();
      const guards = morph?.[0].match(/if \(!mountedRef\.current\) return/g) ?? [];
      // outer .start + tail .start
      expect(guards.length).toBeGreaterThanOrEqual(2);
    });

    it('guards advanceStep against post-unmount calls', () => {
      const advance = overlaySource.match(
        /const advanceStep = useCallback[\s\S]*?currentStepIndex, totalSteps/,
      );
      expect(advance).not.toBeNull();
      expect(advance?.[0]).toMatch(/if \(!mountedRef\.current\) return/);
    });

    it('guards the hydration setHydrated calls with mountedRef', () => {
      const hyd = overlaySource.match(/\/\/ ── Hydration ──[\s\S]*?\}, \[levelId, steps\.length\]\);/);
      expect(hyd).not.toBeNull();
      const guards = hyd?.[0].match(/if \(!mountedRef\.current\) return/g) ?? [];
      // At minimum: forceShow path + saved-step path + final fall-through.
      expect(guards.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('native-driver opacity animations', () => {
    it('runs the glow pulse loop with useNativeDriver: false (REQ-A-1, Build 20 fix)', () => {
      // glowPulse is consumed by seven different Animated.View hosts
      // (4 portal corners + 2 piece-glow rings + N spotlight rings)
      // that mount/unmount independently across step transitions.
      // REQ-A-1 forbids a native-driven value to span multiple hosts.
      // The Build 20 A1-1 SIGABRT was rooted here. See
      // project-docs/REPORTS/build20-a1-1-sigabrt-investigation.md.
      const pulse = overlaySource.match(/glowPulse,[\s\S]*?showPieceGlow, glowPulse, trackAnim\]/);
      expect(pulse).not.toBeNull();
      expect(pulse?.[0]).toMatch(/useNativeDriver:\s*false/);
      expect(pulse?.[0]).not.toMatch(/useNativeDriver:\s*true/);
    });

    it('runs the dim / callout / exit-opacity / codex timings on the native driver', () => {
      // Sample-check each animation block by name. We assert that the
      // timing block immediately following the value identifier opts
      // into the native driver. (portalW / portalH / portalOpacity
      // stay JS-driver — see the next test. Prompt 93 moved
      // portalOpacity OFF the native driver because mixing drivers
      // on the portal Animated.View crashes RN.)
      expect(overlaySource).toMatch(/Animated\.timing\(dimOpacity[\s\S]*?useNativeDriver:\s*true/);
      expect(overlaySource).toMatch(/Animated\.timing\(calloutOpacity,[\s\S]*?useNativeDriver:\s*true/);
      expect(overlaySource).toMatch(/Animated\.timing\(exitOpacity,[\s\S]*?useNativeDriver:\s*true/);
      expect(overlaySource).toMatch(/Animated\.timing\(codexTranslate,[\s\S]*?useNativeDriver:\s*true/);
    });

    it('keeps portalW / portalH / portalOpacity on the JS driver (Prompt 93 — same-node driver consistency)', () => {
      // RN crashes if a single Animated.View has both native and JS
      // driven animations attached to it. The portal node carries
      // portalW (width), portalH (height), and portalOpacity. width
      // + height are not native-supported, so all three must run on
      // the JS driver.
      expect(overlaySource).toMatch(/Animated\.timing\(portalW,[\s\S]*?useNativeDriver:\s*false/);
      expect(overlaySource).toMatch(/Animated\.timing\(portalH,[\s\S]*?useNativeDriver:\s*false/);
      expect(overlaySource).toMatch(/Animated\.timing\(portalOpacity,[^}]*useNativeDriver:\s*false/);
      // No portalOpacity timing should opt into the native driver.
      // (Pin to the timing block's `{}` so the wildcard doesn't
      // leak into a sibling Animated.timing.)
      expect(overlaySource).not.toMatch(/Animated\.timing\(portalOpacity,[^}]*useNativeDriver:\s*true/);
    });

    it('Prompt 93 — portalLeft / portalTop also stay on the JS driver (same node)', () => {
      expect(overlaySource).toMatch(/Animated\.timing\(portalLeft,[\s\S]*?useNativeDriver:\s*false/);
      expect(overlaySource).toMatch(/Animated\.timing\(portalTop,[\s\S]*?useNativeDriver:\s*false/);
    });
  });
});

describe('useGameplayTutorial — memoized tutorial props (Prompt 90, 108)', () => {
  it('memoizes targetRefs with an empty deps array', () => {
    const memo = tutorialHookSource.match(
      /const tutorialTargetRefs = useMemo\([\s\S]*?\),\s*\[\],\s*\);/,
    );
    expect(memo).not.toBeNull();
  });

  it('memoizes spotlightCells with prePlacedPieces in deps', () => {
    expect(tutorialHookSource).toMatch(
      /const tutorialSpotlightCells = useMemo\(/,
    );
    const memoBlock = tutorialHookSource.match(
      /const tutorialSpotlightCells = useMemo\([\s\S]*?\)\s*;/,
    );
    expect(memoBlock).not.toBeNull();
    expect(memoBlock?.[0]).toMatch(/level\?\.prePlacedPieces[\s\S]*?\.filter/);
    expect(memoBlock?.[0]).toMatch(/\[level\?\.prePlacedPieces\]/);
  });

  it('passes the memoized props (not inline literals) to the overlay', () => {
    expect(screenSource).toMatch(/targetRefs=\{tutorialTargetRefs\}/);
    expect(screenSource).toMatch(/spotlightCells=\{tutorialSpotlightCells\}/);
    // The inline filter/map at the call site must be gone.
    // Prompt 99B added an isBeamActive prop after onSkip; loosen the
    // tail match to accept any subsequent props before the closing />.
    const overlayBlock = screenSource.match(
      /<TutorialHUDOverlay[\s\S]*?onSkip=\{[^}]+\}[\s\S]*?\/>/,
    );
    expect(overlayBlock).not.toBeNull();
    expect(overlayBlock?.[0]).not.toMatch(/\.filter\(p => p\.type/);
    expect(overlayBlock?.[0]).not.toMatch(/sourceNode: sourceNodeRef/);
  });
});
