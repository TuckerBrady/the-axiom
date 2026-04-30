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

  it('shows pre-assigned pieces with INCLUDED label, not +/- controls', () => {
    expect(panelSrc).toMatch(/INCLUDED/);
    expect(panelSrc).toMatch(/isPreAssigned/);
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
