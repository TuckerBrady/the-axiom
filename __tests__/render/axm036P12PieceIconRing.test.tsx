// AXM-036 P12 — [P12-8] GUARD (unconnected Source/Terminal are pixel-identical
// to master) and [P12-3] the ring-gap arc treatment used by a connected
// socket/outlet and the directional-Terminal entry marker.
//
// Same react-native-svg mock as axm036P12Sockets.test.tsx / the established
// axm036P4aBeamOverlay.test.tsx pattern: the real package renders `null`
// under this repo's jest harness (no native view registry).

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
import { Colors } from '../../src/theme/tokens';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderIcon(props: any): any {
  let r: any;
  TestRenderer.act(() => {
    r = TestRenderer.create(<PieceIcon {...props} />);
  });
  return r;
}

describe('[P12-8] GUARD: unconnected Source and Terminal element trees equal master', () => {
  it('source, no ringGapSides', () => {
    const r = renderIcon({ type: 'source', size: 40 });
    expect(r.toJSON()).toMatchSnapshot();
  });

  it('source, empty ringGapSides array behaves the same as absent', () => {
    const withEmpty = renderIcon({ type: 'source', size: 40, ringGapSides: [] });
    const withoutProp = renderIcon({ type: 'source', size: 40 });
    expect(withEmpty.toJSON()).toEqual(withoutProp.toJSON());
  });

  it('terminal, no ringGapSides', () => {
    const r = renderIcon({ type: 'terminal', size: 40 });
    expect(r.toJSON()).toMatchSnapshot();
  });

  it('terminal, empty ringGapSides array behaves the same as absent', () => {
    const withEmpty = renderIcon({ type: 'terminal', size: 40, ringGapSides: [] });
    const withoutProp = renderIcon({ type: 'terminal', size: 40 });
    expect(withEmpty.toJSON()).toEqual(withoutProp.toJSON());
  });
});

describe('[P12-3] terminal with ringGapSides [top] keeps a full body disc and strokes the ring as arcs with a gap of 2 x half-angle about the top axis', () => {
  it('body disc stays a full circle with no stroke; the stroke moves to Path arcs', () => {
    const r = renderIcon({ type: 'terminal', size: 40, ringGapSides: ['top'], ringGapHalfAngleDeg: 20 });
    const circles = r.root.findAllByType('Circle');
    // The outer body disc (r=16) is present, full disc, no stroke attribute
    // driving a visible ring (fill only).
    const bodyDisc = circles.find((c: { props: { r: string } }) => c.props.r === '16');
    expect(bodyDisc).toBeDefined();
    expect(bodyDisc!.props.fill).toBe('#0e1f36');
    expect(bodyDisc!.props.stroke).toBeUndefined();

    // The ring's stroke is drawn as at least one Path arc ("M ... A ...").
    const paths = r.root.findAllByType('Path');
    const arcPaths = paths.filter((p: { props: { d: string } }) => /^M .* A /.test(p.props.d));
    expect(arcPaths.length).toBeGreaterThan(0);
    for (const arc of arcPaths) {
      expect(arc.props.fill).toBe('none');
      expect(arc.props.stroke).toBe(Colors.green);
    }
  });

  it('the gap spans 2 x half-angle about the top axis (no arc endpoint falls inside the gap)', () => {
    const halfAngle = 20;
    const r = renderIcon({ type: 'terminal', size: 40, ringGapSides: ['top'], ringGapHalfAngleDeg: halfAngle });
    const paths = r.root.findAllByType('Path');
    const arcPaths = paths.filter((p: { props: { d: string } }) => /^M .* A /.test(p.props.d));
    // With one gap, exactly one arc should be drawn (the ring minus the gap).
    expect(arcPaths).toHaveLength(1);

    // Top axis = 270 degrees. The gap is [250, 290]. Parse the arc's start/end
    // points and confirm neither sits within that angular gap (within 16px
    // radius circle centred at 20,20 for size 40 -> r=16).
    const d = arcPaths[0].props.d as string;
    const match = d.match(/M ([-\d.]+) ([-\d.]+) A [-\d.]+ [-\d.]+ 0 \d 1 ([-\d.]+) ([-\d.]+)/);
    expect(match).not.toBeNull();
    const [, x1, y1, x2, y2] = match!.map(Number) as unknown as number[];
    const angleOf = (x: number, y: number) => {
      let deg = (Math.atan2(y - 20, x - 20) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      return deg;
    };
    const a1 = angleOf(x1 as number, y1 as number);
    const a2 = angleOf(x2 as number, y2 as number);
    // The arc's own endpoints are exactly at the gap boundary (290 and 250 mod 360).
    expect(Math.min(Math.abs(a1 - 290), Math.abs(a1 - 290 - 360))).toBeLessThan(0.5);
    expect(Math.min(Math.abs(a2 - 610 % 360), Math.abs(a2 - (610 % 360) - 360))).toBeLessThan(0.5);
  });
});

describe('[P12-3] inner ring, core and corner ticks unchanged under a gap', () => {
  it('terminal: inner ring, core dot and corner L-marks keep master values', () => {
    const withGap = renderIcon({ type: 'terminal', size: 40, ringGapSides: ['top'], ringGapHalfAngleDeg: 20 });
    const withoutGap = renderIcon({ type: 'terminal', size: 40 });

    const innerRing = (r: any) => r.root.findAllByType('Circle').find((c: { props: { r: string } }) => c.props.r === '9');
    const core = (r: any) => r.root.findAllByType('Circle').find((c: { props: { r: string } }) => c.props.r === '4');
    const corners = (r: any) => r.root.findAllByType('Path').filter((p: { props: { d: string } }) => p.props.d.includes('L 9 6') || p.props.d.includes('L 31 6') || p.props.d.includes('L 9 34') || p.props.d.includes('L 31 34'));

    expect(innerRing(withGap).props).toEqual(innerRing(withoutGap).props);
    expect(core(withGap).props).toEqual(core(withoutGap).props);
    expect(corners(withGap).map((c: { props: unknown }) => c.props)).toEqual(corners(withoutGap).map((c: { props: unknown }) => c.props));
  });

  it('source: inner ring and triangle keep master values', () => {
    const withGap = renderIcon({ type: 'source', size: 40, ringGapSides: ['right'], ringGapHalfAngleDeg: 20 });
    const withoutGap = renderIcon({ type: 'source', size: 40 });

    const innerRing = (r: any) => r.root.findAllByType('Circle').find((c: { props: { r: string } }) => c.props.r === '10');
    const triangle = (r: any) => r.root.findAllByType('Path').find((p: { props: { d: string } }) => p.props.d.includes('L 27 20'));

    expect(innerRing(withGap).props).toEqual(innerRing(withoutGap).props);
    expect(triangle(withGap).props).toEqual(triangle(withoutGap).props);
  });
});
