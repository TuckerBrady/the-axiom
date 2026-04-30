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

  it('defines IDLE_OPACITY between 15% and 20%', () => {
    const match = wheelSrc.match(/IDLE_OPACITY\s*=\s*([\d.]+)/);
    expect(match).not.toBeNull();
    const opacity = parseFloat(match![1]);
    expect(opacity).toBeGreaterThanOrEqual(0.15);
    expect(opacity).toBeLessThanOrEqual(0.20);
  });

  it('defines ACTIVE_TIMEOUT_MS as 2000ms', () => {
    expect(wheelSrc).toMatch(/ACTIVE_TIMEOUT_MS\s*=\s*2000/);
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
