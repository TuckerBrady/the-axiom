import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Platform,
  findNodeHandle,
  UIManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TutorialStep } from '../game/types';
import { Colors, Fonts } from '../theme/tokens';
import CodexDetailView, { getCodexEntry } from './CodexDetailView';

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

export default function TutorialHUDOverlay({
  steps,
  levelId,
  targetRefs,
  onComplete,
  onSkip,
  spotlightCells,
  spotlightCellSize,
}: Props) {
  // ── State ──
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [hydrated, setHydrated] = useState(false);
  const [targetLayout, setTargetLayout] = useState<Layout | null>(null);
  const [codexVisible, setCodexVisible] = useState(false);

  // ── Animated values ──
  const orbX = useRef(new Animated.Value(SCREEN_W - 40)).current;
  const orbY = useRef(new Animated.Value(60)).current;
  const portalOpacity = useRef(new Animated.Value(0)).current;
  const portalW = useRef(new Animated.Value(0)).current;
  const portalH = useRef(new Animated.Value(0)).current;
  const calloutOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.25)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const dimOpacity = useRef(new Animated.Value(0)).current;
  const codexTranslate = useRef(new Animated.Value(SCREEN_H)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  const step = steps[currentStepIndex];
  const totalSteps = steps.length;
  const isLastStep = currentStepIndex >= totalSteps - 1;
  const eyeColor = eyeStateColor(step?.eyeState);

  // ── Hydration ──
  useEffect(() => {
    (async () => {
      try {
        const forceShow = await AsyncStorage.getItem('axiom_tutorial_force_show');
        if (forceShow === '1') {
          await AsyncStorage.removeItem('axiom_tutorial_force_show');
          await AsyncStorage.removeItem(`axiom_tutorial_complete_${levelId}`);
          await AsyncStorage.removeItem(`axiom_tutorial_skipped_${levelId}`);
          await AsyncStorage.removeItem(`axiom_tutorial_step_${levelId}`);
          setHydrated(true);
          return;
        }
        const saved = await AsyncStorage.getItem(`axiom_tutorial_step_${levelId}`);
        if (saved) {
          const idx = parseInt(saved, 10);
          if (!isNaN(idx) && idx >= 0 && idx < steps.length) {
            setCurrentStepIndex(idx);
          }
        }
      } catch {
        /* ignore */
      }
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
      cb(null);
      return;
    }

    let attempt = 0;
    const retry = () => {
      if (attempt < 3) {
        setTimeout(tryMeasure, 150);
      } else {
        cb(null);
      }
    };
    const onResult = (x: number, y: number, width: number, height: number) => {
      if (width < 4 || height < 4) {
        retry();
        return;
      }
      cb({ x, y, width, height });
    };
    const tryMeasure = () => {
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
  }, [targetRefs]);

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
  const CALLOUT_H_EST = 140;

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
      // Target in top half → callout below portal
      let top = portalBottom + CALLOUT_GAP;
      const maxTop = SCREEN_H - NAV_HEIGHT - CALLOUT_H_EST - 8;
      if (top > maxTop) top = maxTop;
      return { top, left };
    } else {
      // Target in bottom half → callout above portal
      let top = portalTop - CALLOUT_GAP - CALLOUT_H_EST;
      if (top < 80) top = 80;
      return { top, left };
    }
  }, [targetLayout, portalBox, step, CALLOUT_W]);

  // ── Synchronous reset (between steps) ──
  const resetVisualState = useCallback(() => {
    portalOpacity.setValue(0);
    portalW.setValue(0);
    portalH.setValue(0);
    calloutOpacity.setValue(0);
    glowOpacity.setValue(0);
  }, [portalOpacity, portalW, portalH, calloutOpacity, glowOpacity]);

  // ── Fly orb to target ──
  const flyOrbTo = useCallback((cx: number, cy: number, done?: () => void) => {
    Animated.parallel([
      Animated.spring(orbX, {
        toValue: cx - ORB_SIZE / 2,
        tension: 80,
        friction: 12,
        useNativeDriver: false,
      }),
      Animated.spring(orbY, {
        toValue: cy - ORB_SIZE / 2,
        tension: 80,
        friction: 12,
        useNativeDriver: false,
      }),
    ]).start(() => done?.());
  }, [orbX, orbY]);

  // ── Morph portal in ──
  const morphPortalIn = useCallback((box: { width: number; height: number }, done?: () => void) => {
    portalW.setValue(0);
    portalH.setValue(0);
    portalOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(portalW, {
        toValue: box.width,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(portalH, {
        toValue: box.height,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(portalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      Animated.timing(glowOpacity, {
        toValue: 0.25,
        duration: 200,
        useNativeDriver: false,
      }).start();
      Animated.timing(calloutOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
      done?.();
    });
  }, [portalW, portalH, portalOpacity, glowOpacity, calloutOpacity]);

  // ── Advance to the current step's target ──
  const runStep = useCallback((idx: number) => {
    const s = steps[idx];
    if (!s) return;
    resetVisualState();
    setTargetLayout(null);
    setPhase('flying');

    measureTarget(s.targetRef, (layout) => {
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
        setPhase('arrived');
        if (box) {
          morphPortalIn({ width: box.width, height: box.height });
        } else {
          // Center step: no portal. Just fade callout in.
          Animated.timing(calloutOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }).start();
        }
      });
    });
  }, [steps, resetVisualState, measureTarget, flyOrbTo, computePortalBox, morphPortalIn, calloutOpacity]);

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
    Animated.timing(dimOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
    // Short delay so GameplayScreen's layout settles before first measure
    const t = setTimeout(() => {
      if (didStartRef.current) return;
      didStartRef.current = true;
      runStep(currentStepIndex);
    }, 400);
    return () => clearTimeout(t);
  }, [hydrated, currentStepIndex, runStep, dimOpacity]);

  // ── Glow pulse loop ──
  const showPieceGlow = !!step && !SECTION_TARGETS.has(step.targetRef) && phase === 'arrived';
  useEffect(() => {
    if (!showPieceGlow) return;
    glowPulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showPieceGlow, glowPulse]);

  // ── Codex slide ──
  useEffect(() => {
    if (codexVisible) {
      Animated.timing(codexTranslate, {
        toValue: 0,
        duration: 400,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }).start();
    } else {
      codexTranslate.setValue(SCREEN_H);
    }
  }, [codexVisible, codexTranslate]);

  // ── Exit animation ──
  const exitOverlay = useCallback((after: () => void) => {
    setPhase('complete');
    Animated.timing(exitOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start(() => after());
  }, [exitOpacity]);

  // ── Step controls ──
  const advanceStep = useCallback(() => {
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
      setCodexVisible(true);
      setPhase('codex');
      return;
    }
    advanceStep();
  }, [phase, step, advanceStep]);

  const handleBack = useCallback(() => {
    if (currentStepIndex === 0) return;
    const prev = currentStepIndex - 1;
    setCurrentStepIndex(prev);
    runStep(prev);
  }, [currentStepIndex, runStep]);

  const handleSkip = useCallback(() => {
    AsyncStorage.setItem(`axiom_tutorial_skipped_${levelId}`, '1').catch(() => {});
    exitOverlay(onSkip);
  }, [levelId, onSkip, exitOverlay]);

  const handleCodexUnderstood = useCallback(() => {
    Animated.timing(codexTranslate, {
      toValue: SCREEN_H,
      duration: 400,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start(() => {
      setCodexVisible(false);
      advanceStep();
    });
  }, [codexTranslate, advanceStep]);

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

  const primaryLabel = step.codexEntryId && phase === 'arrived'
    ? 'SHOW ME'
    : isLastStep
    ? 'READY'
    : 'UNDERSTOOD';

  // Glow circle geometry (for piece targets)
  let glowCircle: { cx: number; cy: number; r: number } | null = null;
  if (showPieceGlow && targetLayout) {
    const cx = targetLayout.x + targetLayout.width / 2;
    const cy = targetLayout.y + targetLayout.height / 2;
    const r = Math.min(targetLayout.width, targetLayout.height) * 0.4;
    glowCircle = { cx, cy, r };
  }
  const glowColor = step && PORT_TARGETS.has(step.targetRef) ? '#8B5CF6' : eyeColor;

  const renderMessage = () => {
    const text = step.message;
    const blueWords = step.highlightWords ?? [];
    const amberWords = step.highlightAmberWords ?? [];
    const all = [
      ...amberWords.map(w => ({ word: w, color: '#F0B429' })),
      ...blueWords.map(w => ({ word: w, color: '#00D4FF' })),
    ];
    if (all.length === 0) return <Text style={st.message}>{text}</Text>;
    const escaped = all.map(h => h.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`(${escaped.join('|')})`, 'g');
    const parts = text.split(re);
    return (
      <Text style={st.message}>
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
      {/* Dim backdrop */}
      <Animated.View
        pointerEvents="auto"
        style={[st.dim, { opacity: dimOpacity }]}
      />

      {/* Portal (rendered when arrived/codex and not center) */}
      {phase !== 'flying' && phase !== 'idle' && portalBox && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: portalBox.left,
            top: portalBox.top,
            width: portalW,
            height: portalH,
            opacity: portalOpacity,
            borderWidth: 1.5,
            borderColor: eyeColor,
            borderRadius: 10,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 150,
          }}
        >
          {/* Corner brackets */}
          <View style={[st.corner, { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 3 }]} />
          <View style={[st.corner, { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 3 }]} />
          <View style={[st.corner, { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 3 }]} />
          <View style={[st.corner, { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 3 }]} />
        </Animated.View>
      )}

      {/* Portal label (above portal) */}
      {phase !== 'flying' && phase !== 'idle' && portalBox && step.label && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: portalBox.top - 20,
            left: portalBox.left,
            width: portalBox.width,
            alignItems: 'center',
            opacity: portalOpacity,
            zIndex: 151,
          }}
        >
          <Text style={st.label}>{step.label}</Text>
        </Animated.View>
      )}

      {/* Piece glow (steady fill + pulsing outer ring) */}
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

      {/* A1-1 spotlight rings on inputPort/outputPort inside board portal */}
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
          {renderMessage()}
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
            borderColor: eyeColor,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: eyeColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 10,
            zIndex: 200,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: eyeColor,
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
            { transform: [{ translateY: codexTranslate }], zIndex: 250, backgroundColor: '#02050c' },
          ]}
        >
          <CodexDetailView entry={codexEntry} onUnderstood={handleCodexUnderstood} />
          <PixelDissolve />
        </Animated.View>
      )}

      {/* Nav strip */}
      {phase !== 'idle' && phase !== 'complete' && !codexVisible && (
        <View pointerEvents="box-none" style={st.navStrip}>
          <View style={st.eyeDot} />
          <Text style={st.stepCounter}>STEP {currentStepIndex + 1} / {totalSteps}</Text>
          <View style={st.progressRow}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[
                  st.progressDot,
                  i <= currentStepIndex && { backgroundColor: eyeColor, borderColor: eyeColor },
                ]}
              />
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={handleSkip} style={st.navBtn} activeOpacity={0.7}>
            <Text style={st.navBtnTextDim}>SKIP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBack}
            style={st.navBtn}
            activeOpacity={0.7}
            disabled={currentStepIndex === 0}
          >
            <Text style={[st.navBtnTextDim, currentStepIndex === 0 && { opacity: 0.35 }]}>BACK</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePrimary} style={st.primaryBtn} activeOpacity={0.8}>
            <Text style={st.primaryBtnText}>{primaryLabel}</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

// ─── PixelDissolve ──────────────────────────────────────────────────────────

const DISSOLVE_COLS = 40;
const DISSOLVE_ROWS = 20;
const DISSOLVE_TOTAL = DISSOLVE_COLS * DISSOLVE_ROWS;

function PixelDissolve() {
  const CELL = Math.ceil(SCREEN_W / DISSOLVE_COLS);
  const CELL_H = Math.ceil(SCREEN_H / DISSOLVE_ROWS);

  const opacities = useRef(
    Array.from({ length: DISSOLVE_TOTAL }, () => new Animated.Value(1)),
  ).current;
  const [, force] = useState(0);

  useEffect(() => {
    const indices = Array.from({ length: DISSOLVE_TOTAL }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    let group = 0;
    const isWeb = Platform.OS === 'web';
    // ~75% of the original speed — clearly visible but snappier.
    const groupSize = isWeb ? 40 : 200;
    const tickMs = isWeb ? 23 : 15;
    const fadeDur = isWeb ? 135 : 75;
    const delayMax = isWeb ? 90 : 45;
    const id = setInterval(() => {
      const start = group * groupSize;
      const end = Math.min(DISSOLVE_TOTAL, start + groupSize);
      for (let i = start; i < end; i++) {
        const idx = indices[i];
        Animated.timing(opacities[idx], {
          toValue: 0,
          duration: fadeDur,
          delay: Math.random() * delayMax,
          useNativeDriver: false,
        }).start();
      }
      group += 1;
      if (start + groupSize >= DISSOLVE_TOTAL) {
        clearInterval(id);
        setTimeout(() => force(1), 900);
      }
    }, tickMs);
    return () => clearInterval(id);
  }, [opacities]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {opacities.map((op, i) => {
        const col = i % DISSOLVE_COLS;
        const row = Math.floor(i / DISSOLVE_COLS);
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: col * CELL,
              top: row * CELL_H,
              width: CELL,
              height: CELL_H,
              backgroundColor: '#02050c',
              opacity: op,
            }}
          />
        );
      })}
    </View>
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
    width: 12,
    height: 12,
    borderColor: '#F0B429',
  },
  label: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#F0B429',
    letterSpacing: 2,
  },
  callout: {
    position: 'absolute',
    backgroundColor: 'rgba(6,9,18,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.15)',
    borderRadius: 8,
    padding: 16,
    zIndex: 160,
  },
  message: {
    fontFamily: Fonts.spaceMono,
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  navStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: NAV_HEIGHT,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(2,5,12,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,212,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 100,
    overflow: 'hidden',
  },
  eyeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D4FF',
  },
  stepCounter: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#4a6080',
    letterSpacing: 1,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#2a3c56',
  },
  navBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  navBtnTextDim: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#6a7f9a',
    letterSpacing: 1.5,
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.amber,
    borderRadius: 4,
    maxWidth: 130,
    flexShrink: 1,
  },
  primaryBtnText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: Colors.amber,
    letterSpacing: 2,
  },
});
