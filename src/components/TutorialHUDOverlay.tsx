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
  AccessibilityInfo,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TutorialStep, PieceType } from '../game/types';
import type { PlacedTrigger, TappedTrigger } from '../hooks/useGameplayTutorial';
import { Colors, Fonts } from '../theme/tokens';
import CodexDetailView, { getCodexEntry, getCodexEntryNumber, type PieceEntry } from './CodexDetailView';
import { useCodexStore } from '../store/codexStore';
import { COGS_AI_ORB_COLORS } from '../constants/cogsAIOrbColors';
import { toOverlaySpace } from '../game/overlaySpace';
import { TRAY_FOCUS_SETTLE_MS } from '../game/trayFocus';
import {
  PERCH_ORB_SIZE,
  DISCOVERY_FLIGHT_MS,
  DISCOVERY_FLIGHT_BEZIER,
  CODEX_SLIDE_MS,
  COLLECT_CROSSFADE_MS,
  REDUCED_MOTION_FADE_MS,
  LOOK_IN_MS,
  LOOK_OUT_MS,
  isPerchStep,
  computeDiscoveryPerch,
  boardCellLayout,
  planFlight,
  flightPointAt,
  lookOffset,
  captionDelayMs,
  codexDockPoint,
  type FlightPath,
  type PieceResolution,
} from '../game/discoveryFlight';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// AXM-031 spec 3.3: the orb and the perch math share one size.
const ORB_SIZE = PERCH_ORB_SIZE;
const PORTAL_PAD = 12;
const PORTAL_MIN = 64;
const PORTAL_MARGIN = 8;
const NAV_HEIGHT = 64;
const CALLOUT_MAX_W = 360;
const CALLOUT_GAP = 12;
const CALLOUT_SIDE_PAD = 24;
const CALLOUT_UPPER_TOP = 80;
// CALLOUT_LOWER_TOP computed inline below (depends on CALLOUT_H_EST)

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
  // Tray tutorial — external event signals for awaitPlacement and awaitPieceTap.
  // Incremented sequence numbers prevent duplicate-fire when the same type repeats.
  lastPlacedTrigger?: PlacedTrigger | null;
  lastTappedTrigger?: TappedTrigger | null;
  // Tucker, build 48: a step that targets a tray piece asks the parent to
  // slide it into the tray's centre frame first. Returns true when the piece
  // moved, so the spotlight waits for the scroll to land before measuring.
  bringTargetIntoView?: (targetRef: string) => boolean;
  // AXM-031 spec 7.4: resolves a step's targetPiece (a type) to a board cell
  // or a tray ref at runtime. Never a piece id or a coordinate from data.
  resolveTargetPiece?: (type: PieceType) => PieceResolution;
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
  bringTargetIntoView,
  resolveTargetPiece,
}: Props) {
  // Held in a ref so a new callback identity from the parent never rebuilds
  // runStep (and with it the step effects).
  const bringTargetIntoViewRef = useRef(bringTargetIntoView);
  bringTargetIntoViewRef.current = bringTargetIntoView;
  const resolveTargetPieceRef = useRef(resolveTargetPiece);
  resolveTargetPieceRef.current = resolveTargetPiece;
  const cellSizeRef = useRef(spotlightCellSize);
  cellSizeRef.current = spotlightCellSize;
  // ── State ──
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [hydrated, setHydrated] = useState(false);
  const [targetLayout, setTargetLayout] = useState<Layout | null>(null);
  // AXM-031 spec 7.5: what the current step actually points at once
  // targetPiece is resolved. A ref key ('boardGrid', 'trayMerger', ...) or a
  // board cell ('cell:x,y'). Every per-target branch reads this, not
  // step.targetRef. 'fallback' marks an unresolved targetPiece (spec 7.6):
  // rendered as a plain boardGrid codex step, no caption.
  const [resolvedTarget, setResolvedTarget] = useState<string | null>(null);
  const [targetFallback, setTargetFallback] = useState(false);
  // Design DR-10: the orb rides above the Codex while docked.
  const [orbDocked, setOrbDocked] = useState(false);
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

  // ── Reduced motion (AXM-031 spec 10.1) ──
  const reduceMotionRef = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(v => { reduceMotionRef.current = v; })
      .catch(() => { /* platform without the setting */ });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (v: boolean) => { reduceMotionRef.current = v; },
    );
    return () => sub.remove();
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
  // AXM-031 spec 9.1: the orb host is always mounted; this is its visibility
  // (0 in idle and complete). Same host as orbX/orbY, so JS driver only.
  const orbOpacity = useRef(new Animated.Value(0)).current;
  // Design DR-6: the core's 3dp look. Its own child host, JS driver.
  const lookX = useRef(new Animated.Value(0)).current;
  const lookY = useRef(new Animated.Value(0)).current;
  // The perch the orb sits on for the current perch step, so the Codex dock
  // can ride back down to it (design DR-12). Null off a perch.
  const perchRef = useRef<{ x: number; y: number } | null>(null);

  const step = steps[currentStepIndex];
  const totalSteps = steps.length;
  // AXM-031 spec 5.1 (Tucker 2026-09-26): the orb follows the step's eye
  // state on every step, so it is amber on the '???' notice beat and turns
  // green only on collection. Replaces the 2026-06-13 green-on-'???' rule.
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
  // The overlay's root, measured alongside each target so spotlight boxes
  // land in the overlay's own coordinate space.
  const overlayRootRef = useRef<View>(null);
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
          // Convert to the overlay's own space: measure its root the same
          // way and subtract. Falls back to raw window space if the root
          // can't be measured.
          const rootHandle = overlayRootRef.current ? findNodeHandle(overlayRootRef.current) : null;
          if (rootHandle == null) {
            onResult(x, y, width, height);
            return;
          }
          UIManager.measureInWindow(rootHandle, (rx: number, ry: number) => {
            const l = toOverlaySpace({ x, y, width, height }, { x: rx, y: ry });
            onResult(l.x, l.y, l.width, l.height);
          });
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

    const centeredLeft = Math.max(
      12,
      Math.min(SCREEN_W / 2 - CALLOUT_W / 2, SCREEN_W - 12 - CALLOUT_W),
    );

    const CALLOUT_LOWER_TOP = SCREEN_H - NAV_HEIGHT - 16 - CALLOUT_H_EST;

    // Presentation Mode center step — orb centered, no spotlight — always upper
    if (step?.targetRef === 'center') {
      return { top: CALLOUT_UPPER_TOP, left: centeredLeft };
    }

    // Two-position rule: target in lower half of screen → card upper.
    // Target in upper half → card lower.
    const portalCenterY = portalBox
      ? portalBox.top + portalBox.height / 2
      : targetLayout.y + targetLayout.height / 2;

    if (portalCenterY > SCREEN_H / 2) {
      return { top: CALLOUT_UPPER_TOP, left: centeredLeft };
    } else {
      return { top: CALLOUT_LOWER_TOP, left: centeredLeft };
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

  // ── Show the orb (AXM-031 spec 9.1) ──
  const showOrb = useCallback(() => {
    const anim = Animated.timing(orbOpacity, {
      toValue: 1,
      duration: REDUCED_MOTION_FADE_MS,
      useNativeDriver: false,
    });
    trackAnim(anim);
    anim.start();
  }, [orbOpacity, trackAnim]);

  const orbCentre = useCallback(() => ({
    x: ((orbX as any)._value ?? SCREEN_W - 40) + ORB_SIZE / 2,
    y: ((orbY as any)._value ?? 60) + ORB_SIZE / 2,
  }), [orbX, orbY]);

  // ── Discovery flight (AXM-031; design DR-1 to DR-5, spec 3.1, 10.2) ──
  // One 600ms JS-driven timeline. A listener maps linear progress onto the
  // arc-and-zip path (flightPointAt: 480ms zip to a 6dp overshoot, 120ms
  // settle) and writes the orb's own orbX/orbY values, so the single orb
  // host is unchanged. Reduced motion: fade out, jump, fade in; no travel.
  const flyDiscovery = useCallback((cx: number, cy: number, done?: () => void) => {
    const finish = () => {
      if (!mountedRef.current) return;
      done?.();
    };
    if (reduceMotionRef.current) {
      const out = Animated.timing(orbOpacity, {
        toValue: 0, duration: REDUCED_MOTION_FADE_MS, useNativeDriver: false,
      });
      trackAnim(out);
      out.start(() => {
        if (!mountedRef.current) return;
        orbX.setValue(cx - ORB_SIZE / 2);
        orbY.setValue(cy - ORB_SIZE / 2);
        const back = Animated.timing(orbOpacity, {
          toValue: 1, duration: REDUCED_MOTION_FADE_MS, useNativeDriver: false,
        });
        trackAnim(back);
        back.start(finish);
      });
      return;
    }
    const path: FlightPath = planFlight(orbCentre(), { x: cx, y: cy }, { screenW: SCREEN_W, screenH: SCREEN_H });
    const progress = new Animated.Value(0);
    const id = progress.addListener(({ value }) => {
      const p = flightPointAt(path, value);
      orbX.setValue(p.x - ORB_SIZE / 2);
      orbY.setValue(p.y - ORB_SIZE / 2);
    });
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: DISCOVERY_FLIGHT_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    trackAnim(anim);
    anim.start(() => {
      progress.removeListener(id);
      if (!mountedRef.current) return;
      orbX.setValue(cx - ORB_SIZE / 2);
      orbY.setValue(cy - ORB_SIZE / 2);
      finish();
    });
  }, [orbX, orbY, orbOpacity, orbCentre, trackAnim]);

  // ── Arrival look (design DR-6, DR-7) ──
  // The core leans 3dp toward the target, holds, and returns as the '???'
  // starts. `then` fires at the release (400ms after landing), or at once
  // under reduced motion, which skips the look.
  const lookAt = useCallback((target: { x: number; y: number }, then: () => void) => {
    const delay = captionDelayMs(reduceMotionRef.current);
    if (delay === 0) { then(); return; }
    const off = lookOffset(orbCentre(), target);
    const ease = Easing.bezier(...DISCOVERY_FLIGHT_BEZIER);
    const lean = Animated.parallel([
      Animated.timing(lookX, { toValue: off.x, duration: LOOK_IN_MS, easing: ease, useNativeDriver: false }),
      Animated.timing(lookY, { toValue: off.y, duration: LOOK_IN_MS, easing: ease, useNativeDriver: false }),
    ]);
    trackAnim(lean);
    lean.start();
    trackTimer(setTimeout(() => {
      if (!mountedRef.current) return;
      const back = Animated.parallel([
        Animated.timing(lookX, { toValue: 0, duration: LOOK_OUT_MS, easing: ease, useNativeDriver: false }),
        Animated.timing(lookY, { toValue: 0, duration: LOOK_OUT_MS, easing: ease, useNativeDriver: false }),
      ]);
      trackAnim(back);
      back.start();
      then();
    }, delay));
  }, [lookX, lookY, orbCentre, trackAnim, trackTimer]);

  // ── Animated portal position (for board reveal) ──
  const portalLeft = useRef(new Animated.Value(0)).current;
  const portalTop = useRef(new Animated.Value(0)).current;

  // UX-07 (Presentation Mode, SPEC-01): track the previous step's target
  // and the board-outline geometry it settled on. When two consecutive
  // steps target the same boardGrid element with an unchanged layout, the
  // outline must persist without replaying its expand animation — the
  // playtest flagged the board outline reloading/flickering on every tap.
  const previousTargetRef = useRef<string | null>(null);
  const previousBoardBoxRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);

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

    // AXM-031 spec 7.1-7.6: resolve targetPiece to what this step points at.
    // A board piece measures the boardGrid and derives its cell; a tray piece
    // behaves exactly like an Axiom tray step on that ref; nothing found falls
    // back to the step's own targetRef (boardGrid), rendered as master did.
    let measureRef = s.targetRef;
    let effective = s.targetRef;
    let cell: { gridX: number; gridY: number } | null = null;
    let fallback = false;
    if (s.targetPiece) {
      const r = resolveTargetPieceRef.current?.(s.targetPiece) ?? null;
      if (r?.where === 'tray') {
        measureRef = r.refKey;
        effective = r.refKey;
      } else if (r?.where === 'board' && (cellSizeRef.current ?? 0) > 0) {
        measureRef = 'boardGrid';
        effective = `cell:${r.gridX},${r.gridY}`;
        cell = { gridX: r.gridX, gridY: r.gridY };
      } else {
        fallback = true;
      }
    }
    const perch = !fallback && isPerchStep(steps, idx);
    // Coming off a perch onto a non-perch step flies home with the same
    // discovery flight (design DR-5, spec 2.9); home-to-home keeps the spring.
    const fromPerch = !!perchRef.current;

    // UX-07: when this step targets the same boardGrid element as the
    // previous step, the outline is already drawn. Snap it to its settled
    // geometry and refresh only the dialogue card — do NOT tear it down
    // (resetVisualState / flying phase) or replay the expand morph, which
    // is what made the board outline reload/flicker on every tap.
    const willPersistBoard =
      effective === 'boardGrid' &&
      previousTargetRef.current === 'boardGrid' &&
      !!previousBoardBoxRef.current &&
      !fromPerch;

    setResolvedTarget(effective);
    setTargetFallback(fallback);

    if (willPersistBoard) {
      previousTargetRef.current = effective;
      setPhase('arrived');
      measureTarget(s.targetRef, (layout) => {
        if (!mountedRef.current) return;
        const box = layout ? computePortalBox(layout) : previousBoardBoxRef.current!;
        if (layout) setTargetLayout(layout);
        previousBoardBoxRef.current = box;
        // Snap the outline in place (no expand animation) and fade the new
        // card in. portalLeft/Top/W/H + portalOpacity stay on the JS driver.
        portalLeft.setValue(box.left);
        portalTop.setValue(box.top);
        portalW.setValue(box.width);
        portalH.setValue(box.height);
        portalOpacity.setValue(1);
        glowOpacity.setValue(0.85);
        calloutOpacity.setValue(0);
        const tail = Animated.timing(calloutOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: false,
        });
        trackAnim(tail);
        tail.start();
      });
      return;
    }

    previousTargetRef.current = effective;
    resetVisualState();
    setTargetLayout(null);
    setPhase('flying');
    showOrb();

    const moved = bringTargetIntoViewRef.current?.(measureRef) ?? false;
    const measure = (cb: (layout: Layout | null) => void) => {
      const run = () => {
        if (!s.targetPiece) { measureTarget(s.targetRef, cb); return; }
        measureTarget(measureRef, (layout) => {
          if (layout && cell) {
            cb(boardCellLayout(layout, cellSizeRef.current!, cell.gridX, cell.gridY));
            return;
          }
          cb(layout);
        });
      };
      if (!moved) { run(); return; }
      trackTimer(setTimeout(() => {
        if (!mountedRef.current) return;
        run();
      }, TRAY_FOCUS_SETTLE_MS));
    };

    measure((layout) => {
      if (!mountedRef.current) return;
      if (!layout) {
        // Fallback: treat as center so something still shows
        const fallbackLayout: Layout = {
          x: SCREEN_W / 2 - ORB_SIZE / 2,
          y: SCREEN_H / 2 - ORB_SIZE / 2,
          width: ORB_SIZE,
          height: ORB_SIZE,
        };
        perchRef.current = null;
        setTargetLayout(fallbackLayout);
        flyOrbTo(SCREEN_W / 2, SCREEN_H / 2, () => {
          if (!mountedRef.current) return;
          setPhase('arrived');
        });
        return;
      }
      setTargetLayout(layout);
      const isCenter = effective === 'center';
      const box = isCenter ? null : computePortalBox(layout);

      // PROMPT_127 Fix 1: drive dim from the active step's target. Tray
      // steps dim 0.45; placedPiece (codex + tap) steps dim 0; any
      // other step leaves dim where it is. Animation is 250ms ease-out
      // on every step transition so the board reveal feels uniform
      // regardless of which event got us here. dimOpacity lives on a
      // single always-mounted Animated.View host, so native driver is
      // safe under REQ-A-1. AXM-031 DR-15: a board-piece discovery dims
      // like a tray identify step.
      const trayTarget = s.targetRef?.startsWith('tray') || measureRef.startsWith('tray');
      const cellTarget = !!cell;
      const placedPieceTarget = effective === 'placedPiece';
      if (trayTarget || cellTarget || placedPieceTarget) {
        // PROMPT_128: a tray step that is awaiting placement is the "act"
        // step — the board must be fully in focus for the drag, so dim → 0.
        // A tray step without awaitPlacement is the "identify" step — keep
        // the light dim so the square reads. placedPiece stays 0.
        const dimTarget = ((trayTarget || cellTarget) && !s.awaitPlacement) ? 0.45 : 0;
        const dimAnim = Animated.timing(dimOpacity, {
          toValue: dimTarget,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        trackAnim(dimAnim);
        dimAnim.start();
      }

      // Reveal the target: portal (or board outline) and caption, then card.
      const reveal = () => {
        if (!mountedRef.current) return;
        setPhase('arrived');
        if (box) {
          if (effective === 'boardGrid') {
            // UX-07: remember the settled board outline so the next step,
            // if it targets boardGrid again, can persist it without replay.
            previousBoardBoxRef.current = box;
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
      };

      // AXM-031: on a perch step COGS goes and looks. The perch sits on the
      // callout side of the target (design DR-13) and clear of the target,
      // the caption and the card (spec 3.2). The card position repeats the
      // kept two-position rule from calloutPos (spec 4.1) for this step.
      if (perch && box) {
        const caption = s.captionLabel
          ? { left: box.left + box.width / 2 - 100, top: box.top - 24, width: 200, height: 18 }
          : null;
        const hEst = (s.message?.length ?? 0) > 200 ? CALLOUT_H_EST_LONG : CALLOUT_H_EST_DEFAULT;
        const calloutLeft = Math.max(12, Math.min(SCREEN_W / 2 - CALLOUT_W / 2, SCREEN_W - 12 - CALLOUT_W));
        const calloutTop = box.top + box.height / 2 > SCREEN_H / 2
          ? CALLOUT_UPPER_TOP
          : SCREEN_H - NAV_HEIGHT - 16 - hEst;
        const p = computeDiscoveryPerch({
          target: box,
          caption,
          callout: { left: calloutLeft, top: calloutTop, width: CALLOUT_W, height: hEst },
          screenW: SCREEN_W,
          screenH: SCREEN_H,
        });
        const here = orbCentre();
        perchRef.current = { x: p.cx, y: p.cy };
        // Already there (a reveal after its notice, spec 2.7): no flight, no look.
        if (Math.hypot(here.x - p.cx, here.y - p.cy) < 1) {
          reveal();
          return;
        }
        flyDiscovery(p.cx, p.cy, () => {
          lookAt({ x: box.left + box.width / 2, y: box.top + box.height / 2 }, reveal);
        });
        return;
      }

      // Presentation Mode (Tucker 2026-06-13): COGS stays centered on screen
      // for every step — the "professor with a laser pointer". The orb does
      // not chase the target; only the highlight (board outline / amber square),
      // the '???'/name caption, and the dialogue card move to whatever COGS is
      // pointing at. The one exception is allowPieceTap steps, where COGS steps
      // aside (bottom-docked) so the player can tap the piece on the board.
      // AXM-031: perch steps branch above; this is still home for the rest.
      let targetCx = SCREEN_W / 2;
      let targetCy = SCREEN_H / 2;
      if (s.allowPieceTap) {
        const calloutLeft = Math.max(
          12,
          Math.min(SCREEN_W / 2 - CALLOUT_W / 2, SCREEN_W - 12 - CALLOUT_W),
        );
        const calloutTop = SCREEN_H - NAV_HEIGHT - 16 - CALLOUT_H_EST;
        targetCx = calloutLeft + CALLOUT_W / 2;
        targetCy = calloutTop - 10 - ORB_SIZE / 2;
      }
      perchRef.current = null;
      if (fromPerch) {
        flyDiscovery(targetCx, targetCy, reveal);
      } else {
        flyOrbTo(targetCx, targetCy, reveal);
      }
    });
  }, [steps, resetVisualState, measureTarget, trackTimer, flyOrbTo, flyDiscovery, lookAt, showOrb, orbCentre, computePortalBox, morphPortalIn, morphBoardReveal, calloutOpacity, dimOpacity, trackAnim, CALLOUT_W, CALLOUT_H_EST, CALLOUT_H_EST_DEFAULT, CALLOUT_H_EST_LONG, portalLeft, portalTop, portalW, portalH, portalOpacity, glowOpacity]);

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
  // PROMPT_128: tray-prefixed and placedPiece targets get the corner-bracket
  // square only — the filled glow circle was obscuring the piece icon. Port
  // and board-codex targets keep their glow circle.
  // Presentation Mode (Tucker 2026-06-13): COGS stays centered, so the
  // highlight is the amber corner-bracket square (or the board outline) only.
  // The filled glow circle read as "the orb landed here" — which no longer
  // happens. Suppress it for every spotlight target (was: tray/placedPiece
  // only; the port discovery steps were the last to still show a glow).
  const liveTarget = resolvedTarget ?? step?.targetRef ?? '';
  const isSquareOnlyTarget = !!step && step.targetRef !== 'center';
  const showPieceGlow =
    !!step &&
    !SECTION_TARGETS.has(liveTarget) &&
    !isSquareOnlyTarget &&
    phase === 'arrived';
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
      if (reduceMotionRef.current) {
        codexTranslate.setValue(0);
        return;
      }
      // useNativeDriver: false — codexTranslate's host is conditionally
      // mounted ({codexVisible && codexEntry && <Animated.View ...>}).
      // Each codex open/close tears down and remounts the host's native
      // node, so REQ-A-1 forbids native-driver here. See
      // project-docs/REPORTS/build21-sigsegv-investigation.md.
      // AXM-031 spec 11.1: 600ms, the doctrine floor.
      const slide = Animated.timing(codexTranslate, {
        toValue: 0,
        duration: 600,
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
    const hide = Animated.timing(orbOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    });
    trackAnim(hide);
    hide.start();
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
  }, [exitOpacity, orbOpacity, trackAnim]);

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

  // The Codex panel fills the overlay, so its dock is measured from the
  // overlay's own rect.
  const dockOrb = useCallback(() => {
    const dock = codexDockPoint({ left: 0, top: 0, width: SCREEN_W, height: SCREEN_H });
    setOrbDocked(true);
    if (reduceMotionRef.current) {
      orbX.setValue(dock.x - ORB_SIZE / 2);
      orbY.setValue(dock.y - ORB_SIZE / 2);
      return;
    }
    const ease = Easing.bezier(0.4, 0, 0.2, 1);
    const ride = Animated.parallel([
      Animated.timing(orbX, { toValue: dock.x - ORB_SIZE / 2, duration: CODEX_SLIDE_MS, easing: ease, useNativeDriver: false }),
      Animated.timing(orbY, { toValue: dock.y - ORB_SIZE / 2, duration: CODEX_SLIDE_MS, easing: ease, useNativeDriver: false }),
    ]);
    trackAnim(ride);
    ride.start();
  }, [orbX, orbY, trackAnim]);

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
        dockOrb();
        return;
      }
      // Normal: mark discovered and open the codex view for this step.
      // Discovery is monotonic — re-marking is a no-op (Prompt 92, Fix 8).
      useCodexStore.getState().markDiscovered(step.codexEntryId);
      // AXM-031 design DR-9: the orb rides up with the panel, still amber.
      // It turns green when the entry is filed (UNDERSTOOD, DR-11).
      setCodexVisible(true);
      setPhase('codex');
      dockOrb();
      return;
    }
    advanceStep();
  }, [phase, step, levelId, advanceStep, dockOrb]);

  const handleSkip = useCallback(() => {
    AsyncStorage.setItem(`axiom_tutorial_skipped_${levelId}`, '1').catch(() => {});
    exitOverlay(onSkip);
  }, [levelId, onSkip, exitOverlay]);

  const handleCodexUnderstood = useCallback(() => {
    const reduced = reduceMotionRef.current;
    const back = perchRef.current ?? { x: SCREEN_W / 2, y: SCREEN_H / 2 };
    const afterSlide = () => {
      if (!mountedRef.current) return;
      setOrbDocked(false);
      // Orb transitions back to its step eyeColor after the codex dismisses.
      const colorOut = Animated.timing(orbCollectAnim, {
        toValue: 0,
        duration: COLLECT_CROSSFADE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      trackAnim(colorOut);
      colorOut.start();
      setCodexAlsoCollected([]);
      setCodexVisible(false);
      advanceStep();
    };
    // AXM-031 design DR-11: filing. Amber to green over 600ms while docked.
    const colorIn = Animated.timing(orbCollectAnim, {
      toValue: 1,
      duration: COLLECT_CROSSFADE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    trackAnim(colorIn);
    colorIn.start(() => {
      if (!mountedRef.current) return;
      if (reduced) {
        codexTranslate.setValue(SCREEN_H);
        orbX.setValue(back.x - ORB_SIZE / 2);
        orbY.setValue(back.y - ORB_SIZE / 2);
        afterSlide();
        return;
      }
      // useNativeDriver: false — see slide-in comment above and
      // project-docs/REPORTS/build21-sigsegv-investigation.md.
      // AXM-031 spec 11.1 / design DR-12: 600ms, and the orb rides down with
      // the panel to the perch it left.
      const ease = Easing.bezier(0.4, 0, 0.2, 1);
      const slideOut = Animated.parallel([
        Animated.timing(codexTranslate, {
          toValue: SCREEN_H,
          duration: 600,
          easing: ease,
          useNativeDriver: false,
        }),
        Animated.timing(orbX, { toValue: back.x - ORB_SIZE / 2, duration: CODEX_SLIDE_MS, easing: ease, useNativeDriver: false }),
        Animated.timing(orbY, { toValue: back.y - ORB_SIZE / 2, duration: CODEX_SLIDE_MS, easing: ease, useNativeDriver: false }),
      ]);
      trackAnim(slideOut);
      slideOut.start(afterSlide);
    });
  }, [codexTranslate, advanceStep, trackAnim, orbCollectAnim, orbX, orbY]);

  // Advance when the matching piece type is placed (awaitPlacement steps).
  // The sequence number guards against re-firing when the same type repeats
  // across levels; it is only reset on full overlay remount.
  const lastPlacedSeqRef = useRef<number | null>(null);
  useEffect(() => {
    if (!lastPlacedTrigger) return;
    if (lastPlacedSeqRef.current === lastPlacedTrigger.seq) return;
    lastPlacedSeqRef.current = lastPlacedTrigger.seq;
    if (step?.awaitPlacement === lastPlacedTrigger.type && phase === 'arrived') {
      // PROMPT_127: the dim is now driven per-step from runStep, so
      // the placement-trigger effect no longer touches dimOpacity.
      // The next step's runStep call resolves the new dim target
      // (0 for placedPiece, 0.45 for tray steps) and animates it.
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

  // PROMPT_129: tap anywhere to advance (or open codex for codex steps).
  // The gold A1-1 flow is a tap-to-walk-through tutorial — gating tap
  // dismissal on awaitPlacement/allowPieceTap trapped the player. The
  // tap-anywhere model is restored; the overlay hands control over to
  // the board after the last codex step.
  const handleTapAnywhere = useCallback(() => {
    if (phase !== 'arrived') return;
    if (codexVisible) return;
    handlePrimary();
  }, [phase, codexVisible, handlePrimary]);

  if (!hydrated || !step) return null;

  const codexEntry = step.codexEntryId ? getCodexEntry(step.codexEntryId) : null;

  // Discovery caption: a label rendered above the highlight square that reads
  // '???' on a notice beat and the piece/entity name on the reveal beat. Driven
  // purely by the step's explicit `captionLabel` (set on every notice and
  // reveal step), NOT by persisted discovery state — the tutorial is a
  // re-enactment, so the caption must replay every session. Every piece is
  // captured the same way: ??? -> name.
  const captionText = step.captionLabel;

  // ── Spotlight ring positions (A1-1 only) ──
  const isBoardStep = liveTarget === 'boardGrid';
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
  const glowColor = (isCodexStep || (step && PORT_TARGETS.has(liveTarget))) ? '#8B5CF6' : eyeColor;

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
      ref={overlayRootRef}
      collapsable={false}
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { opacity: exitOpacity }]}
    >
      {/* Dim backdrop — always-mounted so dimOpacity's native node never
          detaches and remounts across step transitions. Separating the
          Animated.View from the tap handler avoids the "node moved to
          native" SIGABRT (same pattern as portalOpacity, Prompt 93 Fix 1). */}
      <Animated.View pointerEvents="none" style={[st.dim, { opacity: dimOpacity }]} />
      {/* PROMPT_129: tap layer is unconditional so the player can always
          dismiss the callout — the gold model. The Pressable sits below
          the orb (zIndex 200) and below the callout (zIndex 160), so
          dedicated controls still capture their own taps first. */}
      <Pressable onPress={handleTapAnywhere} style={StyleSheet.absoluteFill} />

      {/* Portal (rendered when arrived/codex and not center). PROMPT_138:
          the corner-bracket square renders for ALL portal targets,
          including square-only (tray/placedPiece). Only the filled glow
          circle is suppressed for those targets — that lives in the
          separate showPieceGlow block below, which already excludes
          isSquareOnlyTarget. The square frames the tray slot / placed
          piece without the circle obscuring the icon. */}
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
            // UX-04: the highlight square border is always amber. The COGS AI
            // Orb's eye-state color drives the orb itself, not the targeting
            // bracket — a green/red orb state must not recolor the square.
            borderColor: '#F0B429',
            borderRadius: 10,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 150,
          }}
        >
          {/* Corner brackets — precision targeting brackets */}
          <Animated.View style={[st.corner, { top: -3, left: -3, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 3, shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4 }, { opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]} />
          <Animated.View style={[st.corner, { top: -3, right: -3, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 3, shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4 }, { opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]} />
          <Animated.View style={[st.corner, { bottom: -3, left: -3, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 3, shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4 }, { opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]} />
          <Animated.View style={[st.corner, { bottom: -3, right: -3, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 3, shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4 }, { opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]} />
        </Animated.View>
      )}

      {/* UX-02: the per-step mission sub-header (step.label, e.g. "CIRCUIT
          BOARD" / "INPUT TAPE" / "PROPULSION CORE" / "???") used to render
          above the portal here. Skeptic playtest flagged it as redundant
          chrome competing with the static level title and the dialogue card.
          The render is removed; PROMPT_146 then removed the now-dead
          step.label data from levels.ts (the TutorialStep.label type field
          remains, optional, as a follow-up cleanup candidate). Removing the
          only consumer also resolves UX-03 (off-center "???"/codex labels) as a
          side effect: nothing renders a label that could be off-center. */}

      {/* Discovery caption label. Sits ABOVE the highlight square (box.top - 24),
          horizontally centered on the box center, reading '???' on a notice beat
          and the piece/entity name on the reveal beat. A fixed-width centered
          container lets long names (e.g. TRANSMITTER, OUTPUT TAPE) overflow the
          narrow piece highlight without clipping. Fades with portalOpacity.
          Caption steps never target the board, so static portalBox geometry is
          used (no animated portalLeft/Top branch needed). */}
      {/* AXM-031 spec 7.6: an unresolved targetPiece renders as a plain
          boardGrid codex step, with no caption. */}
      {captionText && !targetFallback && phase !== 'flying' && phase !== 'idle' && portalBox && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: portalBox.left + portalBox.width / 2 - 100,
            top: portalBox.top - 24,
            width: 200,
            opacity: portalOpacity,
            alignItems: 'center',
            zIndex: 151,
          }}
        >
          <Text style={st.label} numberOfLines={1}>{captionText}</Text>
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

      {/* Orb. AXM-031 spec 9.1: always mounted, one host; visibility is
          orbOpacity. Design DR-10: raised above the Codex (zIndex/elevation
          250) while docked on it. */}
      <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: orbX,
            top: orbY,
            opacity: orbOpacity,
            width: ORB_SIZE,
            height: ORB_SIZE,
            borderRadius: ORB_SIZE / 2,
            borderWidth: 1.5,
            borderColor: orbCollectAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [eyeColor, COGS_AI_ORB_COLORS.GREEN.solid],
            }),
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: eyeColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 10,
            zIndex: orbDocked ? 260 : 200,
            elevation: orbDocked ? 260 : 0,
          }}
        >
          <Animated.View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: orbCollectAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [eyeColor, COGS_AI_ORB_COLORS.GREEN.solid],
              }),
              transform: [{ translateX: lookX }, { translateY: lookY }],
            }}
          />
        </Animated.View>

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
            entryNumber={getCodexEntryNumber(codexEntry.id)}
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
    // Tucker 2026-06-13: corner targeting brackets are blue; the main
    // highlight rectangle stays amber.
    borderColor: '#00D4FF',
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
