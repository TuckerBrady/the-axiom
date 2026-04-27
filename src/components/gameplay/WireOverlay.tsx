import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import type { Wire, PlacedPiece } from '../../game/types';
import { Colors } from '../../theme/tokens';
import { getBeamColor } from '../../game/engagement';

interface WireSegmentProps {
  wireId: string;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  isProtocol: boolean;
  isLit: boolean;
  isLocked: boolean;
  toType: string;
  cellSize: number;
}

// Per-segment memo barrier (clause 4.3.2). When a new wire lights up,
// already-lit segments do not re-render because their own props
// (isLit, isLocked) did not change.
const WireSegment = React.memo(function WireSegment({
  fx,
  fy,
  tx,
  ty,
  isProtocol,
  isLit,
  isLocked,
  toType,
  cellSize,
}: WireSegmentProps) {
  const wireColor = isProtocol ? Colors.amber : Colors.blue;
  const wireSW = Math.max(2, cellSize / 18);
  const dashOn = Math.round(cellSize / 5);
  const dashOff = Math.round(cellSize / 8);
  const strokeC = isLocked ? '#00C48C' : isLit ? getBeamColor(toType) : wireColor;
  const strokeOp = isLocked ? 0.45 : isLit ? 0.85 : 0.5;
  const sw = isLit || isLocked ? wireSW * 1.6 : wireSW;
  return (
    <Line
      x1={fx} y1={fy} x2={tx} y2={ty}
      stroke={strokeC}
      strokeWidth={sw}
      strokeDasharray={isLit || isLocked ? undefined : `${dashOn},${dashOff}`}
      strokeOpacity={strokeOp}
      strokeLinecap="round"
    />
  );
});

interface Props {
  wires: Wire[];
  litWires: Set<string>;
  pieceById: Map<string, PlacedPiece>;
  cellSize: number;
  gridW: number;
  gridH: number;
  isLocked: boolean;
}

// Dashed wire connections rendered between piece centers. The Set
// identity (`litWires`) drives this overlay's re-renders; individual
// segments short-circuit on unchanged `isLit` / `isLocked` flags
// (clause 4.3.1, 4.3.2).
function WireOverlayComponent({
  wires,
  litWires,
  pieceById,
  cellSize,
  gridW,
  gridH,
  isLocked,
}: Props) {
  return (
    <Svg
      width={gridW}
      height={gridH}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {wires.map(wire => {
        const fromPiece = pieceById.get(wire.fromPieceId);
        const toPiece = pieceById.get(wire.toPieceId);
        if (!fromPiece || !toPiece) return null;
        const fx = fromPiece.gridX * cellSize + cellSize / 2;
        const fy = fromPiece.gridY * cellSize + cellSize / 2;
        const tx = toPiece.gridX * cellSize + cellSize / 2;
        const ty = toPiece.gridY * cellSize + cellSize / 2;
        const isProtocol =
          fromPiece.category === 'protocol' || toPiece.category === 'protocol';
        const wireKey = `${wire.fromPieceId}_${wire.toPieceId}`;
        const isLit = litWires.has(wireKey);
        return (
          <WireSegment
            key={wire.id}
            wireId={wire.id}
            fx={fx}
            fy={fy}
            tx={tx}
            ty={ty}
            isProtocol={isProtocol}
            isLit={isLit}
            isLocked={isLocked}
            toType={toPiece.type}
            cellSize={cellSize}
          />
        );
      })}
    </Svg>
  );
}

export default React.memo(WireOverlayComponent);
