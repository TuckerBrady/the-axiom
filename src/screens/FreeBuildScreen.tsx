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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import StarField from '../components/StarField';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FreeBuild'>;
};

type Component = {
  id: string;
  name: string;
  type: string;
  emoji: string;
  description: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
};

const RARITY_COLOR: Record<string, string> = {
  Common: Colors.muted,
  Rare: Colors.blue,
  Epic: Colors.circuit,
  Legendary: Colors.amber,
};

const COMPONENTS: Component[] = [
  { id: 'pwr1', name: 'Power Cell Mk.I', type: 'Power', emoji: '🔋', description: 'Basic energy storage unit', rarity: 'Common' },
  { id: 'shld1', name: 'Deflector Array', type: 'Defense', emoji: '🛡️', description: 'Redirects incoming energy beams', rarity: 'Rare' },
  { id: 'eng1', name: 'Ion Engine', type: 'Propulsion', emoji: '⚙️', description: 'Efficient low-thrust drive', rarity: 'Common' },
  { id: 'scan1', name: 'Quantum Scanner', type: 'Sensor', emoji: '📡', description: 'Detects anomalies across sectors', rarity: 'Rare' },
  { id: 'rail1', name: 'Rail Cannon', type: 'Weapon', emoji: '🔫', description: 'Electromagnetic projectile launcher', rarity: 'Epic' },
  { id: 'ai1', name: 'Cogs Neural Core', type: 'AI', emoji: '🤖', description: 'Advanced reasoning module', rarity: 'Legendary' },
];

type Category = 'All' | 'Power' | 'Defense' | 'Propulsion' | 'Sensor' | 'Weapon' | 'AI';
const CATEGORIES: Category[] = ['All', 'Power', 'Defense', 'Propulsion', 'Sensor', 'Weapon', 'AI'];

function ComponentCard({ comp, delay }: { comp: Component; delay: number }) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ scale: 0.95 + reveal.value * 0.05 }],
  }));
  const rarityColor = RARITY_COLOR[comp.rarity];

  return (
    <Animated.View style={[styles.compCard, style]}>
      <LinearGradient
        colors={['rgba(20,38,60,0.8)', 'rgba(10,18,30,0.9)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.compBorder, { borderColor: `${rarityColor}33` }]} />
      <View style={styles.compInner}>
        <View style={[styles.compIconBox, { backgroundColor: `${rarityColor}15` }]}>
          <Text style={styles.compEmoji}>{comp.emoji}</Text>
        </View>
        <View style={styles.compInfo}>
          <Text style={styles.compName}>{comp.name}</Text>
          <Text style={styles.compType}>{comp.type}</Text>
          <Text style={styles.compDesc}>{comp.description}</Text>
        </View>
        <View style={styles.compRight}>
          <View style={[styles.rarityBadge, { borderColor: rarityColor }]}>
            <Text style={[styles.rarityText, { color: rarityColor }]}>
              {comp.rarity}
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.75}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export default function FreeBuildScreen({ navigation }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const screenOpacity = useSharedValue(0);
  const headerReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
    headerReveal.value = withTiming(1, { duration: 600 });
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const headerRevealStyle = useAnimatedStyle(() => ({ opacity: headerReveal.value }));

  const filtered = activeCategory === 'All'
    ? COMPONENTS
    : COMPONENTS.filter((c) => c.type === activeCategory);

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <StarField seed={5} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.header, headerRevealStyle]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>AXIOM WORKSHOP</Text>
            <Text style={styles.headerTitle}>FREE BUILD</Text>
          </View>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Blueprint canvas preview */}
        <Animated.View style={[styles.canvas, headerRevealStyle]}>
          <LinearGradient
            colors={['rgba(10,22,40,0.9)', 'rgba(6,14,26,0.95)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.grid}>
            {Array.from({ length: 16 }).map((_, i) => (
              <View key={i} style={styles.gridCell} />
            ))}
          </View>
          <Text style={styles.canvasLabel}>⚙️  BLUEPRINT CANVAS</Text>
          <Text style={styles.canvasSub}>Drag components from inventory to design your ship</Text>
        </Animated.View>

        {/* Category filter */}
        <Animated.View style={[headerRevealStyle]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScroll}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catChip,
                  activeCategory === cat && styles.catChipActive,
                ]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.catText,
                    activeCategory === cat && styles.catTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((comp, i) => (
            <ComponentCard key={comp.id} comp={comp} delay={i * 80} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  safeArea: { flex: 1 },
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
  headerSpacer: { width: 36 },
  canvas: {
    height: 140,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    position: 'absolute',
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
    opacity: 0.07,
  },
  gridCell: {
    width: '25%',
    height: '25%',
    borderWidth: 0.5,
    borderColor: Colors.blue,
  },
  canvasLabel: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.sm, color: Colors.muted,
    letterSpacing: 1, marginBottom: 4,
  },
  canvasSub: {
    fontFamily: Fonts.exo2, fontSize: 11, color: Colors.dim, textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  catScroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    backgroundColor: 'rgba(26,58,92,0.2)',
  },
  catChipActive: {
    backgroundColor: 'rgba(74,158,255,0.15)',
    borderColor: Colors.blue,
  },
  catText: {
    fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.muted, letterSpacing: 1,
  },
  catTextActive: { color: Colors.blue },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  compCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  compBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 1,
  },
  compInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  compIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compEmoji: { fontSize: 24 },
  compInfo: { flex: 1 },
  compName: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.sm, fontWeight: 'bold',
    color: Colors.starWhite, marginBottom: 2,
  },
  compType: {
    fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.copper,
    letterSpacing: 1, marginBottom: 3,
  },
  compDesc: { fontFamily: Fonts.exo2, fontSize: 11, color: Colors.muted },
  compRight: { alignItems: 'center', gap: Spacing.sm },
  rarityBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  rarityText: { fontFamily: Fonts.spaceMono, fontSize: 7, letterSpacing: 0.5 },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(74,158,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: Fonts.orbitron, fontSize: 16, color: Colors.blue, lineHeight: 20,
  },
});
