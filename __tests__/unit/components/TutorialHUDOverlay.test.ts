// Source-contract tests for PROMPT_127 fixes to TutorialHUDOverlay.
// PROMPT_126's targeted patches (placement-event dim clear; orb nudge
// of centerY + ORB_SIZE * 2) were insufficient — both are being
// removed and replaced by the layout below. This file pins the new
// behavior and guards the PROMPT_126 patterns from reappearing.
//
// Fix 1: dim is driven by the active step (not the placement event).
//   - Tray-targeting steps  (targetRef starts with 'tray')   → 0.45
//   - placedPiece-targeting steps                            → 0
//   - All other steps                                         → unchanged
//
// Fix 2: on allowPieceTap steps the orb + callout are bottom-docked
//   as a unit so the orb never sits on the tap target.
//
// Fix 3: on awaitPlacement steps that target the tray, the orb
//   hovers above the tray icon (orbY = box.top - 6 - ORB_SIZE/2).
//
// All assertions are static-content checks against
// src/components/TutorialHUDOverlay.tsx — same convention as the
// other TutorialHUDOverlay*.test.ts files in this directory.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const overlaySrc = read('src/components/TutorialHUDOverlay.tsx');

// ── Helper: extract the runStep callback body ────────────────────────────────
function extractRunStep(src: string): string {
  const m = src.match(/const runStep = useCallback\(\(idx: number\) => \{[\s\S]*?\}, \[[^\]]*\]\);/);
  return m ? m[0] : '';
}

function extractCalloutPos(src: string): string {
  const m = src.match(/const calloutPos = useMemo\([\s\S]*?\}, \[[^\]]*\]\);/);
  return m ? m[0] : '';
}

function extractPlacementEffect(src: string): string {
  const m = src.match(
    /lastPlacedSeqRef\.current = lastPlacedTrigger\.seq;[\s\S]*?\}, \[lastPlacedTrigger[^\]]*\]\);/,
  );
  return m ? m[0] : '';
}

// ── PROMPT_126 regression guards ────────────────────────────────────────────
// These pin the failed-approach patterns as gone so they can't drift
// back into the source via a future patch.

describe('PROMPT_126 regressions guarded', () => {
  it('placement-trigger effect no longer animates dimOpacity', () => {
    const eff = extractPlacementEffect(overlaySrc);
    expect(eff).not.toMatch(/Animated\.timing\(\s*dimOpacity\b/);
  });

  it('runStep no longer uses the centerY + ORB_SIZE * 2 nudge', () => {
    const run = extractRunStep(overlaySrc);
    expect(run).not.toMatch(/centerY\s*\+\s*ORB_SIZE\s*\*\s*2/);
  });

  it('dim-clear is not moved into resetVisualState (would affect all transitions)', () => {
    const reset = overlaySrc.match(/const resetVisualState = useCallback\([\s\S]*?\}, \[[^\]]*\]\);/);
    expect((reset ? reset[0] : '')).not.toContain('dimOpacity');
  });
});

// ── Fix 1 ────────────────────────────────────────────────────────────────────

describe('Dim driven by active step (not placement event)', () => {
  let runStep: string;

  beforeAll(() => {
    runStep = extractRunStep(overlaySrc);
  });

  it('runStep is located in the source', () => {
    expect(runStep).not.toBe('');
  });

  it('runStep references the tray-prefix check for dim selection', () => {
    // The dim-target selection must key off targetRef.startsWith('tray')
    // so it generalizes to every tray-targeting step, not a hardcoded
    // step id.
    expect(runStep).toMatch(/targetRef\??\.\s*startsWith\(\s*['"]tray['"]\s*\)/);
  });

  it('runStep selects dim target 0.45 for tray-targeting steps', () => {
    // Either the tray branch produces 0.45 directly or it appears as
    // the value in the conditional that selects the dim target.
    expect(runStep).toMatch(/0\.45/);
  });

  it('runStep selects dim target 0 for placedPiece-targeting steps', () => {
    expect(runStep).toMatch(/['"]placedPiece['"]/);
  });

  it('runStep animates dimOpacity toward the selected target (250ms ease-out)', () => {
    // The animation must call Animated.timing on dimOpacity with a
    // 250ms duration and an ease-out easing. Accept either explicit
    // Easing.out(...) or the bezier form used elsewhere in the file.
    expect(runStep).toMatch(
      /Animated\.timing\(\s*dimOpacity\b[\s\S]*?duration:\s*250[\s\S]*?easing:\s*Easing\.(out|bezier)/,
    );
  });
});

// ── Fix 2 ────────────────────────────────────────────────────────────────────

describe('Orb and callout positions on conveyor-teach (allowPieceTap)', () => {
  let calloutPos: string;
  let runStep: string;

  beforeAll(() => {
    calloutPos = extractCalloutPos(overlaySrc);
    runStep = extractRunStep(overlaySrc);
  });

  it('calloutPos is located in the source', () => {
    expect(calloutPos).not.toBe('');
  });

  it('calloutPos returns a bottom-docked position when step has allowPieceTap', () => {
    // The override must compute calloutTop = SCREEN_H - NAV_HEIGHT - 16 - CALLOUT_H_EST.
    // For 390x844 frame: top == 576, left == 24.
    expect(calloutPos).toMatch(
      /allowPieceTap[\s\S]*?SCREEN_H\s*-\s*NAV_HEIGHT\s*-\s*16\s*-\s*CALLOUT_H_EST/,
    );
  });

  it('runStep flies the orb above the docked callout when step has allowPieceTap', () => {
    // The orb landing point on bottom-dock steps must be derived from
    // the callout position: orbCy = calloutTop - 10 - ORB_SIZE/2.
    expect(runStep).toMatch(
      /allowPieceTap[\s\S]*?calloutTop\s*-\s*10\s*-\s*ORB_SIZE\s*\/\s*2/,
    );
  });

  it('non-allowPieceTap steps still use the existing portal-relative callout logic', () => {
    // The existing portal-relative branches (portalCenterY < midY, etc.)
    // must remain intact for codex / non-tap steps.
    expect(calloutPos).toMatch(/portalCenterY\s*<\s*midY/);
    expect(calloutPos).toMatch(/Target in top half/);
  });
});

// ── Fix 3 ────────────────────────────────────────────────────────────────────

describe('Orb hovers above tray icon on awaitPlacement tray steps', () => {
  let runStep: string;

  beforeAll(() => {
    runStep = extractRunStep(overlaySrc);
  });

  it('runStep computes orb hover Y from box.top - 6 - ORB_SIZE/2 for tray awaitPlacement steps', () => {
    // The tray-hover override fires when awaitPlacement is set AND
    // the target is a tray ref. The orb bottom edge lands 6px above
    // the portal box top so the Conveyor icon remains fully visible.
    expect(runStep).toMatch(
      /awaitPlacement[\s\S]*?targetRef\??\.\s*startsWith\(\s*['"]tray['"]\s*\)[\s\S]*?box\.top\s*-\s*6\s*-\s*ORB_SIZE\s*\/\s*2/,
    );
  });
});
