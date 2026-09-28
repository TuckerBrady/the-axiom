/**
 * SWEEP-B51 S4 (AXM-040): the non-Axiom score strip wraps three cells to a
 * row so every label fits at 360dp. Source-structure check (UTF-8 read).
 */
import * as fs from 'fs';
import * as path from 'path';

const modals = fs.readFileSync(
  path.resolve(__dirname, '../../src/components/gameplay/GameplayModals.tsx'),
  'utf-8',
);

const style = (name: string): string => {
  const m = modals.match(new RegExp(`\\n  ${name}: \\{([^}]*)\\}`));
  expect(m).not.toBeNull();
  return m![1];
};

describe('SWEEP-B51 S4 score strip', () => {
  test('[S4-3] non-Axiom score cells wrap three to a row', () => {
    // The strip picks the wrapping layout off the Axiom only.
    expect(modals).toMatch(
      /style=\{level\.sector === 'axiom' \? styles\.scoreStrip : \[styles\.scoreStrip, styles\.scoreStripWrap\]\}/,
    );
    expect(modals).toMatch(
      /style=\{level\.sector === 'axiom' \? styles\.scoreCell : styles\.scoreCellThird\}/,
    );
    const wrap = style('scoreStripWrap');
    expect(wrap).toMatch(/flexWrap: 'wrap',/);
    const third = style('scoreCellThird');
    expect(third).toMatch(/width: '33\.333%',/);
    expect(third).not.toMatch(/flex: 1/);
    // The base strip is a row; the Axiom's two-cell strip is unchanged.
    expect(style('scoreStrip')).toMatch(/flexDirection: 'row',/);
    expect(style('scoreCell')).toMatch(/flex: 1,/);
    // Every label keeps P10-4's single-line auto-fit.
    const label = modals.match(/<Text\s+style=\{styles\.scoreCellLabel\}[\s\S]{0,220}?>/)?.[0] ?? '';
    expect(label).toMatch(/numberOfLines=\{1\}/);
    expect(label).toMatch(/adjustsFontSizeToFit/);
    expect(label).toMatch(/minimumFontScale=\{0\.5\}/);
  });
});
