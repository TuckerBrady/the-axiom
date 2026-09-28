// SWEEP-B51 S12 (AXM-044 + AXM-043): energy ports on the board and in the
// Codex. Locked design: project-docs/DESIGN_HANDOFFS/009-energy-port-sockets/
// DESIGN_SPEC.md (S3 "Energy port"); contract CONTRACT.md section 13.
//
// react-native-svg is mocked to pass-through elements (same pattern as
// axm036P12Sockets.test.tsx): the real package renders null under this
// repo's jest harness. Host-string nodes ('Path', 'G', ...) are what the
// queries below look at.

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
    Text: make('SvgText'),
    Polygon: make('Polygon'),
  };
});

// CodexDetailView's reanimated wrappers become plain pass-through hosts so
// the hero and the ALSO CATALOGUED chips actually render.
jest.mock('react-native-reanimated', () => {
  const ReactLib = require('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const View = (props: any) => ReactLib.createElement('ReanimatedView', props, props.children);
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    useSharedValue: (v: unknown) => ({ value: v }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (v: unknown) => v,
  };
});
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer = require('react-test-renderer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Animated } = require('react-native');

import {
  EndpointPortShape,
  EndpointSockets,
  TerminalEntryMarker,
} from '../../src/components/gameplay/EndpointSockets';
import { endpointPortGeometry, PIECE_CORE } from '../../src/components/gameplay/endpointSocketGeometry';
import { PieceIcon } from '../../src/components/PieceIcon';
import PieceSimulation from '../../src/components/PieceSimulation';
import CodexDetailView, { getCodexEntry } from '../../src/components/CodexDetailView';
import type { PortSide } from '../../src/game/types';

const SIDES: PortSide[] = ['top', 'right', 'bottom', 'left'];
const AMBER = '#F0B429';
const GREEN = '#00C48C';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function render(el: React.ReactElement): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let r: any;
  TestRenderer.act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hostsOfType(root: any, type: string): any[] {
  return root.findAll((n: { type: unknown }) => n.type === type);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function byTestId(root: any, type: string, testID: string): any[] {
  return root.findAll(
    (n: { type: unknown; props: { testID?: string } }) => n.type === type && n.props.testID === testID,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const num = (v: any): number => (v instanceof Animated.Value ? v.__getValue() : v);

// Applies an RN style transform array to point p, in array order about the
// view centre, as RN does.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyRNTransform(transform: any[], p: [number, number], centre: number): [number, number] {
  let x = p[0] - centre;
  let y = p[1] - centre;
  for (let i = transform.length - 1; i >= 0; i--) {
    const t = transform[i];
    if ('translateX' in t) x += num(t.translateX);
    else if ('translateY' in t) y += num(t.translateY);
    else if ('scale' in t) {
      x *= num(t.scale);
      y *= num(t.scale);
    } else throw new Error(`unexpected transform ${JSON.stringify(Object.keys(t))}`);
  }
  return [x + centre, y + centre];
}

// Every rendered PieceIcon element (memo wrapper and inner function both
// carry the props; either is fine for a props check).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pieceIconsOfType(root: any, type: string): any[] {
  return root.findAll(
    (n: { type: unknown; props: { type?: string; size?: unknown } }) =>
      typeof n.type !== 'string' && n.props.type === type && typeof n.props.size === 'number',
  );
}

describe('S12 ports render', () => {
  test('[S12-3] EndpointPortShape draws aperture, arc and core in order with the specified paints', () => {
    for (const kind of ['outlet', 'socket'] as const) {
      for (const side of SIDES) {
        const c = 42;
        const color = kind === 'outlet' ? AMBER : GREEN;
        const r = render(<EndpointPortShape cellSize={c} side={side} kind={kind} color={color} />);
        const g = endpointPortGeometry(c, side, kind);
        const paths = hostsOfType(r.root, 'Path');
        expect(paths).toHaveLength(3);
        const [aperture, arc, core] = paths.map((p: { props: Record<string, unknown> }) => p.props);

        expect(aperture.d).toBe(g.aperturePath);
        expect(aperture.fill).toBe(PIECE_CORE);
        expect(aperture.stroke).toBe(color);
        expect(aperture.strokeWidth).toBe(g.apertureStrokeWidth);

        expect(arc.d).toBe(g.arcPath);
        expect(arc.fill).toBe('none');
        expect(arc.stroke).toBe(color);
        expect(arc.strokeOpacity).toBe(0.6);
        expect(arc.strokeWidth).toBe(g.arcStrokeWidth);

        expect(core.d).toBe(g.corePath);
        if (kind === 'outlet') {
          expect(core.fill).toBe(color);
          expect(core.stroke).toBeUndefined();
        } else {
          expect(core.fill).toBe(PIECE_CORE);
          expect(core.stroke).toBe(color);
          expect(core.strokeWidth).toBe(g.coreStrokeWidth);
        }
        // Nothing else is drawn: no bar, no channel, no notch.
        expect(hostsOfType(r.root, 'Rect')).toEqual([]);
      }
    }
  });

  test('[S12-4] each side host scales uniformly about the port centre', () => {
    const timingSpy = jest.spyOn(Animated, 'timing');
    for (const c of [42, 40, 26]) {
      const r = render(
        <EndpointSockets pieceId="p" cellSize={c} kind="socket" connectedSides={['left']} fill={GREEN} />,
      );
      for (const side of SIDES) {
        const hosts = byTestId(r.root, 'AnimatedView', `endpoint-socket-p-${side}`);
        expect(hosts).toHaveLength(1);
        const style = hosts[0].props.style;
        expect(style.position).toBe('absolute');
        expect(style.width).toBe(c);
        expect(style.height).toBe(c);
        expect(style.opacity).toBeInstanceOf(Animated.Value);

        const g = endpointPortGeometry(c, side, 'socket');
        const dx = g.cx - c / 2;
        const dy = g.cy - c / 2;
        expect(style.transform).toHaveLength(5);
        expect(style.transform[0]).toEqual({ translateX: dx });
        expect(style.transform[1]).toEqual({ translateY: dy });
        expect(style.transform[2].scale).toBe(style.opacity); // one value drives both
        expect(style.transform[3]).toEqual({ translateY: -dy });
        expect(style.transform[4]).toEqual({ translateX: -dx });

        // The port centre is the fixed point at every scale; fully extended
        // the transform is the identity.
        for (const s of [0, 0.5, 1]) {
          const probe = style.transform.map((t: Record<string, unknown>) => ('scale' in t ? { scale: s } : t));
          const [x, y] = applyRNTransform(probe, [g.cx, g.cy], c / 2);
          expect(x).toBeCloseTo(g.cx, 6);
          expect(y).toBeCloseTo(g.cy, 6);
        }
        const full = style.transform.map((t: Record<string, unknown>) => ('scale' in t ? { scale: 1 } : t));
        const [fx, fy] = applyRNTransform(full, [c * 0.9, c * 0.1], c / 2);
        expect(fx).toBeCloseTo(c * 0.9, 6);
        expect(fy).toBeCloseTo(c * 0.1, 6);

        // Inside: one full-cell static Svg holding the port shape.
        const svgs = hostsOfType(hosts[0], 'Svg');
        expect(svgs).toHaveLength(1);
        expect(svgs[0].props.width).toBe(c);
        expect(svgs[0].props.height).toBe(c);
        expect(hostsOfType(hosts[0], 'Path').map((p: { props: { d: string } }) => p.props.d)).toEqual([
          g.aperturePath,
          g.arcPath,
          g.corePath,
        ]);
      }
    }

    // Extend 150 ms ease-out cubic, retract 100 ms, JS driver.
    const r = render(<EndpointSockets pieceId="q" cellSize={42} kind="outlet" connectedSides={[]} fill={AMBER} />);
    timingSpy.mockClear();
    TestRenderer.act(() => {
      r.update(<EndpointSockets pieceId="q" cellSize={42} kind="outlet" connectedSides={['right']} fill={AMBER} />);
    });
    TestRenderer.act(() => {
      r.update(<EndpointSockets pieceId="q" cellSize={42} kind="outlet" connectedSides={[]} fill={AMBER} />);
    });
    const configs = timingSpy.mock.calls.map(call => call[1] as { toValue: number; duration: number; useNativeDriver: boolean });
    expect(configs.map(cfg => [cfg.toValue, cfg.duration, cfg.useNativeDriver])).toEqual([
      [1, 150, false],
      [0, 100, false],
    ]);
    timingSpy.mockRestore();
  });

  test('[S12-5] TerminalEntryMarker draws one static socket port', () => {
    const timingSpy = jest.spyOn(Animated, 'timing');
    timingSpy.mockClear();
    for (const side of SIDES) {
      const c = 32;
      const r = render(<TerminalEntryMarker entrySide={side} cellSize={c} fill={GREEN} />);
      const groups = byTestId(r.root, 'G', `terminal-entry-${side}`);
      expect(groups).toHaveLength(1);
      const g = endpointPortGeometry(c, side, 'socket');
      const paths = hostsOfType(groups[0], 'Path');
      expect(paths.map((p: { props: { d: string } }) => p.props.d)).toEqual([g.aperturePath, g.arcPath, g.corePath]);
      expect(paths[2].props.fill).toBe(PIECE_CORE);
      expect(paths[2].props.stroke).toBe(GREEN);
      expect(hostsOfType(r.root, 'AnimatedView')).toEqual([]);
    }
    expect(timingSpy).not.toHaveBeenCalled();
    timingSpy.mockRestore();
  });

  test('[S12-6] PieceIcon draws a port per portSides entry for source and terminal only', () => {
    const cases = [
      { type: 'source', kind: 'outlet' as const, color: AMBER },
      { type: 'terminal', kind: 'socket' as const, color: GREEN },
    ];
    for (const { type, kind, color } of cases) {
      const r = render(<PieceIcon type={type} size={40} color={color} portSides={['right', 'top']} />);
      for (const side of ['right', 'top'] as PortSide[]) {
        const groups = byTestId(r.root, 'G', `endpoint-socket-${type}-${side}`);
        expect(groups).toHaveLength(1);
        const g = endpointPortGeometry(40, side, kind);
        const paths = hostsOfType(groups[0], 'Path');
        expect(paths.map((p: { props: { d: string } }) => p.props.d)).toEqual([g.aperturePath, g.arcPath, g.corePath]);
        expect(paths[0].props.stroke).toBe(color);
        expect(paths[2].props.fill).toBe(kind === 'outlet' ? color : PIECE_CORE);
      }
      for (const side of ['bottom', 'left'] as PortSide[]) {
        expect(byTestId(r.root, 'G', `endpoint-socket-${type}-${side}`)).toEqual([]);
      }
    }

    // The icon's resolved stroke colour when no color prop is given.
    const plain = render(<PieceIcon type="terminal" size={40} portSides={['left']} />);
    const plainPaths = hostsOfType(byTestId(plain.root, 'G', 'endpoint-socket-terminal-left')[0], 'Path');
    expect(plainPaths[0].props.stroke).toBe(GREEN);

    // Ignored for every other piece.
    for (const type of ['conveyor', 'gear', 'splitter', 'configNode']) {
      const r = render(<PieceIcon type={type} size={40} portSides={['left', 'right']} />);
      const ports = r.root.findAll(
        (n: { type: unknown; props: { testID?: string } }) =>
          n.type === 'G' && typeof n.props.testID === 'string' && n.props.testID.startsWith('endpoint-socket-'),
      );
      expect(ports).toEqual([]);
    }
  });

  test('[S12-6] PieceIcon without portSides is unchanged', () => {
    for (const type of ['source', 'terminal']) {
      const without = render(<PieceIcon type={type} size={40} />);
      const empty = render(<PieceIcon type={type} size={40} portSides={[]} />);
      expect(empty.toJSON()).toEqual(without.toJSON());
      expect(JSON.stringify(without.toJSON())).not.toContain('endpoint-socket-');
      const withPorts = render(<PieceIcon type={type} size={40} portSides={['left']} />);
      expect(withPorts.toJSON()).not.toEqual(without.toJSON());
    }
  });

  test('[S12-7] the Codex hero icon and chips pass portSides for source and terminal', () => {
    const source = getCodexEntry('source');
    const terminal = getCodexEntry('terminal');
    const conveyor = getCodexEntry('conveyor');
    expect(source && terminal && conveyor).toBeTruthy();

    const heroCases: [NonNullable<typeof source>, PortSide[] | undefined][] = [
      [source!, ['right']],
      [terminal!, ['left']],
      [conveyor!, undefined],
    ];
    for (const [entry, expected] of heroCases) {
      const r = render(<CodexDetailView entry={entry} onUnderstood={() => {}} />);
      // The hero icon is the size-32 PieceIcon.
      const hero = pieceIconsOfType(r.root, entry.id).filter((n: { props: { size: number } }) => n.props.size === 32);
      expect(hero.length).toBeGreaterThan(0);
      for (const n of hero) expect(n.props.portSides).toEqual(expected);
      if (expected) {
        expect(byTestId(r.root, 'G', `endpoint-socket-${entry.id}-${expected[0]}`).length).toBeGreaterThan(0);
      }
    }

    // ALSO CATALOGUED chips (size 16), as on A1-1.
    const r = render(
      <CodexDetailView entry={conveyor!} onUnderstood={() => {}} alsoCollected={[source!, terminal!]} />,
    );
    const chipSource = pieceIconsOfType(r.root, 'source').filter((n: { props: { size: number } }) => n.props.size === 16);
    const chipTerminal = pieceIconsOfType(r.root, 'terminal').filter((n: { props: { size: number } }) => n.props.size === 16);
    expect(chipSource.length).toBeGreaterThan(0);
    expect(chipTerminal.length).toBeGreaterThan(0);
    for (const n of chipSource) expect(n.props.portSides).toEqual(['right']);
    for (const n of chipTerminal) expect(n.props.portSides).toEqual(['left']);
  });

  test('[S12-7] every Field Simulation Source and Terminal passes portSides toward its path', () => {
    // pieceType -> the sides each Source and Terminal in that sim must show,
    // read off the sim's own grid (Source toward its first path cell,
    // Terminal toward the cell its path arrives from).
    const expected: Record<string, { source: PortSide[][]; terminal: PortSide[][] }> = {
      conveyor: { source: [['right']], terminal: [['left']] },
      gear: { source: [['right']], terminal: [['top']] },
      terminal: { source: [['right']], terminal: [['left']] },
      splitter: { source: [['right']], terminal: [['left'], ['top']] },
      merger: { source: [['right'], ['right']], terminal: [['left']] },
      bridge: { source: [['right'], ['bottom']], terminal: [['left'], ['top']] },
      configNode: { source: [['right']], terminal: [['left']] },
      scanner: { source: [['right']], terminal: [['left']] },
      transmitter: { source: [['right']], terminal: [['left']] },
      inverter: { source: [['right']], terminal: [['left']] },
      latch: { source: [['right']], terminal: [['left']] },
      counter: { source: [['right']], terminal: [['left']] },
    };
    for (const [pieceType, want] of Object.entries(expected)) {
      const r = render(<PieceSimulation pieceType={pieceType} />);
      for (const type of ['source', 'terminal'] as const) {
        // One PieceIcon per sim piece: a memo component's test instance
        // carries the wrapped function as its type.
        const inner = (PieceIcon as unknown as { type: unknown }).type;
        const icons = r.root.findAll(
          (n: { type: unknown; props: { type?: string } }) => n.type === inner && n.props.type === type,
        );
        const got = icons.map((n: { props: { portSides?: PortSide[] } }) => n.props.portSides);
        expect({ pieceType, type, got }).toEqual({ pieceType, type, got: want[type] });
      }
      TestRenderer.act(() => r.unmount());
    }
  });

  test('[S12-8] an unconnected side host is at opacity 0 and scale 0', () => {
    const r = render(
      <EndpointSockets pieceId="u" cellSize={42} kind="outlet" connectedSides={['right']} fill={AMBER} />,
    );
    for (const side of SIDES) {
      const style = byTestId(r.root, 'AnimatedView', `endpoint-socket-u-${side}`)[0].props.style;
      const scaleEntry = style.transform.find((t: object) => 'scale' in t) as { scale: unknown };
      const want = side === 'right' ? 1 : 0;
      expect(num(style.opacity)).toBe(want);
      expect(num(scaleEntry.scale)).toBe(want);
    }
  });
});
