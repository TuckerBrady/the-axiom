import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { PieceIcon } from '../PieceIcon';
import type { PlacedPiece } from '../../game/types';

const PIECE_RADIUS = 10;
// Half-duration of the native-driven flash. Two halves stitched into
// an Animated.sequence give the contract-required 180 ms total
// fade-in / fade-out (PERFORMANCE_CONTRACT 2.1.2).
const FLASH_HALF_MS = 90;

export interface PieceAnimProps {
  animType: string | undefined;
  gateResult: 'pass' | 'block' | null;
  failColor: string | null;
  // Native flash trigger pair (Prompt 99C, Fix 1 option b).
  // `flashColor` is the latest color requested by flashPiece;
  // `flashCounter` increments each time flashPiece fires for this
  // piece, which BoardPiece watches via useEffect to start the native
  // opacity sequence. The counter (not the color) is the trigger,
  // so successive flashes of the same color still fire.
  flashColor: string | null;
  flashCounter: number;
}

interface Props {
  piece: PlacedPiece;
  animProps: PieceAnimProps | undefined;
  isLocked: boolean;
  cellSize: number;
  iconColor: string;
  pieceRef?: React.Ref<View>;
  onTap: (pieceId: string) => void;
  onLongPress: (pieceId: string) => void;
}

function arePropsEqual(prev: Props, next: Props): boolean {
  if (prev.cellSize !== next.cellSize) return false;
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
    a.failColor === b.failColor &&
    a.flashColor === b.flashColor &&
    a.flashCounter === b.flashCounter
  );
}

// Per-piece prop-isolation wrapper around PieceIcon. When
// pieceAnimState changes, the parent BoardGrid re-renders, but each
// BoardPiece short-circuits unless its own animProps slice changed —
// PERFORMANCE_CONTRACT 4.2.2.
const BoardPiece = React.memo(function BoardPiece({
  piece,
  animProps,
  isLocked,
  cellSize,
  iconColor,
  pieceRef,
  onTap,
  onLongPress,
}: Props) {
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const lastCounterRef = useRef<number>(animProps?.flashCounter ?? 0);

  const flashCounter = animProps?.flashCounter ?? 0;
  const flashColor = animProps?.flashColor ?? null;

  // Run the opacity sequence each time flashCounter advances.
  //
  // useNativeDriver: false is required because flashOpacity's host
  // (Animated.View at the {flashColor ? (...) : null} below) is
  // conditionally mounted on flashColor truthiness. The per-pulse
  // sweep in GameplayScreen.handleEngage clears flashColor (via
  // setPieceAnimState({ flashing: new Map(), ... })) between pulses,
  // so the host genuinely remounts on every flash. A native-driven
  // animation on the same value across remounts hits the same
  // parent-swap NSException class as Build 21 (REQ-A-1 FORM B).
  // The JS-driver cost on a 180ms opacity sequence per flash is
  // trivial. See project-docs/REPORTS/build21-sigsegv-investigation.md.
  useEffect(() => {
    if (flashCounter === lastCounterRef.current) return;
    lastCounterRef.current = flashCounter;
    if (!flashColor) return;
    Animated.sequence([
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: FLASH_HALF_MS,
        useNativeDriver: false,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: FLASH_HALF_MS,
        useNativeDriver: false,
      }),
    ]).start();
  }, [flashCounter, flashColor, flashOpacity]);

  const isPrePlaced = piece.isPrePlaced;
  const pieceSize = cellSize - 4;
  const offset = (cellSize - pieceSize) / 2;
  const cellPx = piece.gridX * cellSize + offset;
  const cellPy = piece.gridY * cellSize + offset;
  const iconSize = (cellSize - 4) * 0.60;
  const animType = animProps?.animType;

  const lockedBorderWidth = isLocked ? 2 : 0;
  const lockedBorderColor = isLocked ? '#00C48C' : undefined;

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
        borderWidth: lockedBorderWidth,
        borderColor: lockedBorderColor,
        backgroundColor: 'transparent',
        opacity: 1,
        transform: [{ scale: 1 }],
        zIndex: 0,
        shadowColor: lockedBorderColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isLocked ? 0.3 : 0,
        shadowRadius: isLocked ? 8 : 0,
      }}
      onPress={() => onTap(piece.id)}
      onLongPress={() => onLongPress(piece.id)}
      delayLongPress={500}
    >
      {flashColor ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -lockedBorderWidth,
            left: -lockedBorderWidth,
            width: pieceSize,
            height: pieceSize,
            borderRadius: PIECE_RADIUS,
            borderWidth: 2,
            borderColor: flashColor,
            shadowColor: flashColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 16,
            opacity: flashOpacity,
          }}
        />
      ) : null}
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
