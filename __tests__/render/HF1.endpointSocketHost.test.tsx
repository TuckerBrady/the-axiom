// AXM-036 hotfix HF-1 — Source/Terminal sockets missing on device (build 50).
//
// Tucker, TestFlight build 50, A1-1: "Source and terminal pieces didn't have
// sockets."
//
// Reproduced on the Android emulator with a probe build that drew a static
// magenta copy of each connected socket beside P12's animated one. The
// static copy sat on the correct side; the animated socket did not. The
// Source outlet (connected on its right) was drawn on the Source's LEFT, and
// after the engage re-render the Terminal socket (connected on top) left its
// cell entirely. Shots: drafts/MORPH/AXM-036/hotfix-shots/hf1-diag-*.png.
//
// Root cause: P12 animated each socket through
// `Animated.createAnimatedComponent(G)` with the scale-about-anchor written
// as a transform PROP array, [{translateX: a}, {scaleX: v}, {translateX: -a}].
// react-native-svg flattens a transform array into ONE props object
// (extractTransform -> transformsArrayToProps), so the repeated translateX
// keys collapse and the whole transform becomes `translateX: -a, scaleX: v`,
// a shift of one anchor length toward the left/top. The P12 tests mock
// react-native-svg as pass-through elements, so the prop array was never
// interpreted and the shift could not show up.
//
// These tests pin the real failure mode: no Animated value may reach a
// react-native-svg element, and each socket host must be an RN Animated.View
// whose ordered `style.transform` scales about the socket's ring-side edge
// (RN applies style transforms in order, about the view centre).

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';

const SVG_TYPES = ['Svg', 'Circle', 'Line', 'Rect', 'Path', 'G', 'Ellipse'];

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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Animated } = require('react-native');

import { EndpointSockets } from '../../src/components/gameplay/EndpointSockets';
import { endpointPortGeometry } from '../../src/components/gameplay/endpointSocketGeometry';
import BoardPiece from '../../src/components/gameplay/BoardPiece';
import type { PlacedPiece, PortSide } from '../../src/game/types';

const SIDES: PortSide[] = ['top', 'right', 'bottom', 'left'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function containsAnimatedValue(value: any, seen = new Set<unknown>()): boolean {
  if (value instanceof Animated.Value) return true;
  if (value === null || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  if (React.isValidElement(value)) return false;
  return Object.keys(value).some(k => containsAnimatedValue(value[k], seen));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function svgNodesWithAnimatedProps(root: any): string[] {
  return root
    .findAll((n: { type: unknown }) => typeof n.type === 'string' && SVG_TYPES.includes(n.type))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((n: any) => {
      const { children, ...rest } = n.props;
      void children;
      return containsAnimatedValue(rest);
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((n: any) => `${n.type}#${n.props.testID ?? ''}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hostFor(root: any, testID: string): any {
  const hosts = root.findAll(
    (n: { type: unknown; props: { testID?: string } }) => n.type === 'AnimatedView' && n.props.testID === testID,
  );
  expect(hosts).toHaveLength(1);
  return hosts[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const num = (v: any): number => (v instanceof Animated.Value ? v.__getValue() : v);

// Applies an RN style transform array to point p, as RN does: in array
// order (outermost first), about the view's centre.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyRNTransform(transform: any[], p: [number, number], centre: number): [number, number] {
  let x = p[0] - centre;
  let y = p[1] - centre;
  for (let i = transform.length - 1; i >= 0; i--) {
    const t = transform[i];
    if ('translateX' in t) x += num(t.translateX);
    else if ('translateY' in t) y += num(t.translateY);
    else if ('scaleX' in t) x *= num(t.scaleX);
    else if ('scaleY' in t) y *= num(t.scaleY);
    else if ('scale' in t) {
      x *= num(t.scale);
      y *= num(t.scale);
    } else throw new Error(`unexpected transform ${JSON.stringify(Object.keys(t))}`);
  }
  return [x + centre, y + centre];
}

// The port centre in cell coordinates (the midpoint of the port's cell
// edge): the point that stays put while the port scales up from 0 radius
// (SWEEP-B51 S12, AXM-044 DR-7).
function portCentre(c: number, side: PortSide): [number, number] {
  const g = endpointPortGeometry(c, side, 'socket');
  return [g.cx, g.cy];
}

function render(el: React.ReactElement) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let r: any;
  TestRenderer.act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}

describe('[HF-1] socket animation never reaches a react-native-svg prop', () => {
  it('[HF-1] no svg element under EndpointSockets carries an Animated value (connected or not)', () => {
    for (const connected of [[], ['top', 'right', 'bottom', 'left']] as PortSide[][]) {
      const r = render(
        <EndpointSockets pieceId="p" cellSize={42} kind="outlet" connectedSides={connected} fill="#F0B429" />,
      );
      expect(svgNodesWithAnimatedProps(r.root)).toEqual([]);
    }
  });

  it('[HF-1] no svg element under a Source BoardPiece carries an Animated value', () => {
    const piece: PlacedPiece = {
      id: 'src', type: 'source', category: 'physics', gridX: 0, gridY: 1, ports: [], rotation: 0,
    };
    const r = render(
      <BoardPiece
        piece={piece}
        animProps={undefined}
        isLocked={false}
        cellSize={40}
        iconColor="#F0B429"
        onTap={() => {}}
        onLongPress={() => {}}
        endpoint={{ kind: 'outlet', sides: ['right'] }}
      />,
    );
    expect(svgNodesWithAnimatedProps(r.root)).toEqual([]);
  });

  it('[HF-1] EndpointSockets.tsx wraps no react-native-svg element in createAnimatedComponent', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/gameplay/EndpointSockets.tsx'),
      'utf-8',
    );
    expect(src).not.toMatch(/createAnimatedComponent\(\s*(G|Rect|Path|Svg|Circle|Line)\s*\)/);
  });
});

describe('[HF-1] each side host is an RN Animated.View scaling about the port centre', () => {
  it.each([42, 40, 26])('cell %i: full-cell host, opacity and ordered transform in style', c => {
    const r = render(
      <EndpointSockets pieceId="p" cellSize={c} kind="socket" connectedSides={['left']} fill="#00C48C" />,
    );
    for (const side of SIDES) {
      const host = hostFor(r.root, `endpoint-socket-p-${side}`);
      const style = host.props.style;
      expect(style.position).toBe('absolute');
      expect(style.width).toBe(c);
      expect(style.height).toBe(c);
      expect(style.opacity).toBeInstanceOf(Animated.Value);
      expect(Array.isArray(style.transform)).toBe(true);

      const anchor = portCentre(c, side);
      const scaleKey = 'scale';
      const scaleEntry = style.transform.find((t: object) => scaleKey in t);
      expect(scaleEntry).toBeDefined();

      // The port centre is a fixed point of the transform at every scale.
      for (const s of [0, 0.5, 1]) {
        const probe = style.transform.map((t: Record<string, unknown>) =>
          scaleKey in t ? { [scaleKey]: s } : t,
        );
        const [x, y] = applyRNTransform(probe, anchor, c / 2);
        expect(x).toBeCloseTo(anchor[0], 6);
        expect(y).toBeCloseTo(anchor[1], 6);
      }

      // Fully extended, the transform is the identity: the socket draws
      // exactly at its static geometry (no one-anchor shift).
      const full = style.transform.map((t: Record<string, unknown>) => (scaleKey in t ? { [scaleKey]: 1 } : t));
      const far: [number, number] = [c * 0.9, c * 0.1];
      const [fx, fy] = applyRNTransform(full, far, c / 2);
      expect(fx).toBeCloseTo(far[0], 6);
      expect(fy).toBeCloseTo(far[1], 6);
    }
  });

  it('[HF-1] the shape inside each host is the static geometry, drawn in a full-cell Svg', () => {
    const c = 40;
    const r = render(
      <EndpointSockets pieceId="p" cellSize={c} kind="outlet" connectedSides={['right']} fill="#F0B429" />,
    );
    for (const side of SIDES) {
      const host = hostFor(r.root, `endpoint-socket-p-${side}`);
      const svg = host.findAllByType('Svg')[0];
      expect(svg.props.width).toBe(c);
      expect(svg.props.height).toBe(c);
      const geo = endpointPortGeometry(c, side, 'outlet');
      const paths = host.findAllByType('Path');
      expect(paths[0].props.d).toBe(geo.aperturePath);
    }
  });

  it('[HF-1] connected at mount: opacity 1; unconnected: opacity 0', () => {
    const r = render(
      <EndpointSockets pieceId="p" cellSize={40} kind="socket" connectedSides={['top']} fill="#00C48C" />,
    );
    expect(hostFor(r.root, 'endpoint-socket-p-top').props.style.opacity.__getValue()).toBe(1);
    expect(hostFor(r.root, 'endpoint-socket-p-left').props.style.opacity.__getValue()).toBe(0);
  });
});
