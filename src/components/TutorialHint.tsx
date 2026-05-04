import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CogsAvatar from './CogsAvatar';
import { Colors, Fonts, Spacing } from '../theme/tokens';
import { hapticLight } from '../utils/haptics';

interface Props {
  hintKey: string;
  text: string;
  onDismiss: () => void;
}

export function TutorialHint({ hintKey, text, onDismiss }: Props) {
  const translateY = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      // BUILD23: demoted — host unmounts on parent conditional (currentHint && ...)
      // in GameplayScreen. Mount animation can be in-flight when the parent sets
      // currentHint to null, tearing down the native node mid-animation.
      Animated.timing(translateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    hapticLight();
    AsyncStorage.setItem(`axiom_hint_seen_${hintKey}`, '1');
    Animated.parallel([
      // BUILD23: demoted — same values as mount animation, kept consistent
      Animated.timing(translateY, { toValue: 60, duration: 250, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: false }),
    ]).start(() => onDismiss());
  };

  return (
    <Animated.View pointerEvents="box-none" style={[st.container, { transform: [{ translateY }], opacity }]}>
      <View style={st.inner}>
        <View style={st.header}>
          <CogsAvatar size="small" state="engaged" />
          <Text style={st.label}>C.O.G.S</Text>
        </View>
        <Text style={st.text}>{text}</Text>
        <TouchableOpacity onPress={handleDismiss} style={st.dismissBtn} activeOpacity={0.7}>
          <Text style={st.dismissText}>GOT IT</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  container: {
    // Absolute overlay above the tray so the hint never reflows the
    // gameplay layout when it appears or dismisses.
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 180,
    paddingHorizontal: Spacing.lg,
    zIndex: 40,
  },
  inner: {
    backgroundColor: 'rgba(8,14,28,0.96)',
    borderLeftWidth: 3,
    borderLeftColor: '#4a9eff',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    padding: 10,
    paddingRight: 14,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.blue,
    letterSpacing: 1.5,
  },
  text: {
    fontFamily: Fonts.exo2,
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.starWhite,
    lineHeight: 12 * 1.6,
  },
  dismissBtn: {
    alignSelf: 'flex-end',
  },
  dismissText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.copper,
  },
});
