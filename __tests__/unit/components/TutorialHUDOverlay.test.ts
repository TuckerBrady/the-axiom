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
const levelsSrc = read('src/game/levels.ts');

// ── Helper: slice the A1-1 tutorialSteps array ────────────────────────────────
function extractA11Steps(src: string): string {
  // Anchor on the A1-1 level definition, then grab from its
  // `tutorialSteps:` opening bracket to the closing `],`.
  const a11Start = src.indexOf("id: 'A1-1'");
  if (a11Start === -1) return '';
  const stepsKey = src.indexOf('tutorialSteps:', a11Start);
  if (stepsKey === -1) return '';
  const openBracket = src.indexOf('[', stepsKey);
  if (openBracket === -1) return '';
  // Walk to find the matching closing bracket.
  let depth = 0;
  let i = openBracket;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) break;
    }
  }
  return src.slice(openBracket, i + 1);
}

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

  it('runStep computes orb hover Y from box.top for any tray-targeted step (PROMPT_129 widened)', () => {
    // PROMPT_129 collapsed A1-1's gated conveyor flow, so the tray-hover
    // override now fires for ANY tray step (not gated on awaitPlacement).
    // The orb sits above the label, which sits above the tray slot.
    expect(runStep).toMatch(
      /targetRef\??\.\s*startsWith\(\s*['"]tray['"]\s*\)[\s\S]*?box\.top\s*-/,
    );
  });
});

// ── PROMPT_128 Fix 1: square highlight (no glow circle) on piece targets ──
describe('PROMPT_128 -- glow circle suppressed on piece targets (square only)', () => {
  it('defines a square-only-target flag keying off tray-prefix and placedPiece', () => {
    // A single derived flag must mark tray-prefixed AND placedPiece targets
    // as square-only, so it generalizes across every piece-teach step
    // (conveyor, gear, configNode, scanner, transmitter) with no hardcoded ids.
    expect(overlaySrc).toMatch(
      /isSquareOnlyTarget[\s\S]{0,160}?startsWith\(\s*['"]tray['"]\s*\)[\s\S]{0,80}?===\s*['"]placedPiece['"]/,
    );
  });

  it('showPieceGlow excludes square-only targets', () => {
    const m = overlaySrc.match(/const showPieceGlow\s*=[\s\S]*?;/);
    expect(m ? m[0] : '').toMatch(/!\s*isSquareOnlyTarget/);
  });

  it('showPieceGlow still excludes SECTION targets (unchanged)', () => {
    const m = overlaySrc.match(/const showPieceGlow\s*=[\s\S]*?;/);
    expect(m ? m[0] : '').toMatch(/SECTION_TARGETS\.has/);
  });

  it('glow circle JSX is preserved for port/board-codex targets (NOT deleted)', () => {
    expect(overlaySrc).toMatch(/showPieceGlow && glowCircle/);
  });

  it('glowPulse loop is preserved (NOT deleted)', () => {
    expect(overlaySrc).toMatch(/Animated\.loop\(/);
    expect(overlaySrc).toMatch(/glowPulse/);
  });
});

// ── PROMPT_128 Fix 2: board into focus on the awaitPlacement tray (act) step ──
describe('PROMPT_128 -- board into focus on the awaitPlacement tray step', () => {
  let runStep: string;
  let calloutPos: string;
  beforeAll(() => {
    runStep = extractRunStep(overlaySrc);
    calloutPos = extractCalloutPos(overlaySrc);
  });

  it('runStep resolves dim 0 once a tray step is awaiting placement (0.45 reserved for notice)', () => {
    // dimTarget must be 0.45 ONLY for a tray step that is NOT awaiting a
    // placement; the act step (tray + awaitPlacement) drops to 0.
    expect(runStep).toMatch(/!\s*s\.awaitPlacement[\s\S]{0,60}?0\.45[\s\S]{0,20}?:\s*0/);
  });

  it('runStep still animates dimOpacity 250ms ease-out (PROMPT_127 preserved)', () => {
    expect(runStep).toMatch(
      /Animated\.timing\(\s*dimOpacity\b[\s\S]*?duration:\s*250[\s\S]*?easing:\s*Easing\.(out|bezier)/,
    );
  });

  it('portal square is suppressed via !isSquareOnlyTarget (PROMPT_129 widened); label always renders', () => {
    // PROMPT_129 widened the portal suppression from
    // (awaitPlacement && tray) to the broader !isSquareOnlyTarget
    // gate, and DROPPED the label suppression entirely — the label
    // is the orientation cue when the square goes away. So the old
    // (awaitPlacement && tray) guard pattern must be gone.
    expect(overlaySrc).not.toMatch(
      /!\(\s*step\??\.\s*awaitPlacement[\s\S]{0,80}?startsWith\(\s*['"]tray['"]\s*\)\s*\)/,
    );
    expect(overlaySrc).toMatch(/portalBox && !isSquareOnlyTarget/);
  });

  it('callout top-docks (top: 80) on awaitPlacement tray steps', () => {
    expect(calloutPos).toMatch(
      /awaitPlacement[\s\S]{0,120}?startsWith\(\s*['"]tray['"]\s*\)[\s\S]*?top:\s*80/,
    );
  });

  it('orb still hovers above the tray icon on tray steps (PROMPT_129 raised above label)', () => {
    // PROMPT_129 raised the orb to clear the PIECE TRAY label, so the
    // formula now subtracts the label height too. The orb still uses
    // box.top as its anchor and still subtracts ORB_SIZE/2 for centering.
    expect(runStep).toMatch(/box\.top\s*-[\s\S]*?ORB_SIZE\s*\/\s*2/);
  });
});

// ── PROMPT_128: placedPiece keeps the square, drops the circle ──
describe('PROMPT_128 -- placedPiece keeps the square, drops the circle', () => {
  let runStep: string;
  let calloutPos: string;
  beforeAll(() => {
    runStep = extractRunStep(overlaySrc);
    calloutPos = extractCalloutPos(overlaySrc);
  });

  it('placedPiece dim target stays 0 (PROMPT_127 preserved)', () => {
    expect(runStep).toMatch(/['"]placedPiece['"]/);
  });

  it('placedPiece allowPieceTap callout still bottom-docks (PROMPT_127 preserved)', () => {
    expect(calloutPos).toMatch(
      /allowPieceTap[\s\S]*?SCREEN_H\s*-\s*NAV_HEIGHT\s*-\s*16\s*-\s*CALLOUT_H_EST/,
    );
  });
});

// ── PROMPT_129 -- restore the gold "teach then hand over" A1-1 flow ─────────
describe('PROMPT_129 -- A1-1 restored to the gold teach-then-hand-over flow', () => {
  let a11: string;
  beforeAll(() => { a11 = extractA11Steps(levelsSrc); });

  it('A1-1 has the gold conveyor-collect codex step', () => {
    expect(a11).toMatch(/id:\s*['"]conveyor-collect['"]/);
    expect(a11).toMatch(/codexEntryId:\s*['"]conveyor['"]/);
  });

  it('A1-1 has the gold board-resume hand-over step', () => {
    expect(a11).toMatch(/id:\s*['"]board-resume['"]/);
  });

  it('A1-1 no longer has the gated conveyor-instruct / conveyor-teach steps', () => {
    expect(a11).not.toMatch(/conveyor-instruct/);
    expect(a11).not.toMatch(/conveyor-teach/);
    expect(a11).not.toMatch(/conveyor-capture/);
  });

  it('A1-1 no longer gates the tutorial on placement or piece-tap', () => {
    expect(a11).not.toMatch(/awaitPlacement/);
    expect(a11).not.toMatch(/allowPieceTap/);
  });
});

describe('PROMPT_129 -- ungated tap-anywhere dismissal restored', () => {
  it('handleTapAnywhere no longer early-returns on awaitPlacement', () => {
    const m = overlaySrc.match(/const handleTapAnywhere = useCallback\([\s\S]*?\}, \[[^\]]*\]\);/);
    const body = m ? m[0] : '';
    expect(body).not.toMatch(/awaitPlacement/);
    expect(body).not.toMatch(/allowPieceTap/);
  });

  it('the full-screen tap layer is rendered unconditionally (not gated by step flags)', () => {
    // The Pressable/tap layer must not be wrapped in a
    // !(step?.awaitPlacement || step?.allowPieceTap) guard.
    expect(overlaySrc).not.toMatch(/!\(\s*step\??\.\s*awaitPlacement\s*\|\|\s*step\??\.\s*allowPieceTap\s*\)/);
    expect(overlaySrc).toMatch(/onPress=\{handleTapAnywhere\}/);
  });
});

describe('PROMPT_129 -- no square and no glow on piece/tray targets', () => {
  it('showPieceGlow excludes tray-prefixed and placedPiece targets (no glow circle)', () => {
    const m = overlaySrc.match(/const showPieceGlow\s*=[\s\S]*?;/);
    expect(m ? m[0] : '').toMatch(/!\s*isSquareOnlyTarget/);
  });

  it('the portal corner-bracket square is suppressed on tray/placedPiece targets', () => {
    // The portal render block must be gated so it does NOT draw for
    // square-only (tray/placedPiece) targets. After this change the
    // portal renders only for board/section/port targets.
    const portalGuards = overlaySrc.match(/portalBox &&[\s\S]{0,80}?!\s*isSquareOnlyTarget/g);
    expect(portalGuards && portalGuards.length >= 1).toBe(true);
  });

  it('glowCircle JSX and glowPulse loop are preserved for board/port targets', () => {
    expect(overlaySrc).toMatch(/showPieceGlow && glowCircle/);
    expect(overlaySrc).toMatch(/Animated\.loop\(/);
  });
});

describe('PROMPT_129 -- COGS orb sits above the PIECE TRAY label on tray steps', () => {
  it('runStep positions the orb above the tray label on tray-targeted steps', () => {
    const runStep = extractRunStep(overlaySrc);
    // Orb target Y for a tray step is computed above the label/portal box
    // top (a negative offset from box.top). Accept the existing tray-hover
    // form or an explicit label-relative offset.
    expect(runStep).toMatch(/startsWith\(\s*['"]tray['"]\s*\)/);
    expect(runStep).toMatch(/box\.top\s*-/);
  });
});
