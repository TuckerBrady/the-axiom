// Tucker, build 48 (confirmed 2026-09-25 on the 360dp shot): every tutorial
// spotlight box rode ~24-35dp above its target. The overlay is absolute-fill
// at the top of an edge-to-edge screen, but it placed boxes from raw
// measureInWindow coordinates, which are not the overlay's space on Android.
// Fix: measure the overlay's own root the same way and subtract its origin,
// so any window offset on any platform cancels.

import * as fs from 'fs';
import * as path from 'path';
import { toOverlaySpace } from '../../../src/game/overlaySpace';

describe('toOverlaySpace', () => {
  it('subtracts the overlay origin from a window-space layout', () => {
    expect(toOverlaySpace({ x: 120, y: 520, width: 56, height: 56 }, { x: 0, y: -24 }))
      .toEqual({ x: 120, y: 544, width: 56, height: 56 });
    expect(toOverlaySpace({ x: 30, y: 200, width: 10, height: 10 }, { x: 5, y: 40 }))
      .toEqual({ x: 25, y: 160, width: 10, height: 10 });
  });

  it('leaves a layout unchanged when the overlay sits at the window origin', () => {
    const l = { x: 12, y: 34, width: 56, height: 78 };
    expect(toOverlaySpace(l, { x: 0, y: 0 })).toEqual(l);
  });
});

describe('TutorialHUDOverlay measures targets in its own space', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../../src/components/TutorialHUDOverlay.tsx'), 'utf8');
  const measure = src.slice(src.indexOf('const measureTarget = useCallback'), src.indexOf('// ── Portal geometry helpers'));

  it('holds a ref to its own root view', () => {
    expect(src).toMatch(/const overlayRootRef = useRef/);
    expect(src).toMatch(/ref=\{overlayRootRef\}/);
  });

  it('measures its root with the same API and converts every native result', () => {
    expect(measure).toMatch(/overlayRootRef/);
    expect(measure).toMatch(/toOverlaySpace\(/);
  });
});
