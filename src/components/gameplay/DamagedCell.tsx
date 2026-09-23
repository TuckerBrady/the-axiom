import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { G, Path, Rect, Line } from 'react-native-svg';
import { Colors } from '../../theme/tokens';
import { hexToRgba } from '../../game/bubbleMath';
import {
  damagedCellGeometry,
  EMBER_PULSE_MS,
  EMBER_MIN_OPACITY,
  EMBER_MAX_OPACITY,
} from './damagedCellGeometry';

// useNativeDriver: false is load-bearing. The ember's value interpolates into
// an SVG attribute (strokeOpacity), which the native driver does not support —
// the same Bucket B exemption PieceIcon.tsx documents. It is also why the
// single-host rule (docs/ANIMATION_RULES.md REQ-A-1..A-3) is satisfied
// structurally here: `emberOpacity` is consumed by exactly ONE AnimatedPath,
// that AnimatedPath is rendered unconditionally on every branch, and the
// `live` prop only changes the value it animates to. There is no ternary in
// this file that mounts or unmounts an animated host.
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  /** Board cell size in points. Everything scales from this. */
  size: number;
  /** Cell top-left in board space. */
  x: number;
  y: number;
  /**
   * True only for a cell blown during the CURRENT run. The plate is drawn the
   * same either way; a live burn adds an ember still crawling in the crack.
   * On the next run the cell settles to the plain missing plate.
   */
  live?: boolean;
}

/**
 * A damaged board cell — the "missing plate" treatment approved 2026-09-20.
 *
 * Terrain damage (a level's `damagedCells`) and a cell blown by a failed run
 * are the same hole in the deck; only the ember distinguishes the failure that
 * just happened. No text, no red, no dashed border: the cell reads as part of
 * the board, not as a validation error.
 *
 * This is NOT a piece. PieceIcon.tsx remains the single source of truth for
 * piece rendering; nothing here draws one.
 */
function DamagedCellComponent({ size, x, y, live = false }: Props) {
  const g = useMemo(() => damagedCellGeometry(size), [size]);
  const emberOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!live) {
      emberOpacity.setValue(0);
      return;
    }
    emberOpacity.setValue(EMBER_MIN_OPACITY);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(emberOpacity, {
          toValue: EMBER_MAX_OPACITY,
          duration: EMBER_PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(emberOpacity, {
          toValue: EMBER_MIN_OPACITY,
          duration: EMBER_PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
      emberOpacity.setValue(0);
    };
  }, [live, emberOpacity]);

  return (
    <G transform={`translate(${x}, ${y})`}>
      {/* Hairline fractures in the SURROUNDING deck. Drawn first so the
          plate edge sits on top of where they meet it. */}
      {g.fractures.map((f, i) => (
        <Line
          key={`fx-${i}`}
          x1={f.x1}
          y1={f.y1}
          x2={f.x2}
          y2={f.y2}
          stroke={hexToRgba(Colors.dim, 0.3)}
          strokeWidth={g.strokes.hairline}
          strokeLinecap="round"
        />
      ))}

      {/* The hole itself — deck plate gone, void underneath. */}
      <Rect
        x={g.hole.x}
        y={g.hole.y}
        width={g.hole.width}
        height={g.hole.height}
        rx={g.hole.rx}
        ry={g.hole.rx}
        fill={hexToRgba(Colors.void, 0.97)}
      />
      {/* Inset ring: the recess floor falling away from its own edge. */}
      <Rect
        x={g.recess.x}
        y={g.recess.y}
        width={g.recess.width}
        height={g.recess.height}
        rx={g.recess.rx}
        ry={g.recess.rx}
        fill="none"
        stroke="rgba(0,0,0,0.55)"
        strokeWidth={g.strokes.wall}
      />

      {/* Inner shadow, near wall (top/left) — this is what reads as BELOW the
          board plane. */}
      <Path
        d={g.wallShadow}
        fill="none"
        stroke="rgba(0,0,0,0.75)"
        strokeWidth={g.strokes.wall}
        strokeLinecap="round"
      />
      {/* Far wall (bottom/right), faintly lit. */}
      <Path
        d={g.wallLight}
        fill="none"
        stroke={hexToRgba(Colors.steel, 0.5)}
        strokeWidth={g.strokes.hairline}
        strokeLinecap="round"
      />
      {/* Cut edge of the deck that is still there, catching the light. */}
      <Path
        d={g.rimLight}
        fill="none"
        stroke={hexToRgba(Colors.steel, 0.75)}
        strokeWidth={g.strokes.rim}
        strokeLinecap="round"
      />

      {/* Bracket stubs at two opposite corners — where the plate was bolted. */}
      {g.brackets.map((d, i) => (
        <Path
          key={`br-${i}`}
          d={d}
          fill="none"
          stroke={hexToRgba(Colors.steel, 0.85)}
          strokeWidth={g.strokes.bracket}
          strokeLinecap="square"
        />
      ))}

      {/* Live burn. Persistent host (REQ-A-1/A-2): always rendered, never
          swapped across a conditional branch. When the cell is not a
          current-run burn its stroke opacity is simply held at 0. */}
      <AnimatedPath
        d={g.ember}
        fill="none"
        stroke={Colors.tapeOutBar}
        strokeWidth={g.strokes.ember}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={emberOpacity as unknown as number}
      />
    </G>
  );
}

function arePropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.size === next.size &&
    prev.x === next.x &&
    prev.y === next.y &&
    !!prev.live === !!next.live
  );
}

export default React.memo(DamagedCellComponent, arePropsEqual);
