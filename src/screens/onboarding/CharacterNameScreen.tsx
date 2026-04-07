import React, { useEffect, useState } from 'react';
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
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import CogsAvatar from '../../components/CogsAvatar';
import { usePlayerStore } from '../../store/playerStore';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CharacterName'>;
};

type Phase = 'input' | 'logging' | 'reveal' | 'ready';

export default function CharacterNameScreen({ navigation }: Props) {
  const [nameInput, setNameInput] = useState('');
  const [phase, setPhase] = useState<Phase>('input');

  const setStoreName = usePlayerStore(s => s.setName);

  // Animations
  const screenOpacity = useSharedValue(0);
  const inputReveal = useSharedValue(0);
  const loggingOpacity = useSharedValue(0);
  const nameReveal = useSharedValue(0);
  const designationReveal = useSharedValue(0);
  const tapHintReveal = useSharedValue(0);
  const loggingPulse = useSharedValue(1);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 400 });
    inputReveal.value = withDelay(300, withTiming(1, { duration: 500 }));
  }, []);

  const handleConfirm = () => {
    if (!nameInput.trim()) return;
    setStoreName(nameInput.trim());
    setPhase('logging');

    // Hide input, show logging text
    inputReveal.value = withTiming(0, { duration: 300 });
    loggingOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));

    // Pulse "logging"
    loggingPulse.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      3,
      false,
    );

    // After 2s, reveal name
    setTimeout(() => {
      loggingOpacity.value = withTiming(0, { duration: 300 });
      setPhase('reveal');
      nameReveal.value = withDelay(200, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
      designationReveal.value = withDelay(600, withTiming(1, { duration: 600 }));
      tapHintReveal.value = withDelay(1600, withTiming(1, { duration: 500 }));
    }, 2000);
  };

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const inputStyle = useAnimatedStyle(() => ({
    opacity: inputReveal.value,
    transform: [{ translateY: (1 - inputReveal.value) * 12 }],
  }));
  const loggingStyle = useAnimatedStyle(() => ({
    opacity: loggingOpacity.value * loggingPulse.value,
  }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameReveal.value,
    transform: [{ scale: 0.85 + nameReveal.value * 0.15 }],
  }));
  const designationStyle = useAnimatedStyle(() => ({
    opacity: designationReveal.value,
    transform: [{ translateY: (1 - designationReveal.value) * 10 }],
  }));
  const tapHintStyle = useAnimatedStyle(() => ({ opacity: tapHintReveal.value }));

  const playerName = usePlayerStore(s => s.name);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View style={[s.root, screenStyle]}>
        {/* HUD brackets */}
        <View pointerEvents="none" style={[s.bracket, { top: 8, left: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderTopLeftRadius: 3 }]} />
        <View pointerEvents="none" style={[s.bracket, { top: 8, right: 8, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderTopRightRadius: 3 }]} />
        <View pointerEvents="none" style={[s.bracket, { bottom: 8, left: 8, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderBottomLeftRadius: 3 }]} />
        <View pointerEvents="none" style={[s.bracket, { bottom: 8, right: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderBottomRightRadius: 3 }]} />

        {/* Header */}
        <View style={s.header}>
          <CogsAvatar size="small" state="online" />
          <Text style={s.headerText}>C.O.G.S UNIT 7</Text>
        </View>

        {/* COGS prompt */}
        <View style={s.promptSection}>
          <View style={s.promptBubble}>
            <Text style={s.promptText}>
              I will need something to call you.{'\n'}Your name, please.
            </Text>
          </View>
        </View>

        {/* Input phase */}
        {phase === 'input' || phase === 'logging' ? (
          <Animated.View style={[s.inputSection, inputStyle]}>
            <TextInput
              style={s.nameInput}
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
              style={[s.confirmBtn, !nameInput.trim() && s.confirmBtnDisabled]}
              onPress={handleConfirm}
              activeOpacity={nameInput.trim() ? 0.85 : 1}
              disabled={!nameInput.trim()}
            >
              <Text style={[s.confirmBtnText, !nameInput.trim() && s.confirmBtnTextDim]}>
                CONFIRM
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {/* Logging phase */}
        <Animated.View style={[s.loggingSection, loggingStyle]} pointerEvents="none">
          <Text style={s.loggingText}>LOGGING TO MANIFEST...</Text>
        </Animated.View>

        {/* Reveal phase */}
        {(phase === 'reveal' || phase === 'ready') && (
          <View style={s.revealSection}>
            <Animated.Text style={[s.revealName, nameStyle]}>
              {playerName}
            </Animated.Text>

            <Animated.View style={[s.designationCard, designationStyle]}>
              <View style={s.designationBorder} />
              <View style={s.designationInner}>
                <Text style={s.designationTitle}>THE ENGINEER</Text>
                <Text style={s.designationSub}>Assigned by C.O.G.S Unit 7</Text>
              </View>
            </Animated.View>

            <Animated.View style={[s.tapHint, tapHintStyle]}>
              <TouchableOpacity onPress={() => navigation.navigate('Discipline')} activeOpacity={0.7}>
                <Text style={s.tapHintText}>TAP TO CONTINUE →</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  bracket: {
    position: 'absolute',
    width: 18,
    height: 18,
    zIndex: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,212,255,0.08)',
    backgroundColor: 'rgba(6,9,18,0.8)',
    gap: Spacing.sm,
    height: 112,
  },
  headerText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#00D4FF',
    opacity: 0.65,
    letterSpacing: 1,
  },
  promptSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  promptBubble: {
    backgroundColor: 'rgba(6,9,18,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.12)',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  promptText: {
    fontFamily: Fonts.exo2,
    fontSize: 14,
    fontWeight: '300',
    color: '#B0CCE8',
    fontStyle: 'italic',
    lineHeight: 23,
    textAlign: 'center',
  },
  inputSection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  nameInput: {
    backgroundColor: 'rgba(0,212,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Fonts.exo2,
    fontSize: 18,
    fontWeight: '400',
    color: '#E8F4FF',
    textAlign: 'center',
  },
  confirmBtn: {
    backgroundColor: 'rgba(0,212,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.45)',
    borderRadius: 8,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: 'rgba(0,212,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.12)',
  },
  confirmBtnText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00D4FF',
    letterSpacing: 2,
  },
  confirmBtnTextDim: { color: 'rgba(0,212,255,0.3)' },
  loggingSection: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loggingText: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.sm,
    color: Colors.blue,
    letterSpacing: 3,
  },
  revealSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  revealName: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.hero,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 2,
    textAlign: 'center',
  },
  designationCard: {
    borderWidth: 1.5,
    borderColor: Colors.copper,
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  designationBorder: {
    height: 3,
    backgroundColor: Colors.copper,
  },
  designationInner: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(200,121,65,0.05)',
  },
  designationTitle: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.copper,
    letterSpacing: 4,
  },
  designationSub: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.muted,
    letterSpacing: 1,
  },
  tapHint: {
    position: 'absolute',
    bottom: 60,
  },
  tapHintText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: '#00D4FF',
    opacity: 0.65,
    letterSpacing: 1.5,
  },
});
