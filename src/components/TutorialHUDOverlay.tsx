import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import type { TutorialStep } from '../game/types';
import { Colors, Fonts, Spacing } from '../theme/tokens';
import { PieceIcon } from './PieceIcon';
import CodexDetailView, { getCodexEntry } from './CodexDetailView';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Phase = 'tutorial' | 'demo' | 'announce' | 'codex';
type Layout = { x: number; y: number; width: number; height: number };

interface Props {
  steps: TutorialStep[];
  levelId: string;
  targetRefs: Record<string, React.RefObject<View | null>>;
  onComplete: () => void;
  onSkip: () => void;
}

const ORB_SIZE = 22;
const PORTAL_PAD = 10;

export default function TutorialHUDOverlay({
  steps,
  levelId,
  targetRefs,
  onComplete,
  onSkip,
}: Props) {
  // ── Core phase / step state ──
  const [currentStep, setCurrentStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('tutorial');
  const [hydrated, setHydrated] = useState(false);
  const [annProgress, setAnnProgress] = useState(0);
  const [annComplete, setAnnComplete] = useState(false);
  const [codexVisible, setCodexVisible] = useState(false);

  // Portal layout (current target measure result)
  const [portalLayout, setPortalLayout] = useState<Layout | null>(null);
  const [morphed, setMorphed] = useState(false);
  const [calloutPos, setCalloutPos] = useState<{ top?: number; bottom?: number; left: number; width: number; pointerAt: 'top' | 'bottom' | 'none'; insidePortal?: boolean } | null>(null);

  // ── Animated values ──
  const dimOpacity = useRef(new Animated.Value(0)).current;
  const navStripY = useRef(new Animated.Value(80)).current;
  const navStripBottom = useRef(new Animated.Value(0)).current;

  const orbLeft = useRef(new Animated.Value(SCREEN_W + 60)).current;
  const orbTop = useRef(new Animated.Value(80)).current;
  const orbW = useRef(new Animated.Value(ORB_SIZE)).current;
  const orbH = useRef(new Animated.Value(ORB_SIZE)).current;
  const orbRadius = useRef(new Animated.Value(ORB_SIZE / 2)).current;
  const orbOpacity = useRef(new Animated.Value(0)).current;
  const orbFillOpacity = useRef(new Animated.Value(1)).current;
  const pulseRingOpacity = useRef(new Animated.Value(1)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const portalDetailOpacity = useRef(new Animated.Value(0)).current;
  const calloutOpacity = useRef(new Animated.Value(0)).current;
  const eyePulse = useRef(new Animated.Value(0.4)).current;
  const scanY = useRef(new Animated.Value(0)).current;
  const panelTranslate = useRef(new Animated.Value(400)).current;
  const codexTranslate = useRef(new Animated.Value(SCREEN_H)).current;

  const step = steps[currentStep];
  const eyeColor = step?.eyeState === 'amber' ? '#F0B429' : '#00D4FF';
  const isLastStep = currentStep === steps.length - 1;
  const exitingRef = useRef(false);

  // ── Hydration from AsyncStorage ──
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
            setCurrentStep(idx);
          }
        }
      } catch {
        // ignore
      }
      setHydrated(true);
    })();
  }, [levelId, steps.length]);

  // ── Persist step ──
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(`axiom_tutorial_step_${levelId}`, String(currentStep)).catch(() => {});
  }, [currentStep, hydrated, levelId]);

  // ── Ambient loops (eye pulse, pulse rings) ──
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(eyePulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(eyePulse, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.12, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(pulseScale, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    ).start();
  }, [eyePulse, pulseScale]);

  // ── Scan line loop (inside portal) ──
  useEffect(() => {
    if (!morphed || !portalLayout) return;
    scanY.setValue(0);
    const loop = Animated.loop(
      Animated.timing(scanY, {
        toValue: portalLayout.height + PORTAL_PAD * 2,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [morphed, portalLayout, scanY]);

  // ── Measure target for current step (tutorial phase) ──
  // Large layout elements (board / engage / tray chips) need extra delay so
  // their layout settles before measure() is called, otherwise the orb jumps.
  // Source/output node refs are board children whose position settles
  // immediately and use direct measure().
  const DELAYED_REFS = new Set([
    'boardGrid',
    'engageButton',
    'trayConveyor',
    'trayGear',
    'trayConfigNode',
    'traySplitter',
    'trayScanner',
    'trayTransmitter',
  ]);
  const measureCurrent = useCallback((cb: (layout: Layout | null) => void) => {
    if (!step) return cb(null);
    const ref = targetRefs[step.targetRef];
    if (!ref?.current?.measure) return cb(null);
    const BOARD_DELAY = 180;
    const TRAY_DELAY = 120;
    const delayMs = step.targetRef === 'boardGrid'
      ? BOARD_DELAY
      : DELAYED_REFS.has(step.targetRef)
      ? TRAY_DELAY
      : 0;
    const doMeasure = (retry: boolean) => {
      ref.current?.measure?.((_x, _y, width, height, pageX, pageY) => {
        // Stale/collapsed layout guard: any target can return a near-zero
        // size if measured before layout settles. boardGrid uses a larger
        // threshold (100) because it is expected to be big; all other
        // targets (tray pieces, engage button, source/output) use 10.
        const threshold = step.targetRef === 'boardGrid' ? 100 : 10;
        const badSize = width < threshold || height < threshold;
        // Additional guard: the engage button lives in the lower half of
        // the screen. If measure returns a y in the top half, the layout
        // has not settled and we should retry.
        const badEngagePos =
          step.targetRef === 'engageButton' && pageY < SCREEN_H / 2;
        if ((badSize || badEngagePos) && retry) {
          setTimeout(() => doMeasure(false), 200);
          return;
        }
        cb({ x: pageX, y: pageY, width, height });
      });
    };
    setTimeout(() => doMeasure(true), delayMs);
  }, [step, targetRefs]);

  // ── Compute callout position relative to portal ──
  const computeCalloutPos = useCallback((layout: Layout) => {
    // Large portal (board): drop the callout inside the portal at the top.
    if (layout.width > SCREEN_W * 0.6) {
      const W = SCREEN_W - 32;
      return {
        top: layout.y + 8,
        left: 16,
        width: W,
        pointerAt: 'none' as const,
        insidePortal: true,
      };
    }
    const CALLOUT_W = Math.min(270, SCREEN_W * 0.79);
    const centerX = layout.x + layout.width / 2;
    let left = centerX - CALLOUT_W / 2;
    if (left < 12) left = 12;
    if (left + CALLOUT_W > SCREEN_W - 12) left = SCREEN_W - 12 - CALLOUT_W;

    // ENGAGE step: the button sits below the parts tray at the very bottom
    // of the screen, and the nav strip is lifted to bottom: 136 on this
    // step. A measurement-derived bottom anchor has been unreliable — the
    // engage button ref (TouchableOpacity) sometimes returns stale pageY,
    // pushing the callout into or below the tray. Use a deterministic
    // bottom anchor that always clears the lifted nav strip, the tray,
    // and the engage row.
    //   nav strip lift (136) + nav strip height (~80) + tray (~80) +
    //   margin (~14) = 310
    if (step?.targetRef === 'engageButton') {
      return {
        bottom: 310,
        left,
        width: CALLOUT_W,
        pointerAt: 'bottom' as const,
      };
    }

    const NAV_STRIP_HEIGHT = 88;
    const USABLE_HEIGHT = SCREEN_H - NAV_STRIP_HEIGHT;
    const CALLOUT_EST_H = 140;
    const MIN_TOP = 60;
    const centerY = layout.y + layout.height / 2;
    const belowTop = layout.y + layout.height + 18;
    const belowOverflow = belowTop + CALLOUT_EST_H > USABLE_HEIGHT;
    // Place above target when target sits in the lower half of the screen.
    const above = centerY > SCREEN_H / 2 || belowOverflow;
    if (above) {
      // Bottom-anchor the callout so its bottom sits 18px above the target.
      const desiredBottom = SCREEN_H - (layout.y - 18);
      const minBottom = NAV_STRIP_HEIGHT + 8;
      const bottomAnchor = Math.max(desiredBottom, minBottom);
      const topIfBottomAnchored = SCREEN_H - bottomAnchor - CALLOUT_EST_H;
      if (topIfBottomAnchored < MIN_TOP) {
        return { top: MIN_TOP, left, width: CALLOUT_W, pointerAt: 'bottom' as const };
      }
      return { bottom: bottomAnchor, left, width: CALLOUT_W, pointerAt: 'bottom' as const };
    }
    return { top: belowTop, left, width: CALLOUT_W, pointerAt: 'top' as const };
  }, [step]);

  // ── Fly orb to center of a layout (no morph) ──
  const flyTo = useCallback((cx: number, cy: number, done?: () => void) => {
    Animated.parallel([
      Animated.timing(orbLeft, { toValue: cx - ORB_SIZE / 2, duration: 520, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }),
      Animated.timing(orbTop, { toValue: cy - ORB_SIZE / 2, duration: 520, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }),
    ]).start(() => {
      done?.();
    });
  }, [orbLeft, orbTop]);

  // ── Morph orb into portal over a target layout ──
  const morphInto = useCallback((layout: Layout, done?: () => void) => {
    const pad = step?.targetRef === 'boardGrid' ? 6 : PORTAL_PAD;
    const targetW = layout.width + pad * 2;
    const targetH = layout.height + pad * 2;
    const targetL = layout.x - pad;
    const targetT = layout.y - pad;
    // Clamp portal to viewport so large targets (board) don't render off-screen
    const NAV_STRIP_HEIGHT = 88;
    const MAX_PORTAL_W = SCREEN_W - 24;
    const MAX_PORTAL_H = SCREEN_H - NAV_STRIP_HEIGHT - 80;
    const clampedW = Math.min(targetW, MAX_PORTAL_W);
    const clampedH = Math.min(targetH, MAX_PORTAL_H);
    const clampedL = Math.max(8, Math.min(targetL, SCREEN_W - clampedW - 8));
    const clampedT = Math.max(56, Math.min(targetT, SCREEN_H - NAV_STRIP_HEIGHT - clampedH - 8));
    const ease = Easing.bezier(0.34, 1.4, 0.64, 1);
    Animated.parallel([
      Animated.timing(orbLeft, { toValue: clampedL, duration: 420, easing: ease, useNativeDriver: false }),
      Animated.timing(orbTop, { toValue: clampedT, duration: 420, easing: ease, useNativeDriver: false }),
      Animated.timing(orbW, { toValue: clampedW, duration: 420, easing: ease, useNativeDriver: false }),
      Animated.timing(orbH, { toValue: clampedH, duration: 420, easing: ease, useNativeDriver: false }),
      Animated.timing(orbRadius, { toValue: 10, duration: 420, easing: ease, useNativeDriver: false }),
      Animated.timing(orbFillOpacity, { toValue: 0, duration: 320, useNativeDriver: false }),
      Animated.timing(pulseRingOpacity, { toValue: 0, duration: 300, useNativeDriver: false }),
      // Portal details fade in starting ~200ms in
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(portalDetailOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
      ]),
    ]).start(() => {
      setMorphed(true);
      setCalloutPos(computeCalloutPos(layout));
      Animated.timing(calloutOpacity, { toValue: 1, duration: 300, useNativeDriver: false }).start();
      done?.();
    });
  }, [step, orbLeft, orbTop, orbW, orbH, orbRadius, orbFillOpacity, pulseRingOpacity, portalDetailOpacity, calloutOpacity, computeCalloutPos]);

  // ── Collapse portal back to orb ──
  const unmorph = useCallback((layout: Layout | null, done?: () => void) => {
    Animated.parallel([
      Animated.timing(calloutOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(portalDetailOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();
    setTimeout(() => {
      setMorphed(false);
      setCalloutPos(null);
      const centerX = layout ? layout.x + layout.width / 2 : SCREEN_W / 2;
      const centerY = layout ? layout.y + layout.height / 2 : 80;
      Animated.parallel([
        Animated.timing(orbW, { toValue: ORB_SIZE, duration: 400, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }),
        Animated.timing(orbH, { toValue: ORB_SIZE, duration: 400, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }),
        Animated.timing(orbRadius, { toValue: ORB_SIZE / 2, duration: 400, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }),
        Animated.timing(orbLeft, { toValue: centerX - ORB_SIZE / 2, duration: 400, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }),
        Animated.timing(orbTop, { toValue: centerY - ORB_SIZE / 2, duration: 400, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }),
        Animated.timing(orbFillOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(pulseRingOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]).start(() => {
        done?.();
      });
    }, 150);
  }, [calloutOpacity, portalDetailOpacity, orbW, orbH, orbRadius, orbLeft, orbTop, orbFillOpacity, pulseRingOpacity]);

  // ── Mount entrance: fade dim, slide nav, appear orb, fly to first target, morph ──
  useEffect(() => {
    if (!hydrated) return;
    Animated.timing(dimOpacity, { toValue: 1, duration: 400, useNativeDriver: false }).start();
    Animated.timing(navStripY, { toValue: 0, duration: 400, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }).start();
    setTimeout(() => {
      Animated.timing(orbOpacity, { toValue: 1, duration: 300, useNativeDriver: false }).start();
      measureCurrent((layout) => {
        if (!layout) return;
        setPortalLayout(layout);
        const cx = layout.x + layout.width / 2;
        const cy = layout.y + layout.height / 2;
        flyTo(cx, cy, () => {
          morphInto(layout);
        });
      });
    }, 400);
  }, [hydrated]);

  // ── Step change (within tutorial phase): unmorph → fly → morph to new target ──
  const prevStepRef = useRef(currentStep);
  useEffect(() => {
    if (!hydrated) return;
    if (phase !== 'tutorial') return;
    if (prevStepRef.current === currentStep) return;
    prevStepRef.current = currentStep;
    const oldLayout = portalLayout;
    unmorph(oldLayout, () => {
      measureCurrent((layout) => {
        if (!layout) return;
        setPortalLayout(layout);
        const cx = layout.x + layout.width / 2;
        const cy = layout.y + layout.height / 2;
        flyTo(cx, cy, () => {
          morphInto(layout);
        });
      });
    });
  }, [currentStep, hydrated, phase, portalLayout, unmorph, measureCurrent, flyTo, morphInto]);

  // ── Phase change: tutorial <-> demo/announce/codex ──
  const prevPhaseRef = useRef<Phase>('tutorial');
  useEffect(() => {
    if (!hydrated) return;
    const prev = prevPhaseRef.current;
    if (prev === phase) return;
    prevPhaseRef.current = phase;

    if (phase === 'demo' || phase === 'announce') {
      // Unmorph orb, hide it, slide panel up, darken dim a bit
      unmorph(portalLayout, () => {
        Animated.timing(orbOpacity, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      });
      Animated.timing(dimOpacity, { toValue: 1, duration: 200, useNativeDriver: false }).start();
      Animated.timing(panelTranslate, { toValue: 0, duration: 400, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }).start();
    } else if (phase === 'tutorial') {
      // Slide panel down, restore orb, re-fly/morph.
      // After Codex/demo close: wait for the panel slide-down (300ms) PLUS a
      // 400ms layout-settle buffer, then warm up every ref so stale measurements
      // are discarded, then re-measure the current target.
      Animated.timing(panelTranslate, { toValue: 400, duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }).start();
      Animated.timing(orbOpacity, { toValue: 1, duration: 300, useNativeDriver: false }).start();
      const remeasureAllRefs = () => {
        for (const key of Object.keys(targetRefs)) {
          const r = targetRefs[key];
          r?.current?.measure?.(() => { /* warm-up only */ });
        }
      };
      setTimeout(() => {
        remeasureAllRefs();
        measureCurrent((layout) => {
          if (!layout) return;
          setPortalLayout(layout);
          const cx = layout.x + layout.width / 2;
          const cy = layout.y + layout.height / 2;
          flyTo(cx, cy, () => morphInto(layout));
        });
      }, 700);
    }
  }, [phase, hydrated, portalLayout, unmorph, measureCurrent, flyTo, morphInto, dimOpacity, orbOpacity, panelTranslate]);

  // ── Announce progress bar ──
  useEffect(() => {
    if (phase !== 'announce') return;
    setAnnProgress(0);
    setAnnComplete(false);
    const id = setInterval(() => {
      setAnnProgress(prev => {
        const next = prev + Math.random() * 6 + 3.5;
        if (next >= 100) {
          setAnnComplete(true);
          clearInterval(id);
          return 100;
        }
        return next;
      });
    }, 40);
    return () => clearInterval(id);
  }, [phase]);

  // ── Codex slide-up animation ──
  useEffect(() => {
    if (codexVisible) {
      Animated.timing(codexTranslate, {
        toValue: 0,
        duration: 500,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }).start();
    } else {
      codexTranslate.setValue(SCREEN_H);
    }
  }, [codexVisible, codexTranslate]);

  // ── Exit animation ──
  const exitOverlay = useCallback((onDone: () => void) => {
    exitingRef.current = true;
    unmorph(portalLayout, () => {
      Animated.parallel([
        Animated.timing(orbLeft, { toValue: SCREEN_W + 60, duration: 400, useNativeDriver: false }),
        Animated.timing(orbOpacity, { toValue: 0, duration: 400, useNativeDriver: false }),
        Animated.timing(dimOpacity, { toValue: 0, duration: 400, useNativeDriver: false }),
        Animated.timing(navStripY, { toValue: 80, duration: 400, useNativeDriver: false }),
      ]).start(() => onDone());
    });
  }, [portalLayout, unmorph, orbLeft, orbOpacity, dimOpacity, navStripY]);

  // ── Advance / back / skip / primary ──
  const advanceStep = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      AsyncStorage.setItem(`axiom_tutorial_complete_${levelId}`, '1').catch(() => {});
      AsyncStorage.removeItem(`axiom_tutorial_step_${levelId}`).catch(() => {});
      exitOverlay(onComplete);
      return;
    }
    setCurrentStep(prev => prev + 1);
    setPhase('tutorial');
  }, [currentStep, steps.length, levelId, onComplete, exitOverlay]);

  const handleBack = useCallback(() => {
    if (phase === 'demo') {
      setPhase('tutorial');
    } else if (phase === 'announce') {
      setPhase('demo');
    } else if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setPhase('tutorial');
    }
  }, [phase, currentStep]);

  const handlePrimary = useCallback(() => {
    if (phase === 'tutorial' && step?.showDemo) {
      setPhase('demo');
      return;
    }
    if (phase === 'demo') {
      if (step?.codexEntryId) {
        setPhase('announce');
      } else {
        advanceStep();
      }
      return;
    }
    if (phase === 'announce') {
      if (annComplete) {
        setCodexVisible(true);
        setPhase('codex');
      }
      return;
    }
    advanceStep();
  }, [phase, step, advanceStep, annComplete]);

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
      if (currentStep >= steps.length - 1) {
        AsyncStorage.setItem(`axiom_tutorial_complete_${levelId}`, '1').catch(() => {});
        AsyncStorage.removeItem(`axiom_tutorial_step_${levelId}`).catch(() => {});
        exitOverlay(onComplete);
      } else {
        setCurrentStep(prev => prev + 1);
        setPhase('tutorial');
      }
    });
  }, [codexTranslate, currentStep, steps.length, levelId, onComplete, exitOverlay]);

  const navigateToStep = useCallback((idx: number) => {
    if (idx <= currentStep && phase === 'tutorial') {
      setCurrentStep(idx);
    }
  }, [currentStep, phase]);

  // Lift nav strip when targeting bottom-of-screen elements so it doesn't
  // cover what COGS is pointing at.
  useEffect(() => {
    if (!step) return;
    // Only the ENGAGE button sits below the nav strip — it's the only
    // target that needs the strip lifted. Tray pieces render above the
    // nav strip already, so lifting for them strands the strip mid-screen.
    const NAV_LIFT_TARGETS = new Set(['engageButton']);
    const lift = NAV_LIFT_TARGETS.has(step.targetRef);
    Animated.timing(navStripBottom, {
      toValue: lift ? 136 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [step, navStripBottom]);

  if (!hydrated || !step) return null;

  const codexEntry = step.codexEntryId ? getCodexEntry(step.codexEntryId) : null;

  // ── Highlighted message render ──
  const renderMessage = () => {
    const text = step.message;
    const blueWords = step.highlightWords ?? [];
    const amberWords = step.highlightAmberWords ?? [];
    const all = [
      ...amberWords.map(w => ({ word: w, color: '#F0B429' })),
      ...blueWords.map(w => ({ word: w, color: '#00D4FF' })),
    ];
    if (all.length === 0) {
      return <Text style={s.message}>{text}</Text>;
    }
    const escaped = all.map(h => h.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`(${escaped.join('|')})`, 'g');
    const parts = text.split(re);
    return (
      <Text style={s.message}>
        {parts.map((part, i) => {
          const hit = all.find(h => h.word === part);
          if (hit) {
            return (
              <Text key={i} style={[s.messageHighlight, { color: hit.color }]}>{part}</Text>
            );
          }
          return <Text key={i}>{part}</Text>;
        })}
      </Text>
    );
  };

  // Portal corner brackets always render OUTSIDE the portal rectangle.
  // Previous versions tucked them inside for large (board) portals to avoid
  // clipping, but that visually placed decorations inside the framed area.
  const bracketOffset = -5;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Single dim layer */}
      <Animated.View pointerEvents="auto" style={[s.dim, { opacity: dimOpacity }]} />

      {/* Top-corner HUD brackets (decorative, static) */}
      <View pointerEvents="none" style={[s.hudBracket, { top: 8, left: 8 }]}>
        <View style={[s.hudBH, { top: 0, left: 0 }]} />
        <View style={[s.hudBV, { top: 0, left: 0 }]} />
      </View>
      <View pointerEvents="none" style={[s.hudBracket, { top: 8, right: 8 }]}>
        <View style={[s.hudBH, { top: 0, right: 0 }]} />
        <View style={[s.hudBV, { top: 0, right: 0 }]} />
      </View>

      {/* Orb / portal (a single Animated.View that morphs) */}
      {phase === 'tutorial' && (
        <Animated.View
          pointerEvents="none"
          style={[
            s.orb,
            {
              left: orbLeft,
              top: orbTop,
              width: orbW,
              height: orbH,
              borderRadius: orbRadius,
              opacity: orbOpacity,
            },
          ]}
        >
          {/* Orb fill (hides during morph) */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderRadius: orbRadius,
                backgroundColor: eyeColor,
                opacity: orbFillOpacity,
                shadowColor: eyeColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.7,
                shadowRadius: 10,
              },
            ]}
          />
          {/* Pulse rings (orb mode) */}
          {!morphed && (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  s.pulseRing,
                  {
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    top: -5,
                    left: -5,
                    borderColor: eyeColor,
                    opacity: Animated.multiply(pulseRingOpacity, 0.5),
                    transform: [{ scale: pulseScale }],
                  },
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  s.pulseRing,
                  {
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    top: -12,
                    left: -12,
                    borderColor: eyeColor,
                    opacity: Animated.multiply(pulseRingOpacity, 0.25),
                    transform: [{ scale: pulseScale }],
                  },
                ]}
              />
            </>
          )}
          {/* Portal details (morphed mode) */}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { opacity: portalDetailOpacity }]}
          >
            {/* Portal border */}
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  borderWidth: 1.5,
                  borderColor: eyeColor,
                  borderRadius: 11,
                },
              ]}
            />
            {/* Corner brackets */}
            <View style={[s.portalCorner, { top: bracketOffset, left: bracketOffset, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 3 }]} />
            <View style={[s.portalCorner, { top: bracketOffset, right: bracketOffset, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 3 }]} />
            <View style={[s.portalCorner, { bottom: bracketOffset, left: bracketOffset, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 3 }]} />
            <View style={[s.portalCorner, { bottom: bracketOffset, right: bracketOffset, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 3 }]} />
            {/* Scan line */}
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { overflow: 'hidden', borderRadius: 10 }]}>
              <Animated.View style={[s.scanLine, { transform: [{ translateY: scanY }] }]} />
            </View>
            {/* Target label */}
            <View style={[s.targetLabelWrap, { minWidth: 80, paddingHorizontal: 10 }]}>
              <Text style={s.targetLabel} numberOfLines={1}>
                <Text style={s.targetLabelDim}>[ </Text>
                {step.label}
                <Text style={s.targetLabelDim}> ]</Text>
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Callout */}
      {phase === 'tutorial' && calloutPos && (
        <Animated.View
          pointerEvents="auto"
          style={[
            s.callout,
            calloutPos.insidePortal && { backgroundColor: 'rgba(2,5,14,0.92)' },
            {
              left: calloutPos.left,
              width: calloutPos.width,
              top: calloutPos.top,
              bottom: calloutPos.bottom,
              opacity: calloutOpacity,
            },
          ]}
        >
          {renderMessage()}
          {calloutPos.pointerAt === 'top' && (
            <View style={[s.pointerUp, { left: calloutPos.width / 2 - 6 }]} />
          )}
          {calloutPos.pointerAt === 'bottom' && (
            <View style={[s.pointerDown, { left: calloutPos.width / 2 - 6 }]} />
          )}
        </Animated.View>
      )}

      {/* Demo / Announce panel (slides above nav strip) */}
      {(phase === 'demo' || phase === 'announce') && (
        <Animated.View
          pointerEvents="auto"
          style={[s.panel, { transform: [{ translateY: panelTranslate }] }]}
        >
          {phase === 'demo' && (
            <View style={s.body}>
              <Text style={s.demoLabel}>LIVE DEMONSTRATION</Text>
              <DemoVisual kind={step.codexEntryId ?? 'conveyor'} />
              <Text style={s.demoText}>{step.demoText}</Text>
            </View>
          )}
          {phase === 'announce' && codexEntry && (
            <View style={[s.body, { alignItems: 'center' }]}>
              <Text style={s.announceLabel}>INCOMING DATA PACKET</Text>
              <View style={s.announceIcon}>
                <PieceIcon type={codexEntry.id} size={48} />
              </View>
              <Text style={s.announceName}>{codexEntry.name.toUpperCase()}</Text>
              <Text style={s.announceSub}>NEW CODEX ENTRY UNLOCKED</Text>
              <View style={s.progressBarTrack}>
                <LinearGradient
                  colors={['#F0B429', '#00D4FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.progressBarFill, { width: `${annProgress}%` }]}
                />
              </View>
              <Text style={s.progressText}>
                {annComplete ? 'DECRYPTION COMPLETE' : `DECRYPTING... ${Math.round(annProgress)}%`}
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Minimal nav strip (always present except during codex) */}
      {phase !== 'codex' && (
        <Animated.View
          pointerEvents="auto"
          style={[s.navStrip, { bottom: navStripBottom, transform: [{ translateY: navStripY }] }]}
        >
          <View style={s.navLeft}>
            <Animated.View style={[s.eyeDot, { backgroundColor: eyeColor, opacity: eyePulse }]} />
            <Text style={[s.cogsLabel, { color: eyeColor }]}>C.O.G.S</Text>
            <Text style={s.stepText}>STEP {currentStep + 1} / {steps.length}</Text>
            <View style={s.dots}>
              {steps.map((_, i) => {
                const isCurrent = i === currentStep;
                const isCompleted = i < currentStep;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => navigateToStep(i)}
                    disabled={!isCompleted}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        s.dot,
                        isCurrent && s.dotCurrent,
                        isCompleted && s.dotCompleted,
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={s.navRight}>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
              <Text style={s.skipText}>SKIP</Text>
            </TouchableOpacity>
            {(currentStep > 0 || phase !== 'tutorial') && (
              <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.8}>
                <Text style={s.backText}>BACK</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                s.primaryBtn,
                phase === 'tutorial' && step.showDemo ? s.primaryAmber
                : phase === 'demo' ? s.primaryAmber
                : phase === 'announce' ? (annComplete ? s.primaryAmber : [s.primaryAmber, s.primaryDisabled])
                : (step.eyeState === 'amber' ? s.primaryAmber : s.primaryBlue),
              ]}
              onPress={handlePrimary}
              disabled={phase === 'announce' && !annComplete}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  s.primaryText,
                  phase === 'tutorial' && step.showDemo ? s.primaryAmberText
                  : phase === 'demo' || phase === 'announce' ? s.primaryAmberText
                  : (step.eyeState === 'amber' ? s.primaryAmberText : s.primaryBlueText),
                ]}
              >
                {phase === 'tutorial' && step.showDemo ? 'SHOW ME'
                  : phase === 'demo' ? 'READY'
                  : phase === 'announce' ? 'VIEW ENTRY'
                  : isLastStep ? 'READY'
                  : 'UNDERSTOOD'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Codex overlay */}
      {codexVisible && codexEntry && (
        <Animated.View
          pointerEvents="auto"
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateY: codexTranslate }], backgroundColor: Colors.void },
          ]}
        >
          <CodexDetailView
            entry={codexEntry}
            onUnderstood={handleCodexUnderstood}
            entryNumber={currentStep + 1}
          />
          <PixelDissolve />
        </Animated.View>
      )}
    </View>
  );
}

// ─── DemoVisual: switches on piece kind ────────────────────────────────────
// Demo box is 80 wide, inner track is [8..72] (width 64).
// Ball is 6x6 sitting at left:8. Travel range = 64 - 6 = 58 so the ball's
// right edge stops at the track's right edge.

function DemoVisual({ kind }: { kind: string }) {
  if (kind === 'gear') return <GearDemo />;
  if (kind === 'config_node' || kind === 'configNode') return <ConfigNodeDemo />;
  if (kind === 'splitter') return <SplitterDemo />;
  if (kind === 'scanner') return <ScannerDemo />;
  if (kind === 'transmitter') return <TransmitterDemo />;
  return <ConveyorDemo />;
}

const TRACK_TRAVEL = 58; // inner track width 64 - ball 6
const V_TRAVEL = 14;     // inner vertical track height 20 - ball 6

function ConveyorDemo() {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [0, TRACK_TRAVEL] });
  return (
    <View style={s.demoBox}>
      <View style={s.demoTrack} />
      <Animated.View style={[s.demoBall, { transform: [{ translateX: tx }] }]} />
    </View>
  );
}

function GearDemo() {
  // Horizontal segment: ball travels 0 → 26 (so right edge hits gear center).
  // Vertical segment: 0 → V_TRAVEL.
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(p, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [p]);
  const tx = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 26, 26] });
  const ty = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, V_TRAVEL] });
  return (
    <View style={s.demoBox}>
      <View style={s.gearTrackH} />
      <View style={s.gearTrackV} />
      <View style={s.gearCorner} />
      <Animated.View
        style={[s.demoBall, { transform: [{ translateX: tx }, { translateY: ty }] }]}
      />
    </View>
  );
}

function ConfigNodeDemo() {
  const x = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]),
    );
    pulseLoop.start();
    return () => { loop.stop(); pulseLoop.stop(); };
  }, [x, pulse]);
  // Travel to center 26, pause, continue to TRACK_TRAVEL.
  const tx = x.interpolate({
    inputRange: [0, 0.45, 0.55, 1],
    outputRange: [0, 26, 26, TRACK_TRAVEL],
  });
  return (
    <View style={s.demoBox}>
      <View style={s.demoTrack} />
      <View style={s.configCenter} />
      <Animated.View style={[s.configIndicator, { opacity: pulse }]} />
      <Animated.View style={[s.demoBall, { transform: [{ translateX: tx }] }]} />
    </View>
  );
}

function SplitterDemo() {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(p, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [p]);
  const preX = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 26, 26] });
  const preOpacity = p.interpolate({ inputRange: [0, 0.49, 0.5], outputRange: [1, 1, 0] });
  const rightX = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [26, 26, TRACK_TRAVEL] });
  const downY = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, V_TRAVEL] });
  const postOpacity = p.interpolate({ inputRange: [0, 0.5, 0.51], outputRange: [0, 0, 1] });
  return (
    <View style={s.demoBox}>
      <View style={s.demoTrack} />
      <View style={s.splitterTrackDown} />
      <View style={s.configCenter} />
      <Animated.View style={[s.demoBall, { opacity: preOpacity, transform: [{ translateX: preX }] }]} />
      <Animated.View style={[s.demoBall, { opacity: postOpacity, transform: [{ translateX: rightX }] }]} />
      <Animated.View style={[s.demoBall, { opacity: postOpacity, transform: [{ translateX: 26 }, { translateY: downY }] }]} />
    </View>
  );
}

function ScannerDemo() {
  const x = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    const flashLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(flash, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(flash, { toValue: 0, duration: 600, useNativeDriver: false }),
        Animated.delay(200),
      ]),
    );
    flashLoop.start();
    return () => { loop.stop(); flashLoop.stop(); };
  }, [x, flash]);
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [0, TRACK_TRAVEL] });
  return (
    <View style={s.demoBox}>
      <View style={s.demoTrack} />
      <View style={s.dataMarker} />
      <Animated.Text style={[s.scanReadout, { opacity: flash }]}>1</Animated.Text>
      <Animated.View style={[s.demoBall, { transform: [{ translateX: tx }] }]} />
    </View>
  );
}

function TransmitterDemo() {
  const x = useRef(new Animated.Value(0)).current;
  const markerOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    const markerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(markerOpacity, { toValue: 0, duration: 700, useNativeDriver: false }),
        Animated.timing(markerOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.delay(800),
      ]),
    );
    markerLoop.start();
    return () => { loop.stop(); markerLoop.stop(); };
  }, [x, markerOpacity]);
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [0, TRACK_TRAVEL] });
  return (
    <View style={s.demoBox}>
      <View style={s.demoTrack} />
      <View style={s.configCenter} />
      <Animated.View style={[s.dataMarker, { opacity: markerOpacity }]} />
      <Animated.View style={[s.demoBall, { transform: [{ translateX: tx }] }]} />
    </View>
  );
}

// ─── PixelDissolve ──────────────────────────────────────────────────────────

function PixelDissolve() {
  const COLS = 40;
  const ROWS = 20;
  const CELL = Math.ceil(SCREEN_W / COLS);
  const CELL_H = Math.ceil(SCREEN_H / ROWS);
  const total = COLS * ROWS;

  const opacities = useRef(
    Array.from({ length: total }, () => new Animated.Value(1)),
  ).current;
  const [, force] = useState(0);

  useEffect(() => {
    const indices = Array.from({ length: total }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    let group = 0;
    const isWeb = Platform.OS === 'web';
    const groupSize = isWeb ? 40 : 200;
    const tickMs = isWeb ? 30 : 15;
    const fadeDur = isWeb ? 180 : 100;
    const delayMax = isWeb ? 120 : 60;
    const id = setInterval(() => {
      const start = group * groupSize;
      const end = Math.min(total, start + groupSize);
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
      if (start + groupSize >= total) {
        clearInterval(id);
        setTimeout(() => force(1), 1200);
      }
    }, tickMs);
    return () => clearInterval(id);
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {opacities.map((op, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: col * CELL,
              top: row * CELL_H,
              width: CELL,
              height: CELL_H,
              backgroundColor: '#06090F',
              opacity: op,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,6,18,0.52)',
  },
  hudBracket: {
    position: 'absolute',
    width: 18,
    height: 18,
    opacity: 0.28,
    zIndex: 100,
  },
  hudBH: {
    position: 'absolute',
    width: 18,
    height: 1.5,
    backgroundColor: '#00D4FF',
  },
  hudBV: {
    position: 'absolute',
    width: 1.5,
    height: 18,
    backgroundColor: '#00D4FF',
  },
  orb: {
    position: 'absolute',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  portalCorner: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderColor: '#F0B429',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0,212,255,0.45)',
  },
  targetLabelWrap: {
    position: 'absolute',
    top: -27,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  targetLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#F0B429',
    letterSpacing: 1.2,
  },
  targetLabelDim: {
    color: 'rgba(240,180,41,0.4)',
  },
  callout: {
    position: 'absolute',
    backgroundColor: 'rgba(2,5,14,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.10)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 12,
    zIndex: 50,
  },
  pointerUp: {
    position: 'absolute',
    top: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(2,5,14,0.97)',
  },
  pointerDown: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(2,5,14,0.97)',
  },
  message: {
    fontFamily: Fonts.exo2,
    fontSize: 14,
    fontWeight: '300',
    color: '#B0CCE8',
    lineHeight: 14 * 1.65,
  },
  messageHighlight: {
    fontWeight: '500',
  },
  panel: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(2,5,14,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,212,255,0.10)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,212,255,0.10)',
    maxHeight: 280,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm + 2,
  },
  navStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(2,5,14,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,212,255,0.10)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  cogsLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    letterSpacing: 1.5,
    opacity: 0.65,
  },
  stepText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 1,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(74,158,255,0.18)',
  },
  dotCurrent: {
    backgroundColor: '#00D4FF',
  },
  dotCompleted: {
    backgroundColor: 'rgba(0,212,255,0.5)',
  },
  skipText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: 'rgba(122,150,176,0.6)',
    letterSpacing: 1.5,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: 'rgba(122,150,176,0.4)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  backText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 1.5,
  },
  primaryBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  primaryBlue: {
    borderColor: '#00D4FF',
    backgroundColor: 'rgba(0,212,255,0.12)',
  },
  primaryAmber: {
    borderColor: '#F0B429',
    backgroundColor: 'rgba(240,180,41,0.12)',
  },
  primaryDisabled: {
    opacity: 0.4,
  },
  primaryText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  primaryBlueText: {
    color: '#00D4FF',
  },
  primaryAmberText: {
    color: '#F0B429',
  },
  // Demo styles
  demoLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.amber,
    letterSpacing: 2,
  },
  demoBox: {
    width: 80,
    height: 48,
    alignSelf: 'center',
    backgroundColor: '#0a1628',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.25)',
    borderRadius: 6,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  demoTrack: {
    height: 2,
    backgroundColor: 'rgba(0,212,255,0.3)',
    marginHorizontal: 8,
  },
  demoBall: {
    position: 'absolute',
    left: 8,
    top: 22,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D4FF',
  },
  gearTrackH: {
    position: 'absolute',
    left: 8,
    top: 23,
    width: 26,
    height: 2,
    backgroundColor: 'rgba(0,212,255,0.3)',
  },
  gearTrackV: {
    position: 'absolute',
    left: 34,
    top: 23,
    width: 2,
    height: 20,
    backgroundColor: 'rgba(0,212,255,0.3)',
  },
  gearCorner: {
    position: 'absolute',
    left: 31,
    top: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00D4FF',
    backgroundColor: 'rgba(0,212,255,0.2)',
  },
  configCenter: {
    position: 'absolute',
    left: 31,
    top: 18,
    width: 6,
    height: 10,
    borderRadius: 1,
    backgroundColor: 'rgba(167,139,250,0.5)',
    borderWidth: 1,
    borderColor: '#A78BFA',
  },
  configIndicator: {
    position: 'absolute',
    left: 32,
    top: 10,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4ecb8d',
  },
  splitterTrackDown: {
    position: 'absolute',
    left: 34,
    top: 28,
    width: 2,
    height: 18,
    backgroundColor: 'rgba(0,212,255,0.3)',
  },
  dataMarker: {
    position: 'absolute',
    left: 30,
    top: 34,
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor: 'rgba(0,212,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.5)',
  },
  scanReadout: {
    position: 'absolute',
    left: 30,
    top: 2,
    width: 8,
    textAlign: 'center',
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.amber,
  },
  demoText: {
    fontFamily: Fonts.exo2,
    fontSize: 13,
    color: '#B0CCE8',
    fontWeight: '300',
    lineHeight: 13 * 1.6,
  },
  // Announce styles
  announceLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.amber,
    letterSpacing: 2,
  },
  announceIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  announceName: {
    fontFamily: Fonts.exo2,
    fontSize: 17,
    fontWeight: '500',
    color: Colors.starWhite,
  },
  announceSub: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
  },
  progressBarTrack: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(74,158,255,0.18)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  progressText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1.5,
  },
});
