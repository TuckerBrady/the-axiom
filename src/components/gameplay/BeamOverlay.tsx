import React from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import Svg, { Circle, G, Polyline } from 'react-native-svg';
import type { BeamState, ChargeState, Pt } from '../../game/engagement';
import {
  DATA_GLOW_WIDTH_MULT,
  DATA_GLOW_OPACITY_MAX,
  DATA_TRAIL_OPACITY_MIN_FACTOR,
} from '../../game/engagement';
import { Colors } from '../../theme/tokens';

const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);

// AXM-036 P4b-1 (F13 a, c) — the bit-traveler's disc color. #00D4FF is
// already the app's Protocol-blue accent (Button.tsx, SpecSheetPanel.tsx,
// PieceTray.tsx's REQUISITIONED_COLOR, etc.) — not a new hue.
const BIT_TRAVELER_COLOR = '#00D4FF';

interface Props {
  beamState: BeamState;
  chargeState: ChargeState;
  lockRingCenter: Pt | null;
  voidBurstCenter: Pt | null;
  chargeProgressAnim: RNAnimated.Value;
  lockRingProgressAnim: RNAnimated.Value;
  voidPulseRingProgressAnim: RNAnimated.Value;
  beamOpacity: RNAnimated.Value;
  gridW: number;
  gridH: number;
}

// React.memo with default shallow comparison. The Animated.Value
// instances (chargeProgressAnim, lockRingProgressAnim,
// voidPulseRingProgressAnim, beamOpacity) are created with useRef in
// the parent and never change identity across renders
// (PERFORMANCE_CONTRACT 5.4.2), so they do not invalidate this memo.
// Re-renders ONLY when beamState, chargeState, lockRingCenter, or
// voidBurstCenter reference changes — which is the per-tick driver
// and is allowed (clause 4.4.2).
function BeamOverlayComponent({
  beamState,
  chargeState,
  lockRingCenter,
  voidBurstCenter,
  chargeProgressAnim,
  lockRingProgressAnim,
  voidPulseRingProgressAnim,
  beamOpacity,
  gridW,
  gridH,
}: Props) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
    >
      <RNAnimated.View
        style={[StyleSheet.absoluteFill, { opacity: beamOpacity }]}
        pointerEvents="none"
      >
        <Svg
          width={gridW}
          height={gridH}
          style={StyleSheet.absoluteFill}
        >
          {beamState.phase === 'charge' && chargeState.pos && (
            <>
              {/* REQ-G-05 (Handoff 003): the charge rings take
                  chargeState.color — the first post-Source step's category
                  (SE-BEAM-081) — instead of the hardcoded Protocol body
                  stroke '#8B5CF6', which painted every charge amber-or-blue
                  run in the wrong (and reserved) hue. */}
              <AnimatedCircle
                cx={chargeState.pos.x} cy={chargeState.pos.y}
                r={chargeProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 24] }) as unknown as number}
                fill="none" stroke={chargeState.color ?? Colors.amber} strokeWidth={2}
                opacity={chargeProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }) as unknown as number}
              />
              <AnimatedCircle
                cx={chargeState.pos.x} cy={chargeState.pos.y}
                r={chargeProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 28] }) as unknown as number}
                fill="none" stroke={chargeState.color ?? Colors.amber} strokeWidth={1.5}
                opacity={chargeProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }) as unknown as number}
              />
            </>
          )}
          {beamState.trails.map((seg, i) => {
            if (seg.points.length <= 1) return null;
            const pts = seg.points.map(p => `${p.x},${p.y}`).join(' ');
            const baseWidth = i === beamState.trails.length - 1 ? 2.5 : 2;
            const baseOpacity = i === beamState.trails.length - 1 ? 0.72 : 0.45;
            // AXM-036 P4a-8 (F13b): a non-data segment renders exactly as
            // master — same stroke props, no glow polyline underlay.
            if (!seg.data) {
              return (
                <Polyline
                  key={`seg-${i}`}
                  points={pts}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={baseWidth}
                  strokeLinecap="round"
                  opacity={baseOpacity}
                />
              );
            }
            return (
              <G key={`seg-${i}`}>
                <Polyline
                  testID="beam-data-glow"
                  points={pts}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={baseWidth * DATA_GLOW_WIDTH_MULT}
                  strokeLinecap="round"
                  opacity={DATA_GLOW_OPACITY_MAX * beamState.shimmer}
                />
                <Polyline
                  points={pts}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={baseWidth}
                  strokeLinecap="round"
                  opacity={
                    baseOpacity *
                    (DATA_TRAIL_OPACITY_MIN_FACTOR +
                      (1 - DATA_TRAIL_OPACITY_MIN_FACTOR) * beamState.shimmer)
                  }
                />
              </G>
            );
          })}
          {beamState.branchTrails.map((branch, bi) =>
            branch.map((seg, si) => {
              if (seg.points.length <= 1) return null;
              const pts = seg.points.map(p => `${p.x},${p.y}`).join(' ');
              const baseWidth = si === branch.length - 1 ? 2.5 : 2;
              const baseOpacity = si === branch.length - 1 ? 0.72 : 0.45;
              if (!seg.data) {
                return (
                  <Polyline
                    key={`br-${bi}-${si}`}
                    points={pts}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={baseWidth}
                    strokeLinecap="round"
                    opacity={baseOpacity}
                  />
                );
              }
              return (
                <G key={`br-${bi}-${si}`}>
                  <Polyline
                    testID="beam-data-glow"
                    points={pts}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={baseWidth * DATA_GLOW_WIDTH_MULT}
                    strokeLinecap="round"
                    opacity={DATA_GLOW_OPACITY_MAX * beamState.shimmer}
                  />
                  <Polyline
                    points={pts}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={baseWidth}
                    strokeLinecap="round"
                    opacity={
                      baseOpacity *
                      (DATA_TRAIL_OPACITY_MIN_FACTOR +
                        (1 - DATA_TRAIL_OPACITY_MIN_FACTOR) * beamState.shimmer)
                    }
                  />
                </G>
              );
            }),
          )}
          {/* REQ-G-05: the travelling front now carries its layer color
              (r=3.5, was fill="white") with a smaller white core (r=1.5)
              on top — previously the front was entirely white, the least
              visible part of the animation for the layer-change signal
              SE-BEAM-082 exists to communicate. */}
          {beamState.heads.map((bh, bi) => (
            <G key={`bh-${bi}`}>
              {/* AXM-036 P4a-8 (F13b): while the head is on a data
                  segment, the halo breathes with shimmer(t); otherwise
                  it is master's static r=11, opacity=0.25. (v1.2
                  authorizes widening BeamOverlay.test.ts's head-halo
                  regex to accept this expression.) */}
              <Circle
                cx={bh.x} cy={bh.y}
                r={beamState.headData ? 11 + 3 * beamState.shimmer : 11}
                fill={beamState.headColor}
                opacity={beamState.headData ? 0.25 + 0.15 * beamState.shimmer : 0.25}
              />
              <Circle cx={bh.x} cy={bh.y} r={3.5} fill={beamState.headColor} opacity={0.95} />
              <Circle cx={bh.x} cy={bh.y} r={1.5} fill="white" opacity={0.95} />
            </G>
          ))}
          {/* AXM-036 P4b-1 (F13 a, c) — one persistent bit-traveler host,
              always mounted (no conditional mount), opacity 0 while idle
              (traveler.visible === false). Position, value and radius all
              come from BeamState.traveler, written by interactions.ts's
              runBitTravel/setTraveler — this component stays a pure
              renderer of whatever numbers BeamState carries. Only the
              disc lives in the Svg (Circle); the digit is a plain RN
              <Text> sibling below, absolutely positioned over it — the
              digit needs the RN <Text> primitive to lay out and measure
              glyphs, which react-native-svg's own Text element does not
              give it in this codebase's SVG stack. */}
          <G testID="bit-traveler" opacity={beamState.traveler.visible ? 1 : 0}>
            <Circle
              cx={beamState.traveler.x}
              cy={beamState.traveler.y}
              r={beamState.traveler.r}
              fill={BIT_TRAVELER_COLOR}
              opacity={0.9}
            />
          </G>
          {beamState.voidPulse && (
            <Circle
              cx={beamState.voidPulse.x} cy={beamState.voidPulse.y} r={beamState.voidPulse.r}
              stroke="#FF3B3B" strokeWidth={2.5}
              fill="none" opacity={beamState.voidPulse.opacity}
            />
          )}
          {/* Void burst (Prompt 99C, Fix 2). Replaces the per-RAF
              setVoidPulse stream from the pre-99C beam tick. Both
              radius and opacity are interpolated from
              voidPulseRingProgressAnim on the native thread. The
              progress anim runs 0 → 1 over 320ms with
              useNativeDriver: true. Output ranges match the prior
              hand-coded values: r 6 → 46, opacity 0.9 → 0. */}
          {voidBurstCenter && (
            <AnimatedCircle
              cx={voidBurstCenter.x} cy={voidBurstCenter.y}
              r={voidPulseRingProgressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 46],
              }) as unknown as number}
              stroke="#FF3B3B" strokeWidth={2.5}
              fill="none"
              opacity={voidPulseRingProgressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 0],
              }) as unknown as number}
            />
          )}
          {lockRingCenter && (
            <>
              <AnimatedCircle
                cx={lockRingCenter.x} cy={lockRingCenter.y}
                r={lockRingProgressAnim.interpolate({
                  inputRange: [0, 0.625, 1],
                  outputRange: [6, 42, 42],
                }) as unknown as number}
                stroke="#00C48C" strokeWidth={2.5} fill="none"
                opacity={lockRingProgressAnim.interpolate({
                  inputRange: [0, 0.625, 1],
                  outputRange: [0.95, 0, 0],
                }) as unknown as number}
              />
              <AnimatedCircle
                cx={lockRingCenter.x} cy={lockRingCenter.y}
                r={lockRingProgressAnim.interpolate({
                  inputRange: [0, 0.3125, 0.9375, 1],
                  outputRange: [6, 6, 42, 42],
                }) as unknown as number}
                stroke="#00C48C" strokeWidth={2.5} fill="none"
                opacity={lockRingProgressAnim.interpolate({
                  inputRange: [0, 0.3125, 0.9375, 1],
                  outputRange: [0, 0.95, 0, 0],
                }) as unknown as number}
              />
            </>
          )}
        </Svg>
      </RNAnimated.View>
      {/* AXM-036 P4b-1 (F13 a, c) — the bit-traveler's digit. A sibling of
          the beamOpacity-driven RNAnimated.View, not a child of it —
          TapeColorsAndBeam.test.ts pins that view as closing right after
          </Svg> ("the animated layer is closed before the outer wrapper
          closes"), so this stays outside it. Always mounted (no
          conditional mount), positioned to sit centered over the disc.
          r doubles as the digit's box half-size, matching the disc's
          own radius. */}
      <Text
        testID="bit-traveler-digit"
        style={{
          position: 'absolute',
          left: beamState.traveler.x - beamState.traveler.r,
          top: beamState.traveler.y - beamState.traveler.r,
          width: beamState.traveler.r * 2,
          height: beamState.traveler.r * 2,
          fontSize: beamState.traveler.r,
          fontWeight: 'bold',
          color: '#060e1a',
          textAlign: 'center',
          opacity: beamState.traveler.visible ? 1 : 0,
        }}
      >
        {String(beamState.traveler.value)}
      </Text>
    </View>
  );
}

export default React.memo(BeamOverlayComponent);
