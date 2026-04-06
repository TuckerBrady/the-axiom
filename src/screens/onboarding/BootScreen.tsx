import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
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
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Boot'>;
};

const { width: W, height: H } = Dimensions.get('window');

type BootEntry =
  | { type: 'section'; text: string; delay: number }
  | { type?: undefined; label: string; value: string; color: string; delay: number }
  | { type?: undefined; text: string; color: string; plain: true; delay: number };

const BOOT_LINES: BootEntry[] = [
  { label: 'AXIOM SYSTEMS', value: 'EMERGENCY RESTART INITIATED', color: Colors.red, delay: 300 },
  { label: 'BIOS v4.7.2', value: 'OK', color: Colors.muted, delay: 700 },
  { type: 'section', text: '// SHIP SYSTEMS', delay: 950 },
  { label: 'HULL INTEGRITY SYSTEMS', value: 'OFFLINE', color: Colors.red, delay: 1150 },
  { label: 'NAVIGATION MODULE', value: 'OFFLINE', color: Colors.red, delay: 1450 },
  { label: 'PROPULSION ARRAY', value: 'DEGRADED', color: Colors.amber, delay: 1750 },
  { label: 'LIFE SUPPORT', value: 'DEGRADED', color: Colors.amber, delay: 2050 },
  { label: 'COMMUNICATION ARRAY', value: 'OFFLINE', color: Colors.red, delay: 2350 },
  { label: 'SENSOR GRID', value: 'OFFLINE', color: Colors.red, delay: 2650 },
  { label: 'POWER CORE', value: 'DEGRADED (31%)', color: Colors.amber, delay: 2950 },
  { label: 'REPAIR PROTOCOLS', value: 'MISSING', color: Colors.red, delay: 3250 },
  { type: 'section', text: '// AI SYSTEMS', delay: 3500 },
  { label: 'C.O.G.S UNIT 7', value: 'LOCATING AI CORE', color: Colors.muted, delay: 3750 },
  { label: 'C.O.G.S UNIT 7 INTEGRITY', value: '20% — CRITICAL', color: Colors.red, delay: 4300 },
  { type: 'section', text: '// INCOMING TRANSMISSION', delay: 4700 },
  { text: 'Incoming transmission detected.', color: Colors.blue, plain: true, delay: 5000 },
  { text: 'Tap anywhere to receive.', color: Colors.starWhite, plain: true, delay: 5600 },
];

const BRACKET_SIZE = 20;
const BRACKET_THICKNESS = 2;

function HudCorners() {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(200, withTiming(1, { duration: 800 }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: reveal.value }));
  const C = 'rgba(74,158,255,0.5)';
  const corners = [
    { top: 0, left: 0 },
    { top: 0, right: 0 },
    { bottom: 0, left: 0 },
    { bottom: 0, right: 0 },
  ];
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {corners.map((pos, i) => (
        <View key={i} style={[s.corner, pos]}>
          <View style={[s.cornerH, { backgroundColor: C }]} />
          <View style={[s.cornerV, { backgroundColor: C }]} />
        </View>
      ))}
    </Animated.View>
  );
}

function ScanLine() {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(
      withTiming(H, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[s.scanLine, style]}
    />
  );
}

function BootLine({ entry, isFirstSection }: { entry: BootEntry; isFirstSection: boolean }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withDelay(entry.delay, withTiming(1, { duration: 200 }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (entry.type === 'section') {
    return (
      <Animated.Text
        style={[
          s.section,
          isFirstSection && { marginTop: 0 },
          style,
        ]}
      >
        {entry.text}
      </Animated.Text>
    );
  }

  if ('plain' in entry) {
    return (
      <Animated.Text style={[s.bootLine, style]}>
        <Text style={s.prompt}>{'> '}</Text>
        <Text style={{ color: entry.color }}>{entry.text}</Text>
      </Animated.Text>
    );
  }

  return (
    <Animated.Text style={[s.bootLine, style]} numberOfLines={1}>
      <Text style={s.prompt}>{'> '}</Text>
      <Text style={{ color: entry.color }}>{entry.label}</Text>
      <Text style={{ color: entry.color }}> ... </Text>
      <Text style={{ color: entry.color }}>{entry.value}</Text>
    </Animated.Text>
  );
}

export default function BootScreen({ navigation }: Props) {
  const headerOpacity = useSharedValue(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    headerOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
    const timer = setTimeout(() => setReady(true), 5800);
    return () => clearTimeout(timer);
  }, []);

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));

  // Blinking cursor
  const cursorOpacity = useSharedValue(0);
  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 500 }),
      ),
      -1,
      false,
    );
  }, []);
  const cursorStyle = useAnimatedStyle(() => ({ opacity: cursorOpacity.value }));

  return (
    <TouchableOpacity
      style={s.root}
      activeOpacity={1}
      onPress={() => navigation.navigate('Distress')}
    >
      <ScanLine />
      <HudCorners />

      {/* Top header bar */}
      <Animated.View style={[s.headerBar, headerStyle]}>
        <Text style={s.headerLabel}>THE AXIOM — SYSTEM BOOT LOG</Text>
        <Text style={s.headerStatus}>EMERGENCY MODE</Text>
      </Animated.View>

      {/* Terminal log */}
      <ScrollView
        style={s.terminal}
        contentContainerStyle={s.terminalContent}
        showsVerticalScrollIndicator={false}
        pointerEvents="none"
      >
        {BOOT_LINES.map((line, i) => {
          const isFirstSection =
            line.type === 'section' &&
            BOOT_LINES.findIndex((l) => l.type === 'section') === i;
          return <BootLine key={i} entry={line} isFirstSection={isFirstSection} />;
        })}
        <Animated.Text style={[s.bootLine, { color: Colors.blue }, cursorStyle]}>
          {'> _'}
        </Animated.Text>
      </ScrollView>

      {/* Tap hint */}
      {ready && (
        <Animated.View style={[s.tapHint, headerStyle]}>
          <Text style={s.tapText}>TAP ANYWHERE TO RECEIVE TRANSMISSION</Text>
        </Animated.View>
      )}

      {/* Bottom status bar */}
      <Animated.View style={[s.statusBar, headerStyle]}>
        <Text style={s.statusItem}>SYS: CRITICAL</Text>
        <Text style={s.statusItem}>COGS: 20%</Text>
        <Text style={s.statusItem}>PWR: 31%</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(74,158,255,0.12)',
    zIndex: 2,
  },
  corner: {
    position: 'absolute',
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
  },
  cornerH: {
    position: 'absolute',
    width: BRACKET_SIZE,
    height: BRACKET_THICKNESS,
    top: 0,
    left: 0,
  },
  cornerV: {
    position: 'absolute',
    width: BRACKET_THICKNESS,
    height: BRACKET_SIZE,
    top: 0,
    left: 0,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229,85,85,0.25)',
  },
  headerLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.muted,
    letterSpacing: 1.5,
  },
  headerStatus: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.red,
    letterSpacing: 2,
  },
  terminal: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  terminalContent: {
    paddingBottom: Spacing.xxl,
    gap: 4,
  },
  bootLine: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11.5,
    letterSpacing: 0.5,
    lineHeight: 26,
  },
  prompt: {
    fontFamily: Fonts.spaceMono,
    color: Colors.muted,
  },
  section: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 3,
    color: '#e8f4ff',
    marginTop: 14,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,244,255,0.08)',
    marginBottom: 3,
  },
  tapHint: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  tapText: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.blue,
    letterSpacing: 2,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229,85,85,0.2)',
    paddingBottom: 36,
  },
  statusItem: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.red,
    letterSpacing: 1,
  },
});
