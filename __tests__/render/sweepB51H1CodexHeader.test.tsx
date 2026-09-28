// SWEEP-B51 H1 (AXM-040 + AXM-044): the Codex header port on both Codex
// surfaces, through one mapping (contract v1.3 R-H1.2, clause H1-5).
//
// react-native-svg is mocked to pass-through elements, the same pattern as
// sweepB51S12Ports.test.tsx: the real package renders null under this repo's
// jest harness.

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

import { endpointPortGeometry, PIECE_CORE } from '../../src/components/gameplay/endpointSocketGeometry';
import { PieceIcon } from '../../src/components/PieceIcon';
import { CODEX_PIECES, codexPortSides } from '../../src/components/CodexDetailView';
import type { PortSide } from '../../src/game/types';

const SIDES: PortSide[] = ['top', 'right', 'bottom', 'left'];

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
function portGroups(root: any, type: string, side: PortSide): any[] {
  return root.findAll(
    (n: { type: unknown; props: { testID?: string } }) =>
      n.type === 'G' && n.props.testID === `endpoint-socket-${type}-${side}`,
  );
}

describe('SWEEP-B51 H1 Codex header port', () => {
  it('[H1-5] codexPortSides maps source to right, terminal to left and every other piece to none', () => {
    expect(codexPortSides('source')).toEqual(['right']);
    expect(codexPortSides('terminal')).toEqual(['left']);
    const others = CODEX_PIECES.map(p => p.id).filter(id => id !== 'source' && id !== 'terminal');
    expect(others.length).toBeGreaterThan(0);
    for (const id of [...others, 'inputTape', 'outputTape', 'dataTrail', '', 'unknown']) {
      expect(codexPortSides(id)).toBeUndefined();
    }
  });

  it('[H1-5] a size-32 PieceIcon given codexPortSides draws the shared port for source and terminal', () => {
    const cases = [
      { type: 'source', side: 'right' as PortSide, kind: 'outlet' as const, color: '#F0B429' },
      { type: 'terminal', side: 'left' as PortSide, kind: 'socket' as const, color: '#00C48C' },
    ];
    for (const { type, side, kind, color } of cases) {
      const r = render(<PieceIcon type={type} size={32} color={color} portSides={codexPortSides(type)} />);
      const groups = portGroups(r.root, type, side);
      expect(groups).toHaveLength(1);
      // The port is drawn in the icon's 40-unit viewBox, which the Svg scales to 32.
      const svg = r.root.findAll((n: { type: unknown }) => n.type === 'Svg')[0];
      expect(svg.props.width).toBe(32);
      expect(svg.props.viewBox).toBe('0 0 40 40');
      const g = endpointPortGeometry(40, side, kind);
      const paths = groups[0].findAll((n: { type: unknown }) => n.type === 'Path');
      expect(paths.map((p: { props: { d: string } }) => p.props.d)).toEqual([g.aperturePath, g.arcPath, g.corePath]);
      expect(paths[0].props.stroke).toBe(color);
      // Source: filled core. Terminal: hollow core.
      expect(paths[2].props.fill).toBe(kind === 'outlet' ? color : PIECE_CORE);
      for (const other of SIDES.filter(s => s !== side)) {
        expect(portGroups(r.root, type, other)).toEqual([]);
      }
    }
    // Any other piece: no port at all.
    const plain = render(<PieceIcon type="conveyor" size={32} portSides={codexPortSides('conveyor')} />);
    expect(JSON.stringify(plain.toJSON())).not.toContain('endpoint-socket-');
  });
});
