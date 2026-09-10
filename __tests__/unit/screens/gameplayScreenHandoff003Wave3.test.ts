// Source-contract tests for Handoff 003 Wave 3 (AXM-006) requirements not
// already covered by a dedicated test file. GameplayScreen.tsx / gameplay
// components are exercised end-to-end on device via Maestro — here the
// contract is verified by source inspection, matching this file's
// established convention (see WireOverlay.test.ts, TapeColorsAndBeam.test.ts,
// gameplayScreenHandoff003Wave1/2.test.ts).

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

// ─── REQ-G-10 — 11pt type floor, CI-checkable across the whole surface ───────
// The acceptance criterion is literal: "no fontSize literal below 11 in
// src/components/gameplay/ or GameplayScreen.tsx." This scans for real
// regressions, not just the specific instances fixed in this mission.
describe('REQ-G-10 — no fontSize literal below 11, gameplay-wide (CI-checkable)', () => {
  const gameplayDir = path.resolve(repoRoot, 'src/components/gameplay');
  const files = fs
    .readdirSync(gameplayDir)
    .filter(f => f.endsWith('.tsx'))
    .map(f => path.join('src/components/gameplay', f))
    .concat(['src/screens/GameplayScreen.tsx']);

  it.each(files)('%s has no fontSize literal below 11', file => {
    const src = read(file);
    const offenders = [...src.matchAll(/fontSize:\s*([0-9]+(?:\.[0-9]+)?)/g)]
      .map(m => parseFloat(m[1]))
      .filter(n => n < 11);
    expect(offenders).toEqual([]);
  });
});

describe('REQ-G-10 — specific instances named in the spec', () => {
  const tapeCellSrc = read('src/components/gameplay/TapeCell.tsx');
  const tapeBarShellSrc = read('src/components/gameplay/TapeBarShell.tsx');
  const modalsSrc = read('src/components/gameplay/GameplayModals.tsx');
  const specSheetSrc = read('src/components/gameplay/SpecSheetPanel.tsx');

  it('TapeCell grows to 26x26 with a 12pt digit', () => {
    expect(tapeCellSrc).toMatch(/tapeCell:\s*\{\s*width:\s*26,\s*height:\s*26,/);
    expect(tapeCellSrc).toMatch(/tapeCellText:\s*\{[\s\S]*?fontSize:\s*12,/);
  });

  it('TapeBarShell tracks the new 26pt cell pitch, not the stale 24pt one', () => {
    expect(tapeBarShellSrc).toMatch(/const TAPE_CELL_PITCH = 26 \+ 3;/);
    expect(tapeBarShellSrc).not.toMatch(/\* \(24 \+ 3\)/);
    expect(tapeBarShellSrc).toMatch(/tapeIndicatorBar:\s*\{[\s\S]*?width:\s*26,/);
  });

  it('voidBtn takes paddingVertical: Spacing.lg and an 11pt starWhite label (red carried by the border)', () => {
    expect(modalsSrc).toMatch(/voidBtn:\s*\{[\s\S]*?paddingVertical:\s*Spacing\.lg,/);
    expect(modalsSrc).toMatch(
      /voidBtnText:\s*\{\s*fontFamily:\s*Fonts\.orbitron,\s*fontSize:\s*FontSizes\.floor,\s*color:\s*Colors\.starWhite,/,
    );
  });

  it('SpecSheetPanel.closeBtn takes paddingVertical: 14 (was ~31pt tall)', () => {
    expect(specSheetSrc).toMatch(/closeBtn:\s*\{[\s\S]*?paddingVertical:\s*14,/);
  });
});

// ─── REQ-G-13 — Arc Wheel inventory is legible ───────────────────────────────
describe('REQ-G-13 — Arc Wheel overview and distance-scaling floors', () => {
  const wheelSrc = read('src/components/gameplay/ArcWheel.tsx');

  it('overview icons render at 32pt (was 20)', () => {
    expect(wheelSrc).toMatch(/<PieceIcon type=\{group\.type\} size=\{32\} color=\{color\} \/>/);
  });

  it('overview labels are at the FontSizes.floor (overviewCount was already there)', () => {
    expect(wheelSrc).toMatch(/overviewLabel:\s*\{[\s\S]*?fontSize:\s*FontSizes\.floor,/);
    expect(wheelSrc).toMatch(/overviewCount:\s*\{[\s\S]*?fontSize:\s*11,/);
  });

  it('clamps the smallest collapsed node to >= 32pt and distanceOpacity to >= 0.45', () => {
    expect(wheelSrc).toMatch(
      /const nodeSize = Math\.max\(32, NODE_SIZE_MAX \* scaleFactor\);/,
    );
    expect(wheelSrc).toMatch(
      /const distanceOpacity = Math\.max\(0\.45, 1 - \(absDistance \/ \(maxVisible \+ 1\)\) \* 0\.7\);/,
    );
  });
});

// ─── REQ-G-18 — Arc Wheel category quick-jump ────────────────────────────────
describe('REQ-G-18 — Arc Wheel quick-jump dot strip', () => {
  const wheelSrc = read('src/components/gameplay/ArcWheel.tsx');

  it('renders a dot per group, only while the wheel is active and has more than one group', () => {
    expect(wheelSrc).toMatch(/\{isActive && groups\.length > 1 && \(/);
    expect(wheelSrc).toMatch(/styles\.quickJumpStrip/);
  });

  it('tapping a dot jumps the wheel via the same handleTapSelect used by node taps', () => {
    expect(wheelSrc).toMatch(/onPress=\{\(\) => handleTapSelect\(idx\)\}/);
  });

  it('colors each dot by category (tape purple, else the type-based physics/protocol color), highlighting the selected one', () => {
    expect(wheelSrc).toMatch(
      /const dotColor = group\.isTape \? TAPE_COLOR : getPieceColor\(group\.type\);/,
    );
    expect(wheelSrc).toMatch(/isSel && styles\.quickJumpDotActive/);
  });

  it('scrolls horizontally without a visible indicator, so the strip never forces the 72pt pill wider', () => {
    expect(wheelSrc).toMatch(
      /<ScrollView\s*\n\s*horizontal\s*\n\s*showsHorizontalScrollIndicator=\{false\}\s*\n\s*contentContainerStyle=\{styles\.quickJumpInner\}/,
    );
  });
});

// ─── REQ-G-09 — Void COGS lines stack ────────────────────────────────────────
describe('REQ-G-09 — void COGS lines stack instead of splitting into columns', () => {
  const modalsSrc = read('src/components/gameplay/GameplayModals.tsx');

  it('wraps the void quote and blown-cell line in one flex: 1 column inside cogsResultRow', () => {
    const voidBlock = modalsSrc.slice(
      modalsSrc.indexOf('<Text style={styles.voidSubtext}>'),
      modalsSrc.indexOf('{isDailyChallenge && ('),
    );
    expect(voidBlock).toMatch(/<View style=\{\{ flex: 1, gap: Spacing\.sm \}\}>/);
    expect(voidBlock).toMatch(/VOID_QUOTES\[voidQuoteIndex\]/);
    expect(voidBlock).toMatch(/getBlownCellCOGSLine\(blownCells\.size\)/);
  });

  it('voidQuote no longer carries its own flex: 1 (only needed when a direct row child)', () => {
    expect(modalsSrc).toMatch(/voidQuote:\s*\{\s*fontFamily: Fonts\.exo2,/);
  });
});
