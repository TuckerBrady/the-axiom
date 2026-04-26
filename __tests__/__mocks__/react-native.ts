// Minimal react-native mock for unit tests. The unit-tier jest project
// does not include the react-native preset, so production modules that
// `import { Animated, Easing } from 'react-native'` would otherwise
// crash on parse (RN's index.js uses Flow `import typeof` syntax).
//
// This mock provides:
//   - Animated.Value (records setValue calls; .interpolate is a no-op)
//   - Animated.timing (returns a CompositeAnimation-like object whose
//     .start() invokes the completion callback synchronously so promise
//     chains in the engagement layer resolve under fake timers)
//   - Animated.parallel / sequence (compose start callbacks)
//   - Animated.createAnimatedComponent passthrough
//   - Easing primitives matching the production API surface
//
// This is the SAME pattern used for react-native-reanimated and
// react-native-svg in this codebase. Animation behavior is verified
// via source-contract tests (see valueTravelAnimation.test.ts);
// behavioral coverage of the rendered visuals lives in Maestro.

class AnimatedValue {
  private _value: number;
  private _listeners: Map<string, (state: { value: number }) => void> = new Map();
  constructor(value: number) {
    this._value = value;
  }
  setValue(value: number): void {
    this._value = value;
    for (const listener of this._listeners.values()) {
      listener({ value });
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interpolate(_config: unknown): AnimatedValue {
    return this;
  }
  addListener(listener: (state: { value: number }) => void): string {
    const id = `${Math.random()}`;
    this._listeners.set(id, listener);
    return id;
  }
  removeListener(id: string): void {
    this._listeners.delete(id);
  }
  removeAllListeners(): void {
    this._listeners.clear();
  }
  __getValue(): number {
    return this._value;
  }
}

type CompletionCallback = (result: { finished: boolean }) => void;
type CompositeAnimation = {
  start: (cb?: CompletionCallback) => void;
  stop: () => void;
};

function timing(
  _value: AnimatedValue,
  _config: { toValue: number; duration?: number; useNativeDriver?: boolean; easing?: unknown },
): CompositeAnimation {
  let stopped = false;
  return {
    start: (cb?: CompletionCallback) => {
      // Resolve synchronously so awaiting promise chains in the
      // engagement layer don't hang under fake timers. Tests that
      // care about the timing config can spy on Animated.timing
      // before invoking the production code.
      if (!stopped) {
        _value.setValue(_config.toValue);
        cb?.({ finished: true });
      } else {
        cb?.({ finished: false });
      }
    },
    stop: () => {
      stopped = true;
    },
  };
}

function parallel(animations: CompositeAnimation[]): CompositeAnimation {
  return {
    start: (cb?: CompletionCallback) => {
      let remaining = animations.length;
      if (remaining === 0) {
        cb?.({ finished: true });
        return;
      }
      animations.forEach(a =>
        a.start(() => {
          remaining -= 1;
          if (remaining === 0) cb?.({ finished: true });
        }),
      );
    },
    stop: () => animations.forEach(a => a.stop()),
  };
}

function sequence(animations: CompositeAnimation[]): CompositeAnimation {
  return {
    start: (cb?: CompletionCallback) => {
      let i = 0;
      const next = (): void => {
        if (i >= animations.length) {
          cb?.({ finished: true });
          return;
        }
        animations[i].start(() => {
          i += 1;
          next();
        });
      };
      next();
    },
    stop: () => animations.forEach(a => a.stop()),
  };
}

function loop(animation: CompositeAnimation): CompositeAnimation {
  return {
    start: () => animation.start(),
    stop: () => animation.stop(),
  };
}

function createAnimatedComponent<T>(component: T): T {
  return component;
}

export const Animated = {
  Value: AnimatedValue,
  View: 'AnimatedView',
  Text: 'AnimatedText',
  Image: 'AnimatedImage',
  ScrollView: 'AnimatedScrollView',
  timing,
  parallel,
  sequence,
  loop,
  createAnimatedComponent,
  event: () => () => undefined,
};

export const Easing = {
  linear: (v: number) => v,
  ease: (v: number) => v,
  quad: (v: number) => v,
  cubic: (v: number) => v,
  bezier: () => (v: number) => v,
  in: (fn: (v: number) => number) => fn,
  out: (fn: (v: number) => number) => fn,
  inOut: (fn: (v: number) => number) => fn,
  sin: (v: number) => v,
};

export const View = 'View';
export const Text = 'Text';
export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  flatten: (s: unknown) => s,
  absoluteFill: {},
  absoluteFillObject: {},
  hairlineWidth: 1,
};
export const Dimensions = {
  get: () => ({ width: 375, height: 812, scale: 1, fontScale: 1 }),
  addEventListener: () => ({ remove: () => undefined }),
};
export const Platform = { OS: 'ios', select: <T>(map: { ios?: T; default?: T }): T | undefined => map.ios ?? map.default };
export const TouchableOpacity = 'TouchableOpacity';
export const TouchableWithoutFeedback = 'TouchableWithoutFeedback';
export const Pressable = 'Pressable';
export const ScrollView = 'ScrollView';
export const FlatList = 'FlatList';
export const SafeAreaView = 'SafeAreaView';
export const Modal = 'Modal';
export const Image = 'Image';
export const TextInput = 'TextInput';
export const ActivityIndicator = 'ActivityIndicator';
export const Switch = 'Switch';
export const KeyboardAvoidingView = 'KeyboardAvoidingView';
export const StatusBar = { setBarStyle: () => undefined, setHidden: () => undefined };
export const Alert = { alert: () => undefined };
export const Linking = { openURL: () => Promise.resolve(), canOpenURL: () => Promise.resolve(true) };

export default {
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
};
