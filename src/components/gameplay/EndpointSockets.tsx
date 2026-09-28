// One shared endpoint port renderer (AXM-044 DR-1), used by:
//   - the animated connection-port layer (Source; Terminal without entrySide)
//   - the static directional-Terminal entry marker (Terminal with entrySide)
//   - PieceIcon's Codex ports (hero icon, ALSO CATALOGUED chips, and the
//     Field Simulation), via EndpointPortShape
//
// SWEEP-B51 S12 (AXM-044, locked design "S3: Energy port"): the P12 socket
// bar is replaced by an energy port: a half-disc aperture on the cell edge,
// an inner arc, and a core (filled on a Source, hollow on a Terminal). The
// geometry is endpointPortGeometry in endpointSocketGeometry.ts.
//
// AXM-036 HF-1 (build 50, "Source and terminal pieces didn't have sockets"):
// the animation lives on RN Animated.View hosts, never on a react-native-svg
// prop. react-native-svg flattens a transform array into one props object
// (transformsArrayToProps), so an ordered transform on an svg element loses
// its repeated translate keys and draws in the wrong place. Each side has one
// always-mounted Animated.View covering the full cell, with opacity and an
// ORDERED style transform (RN applies it in order about the view centre);
// inside it, a static Svg draws the port.
//
// useNativeDriver: false, same as PieceIcon.tsx and DamagedCell.tsx: this is
// a piece interaction beat on the JS thread (AXM-037 DR-6). Each of the four
// side hosts is ALWAYS mounted (REQ-A-1/A-2): there is no
// `{connected && <Animated...>}` anywhere in this file; only the value each
// host's Animated.Value is driven to changes.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import type { PortSide } from '../../game/types';
import { endpointPortGeometry, PIECE_CORE } from './endpointSocketGeometry';

const CONNECT_MS = 150;
const DISCONNECT_MS = 100;

const SIDES: PortSide[] = ['top', 'right', 'bottom', 'left'];

interface EndpointPortShapeProps {
  cellSize: number;
  side: PortSide;
  kind: 'outlet' | 'socket';
  color: string;
}

/**
 * The static port: aperture, inner arc, core, in that order (DR-2..DR-4).
 * The only component that draws a port. Used as the content of each
 * animated host below, as the whole of the static directional-Terminal
 * entry marker, and by PieceIcon for the Codex art.
 */
export function EndpointPortShape({ cellSize, side, kind, color }: EndpointPortShapeProps) {
  const geo = endpointPortGeometry(cellSize, side, kind);
  return (
    <G>
      <Path
        d={geo.aperturePath}
        fill={PIECE_CORE}
        stroke={color}
        strokeWidth={geo.apertureStrokeWidth}
      />
      <Path
        d={geo.arcPath}
        fill="none"
        stroke={color}
        strokeOpacity={geo.arcOpacity}
        strokeWidth={geo.arcStrokeWidth}
      />
      {geo.coreFilled ? (
        <Path d={geo.corePath} fill={color} />
      ) : (
        <Path
          d={geo.corePath}
          fill={PIECE_CORE}
          stroke={color}
          strokeWidth={geo.coreStrokeWidth ?? undefined}
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
 * The four-host animated connection layer (P12-4, AXM-044 DR-6/DR-7).
 * Exactly four hosts, one per side, each always mounted with a stable
 * testID. Each side's single Animated.Value (0 retracted, 1 extended),
 * created once, drives both the port's uniform scale about its centre and
 * its opacity: no second value, no native driver.
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
        const progress = anims[side];
        // RN scales about the view centre (c/2); translating by the port
        // centre's offset from the view centre first and back after makes
        // the port centre the fixed point, so the port grows from 0 radius
        // on the edge (DR-7, contract R-12.2).
        const { cx, cy } = endpointPortGeometry(cellSize, side, kind);
        const dx = cx - cellSize / 2;
        const dy = cy - cellSize / 2;
        const transform = [
          { translateX: dx },
          { translateY: dy },
          { scale: progress },
          { translateY: -dy },
          { translateX: -dx },
        ];
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
              <EndpointPortShape cellSize={cellSize} side={side} kind={kind} color={fill} />
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
 * The static directional-Terminal marker (P12-5, AXM-044 DR-6): one socket
 * port on `entrySide`. No Animated value, no timing, no native driver; it
 * never changes once the Terminal is placed.
 */
export function TerminalEntryMarker({ entrySide, cellSize, fill }: TerminalEntryMarkerProps) {
  return (
    <G testID={`terminal-entry-${entrySide}`}>
      <EndpointPortShape cellSize={cellSize} side={entrySide} kind="socket" color={fill} />
    </G>
  );
}
