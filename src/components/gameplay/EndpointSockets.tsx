// AXM-036 P12 — one shared socket renderer (R-12.1), used by:
//   - the animated connection-socket layer (Source; Terminal without entrySide)
//   - the static directional-Terminal entry marker (Terminal with entrySide)
//
// AXM-036 HF-1 (build 50, "Source and terminal pieces didn't have sockets"):
// the animation lives on RN Animated.View hosts, never on a react-native-svg
// prop. P12 drove an Animated-wrapped svg <G> with the
// scale-about-anchor as a transform PROP array; react-native-svg flattens a
// transform array into one props object (transformsArrayToProps), so the
// repeated translateX/Y keys collapsed and every socket was drawn one anchor
// length toward the left/top: on the wrong side of a Source, out of the cell
// for a Terminal. Each side now has one always-mounted Animated.View covering
// the full cell, with opacity and an ORDERED style transform (RN applies it in
// order about the view centre); inside it, a static Svg draws the shape.
//
// useNativeDriver: false, same as PieceIcon.tsx and DamagedCell.tsx: this is
// a piece interaction beat on the JS thread (DR-6). Each of the four side
// hosts is ALWAYS mounted (REQ-A-1/A-2) — there is no
// `{connected && <Animated...>}` anywhere in this file; only the value each
// host's Animated.Value is driven to changes.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';
import type { PortSide } from '../../game/types';
import { Colors } from '../../theme/tokens';
import { endpointSocketGeometry } from './endpointSocketGeometry';

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
        // RN scales about the view centre (c/2); translating by the anchor's
        // offset from the centre first and back after makes the ring-side
        // edge the fixed point, so the socket extends outward from the ring.
        const d = anchor - cellSize / 2;
        const transform =
          axis === 'x'
            ? [{ translateX: d }, { scaleX: progress }, { translateX: -d }]
            : [{ translateY: d }, { scaleY: progress }, { translateY: -d }];
        return (
          <Animated.View
            key={side}
            testID={`endpoint-socket-${pieceId}-${side}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: cellSize,
              height: cellSize,
              opacity: progress,
              transform,
            }}
          >
            <Svg width={cellSize} height={cellSize} viewBox={`0 0 ${cellSize} ${cellSize}`}>
              <EndpointSocketShape cellSize={cellSize} side={side} kind={kind} fill={fill} />
            </Svg>
          </Animated.View>
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
