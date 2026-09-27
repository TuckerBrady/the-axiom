// AXM-036 P12 — one shared socket renderer (R-12.1), used by:
//   - the animated connection-socket layer (Source; Terminal without entrySide)
//   - the static directional-Terminal entry marker (Terminal with entrySide)
//
// useNativeDriver: false is load-bearing here, same as PieceIcon.tsx and
// DamagedCell.tsx: every animated value interpolates into an SVG prop
// (opacity) or a transform consumed only by a react-native-svg <G>, which the
// native driver does not reliably support in this tree. Each of the four
// side hosts in <EndpointSockets> is ALWAYS mounted (REQ-A-1/A-2) — there is
// no `{connected && <Animated...>}` anywhere in this file; only the value
// each host's Animated.Value is driven to changes.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { G, Path, Rect } from 'react-native-svg';
import type { PortSide } from '../../game/types';
import { Colors } from '../../theme/tokens';
import { endpointSocketGeometry } from './endpointSocketGeometry';

const AnimatedG = Animated.createAnimatedComponent(G);

const CONNECT_MS = 150;
const DISCONNECT_MS = 100;
const SOCKET_CHANNEL_FILL = '#060e1a'; // pieceCore (R-12.4) — PieceIcon.tsx's existing inner-disc fill.

const SIDES: PortSide[] = ['top', 'right', 'bottom', 'left'];

// The fixed (ring-side) anchor coordinate and the axis a side's socket
// extends along, derived from endpointSocketGeometry's own side mapping
// (see that file's header): the inner edge (`xi` in the left frame) maps to
// this anchor value on this axis for every side.
function socketAnchor(cellSize: number, side: PortSide): { axis: 'x' | 'y'; anchor: number } {
  const c = cellSize;
  const s = (0.6 * (c - 4)) / 40;
  const R = 16 * s;
  const xi = c / 2 - R + 2 * s;
  switch (side) {
    case 'left':
      return { axis: 'x', anchor: xi };
    case 'right':
      return { axis: 'x', anchor: c - xi };
    case 'top':
      return { axis: 'y', anchor: xi };
    case 'bottom':
      return { axis: 'y', anchor: c - xi };
  }
}

interface EndpointSocketShapeProps {
  cellSize: number;
  side: PortSide;
  kind: 'outlet' | 'socket';
  fill: string;
}

/**
 * The static shape — socket/outlet bar, channel recess, and (outlet only)
 * the notch. Used both as the content of each animated host below and as
 * the whole of the static directional-Terminal entry marker.
 */
export function EndpointSocketShape({ cellSize, side, kind, fill }: EndpointSocketShapeProps) {
  const geo = endpointSocketGeometry(cellSize, side, kind);
  return (
    <G>
      <Rect
        x={geo.socket.x}
        y={geo.socket.y}
        width={geo.socket.w}
        height={geo.socket.h}
        rx={geo.socket.r}
        fill={fill}
      />
      <Rect
        x={geo.channel.x}
        y={geo.channel.y}
        width={geo.channel.w}
        height={geo.channel.h}
        fill={SOCKET_CHANNEL_FILL}
      />
      {geo.notch && (
        <Path
          d={`M ${geo.notch[0][0]} ${geo.notch[0][1]} L ${geo.notch[1][0]} ${geo.notch[1][1]} L ${geo.notch[2][0]} ${geo.notch[2][1]} Z`}
          fill={Colors.void}
        />
      )}
    </G>
  );
}

interface EndpointSocketsProps {
  pieceId: string;
  cellSize: number;
  kind: 'outlet' | 'socket';
  connectedSides: PortSide[];
  fill: string;
}

/**
 * The four-host animated connection layer (P12-4, S-DR-2/3/6). Exactly four
 * hosts, one per side, each always mounted with a stable testID. Each side's
 * single Animated.Value (0 retracted, 1 extended), created once, drives both
 * the socket's extension along its own axis and its opacity — no second
 * value, no native driver.
 */
export function EndpointSockets({ pieceId, cellSize, kind, connectedSides, fill }: EndpointSocketsProps) {
  const animsRef = useRef<Record<PortSide, Animated.Value> | null>(null);
  if (!animsRef.current) {
    const initial = {} as Record<PortSide, Animated.Value>;
    for (const side of SIDES) {
      initial[side] = new Animated.Value(connectedSides.includes(side) ? 1 : 0);
    }
    animsRef.current = initial;
  }
  const anims = animsRef.current;
  const prevRef = useRef<Set<PortSide>>(new Set(connectedSides));
  const connectedKey = [...connectedSides].sort().join(',');

  useEffect(() => {
    const curr = new Set(connectedSides);
    const prev = prevRef.current;
    prevRef.current = curr;
    for (const side of SIDES) {
      const has = curr.has(side);
      const had = prev.has(side);
      if (has && !had) {
        Animated.timing(anims[side], {
          toValue: 1,
          duration: CONNECT_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      } else if (!has && had) {
        Animated.timing(anims[side], {
          toValue: 0,
          duration: DISCONNECT_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }
    }
    // connectedKey (not connectedSides) is the real dependency: this must
    // fire only when the SET of connected sides actually changes, not on
    // every re-render that passes a new array with the same contents.
  }, [connectedKey, anims]);

  return (
    <>
      {SIDES.map(side => {
        const { axis, anchor } = socketAnchor(cellSize, side);
        const progress = anims[side];
        const scale = progress;
        const transform =
          axis === 'x'
            ? [{ translateX: anchor }, { scaleX: scale as unknown as number }, { translateX: -anchor }]
            : [{ translateY: anchor }, { scaleY: scale as unknown as number }, { translateY: -anchor }];
        return (
          <AnimatedG
            key={side}
            testID={`endpoint-socket-${pieceId}-${side}`}
            opacity={progress as unknown as number}
            transform={transform as unknown as string}
          >
            <EndpointSocketShape cellSize={cellSize} side={side} kind={kind} fill={fill} />
          </AnimatedG>
        );
      })}
    </>
  );
}

interface TerminalEntryMarkerProps {
  entrySide: PortSide;
  cellSize: number;
  fill: string;
}

/**
 * The static directional-Terminal marker (P12-5, M-DR-1..M-DR-6). No
 * Animated value, no timing, no native driver — it never changes once the
 * Terminal is placed.
 */
export function TerminalEntryMarker({ entrySide, cellSize, fill }: TerminalEntryMarkerProps) {
  return (
    <G testID={`terminal-entry-${entrySide}`}>
      <EndpointSocketShape cellSize={cellSize} side={entrySide} kind="socket" fill={fill} />
    </G>
  );
}
