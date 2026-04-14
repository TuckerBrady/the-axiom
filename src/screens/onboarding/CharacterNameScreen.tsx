import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import CogsAvatar from '../../components/CogsAvatar';
import { usePlayerStore } from '../../store/playerStore';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';
import {
  REVEAL_BEAT1_PROMPT,
  REVEAL_BEAT2_ACK,
  REVEAL_BEAT3_HUD,
} from '../../constants/onboardingCopy';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CharacterName'>;
};

type Phase = 'input' | 'logging' | 'reveal';

// ─── Design tokens from mockup ──────────────────────────────────────────────
const AMBER = '#F59E0B';
const BLUE_OPS = '#38BDF8';
const GREEN_WARM = '#4ADE80';

// ─── Component ──────────────────────────────────────────────────────────────

export default function CharacterNameScreen({ navigation }: Props) {
  const [nameInput, setNameInput] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [bubbleText, setBubbleText] = useState(REVEAL_BEAT1_PROMPT);
  const [eyeColor, setEyeColor] = useState(AMBER);
  const [canTap, setCanTap] = useState(false);

  const setStoreName = usePlayerStore(s => s.setName);
  const playerName = usePlayerStore(s => s.name);

  // ── Animated values ──
  const screenOp = useSharedValue(0);
  const bracketOp = useSharedValue(0);
  const cogsRowY = useSharedValue(-30);
  const cogsRowOp = useSharedValue(0);
  const bubbleY = useSharedValue(-20);
  const bubbleOp = useSharedValue(0);
  const inputOp = useSharedValue(0);
  const loggingOp = useSharedValue(0);
  const loggingPulse = useSharedValue(1);
  const nameOp = useSharedValue(0);
  const nameY = useSharedValue(20);
  const desigOp = useSharedValue(0);
  const desigY = useSharedValue(20);
  const scanLineY = useSharedValue(-4);
  const scanLineOp = useSharedValue(0);
  const statusOp = useSharedValue(0);
  const statusDotOp = useSharedValue(0);
  const ctaOp = useSharedValue(0);
  const ctaBlink = useSharedValue(1);
  const bubbleTextOp = useSharedValue(1);

  // ── Mount entrance ──
  useEffect(() => {
    screenOp.value = withTiming(1, { duration: 400 });
    bracketOp.value = withDelay(100, withTiming(1, { duration: 400 }));
    cogsRowOp.value = withDelay(200, withTiming(1, { duration: 500 }));
    cogsRowY.value = withDelay(200, withTiming(0, { duration: 500, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
    bubbleOp.value = withDelay(400, withTiming(1, { duration: 500 }));
    bubbleY.value = withDelay(400, withTiming(0, { duration: 500, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
    inputOp.value = withDelay(600, withTiming(1, { duration: 400 }));
  }, []);

  // ── Bubble text swap (380ms: fade out → swap → fade in) ──
  const swapBubble = useCallback((newText: string) => {
    bubbleTextOp.value = withTiming(0, { duration: 190 });
    const timer = setTimeout(() => {
      setBubbleText(newText);
      bubbleTextOp.value = withTiming(1, { duration: 190 });
    }, 190);
    return () => clearTimeout(timer);
  }, [bubbleTextOp]);

  // ── Three-beat reveal sequence ──
  const runRevealSequence = useCallback(() => {
    // BEAT 1 (0.0–1.7s): Name + designation rise
    // t=1.0s: name rises
    nameOp.value = withDelay(1000, withTiming(1, { duration: 700, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
    nameY.value = withDelay(1000, withTiming(0, { duration: 700, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
    // t=1.5s: designation rises
    desigOp.value = withDelay(1500, withTiming(1, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
    desigY.value = withDelay(1500, withTiming(0, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) }));

    // BEAT 2 (1.8–3.7s): COGS acknowledges
    // t=1.8s: bubble swaps to acknowledgment
    setTimeout(() => swapBubble(REVEAL_BEAT2_ACK), 1800);
    // t=2.2s: scan line sweeps designation
    scanLineOp.value = withDelay(2200, withTiming(1, { duration: 100 }));
    scanLineY.value = withDelay(2200, withTiming(60, { duration: 900, easing: Easing.inOut(Easing.quad) }));
    // t=2.2s: status row fades in
    statusOp.value = withDelay(2200, withTiming(1, { duration: 400 }));
    // t=2.4s: status dot pulses
    setTimeout(() => {
      statusDotOp.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        ), -1, false,
      );
    }, 2400);
    // t=2.6s: CTA appears
    ctaOp.value = withDelay(2600, withTiming(1, { duration: 400 }));
    setTimeout(() => runOnJS(setCanTap)(true), 2600);
    // t=3.2s: CTA blink loop
    setTimeout(() => {
      ctaBlink.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        ), -1, false,
      );
    }, 3200);

    // BEAT 3 (3.8s+): Eye shifts amber → blue, HUD explainer
    setTimeout(() => setEyeColor(BLUE_OPS), 3800);
    setTimeout(() => swapBubble(REVEAL_BEAT3_HUD), 4000);
  }, [nameOp, nameY, desigOp, desigY, scanLineOp, scanLineY, statusOp, statusDotOp, ctaOp, ctaBlink, swapBubble, bubbleTextOp]);

  // ── Handle name confirm ──
  const handleConfirm = () => {
    if (!nameInput.trim()) return;
    setStoreName(nameInput.trim());
    setPhase('logging');

    inputOp.value = withTiming(0, { duration: 300 });
    loggingOp.value = withDelay(200, withTiming(1, { duration: 400 }));
    loggingPulse.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ), 3, false,
    );

    // After logging phase (2s), start reveal
    setTimeout(() => {
      loggingOp.value = withTiming(0, { duration: 300 });
      setPhase('reveal');
      runRevealSequence();
    }, 2000);
  };

  // ── Handle advance ──
  const handleAdvance = () => {
    if (!canTap && phase !== 'reveal') return;
    // Cancel all animations cleanly
    cancelAnimation(ctaBlink);
    cancelAnimation(statusDotOp);
    navigation.navigate('Discipline');
  };

  // ── Dev replay ──
  const handleReplay = () => {
    setPhase('input');
    setBubbleText(REVEAL_BEAT1_PROMPT);
    setEyeColor(AMBER);
    setCanTap(false);
    setNameInput('');
    // Reset all animated values
    [nameOp, nameY, desigOp, desigY, scanLineOp, scanLineY, statusOp, statusDotOp, ctaOp, ctaBlink, loggingOp, loggingPulse, bubbleTextOp].forEach(v => { v.value = 0; });
    inputOp.value = withDelay(300, withTiming(1, { duration: 400 }));
    scanLineY.value = -4;
    bubbleTextOp.value = 1;
  };

  // ── Animated styles ──
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOp.value }));
  const bracketStyle = useAnimatedStyle(() => ({ opacity: bracketOp.value }));
  const cogsRowStyle = useAnimatedStyle(() => ({ opacity: cogsRowOp.value, transform: [{ translateY: cogsRowY.value }] }));
  const bubbleStyle = useAnimatedStyle(() => ({ opacity: bubbleOp.value, transform: [{ translateY: bubbleY.value }] }));
  const bubbleTextStyle = useAnimatedStyle(() => ({ opacity: bubbleTextOp.value }));
  const inputStyle = useAnimatedStyle(() => ({ opacity: inputOp.value }));
  const loggingStyle = useAnimatedStyle(() => ({ opacity: loggingOp.value * loggingPulse.value }));
  const nameStyle = useAnimatedStyle(() => ({ opacity: nameOp.value, transform: [{ translateY: nameY.value }] }));
  const desigStyle = useAnimatedStyle(() => ({ opacity: desigOp.value, transform: [{ translateY: desigY.value }] }));
  const scanStyle = useAnimatedStyle(() => ({ opacity: scanLineOp.value, transform: [{ translateY: scanLineY.value }] }));
  const statusStyle = useAnimatedStyle(() => ({ opacity: statusOp.value }));
  const statusDotStyle = useAnimatedStyle(() => ({ opacity: statusDotOp.value }));
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOp.value * ctaBlink.value }));

  const displayName = (playerName || 'THE ENGINEER').toUpperCase();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View style={[st.root, screenStyle]}>
        {/* HUD brackets */}
        <Animated.View pointerEvents="none" style={[st.bracket, bracketStyle, { top: 8, left: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderTopLeftRadius: 3 }]} />
        <Animated.View pointerEvents="none" style={[st.bracket, bracketStyle, { top: 8, right: 8, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderTopRightRadius: 3 }]} />
        <Animated.View pointerEvents="none" style={[st.bracket, bracketStyle, { bottom: 8, left: 8, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderBottomLeftRadius: 3 }]} />
        <Animated.View pointerEvents="none" style={[st.bracket, bracketStyle, { bottom: 8, right: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderBottomRightRadius: 3 }]} />

        {/* Dev replay */}
        {__DEV__ && phase === 'reveal' && (
          <TouchableOpacity style={st.replayBtn} onPress={handleReplay} activeOpacity={0.7}>
            <Text style={st.replayText}>REPLAY</Text>
          </TouchableOpacity>
        )}

        {/* TOP: COGS row */}
        <Animated.View style={[st.cogsRow, cogsRowStyle]}>
          <View style={[st.eyeRing, { borderColor: eyeColor }]}>
            <View style={[st.eyePupil, { backgroundColor: eyeColor }]} />
          </View>
          <Text style={st.cogsLabel}>C.O.G.S UNIT 7</Text>
        </Animated.View>

        {/* COGS bubble */}
        <Animated.View style={[st.bubbleWrap, bubbleStyle]}>
          <View style={st.bubble}>
            <Animated.View style={bubbleTextStyle}>
              <Text style={st.bubbleText}>{bubbleText}</Text>
            </Animated.View>
          </View>
        </Animated.View>

        {/* MIDDLE: flex center */}
        <View style={st.middle}>
          {/* Input phase */}
          {(phase === 'input' || phase === 'logging') && (
            <Animated.View style={[st.inputSection, inputStyle]}>
              <TextInput
                style={st.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Enter your name"
                placeholderTextColor="rgba(0,212,255,0.3)"
                maxLength={24}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
              />
              <TouchableOpacity
                style={[st.confirmBtn, !nameInput.trim() && st.confirmBtnDisabled]}
                onPress={handleConfirm}
                activeOpacity={nameInput.trim() ? 0.85 : 1}
                disabled={!nameInput.trim()}
              >
                <Text style={[st.confirmBtnText, !nameInput.trim() && { color: 'rgba(0,212,255,0.3)' }]}>CONFIRM</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Logging */}
          <Animated.View style={[st.loggingWrap, loggingStyle]} pointerEvents="none">
            <Text style={st.loggingText}>LOGGING TO MANIFEST...</Text>
          </Animated.View>

          {/* Reveal phase */}
          {phase === 'reveal' && (
            <View style={st.revealCenter}>
              <Animated.Text style={[st.playerName, nameStyle]}>
                {displayName}
              </Animated.Text>

              <Animated.View style={[st.designationCard, desigStyle]}>
                <View style={st.designationBar} />
                <View style={st.designationInner}>
                  <Text style={st.designationTitle}>THE ENGINEER</Text>
                  <Text style={st.designationSub}>Assigned by C.O.G.S Unit 7</Text>
                  {/* Scan line */}
                  <Animated.View style={[st.scanLine, scanStyle]} pointerEvents="none" />
                </View>
              </Animated.View>

              <Animated.View style={[st.statusRow, statusStyle]}>
                <Animated.View style={[st.statusDot, statusDotStyle]} />
                <Text style={st.statusText}>OPERATIONAL</Text>
              </Animated.View>
            </View>
          )}
        </View>

        {/* BOTTOM: CTA */}
        {phase === 'reveal' && (
          <Animated.View style={[st.ctaWrap, ctaStyle]}>
            <TouchableOpacity onPress={handleAdvance} activeOpacity={0.7}>
              <Text style={st.ctaText}>TAP TO CONTINUE  &#x2192;</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060A0F' },
  bracket: { position: 'absolute', width: 18, height: 18, zIndex: 20 },
  replayBtn: { position: 'absolute', top: 60, right: 16, zIndex: 30, padding: 6 },
  replayText: { fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.copper, opacity: 0.5, letterSpacing: 1 },

  cogsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 24, gap: 12 },
  eyeRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  eyePupil: { width: 16, height: 16, borderRadius: 8 },
  cogsLabel: { fontFamily: Fonts.spaceMono, fontSize: 10, color: '#38BDF8', opacity: 0.65, letterSpacing: 1.5 },

  bubbleWrap: { paddingHorizontal: 24, paddingTop: 12 },
  bubble: { backgroundColor: 'rgba(6,9,18,0.95)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.12)', borderRadius: 10, padding: 16, minHeight: 64 },
  bubbleText: { fontFamily: Fonts.spaceMono, fontSize: 13, color: '#B0CCE8', lineHeight: 21.5 },

  middle: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },

  inputSection: { width: '100%', gap: Spacing.md },
  nameInput: { backgroundColor: 'rgba(0,212,255,0.04)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontFamily: Fonts.exo2, fontSize: 18, color: '#E8F4FF', textAlign: 'center' },
  confirmBtn: { backgroundColor: 'rgba(0,212,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.45)', borderRadius: 8, paddingVertical: Spacing.md, alignItems: 'center' },
  confirmBtnDisabled: { borderColor: 'rgba(0,212,255,0.12)' },
  confirmBtnText: { fontFamily: Fonts.spaceMono, fontSize: 12, fontWeight: 'bold', color: '#00D4FF', letterSpacing: 2 },

  loggingWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  loggingText: { fontFamily: Fonts.spaceMono, fontSize: FontSizes.sm, color: Colors.blue, letterSpacing: 3 },

  revealCenter: { alignItems: 'center', gap: 24, width: '100%' },
  playerName: { fontFamily: Fonts.orbitron, fontSize: 40, fontWeight: '900', color: '#E8F4FF', letterSpacing: 3, textAlign: 'center' },

  designationCard: { borderWidth: 1.5, borderColor: AMBER, borderRadius: 14, overflow: 'hidden', width: '100%' },
  designationBar: { height: 3, backgroundColor: AMBER },
  designationInner: { padding: 20, alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,158,11,0.04)' },
  designationTitle: { fontFamily: Fonts.orbitron, fontSize: FontSizes.xxl, fontWeight: 'bold', color: AMBER, letterSpacing: 4, textTransform: 'uppercase' },
  designationSub: { fontFamily: Fonts.spaceMono, fontSize: FontSizes.xs, color: Colors.muted, letterSpacing: 1 },
  scanLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: AMBER, opacity: 0.5 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN_WARM },
  statusText: { fontFamily: Fonts.spaceMono, fontSize: 10, color: GREEN_WARM, letterSpacing: 2, opacity: 0.8 },

  ctaWrap: { paddingBottom: 48, alignItems: 'center' },
  ctaText: { fontFamily: Fonts.spaceMono, fontSize: 11, color: BLUE_OPS, letterSpacing: 2 },
});
