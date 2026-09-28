// SWEEP-B51 S10 (AXM-040): the Distress screen's two status labels collided
// at 360dp (smoke 1d): a space-between row holding two unshrinkable 10pt
// labels. Source-structure checks, read as UTF-8.

import * as fs from 'fs';
import * as path from 'path';

const src = fs
  .readFileSync(path.resolve(__dirname, '../../../src/screens/onboarding/DistressScreen.tsx'), 'utf8')
  .replace(/\r\n/g, '\n');

function styleBlock(name: string): string {
  const m = src.match(new RegExp(`\\n  ${name}: \\{([^}]*)\\}`));
  if (!m) throw new Error(`style block "${name}" not found`);
  return m[1];
}

describe('SWEEP-B51 S10: distress header', () => {
  test('[S10-1] the status bar has a gap and the label shrinks on one line', () => {
    expect(styleBlock('statusBar')).toMatch(/\n\s*gap: Spacing\.sm,/);
    expect(styleBlock('statusBar')).toMatch(/justifyContent: 'space-between'/);
    expect(styleBlock('statusLabel')).toMatch(/\n\s*flexShrink: 1,/);

    const label = src.match(/<Text\s+style=\{s\.statusLabel\}([^>]*)>C\.O\.G\.S UNIT 7 — DISTRESS SIGNAL<\/Text>/);
    expect(label).not.toBeNull();
    const attrs = label![1];
    expect(attrs).toMatch(/numberOfLines=\{1\}/);
    expect(attrs).toMatch(/\badjustsFontSizeToFit\b/);
    expect(attrs).toMatch(/minimumFontScale=\{0\.7\}/);
  });

  test('[S10-1] SYSTEM CRITICAL does not shrink', () => {
    expect(styleBlock('statusCritical')).toMatch(/\n\s*flexShrink: 0,/);
    expect(src).toContain('<FlickerText text="SYSTEM CRITICAL" style={s.statusCritical} />');
  });
});
