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

  it('calloutPos snaps to the lower anchor (CALLOUT_LOWER_TOP) formula', () => {
    // UX-01 two-position system: the lower anchor is
    // SCREEN_H - NAV_HEIGHT - 16 - CALLOUT_H_EST (~576 on 390x844). The
    // old allowPieceTap special case is superseded by the general rule.
    expect(calloutPos).toMatch(
      /SCREEN_H\s*-\s*NAV_HEIGHT\s*-\s*16\s*-\s*CALLOUT_H_EST/,
    );
  });

  it('runStep flies the orb above the docked callout when step has allowPieceTap', () => {
    // The orb landing point on bottom-dock steps must be derived from
    // the callout position: orbCy = calloutTop - 10 - ORB_SIZE/2.
    expect(runStep).toMatch(
      /allowPieceTap[\s\S]*?calloutTop\s*-\s*10\s*-\s*ORB_SIZE\s*\/\s*2/,
    );
  });

  it('calloutPos uses the two-position rule keyed on portalCenterY vs SCREEN_H / 2', () => {
    // UX-01: the floating portal-relative branches (portalCenterY < midY,
    // "Target in top half") are removed in favor of a single two-branch
    // rule.
    expect(calloutPos).toMatch(/portalCenterY\s*>\s*SCREEN_H\s*\/\s*2/);
    expect(calloutPos).not.toMatch(/portalCenterY\s*<\s*midY/);
    expect(calloutPos).not.toMatch(/Target in top half/);
  });
});

// ── Fix 3 ────────────────────────────────────────────────────────────────────

describe('Presentation Mode — orb stays centered (Tucker 2026-06-13)', () => {
  let runStep: string;

  beforeAll(() => {
    runStep = extractRunStep(overlaySrc);
  });

  it('runStep centers the orb on screen for every step (no tray-hover / tape-below chase)', () => {
    // COGS stays centered the whole time; only the highlight + caption + card
    // move. The orb fly target defaults to screen center.
    expect(runStep).toMatch(/let targetCx = SCREEN_W \/ 2;/);
    expect(runStep).toMatch(/let targetCy = SCREEN_H \/ 2;/);
    // The old tray-hover (box.top - 24) and tape-below overrides are gone.
    expect(runStep).not.toMatch(/const labelTop = box\.top - 24/);
    expect(runStep).not.toMatch(/box\.top \+ box\.height \+ 12 \+ ORB_SIZE/);
  });

  it('still steps the orb aside (bottom-dock) on allowPieceTap so the piece is tappable', () => {
    expect(runStep).toMatch(/if \(s\.allowPieceTap\)/);
    expect(runStep).toMatch(/targetCy = calloutTop - 10 - ORB_SIZE \/ 2/);
  });
});

// ── PROMPT_128 Fix 1: square highlight (no glow circle) on piece targets ──
describe('PROMPT_128 -- glow circle suppressed on piece targets (square only)', () => {
  it('marks every spotlight target as square-only (Presentation Mode, 2026-06-13)', () => {
    // The orb is centered, so the glow circle is suppressed for ALL targets —
    // the highlight is the amber square / board outline only. The flag is now
    // simply "any non-center target".
    expect(overlaySrc).toMatch(
      /const isSquareOnlyTarget = !!step && step\.targetRef !== 'center'/,
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

  it('portal square renders for all targets (PROMPT_138 superseded the PROMPT_129 suppression); label always renders', () => {
    // PROMPT_129 had suppressed the corner-bracket square on
    // square-only (tray/placedPiece) targets. PROMPT_138 reversed that:
    // the square frames every target; only the filled glow circle stays
    // suppressed (via the separate showPieceGlow block). The old
    // (awaitPlacement && tray) guard must still be gone, and the portal
    // gate must NO LONGER include !isSquareOnlyTarget.
    expect(overlaySrc).not.toMatch(
      /!\(\s*step\??\.\s*awaitPlacement[\s\S]{0,80}?startsWith\(\s*['"]tray['"]\s*\)\s*\)/,
    );
    expect(overlaySrc).not.toMatch(/portalBox && !isSquareOnlyTarget/);
  });

  it('callout top-docks (upper anchor = 80) for lower-half / tray targets', () => {
    // UX-01: a tray target sits in the lower half of the screen, so the
    // general two-position rule resolves to the upper anchor
    // (CALLOUT_UPPER_TOP = 80). The awaitPlacement tray special case is
    // superseded and removed.
    expect(calloutPos).toMatch(/CALLOUT_UPPER_TOP/);
    expect(overlaySrc).toMatch(/const CALLOUT_UPPER_TOP = 80/);
    expect(calloutPos).not.toMatch(/awaitPlacement/);
  });

  it('orb no longer hovers above the tray icon — it stays centered (Presentation Mode)', () => {
    // 2026-06-13: COGS stays centered; the tray-hover override was removed.
    expect(runStep).not.toMatch(/const labelTop = box\.top - 24/);
    expect(runStep).toMatch(/let targetCy = SCREEN_H \/ 2;/);
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

  it('placedPiece/allowPieceTap callout now follows the two-position rule (UX-01 supersedes the bottom-dock special case)', () => {
    // A placedPiece target sits on the board (lower half), so the general
    // rule resolves its callout via portalCenterY vs SCREEN_H / 2 rather
    // than a dedicated allowPieceTap branch inside calloutPos.
    expect(calloutPos).not.toMatch(/allowPieceTap/);
    expect(calloutPos).toMatch(/portalCenterY\s*>\s*SCREEN_H\s*\/\s*2/);
  });
});

// ── PROMPT_140 -- A1-1 inline codex reveal (no awaitPlacement/placedPiece) ──
// PROMPT_140 supersedes PROMPT_138's orb-chase capture beat (Tucker
// direction): COGS notices the new piece in the tray and reveals it to the
// Codex inline. conveyor-collect carries codexEntryId 'conveyor' (the '???'
// discovery caption is now derived from that, not a per-step label —
// PROMPT_143/PROMPT_146); conveyor-reveal is a tray-targeted named beat.
// No placement gate, no placedPiece target.
describe('PROMPT_140 -- A1-1 inline codex reveal', () => {
  let a11: string;
  beforeAll(() => { a11 = extractA11Steps(levelsSrc); });

  it("A1-1 conveyor-collect carries codexEntryId 'conveyor' and targets the tray slot", () => {
    const m = a11.match(/\{[^{}]*id:\s*['"]conveyor-collect['"][^{}]*\}/);
    expect(m).not.toBeNull();
    const step = m ? m[0] : '';
    expect(step).toMatch(/targetRef:\s*['"]trayConveyor['"]/);
    expect(step).toMatch(/codexEntryId:\s*['"]conveyor['"]/);
    expect(step).not.toMatch(/awaitPlacement/);
  });

  it('A1-1 conveyor-reveal targets the tray slot (not a placed piece) with no own codex', () => {
    const m = a11.match(/\{[^{}]*id:\s*['"]conveyor-reveal['"][^{}]*\}/);
    expect(m).not.toBeNull();
    const step = m ? m[0] : '';
    expect(step).toMatch(/targetRef:\s*['"]trayConveyor['"]/);
    expect(step).toMatch(/eyeState:\s*['"]green['"]/);
    expect(step).not.toMatch(/codexEntryId/);
  });

  it('A1-1 has no awaitPlacement and no placedPiece target on any step', () => {
    expect(a11).not.toMatch(/awaitPlacement/);
    expect(a11).not.toMatch(/placedPiece/);
  });

  it('conveyor-reveal sits between conveyor-collect and board-resume', () => {
    const collect = a11.indexOf("id: 'conveyor-collect'");
    const reveal = a11.indexOf("id: 'conveyor-reveal'");
    const resume = a11.indexOf("id: 'board-resume'");
    expect(collect).toBeGreaterThanOrEqual(0);
    expect(reveal).toBeGreaterThan(collect);
    expect(resume).toBeGreaterThan(reveal);
  });

  it('conveyor-reveal message is the Tucker-approved copy', () => {
    const idx = a11.indexOf("id: 'conveyor-reveal'");
    const slice = a11.slice(idx, idx + 600);
    expect(slice).not.toMatch(/PROPOSED/);
    expect(slice).toMatch(
      /message:\s*['"]Logged\. CONVEYOR\. Routes signal in a straight line\. I have seen worse\.['"]/
    );
  });

  it('A1-1 still keeps board-resume as the final hand-over step', () => {
    expect(a11).toMatch(/id:\s*['"]board-resume['"]/);
  });

  it('A1-1 does not introduce a standalone conveyor-instruct / conveyor-capture step', () => {
    expect(a11).not.toMatch(/conveyor-instruct/);
    expect(a11).not.toMatch(/conveyor-capture/);
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

describe('PROMPT_138 -- square renders on all targets, glow circle suppressed on tray/placedPiece', () => {
  it('showPieceGlow excludes tray-prefixed and placedPiece targets (no glow circle)', () => {
    const m = overlaySrc.match(/const showPieceGlow\s*=[\s\S]*?;/);
    expect(m ? m[0] : '').toMatch(/!\s*isSquareOnlyTarget/);
  });

  it('the portal corner-bracket square is NOT gated by isSquareOnlyTarget (renders on every target)', () => {
    // PROMPT_138: the corner-bracket square frames every portal target,
    // including square-only (tray/placedPiece). The portal gate must no
    // longer carry the !isSquareOnlyTarget exclusion.
    expect(overlaySrc).not.toMatch(/portalBox &&[\s\S]{0,80}?!\s*isSquareOnlyTarget/);
    // The portal block is still gated on phase + portalBox so it only
    // draws once the orb has arrived and a box has been measured.
    expect(overlaySrc).toMatch(/phase !== 'flying' && phase !== 'idle' && portalBox &&/);
  });

  it('glowCircle JSX and glowPulse loop are preserved for board/port targets', () => {
    expect(overlaySrc).toMatch(/showPieceGlow && glowCircle/);
    expect(overlaySrc).toMatch(/Animated\.loop\(/);
  });
});

describe('Presentation Mode -- COGS stays centered on tray steps too (2026-06-13)', () => {
  it('runStep no longer special-cases tray steps for orb position (orb centered)', () => {
    const runStep = extractRunStep(overlaySrc);
    // The tray-hover override was removed; the orb defaults to screen center
    // for tray steps like every other spotlight step.
    expect(runStep).not.toMatch(/const labelTop = box\.top - 24/);
    expect(runStep).toMatch(/let targetCx = SCREEN_W \/ 2;/);
  });
});

// ── Tutorial highlight colors (Tucker 2026-06-13) ──
describe('Highlight colors -- blue corner brackets, green pre-capture orb', () => {
  it('corner targeting brackets are blue (#00D4FF), main rectangle stays amber', () => {
    // st.corner border is blue.
    expect(overlaySrc).toMatch(/corner:\s*\{[\s\S]*?borderColor:\s*'#00D4FF'/);
    // The four corner brackets cast a blue shadow, not amber.
    expect(overlaySrc).not.toMatch(/st\.corner[\s\S]*?shadowColor:\s*'#F0B429'/);
    // The main highlight rectangle border is still amber.
    expect(overlaySrc).toMatch(/borderColor:\s*'#F0B429'/);
  });

  it("orb reads green while highlighting a piece before capture (captionLabel '???')", () => {
    expect(overlaySrc).toMatch(
      /eyeColor =\s*step\?\.captionLabel === '\?\?\?'\s*\?\s*eyeStateColor\('green'\)/,
    );
  });
});
