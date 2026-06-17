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

  it('renders a touchable per tray piece type', () => {
    expect(traySrc).toMatch(/trayPieceTypes\.map\(pt =>/);
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
      /import PieceTray from '\.\.\/components\/gameplay\/PieceTray'/,
    );
    expect(screenSrc).toMatch(/<PieceTray/);
    // PROMPT_124 wires the per-piece tutorial refs into the tray for
    // all Axiom levels (the Axiom Arc Wheel path is gone).
    expect(screenSrc).toMatch(/refs=\{tutorialTrayRefs\}/);
  });

  it('useGameplayTutorial exposes the tray refs plus the Kepler Arc Wheel ref', () => {
    expect(tutorialHookSrc).toMatch(/trayConveyorRef/);
    expect(tutorialHookSrc).toMatch(/trayGearRef/);
    expect(tutorialHookSrc).toMatch(/trayConfigNodeRef/);
    expect(tutorialHookSrc).toMatch(/traySplitterRef/);
    expect(tutorialHookSrc).toMatch(/trayScannerRef/);
    expect(tutorialHookSrc).toMatch(/trayTransmitterRef/);
    expect(tutorialHookSrc).toMatch(/tutorialTrayRefs/);
    expect(tutorialHookSrc).toMatch(/placedPieceRef/);
    // arcWheelMainRef is back — not for the removed Axiom focus-wheel, but for
    // the Kepler+ Arc Wheel onboarding tutorial (targetRef 'arcWheelMain').
    expect(tutorialHookSrc).toMatch(/arcWheelMainRef/);
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

    it('uses the 180 ms hold threshold matching ArcWheel', () => {
      expect(traySrc).toMatch(/const DRAG_HOLD_MS = 180/);
    });

    it('imports PanResponder from react-native and DragState from ArcWheel', () => {
      expect(traySrc).toMatch(/import\s*\{[^}]*\bPanResponder\b[^}]*\}\s*from\s*'react-native'/);
      expect(traySrc).toMatch(/import type \{ DragState \} from '\.\/ArcWheel'/);
    });

    it('promotes a touch to drag after DRAG_HOLD_MS via setTimeout in onPanResponderGrant', () => {
      // The grant handler starts a hold timer that fires onDragStart
      // with a DragState payload (active: true, pieceId, type, x, y).
      expect(traySrc).toMatch(/onPanResponderGrant[\s\S]*?setTimeout\([\s\S]*?DRAG_HOLD_MS\)/);
      expect(traySrc).toMatch(/active:\s*true,[\s\S]*?pieceId:\s*ptNow,[\s\S]*?type:\s*ptNow/);
    });

    it('falls through to onPickup when the press releases before the timer fires', () => {
      // onPanResponderRelease: if isDraggingRef.current is true,
      // call onDragEnd; otherwise clear the timer and call onPickup
      // with the toggled value (null deselects when already active).
      expect(traySrc).toMatch(/onPanResponderRelease[\s\S]*?if \(isDraggingRef\.current\)[\s\S]*?onDragEnd[\s\S]*?pickup\(activeNow \? null : ptNow\)/);
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

    it('GameplayScreen no longer contains the Axiom Arc Wheel state or render block', () => {
      expect(screenSrc).not.toMatch(/hasAxiomArcWheel/);
      expect(screenSrc).not.toMatch(/axiomArcWheelPieces/);
      expect(screenSrc).not.toMatch(/axiomWheelSelectedId/);
      expect(screenSrc).not.toMatch(/handleAxiomArcWheelSelect/);
      // The Kepler+ Arc Wheel render now wires mainNodeRef={arcWheelMainRef}
      // for the wheel-onboarding tutorial, so that string is EXPECTED to be
      // present — it is no longer a marker for the removed Axiom block.
    });
  });
});
