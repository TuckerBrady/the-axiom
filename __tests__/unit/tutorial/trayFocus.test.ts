// Tucker, build-48 TestFlight (A1-5, also A1-3): when a tutorial introduces
// a new tray piece, the tray scrolls it into the centre frame first, and the
// '???' spotlight lands there — not on an off-centre item while the frame
// still holds the conveyor.

import * as fs from 'fs';
import * as path from 'path';
import { trayFocusKey, TRAY_FOCUS_SETTLE_MS } from '../../../src/game/trayFocus';
import type { TrayItem } from '../../../src/components/gameplay/PieceTray';

const item = (key: string, type: TrayItem['type'], count = 1): TrayItem =>
  ({ key, type, isTape: false, count });

const AXIOM: TrayItem[] = [
  item('conveyor', 'conveyor', 4),
  item('gear', 'gear', 2),
  item('scanner', 'scanner', 1),
];

const KEPLER: TrayItem[] = [
  item('conveyor:piece', 'conveyor', 3),
  { key: 'conveyor:tape', type: 'conveyor', isTape: true, count: 1 },
  item('transmitter:piece', 'transmitter', 1),
];

describe('trayFocusKey', () => {
  it('maps a tray target to its item key on an Axiom tray', () => {
    expect(trayFocusKey('trayGear', AXIOM)).toBe('gear');
    expect(trayFocusKey('trayScanner', AXIOM)).toBe('scanner');
  });

  it('maps a tray target to the piece (not the tape) on a Kepler tray', () => {
    expect(trayFocusKey('trayConveyor', KEPLER)).toBe('conveyor:piece');
    expect(trayFocusKey('trayTransmitter', KEPLER)).toBe('transmitter:piece');
  });

  it('covers every tray ref the tutorial can target', () => {
    const all: TrayItem[] = ['conveyor', 'gear', 'configNode', 'splitter', 'scanner', 'transmitter']
      .map(t => item(t, t as TrayItem['type']));
    for (const ref of ['trayConveyor', 'trayGear', 'trayConfigNode', 'traySplitter', 'trayScanner', 'trayTransmitter']) {
      expect(trayFocusKey(ref, all)).not.toBeNull();
    }
  });

  it('returns null for a non-tray target', () => {
    expect(trayFocusKey('boardGrid', AXIOM)).toBeNull();
    expect(trayFocusKey('center', AXIOM)).toBeNull();
    expect(trayFocusKey(undefined, AXIOM)).toBeNull();
  });

  it('returns null when the piece is not in the tray', () => {
    expect(trayFocusKey('trayTransmitter', AXIOM)).toBeNull();
  });
});

describe('TutorialHUDOverlay brings a tray target into the frame before measuring', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../../src/components/TutorialHUDOverlay.tsx'), 'utf8');
  const runStep = src.slice(src.indexOf('const runStep = useCallback'), src.indexOf('// ── Mount / hydration entrance'));

  it('takes a bringTargetIntoView prop', () => {
    expect(src).toMatch(/bringTargetIntoView\?:\s*\(targetRef: string\) => boolean/);
  });

  it('asks the parent to bring the target into view before the first measure', () => {
    const ask = runStep.indexOf('bringTargetIntoView');
    expect(ask).toBeGreaterThan(-1);
    const flying = runStep.indexOf("setPhase('flying')");
    expect(ask).toBeGreaterThan(flying);
    const measure = runStep.indexOf('measureTarget(s.targetRef', flying);
    expect(ask).toBeLessThan(measure);
  });

  it('waits for the tray scroll to settle when the target moved', () => {
    expect(runStep).toMatch(/TRAY_FOCUS_SETTLE_MS/);
    expect(TRAY_FOCUS_SETTLE_MS).toBeGreaterThanOrEqual(250);
    expect(TRAY_FOCUS_SETTLE_MS).toBeLessThanOrEqual(500);
  });
});

describe('GameplayScreen wires the tray focus', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../../src/screens/GameplayScreen.tsx'), 'utf8');

  it('passes bringTargetIntoView to the overlay, selecting through the tray pickup path', () => {
    expect(src).toMatch(/bringTargetIntoView=\{/);
    expect(src).toMatch(/trayFocusKey\(/);
  });
});
