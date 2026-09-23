// Source-contract tests for the extracted PieceTray component
// (Prompt 99B). PROMPT_124 added hold-to-drag wiring: when the parent
// passes onDragStart/onDragMove/onDragEnd/onDragCancel, each tray
// item mounts a PanResponder that promotes a touch to a drag after
// a 180 ms hold and falls through to onPickup for shorter presses.
//
// The tray must NOT re-render during a beam tick — the parent
// unmounts it during isExecuting, but when mounted, its memo
// barrier must hold across parent re-renders.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const traySrc = read('src/components/gameplay/PieceTray.tsx');
const screenSrc = read('src/screens/GameplayScreen.tsx');
const tutorialHookSrc = read('src/hooks/useGameplayTutorial.ts');

describe('PieceTray — extracted parts tray component', () => {
  it('exports a default React.memo-wrapped component', () => {
    expect(traySrc).toMatch(/export default React\.memo\(PieceTrayComponent\)/);
  });

  it('has an optional refs prop for backward compatibility', () => {
    expect(traySrc).toMatch(/refs\?:\s*TutorialTrayRefs/);
    expect(traySrc).toMatch(/export interface TutorialTrayRefs/);
  });

  it('renders a touchable per visible tray item', () => {
    expect(traySrc).toMatch(/visibleItems\.map\(item =>/);
    expect(traySrc).toMatch(/<TouchableOpacity/);
  });

  it('forwards measureRef per piece via the refs object when refs is provided', () => {
    expect(traySrc).toMatch(/measureRef = refs[\s\S]*?refs\.trayConveyor[\s\S]*?refs\.trayGear/);
  });

  it('disables tap callbacks when disabled or count <= 0', () => {
    expect(traySrc).toMatch(/disabled\?:\s*boolean/);
    // The non-drag fallback path still uses the original
    // disabled={disabled || count <= 0} expression.
    expect(traySrc).toMatch(/const itemDisabled = !!disabled \|\| count <= 0/);
  });

  it('GameplayScreen imports and renders <PieceTray /> with the tutorial tray refs', () => {
    expect(screenSrc).toMatch(
      /import PieceTray(, \{[^}]*\})? from '\.\.\/components\/gameplay\/PieceTray'/,
    );
    expect(screenSrc).toMatch(/<PieceTray/);
    // PROMPT_124 wires the per-piece tutorial refs into the tray; since
    // AXM-013 the same tray serves every sector.
    expect(screenSrc).toMatch(/refs=\{tutorialTrayRefs\}/);
  });

  it('useGameplayTutorial exposes the tray refs', () => {
    expect(tutorialHookSrc).toMatch(/trayConveyorRef/);
    expect(tutorialHookSrc).toMatch(/trayGearRef/);
    expect(tutorialHookSrc).toMatch(/trayConfigNodeRef/);
    expect(tutorialHookSrc).toMatch(/traySplitterRef/);
    expect(tutorialHookSrc).toMatch(/trayScannerRef/);
    expect(tutorialHookSrc).toMatch(/trayTransmitterRef/);
    expect(tutorialHookSrc).toMatch(/tutorialTrayRefs/);
    expect(tutorialHookSrc).toMatch(/placedPieceRef/);
    // AXM-013: Kepler+ tutorial steps target tray items too; the hook no
    // longer carries a ref for a second piece selector.
    expect(tutorialHookSrc).not.toMatch(/MainRef/);
  });

  it('GameplayScreen memoizes per-piece costs and affordability', () => {
    expect(screenSrc).toMatch(/const trayCosts = useMemo\(/);
    expect(screenSrc).toMatch(/const trayAffordable = useMemo\(/);
  });

  // ── PROMPT_124: hold-to-drag wiring ────────────────────────────────────────

  describe('hold-to-drag (PROMPT_124)', () => {
    it('declares the four optional drag callbacks on the Props interface', () => {
      expect(traySrc).toMatch(/onDragStart\?:\s*\(drag: DragState\) => void/);
      expect(traySrc).toMatch(/onDragMove\?:\s*\(x: number, y: number\) => void/);
      expect(traySrc).toMatch(/onDragEnd\?:\s*\(x: number, y: number\) => void/);
      expect(traySrc).toMatch(/onDragCancel\?:\s*\(\) => void/);
    });

    it('uses the 180 ms hold threshold', () => {
      expect(traySrc).toMatch(/const DRAG_HOLD_MS = 180/);
    });

    it('imports PanResponder from react-native and owns the DragState type', () => {
      expect(traySrc).toMatch(/import\s*\{[^}]*\bPanResponder\b[^}]*\}\s*from\s*'react-native'/);
      expect(traySrc).toMatch(/export interface DragState \{/);
    });

    it('promotes a touch to drag after DRAG_HOLD_MS via setTimeout in onPanResponderGrant', () => {
      // The grant handler starts a hold timer that fires onDragStart
      // with a DragState payload (active: true, pieceId, type, x, y).
      expect(traySrc).toMatch(/onPanResponderGrant[\s\S]*?setTimeout\([\s\S]*?DRAG_HOLD_MS\)/);
      expect(traySrc).toMatch(/active:\s*true,[\s\S]*?pieceId:\s*keyNow,[\s\S]*?type:\s*ptNow/);
    });

    it('falls through to onPickup when the press releases before the timer fires', () => {
      // onPanResponderRelease: if isDraggingRef.current is true,
      // call onDragEnd; otherwise clear the timer and call onPickup
      // with the toggled value (null deselects when already active).
      expect(traySrc).toMatch(/onPanResponderRelease[\s\S]*?if \(isDraggingRef\.current\)[\s\S]*?onDragEnd[\s\S]*?pickup\(activeNow \? null : keyNow\)/);
    });

    it('calls onDragCancel when the gesture is terminated mid-drag', () => {
      expect(traySrc).toMatch(/onPanResponderTerminate[\s\S]*?onDragCancel\(\)/);
    });

    it('GameplayScreen wires all four drag handlers into the PieceTray render', () => {
      expect(screenSrc).toMatch(/<PieceTray[\s\S]*?onDragStart=\{handleDragStart\}/);
      expect(screenSrc).toMatch(/<PieceTray[\s\S]*?onDragMove=\{handleDragMove\}/);
      expect(screenSrc).toMatch(/<PieceTray[\s\S]*?onDragEnd=\{handleDragEnd\}/);
      expect(screenSrc).toMatch(/<PieceTray[\s\S]*?onDragCancel=\{handleDragCancel\}/);
    });

    it('GameplayScreen has no second piece selector (AXM-013)', () => {
      expect(screenSrc).not.toMatch(/mainNodeRef=/);
      expect(screenSrc.match(/<PieceTray\b/g) ?? []).toHaveLength(1);
    });
  });

  describe('AXM-001 D-01/D-02/D-08: tray icon and badge legibility', () => {
    it('renders tray icons at 32pt, not 22pt', () => {
      expect(traySrc).toMatch(/<PieceIcon type=\{pt\} size=\{32\} color=\{color\} \/>/);
      expect(traySrc).not.toMatch(/size=\{22\}/);
    });

    it('no tray text style has a fontSize literal below 11', () => {
      const sizes = [...traySrc.matchAll(/fontSize:\s*(?:FontSizes\.floor|(\d+))/g)]
        .map(m => (m[1] ? parseInt(m[1], 10) : 11));
      expect(sizes.length).toBeGreaterThan(0);
      expect(sizes.every(n => n >= 11)).toBe(true);
    });

    it('removes the in-level price display (belongs in RequisitionPanel)', () => {
      expect(traySrc).not.toMatch(/trayCost/);
      expect(traySrc).not.toMatch(/\{cost\} CR/);
    });
  });

  // REQ-G-02 (Handoff 003): the tray stays mounted for the whole level now
  // (it used to unmount on !isExecuting, which was the primary cause of
  // the ENGAGE-frame layout jump — the header comment above is stale on
  // that point, not this test). `hidden` drives opacity + pointerEvents
  // instead of existence.
  describe('hidden prop (REQ-G-02)', () => {
    it('declares an optional hidden prop', () => {
      expect(traySrc).toMatch(/hidden\?:\s*boolean/);
    });

    it('sets opacity 0 and pointerEvents none when hidden, without unmounting', () => {
      expect(traySrc).toMatch(/styles\.partsTray,[\s\S]{0,120}?hidden && \{ opacity: 0 \},/);
      expect(traySrc).toMatch(/pointerEvents=\{hidden \? 'none' : 'auto'\}/);
    });

    it('GameplayScreen mounts PieceTray by sector/phase only (never by run state), passing hidden for the run-state gate', () => {
      expect(screenSrc).toMatch(/\{shouldMountTray\(\{ isAxiomLevel: !!isAxiomLevel, phase: requisitionPhase \}\) && \(\s*<PieceTray/);
      expect(screenSrc).not.toMatch(
        /isAxiomLevel && !isExecuting && !showResults && !showVoid && !debugMode && \(\s*<PieceTray/,
      );
      expect(screenSrc).toMatch(
        /<PieceTray[\s\S]*?hidden=\{isExecuting \|\| showResults \|\| showVoid \|\| debugMode\}/,
      );
    });
  });

  // AXM-013, found on device: slide the tray to its end, pick a narrower
  // filter, and the old offset left the filtered items scrolled off-screen.
  describe('filter change (AXM-013)', () => {
    it('returns the tray to its start whenever the effective filter changes', () => {
      expect(traySrc).toMatch(
        /useEffect\(\(\) => \{\s*scrollXRef\.current = 0;\s*scrollRef\.current\?\.scrollTo\(\{ x: 0, animated: false \}\);[\s\S]*?\}, \[effectiveFilter/,
      );
    });
  });

  describe('static during drag', () => {
    it('disables ScrollView scrolling while a piece is being dragged', () => {
      // The tray must not slide left/right under the drag (Tucker 2026-06-15).
      expect(traySrc).toMatch(/scrollEnabled=\{!dragActive\}/);
      expect(traySrc).toMatch(/onDragActiveChange/);
    });

    it('freezes on drag start and unfreezes on release and terminate', () => {
      expect(traySrc).toMatch(/dac\(true\)/);
      // both the release and terminate paths re-enable scrolling
      const offCalls = (traySrc.match(/onDragActiveChange\(false\)/g) ?? []).length;
      expect(offCalls).toBeGreaterThanOrEqual(2);
    });
  });
});
