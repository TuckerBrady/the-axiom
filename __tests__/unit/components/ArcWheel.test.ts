import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const wheelSrc = read('src/components/gameplay/ArcWheel.tsx');
const screenSrc = read('src/screens/GameplayScreen.tsx');

describe('ArcWheel — source contract', () => {
  it('uses hapticLight utility (not expo-haptics directly)', () => {
    expect(wheelSrc).toMatch(/hapticLight/);
    expect(wheelSrc).not.toMatch(/import \* as Haptics from 'expo-haptics'/);
  });

  it('calls hapticLight on scroll and node selection', () => {
    const hapticCalls = (wheelSrc.match(/hapticLight\(\)/g) ?? []).length;
    expect(hapticCalls).toBeGreaterThanOrEqual(2);
  });

  it('defines IDLE_OPACITY between 40% and 70% (visible but dimmed)', () => {
    const match = wheelSrc.match(/IDLE_OPACITY\s*=\s*([\d.]+)/);
    expect(match).not.toBeNull();
    const opacity = parseFloat(match![1]);
    expect(opacity).toBeGreaterThanOrEqual(0.40);
    expect(opacity).toBeLessThanOrEqual(0.70);
  });

  it('defines ACTIVE_TIMEOUT_MS >= 5000ms (long enough to scroll without fading)', () => {
    const match = wheelSrc.match(/ACTIVE_TIMEOUT_MS\s*=\s*(\d+)/);
    expect(match).not.toBeNull();
    const ms = parseInt(match![1], 10);
    expect(ms).toBeGreaterThanOrEqual(5000);
  });

  it('defines DRAG_HOLD_MS between 150ms and 250ms', () => {
    const match = wheelSrc.match(/DRAG_HOLD_MS\s*=\s*(\d+)/);
    expect(match).not.toBeNull();
    const ms = parseInt(match![1], 10);
    expect(ms).toBeGreaterThanOrEqual(150);
    expect(ms).toBeLessThanOrEqual(250);
  });

  it('has a recall strip that remains visible when dismissed', () => {
    expect(wheelSrc).toMatch(/RECALL_STRIP_W/);
    expect(wheelSrc).toMatch(/recallStrip/);
  });

  it('defines source colors: amber for preAssigned, cyan for requisitioned, purple for tape', () => {
    expect(wheelSrc).toMatch(/#F0B429/);  // amber — preAssigned
    expect(wheelSrc).toMatch(/#00D4FF/);  // cyan — requisitioned
    expect(wheelSrc).toMatch(/#8B5CF6/);  // purple — tape
  });

  it('groups pieces by type with a count badge (one node per type)', () => {
    expect(wheelSrc).toMatch(/groupArcWheelPieces/);
    expect(wheelSrc).toMatch(/countBadge/);
    expect(wheelSrc).toMatch(/group\.count > 1/);
  });

  it('renders corner brackets on the selected piece', () => {
    expect(wheelSrc).toMatch(/cornerTL/);
    expect(wheelSrc).toMatch(/cornerTR/);
    expect(wheelSrc).toMatch(/cornerBL/);
    expect(wheelSrc).toMatch(/cornerBR/);
  });

  it('uses PieceIcon for piece rendering (not custom icon)', () => {
    expect(wheelSrc).toMatch(/PieceIcon/);
  });

  it('has dismiss and recall animations via Animated.timing', () => {
    expect(wheelSrc).toMatch(/dismissSlide/);
    expect(wheelSrc).toMatch(/recallSlide/);
    expect(wheelSrc).toMatch(/Animated\.timing/);
  });

  it('has chevron scroll buttons (∧/∨) for explicit up/down navigation', () => {
    expect(wheelSrc).toMatch(/handleScrollSteps\(-1\)/);
    expect(wheelSrc).toMatch(/handleScrollSteps\(1\)/);
    expect(wheelSrc).toMatch(/chevronBtn/);
    expect(wheelSrc).toMatch(/chevronText/);
  });

  it('has dismiss handle dots to hint at horizontal swipe', () => {
    expect(wheelSrc).toMatch(/dismissHandle/);
    expect(wheelSrc).toMatch(/dismissDot/);
  });

  it('uses props for side (left/right) positioning', () => {
    expect(wheelSrc).toMatch(/side.*'left'.*'right'|'left'\s*\|\s*'right'/);
  });

  it('exposes onSelect, onDragStart, onDragMove, onDragEnd, onDragCancel callbacks', () => {
    expect(wheelSrc).toMatch(/onSelect/);
    expect(wheelSrc).toMatch(/onDragStart/);
    expect(wheelSrc).toMatch(/onDragMove/);
    expect(wheelSrc).toMatch(/onDragEnd/);
    expect(wheelSrc).toMatch(/onDragCancel/);
  });

  it('groups inventory by type (count badge) rather than one node per instance', () => {
    // Uses groupArcWheelPieces (arcWheelGrouping.ts) — the canonical grouping module.
    expect(wheelSrc).toMatch(/groupArcWheelPieces/);
    expect(wheelSrc).toMatch(/group\.count/);
  });

  it('has an overview/expand mode that lists all groups by category', () => {
    expect(wheelSrc).toMatch(/renderOverview/);
    expect(wheelSrc).toMatch(/\bexpanded\b/);
    expect(wheelSrc).toMatch(/CATEGORY_LABEL/);
  });

  it('keeps all animations on the JS driver (useNativeDriver: false — crash class)', () => {
    expect(wheelSrc).not.toMatch(/useNativeDriver:\s*true/);
  });

  it('GameplayScreen imports ArcWheel', () => {
    expect(screenSrc).toMatch(/import ArcWheel/);
  });

  it('GameplayScreen renders ArcWheel in placement phase for non-Axiom levels', () => {
    expect(screenSrc).toMatch(/<ArcWheel/);
    expect(screenSrc).toMatch(/isAxiomLevel.*placement|placement.*isAxiomLevel/);
  });

  it('GameplayScreen uses arcWheelPosition from settingsStore', () => {
    expect(screenSrc).toMatch(/arcWheelPosition/);
  });

  it('GameplayScreen handles drag callbacks', () => {
    expect(screenSrc).toMatch(/handleDragStart/);
    expect(screenSrc).toMatch(/handleDragEnd/);
    expect(screenSrc).toMatch(/handleDragCancel/);
  });
});
