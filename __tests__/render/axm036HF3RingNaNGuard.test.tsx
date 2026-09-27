// AXM-036 hotfix3 — [HF3-n] the ring-gap arc path builder must never emit a
// NaN into an SVG path `d` attribute. Before this fix, a tiny cell size
// (c=4 or c=5) sent a non-finite `ringGapHalfAngleDeg` into
// `ringStrokeArcPaths`, whose polar-point math then produced literal `NaN`
// coordinates — react-native-svg's PathParser threw an
// IllegalArgumentException on Android and crashed the app
// (crash-buffer-1.txt: "s=M NaN NaN A 16 16 0 0 1 NaN NaN"). This happened
// during a transient tiny layout (a window size/density change mid-level).
//
// Same react-native-svg mock as axm036P12PieceIconRing.test.tsx.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';

jest.mock('react-native-svg', () => {
  const ReactLib = require('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const make = (name: string) => (props: any) => ReactLib.createElement(name, props, props.children);
  return {
    __esModule: true,
    default: make('Svg'),
    Svg: make('Svg'),
    Circle: make('Circle'),
    Line: make('Line'),
    Rect: make('Rect'),
    Path: make('Path'),
    G: make('G'),
    Ellipse: make('Ellipse'),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer = require('react-test-renderer');
import { PieceIcon } from '../../src/components/PieceIcon';
import { ringGapHalfAngleDeg } from '../../src/components/gameplay/endpointSocketGeometry';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderIcon(props: any): any {
  let r: any;
  TestRenderer.act(() => {
    r = TestRenderer.create(<PieceIcon {...props} />);
  });
  return r;
}

function allPathDs(r: ReturnType<typeof renderIcon>): string[] {
  return r.root
    .findAllByType('Path')
    .map((p: { props: { d: string } }) => p.props.d)
    .filter((d: string | undefined): d is string => typeof d === 'string');
}

describe('[HF3-5] no path string contains NaN at cell sizes 4, 5, 6 for source and terminal', () => {
  const sizes = [4, 5, 6];
  for (const c of sizes) {
    it(`terminal, c=${c} (ringGapSides=[top])`, () => {
      const halfAngle = ringGapHalfAngleDeg(c);
      const r = renderIcon({ type: 'terminal', size: 40, ringGapSides: ['top'], ringGapHalfAngleDeg: halfAngle });
      for (const d of allPathDs(r)) {
        expect(d).not.toMatch(/NaN/);
      }
    });

    it(`source, c=${c} (ringGapSides=[right])`, () => {
      const halfAngle = ringGapHalfAngleDeg(c);
      const r = renderIcon({ type: 'source', size: 40, ringGapSides: ['right'], ringGapHalfAngleDeg: halfAngle });
      for (const d of allPathDs(r)) {
        expect(d).not.toMatch(/NaN/);
      }
    });
  }
});

describe('[HF3-6] a non-finite half-angle falls back to the plain full ring, never a NaN path', () => {
  it('terminal with an explicit NaN half-angle renders a full-ring pair of arcs with no NaN', () => {
    const r = renderIcon({ type: 'terminal', size: 40, ringGapSides: ['top'], ringGapHalfAngleDeg: NaN });
    const paths = r.root.findAllByType('Path');
    const arcPaths = paths.filter((p: { props: { d: string } }) => /^M .* A /.test(p.props.d));
    // Full-ring fallback is drawn as two half-circle arcs (a single SVG arc
    // command can't sweep 360 degrees).
    expect(arcPaths.length).toBe(2);
    for (const arc of arcPaths) {
      expect(arc.props.d).not.toMatch(/NaN/);
    }
  });

  it('terminal with half-angle 0 (c=4, no room for a gap) also falls back to the plain full ring', () => {
    const r = renderIcon({ type: 'terminal', size: 40, ringGapSides: ['top'], ringGapHalfAngleDeg: 0 });
    const paths = r.root.findAllByType('Path');
    const arcPaths = paths.filter((p: { props: { d: string } }) => /^M .* A /.test(p.props.d));
    expect(arcPaths.length).toBe(2);
    for (const arc of arcPaths) {
      expect(arc.props.d).not.toMatch(/NaN/);
    }
  });
});
