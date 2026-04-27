import React from 'react';
import { View, StyleSheet, Animated as RNAnimated } from 'react-native';
import Svg, { Circle, G, Polyline } from 'react-native-svg';
import type { BeamState, ChargeState, Pt } from '../../game/engagement';

const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);

interface Props {
  beamState: BeamState;
  chargeState: ChargeState;
  lockRingCenter: Pt | null;
  chargeProgressAnim: RNAnimated.Value;
  lockRingProgressAnim: RNAnimated.Value;
  beamOpacity: RNAnimated.Value;
  gridW: number;
  gridH: number;
}

// React.memo with default shallow comparison. The Animated.Value
// instances (chargeProgressAnim, lockRingProgressAnim, beamOpacity)
// are created with useRef in the parent and never change identity
// across renders (PERFORMANCE_CONTRACT 5.4.2), so they do not
// invalidate this memo. Re-renders ONLY when beamState, chargeState,
// or lockRingCenter reference changes — which is the per-tick driver
// and is allowed (clause 4.4.2).
function BeamOverlayComponent({
  beamState,
  chargeState,
  lockRingCenter,
  chargeProgressAnim,
  lockRingProgressAnim,
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
              <AnimatedCircle
                cx={chargeState.pos.x} cy={chargeState.pos.y}
                r={chargeProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 24] }) as unknown as number}
                fill="none" stroke="#8B5CF6" strokeWidth={2}
                opacity={chargeProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }) as unknown as number}
              />
              <AnimatedCircle
                cx={chargeState.pos.x} cy={chargeState.pos.y}
                r={chargeProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 28] }) as unknown as number}
                fill="none" stroke="#8B5CF6" strokeWidth={1.5}
                opacity={chargeProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }) as unknown as number}
              />
            </>
          )}
          {beamState.trails.map((seg, i) => (
            seg.points.length > 1 ? (
              <Polyline
                key={`seg-${i}`}
                points={seg.points.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={seg.color}
                strokeWidth={i === beamState.trails.length - 1 ? 2.5 : 2}
                strokeLinecap="round"
                opacity={i === beamState.trails.length - 1 ? 0.72 : 0.45}
              />
            ) : null
          ))}
          {beamState.branchTrails.map((branch, bi) =>
            branch.map((seg, si) => (
              seg.points.length > 1 ? (
                <Polyline
                  key={`br-${bi}-${si}`}
                  points={seg.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={si === branch.length - 1 ? 2.5 : 2}
                  strokeLinecap="round"
                  opacity={si === branch.length - 1 ? 0.72 : 0.45}
                />
              ) : null
            )),
          )}
          {beamState.heads.map((bh, bi) => (
            <G key={`bh-${bi}`}>
              <Circle cx={bh.x} cy={bh.y} r={11} fill={beamState.headColor} opacity={0.25} />
              <Circle cx={bh.x} cy={bh.y} r={3.5} fill="white" opacity={0.95} />
            </G>
          ))}
          {beamState.voidPulse && (
            <Circle
              cx={beamState.voidPulse.x} cy={beamState.voidPulse.y} r={beamState.voidPulse.r}
              stroke="#FF3B3B" strokeWidth={2.5}
              fill="none" opacity={beamState.voidPulse.opacity}
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
    </View>
  );
}

export default React.memo(BeamOverlayComponent);
