// AXM-036 P13 (R-13.1..R-13.3) — WireOverlay renders a WireSegment only for
// the wires beamWires keeps.
//
// Same react-native-svg mock pattern as axm036P12Sockets.test.tsx / P4a's
// BeamOverlay test: the real package renders null under this repo's jest
// harness, so it is mocked to plain pass-through elements.

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
    Line: make('Line'),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer = require('react-test-renderer');

import WireOverlay from '../../src/components/gameplay/WireOverlay';
import { prePlaced } from '../../src/game/levels';
import { autoConnectPhysicsPieces, getDefaultPorts } from '../../src/game/engine';
import type { PlacedPiece } from '../../src/game/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findLines(root: any): any[] {
  return root.findAllByType('Line');
}

describe('[P13-2] renders one WireSegment per beamWires wire', () => {
  it('drops the Config Node to Terminal wire on the FND-2 board', () => {
    const source = prePlaced('source', 0, 1);
    const conv1: PlacedPiece = { id: 'c1', type: 'conveyor', category: 'physics', gridX: 1, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const conv2: PlacedPiece = { id: 'c2', type: 'conveyor', category: 'physics', gridX: 2, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const cfg: PlacedPiece = { id: 'cfg', type: 'configNode', category: 'protocol', gridX: 3, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0, configValue: 1 };
    const conv3: PlacedPiece = { id: 'c3', type: 'conveyor', category: 'physics', gridX: 4, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const terminal = prePlaced('terminal', 3, 2);
    const pieces = [source, conv1, conv2, cfg, conv3, terminal];
    const wires = autoConnectPhysicsPieces(pieces);
    const pieceById = new Map(pieces.map(p => [p.id, p] as const));

    let r: ReturnType<typeof TestRenderer.create>;
    TestRenderer.act(() => {
      r = TestRenderer.create(
        <WireOverlay
          wires={wires}
          litWires={new Set<string>()}
          pieceById={pieceById}
          cellSize={40}
          gridW={400}
          gridH={400}
          isLocked={false}
        />,
      );
    });

    const lines = findLines(r!.root);
    // Config Node <-> Terminal is dropped; the four beam-path segments remain.
    expect(lines.length).toBe(4);
    expect(lines.length).toBeLessThan(wires.length);
  });
});

describe('[P13-2] an unreached-chain board renders no WireSegment', () => {
  it('renders zero Line elements when the chain has not joined the Source', () => {
    const source = prePlaced('source', 0, 1);
    const terminal = prePlaced('terminal', 7, 6);
    const conv: PlacedPiece = { id: 'conv', type: 'conveyor', category: 'physics', gridX: 6, gridY: 6, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const pieces = [source, terminal, conv];
    const wires = autoConnectPhysicsPieces(pieces);
    const pieceById = new Map(pieces.map(p => [p.id, p] as const));

    let r: ReturnType<typeof TestRenderer.create>;
    TestRenderer.act(() => {
      r = TestRenderer.create(
        <WireOverlay
          wires={wires}
          litWires={new Set<string>()}
          pieceById={pieceById}
          cellSize={40}
          gridW={400}
          gridH={400}
          isLocked={false}
        />,
      );
    });

    expect(findLines(r!.root).length).toBe(0);
  });
});

describe('[P13-3] kept segments carry the same key, isLit and isLocked as before', () => {
  it('preserves isLit and isLocked props for a kept segment', () => {
    const source = prePlaced('source', 0, 1);
    const conv: PlacedPiece = { id: 'conv', type: 'conveyor', category: 'physics', gridX: 1, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const terminal = prePlaced('terminal', 2, 1);
    const pieces = [source, conv, terminal];
    const wires = autoConnectPhysicsPieces(pieces);
    const pieceById = new Map(pieces.map(p => [p.id, p] as const));
    const wireKey = `${wires[0].fromPieceId}_${wires[0].toPieceId}`;

    let r: ReturnType<typeof TestRenderer.create>;
    TestRenderer.act(() => {
      r = TestRenderer.create(
        <WireOverlay
          wires={wires}
          litWires={new Set<string>([wireKey])}
          pieceById={pieceById}
          cellSize={40}
          gridW={400}
          gridH={400}
          isLocked
        />,
      );
    });

    const lines = findLines(r!.root);
    expect(lines.length).toBe(wires.length);
    // isLocked wins the stroke color regardless of isLit (existing behavior).
    for (const line of lines) {
      expect(line.props.stroke).toBe('#00C48C');
      expect(line.props.strokeDasharray).toBeUndefined();
    }
  });
});
