const mock = () => null;
export default {
  createAnimatedComponent: (c: any) => c,
  View: mock,
  Text: mock,
};
export const useSharedValue = (v: any) => ({ value: v });
export const useAnimatedStyle = (fn: any) => fn();
export const useAnimatedProps = (fn: any) => fn();
export const withTiming = (v: any) => v;
export const withSpring = (v: any) => v;
export const withDelay = (_d: any, v: any) => v;
export const withRepeat = (v: any) => v;
export const withSequence = (...args: any[]) => args[0];
export const interpolate = (v: any) => v;
export const interpolateColor = () => 'transparent';
export const Extrapolation = { CLAMP: 'clamp' };
export const Easing = {
  linear: (v: any) => v,
  inOut: () => (v: any) => v,
  out: () => (v: any) => v,
  in: () => (v: any) => v,
  sin: (v: any) => v,
  cubic: (v: any) => v,
};
export const FadeIn = { duration: () => ({}) };
export const FadeInUp = { delay: () => ({ duration: () => ({}) }) };
export const runOnJS = (fn: any) => fn;
export const createAnimatedComponent = (c: any) => c;
