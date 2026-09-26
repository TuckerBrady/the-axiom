// Pre-written by Pierce (SPEC_COGS_DISCOVERY_FLIGHT v1.1 §15.1), landed verbatim by Nash. Do not edit;
// a test believed wrong goes back to Pierce.

import {
  computeDiscoveryPerch, isDiscoveryStep, isPerchStep, resolveTargetPiece, boardCellLayout,
  PERCH_ORB_SIZE, DISCOVERY_FLIGHT_MS, DISCOVERY_FLIGHT_BEZIER,
} from '../../../src/game/discoveryFlight';
import { trayFocusKey } from '../../../src/game/trayFocus';
import { ALL_LEVELS } from '../../../src/game/levels';
import type { TutorialStep } from '../../../src/game/types';

const CAPTION = (t: { left: number; top: number; width: number }) =>
  ({ left: t.left + t.width / 2 - 100, top: t.top - 24, width: 200, height: 18 });

describe('constants (3.1, 3.2, 3.3)', () => {
  it('3.1 flight is 600ms on bezier(0.4, 0, 0.2, 1)', () => {
    expect(DISCOVERY_FLIGHT_MS).toBe(600);
    expect(DISCOVERY_FLIGHT_BEZIER).toEqual([0.4, 0, 0.2, 1]);
  });
  it('3.3 perch orb size is 24', () => { expect(PERCH_ORB_SIZE).toBe(24); });
});

describe('computeDiscoveryPerch (3.2)', () => {
  it('3.2.5 tray target, callout at top: perches toward, above the caption', () => {
    const target = { left: 136, top: 500, width: 88, height: 64 };
    const p = computeDiscoveryPerch({ target, caption: CAPTION(target),
      callout: { left: 24, top: 80, width: 312, height: 188 }, screenW: 360, screenH: 640 });
    expect(p).toEqual({ cx: 180, cy: 456, side: 'toward' });
  });

  it('3.2.4 upper-half target, callout at bottom: perches toward, below the target', () => {
    const target = { left: 40, top: 180, width: 64, height: 64 };
    const p = computeDiscoveryPerch({ target, caption: CAPTION(target),
      callout: { left: 24, top: 372, width: 312, height: 188 }, screenW: 360, screenH: 640 });
    expect(p).toEqual({ cx: 72, cy: 264, side: 'toward' });
  });

  it('3.2.3 toward collides with a long callout: falls back to away', () => {
    const target = { left: 120, top: 250, width: 120, height: 60 };
    const p = computeDiscoveryPerch({ target, caption: CAPTION(target),
      callout: { left: 24, top: 320, width: 312, height: 240 }, screenW: 360, screenH: 640 });
    expect(p).toEqual({ cx: 180, cy: 206, side: 'away' });
  });

  it('3.2.2 both vertical candidates fail: takes the right flank', () => {
    const target = { left: 140, top: 150, width: 80, height: 60 };
    const p = computeDiscoveryPerch({ target, caption: CAPTION(target),
      callout: { left: 24, top: 60, width: 312, height: 62 }, screenW: 360, screenH: 280 });
    expect(p).toEqual({ cx: 240, cy: 180, side: 'right' });
  });

  it('3.2.7 nothing qualifies: returns screen centre', () => {
    const target = { left: 8, top: 100, width: 344, height: 100 };
    const p = computeDiscoveryPerch({ target, caption: CAPTION(target),
      callout: { left: 24, top: 20, width: 312, height: 70 }, screenW: 360, screenH: 280 });
    expect(p).toEqual({ cx: 180, cy: 140, side: 'center' });
  });

  it('3.2.5 clamps cx into the screen for a target at the right edge', () => {
    const target = { left: 330, top: 500, width: 22, height: 48 };
    const p = computeDiscoveryPerch({ target, caption: CAPTION(target),
      callout: { left: 24, top: 80, width: 312, height: 188 }, screenW: 360, screenH: 640 });
    expect(p).toEqual({ cx: 340, cy: 456, side: 'toward' });
  });

  it('3.2.5 with no caption, perches off the target edge', () => {
    const target = { left: 136, top: 500, width: 88, height: 64 };
    const p = computeDiscoveryPerch({ target, caption: null,
      callout: { left: 24, top: 80, width: 312, height: 188 }, screenW: 360, screenH: 640 });
    expect(p).toEqual({ cx: 180, cy: 480, side: 'toward' });
  });

  it('3.5 / 8.3 a 28dp cell on a 12x9 board at 360dp: portal is 64dp and the perch sits outside it', () => {
    // board origin (12, 150), cell (5, 3) at cellSize 28 -> cell (152, 234, 28, 28).
    // computePortalBox: raw 52 -> PORTAL_MIN 64, centred on (166, 248) -> box (134, 216, 64, 64).
    const target = { left: 134, top: 216, width: 64, height: 64 };
    const p = computeDiscoveryPerch({ target, caption: CAPTION(target),
      callout: { left: 24, top: 372, width: 312, height: 188 }, screenW: 360, screenH: 640 });
    expect(p).toEqual({ cx: 166, cy: 300, side: 'toward' });
  });

  it('4.2 a non-centre perch never overlaps target, caption, or callout', () => {
    const cases = [
      { t: { left: 136, top: 500, width: 88, height: 64 }, c: { left: 24, top: 80, width: 312, height: 188 } },
      { t: { left: 40, top: 180, width: 64, height: 64 }, c: { left: 24, top: 372, width: 312, height: 188 } },
      { t: { left: 8, top: 520, width: 344, height: 40 }, c: { left: 24, top: 80, width: 312, height: 240 } },
      { t: { left: 134, top: 216, width: 64, height: 64 }, c: { left: 24, top: 372, width: 312, height: 188 } },
    ];
    const hit = (a: any, b: any) =>
      a.left < b.left + b.width && b.left < a.left + a.width &&
      a.top < b.top + b.height && b.top < a.top + a.height;
    for (const { t, c } of cases) {
      const cap = CAPTION(t);
      const p = computeDiscoveryPerch({ target: t, caption: cap, callout: c, screenW: 360, screenH: 640 });
      expect(p.side).not.toBe('center');
      const orb = { left: p.cx - 12, top: p.cy - 12, width: 24, height: 24 };
      expect(hit(orb, t)).toBe(false);
      expect(hit(orb, cap)).toBe(false);
      expect(hit(orb, c)).toBe(false);
    }
  });

  it('3.2.8 is pure', () => {
    const args = { target: { left: 136, top: 500, width: 88, height: 64 }, caption: null,
      callout: { left: 24, top: 80, width: 312, height: 188 }, screenW: 360, screenH: 640 };
    expect(computeDiscoveryPerch(args)).toEqual(computeDiscoveryPerch(args));
  });
});

describe('boardCellLayout (7.3)', () => {
  it('offsets by whole cells from the board origin', () => {
    expect(boardCellLayout({ x: 12, y: 150, width: 336, height: 252 }, 28, 5, 3))
      .toEqual({ x: 152, y: 234, width: 28, height: 28 });
    expect(boardCellLayout({ x: 12, y: 150, width: 336, height: 252 }, 28, 0, 0))
      .toEqual({ x: 12, y: 150, width: 28, height: 28 });
  });
});

describe('resolveTargetPiece (7.1)', () => {
  const pre = (type: any, gridX: number, gridY: number) => ({ type, gridX, gridY, isPrePlaced: true });
  const own = (type: any, gridX: number, gridY: number) => ({ type, gridX, gridY, isPrePlaced: false });

  it('7.1.1 a pre-placed piece wins over a player-placed one and over the tray', () => {
    expect(resolveTargetPiece('latch', [own('latch', 1, 1), pre('latch', 4, 3)], ['latch']))
      .toEqual({ where: 'board', gridX: 4, gridY: 3 });
  });
  it('7.1.1 among pre-placed pieces, row-major first', () => {
    expect(resolveTargetPiece('splitter', [pre('splitter', 2, 5), pre('splitter', 7, 1), pre('splitter', 3, 1)], []))
      .toEqual({ where: 'board', gridX: 3, gridY: 1 });
  });
  it('7.1.2 with no pre-placed piece, the row-major first player-placed one', () => {
    expect(resolveTargetPiece('merger', [own('merger', 6, 4), own('merger', 2, 4)], ['merger']))
      .toEqual({ where: 'board', gridX: 2, gridY: 4 });
  });
  it('7.1.3 falls through to the tray with a capitalised ref key', () => {
    expect(resolveTargetPiece('merger', [pre('source', 1, 4)], ['conveyor', 'merger']))
      .toEqual({ where: 'tray', refKey: 'trayMerger' });
    expect(resolveTargetPiece('configNode', [], ['configNode']))
      .toEqual({ where: 'tray', refKey: 'trayConfigNode' });
  });
  it('7.1.4 returns null when the piece is nowhere', () => {
    expect(resolveTargetPiece('bridge', [pre('source', 1, 4)], ['conveyor'])).toBeNull();
  });
});

describe('step predicates (1.1 to 1.3)', () => {
  const base: TutorialStep = { id: 'x', targetRef: 'trayGear', eyeState: 'amber', message: 'm',
    codexEntryId: 'gear', captionLabel: '???' };

  it('1.1 a tray notice step is a discovery step', () => { expect(isDiscoveryStep(base)).toBe(true); });
  it('1.1 a boardGrid step is a discovery step only with targetPiece', () => {
    expect(isDiscoveryStep({ ...base, targetRef: 'boardGrid' })).toBe(false);
    expect(isDiscoveryStep({ ...base, targetRef: 'boardGrid', targetPiece: 'latch' })).toBe(true);
  });
  it('1.1 center, allowPieceTap, missing codex or caption are not', () => {
    expect(isDiscoveryStep({ ...base, targetRef: 'center' })).toBe(false);
    expect(isDiscoveryStep({ ...base, allowPieceTap: true })).toBe(false);
    expect(isDiscoveryStep({ ...base, codexEntryId: undefined })).toBe(false);
    expect(isDiscoveryStep({ ...base, captionLabel: 'GEAR' })).toBe(false);
  });
  it('1.2 the reveal after a notice on the same target is a perch step; a different target is not', () => {
    const reveal: TutorialStep = { id: 'r', targetRef: 'trayGear', eyeState: 'green', message: 'm', captionLabel: 'GEAR' };
    expect(isPerchStep([base, reveal], 1)).toBe(true);
    expect(isPerchStep([base, { ...reveal, targetRef: 'boardGrid' }], 1)).toBe(false);
    expect(isPerchStep([reveal], 0)).toBe(false);
  });
});

describe('shipped data (0, 5.2, 7.8, 7.9, 12.5 to 12.7)', () => {
  const steps = ALL_LEVELS.flatMap(l => (l.tutorialSteps ?? []).map((s, i, all) => ({ l, s, i, all })));

  it('fifteen discovery steps and twenty-five perch steps', () => {
    expect(steps.filter(x => isDiscoveryStep(x.s)).length).toBe(15);
    expect(steps.filter(x => isPerchStep(x.all, x.i)).length).toBe(25);
  });

  it('5.2 every discovery step is amber', () => {
    for (const x of steps.filter(x => isDiscoveryStep(x.s))) expect(x.s.eyeState).toBe('amber');
  });

  it('7.9 exactly the five migrated steps carry targetPiece, with the listed types', () => {
    const got = steps.filter(x => x.s.targetPiece)
      .map(x => `${x.l.id}/${x.s.id}/${x.s.targetPiece}`).sort();
    expect(got).toEqual([
      'K1-3/latch-collect/latch',
      'K1-5/merger-collect/merger',
      'K1-5/splitter-collect/splitter',
      'K1-7/bridge-collect/bridge',
      'NF-1/inverter-collect/inverter',
    ]);
    for (const x of steps.filter(x => x.s.targetPiece)) {
      expect(x.s.targetRef).toBe('boardGrid');
      expect(x.s.captionLabel).toBe('???');
    }
  });

  it('every codex step in the shipped data is a discovery step', () => {
    for (const x of steps.filter(x => x.s.codexEntryId)) expect(isDiscoveryStep(x.s)).toBe(true);
  });

  it('12.5 / 12.7 every targetPiece resolves against its own level; board targets are unique; tray targets have a ref', () => {
    for (const x of steps.filter(x => x.s.targetPiece)) {
      const type = x.s.targetPiece!;
      const pre = x.l.prePlacedPieces.filter(p => p.type === type);
      const r = resolveTargetPiece(type, x.l.prePlacedPieces, x.l.availablePieces);
      expect(r).not.toBeNull();
      if (r!.where === 'board') {
        expect(pre).toHaveLength(1);
      } else {
        expect(pre).toHaveLength(0);
        expect(trayFocusKey(r!.refKey, [{ key: 'k', type, isTape: false }])).toBe('k');
      }
    }
  });

  it('12.5 on master data, the five resolve to board, board, tray, board, tray', () => {
    const where = (lvl: string, id: string) => {
      const x = steps.find(y => y.l.id === lvl && y.s.id === id)!;
      return resolveTargetPiece(x.s.targetPiece!, x.l.prePlacedPieces, x.l.availablePieces)!.where;
    };
    expect(where('K1-3', 'latch-collect')).toBe('board');
    expect(where('K1-5', 'splitter-collect')).toBe('board');
    expect(where('K1-5', 'merger-collect')).toBe('tray');
    expect(where('K1-7', 'bridge-collect')).toBe('board');
    expect(where('NF-1', 'inverter-collect')).toBe('tray');
  });
});
