import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const panelSrc = read('src/components/gameplay/RequisitionPanel.tsx');
const screenSrc = read('src/screens/GameplayScreen.tsx');

describe('RequisitionPanel — source contract', () => {
  it('imports from piecePrices (not PIECE_COSTS)', () => {
    expect(panelSrc).toMatch(/from '.*piecePrices'/);
    expect(panelSrc).not.toMatch(/PIECE_COSTS/);
  });

  it('imports useRequisitionStore', () => {
    expect(panelSrc).toMatch(/useRequisitionStore/);
  });

  it('has 4 tab keys defined', () => {
    expect(panelSrc).toMatch(/'PHYSICS'/);
    expect(panelSrc).toMatch(/'PROTOCOL'/);
    expect(panelSrc).toMatch(/'DATA'/);
    expect(panelSrc).toMatch(/'INFRA'/);
  });

  it('derives tab order from discipline via getDisciplineTab', () => {
    expect(panelSrc).toMatch(/getDisciplineTab/);
    expect(panelSrc).toMatch(/getOrderedTabs/);
  });

  it('maps systems discipline to PROTOCOL tab', () => {
    expect(panelSrc).toMatch(/discipline === 'systems'.*PROTOCOL|PROTOCOL.*systems/);
  });

  it('shows collapsed state by default (expanded starts as false)', () => {
    expect(panelSrc).toMatch(/useState\(false\)/);
  });

  it('shows a REQUISITION confirm button', () => {
    expect(panelSrc).toMatch(/REQUISITION/);
    expect(panelSrc).toMatch(/onConfirm/);
  });

  it('shows warning text about one-time purchase window', () => {
    expect(panelSrc).toMatch(/closes after confirmation/);
  });

  it('renders TapeRow for DATA tab with nibble controls', () => {
    expect(panelSrc).toMatch(/TapeRow/);
    expect(panelSrc).toMatch(/NIBBLE_PRICE/);
    expect(panelSrc).toMatch(/CELLS_PER_NIBBLE/);
  });

  it('shows budget remaining display', () => {
    expect(panelSrc).toMatch(/REMAINING/);
    expect(panelSrc).toMatch(/getBudgetRemaining/);
  });

  it('labels included pieces with an INCLUDED count and still allows buying more', () => {
    expect(panelSrc).toMatch(/INCLUDED x\{includedCount\}/);
    expect(panelSrc).toMatch(/includedCount/);
  });

  it('shows the IN TRAY total (free base + requisitioned) for every row', () => {
    expect(panelSrc).toMatch(/IN TRAY/);
    expect(panelSrc).toMatch(/inTray = includedCount \+ quantity/);
  });

  it('GameplayScreen imports and renders <RequisitionPanel />', () => {
    expect(screenSrc).toMatch(/import RequisitionPanel/);
    expect(screenSrc).toMatch(/<RequisitionPanel/);
  });

  it('GameplayScreen shows RequisitionPanel only for non-Axiom levels in requisition phase', () => {
    expect(screenSrc).toMatch(/<RequisitionPanel/);
    expect(screenSrc).toMatch(/isAxiomLevel/);
    expect(screenSrc).toMatch(/requisitionPhase.*requisition|requisition.*requisitionPhase/);
  });
});

// REQ-G-17 (Handoff 003): presentation-only legibility fixes — no pricing,
// stock, or economy change. The panel showed ~5 rows out of a fixed 240pt
// ScrollView with no indicator, fade, or count, inviting the Engineer to
// walk in under-equipped — a real trap under ratified v2's floor-solve cap.
describe('RequisitionPanel — catalogue legibility (REQ-G-17)', () => {
  it('restores the scroll indicator (was showsVerticalScrollIndicator={false})', () => {
    expect(panelSrc).toMatch(/<ScrollView\s*\n\s*style=\{\[styles\.contentScroll,[\s\S]*?showsVerticalScrollIndicator\s*\n/);
    expect(panelSrc).not.toMatch(/showsVerticalScrollIndicator=\{false\}/);
  });

  it('adds a bottom fade over the content area', () => {
    expect(panelSrc).toMatch(/<LinearGradient[\s\S]*?style=\{styles\.contentFade\}/);
  });

  it('adds a per-tab item count via getTabItemCount', () => {
    expect(panelSrc).toMatch(/function getTabItemCount\(tab: TabKey\): number/);
    expect(panelSrc).toMatch(/\{tab\}\{count > 0 \? ` \(\$\{count\}\)` : ''\}/);
  });

  it('derives contentScroll maxHeight from screen height, not a fixed 240', () => {
    expect(panelSrc).toMatch(
      /const contentMaxHeight = Math\.round\(Dimensions\.get\('window'\)\.height \* 0\.32\);/,
    );
    expect(panelSrc).not.toMatch(/contentScroll:\s*\{\s*maxHeight:\s*240\s*\}/);
    expect(panelSrc).toMatch(/style=\{\[styles\.contentScroll, \{ maxHeight: contentMaxHeight \}\]\}/);
  });

  it('raises piece-row icons from 22 to 32pt, matching the tray per D-08', () => {
    expect(panelSrc).toMatch(/<PieceIcon type=\{type\} size=\{32\} color=\{color\} \/>/);
  });

  it('raises qtyBtn to 44x44 (was 28x28)', () => {
    expect(panelSrc).toMatch(/qtyBtn:\s*\{\s*width:\s*44,\s*height:\s*44/);
  });

  it('raises price and stock text (rowPrice / rowPriceStrike) to the 11pt floor', () => {
    expect(panelSrc).toMatch(/rowPriceStrike:\s*\{\s*fontFamily:\s*Fonts\.spaceMono,\s*fontSize:\s*FontSizes\.floor/);
    expect(panelSrc).toMatch(/rowPrice:\s*\{\s*fontFamily:\s*Fonts\.spaceMono,\s*fontSize:\s*FontSizes\.floor/);
  });
});

// REQ-G-03 (Handoff 003) / DEC-2 (ratified 2026-09-10): the four items held
// pending the amber decision are now cleared. RequisitionPanel.TAB_COLORS
// takes the static Physics/Protocol identity colors, and the confirm
// button no longer changes color with the selected tab.
describe('RequisitionPanel — static identity stops borrowing beam colors (REQ-G-03)', () => {
  it('TAB_COLORS.PHYSICS is Colors.copper and PROTOCOL is Colors.circuit', () => {
    expect(panelSrc).toMatch(/PHYSICS:\s*Colors\.copper,/);
    expect(panelSrc).toMatch(/PROTOCOL:\s*Colors\.circuit,/);
  });

  it('the confirm button takes one fixed accent, not tabColor', () => {
    expect(panelSrc).not.toMatch(/const tabColor = TAB_COLORS\[activeTab\];/);
    expect(panelSrc).not.toMatch(/borderColor:\s*tabColor/);
    expect(panelSrc).not.toMatch(/color:\s*tabColor/);
    expect(panelSrc).toMatch(/confirmBtn:\s*\{[\s\S]*?borderColor:\s*Colors\.copper,/);
    expect(panelSrc).toMatch(/confirmBtnText:\s*\{[\s\S]*?color:\s*Colors\.amber,/);
  });
});
