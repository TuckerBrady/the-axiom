// AXM-013 (PROMPT_160) — one sliding tray for every sector.
//
// The Kepler+ piece selector is removed. Kepler+ places from the same PieceTray the Axiom
// uses, through the inventory path, with requisitioned instances consumed
// first. Rendering is not wired for RNTL in this repo (the integration suite
// is skipped), so the "tray renders in Kepler placement, nothing wheel-shaped
// does" check is a pure mount gate plus a source contract on GameplayScreen.

import * as fs from 'fs';
import * as path from 'path';
import { useRequisitionStore, buildInventoryForLevel } from '../../../src/store/requisitionStore';
import { useEconomyStore } from '../../../src/store/economyStore';
import { placeFromKeplerInventory, shouldMountTray } from '../../../src/game/trayPlacement';
import { groupTrayPieces, shouldShowFilterChips } from '../../../src/components/gameplay/trayGrouping';
import { AXIOM_LEVELS, levelK1_10 } from '../../../src/game/levels';
import type { LevelDefinition } from '../../../src/game/types';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

function keplerLevel(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id: 'K1-X',
    name: 'Test',
    sector: 'kepler',
    description: 'Test',
    cogsLine: 'Test',
    gridWidth: 6,
    gridHeight: 6,
    prePlacedPieces: [],
    availablePieces: ['scanner', 'conveyor'],
    dataTrail: { cells: [], headPosition: 0 },
    objectives: [{ type: 'reach_output' }],
    optimalPieces: 2,
    creditBudget: 100,
    purchasableTapes: [],
    freeTapes: ['IN'],
    ...overrides,
  } as LevelDefinition;
}

function loadInventory(level: LevelDefinition, purchases: { type: 'scanner' | 'conveyor'; quantity: number }[]) {
  const inv = buildInventoryForLevel(
    level,
    purchases.map(p => ({ ...p, unitPrice: 20, totalPrice: 20 * p.quantity })),
  );
  useRequisitionStore.setState({ inventory: inv, phase: 'placement', selectedInventoryId: null });
}

describe('Kepler placement — inventory path, requisitioned first, no credit charge', () => {
  beforeEach(() => {
    useEconomyStore.setState({ credits: 500, levelBudget: 100, levelSpent: 0 });
  });

  it('places a requisitioned Protocol piece without changing the balance', () => {
    loadInventory(keplerLevel({ availablePieces: ['conveyor'] }), [{ type: 'scanner', quantity: 1 }]);
    const before = useEconomyStore.getState();
    const ok = placeFromKeplerInventory('scanner');
    const after = useEconomyStore.getState();
    expect(ok).toBe(true);
    expect(after.credits).toBe(before.credits);
    expect(after.levelSpent).toBe(before.levelSpent);
    expect(after.levelBudget).toBe(before.levelBudget);
    const scanner = useRequisitionStore.getState().inventory.pieces.find(p => p.type === 'scanner')!;
    expect(scanner.placed).toBe(true);
    expect(scanner.source).toBe('requisitioned');
  });

  it('refuses when no instance of the type is left', () => {
    loadInventory(keplerLevel({ availablePieces: ['conveyor'] }), []);
    expect(placeFromKeplerInventory('scanner')).toBe(false);
  });

  it('the store consumes the requisitioned instance before the pre-assigned one', () => {
    loadInventory(keplerLevel({ availablePieces: ['scanner'] }), [{ type: 'scanner', quantity: 1 }]);
    useRequisitionStore.getState().placeInventoryPiece('scanner');
    const scanners = useRequisitionStore.getState().inventory.pieces.filter(p => p.type === 'scanner');
    expect(scanners.find(p => p.source === 'requisitioned')!.placed).toBe(true);
    expect(scanners.find(p => p.source === 'preAssigned')!.placed).toBe(false);
  });

  it('a long-press return gives back the pre-assigned instance while one is on the board', () => {
    loadInventory(keplerLevel({ availablePieces: ['scanner'] }), [{ type: 'scanner', quantity: 1 }]);
    const s = useRequisitionStore.getState();
    s.placeInventoryPiece('scanner');
    s.placeInventoryPiece('scanner');
    useRequisitionStore.getState().unplaceInventoryPiece('scanner');
    const scanners = useRequisitionStore.getState().inventory.pieces.filter(p => p.type === 'scanner');
    expect(scanners.find(p => p.source === 'preAssigned')!.placed).toBe(false);
    expect(scanners.find(p => p.source === 'requisitioned')!.placed).toBe(true);
    const [group] = groupTrayPieces(useRequisitionStore.getState().inventory.pieces.filter(p => p.type === 'scanner'));
    expect(group.preAssignedCount).toBe(1);
    expect(group.requisitionedCount).toBe(0);
  });
});

describe('tray mount gate', () => {
  it('mounts in every Axiom phase', () => {
    expect(shouldMountTray({ isAxiomLevel: true, phase: 'requisition' })).toBe(true);
    expect(shouldMountTray({ isAxiomLevel: true, phase: 'placement' })).toBe(true);
  });

  it('mounts in Kepler placement only, never alongside the REQUISITION store', () => {
    expect(shouldMountTray({ isAxiomLevel: false, phase: 'placement' })).toBe(true);
    expect(shouldMountTray({ isAxiomLevel: false, phase: 'requisition' })).toBe(false);
    expect(shouldMountTray({ isAxiomLevel: false, phase: 'transitioning' })).toBe(false);
  });
});

describe('filter chips never appear in the Axiom', () => {
  it.each(AXIOM_LEVELS.map(l => [l.id, l] as const))('%s holds 6 or fewer tray items', (_id, level) => {
    const types = new Set(level.availablePieces.filter(t => t !== 'source' && t !== 'terminal' && t !== 'obstacle'));
    expect(types.size).toBeLessThanOrEqual(6);
    expect(shouldShowFilterChips(types.size)).toBe(false);
  });

  it('K1-10 does need them', () => {
    const groups = groupTrayPieces(buildInventoryForLevel(levelK1_10, []).pieces);
    expect(shouldShowFilterChips(groups.length)).toBe(true);
  });
});

describe('GameplayScreen — one tray host, no wheel', () => {
  const screenSrc = read('src/screens/GameplayScreen.tsx');

  it('renders exactly one PieceTray element, gated by shouldMountTray', () => {
    expect(screenSrc.match(/<PieceTray\b/g) ?? []).toHaveLength(1);
    expect(screenSrc).toMatch(/shouldMountTray\(\{\s*isAxiomLevel/);
  });

  it('does not import or render the removed wheel', () => {
    // Component name assembled from parts; see the repo-wide check below.
    const removed = ['Arc', 'Wheel'].join('');
    expect(fs.existsSync(path.resolve(repoRoot, `src/components/gameplay/${removed}.tsx`))).toBe(false);
    expect(screenSrc).not.toContain(`components/gameplay/${removed}'`);
    expect(screenSrc).not.toMatch(/underWheel/);
    expect(screenSrc).not.toMatch(/WHEEL_WIDTH/);
  });

  it('routes Kepler tap and drop placement through the inventory path', () => {
    expect(screenSrc.match(/placeFromKeplerInventory\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('rejects a blown-cell drop with the error haptic and a ghost snap-back', () => {
    expect(screenSrc).toMatch(/hapticError\(\)/);
    expect(screenSrc).toMatch(/snapBack/);
  });

  // Found on device (K1-10, axiom_standard): the board's window position was
  // captured only in its onLayout, which does not re-run when the board moves
  // without resizing. Drops then resolved ~2 rows below the finger. The drag
  // must re-measure the board when it starts.
  it('re-measures the board position when a drag starts', () => {
    const start = screenSrc.slice(
      screenSrc.indexOf('const handleDragStart = useCallback('),
      screenSrc.indexOf('const handleDragMove = useCallback('),
    );
    expect(start).toMatch(/boardGridRef\.current\?\.measureInWindow\(\(x, y\) => \{\s*boardScreenPos\.current = \{ x, y \};/);
  });

  it('keeps the tray mounted through ENGAGE (hidden, not unmounted)', () => {
    expect(screenSrc).toMatch(/hidden=\{isExecuting \|\| showResults \|\| showVoid \|\| debugMode\}/);
  });
});

describe('the wheel is gone from src, tests and flows', () => {
  // Built from parts so this file does not match its own search.
  const pattern = new RegExp(['arc', 'wheel'].join('') + '|' + ['arc', ' ', 'wheel'].join('') + '|' + ['arc', '-', 'wheel'].join(''), 'i');

  function walk(dir: string, out: string[] = []): string[] {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (/\.(ts|tsx|js|yaml|yml)$/.test(entry.name)) out.push(full);
    }
    return out;
  }

  it('no source, test or Maestro file mentions it', () => {
    const files = ['src', '__tests__', '.maestro'].flatMap(d => walk(path.resolve(repoRoot, d)));
    const hits = files.filter(f => pattern.test(fs.readFileSync(f, 'utf8')) || pattern.test(path.basename(f)));
    expect(hits.map(f => path.relative(repoRoot, f))).toEqual([]);
  });
});
