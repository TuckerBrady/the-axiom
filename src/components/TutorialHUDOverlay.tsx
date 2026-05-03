import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  Platform,
  findNodeHandle,
  UIManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TutorialStep, PieceType } from '../game/types';
import type { PlacedTrigger, TappedTrigger } from '../hooks/useGameplayTutorial';
import { Colors, Fonts } from '../theme/tokens';
import CodexDetailView, { getCodexEntry, type PieceEntry } from './CodexDetailView';
import { useCodexStore } from '../store/codexStore';
import { COGS_EYE_COLORS } from '../constants/cogsEyeColors';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const ORB_SIZE = 24;
const PORTAL_PAD = 12;
const PORTAL_MIN = 64;
const PORTAL_MARGIN = 8;
const NAV_HEIGHT = 64;
const CALLOUT_MAX_W = 360;
const CALLOUT_GAP = 12;
const CALLOUT_SIDE_PAD = 24;

type Phase = 'idle' | 'flying' | 'arrived' | 'codex' | 'complete';

type Layout = { x: number; y: number; width: number; height: number };

export type SpotlightCell = {
  col: number;
  row: number;
  color: string;
};

interface Props {
  steps: TutorialStep[];
  levelId: string;
  targetRefs: Record<string, React.RefObject<View | null>>;
  onComplete: () => void;
  onSkip: () => void;
  spotlightCells?: SpotlightCell[];
  spotlightCellSize?: number;
  // Prompt 99B — when true, suspend the 120/150ms measureInWindow
  // retry chains. Tutorial measurement work must not race the JS
  // thread during a beam tick (PERFORMANCE_CONTRACT 6.2.1). Defaults
  // to false so existing call sites keep their current behavior;
  // GameplayScreen passes `beamState.phase !== 'idle'`.
  isBeamActive?: boolean;
  // Arc Wheel tutorial — external event signals for awaitPlacement and awaitPieceTap.
  // Incremented sequence numbers prevent duplicate-fire when the same type repeats.
  lastPlacedTrigger?: PlacedTrigger | null;
  lastTappedTrigger?: TappedTrigger | null;
}

// Targets that are section-level (no individual piece glow)
const SECTION_TARGETS = new Set([
  'boardGrid',
  'center',
  'inputTapeRow',
  'outputTapeRow',
  'dataTrailRow',
]);

// Purple port targets
const PORT_TARGETS = new Set(['sourceNode', 'outputNode']);

function eyeStateColor(eye?: string): string {
  switch (eye) {
    case 'amber': return '#F0B429';
    case 'green': return '#00C48C';
    case 'red': return '#FF3B3B';
    case 'blue':
    default: return '#00D4FF';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

function TutorialHUDOverlayComponent({
  steps,
  levelId,
  targetRefs,
  onComplete,
  onSkip,
  spotlightCells,
  spotlightCellSize,
  isBeamActive = false,
  lastPlacedTrigger,
  lastTappedTrigger,
}: Props) {
  // ── State ──
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [hydrated, setHydrated] = useState(false);
  const [targetLayout, setTargetLayout] = useState<Layout | null>(null);
  const [codexVisible, setCodexVisible] = useState(false);
  // A1-1 batch: secondary entries catalogued silently alongside the main codex view
  const [codexAlsoCollected, setCodexAlsoCollected] = useState<PieceEntry[]>([]);

  // ── Lifecycle guards ──
  // mountedRef is the source of truth for "is this component still
  // alive?" — guards every setState and animation-completion callback
  // so callbacks scheduled before unmount never fire on a dead
  // instance. timersRef tracks every setTimeout (measure retries,
  // hydration entrance, codex transitions) so they can be cleared on
  // unmount; otherwise they leak and accumulate across A1-1 → A1-8.
  // animationsRef tracks Animated.CompositeAnimation handles so any
  // in-flight loop / spring / timing can be stopped cleanly.
  // Without this triple guard, every overlay remount between levels
  // leaks 1-3 timers and a few completion callbacks, which is the
  // root cause of the A1-8 freeze (Prompt 90).
  const mountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animationsRef = useRef<{ stop: () => void }[]>([]);

  // Prompt 99B — track isBeamActive in a ref so measure callbacks
  // don't recreate when the beam phase flips. PERFORMANCE_CONTRACT
  // 6.2.1 forbids measureInWindow during the beam tick loop.
  const isBeamActiveRef = useRef(isBeamActive);
  useEffect(() => {
    const wasActive = isBeamActiveRef.current;
    isBeamActiveRef.current = isBeamActive;
    // When the beam settles back to idle, retrigger one delayed
    // measure to pick up any layout shift that happened during the
    // run (PERFORMANCE_CONTRACT 6.2.2).
    if (wasActive && !isBeamActive) {
      const t = setTimeout(() => {
        if (!mountedRef.current) return;
        // Force a re-measure by nudging the layout-driven effect.
        setTargetLayout(prev => prev);
      }, 120);
      timersRef.current.push(t);
    }
  }, [isBeamActive]);
  const trackTimer = useCallback(
    (id: ReturnType<typeof setTimeout>) => {
      timersRef.current.push(id);
      return id;
    },
    [],
  );
  const trackAnim = useCallback(
    <T extends { stop: () => void }>(anim: T): T => {
      animationsRef.current.push(anim);
      return anim;
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      animationsRef.current.forEach(a => {
        try { a.stop(); } catch { /* already stopped */ }
      });
      animationsRef.current = [];
    };
  }, []);

  // ── Animated values ──
  // Opacity-only values use native driver (the JS thread is the
  // bottleneck during beam execution; native-driver opacity halves
  // the per-frame bridge traffic for the tutorial chrome). Position
  // values (orbX/orbY drive `left`/`top`; portalLeft/Top + portalW/H
  // drive layout) must stay on the JS driver — native driver does
  // not support `left`/`top`/`width`/`height`.
  const orbX = useRef(new Animated.Value(SCREEN_W - 40)).current;
  const orbY = useRef(new Animated.Value(60)).current;
  const portalOpacity = useRef(new Animated.Value(0)).current;
  const portalW = useRef(new Animated.Value(0)).current;
  const portalH = useRef(new Animated.Value(0)).current;
  const calloutOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.45)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const dimOpacity = useRef(new Animated.Value(0)).current;
  const codexTranslate = useRef(new Animated.Value(SCREEN_H)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  // Drives orb color: 0 = eyeColor, 1 = COGS green. JS driver required
  // because Animated color interpolation is not supported on the native
  // driver. Animates in when a codex entry is collected, out on dismiss.
  const orbCollectAnim = useRef(new Animated.Value(0)).current;

  const step = steps[currentStepIndex];
  const totalSteps = steps.length;
  const eyeColor = eyeStateColor(step?.eyeState);
  const isCodexStep = !!(step?.codexEntryId);

  // ── Hydration ──
  useEffect(() => {
    (async () => {
      try {
        const forceShow = await AsyncStorage.getItem('axiom_tutorial_force_show');
        if (!mountedRef.current) return;
        if (forceShow === '1') {
          await AsyncStorage.removeItem('axiom_tutorial_force_show');
          await AsyncStorage.removeItem(`axiom_tutorial_complete_${levelId}`);
          await AsyncStorage.removeItem(`axiom_tutorial_skipped_${levelId}`);
          await AsyncStorage.removeItem(`axiom_tutorial_step_${levelId}`);
          if (!mountedRef.current) return;
          setHydrated(true);
          return;
        }
        const saved = await AsyncStorage.getItem(`axiom_tutorial_step_${levelId}`);
        if (!mountedRef.current) return;
        if (saved) {
          const idx = parseInt(saved, 10);
          if (!isNaN(idx) && idx >= 0 && idx < steps.length) {
            setCurrentStepIndex(idx);
          }
        }
      } catch {
        /* ignore */
      }
      if (!mountedRef.current) return;
      setHydrated(true);
    })();
  }, [levelId, steps.length]);

  // Persist step progress
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(`axiom_tutorial_step_${levelId}`, String(currentStepIndex)).catch(() => {});
  }, [currentStepIndex, levelId, hydrated]);

  // ── Measurement ──
  const measureTarget = useCallback((targetRef: string, cb: (layout: Layout | null) => void) => {
    if (targetRef === 'center') {
      if (!mountedRef.current) return;
      cb({
        x: SCREEN_W / 2 - ORB_SIZE / 2,
        y: SCREEN_H / 2 - ORB_SIZE / 2,
        width: ORB_SIZE,
        height: ORB_SIZE,
      });
      return;
    }
    const ref = targetRefs[targetRef];
    const node = ref?.current;
    if (!node) {
      if (!mountedRef.current) return;
      cb(null);
      return;
    }

    let attempt = 0;
    const retry = () => {
      if (!mountedRef.current) return;
      if (attempt < 3) {
        trackTimer(setTimeout(tryMeasure, 150));
      } else {
        cb(null);
      }
    };
    const onResult = (x: number, y: number, width: number, height: number) => {
      // The native UI thread can fire measure callbacks after the
      // component unmounts (the bridge is asynchronous). Drop them.
      if (!mountedRef.current) return;
      if (width < 4 || height < 4) {
        retry();
        return;
      }
      cb({ x, y, width, height });
    };
    const tryMeasure = () => {
      if (!mountedRef.current) return;
      // Prompt 99B — bail out while the beam is animating so
      // measureInWindow does not race the JS thread
      // (PERFORMANCE_CONTRACT 6.2.1). The post-beam useEffect above
      // re-triggers a measure when isBeamActive flips back to false.
      if (isBeamActiveRef.current) return;
      attempt += 1;
      if (Platform.OS === 'web') {
        // On Expo web findNodeHandle / UIManager.measureInWindow are
        // unreliable. View's measure() returns pageX/pageY in the
        // (x, relX, relY, w, h, pageX, pageY) callback form, but
        // the web implementation uses the simpler (x, y, w, h, pageX, pageY)
        // — just grab the last four args to be safe either way.
        (node as unknown as { measure: (cb: (...args: number[]) => void) => void }).measure?.(
          (...args: number[]) => {
            // Standard RN: (_x, _y, w, h, pageX, pageY)
            const pageX = args.length >= 6 ? args[4] : args[0];
            const pageY = args.length >= 6 ? args[5] : args[1];
            const w = args.length >= 6 ? args[2] : args[2];
            const h = args.length >= 6 ? args[3] : args[3];
            onResult(pageX, pageY, w, h);
          },
        );
      } else {
        const handle = findNodeHandle(node);
        if (handle == null) {
          retry();
          return;
        }
        UIManager.measureInWindow(handle, (x: number, y: number, width: number, height: number) => {
          onResult(x, y, width, height);
        });
      }
    };
    tryMeasure();
  }, [targetRefs, trackTimer]);

  // ── Portal geometry helpers ──
  const computePortalBox = useCallback((layout: Layout) => {
    const rawW = layout.width + PORTAL_PAD * 2;
    const rawH = layout.height + PORTAL_PAD * 2;
    const w = Math.max(PORTAL_MIN, Math.min(rawW, SCREEN_W - PORTAL_MARGIN * 2));
    const h = Math.max(PORTAL_MIN, Math.min(rawH, SCREEN_H - PORTAL_MARGIN * 2 - NAV_HEIGHT));
    const cx = layout.x + layout.width / 2;
    const cy = layout.y + layout.height / 2;
    let left = cx - w / 2;
    let top = cy - h / 2;
    if (left < PORTAL_MARGIN) left = PORTAL_MARGIN;
    if (left + w > SCREEN_W - PORTAL_MARGIN) left = SCREEN_W - PORTAL_MARGIN - w;
    if (top < PORTAL_MARGIN) top = PORTAL_MARGIN;
    if (top + h > SCREEN_H - NAV_HEIGHT - PORTAL_MARGIN) top = SCREEN_H - NAV_HEIGHT - PORTAL_MARGIN - h;
    return { left, top, width: w, height: h };
  }, []);

  const portalBox = useMemo(() => {
    if (!targetLayout) return null;
    if (step?.targetRef === 'center') return null;
    return computePortalBox(targetLayout);
  }, [targetLayout, step, computePortalBox]);

  // ── Callout position ──
  const CALLOUT_W = Math.min(CALLOUT_MAX_W, SCREEN_W - CALLOUT_SIDE_PAD * 2);
  const CALLOUT_H_EST_DEFAULT = 188;
  const CALLOUT_H_EST_LONG = 240;
  const isLongMessage = (step?.message?.length ?? 0) > 200;
  const CALLOUT_H_EST = isLongMessage ? CALLOUT_H_EST_LONG : CALLOUT_H_EST_DEFAULT;

  const calloutPos = useMemo((): { top: number; left: number } | null => {
    if (!targetLayout) return null;
    const midY = SCREEN_H / 2;
    // Horizontal: centered, clamped to margins
    let left = SCREEN_W / 2 - CALLOUT_W / 2;
    if (left < 12) left = 12;
    if (left + CALLOUT_W > SCREEN_W - 12) left = SCREEN_W - 12 - CALLOUT_W;

    if (step?.targetRef === 'center') {
      // Above the orb center
      const bottomOfCallout = SCREEN_H / 2 - ORB_SIZE / 2 - CALLOUT_GAP;
      const top = Math.max(80, bottomOfCallout - CALLOUT_H_EST);
      return { top, left };
    }

    if (!portalBox) return null;
    const portalTop = portalBox.top;
    const portalBottom = portalBox.top + portalBox.height;
    const portalCenterY = portalBox.top + portalBox.height / 2;

    if (portalCenterY < midY) {
      // Target in top half → callout below portal by default. If
      // placing it below would push the bottom past 85% of screen
      // height (long-message overflow), flip above the portal.
      const belowTop = portalBottom + CALLOUT_GAP;
      const belowBottom = belowTop + CALLOUT_H_EST;
      if (belowBottom > SCREEN_H * 0.85) {
        let top = portalTop - CALLOUT_GAP - CALLOUT_H_EST;
        if (top < 80) top = 80;
        return { top, left };
      }
      let top = belowTop;
      const maxTop = SCREEN_H - NAV_HEIGHT - CALLOUT_H_EST - 8;
      if (top > maxTop) top = maxTop;
      return { top, left };
    } else {
      // Target in bottom half → callout above portal
      let top = portalTop - CALLOUT_GAP - CALLOUT_H_EST;
      if (top < 80) top = 80;
      return { top, left };
    }
  }, [targetLayout, portalBox, step, CALLOUT_W, CALLOUT_H_EST]);

  // ── Synchronous reset (between steps) ──
  const resetVisualState = useCallback(() => {
    portalOpacity.setValue(0);
    portalW.setValue(0);
    portalH.setValue(0);
    calloutOpacity.setValue(0);
    glowOpacity.setValue(0);
    orbCollectAnim.setValue(0);
  }, [portalOpacity, portalW, portalH, calloutOpacity, glowOpacity, orbCollectAnim]);

  // ── Fly orb to target ──
  const flyOrbTo = useCallback((cx: number, cy: number, done?: () => void) => {
    const anim = Animated.parallel([
      Animated.spring(orbX, {
        toValue: cx - ORB_SIZE / 2,
        tension: 100,
        friction: 12,
        useNativeDriver: false,
      }),
      Animated.spring(orbY, {
        toValue: cy - ORB_SIZE / 2,
        tension: 100,
        friction: 12,
        useNativeDriver: false,
      }),
    ]);
    trackAnim(anim);
    anim.start(() => {
      if (!mountedRef.current) return;
      done?.();
    });
  }, [orbX, orbY, trackAnim]);

  // ── Animated portal position (for board reveal) ──
  const portalLeft = useRef(new Animated.Value(0)).current;
  const portalTop = useRef(new Animated.Value(0)).current;

  // ── Morph portal in ──
  const morphPortalIn = useCallback((box: { width: number; height: number }, done?: () => void) => {
    portalW.setValue(0);
    portalH.setValue(0);
    portalOpacity.setValue(0);
    const anim = Animated.parallel([
      // portalW/portalH animate width/height — must remain JS driver.
      Animated.timing(portalW, {
        toValue: box.width,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(portalH, {
        toValue: box.height,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // portalOpacity animates the same Animated.View as portalW /
      // portalH (lines ~751, 779). Mixing native + JS drivers on a
      // single node throws "Attempting to run JS driven animation on
      // animated node that has been moved to native earlier" — the
      // Build 5 codex-collection crash (Prompt 93, Fix 1). Keep
      // portalOpacity on the JS driver to match the size animations.
      Animated.timing(portalOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }),
    ]);
    trackAnim(anim);
    anim.start(() => {
      if (!mountedRef.current) return;
      // useNativeDriver: false on glowOpacity AND calloutOpacity is
      // required because both are consumed by conditionally-mounted
      // Animated.View hosts (glowOpacity at line ~934 inside
      // {showPieceGlow && glowCircle && (...)}, calloutOpacity at
      // line ~1010 inside {phase === 'arrived' && calloutPos && (...)}).
      // Each step transition that flips the gate tears down the host's
      // native node and a subsequent Animated.timing(useNativeDriver: true)
      // attaches the value to a fresh host while the native side still
      // holds the prior binding. iOS raises NSException → SIGABRT/SIGSEGV.
      // REQ-A-1 only constrains native-driven values; demoting to JS
      // driver removes the parent-swap constraint. See
      // project-docs/REPORTS/build21-sigsegv-investigation.md.
      const tail = Animated.parallel([
        Animated.timing(glowOpacity, {
          // Brighter steady glow to match the COGS orb's intensity
          // (Prompt 92, Fix 6). Was 0.45 — too dim to read as
          // "highlighted" against the dark void background.
          toValue: 0.85,
          duration: 120,
          useNativeDriver: false,
        }),
        Animated.timing(calloutOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: false,
        }),
      ]);
      trackAnim(tail);
      tail.start(() => {
        if (!mountedRef.current) return;
        done?.();
      });
    });
  }, [portalW, portalH, portalOpacity, glowOpacity, calloutOpacity, trackAnim]);

  // ── Board reveal: expand from orb center to full board ──
  const morphBoardReveal = useCallback((box: { left: number; top: number; width: number; height: number }, done?: () => void) => {
    // Start portal at current orb position (small, centered on orb)
    const currentOrbX = (orbX as any)._value ?? SCREEN_W / 2;
    const currentOrbY = (orbY as any)._value ?? SCREEN_H / 3;
    portalLeft.setValue(currentOrbX);
    portalTop.setValue(currentOrbY);
    portalW.setValue(0);
    portalH.setValue(0);
    portalOpacity.setValue(0);

    const ease = Easing.bezier(0.25, 0.1, 0.25, 1);
    // portalLeft/Top/W/H animate left/top/width/height — JS driver
    // only. portalOpacity rides the same Animated.View, so it must
    // also stay on the JS driver to avoid the "node moved to native"
    // crash (Prompt 93, Fix 1).
    const anim = Animated.parallel([
      Animated.timing(portalLeft, { toValue: box.left, duration: 400, easing: ease, useNativeDriver: false }),
      Animated.timing(portalTop, { toValue: box.top, duration: 400, easing: ease, useNativeDriver: false }),
      Animated.timing(portalW, { toValue: box.width, duration: 400, easing: ease, useNativeDriver: false }),
      Animated.timing(portalH, { toValue: box.height, duration: 400, easing: ease, useNativeDriver: false }),
      Animated.timing(portalOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
    ]);
    trackAnim(anim);
    anim.start(() => {
      if (!mountedRef.current) return;
      // useNativeDriver: false on calloutOpacity — its host
      // ({phase === 'arrived' && calloutPos && <Animated.View ...>})
      // remounts on every step transition. See the comment in
      // morphPortalIn above and
      // project-docs/REPORTS/build21-sigsegv-investigation.md.
      const tail = Animated.timing(calloutOpacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: false,
      });
      trackAnim(tail);
      tail.start(() => {
        if (!mountedRef.current) return;
        done?.();
      });
    });
  }, [portalLeft, portalTop, portalW, portalH, portalOpacity, calloutOpacity, orbX, orbY, trackAnim]);

  // ── Advance to the current step's target ──
  const runStep = useCallback((idx: number) => {
    const s = steps[idx];
    if (!s) return;
    if (!mountedRef.current) return;
    resetVisualState();
    setTargetLayout(null);
    setPhase('flying');

    measureTarget(s.targetRef, (layout) => {
      if (!mountedRef.current) return;
      if (!layout) {
        // Fallback: treat as center so something still shows
        const fallback: Layout = {
          x: SCREEN_W / 2 - ORB_SIZE / 2,
          y: SCREEN_H / 2 - ORB_SIZE / 2,
          width: ORB_SIZE,
          height: ORB_SIZE,
        };
        setTargetLayout(fallback);
        flyOrbTo(SCREEN_W / 2, SCREEN_H / 2, () => {
          if (!mountedRef.current) return;
          setPhase('arrived');
        });
        return;
      }
      setTargetLayout(layout);
      const isCenter = s.targetRef === 'center';
      const box = isCenter ? null : computePortalBox(layout);
      const centerX = box ? box.left + box.width / 2 : layout.x + layout.width / 2;
      const centerY = box ? box.top + box.height / 2 : layout.y + layout.height / 2;
      flyOrbTo(centerX, centerY, () => {
        if (!mountedRef.current) return;
        setPhase('arrived');
        if (box) {
          if (s.targetRef === 'boardGrid') {
            morphBoardReveal(box);
          } else {
            morphPortalIn({ width: box.width, height: box.height });
          }
        } else {
          // Center step: no portal. Just fade callout in.
          // useNativeDriver: false — calloutOpacity host remounts
          // across step transitions. See
          // project-docs/REPORTS/build21-sigsegv-investigation.md.
          const tail = Animated.timing(calloutOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          });
          trackAnim(tail);
          tail.start();
        }
      });
    });
  }, [steps, resetVisualState, measureTarget, flyOrbTo, computePortalBox, morphPortalIn, morphBoardReveal, calloutOpacity, trackAnim]);

  // ── Mount / hydration entrance (runs once when hydrated) ──
  // The ref is checked *inside* the timeout callback, not before
  // scheduling it. This survives React 18+ strict mode's
  // effect → cleanup → effect re-run pattern: the first run's timeout
  // is cancelled by cleanup, the second run reschedules, and the ref
  // guards against double-firing when the second timeout resolves.
  const didStartRef = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (didStartRef.current) return;
    const dim = Animated.timing(dimOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    });
    trackAnim(dim);
    dim.start();
    // Short delay so GameplayScreen's layout settles before first measure
    const t = setTimeout(() => {
      if (!mountedRef.current) return;
      if (didStartRef.current) return;
      didStartRef.current = true;
      runStep(currentStepIndex);
    }, 400);
    trackTimer(t);
    return () => clearTimeout(t);
  }, [hydrated, currentStepIndex, runStep, dimOpacity, trackAnim, trackTimer]);

  // ── Glow pulse loop ──
  // Oscillates between 0.7 and 1.0 (was 0..1) so the rings stay
  // visibly bright — close to the COGS orb's intensity — and only
  // breathe in the top portion of the existing interpolation curves
  // (Prompt 92, Fix 6). Each ring's outputRange is preserved; this
  // change just narrows the input the rings sample from to the
  // bright end of their gradient.
  //
  // useNativeDriver: false is required because glowPulse is consumed
  // by seven different Animated.View hosts (4 portal corners + 2
  // piece-glow rings + N spotlight rings) that mount and unmount
  // independently across step transitions. REQ-A-1 forbids a
  // native-driven value to span multiple hosts (Build 20 A1-1 SIGABRT,
  // see project-docs/REPORTS/build20-a1-1-sigabrt-investigation.md).
  // The JS driver carries the cost of small opacity interpolations
  // on chrome elements only; the surrounding portal tree already
  // runs on JS driver for the same reason (Prompt 93 Fix 1).
  const showPieceGlow = !!step && !SECTION_TARGETS.has(step.targetRef) && phase === 'arrived';
  useEffect(() => {
    if (!showPieceGlow) return;
    glowPulse.setValue(0.7);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.7,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    trackAnim(loop);
    loop.start();
    return () => loop.stop();
  }, [showPieceGlow, glowPulse, trackAnim]);

  // ── Codex slide ──
  useEffect(() => {
    if (codexVisible) {
      // useNativeDriver: false — codexTranslate's host is conditionally
      // mounted ({codexVisible && codexEntry && <Animated.View ...>}).
      // Each codex open/close tears down and remounts the host's native
      // node, so REQ-A-1 forbids native-driver here. See
      // project-docs/REPORTS/build21-sigsegv-investigation.md.
      const slide = Animated.timing(codexTranslate, {
        toValue: 0,
        duration: 200,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      });
      trackAnim(slide);
      slide.start();
    } else {
      codexTranslate.setValue(SCREEN_H);
    }
  }, [codexVisible, codexTranslate, trackAnim]);

  // ── Exit animation ──
  const exitOverlay = useCallback((after: () => void) => {
    if (!mountedRef.current) {
      after();
      return;
    }
    setPhase('complete');
    const anim = Animated.timing(exitOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    });
    trackAnim(anim);
    anim.start(() => {
      // `after` is the parent's onComplete/onSkip callback. The parent
      // setting `tutorialComplete` causes us to unmount, so this can
      // legitimately fire during teardown — invoke `after` regardless
      // of mountedRef so the parent flag flips, but skip our own
      // setState afterwards.
      after();
    });
  }, [exitOpacity, trackAnim]);

  // ── Step controls ──
  const advanceStep = useCallback(() => {
    if (!mountedRef.current) return;
    if (currentStepIndex >= totalSteps - 1) {
      AsyncStorage.setItem(`axiom_tutorial_complete_${levelId}`, '1').catch(() => {});
      AsyncStorage.removeItem(`axiom_tutorial_step_${levelId}`).catch(() => {});
      exitOverlay(onComplete);
      return;
    }
    const next = currentStepIndex + 1;
    setCurrentStepIndex(next);
    runStep(next);
  }, [currentStepIndex, totalSteps, levelId, onComplete, exitOverlay, runStep]);

  const handlePrimary = useCallback(() => {
    if (phase === 'arrived' && step?.codexEntryId) {
      // A1-1 batch: source + terminal are catalogued silently; conveyor
      // shows one combined view for all three pieces together.
      if (levelId === 'A1-1' && (step.codexEntryId === 'source' || step.codexEntryId === 'terminal')) {
        useCodexStore.getState().markDiscovered(step.codexEntryId);
        advanceStep();
        return;
      }
      if (levelId === 'A1-1' && step.codexEntryId === 'conveyor') {
        useCodexStore.getState().markDiscovered('source');
        useCodexStore.getState().markDiscovered('terminal');
        useCodexStore.getState().markDiscovered('conveyor');
        const srcEntry = getCodexEntry('source');
        const trmEntry = getCodexEntry('terminal');
        setCodexAlsoCollected(
          [srcEntry, trmEntry].filter((e): e is PieceEntry => e !== null),
        );
        setCodexVisible(true);
        setPhase('codex');
        return;
      }
      // Normal: mark discovered and open the codex view for this step.
      // Discovery is monotonic — re-marking is a no-op (Prompt 92, Fix 8).
      useCodexStore.getState().markDiscovered(step.codexEntryId);
      // Orb transitions to green during the collection sequence.
      const colorIn = Animated.timing(orbCollectAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      trackAnim(colorIn);
      colorIn.start();
      setCodexVisible(true);
      setPhase('codex');
      return;
    }
    advanceStep();
  }, [phase, step, levelId, advanceStep, orbCollectAnim, trackAnim]);

  const handleSkip = useCallback(() => {
    AsyncStorage.setItem(`axiom_tutorial_skipped_${levelId}`, '1').catch(() => {});
    exitOverlay(onSkip);
  }, [levelId, onSkip, exitOverlay]);

  const handleCodexUnderstood = useCallback(() => {
    // useNativeDriver: false — see slide-in comment above and
    // project-docs/REPORTS/build21-sigsegv-investigation.md.
    const slideOut = Animated.timing(codexTranslate, {
      toValue: SCREEN_H,
      duration: 200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    });
    trackAnim(slideOut);
    slideOut.start(() => {
      if (!mountedRef.current) return;
      // Orb transitions back to its step eyeColor after the codex dismisses.
      const colorOut = Animated.timing(orbCollectAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      trackAnim(colorOut);
      colorOut.start();
      setCodexAlsoCollected([]);
      setCodexVisible(false);
      advanceStep();
    });
  }, [codexTranslate, advanceStep, trackAnim, orbCollectAnim]);

  // Advance when the matching piece type is placed (awaitPlacement steps).
  // The sequence number guards against re-firing when the same type repeats
  // across levels; it is only reset on full overlay remount.
  const lastPlacedSeqRef = useRef<number | null>(null);
  useEffect(() => {
    if (!lastPlacedTrigger) return;
    if (lastPlacedSeqRef.current === lastPlacedTrigger.seq) return;
    lastPlacedSeqRef.current = lastPlacedTrigger.seq;
    if (step?.awaitPlacement === lastPlacedTrigger.type && phase === 'arrived') {
      advanceStep();
    }
  }, [lastPlacedTrigger, step, phase, advanceStep]);

  // Advance when the matching piece type is tapped (awaitPieceTap steps).
  const lastTappedSeqRef = useRef<number | null>(null);
  useEffect(() => {
    if (!lastTappedTrigger) return;
    if (lastTappedSeqRef.current === lastTappedTrigger.seq) return;
    lastTappedSeqRef.current = lastTappedTrigger.seq;
    if (step?.awaitPieceTap === lastTappedTrigger.type && phase === 'arrived') {
      advanceStep();
    }
  }, [lastTappedTrigger, step, phase, advanceStep]);

  // Tap anywhere to advance (or open codex for codex steps).
  // awaitPlacement steps do not advance on tap — the dim backdrop is also
  // non-interactive in that mode, so this guard is a belt-and-suspenders.
  const handleTapAnywhere = useCallback(() => {
    if (phase !== 'arrived') return;
    if (codexVisible) return;
    if (step?.awaitPlacement) return;
    handlePrimary();
  }, [phase, codexVisible, step, handlePrimary]);

  if (!hydrated || !step) return null;

  const codexEntry = step.codexEntryId ? getCodexEntry(step.codexEntryId) : null;

  // ── Spotlight ring positions (A1-1 only) ──
  const isBoardStep = step.targetRef === 'boardGrid';
  const showSpotlights =
    isBoardStep &&
    levelId === 'A1-1' &&
    phase === 'arrived' &&
    !!targetLayout &&
    !!spotlightCells &&
    spotlightCells.length > 0 &&
    !!spotlightCellSize &&
    spotlightCellSize > 0;

  // Glow circle geometry (for piece targets)
  let glowCircle: { cx: number; cy: number; r: number } | null = null;
  if (showPieceGlow && targetLayout) {
    const cx = targetLayout.x + targetLayout.width / 2;
    const cy = targetLayout.y + targetLayout.height / 2;
    const r = Math.min(targetLayout.width, targetLayout.height) * 0.4;
    glowCircle = { cx, cy, r };
  }
  // Codex steps always use amber portal border + purple circle (universal collection standard).
  // Non-codex port targets (sourceNode/outputNode) keep purple. Others use eyeColor.
  const glowColor = (isCodexStep || (step && PORT_TARGETS.has(step.targetRef))) ? '#8B5CF6' : eyeColor;

  const renderMessage = () => {
    const text = step.message;
    const isLong = text.length > 200;
    const messageStyle = isLong ? [st.message, st.longMessage] : st.message;
    const blueWords = step.highlightWords ?? [];
    const amberWords = step.highlightAmberWords ?? [];
    const all = [
      ...amberWords.map(w => ({ word: w, color: '#F0B429' })),
      ...blueWords.map(w => ({ word: w, color: '#00D4FF' })),
    ];
    if (all.length === 0) return <Text style={messageStyle}>{text}</Text>;
    const escaped = all.map(h => h.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`(${escaped.join('|')})`, 'g');
    const parts = text.split(re);
    return (
      <Text style={messageStyle}>
        {parts.map((part, i) => {
          const hit = all.find(h => h.word === part);
          if (hit) return <Text key={i} style={{ color: hit.color, fontWeight: '600' }}>{part}</Text>;
          return <Text key={i}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { opacity: exitOpacity }]}
    >
      {/* Dim backdrop — always-mounted so dimOpacity's native node never
          detaches and remounts across step transitions. Separating the
          Animated.View from the tap handler avoids the "node moved to
          native" SIGABRT (same pattern as portalOpacity, Prompt 93 Fix 1). */}
      <Animated.View pointerEvents="none" style={[st.dim, { opacity: dimOpacity }]} />
      {!(step?.awaitPlacement || step?.allowPieceTap) && (
        <Pressable onPress={handleTapAnywhere} style={StyleSheet.absoluteFill} />
      )}

      {/* Portal (rendered when arrived/codex and not center) */}
      {phase !== 'flying' && phase !== 'idle' && portalBox && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: isBoardStep ? portalLeft : portalBox.left,
            top: isBoardStep ? portalTop : portalBox.top,
            width: portalW,
            height: portalH,
            opacity: portalOpacity,
            borderWidth: 1.5,
            borderColor: isCodexStep ? '#F0B429' : eyeColor,
            borderRadius: 10,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 150,
          }}
        >
          {/* Corner brackets — precision targeting brackets */}
          <Animated.View style={[st.corner, { top: -3, left: -3, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 3, shadowColor: '#F0B429', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4 }, { opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]} />
          <Animated.View style={[st.corner, { top: -3, right: -3, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 3, shadowColor: '#F0B429', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4 }, { opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]} />
          <Animated.View style={[st.corner, { bottom: -3, left: -3, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 3, shadowColor: '#F0B429', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4 }, { opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]} />
          <Animated.View style={[st.corner, { bottom: -3, right: -3, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 3, shadowColor: '#F0B429', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4 }, { opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]} />
        </Animated.View>
      )}

      {/* Portal label (above portal). Centered across the full screen
          width so short labels like "CONFIG NODE" never have to wrap
          even when the portal is narrow. */}
      {phase !== 'flying' && phase !== 'idle' && portalBox && step.label && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: portalBox.top - 24,
            left: 0,
            right: 0,
            alignItems: 'center',
            opacity: portalOpacity,
            zIndex: 151,
          }}
        >
          <Text style={st.label} numberOfLines={1}>{step.label}</Text>
        </Animated.View>
      )}

      {/* Piece glow (steady fill + inner bright layer + pulsing outer ring).
          The steady fill casts a shadow so the glow reads as light
          leaking past the piece icon, not a dim blob behind it. */}
      {showPieceGlow && glowCircle && (
        <>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: glowCircle.cx - glowCircle.r,
              top: glowCircle.cy - glowCircle.r,
              width: glowCircle.r * 2,
              height: glowCircle.r * 2,
              borderRadius: glowCircle.r,
              backgroundColor: glowColor,
              opacity: glowOpacity,
              shadowColor: glowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 12,
              zIndex: 152,
            }}
          />
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: glowCircle.cx - glowCircle.r * 0.6,
              top: glowCircle.cy - glowCircle.r * 0.6,
              width: glowCircle.r * 1.2,
              height: glowCircle.r * 1.2,
              borderRadius: glowCircle.r * 0.6,
              backgroundColor: glowColor,
              opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }),
              zIndex: 152,
            }}
          />
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: glowCircle.cx - glowCircle.r * 1.2,
              top: glowCircle.cy - glowCircle.r * 1.2,
              width: glowCircle.r * 2.4,
              height: glowCircle.r * 2.4,
              borderRadius: glowCircle.r * 1.2,
              borderWidth: 2,
              borderColor: glowColor,
              opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] }),
              zIndex: 152,
            }}
          />
        </>
      )}

      {/* A1-1 spotlight rings on source/terminal inside board portal */}
      {showSpotlights && targetLayout && spotlightCells && spotlightCellSize && spotlightCells.map((sc, i) => {
        const cs = spotlightCellSize;
        const r = cs * 0.45;
        const cx = targetLayout.x + sc.col * cs + cs / 2;
        const cy = targetLayout.y + sc.row * cs + cs / 2;
        return (
          <Animated.View
            key={`spot-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: cx - r,
              top: cy - r,
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              borderWidth: 2,
              borderColor: sc.color,
              opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] }),
              zIndex: 153,
            }}
          />
        );
      })}

      {/* Callout */}
      {phase === 'arrived' && calloutPos && (
        <Animated.View
          pointerEvents="auto"
          style={[
            st.callout,
            {
              top: calloutPos.top,
              left: calloutPos.left,
              width: CALLOUT_W,
              opacity: calloutOpacity,
            },
          ]}
        >
          <TouchableOpacity onPress={handleSkip} style={st.skipBtn} activeOpacity={0.7}>
            <Text style={st.skipBtnText}>SKIP</Text>
          </TouchableOpacity>
          {step?.allowPieceTap ? (
            <TouchableOpacity onPress={handlePrimary} activeOpacity={0.85}>
              {renderMessage()}
            </TouchableOpacity>
          ) : renderMessage()}
        </Animated.View>
      )}

      {/* Orb (always above everything during tutorial) */}
      {phase !== 'idle' && phase !== 'complete' && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: orbX,
            top: orbY,
            width: ORB_SIZE,
            height: ORB_SIZE,
            borderRadius: ORB_SIZE / 2,
            borderWidth: 1.5,
            borderColor: orbCollectAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [eyeColor, COGS_EYE_COLORS.GREEN.solid],
            }),
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: eyeColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 10,
            zIndex: 200,
          }}
        >
          <Animated.View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: orbCollectAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [eyeColor, COGS_EYE_COLORS.GREEN.solid],
              }),
            }}
          />
        </Animated.View>
      )}

      {/* Codex overlay */}
      {codexVisible && codexEntry && (
        <Animated.View
          pointerEvents="auto"
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateY: codexTranslate }], zIndex: 250, backgroundColor: Colors.void, elevation: 250 },
          ]}
        >
          <CodexDetailView
            entry={codexEntry}
            onUnderstood={handleCodexUnderstood}
            alsoCollected={codexAlsoCollected.length > 0 ? codexAlsoCollected : undefined}
          />
        </Animated.View>
      )}

    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,5,12,0.72)',
  },
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#F0B429',
  },
  label: {
    fontFamily: Fonts.spaceMono,
    fontSize: 13,
    color: '#F0B429',
    letterSpacing: 2,
  },
  callout: {
    position: 'absolute',
    backgroundColor: 'rgba(6,9,18,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.15)',
    borderRadius: 8,
    // Extra top padding keeps the message text below the SKIP button
    // pinned at top:6 right:8.
    paddingTop: 28,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 160,
  },
  skipBtn: {
    position: 'absolute',
    top: 6,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    zIndex: 161,
  },
  skipBtnText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: '#4a6080',
    letterSpacing: 1.5,
  },
  message: {
    fontFamily: Fonts.spaceMono,
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  longMessage: {
    fontSize: 13,
    lineHeight: 19,
  },
});

// React.memo wrapper (Prompt 99B). The overlay re-renders only when
// the active step, the targetRefs identity, or the isBeamActive flag
// changes. Default shallow comparison covers all current props since
// targetRefs is memoized at the GameplayScreen call site.
export default React.memo(TutorialHUDOverlayComponent);
