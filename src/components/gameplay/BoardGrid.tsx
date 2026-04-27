import React from 'react';
import { View } from 'react-native';
import BoardPiece, { type PieceAnimProps } from './BoardPiece';
import type { PlacedPiece, PieceType } from '../../game/types';
import { Colors } from '../../theme/tokens';

function getPieceColor(type: PieceType): string {
  switch (type) {
    case 'configNode':
    case 'scanner':
    case 'transmitter':
    case 'inverter':
    case 'counter':
    case 'latch':
      return '#8B5CF6';
    default:
      return Colors.blue;
  }
}

interface Props {
  pieces: PlacedPiece[];
  pieceAnimProps: Map<string, PieceAnimProps>;
  lockedSet: Set<string>;
  cellSize: number;
  sourceNodeRef?: React.Ref<View>;
  outputNodeRef?: React.Ref<View>;
  boardScannerRef?: React.Ref<View>;
  onPieceTap: (id: string) => void;
  onPieceLongPress: (id: string) => void;
}

// Re-renders when any of the prop maps / sets change identity (which
// happens on pieceAnimState transitions). The per-piece BoardPiece
// children then short-circuit on their own animProps slice
// (clause 4.2.2). The onPieceTap / onPieceLongPress callbacks must
// be useCallback-stabilized in the parent so per-piece BoardPiece
// memo barriers hold.
function BoardGridComponent({
  pieces,
  pieceAnimProps,
  lockedSet,
  cellSize,
  sourceNodeRef,
  outputNodeRef,
  boardScannerRef,
  onPieceTap,
  onPieceLongPress,
}: Props) {
  return (
    <>
      {pieces.map(piece => {
        const isPrePlaced = piece.isPrePlaced;
        const isSource = piece.type === 'source';
        const isOutput = piece.type === 'terminal';
        const isPrePlacedScanner = isPrePlaced && piece.type === 'scanner';
        const iconColor = isSource
          ? '#F0B429'
          : isOutput
            ? '#00C48C'
            : getPieceColor(piece.type);
        const ref = isSource
          ? sourceNodeRef
          : isOutput
            ? outputNodeRef
            : isPrePlacedScanner
              ? boardScannerRef
              : undefined;
        return (
          <BoardPiece
            key={piece.id}
            piece={piece}
            animProps={pieceAnimProps.get(piece.id)}
            isLocked={lockedSet.has(piece.id)}
            cellSize={cellSize}
            iconColor={iconColor}
            pieceRef={ref}
            onTap={onPieceTap}
            onLongPress={onPieceLongPress}
          />
        );
      })}
    </>
  );
}

export default React.memo(BoardGridComponent);
