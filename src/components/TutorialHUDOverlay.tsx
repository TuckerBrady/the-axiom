import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
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

const SPOT_PAD = 8;
const SPOT_BORDER_INSET = 3;

export default function TutorialHUDOverlay({
  steps,
  levelId,
  targetRefs,
  onComplete,
  onSkip,
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('tutorial');
  const [spotlightLayout, setSpotlightLayout] = useState<Layout | null>(null);
  const [annProgress, setAnnProgress] = useState(0);
  const [annComplete, setAnnComplete] = useState(false);
  const [codexVisible, setCodexVisible] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const messageOpacity = useRef(new Animated.Value(1)).current;
  const panelTranslate = useRef(new Animated.Value(400)).current;
  const codexTranslate = useRef(new Animated.Value(SCREEN_H)).current;
  const eyePulse = useRef(new Animated.Value(0.4)).current;
  const scanY = useRef(new Animated.Value(0)).current;

  // Animated rect values for spotlight overlay (smooth transitions)
  const topH = useRef(new Animated.Value(SCREEN_H)).current;
  const botY = useRef(new Animated.Value(SCREEN_H)).current;
  const botH = useRef(new Animated.Value(0)).current;
  const leftY = useRef(new Animated.Value(0)).current;
  const leftH = useRef(new Animated.Value(0)).current;
  const leftW = useRef(new Animated.Value(0)).current;
  const rightX = useRef(new Animated.Value(SCREEN_W)).current;
  const rightY = useRef(new Animated.Value(0)).current;
  const rightH = useRef(new Animated.Value(0)).current;
  const rightW = useRef(new Animated.Value(0)).current;

  const step = steps[currentStep];

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
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

  // Slide panel in on mount
  useEffect(() => {
    Animated.timing(panelTranslate, {
      toValue: 0,
      duration: 400,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [panelTranslate]);

  // Eye pulse loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(eyePulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(eyePulse, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [eyePulse]);

  // Scan line loop inside spotlight
  useEffect(() => {
    if (!spotlightLayout) return;
    scanY.setValue(0);
    const loop = Animated.loop(
      Animated.timing(scanY, {
        toValue: spotlightLayout.height,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spotlightLayout, scanY]);

  // Persist step
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(`axiom_tutorial_step_${levelId}`, String(currentStep)).catch(() => {});
  }, [currentStep, hydrated, levelId]);

  // Measure target on step / phase change
  useEffect(() => {
    if (!hydrated || phase !== 'tutorial' || !step) return;
    const ref = targetRefs[step.targetRef];
    if (!ref?.current) {
      setSpotlightLayout(null);
      return;
    }
    // Defer slightly so layout is ready
    const t = setTimeout(() => {
      ref.current?.measure?.((x, y, width, height, pageX, pageY) => {
        setSpotlightLayout({ x: pageX, y: pageY, width, height });
      });
    }, 50);
    return () => clearTimeout(t);
  }, [currentStep, phase, hydrated, step, targetRefs]);

  // Animate the four overlay rects when spotlight changes
  useEffect(() => {
    const ease = Easing.bezier(0.4, 0, 0.2, 1);
    const dur = 550;
    if (!spotlightLayout) {
      Animated.parallel([
        Animated.timing(topH, { toValue: SCREEN_H, duration: dur, easing: ease, useNativeDriver: false }),
        Animated.timing(botY, { toValue: SCREEN_H, duration: dur, easing: ease, useNativeDriver: false }),
        Animated.timing(botH, { toValue: 0, duration: dur, easing: ease, useNativeDriver: false }),
        Animated.timing(leftH, { toValue: 0, duration: dur, easing: ease, useNativeDriver: false }),
        Animated.timing(rightH, { toValue: 0, duration: dur, easing: ease, useNativeDriver: false }),
      ]).start();
      return;
    }
    const sx = spotlightLayout.x;
    const sy = spotlightLayout.y;
    const sw = spotlightLayout.width;
    const sh = spotlightLayout.height;
    Animated.parallel([
      Animated.timing(topH, { toValue: Math.max(0, sy - SPOT_PAD), duration: dur, easing: ease, useNativeDriver: false }),
      Animated.timing(botY, { toValue: sy + sh + SPOT_PAD, duration: dur, easing: ease, useNativeDriver: false }),
      Animated.timing(botH, { toValue: Math.max(0, SCREEN_H - (sy + sh + SPOT_PAD)), duration: dur, easing: ease, useNativeDriver: false }),
      Animated.timing(leftY, { toValue: sy - SPOT_PAD, duration: dur, easing: ease, useNativeDriver: false }),
      Animated.timing(leftH, { toValue: sh + SPOT_PAD * 2, duration: dur, easing: ease, useNativeDriver: false }),
      Animated.timing(leftW, { toValue: Math.max(0, sx - SPOT_PAD), duration: dur, easing: ease, useNativeDriver: false }),
      Animated.timing(rightX, { toValue: sx + sw + SPOT_PAD, duration: dur, easing: ease, useNativeDriver: false }),
      Animated.timing(rightY, { toValue: sy - SPOT_PAD, duration: dur, easing: ease, useNativeDriver: false }),
      Animated.timing(rightH, { toValue: sh + SPOT_PAD * 2, duration: dur, easing: ease, useNativeDriver: false }),
      Animated.timing(rightW, { toValue: Math.max(0, SCREEN_W - (sx + sw + SPOT_PAD)), duration: dur, easing: ease, useNativeDriver: false }),
    ]).start();
  }, [spotlightLayout, topH, botY, botH, leftY, leftH, leftW, rightX, rightY, rightH, rightW]);

  // Message fade swap on currentStep change
  useEffect(() => {
    if (phase !== 'tutorial') return;
    Animated.sequence([
      Animated.timing(messageOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(messageOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [currentStep, phase, messageOpacity]);

  // Announce phase: drive progress bar
  useEffect(() => {
    if (phase !== 'announce') return;
    setAnnProgress(0);
    setAnnComplete(false);
    const start = Date.now();
    const totalMs = 3500;
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / totalMs) * 100));
      setAnnProgress(pct);
      if (pct >= 100) {
        setAnnComplete(true);
        clearInterval(id);
      }
    }, 60);
    return () => clearInterval(id);
  }, [phase]);

  // Codex slide-up
  useEffect(() => {
    if (codexVisible) {
      Animated.timing(codexTranslate, {
        toValue: 0,
        duration: 500,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start();
    } else {
      codexTranslate.setValue(SCREEN_H);
    }
  }, [codexVisible, codexTranslate]);

  const advanceStep = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      AsyncStorage.setItem(`axiom_tutorial_complete_${levelId}`, '1').catch(() => {});
      AsyncStorage.removeItem(`axiom_tutorial_step_${levelId}`).catch(() => {});
      onComplete();
      return;
    }
    setCurrentStep(prev => prev + 1);
    setPhase('tutorial');
  }, [currentStep, steps.length, levelId, onComplete]);

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
    onSkip();
  }, [levelId, onSkip]);

  const handleCodexUnderstood = useCallback(() => {
    Animated.timing(codexTranslate, {
      toValue: SCREEN_H,
      duration: 400,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(() => {
      setCodexVisible(false);
      // Advance past current step
      if (currentStep >= steps.length - 1) {
        AsyncStorage.setItem(`axiom_tutorial_complete_${levelId}`, '1').catch(() => {});
        AsyncStorage.removeItem(`axiom_tutorial_step_${levelId}`).catch(() => {});
        onComplete();
      } else {
        setCurrentStep(prev => prev + 1);
        setPhase('tutorial');
      }
    });
  }, [codexTranslate, currentStep, steps.length, levelId, onComplete]);

  const navigateToStep = useCallback((idx: number) => {
    if (idx <= currentStep) {
      setCurrentStep(idx);
      setPhase('tutorial');
    }
  }, [currentStep]);

  if (!hydrated || !step) return null;

  const eyeColor = phase === 'codex' ? '#00D4FF' : step.eyeState === 'amber' ? Colors.amber : '#00D4FF';
  const isLastStep = currentStep === steps.length - 1;

  // Render highlighted message
  const renderMessage = () => {
    const text = step.message;
    const blueWords = step.highlightWords ?? [];
    const amberWords = step.highlightAmberWords ?? [];
    const allHighlights = [
      ...blueWords.map(w => ({ word: w, color: '#00D4FF' })),
      ...amberWords.map(w => ({ word: w, color: '#F0B429' })),
    ];
    if (allHighlights.length === 0) {
      return <Text style={s.message}>{text}</Text>;
    }
    // Build a regex matching any highlighted phrase
    const escaped = allHighlights.map(h => h.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`(${escaped.join('|')})`, 'g');
    const parts = text.split(re);
    return (
      <Text style={s.message}>
        {parts.map((part, i) => {
          const hit = allHighlights.find(h => h.word === part);
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

  const codexEntry = step.codexEntryId ? getCodexEntry(step.codexEntryId) : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Spotlight overlay rects */}
      {phase !== 'codex' && (
        <>
          <Animated.View pointerEvents="auto" style={[s.dim, { top: 0, left: 0, width: SCREEN_W, height: topH }]} />
          <Animated.View pointerEvents="auto" style={[s.dim, { top: botY, left: 0, width: SCREEN_W, height: botH }]} />
          <Animated.View pointerEvents="auto" style={[s.dim, { top: leftY, left: 0, width: leftW, height: leftH }]} />
          <Animated.View pointerEvents="auto" style={[s.dim, { top: rightY, left: rightX, width: rightW, height: rightH }]} />
        </>
      )}

      {/* Spotlight border + brackets + label + scan */}
      {phase === 'tutorial' && spotlightLayout && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: spotlightLayout.x - SPOT_BORDER_INSET,
            top: spotlightLayout.y - SPOT_BORDER_INSET,
            width: spotlightLayout.width + SPOT_BORDER_INSET * 2,
            height: spotlightLayout.height + SPOT_BORDER_INSET * 2,
          }}
        >
          <View style={s.spotlightBorder} />
          {/* corner brackets */}
          {[
            { top: -1, left: -1 },
            { top: -1, right: -1 },
            { bottom: -1, left: -1 },
            { bottom: -1, right: -1 },
          ].map((pos, i) => (
            <View key={i} style={[s.cornerBracket, pos]}>
              <View style={s.cornerH} />
              <View style={s.cornerV} />
            </View>
          ))}
          {/* target label */}
          <View style={s.targetLabelWrap}>
            <Text style={s.targetLabel}>
              <Text style={s.targetLabelDim}>[ </Text>
              {step.label}
              <Text style={s.targetLabelDim}> ]</Text>
            </Text>
          </View>
          {/* scan line */}
          <Animated.View
            style={[
              s.scanLine,
              {
                width: spotlightLayout.width + SPOT_BORDER_INSET * 2,
                transform: [{ translateY: scanY }],
              },
            ]}
          />
        </View>
      )}

      {/* Top-corner HUD brackets */}
      <View pointerEvents="none" style={[s.hudBracket, { top: 14, left: 14 }]}>
        <View style={[s.hudBH, { top: 0, left: 0 }]} />
        <View style={[s.hudBV, { top: 0, left: 0 }]} />
      </View>
      <View pointerEvents="none" style={[s.hudBracket, { top: 14, right: 14 }]}>
        <View style={[s.hudBH, { top: 0, right: 0 }]} />
        <View style={[s.hudBV, { top: 0, right: 0 }]} />
      </View>

      {/* HUD panel */}
      {phase !== 'codex' && (
        <Animated.View
          pointerEvents="auto"
          style={[s.panel, { transform: [{ translateY: panelTranslate }] }]}
        >
          {/* Chrome bar */}
          <View style={s.chromeBar}>
            <View style={s.chromeLeft}>
              <Animated.View style={[s.eyeDot, { backgroundColor: eyeColor, opacity: eyePulse }]} />
              <Text style={s.chromeLabel}>C.O.G.S</Text>
            </View>
            <View style={s.chromeRight}>
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
          </View>

          {/* Body */}
          {phase === 'tutorial' && (
            <View style={s.body}>
              <Animated.View style={{ opacity: messageOpacity }}>
                {renderMessage()}
              </Animated.View>
              <View style={s.actions}>
                <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
                  <Text style={s.skipText}>SKIP TUTORIAL</Text>
                </TouchableOpacity>
                <View style={s.navBtns}>
                  {currentStep > 0 && (
                    <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.8}>
                      <Text style={s.backText}>BACK</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[s.primaryBtn, step.showDemo ? s.primaryAmber : s.primaryBlue]}
                    onPress={handlePrimary}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.primaryText, step.showDemo ? s.primaryAmberText : s.primaryBlueText]}>
                      {step.showDemo ? 'SHOW ME' : isLastStep ? 'READY' : 'UNDERSTOOD'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {phase === 'demo' && (
            <View style={s.body}>
              <Text style={s.demoLabel}>LIVE DEMONSTRATION</Text>
              <DemoVisual kind={step.codexEntryId ?? 'conveyor'} />
              <Text style={s.demoText}>{step.demoText}</Text>
              <View style={s.actions}>
                <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
                  <Text style={s.skipText}>SKIP TUTORIAL</Text>
                </TouchableOpacity>
                <View style={s.navBtns}>
                  <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.8}>
                    <Text style={s.backText}>BACK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.primaryBtn, s.primaryAmber]}
                    onPress={handlePrimary}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.primaryText, s.primaryAmberText]}>READY</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
                {annComplete ? 'DECRYPTION COMPLETE' : `DECRYPTING... ${annProgress}%`}
              </Text>
              <View style={[s.actions, { width: '100%' }]}>
                <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
                  <Text style={s.skipText}>SKIP TUTORIAL</Text>
                </TouchableOpacity>
                <View style={s.navBtns}>
                  <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.8}>
                    <Text style={s.backText}>BACK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.primaryBtn, s.primaryAmber, !annComplete && s.primaryDisabled]}
                    onPress={handlePrimary}
                    disabled={!annComplete}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.primaryText, s.primaryAmberText]}>VIEW ENTRY</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
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

function DemoVisual({ kind }: { kind: string }) {
  if (kind === 'gear') return <GearDemo />;
  if (kind === 'config_node' || kind === 'configNode') return <ConfigNodeDemo />;
  if (kind === 'splitter') return <SplitterDemo />;
  if (kind === 'scanner') return <ScannerDemo />;
  if (kind === 'transmitter') return <TransmitterDemo />;
  return <ConveyorDemo />;
}

function ConveyorDemo() {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [0, 64] });
  return (
    <View style={s.demoBox}>
      <View style={s.demoTrack} />
      <Animated.View style={[s.demoBall, { transform: [{ translateX: tx }] }]} />
    </View>
  );
}

function GearDemo() {
  // L-shaped path: horizontal then vertical.
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(p, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [p]);
  // First half: translateX from 0 to 32 at y=0. Second half: translateY 0 to 20 at x=32.
  const tx = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 32, 32] });
  const ty = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 20] });
  return (
    <View style={s.demoBox}>
      {/* horizontal track */}
      <View style={[s.gearTrackH]} />
      {/* vertical track */}
      <View style={[s.gearTrackV]} />
      {/* gear corner */}
      <View style={s.gearCorner} />
      <Animated.View
        style={[
          s.demoBall,
          { left: 8, top: 14, transform: [{ translateX: tx }, { translateY: ty }] },
        ]}
      />
    </View>
  );
}

function ConfigNodeDemo() {
  const x = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Sequence: travel to center (0->0.45), pause (0.45->0.55), travel to end (0.55->1)
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    );
    pulseLoop.start();
    return () => { loop.stop(); pulseLoop.stop(); };
  }, [x, pulse]);
  const tx = x.interpolate({
    inputRange: [0, 0.45, 0.55, 1],
    outputRange: [0, 32, 32, 64],
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
      Animated.timing(p, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [p]);
  // Before split (0-0.5): single ball x: 0->32. After split: two balls, one x 32->64, other y 0->20.
  const preX = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 32, 32] });
  const preOpacity = p.interpolate({ inputRange: [0, 0.49, 0.5], outputRange: [1, 1, 0] });
  const rightX = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [32, 32, 64] });
  const downY = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 20] });
  const postOpacity = p.interpolate({ inputRange: [0, 0.5, 0.51], outputRange: [0, 0, 1] });
  return (
    <View style={s.demoBox}>
      <View style={s.demoTrack} />
      <View style={s.splitterTrackDown} />
      <View style={s.configCenter} />
      <Animated.View style={[s.demoBall, { opacity: preOpacity, transform: [{ translateX: preX }] }]} />
      <Animated.View style={[s.demoBall, { opacity: postOpacity, transform: [{ translateX: rightX }] }]} />
      <Animated.View style={[s.demoBall, { opacity: postOpacity, transform: [{ translateX: downY.interpolate({ inputRange: [0, 20], outputRange: [32, 32] }) }, { translateY: downY }] }]} />
    </View>
  );
}

function ScannerDemo() {
  const x = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    const flashLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(flash, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.delay(200),
      ]),
    );
    flashLoop.start();
    return () => { loop.stop(); flashLoop.stop(); };
  }, [x, flash]);
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [0, 64] });
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
      Animated.timing(x, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    const markerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(markerOpacity, { toValue: 0, duration: 700, useNativeDriver: true }),
        Animated.timing(markerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(800),
      ]),
    );
    markerLoop.start();
    return () => { loop.stop(); markerLoop.stop(); };
  }, [x, markerOpacity]);
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [0, 64] });
  return (
    <View style={s.demoBox}>
      <View style={s.demoTrack} />
      <View style={s.configCenter} />
      <Animated.View style={[s.dataMarker, { opacity: markerOpacity }]} />
      <Animated.View style={[s.demoBall, { transform: [{ translateX: tx }] }]} />
    </View>
  );
}

// ─── PixelDissolve: grid of cells fading out in batches ────────────────────

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
    // Shuffle indices
    const indices = Array.from({ length: total }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    let group = 0;
    const groupSize = 50;
    const id = setInterval(() => {
      const start = group * groupSize;
      const end = Math.min(total, start + groupSize);
      for (let i = start; i < end; i++) {
        const idx = indices[i];
        Animated.timing(opacities[idx], {
          toValue: 0,
          duration: 250,
          delay: Math.random() * 200,
          useNativeDriver: true,
        }).start();
      }
      group += 1;
      if (start + groupSize >= total) {
        clearInterval(id);
        setTimeout(() => force(1), 1200);
      }
    }, 30);
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
    backgroundColor: 'rgba(0,6,18,0.58)',
  },
  spotlightBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: '#00D4FF',
    borderRadius: 10,
  },
  cornerBracket: {
    position: 'absolute',
    width: 12,
    height: 12,
  },
  cornerH: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 12,
    height: 1.5,
    backgroundColor: '#00D4FF',
  },
  cornerV: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1.5,
    height: 12,
    backgroundColor: '#00D4FF',
  },
  targetLabelWrap: {
    position: 'absolute',
    top: -26,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  targetLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: '#00D4FF',
    letterSpacing: 1.5,
  },
  targetLabelDim: {
    color: 'rgba(0,212,255,0.4)',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    height: 2,
    backgroundColor: 'rgba(0,212,255,0.4)',
  },
  hudBracket: {
    position: 'absolute',
    width: 16,
    height: 16,
    opacity: 0.28,
  },
  hudBH: {
    position: 'absolute',
    width: 16,
    height: 1.5,
    backgroundColor: '#00D4FF',
  },
  hudBV: {
    position: 'absolute',
    width: 1.5,
    height: 16,
    backgroundColor: '#00D4FF',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(2,5,14,0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,212,255,0.16)',
    paddingBottom: Spacing.xl,
  },
  chromeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm + 2,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,212,255,0.10)',
  },
  chromeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  eyeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chromeLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#00D4FF',
    letterSpacing: 2,
  },
  chromeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1.5,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(74,158,255,0.18)',
  },
  dotCurrent: {
    backgroundColor: '#00D4FF',
  },
  dotCompleted: {
    backgroundColor: 'rgba(0,212,255,0.5)',
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  skipText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1.5,
  },
  navBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: 'rgba(122,150,176,0.4)',
    borderRadius: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  primaryBlue: {
    borderColor: '#00D4FF',
    backgroundColor: 'rgba(0,212,255,0.12)',
  },
  primaryAmber: {
    borderColor: Colors.amber,
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
    color: Colors.amber,
  },
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
    top: 16,
    width: 32,
    height: 2,
    backgroundColor: 'rgba(0,212,255,0.3)',
  },
  gearTrackV: {
    position: 'absolute',
    left: 40,
    top: 16,
    width: 2,
    height: 24,
    backgroundColor: 'rgba(0,212,255,0.3)',
  },
  gearCorner: {
    position: 'absolute',
    left: 37,
    top: 13,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00D4FF',
    backgroundColor: 'rgba(0,212,255,0.2)',
  },
  configCenter: {
    position: 'absolute',
    left: 37,
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
    left: 38,
    top: 10,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4ecb8d',
  },
  splitterTrackDown: {
    position: 'absolute',
    left: 40,
    top: 24,
    width: 2,
    height: 20,
    backgroundColor: 'rgba(0,212,255,0.3)',
  },
  dataMarker: {
    position: 'absolute',
    left: 36,
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
    left: 37,
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
