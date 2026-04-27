import React from 'react';
import { Pressable, View } from 'react-native';
import { PieceIcon } from '../PieceIcon';
import type { PlacedPiece } from '../../game/types';

const PIECE_RADIUS = 10;

export interface PieceAnimProps {
  animType: string | undefined;
  gateResult: 'pass' | 'block' | null;
  failColor: string | null;
}

interface Props {
  piece: PlacedPiece;
  animProps: PieceAnimProps | undefined;
  flashColor: string | undefined;
  isLocked: boolean;
  cellSize: number;
  iconColor: string;
  pieceRef?: React.Ref<View>;
  onTap: (pieceId: string) => void;
  onLongPress: (pieceId: string) => void;
}

function arePropsEqual(prev: Props, next: Props): boolean {
  if (prev.cellSize !== next.cellSize) return false;
  if (prev.flashColor !== next.flashColor) return false;
  if (prev.isLocked !== next.isLocked) return false;
  if (prev.iconColor !== next.iconColor) return false;
  if (prev.pieceRef !== next.pieceRef) return false;
  if (prev.onTap !== next.onTap) return false;
  if (prev.onLongPress !== next.onLongPress) return false;
  if (prev.piece !== next.piece) return false;
  const a = prev.animProps;
  const b = next.animProps;
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.animType === b.animType &&
    a.gateResult === b.gateResult &&
    a.failColor === b.failColor
  );
}

// Per-piece prop-isolation wrapper around PieceIcon. When
// pieceAnimState changes, the parent BoardGrid re-renders, but each
// BoardPiece short-circuits unless its own animProps slice changed —
// PERFORMANCE_CONTRACT 4.2.2.
const BoardPiece = React.memo(function BoardPiece({
  piece,
  animProps,
  flashColor,
  isLocked,
  cellSize,
  iconColor,
  pieceRef,
  onTap,
  onLongPress,
}: Props) {
  const isPrePlaced = piece.isPrePlaced;
  const pieceSize = cellSize - 4;
  const offset = (cellSize - pieceSize) / 2;
  const cellPx = piece.gridX * cellSize + offset;
  const cellPy = piece.gridY * cellSize + offset;
  const iconSize = (cellSize - 4) * 0.60;
  const borderColorP = flashColor ? flashColor
    : isLocked ? '#00C48C'
    : undefined;
  const borderWidthP = flashColor || isLocked ? 2 : 0;
  const shadowC = flashColor ?? (isLocked ? '#00C48C' : undefined);
  const animType = animProps?.animType;
  return (
    <Pressable
      ref={pieceRef}
      style={{
        position: 'absolute',
        borderRadius: PIECE_RADIUS,
        alignItems: 'center',
        justifyContent: 'center',
        left: cellPx,
        top: cellPy,
        width: pieceSize,
        height: pieceSize,
        borderWidth: borderWidthP,
        borderColor: borderColorP,
        backgroundColor: 'transparent',
        opacity: 1,
        transform: [{ scale: 1 }],
        zIndex: 0,
        shadowColor: shadowC,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: shadowC ? (flashColor ? 0.5 : 0.3) : 0,
        shadowRadius: flashColor ? 16 : isLocked ? 8 : 0,
      }}
      onPress={() => onTap(piece.id)}
      onLongPress={() => onLongPress(piece.id)}
      delayLongPress={500}
    >
      <View style={{ transform: [{ rotate: `${!isPrePlaced ? piece.rotation : 0}deg` }] }}>
        <PieceIcon
          type={piece.type}
          size={iconSize}
          color={iconColor}
          spinning={animType === 'spinning'}
          scanning={animType === 'scanning'}
          transmitting={animType === 'transmitting'}
          rolling={animType === 'rolling'}
          splitting={animType === 'splitting'}
          gating={animType === 'gating'}
          gateResult={animProps?.gateResult ?? null}
          locking={animType === 'locking'}
          charging={animType === 'charging'}
          failColor={animProps?.failColor ?? null}
          configValue={piece.type === 'configNode' ? piece.configValue : undefined}
          connectedMagnetSides={piece.type === 'splitter' ? piece.connectedMagnetSides : undefined}
        />
      </View>
    </Pressable>
  );
}, arePropsEqual);

export default BoardPiece;
