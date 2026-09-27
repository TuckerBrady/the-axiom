// AXM-036 P12 — [P12-4] the animated connection-socket layer, [P12-5] the
// static directional-Terminal entry marker, [P12-6] BoardGrid wiring, and
// [P12-7] socket host stability across beam phases.
//
// PieceIcon and Svg elements are inspected through test-renderer instances.
// react-native-svg's real package renders `null` under this repo's jest
// harness (no native view registry) and does not create child test
// instances for its descendants either, so this file mocks it to plain
// pass-through elements, same as axm036P4aBeamOverlay.test.tsx.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';

// Same pattern as axm036P4aBeamOverlay.test.tsx: react-native-svg's real
// package renders `null` under this repo's jest harness (no native view
// registry), which also stops it from creating child test instances at
// all when it wraps a real <Svg>. Mocked to plain pass-through elements so
// `renderer.root.findAllByProps` can see the socket/marker hosts.
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

import { EndpointSockets, TerminalEntryMarker } from '../../src/components/gameplay/EndpointSockets';
import BoardPiece from '../../src/components/gameplay/BoardPiece';
import BoardGrid from '../../src/components/gameplay/BoardGrid';
import type { PlacedPiece } from '../../src/game/types';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

// The mock above wraps every element in a composite function AND a host
// element sharing the same props, so `findAllByProps` matches both. Query
// the host ('G') layer directly, as axm036P4aBeamOverlay.test.tsx does for
// 'Polyline'/'Circle'.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findGByTestId(root: any, testID: string): any[] {
  return root.findAllByType('G').filter((n: any) => n.props.testID === testID);
}

function makeSource(overrides: Partial<PlacedPiece> = {}): PlacedPiece {
  return {
    id: 'src-1',
    type: 'source',
    category: 'physics',
    gridX: 0,
    gridY: 0,
    ports: [],
    rotation: 0,
    ...overrides,
  };
}

function makeTerminal(overrides: Partial<PlacedPiece> = {}): PlacedPiece {
  return {
    id: 'term-1',
    type: 'terminal',
    category: 'physics',
    gridX: 1,
    gridY: 1,
    ports: [],
    rotation: 0,
    ...overrides,
  };
}

describe('[P12-4] EndpointSockets — four always-mounted hosts', () => {
  it('mounts four endpoint-socket hosts, connected or not', () => {
    let r: any;
    TestRenderer.act(() => {
      r = TestRenderer.create(
        <EndpointSockets pieceId="p1" cellSize={42} kind="socket" connectedSides={[]} fill="#00C48C" />,
      );
    });
    for (const side of SIDES) {
      expect(findGByTestId(r.root, `endpoint-socket-p1-${side}`)).toHaveLength(1);
    }

    TestRenderer.act(() => {
      r = TestRenderer.create(
        <EndpointSockets pieceId="p2" cellSize={42} kind="outlet" connectedSides={['top', 'right']} fill="#F0B429" />,
      );
    });
    for (const side of SIDES) {
      expect(findGByTestId(r.root, `endpoint-socket-p2-${side}`)).toHaveLength(1);
    }
  });

  it('connecting a side runs a 150ms JS-driver timing to 1; disconnecting runs 100ms to 0', () => {
    let r: any;
    TestRenderer.act(() => {
      r = TestRenderer.create(
        <EndpointSockets pieceId="p3" cellSize={42} kind="socket" connectedSides={[]} fill="#00C48C" />,
      );
    });

    const timingSpy = jest.spyOn(Animated, 'timing');
    timingSpy.mockClear();

    TestRenderer.act(() => {
      r.update(<EndpointSockets pieceId="p3" cellSize={42} kind="socket" connectedSides={['top']} fill="#00C48C" />);
    });

    expect(timingSpy).toHaveBeenCalledTimes(1);
    const connectCall = timingSpy.mock.calls[0][1] as { toValue: number; duration: number; useNativeDriver: boolean };
    expect(connectCall.toValue).toBe(1);
    expect(connectCall.duration).toBe(150);
    expect(connectCall.useNativeDriver).toBe(false);

    timingSpy.mockClear();

    TestRenderer.act(() => {
      r.update(<EndpointSockets pieceId="p3" cellSize={42} kind="socket" connectedSides={[]} fill="#00C48C" />);
    });

    expect(timingSpy).toHaveBeenCalledTimes(1);
    const disconnectCall = timingSpy.mock.calls[0][1] as { toValue: number; duration: number; useNativeDriver: boolean };
    expect(disconnectCall.toValue).toBe(0);
    expect(disconnectCall.duration).toBe(100);
    expect(disconnectCall.useNativeDriver).toBe(false);

    timingSpy.mockRestore();
  });

  it('a side connected at mount starts extended with no timing', () => {
    const timingSpy = jest.spyOn(Animated, 'timing');
    timingSpy.mockClear();

    let r: any;
    TestRenderer.act(() => {
      r = TestRenderer.create(
        <EndpointSockets pieceId="p4" cellSize={42} kind="socket" connectedSides={['left']} fill="#00C48C" />,
      );
    });

    expect(timingSpy).not.toHaveBeenCalled();
    const host = findGByTestId(r.root, 'endpoint-socket-p4-left')[0];
    expect(host.props.opacity.__getValue()).toBe(1);

    timingSpy.mockRestore();
  });

  it('the same four Animated.Values persist across re-renders (no host is re-created)', () => {
    let r: any;
    TestRenderer.act(() => {
      r = TestRenderer.create(
        <EndpointSockets pieceId="p5" cellSize={42} kind="socket" connectedSides={['top']} fill="#00C48C" />,
      );
    });
    const before = SIDES.map(side => findGByTestId(r.root, `endpoint-socket-p5-${side}`)[0].props.opacity);

    // Force a re-render with new (but content-equal) props.
    TestRenderer.act(() => {
      r.update(<EndpointSockets pieceId="p5" cellSize={42} kind="socket" connectedSides={['top']} fill="#00C48C" />);
    });
    const after = SIDES.map(side => findGByTestId(r.root, `endpoint-socket-p5-${side}`)[0].props.opacity);

    for (let i = 0; i < SIDES.length; i++) {
      expect(after[i]).toBe(before[i]); // same Animated.Value instance, not merely equal value
    }
  });
});

describe('[P12-5] TerminalEntryMarker — static, no animation', () => {
  it.each(SIDES)('renders terminal-entry-%s and no endpoint-socket host', side => {
    let r: any;
    TestRenderer.act(() => {
      r = TestRenderer.create(<TerminalEntryMarker entrySide={side} cellSize={32} fill="#00C48C" />);
    });
    expect(findGByTestId(r.root, `terminal-entry-${side}`)).toHaveLength(1);
    const socketHosts = r.root
      .findAllByType('G')
      .filter((n: { props: { testID?: string } }) => typeof n.props.testID === 'string' && n.props.testID.startsWith('endpoint-socket-'));
    expect(socketHosts).toEqual([]);
  });

  it('creates no socket Animated.Value and runs no timing across re-renders', () => {
    const timingSpy = jest.spyOn(Animated, 'timing');
    timingSpy.mockClear();
    let r: any;
    TestRenderer.act(() => {
      r = TestRenderer.create(<TerminalEntryMarker entrySide="top" cellSize={32} fill="#00C48C" />);
    });
    TestRenderer.act(() => {
      r.update(<TerminalEntryMarker entrySide="top" cellSize={26} fill="#00C48C" />);
    });
    TestRenderer.act(() => {
      r.update(<TerminalEntryMarker entrySide="top" cellSize={42} fill="#00C48C" />);
    });
    expect(timingSpy).not.toHaveBeenCalled();
    timingSpy.mockRestore();
  });
});

describe('[P12-4] BoardPiece — Source mounts the socket layer', () => {
  it('renders four endpoint-socket hosts for a Source with an outlet entry', () => {
    const piece = makeSource();
    let r: any;
    TestRenderer.act(() => {
      r = TestRenderer.create(
        <BoardPiece
          piece={piece}
          animProps={undefined}
          isLocked={false}
          cellSize={42}
          iconColor="#F0B429"
          onTap={() => {}}
          onLongPress={() => {}}
          endpoint={{ kind: 'outlet', sides: ['right'] }}
        />,
      );
    });
    for (const side of SIDES) {
      expect(findGByTestId(r.root, `endpoint-socket-${piece.id}-${side}`)).toHaveLength(1);
    }
  });

  it('[P12-5] renders the static marker and no socket host for a directional Terminal', () => {
    const piece = makeTerminal({ entrySide: 'top' });
    let r: any;
    TestRenderer.act(() => {
      r = TestRenderer.create(
        <BoardPiece
          piece={piece}
          animProps={undefined}
          isLocked={false}
          cellSize={42}
          iconColor="#00C48C"
          onTap={() => {}}
          onLongPress={() => {}}
          endpoint={{ kind: 'entry', sides: ['top'] }}
        />,
      );
    });
    expect(findGByTestId(r.root, 'terminal-entry-top')).toHaveLength(1);
    for (const side of SIDES) {
      expect(findGByTestId(r.root, `endpoint-socket-${piece.id}-${side}`)).toEqual([]);
    }
  });

  it('[P12-7] socket host props are unchanged across charge, beam and lock animProps', () => {
    const piece = makeSource();
    const endpoint = { kind: 'outlet' as const, sides: ['right'] as ('top' | 'right' | 'bottom' | 'left')[] };
    let r: any;
    TestRenderer.act(() => {
      r = TestRenderer.create(
        <BoardPiece
          piece={piece}
          animProps={{ animType: undefined, gateResult: null, failColor: null, flashColor: null, flashCounter: 0 }}
          isLocked={false}
          cellSize={42}
          iconColor="#F0B429"
          onTap={() => {}}
          onLongPress={() => {}}
          endpoint={endpoint}
        />,
      );
    });
    const before = findGByTestId(r.root, `endpoint-socket-${piece.id}-right`)[0].props.opacity;

    for (const animType of ['charging', 'spinning', 'locking'] as const) {
      TestRenderer.act(() => {
        r.update(
          <BoardPiece
            piece={piece}
            animProps={{ animType, gateResult: null, failColor: null, flashColor: null, flashCounter: 0 }}
            isLocked={false}
            cellSize={42}
            iconColor="#F0B429"
            onTap={() => {}}
            onLongPress={() => {}}
            endpoint={endpoint}
          />,
        );
      });
      const after = findGByTestId(r.root, `endpoint-socket-${piece.id}-right`)[0].props.opacity;
      expect(after).toBe(before);
    }
  });
});

describe('[P12-6] BoardGrid passes each endpoint its getEndpointSocketSides entry', () => {
  it('a Source and Terminal chained by a conveyor get sockets on the right board sides', () => {
    const source = makeSource({ id: 's', gridX: 0, gridY: 0 });
    const conveyor: PlacedPiece = {
      id: 'c',
      type: 'conveyor',
      category: 'physics',
      gridX: 1,
      gridY: 0,
      ports: [],
      rotation: 0,
    };
    const terminal = makeTerminal({ id: 't', gridX: 2, gridY: 0 });
    let r: any;
    TestRenderer.act(() => {
      r = TestRenderer.create(
        <BoardGrid
          pieces={[source, conveyor, terminal]}
          pieceAnimProps={new Map()}
          lockedSet={new Set()}
          cellSize={42}
          onPieceTap={() => {}}
          onPieceLongPress={() => {}}
        />,
      );
    });
    expect(findGByTestId(r.root, 'endpoint-socket-s-right')).toHaveLength(1);
    expect(findGByTestId(r.root, 'endpoint-socket-t-left')).toHaveLength(1);
  });
});
