import { Animated, Easing } from 'react-native';
import type { EngagementContext, ValueTravelRefs } from './types';

const CINEMATIC_EASING = Easing.bezier(0.4, 0, 0.2, 1);

/**
 * Three-phase value-travel animation: lift-off, arc-travel, impact.
 * Uses useNativeDriver: true for all animations (translateX/Y, scale, opacity).
 */
export function runValueTravel(
  ctx: EngagementContext,
  refs: ValueTravelRefs,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  value: string,
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
      ctx.setGlowTravelerState(prev => ({ ...prev, phase: 'travel' }));

      // Phase 2: Arc travel (0.6s)
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
        ctx.setGlowTravelerState(prev => ({ ...prev, phase: 'impact' }));

        // Phase 3: Impact (0.7s) — snap glow off, show impact ripple.
        // The 0.7s persistence is the visual settling of the
        // tapeCellHighlightWrite style on the TRAIL cell.
        refs.opacity.setValue(0);
        ctx.setGlowTravelerState(prev => ({
          ...prev,
          visible: false,
          phase: 'idle',
        }));

        setTimeout(() => {
          resolve();
        }, 700);
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
