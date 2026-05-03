// Source-contract guards for Prompt 93 (P0 native-driver crash +
// boot screen polish). The unit tier doesn't transform RN modules,
// so we verify the fix by inspecting the source: every
// Animated.timing on the portal node must use the same driver, and
// the BootScreen cursor blink must be wrapped in withDelay.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const overlaySrc = read('src/components/TutorialHUDOverlay.tsx');
const bootSrc = read('src/screens/onboarding/BootScreen.tsx');

describe('Prompt 93 — Native driver crash fix + boot polish', () => {
  describe('Fix 1 — portal animations all share the JS driver', () => {
    it('every Animated.timing(portalOpacity, ...) block opts out of the native driver', () => {
      // RN forbids mixing drivers on a single Animated.View. The
      // portal View carries portalW (width), portalH (height),
      // portalLeft (left), portalTop (top), and portalOpacity. The
      // first four cannot use the native driver (width/height/left/
      // top are not supported), so portalOpacity must follow suit.
      // Locate every timing block whose first argument is
      // portalOpacity and assert each one is JS-driven.
      const re = /Animated\.timing\(portalOpacity,\s*\{[^}]*useNativeDriver:\s*(true|false)/g;
      const matches: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(overlaySrc)) !== null) {
        matches.push(m[1]);
      }
      expect(matches.length).toBeGreaterThan(0);
      for (const driver of matches) {
        expect(driver).toBe('false');
      }
    });

    it('morphPortalIn: portalOpacity is JS-driven', () => {
      const fn = overlaySrc.match(
        /const morphPortalIn = useCallback[\s\S]*?trackAnim\]\)\s*;/,
      );
      expect(fn).not.toBeNull();
      // Constrain the inner match to the timing block's {...} so the
      // lazy wildcard cannot leak into a sibling Animated.timing.
      expect(fn?.[0]).toMatch(
        /Animated\.timing\(portalOpacity,\s*\{[^}]*useNativeDriver:\s*false/,
      );
      expect(fn?.[0]).not.toMatch(
        /Animated\.timing\(portalOpacity,\s*\{[^}]*useNativeDriver:\s*true/,
      );
    });

    it('morphBoardReveal: portalOpacity is JS-driven', () => {
      const fn = overlaySrc.match(
        /const morphBoardReveal = useCallback[\s\S]*?trackAnim\]\)\s*;/,
      );
      expect(fn).not.toBeNull();
      expect(fn?.[0]).toMatch(
        /Animated\.timing\(portalOpacity,[^)]*useNativeDriver:\s*false/,
      );
      expect(fn?.[0]).not.toMatch(
        /Animated\.timing\(portalOpacity,[^)]*useNativeDriver:\s*true/,
      );
    });

    it('keeps the always-mounted single-host values on the native driver (dimOpacity, exitOpacity)', () => {
      // dimOpacity (post-96a4aba) and exitOpacity each bind to a
      // single, always-mounted Animated.View host (the dim backdrop
      // and the root overlay). REQ-A-1 is satisfied; the native
      // driver stays here.
      expect(overlaySrc).toMatch(/Animated\.timing\(dimOpacity,[\s\S]*?useNativeDriver:\s*true/);
      expect(overlaySrc).toMatch(/Animated\.timing\(exitOpacity,[\s\S]*?useNativeDriver:\s*true/);
    });

    it('forces conditionally-mounted hosts off the native driver (glowOpacity, calloutOpacity, codexTranslate — Build 21 fix)', () => {
      // Each of these values is consumed by an Animated.View whose
      // mount is gated on a runtime condition (showPieceGlow,
      // phase === 'arrived', codexVisible). The host's native node
      // detaches when the condition flips false and a new node
      // mounts when it flips true. A subsequent native-driven
      // Animated.timing on the same value attaches to the new host
      // while iOS still holds the prior binding → NSException →
      // SIGABRT/SIGSEGV. The Build 21 A1-1 SIGSEGV traced to
      // calloutOpacity at the step 0 → step 1 transition. See
      // project-docs/REPORTS/build21-sigsegv-investigation.md.
      expect(overlaySrc).not.toMatch(/Animated\.timing\(glowOpacity,[^}]*useNativeDriver:\s*true/);
      expect(overlaySrc).not.toMatch(/Animated\.timing\(calloutOpacity,[^}]*useNativeDriver:\s*true/);
      expect(overlaySrc).not.toMatch(/Animated\.timing\(codexTranslate,[^}]*useNativeDriver:\s*true/);
    });
  });

  describe('Fix 2 — Boot screen cursor delays until last line lands', () => {
    it('wraps the cursor blink loop in withDelay(5800)', () => {
      // The "Tap anywhere to receive." line lands at delay 5600;
      // cursor waits 5800 to give the line a tiny lead-in before
      // starting to blink.
      expect(bootSrc).toMatch(
        /cursorOpacity\.value = withDelay\(\s*5800,\s*withRepeat\(/,
      );
    });

    it('cursor opacity still initializes to 0 (held invisible until the delay fires)', () => {
      expect(bootSrc).toMatch(/const cursorOpacity = useSharedValue\(0\)/);
    });

    it('still oscillates 0 ↔ 1 over 500ms each leg once the delay elapses', () => {
      const block = bootSrc.match(
        /cursorOpacity\.value = withDelay[\s\S]*?\)\s*;/,
      );
      expect(block).not.toBeNull();
      expect(block?.[0]).toMatch(/withTiming\(1, \{ duration: 500 \}\)/);
      expect(block?.[0]).toMatch(/withTiming\(0, \{ duration: 500 \}\)/);
    });
  });
});
