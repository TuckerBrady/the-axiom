// SWEEP-B51 S6 (AXM-042): Ship tab icon, canon profile (locked design).
// Binding spec: project-docs/DESIGN_HANDOFFS/008-ship-tab-icon/DESIGN_SPEC.md
// (v1.0.0, Tucker 2026-09-27, option A). DR-1..DR-6 are restated as S6-1..S6-3.
//
// react-native-svg renders `null` under this repo's jest harness (no native
// view registry), so it is mocked to plain named host elements, the same
// pattern as axm036P12PieceIconRing.test.tsx. Polygon and Circle are in the
// mock so the pre-change icon renders and fails on its element counts.

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
    Ellipse: make('Ellipse'),
    Path: make('Path'),
    Polygon: make('Polygon'),
    Rect: make('Rect'),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer = require('react-test-renderer');
import ShipIcon from '../../src/components/icons/ShipIcon';

const COLOR = '#F59E0B';
const SHAPES = ['Rect', 'Path', 'Ellipse', 'Polygon', 'Circle'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function render(props: any): any {
  let r: any;
  TestRenderer.act(() => {
    r = TestRenderer.create(<ShipIcon {...props} />);
  });
  return r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function attrs(node: any, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = String(node.props[k]);
  return out;
}

describe('SWEEP-B51 S6: ShipIcon canon profile', () => {
  it('[S6-1] ShipIcon renders exactly 1 Rect, 3 Path and 1 Ellipse with the DR-1 attributes', () => {
    const r = render({ size: 20, color: COLOR });

    const svgs = r.root.findAllByType('Svg');
    expect(svgs).toHaveLength(1);
    const svg = svgs[0];
    expect(svg.props.viewBox).toBe('0 0 24 24');
    expect(svg.props.width).toBe(20);
    expect(svg.props.height).toBe(20);

    // Exactly five children, in DR-1 order.
    // (the mock wraps each host in a function component, so match host nodes by
    // their string type, in tree order).
    const children = svg.findAll(
      (n: { type: unknown }) => typeof n.type === 'string' && SHAPES.includes(n.type as string),
    );
    expect(children.map((c: { type: string }) => c.type)).toEqual(['Rect', 'Path', 'Path', 'Path', 'Ellipse']);

    const rects = r.root.findAllByType('Rect');
    const paths = r.root.findAllByType('Path');
    const ellipses = r.root.findAllByType('Ellipse');
    expect(rects).toHaveLength(1);
    expect(paths).toHaveLength(3);
    expect(ellipses).toHaveLength(1);

    expect(attrs(rects[0], ['x', 'y', 'width', 'height', 'rx', 'strokeWidth'])).toEqual({
      x: '2.4', y: '8.8', width: '4', height: '6.4', rx: '0.6', strokeWidth: '1.6',
    });
    expect(paths.map((p: { props: { d: string } }) => p.props.d)).toEqual([
      'M6.4 7.6 H13.8 V16.4 H6.4 Z',
      'M13.8 9.2 H19 V14.8 H13.8',
      'M19 9.2 L23.2 12 L19 14.8',
    ]);
    for (const p of paths) expect(String(p.props.strokeWidth)).toBe('1.6');
    expect(attrs(ellipses[0], ['cx', 'cy', 'rx', 'ry', 'strokeWidth'])).toEqual({
      cx: '10', cy: '17.8', rx: '2.6', ry: '1', strokeWidth: '1.2',
    });

    for (const el of children) {
      expect(el.props.stroke).toBe(COLOR);
      expect(el.props.fill).toBe('none');
      expect(el.props.strokeLinejoin).toBe('round');
    }
  });

  it('[S6-1] no Polygon and no Circle remain', () => {
    const r = render({ color: COLOR });
    expect(r.root.findAllByType('Polygon')).toHaveLength(0);
    expect(r.root.findAllByType('Circle')).toHaveLength(0);
    // Defaults hold: size 22.
    const svg = r.root.findByType('Svg');
    expect(svg.props.width).toBe(22);
    expect(svg.props.height).toBe(22);
  });

  it('[S6-2] every stroke is the color prop and no element sets opacity', () => {
    for (const color of [COLOR, 'rgba(255,255,255,0.28)', undefined]) {
      const expected = color ?? '#7a96b0';
      const r = render(color === undefined ? {} : { color });
      const shapes = SHAPES.flatMap((t) => r.root.findAllByType(t));
      expect(shapes.length).toBeGreaterThan(0);
      for (const el of [...shapes, r.root.findByType('Svg')]) {
        expect(el.props.opacity).toBeUndefined();
        expect(el.props.strokeOpacity).toBeUndefined();
        expect(el.props.fillOpacity).toBeUndefined();
        if (el.props.stroke !== undefined) expect([expected, 'none']).toContain(el.props.stroke);
        if (el.props.fill !== undefined) expect([expected, 'none']).toContain(el.props.fill);
      }
      for (const el of shapes) expect(el.props.stroke).toBe(expected);
    }
  });
});
