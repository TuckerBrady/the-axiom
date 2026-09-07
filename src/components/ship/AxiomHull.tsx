import React from 'react';
import Svg, { G, Path, Rect, Ellipse, Circle, Line } from 'react-native-svg';
import { Colors } from '../../theme/tokens';
import {
  SHIP_VIEWBOX,
  SHIP_ASPECT,
  SHIP_ZONE_ORDER,
  ZONE_ANCHORS,
  strokeFor,
  isZoneOnline,
  type RepairState,
  type ShipZoneId,
} from './shipGeometry';

// ─── AXM-001 S-00/S-01/S-02 — The Axiom, canonical hull rendering ────────────
//
// This is the single geometry-rendering module for the vessel. Every
// consumer (Hub, Repair Progress, Codex) renders THIS silhouette at a
// different scale and lights a different subset of zones — no consumer
// defines its own paths. That constraint is what stops the repo drifting
// back to three unrelated ship renderings (see AXIOM_SHIP_CANON.md S-00).
// The zone/opacity/accent rules live in shipGeometry.ts; this file is JSX
// only, so those rules stay independently unit-testable.
//
// The coordinate system, proportions, and all eight zone bounding boxes are
// locked in AXIOM_SHIP_CANON.md S-01/S-02 and are transferred here literally.
// The linework itself is a blueprint-to-vector redraw, not a copy of the
// `.dc.html` reference art — per the handoff README, geometry is exact,
// drawing style is not.

export {
  SHIP_VIEWBOX_W,
  SHIP_VIEWBOX_H,
  SHIP_VIEWBOX,
  SHIP_ASPECT,
  REPAIR_OPACITY,
  SHIP_ZONE_ORDER,
  SHIP_ZONES,
  ZONE_ANCHORS,
  clampZoneState,
  type RepairState,
  type ShipZoneId,
} from './shipGeometry';

export interface AxiomHullProps {
  width?: number;
  zoneStates: Record<ShipZoneId, RepairState>;
  // Repair Progress wants callout dots at each zone's anchor point; Hub
  // and Codex don't render them.
  showZoneMarkers?: boolean;
}

export default function AxiomHull({ width = 300, zoneStates, showZoneMarkers = false }: AxiomHullProps) {
  const height = width * SHIP_ASPECT;
  const z = (id: ShipZoneId) => strokeFor(id, zoneStates[id] ?? 'DERELICT');

  const drive = z('propulsionCore');
  const battery = z('emergencyPower');
  const pod = z('lifeSupport');
  const relay = z('communicationArray');
  const dome = z('navigationArray');
  const wedge = z('sensorGrid');
  const hardpoints = z('weaponsLock');
  const canopy = z('bridgeSystems');

  return (
    <Svg width={width} height={height} viewBox={SHIP_VIEWBOX}>
      {/* ═══ S-01 — main hull, shoulder break at x=700 ═══
          Aft (drive-side) hull deep (~140u); forward hull shallower
          (~90u), stepping down and inward at the shoulder. This line is
          drawn once per zone that owns a stretch of it, so no single
          "ambient hull" opacity exists outside the eight zones. */}

      {/* Aft hull plate — belongs to Emergency Power (nearest system) */}
      <Path
        d="M240,180 L700,180 L700,320 L240,320 Z"
        fill={Colors.void}
        stroke={battery.stroke}
        strokeOpacity={battery.opacity}
        strokeWidth={2}
      />
      {/* Forward hull plate (shallower, post-shoulder) — Sensor Grid's
          bow wedge picks up where this ends. */}
      <Path
        d="M700,205 L1010,205 L1010,295 L700,295 Z"
        fill={Colors.void}
        stroke={wedge.stroke}
        strokeOpacity={wedge.opacity}
        strokeWidth={2}
      />
      {/* Shoulder step connecting the two plates */}
      <Path
        d="M700,180 L700,205 M700,295 L700,320"
        stroke={Colors.blue}
        strokeOpacity={Math.max(battery.opacity, wedge.opacity)}
        strokeWidth={1.5}
      />

      {/* ═══ S-02 Zone 4 — Propulsion Core: one oversized drive block,
          bolted to the stern, single squared nozzle ═══ */}
      <G opacity={drive.opacity}>
        <Rect x={32} y={195} width={208} height={110} rx={6} fill={Colors.void} stroke={drive.stroke} strokeWidth={2.5} />
        <Rect x={10} y={220} width={26} height={60} rx={3} fill={Colors.void} stroke={drive.stroke} strokeWidth={2.5} />
        <Line x1={60} y1={195} x2={60} y2={305} stroke={drive.stroke} strokeWidth={1} />
        <Line x1={110} y1={195} x2={110} y2={305} stroke={drive.stroke} strokeWidth={1} />
        {/* S-03B (yard repair) — heavy stepped square-edged overlap at
            the drive-block joint, x=268 */}
        <Path d="M260,195 L260,215 L276,215 L276,230 L260,230 L260,305" stroke={drive.stroke} strokeWidth={1.5} fill="none" />
      </G>

      {/* ═══ Zone 1 — Emergency Power: plated battery bank, external
          cable clamps. First repair in the game; needs a real object. ═══ */}
      <G opacity={battery.opacity}>
        <Rect x={252} y={312} width={138} height={32} rx={4} fill={Colors.void} stroke={battery.stroke} strokeWidth={2} />
        <Rect x={266} y={318} width={20} height={20} rx={2} fill="none" stroke={battery.stroke} strokeWidth={1} />
        <Rect x={296} y={318} width={20} height={20} rx={2} fill="none" stroke={battery.stroke} strokeWidth={1} />
        <Rect x={326} y={318} width={20} height={20} rx={2} fill="none" stroke={battery.stroke} strokeWidth={1} />
        <Rect x={356} y={318} width={20} height={20} rx={2} fill="none" stroke={battery.stroke} strokeWidth={1} />
        {/* External cable clamps */}
        <Path d="M260,312 L260,300 M300,312 L300,300 M340,312 L340,300" stroke={battery.stroke} strokeWidth={1.5} strokeLinecap="round" />
        {/* S-03A — painted-over hull marking, aft flank. Reads as
            something suppressed: newer, mismatched paint over a
            partially-legible AX-07 registration. */}
        <Rect x={440} y={220} width={150} height={46} rx={2} fill={Colors.steel} fillOpacity={battery.opacity * 0.4} stroke={battery.stroke} strokeOpacity={battery.opacity * 0.6} strokeWidth={1} />
        <Rect x={452} y={232} width={40} height={12} rx={1} fill="none" stroke={battery.stroke} strokeOpacity={0.14} strokeWidth={2} />
        {/* S-03B (field repair) — crude hand-run zigzag weld, x~380 */}
        <Path d="M372,300 L388,290 L376,282 L392,272 L380,264" stroke={battery.stroke} strokeOpacity={battery.opacity * 0.8} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      </G>

      {/* ═══ Zone 2 — Life Support: elongated ventral pod, capsule below
          the hull line ═══ */}
      <G opacity={pod.opacity}>
        <Ellipse cx={480} cy={340} rx={82} ry={26} fill={Colors.void} stroke={pod.stroke} strokeWidth={2} />
        <Line x1={420} y1={330} x2={420} y2={320} stroke={pod.stroke} strokeWidth={1.5} />
        <Line x1={540} y1={330} x2={540} y2={320} stroke={pod.stroke} strokeWidth={1.5} />
        {isZoneOnline('lifeSupport', zoneStates.lifeSupport ?? 'DERELICT') && (
          <Circle cx={480} cy={340} r={8} fill={pod.stroke} opacity={0.35} />
        )}
      </G>

      {/* ═══ Zone 5 — Communication Array: relay bay recessed into the
          spine, fine precision-machined nested arcs. The Maker's hand —
          visibly better work than the crude hull holding it. ═══ */}
      <G opacity={relay.opacity}>
        <Path d="M328,180 L328,198 L690,198 L690,180" fill="none" stroke={relay.stroke} strokeWidth={2} />
        <Path d="M400,198 A110,20 0 0 0 620,198" fill="none" stroke={relay.stroke} strokeWidth={1.2} />
        <Path d="M430,198 A80,15 0 0 0 590,198" fill="none" stroke={relay.stroke} strokeWidth={1} />
        <Path d="M460,198 A50,10 0 0 0 560,198" fill="none" stroke={relay.stroke} strokeWidth={1} />
        {/* S-03C — the Maker's bypass conduit: external copper run from
            the nav dome aft along the forward flank, hand-clamped
            twice. Deliberately ignores the hull's own panel lines. */}
        <Path d="M700,190 L560,206 L440,200" stroke={Colors.copper} strokeOpacity={relay.opacity} strokeWidth={1.5} fill="none" />
        <Circle cx={560} cy={206} r={3} fill="none" stroke={Colors.copper} strokeOpacity={relay.opacity} strokeWidth={1.2} />
        <Circle cx={440} cy={200} r={3} fill="none" stroke={Colors.copper} strokeOpacity={relay.opacity} strokeWidth={1.2} />
        {/* S-03B (depot repair) — neat line of round rivets, x~620 */}
        <Circle cx={614} cy={198} r={2} fill={relay.stroke} opacity={0.8} />
        <Circle cx={622} cy={198} r={2} fill={relay.stroke} opacity={0.8} />
        <Circle cx={630} cy={198} r={2} fill={relay.stroke} opacity={0.8} />
      </G>

      {/* ═══ Zone 3 — Navigation Array: forward dorsal dome, peak y=182 ═══ */}
      <G opacity={dome.opacity}>
        <Path d="M920,205 Q960,182 1000,205" fill={Colors.void} stroke={dome.stroke} strokeWidth={2} />
        <Circle cx={960} cy={200} r={5} fill="none" stroke={dome.stroke} strokeWidth={1.2} />
      </G>

      {/* ═══ Zone 8 — Bridge Systems: forward dorsal canopy, peak
          y=176. Last zone, highest — the payoff frame of Sector 0. ═══ */}
      <G opacity={canopy.opacity}>
        <Path d="M775,205 Q837,176 900,205" fill={Colors.void} stroke={canopy.stroke} strokeWidth={2} />
        <Path d="M800,203 Q837,186 875,203" fill="none" stroke={canopy.stroke} strokeWidth={1} strokeOpacity={0.7} />
      </G>

      {/* ═══ Zone 7 — Weapons Lock: two capped ventral hardpoints. Cap
          plates stay on; never reaches ONLINE (clamped in strokeFor). ═══ */}
      <G opacity={hardpoints.opacity}>
        <Rect x={760} y={295} width={70} height={16} rx={4} fill={Colors.void} stroke={hardpoints.stroke} strokeWidth={2} />
        <Rect x={870} y={295} width={70} height={16} rx={4} fill={Colors.void} stroke={hardpoints.stroke} strokeWidth={2} />
        {/* S-03D — copper cross-brace caps, deliberately sealed */}
        <Line x1={760} y1={295} x2={830} y2={311} stroke={Colors.copper} strokeOpacity={hardpoints.opacity} strokeWidth={1.2} />
        <Line x1={830} y1={295} x2={760} y2={311} stroke={Colors.copper} strokeOpacity={hardpoints.opacity} strokeWidth={1.2} />
        <Line x1={870} y1={295} x2={940} y2={311} stroke={Colors.copper} strokeOpacity={hardpoints.opacity} strokeWidth={1.2} />
        <Line x1={940} y1={295} x2={870} y2={311} stroke={Colors.copper} strokeOpacity={hardpoints.opacity} strokeWidth={1.2} />
      </G>

      {/* ═══ Zone 6 — Sensor Grid: bow wedge + blunt faceted nose face,
          ~24u tall. A pointed nose reads as a weapon, so this stays
          flat. ═══ */}
      <G opacity={wedge.opacity}>
        <Path d="M1010,205 L1136,225 L1136,275 L1010,295 Z" fill={Colors.void} stroke={wedge.stroke} strokeWidth={2} />
        <Line x1={1136} y1={225} x2={1160} y2={238} stroke={wedge.stroke} strokeWidth={2} />
        <Line x1={1160} y1={238} x2={1160} y2={262} stroke={wedge.stroke} strokeWidth={2} />
        <Line x1={1160} y1={262} x2={1136} y2={275} stroke={wedge.stroke} strokeWidth={2} />
        <Circle cx={1070} cy={250} r={4} fill="none" stroke={wedge.stroke} strokeWidth={1} />
      </G>

      {showZoneMarkers && (
        <G>
          {SHIP_ZONE_ORDER.map(id => {
            const anchor = ZONE_ANCHORS[id];
            const info = z(id);
            return (
              <Circle key={id} cx={anchor.x} cy={anchor.y} r={4} fill={info.stroke} opacity={Math.max(info.opacity, 0.35)} />
            );
          })}
        </G>
      )}
    </Svg>
  );
}
