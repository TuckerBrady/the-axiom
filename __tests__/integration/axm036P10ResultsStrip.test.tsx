// AXM-036 P10 (F10) — the results screen shows only the requirements a
// level's sector can actually earn, and never wraps a label mid-word.
//
// Harness pattern: source inspection, established by
// __tests__/integration/GameplayModals.test.tsx and
// __tests__/integration/SpecSheetPanel.test.tsx. GameplayModals.tsx renders
// through the "render" jest project (react-jsx tsconfig); the integration
// project here uses the plain tsconfig, so the component is verified by
// reading its source rather than mounting it.
//
// Axiom has no requisition (F10 finding): purchasedActiveCount is always 0,
// which zeroes Signal Depth and Diversity, and Discipline needs pieces a
// fixed A1 tray may not offer. Showing all six score cells there always
// painted at least two the level could never pass.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const modalsSrc = fs.readFileSync(
  path.resolve(repoRoot, 'src/components/gameplay/GameplayModals.tsx'),
  'utf8',
);

describe('P10-2: the score strip is scoped to the level sector', () => {
  it('[P10-2] axiom results show COMPLETION and PATH only', () => {
    expect(modalsSrc).toMatch(
      /level\.sector === 'axiom'[\s\S]{0,120}allCats\.filter\(\(\[label\]\) => label === 'COMPLETION' \|\| label === 'PATH'\)/,
    );
  });

  it('[P10-2] kepler results show six', () => {
    // The base six-category array backs every non-Axiom sector unchanged.
    expect(modalsSrc).toMatch(/const allCats: \[string, number, number\]\[\] = \[/);
    expect(modalsSrc).toMatch(/\['COMPLETION', b\.completion, 25\]/);
    expect(modalsSrc).toMatch(/\['PATH', b\.pathIntegrity, 15\]/);
    expect(modalsSrc).toMatch(/\['DEPTH', b\.signalDepth, 14\]/);
    expect(modalsSrc).toMatch(/\['INVESTMENT', b\.investment, 25\]/);
    expect(modalsSrc).toMatch(/\['DIVERSITY', b\.diversity, 11\]/);
    expect(modalsSrc).toMatch(/\['DISCIPLINE', b\.discipline, 10\]/);
    // Non-axiom keeps the unfiltered set.
    expect(modalsSrc).toMatch(/: allCats;/);
  });
});

describe('P10-4: score labels and pulse chips never wrap mid-word', () => {
  it('[P10-4] every score label and pulse chip text is single-line, auto-fit', () => {
    // scoreCellLabel — the six/two-cell strip label.
    const scoreCellLabelBlock = modalsSrc.match(
      /<Text\s+style=\{styles\.scoreCellLabel\}[\s\S]{0,160}?>/,
    )?.[0] ?? '';
    expect(scoreCellLabelBlock).toMatch(/numberOfLines=\{1\}/);
    expect(scoreCellLabelBlock).toMatch(/adjustsFontSizeToFit/);
    expect(scoreCellLabelBlock).toMatch(/minimumFontScale=\{0\.5\}/);

    // pulseResultText — the "P1".."P8" chip label ("P1 BLOCKED" wrap, shot 13).
    const pulseResultTextBlock = modalsSrc.match(
      /<Text\s+style=\{\[\s*styles\.pulseResultText,[\s\S]{0,220}?>/,
    )?.[0] ?? '';
    expect(pulseResultTextBlock).toMatch(/numberOfLines=\{1\}/);
    expect(pulseResultTextBlock).toMatch(/adjustsFontSizeToFit/);
    expect(pulseResultTextBlock).toMatch(/minimumFontScale=\{0\.5\}/);

    // pulseResultIcon — the PASS/BLOCKED chip text.
    const pulseResultIconBlock = modalsSrc.match(
      /<Text\s+style=\{\[\s*styles\.pulseResultIcon,[\s\S]{0,220}?>/,
    )?.[0] ?? '';
    expect(pulseResultIconBlock).toMatch(/numberOfLines=\{1\}/);
    expect(pulseResultIconBlock).toMatch(/adjustsFontSizeToFit/);
    expect(pulseResultIconBlock).toMatch(/minimumFontScale=\{0\.5\}/);
  });
});
