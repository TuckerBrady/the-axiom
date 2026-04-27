import { Animated, Easing } from 'react-native';
import type { EngagementContext, ValueTravelRefs } from './types';

const CINEMATIC_EASING = Easing.bezier(0.4, 0, 0.2, 1);

/**
 * Three-phase value-travel animation: lift-off, arc-travel, impact.
 * Uses useNativeDriver: true for all animations (translateX/Y, scale, opacity).
 *
 * `onArrive` fires the moment Phase 2 (arc travel) completes — the
 * glow has visually landed on the TRAIL cell. Callers should use this
 * to trigger the trail cell's "accept" highlight so the visual handoff
 * is synchronous with the landing rather than gapped behind a 700ms
 * post-impact wait (Prompt 91, Fix 6).
 *
 * Prompt 99C, Fix 4 — pre-99C this function fired four
 * setGlowTravelerState calls per traveler run (liftoff start →
 * travel mid → impact mid → idle end), and the renderer only ever
 * read `value` from that state. Trimmed to two: one at start
 * (visible: true, phase: 'liftoff', coords) and one at end
 * (visible: false, phase: 'idle'). The intermediate phase strings are
 * gone — they were never consumed by the render layer.
 * PERFORMANCE_CONTRACT 3.5.1.
 */
export function runValueTravel(
  ctx: EngagementContext,
  refs: ValueTravelRefs,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  value: string,
  onArrive?: () => void,
): Promise<void> {
  return new Promise(resolve => {
    refs.x.setValue(fromX);
    refs.y.setValue(fromY);
    refs.scale.setValue(1);
    refs.opacity.setValue(0);

    ctx.setGlowTravelerState({
      visible: true,
      value,
      fromX, fromY, toX, toY,
      phase: 'liftoff',
    });

    // Phase 1: Lift-off (0.3s)
    Animated.parallel([
      Animated.timing(refs.opacity, {
        toValue: 1,
        duration: 300,
        easing: CINEMATIC_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(refs.scale, {
        toValue: 1.25,
        duration: 300,
        easing: CINEMATIC_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(refs.y, {
        toValue: fromY - 8,
        duration: 300,
        easing: CINEMATIC_EASING,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Phase 2: Arc travel (0.6s) — lands at exactly (toX, toY),
      // which is the TRAIL cell's center per
      // getTapeCellPosFromCache(...) - 12 from the call site.
      Animated.parallel([
        Animated.timing(refs.x, {
          toValue: toX,
          duration: 600,
          easing: CINEMATIC_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(refs.y, {
          toValue: toY,
          duration: 600,
          easing: CINEMATIC_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(refs.scale, {
          toValue: 1.0,
          duration: 600,
          easing: CINEMATIC_EASING,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Phase 3: Impact — fire onArrive synchronously so the
        // TRAIL cell's "accept" highlight starts WHILE the glow is
        // still visible on the cell, then fade the glow over 250ms
        // so the handoff is continuous (Prompt 91, Fix 6).
        // Previously: the opacity snapped to 0 immediately and a
        // 700ms gap separated the vanish from the trail flash —
        // visually it looked like the value evaporated mid-air.
        onArrive?.();

        Animated.timing(refs.opacity, {
          toValue: 0,
          duration: 250,
          easing: CINEMATIC_EASING,
          useNativeDriver: true,
        }).start(() => {
          ctx.setGlowTravelerState(prev => ({
            ...prev,
            visible: false,
            phase: 'idle',
          }));
          resolve();
        });
      });
    });
  });
}

export function resetGlowTraveler(refs: ValueTravelRefs): void {
  refs.opacity.setValue(0);
  refs.scale.setValue(1);
  refs.x.setValue(0);
  refs.y.setValue(0);
}
