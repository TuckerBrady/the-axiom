import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeInUp,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import StarField from '../components/StarField';
import CogsAvatar from '../components/CogsAvatar';
import { BackButton } from '../components/BackButton';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useLivesStore } from '../store/livesStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Store'>;
};

// ─── COGS store comments ────────────────────────────────────────────────────

const COGS_LINES = [
  'These are consumables. They do not make you better. They make the current situation more manageable.',
  'The Hint Token is not an admission of failure. It is resource allocation. I tell myself the same thing.',
];

// ─── Power-ups ──────────────────────────────────────────────────────────────

type PowerUp = {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: 'hint' | 'debug' | 'life' | 'config' | 'trail';
};

const POWER_UPS: PowerUp[] = [
  { id: 'hint', name: 'Hint Token', description: 'Reveals a valid next placement', price: 50, icon: 'hint' },
  { id: 'debug', name: 'Debug Credit', description: 'Step-through failure analysis', price: 75, icon: 'debug' },
  { id: 'life', name: 'Extra Life', description: 'One additional attempt', price: 100, icon: 'life' },
  { id: 'config', name: 'Configuration Boost', description: 'Pre-sets optimal Configuration', price: 60, icon: 'config' },
  { id: 'trail', name: 'Trail Revealer', description: 'Shows Data Trail values during execution', price: 80, icon: 'trail' },
];

// ─── Circuit packs ──────────────────────────────────────────────────────────

type CircuitPack = {
  id: string;
  amount: number;
  price: string;
  bestValue?: boolean;
};

const CIRCUIT_PACKS: CircuitPack[] = [
  { id: 'c1', amount: 100, price: '$0.99' },
  { id: 'c2', amount: 300, price: '$2.99' },
  { id: 'c3', amount: 600, price: '$4.99' },
  { id: 'c4', amount: 1500, price: '$9.99', bestValue: true },
];

// ─── Icons ───────────────────────────────────────────────────────────────────

function CogsIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" fill="none" stroke={Colors.amber} strokeWidth="2" />
      <Circle cx="12" cy="12" r="4" fill={Colors.amber} opacity={0.3} />
    </Svg>
  );
}

function CircuitsIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2L20 7v10l-8 5-8-5V7l8-5z" fill="none" stroke={Colors.circuit} strokeWidth="2" />
      <Circle cx="12" cy="12" r="3" fill={Colors.circuit} opacity={0.4} />
    </Svg>
  );
}

function PowerUpIcon({ type, size = 24 }: { type: string; size?: number }) {
  switch (type) {
    case 'hint':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="9" r="6" fill="none" stroke={Colors.amber} strokeWidth="2" />
          <Rect x="10" y="15" width="4" height="4" rx="1" fill={Colors.amber} opacity={0.4} />
          <Circle cx="12" cy="9" r="2" fill={Colors.amber} opacity={0.5} />
        </Svg>
      );
    case 'debug':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke={Colors.green} strokeWidth="2" />
          <Path d="M8 12h8M12 8v8" stroke={Colors.green} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'life':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill={Colors.blue}
            stroke={Colors.blue}
            strokeWidth="1"
          />
        </Svg>
      );
    case 'config':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke={Colors.copper} strokeWidth="2" />
          <Circle cx="12" cy="12" r="3" fill={Colors.copper} opacity={0.5} />
          <Line x1="1" y1="12" x2="4" y2="12" stroke={Colors.copper} strokeWidth="2" strokeLinecap="round" />
          <Line x1="20" y1="12" x2="23" y2="12" stroke={Colors.copper} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'trail':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 12h16" stroke={Colors.amber} strokeWidth="2" strokeLinecap="round" strokeDasharray="3,3" />
          <Circle cx="6" cy="12" r="2" fill={Colors.amber} />
          <Circle cx="12" cy="12" r="2" fill={Colors.amber} />
          <Circle cx="18" cy="12" r="2" fill={Colors.amber} />
        </Svg>
      );
    default:
      return null;
  }
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function StoreScreen({ navigation }: Props) {
  const { credits, spendCredits: spendFromLives } = useLivesStore();
  const [cogsLineIdx, setCogsLineIdx] = useState(0);

  const screenOpacity = useSharedValue(0);
  const headerReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
    headerReveal.value = withTiming(1, { duration: 600 });

    // Rotate COGS comments every 6 seconds
    const interval = setInterval(() => {
      setCogsLineIdx(i => (i + 1) % COGS_LINES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const headerRevealStyle = useAnimatedStyle(() => ({ opacity: headerReveal.value }));

  const handleBuy = (item: PowerUp) => {
    spendFromLives(item.price);
  };

  return (
    <Animated.View style={[st.root, screenStyle]}>
      <StarField seed={6} />

      <SafeAreaView style={st.safeArea}>
        {/* Header */}
        <Animated.View style={[st.header, headerRevealStyle]}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={st.headerCenter}>
            <Text style={st.headerLabel}>AXIOM SYSTEMS</Text>
            <Text style={st.headerTitle}>STORE</Text>
          </View>
          <View style={{ width: 36 }} />
        </Animated.View>

        {/* Currency display — single balance */}
        <Animated.View style={[st.currencyRow, headerRevealStyle]}>
          <View style={st.currencyBox}>
            <CogsIcon size={16} />
            <Text style={st.currencyAmount}>{credits}</Text>
            <Text style={st.currencyLabel}>Credits</Text>
          </View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* COGS rotating comment */}
          <View style={st.cogsStrip}>
            <CogsAvatar size="small" state="online" />
            <Text style={st.cogsStripText}>{'"'}{COGS_LINES[cogsLineIdx]}{'"'}</Text>
          </View>

          {/* Power-ups section */}
          <Text style={st.sectionTitle}>POWER-UPS</Text>
          {POWER_UPS.map((item, i) => {
            const canAfford = credits >= item.price;
            const deficit = item.price - credits;
            return (
              <Animated.View
                key={item.id}
                entering={FadeInUp.delay(i * 60).duration(350)}
                style={st.powerUpCard}
              >
                <LinearGradient
                  colors={['rgba(20,38,60,0.8)', 'rgba(10,18,30,0.9)']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={st.puBorder} />
                <View style={st.puInner}>
                  <View style={st.puIconWrap}>
                    <PowerUpIcon type={item.icon} size={24} />
                  </View>
                  <View style={st.puContent}>
                    <Text style={st.puName}>{item.name}</Text>
                    <Text style={st.puDesc}>{item.description}</Text>
                  </View>
                  <TouchableOpacity
                    style={[st.puBtn, !canAfford && st.puBtnDisabled]}
                    onPress={() => canAfford && handleBuy(item)}
                    activeOpacity={canAfford ? 0.8 : 1}
                  >
                    {canAfford ? (
                      <LinearGradient
                        colors={[Colors.copper, Colors.amber]}
                        style={st.puBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={st.puBtnText}>{item.price} CR</Text>
                      </LinearGradient>
                    ) : (
                      <View style={st.puBtnGradient}>
                        <Text style={st.puBtnTextDim}>Need {deficit} CR</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })}

          {/* Credits section */}
          <Text style={[st.sectionTitle, { marginTop: Spacing.xl }]}>CREDITS</Text>
          <View style={st.circuitGrid}>
            {CIRCUIT_PACKS.map((pack, i) => (
              <Animated.View
                key={pack.id}
                entering={FadeInUp.delay(300 + i * 80).duration(350)}
                style={st.circuitCard}
              >
                <LinearGradient
                  colors={['rgba(40,25,70,0.7)', 'rgba(20,10,40,0.9)']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={st.ccBorder} />
                {pack.bestValue && (
                  <View style={st.bestValueBadge}>
                    <Text style={st.bestValueText}>BEST VALUE</Text>
                  </View>
                )}
                <CircuitsIcon size={28} />
                <Text style={st.ccAmount}>{pack.amount}</Text>
                <Text style={st.ccLabel}>CREDITS</Text>
                <TouchableOpacity style={st.ccBtn} activeOpacity={0.85}>
                  <View style={st.ccBtnInner}>
                    <Text style={st.ccBtnText}>COMING SOON</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontFamily: Fonts.orbitron, fontSize: 20, color: Colors.muted },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: {
    fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.muted, letterSpacing: 2,
  },
  headerTitle: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.lg, fontWeight: 'bold',
    color: Colors.starWhite, letterSpacing: 2,
  },

  // Currency row
  currencyRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  currencyBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(240,180,41,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.25)',
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  currencyAmount: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.md, fontWeight: 'bold',
    color: Colors.amber,
  },
  currencyLabel: {
    fontFamily: Fonts.spaceMono, fontSize: 13, color: Colors.muted,
    letterSpacing: 1, marginLeft: 'auto',
  },

  // Scroll
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    paddingTop: Spacing.sm,
  },

  // COGS strip
  cogsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(10,18,30,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.15)',
    borderRadius: 10,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cogsStripText: {
    flex: 1,
    fontFamily: Fonts.exo2, fontSize: 11, color: Colors.muted,
    fontStyle: 'italic', lineHeight: 16,
  },

  // Section title
  sectionTitle: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: Colors.copper,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  // Power-up cards
  powerUpCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  puBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.18)',
  },
  puInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  puIconWrap: { width: 40, alignItems: 'center' },
  puContent: { flex: 1 },
  puName: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.sm, fontWeight: 'bold',
    color: Colors.starWhite, marginBottom: 2,
  },
  puDesc: {
    fontFamily: Fonts.exo2, fontSize: 11, color: Colors.muted,
  },
  puBtn: {
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 64,
  },
  puBtnDisabled: {
    opacity: 0.7,
  },
  puBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 3,
  },
  puBtnText: {
    fontFamily: Fonts.orbitron, fontSize: 12, fontWeight: 'bold',
    color: Colors.void, letterSpacing: 1,
  },
  puBtnTextDim: {
    fontFamily: Fonts.spaceMono, fontSize: 7, color: Colors.muted,
    letterSpacing: 0.5,
  },

  // Circuit cards
  circuitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  circuitCard: {
    width: '47%',
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 150,
  },
  ccBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.green,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bestValueText: {
    fontFamily: Fonts.spaceMono, fontSize: 6, fontWeight: 'bold',
    color: Colors.void, letterSpacing: 0.5,
  },
  ccAmount: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.xl, fontWeight: 'bold',
    color: Colors.circuit, marginTop: Spacing.sm,
  },
  ccLabel: {
    fontFamily: Fonts.spaceMono, fontSize: 11, color: Colors.muted,
    letterSpacing: 2, marginBottom: Spacing.md,
  },
  ccBtn: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
  },
  ccBtnInner: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  ccBtnText: {
    fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.dim,
    letterSpacing: 1,
  },
});
