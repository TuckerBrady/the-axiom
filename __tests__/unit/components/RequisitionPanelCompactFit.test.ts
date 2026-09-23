// Source-contract tests for the Requisition drawer's height budget on
// compact screens (360x640dp). The unit-tier jest project does not
// transform react-native modules, so the layout contract is verified by
// inspecting the source, per the project's testing convention.
//
// Bug (2026-09-21, axiom_compact AVD): the drawer had no height bound. It
// stacks under HUDChrome + the tape display in GameplayScreen's column, and
// on a 640dp screen its natural height pushed the "Confirm requisition"
// button (and the ENGAGE row) below the bottom edge. The board canvas had
// already shrunk to 0, so nothing else could give. Collapsing the drawer
// does not help — the placement phase only starts on confirm — so every
// Kepler level was unplayable at that size.
//
// Contract: the drawer shrinks to the space its column leaves it, the list
// is the only part that gives up height, and the confirm control lives in a
// fixed footer outside the scroll view so it is always on screen.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const panelSrc = fs.readFileSync(
  path.resolve(repoRoot, 'src/components/gameplay/RequisitionPanel.tsx'),
  'utf8',
);

function styleBlock(name: string): string {
  // Style entries here hold no nested braces; tolerant of CRLF checkouts.
  const m = panelSrc.match(new RegExp(`\\n\\s*${name}:\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`style block "${name}" not found`);
  return m[1];
}

// The JSX between the ScrollView's close tag and the end of the expanded branch.
const afterScroll = panelSrc.slice(panelSrc.indexOf('</ScrollView>'));

describe('RequisitionPanel — confirm stays reachable on compact screens', () => {
  it('the drawer root can shrink to the space its parent column leaves it', () => {
    expect(styleBlock('root')).toMatch(/flexShrink:\s*1/);
  });

  it('the list wrapper shrinks, so the list is what gives up height', () => {
    expect(styleBlock('contentWrap')).toMatch(/flexShrink:\s*1/);
  });

  it('the footer holding the confirm control never shrinks', () => {
    expect(styleBlock('footer')).toMatch(/flexShrink:\s*0/);
  });

  it('renders the confirm button inside the footer, outside the scroll view', () => {
    const footerStart = afterScroll.indexOf('<View style={styles.footer}>');
    const confirm = afterScroll.indexOf('accessibilityLabel="Confirm requisition"');
    expect(footerStart).toBeGreaterThan(-1);
    expect(confirm).toBeGreaterThan(footerStart);
    // Exactly one confirm control, and it is not inside the ScrollView.
    expect(panelSrc.match(/accessibilityLabel="Confirm requisition"/g)).toHaveLength(1);
    const scrollBody = panelSrc.slice(panelSrc.indexOf('<ScrollView'), panelSrc.indexOf('</ScrollView>'));
    expect(scrollBody).not.toMatch(/Confirm requisition/);
  });

  it('keeps the one-time warning in the footer with the confirm button', () => {
    const footerStart = afterScroll.indexOf('<View style={styles.footer}>');
    const warning = afterScroll.indexOf('This store closes after confirmation.');
    const confirm = afterScroll.indexOf('accessibilityLabel="Confirm requisition"');
    expect(footerStart).toBeGreaterThan(-1);
    expect(warning).toBeGreaterThan(footerStart);
    expect(warning).toBeLessThan(confirm);
  });
});
