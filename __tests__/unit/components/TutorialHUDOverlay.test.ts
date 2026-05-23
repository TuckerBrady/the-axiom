// Source-contract tests for PROMPT_126 fixes to TutorialHUDOverlay:
//   Fix 1: dim overlay clears when an awaitPlacement step advances,
//          so the board is unobscured as the orb flies to the
//          placed piece.
//   Fix 2: orb is offset below the placed piece on allowPieceTap
//          steps so the player can actually tap the target.
//
// Both are static-content assertions against
// src/components/TutorialHUDOverlay.tsx — same convention as the
// other TutorialHUDOverlay*.test.ts files in this directory.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const overlaySrc = read('src/components/TutorialHUDOverlay.tsx');

describe('Tutorial overlay dim behavior on placement advance', () => {
  // Find the useEffect that watches lastPlacedTrigger and calls
  // advanceStep() when the placement matches the current step's
  // awaitPlacement field. The fix animates dimOpacity to 0 right
  // before advanceStep() so the board clears as the orb starts
  // its codex-capture flight.
  let placementEffect: string;

  beforeAll(() => {
    const m = overlaySrc.match(
      /lastPlacedSeqRef\.current = lastPlacedTrigger\.seq;[\s\S]*?advanceStep\(\);/,
    );
    placementEffect = m ? m[0] : '';
  });

  it('locates the placement-trigger effect body in the source', () => {
    expect(placementEffect).not.toBe('');
  });

  it('dimOpacity animates to 0 when awaitPlacement step advances', () => {
    // Look for an Animated.timing call on dimOpacity with toValue 0
    // inside the placement effect, scheduled before advanceStep().
    expect(placementEffect).toMatch(
      /Animated\.timing\(\s*dimOpacity\s*,\s*\{[\s\S]*?toValue:\s*0[\s\S]*?\}\s*\)/,
    );
  });

  it('the dim clear happens before advanceStep() (no blocking delay between them)', () => {
    // Verify the animation .start() call appears before advanceStep()
    // in the effect body. The two should run concurrently — the
    // animation is fire-and-forget, not awaited.
    expect(placementEffect).toMatch(
      /Animated\.timing\([\s\S]*?dimOpacity[\s\S]*?\)\.start\(\);\s*advanceStep\(\);/,
    );
  });

  it('does not move the dim-clear into resetVisualState (where it would affect all transitions)', () => {
    const reset = overlaySrc.match(/const resetVisualState = useCallback\(\(\) => \{[\s\S]*?\}, \[/);
    const resetBody = reset ? reset[0] : '';
    expect(resetBody).not.toContain('dimOpacity');
  });
});

describe('Tutorial orb offset for allowPieceTap steps', () => {
  // Extract the body of runStep that computes centerX/centerY and
  // calls flyOrbTo. The fix conditionally offsets centerY (downward
  // by ORB_SIZE * 2) before passing it to flyOrbTo when the step
  // has allowPieceTap.
  let runStepFlyBlock: string;

  beforeAll(() => {
    const m = overlaySrc.match(
      /const centerY[\s\S]*?flyOrbTo\([^)]*\)/,
    );
    runStepFlyBlock = m ? m[0] : '';
  });

  it('locates the runStep fly-orb block in the source', () => {
    expect(runStepFlyBlock).not.toBe('');
  });

  it('orb Y position is offset below the target when step has allowPieceTap', () => {
    // Either an inline ternary on allowPieceTap or an explicit
    // targetY assignment that adds an offset when allowPieceTap is
    // true. Accept either shape so the source can pick the
    // clearer form. The offset must reference ORB_SIZE or the
    // numeric fallback 48.
    expect(runStepFlyBlock).toMatch(
      /allowPieceTap[\s\S]*?(centerY\s*\+\s*(ORB_SIZE\s*\*\s*2|48))/,
    );
  });

  it('orb Y position is NOT offset for codex steps without allowPieceTap', () => {
    // The fall-through branch of the conditional must pass the
    // original centerY through. Whether written as a ternary
    // (`allowPieceTap ? centerY + X : centerY`) or as a guarded
    // mutation, the non-allowPieceTap path must end up at centerY.
    expect(runStepFlyBlock).toMatch(
      /allowPieceTap[\s\S]*?\?\s*centerY\s*\+[\s\S]*?:\s*centerY/,
    );
  });
});
