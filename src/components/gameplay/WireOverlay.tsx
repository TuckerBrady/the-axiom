import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import type { Wire, PlacedPiece } from '../../game/types';
import { Colors } from '../../theme/tokens';
import { getBeamColor } from '../../game/engagement';
import { beamWires } from '../../game/beamWires';

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
  // REQ-G-07: static wire identity follows Protocol/Physics, not the beam
  // colors. isLit (below) already defers to getBeamColor(toType) for the
  // beam-color contrast event; this is the unlit/static state only.
  const wireColor = isProtocol ? Colors.circuit : Colors.copper;
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
//
// AXM-036 P13 (R-13.1): only wires on the traced beam path are drawn. A
// Config Node/Scanner/Transmitter auto-connects to every side neighbor
// (autoConnectPhysicsPieces), whether or not the beam actually takes that
// side, and a chain not yet joined to the Source would otherwise show
// dashes it hasn't earned. `beamWires` (beamTrace.ts's shared trace, via
// the P13 filter module) is the single source of truth for which of those
// wires are honest; the wire OBJECTS kept are unchanged (same ids), so
// beam lighting (litWires) and lock styling below are untouched.
function WireOverlayComponent({
  wires: allWires,
  litWires,
  pieceById,
  cellSize,
  gridW,
  gridH,
  isLocked,
}: Props) {
  const wires = React.useMemo(
    () => beamWires(Array.from(pieceById.values()), allWires),
    [allWires, pieceById],
  );
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
