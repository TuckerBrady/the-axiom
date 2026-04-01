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
  navigation: NativeStackNavigationProp<RootStackParamList, 'Store'>;
};

type Tab = 'Featured' | 'Bundles' | 'Credits';

const TABS: Tab[] = ['Featured', 'Bundles', 'Credits'];

type StoreItem = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  price: string;
  priceType: 'credits' | 'premium';
  badge?: string;
  badgeColor?: string;
};

const FEATURED: StoreItem[] = [
  {
    id: 'fi1',
    name: 'Axiom Skin Pack',
    description: 'Custom hull plating and thruster trails for The Axiom',
    emoji: '🛸',
    price: '800 CR',
    priceType: 'credits',
    badge: 'NEW',
    badgeColor: Colors.green,
  },
  {
    id: 'fi2',
    name: 'Nebula Compass',
    description: 'Navigate hidden warp lanes and sector shortcuts',
    emoji: '🧭',
    price: '1,200 CR',
    priceType: 'credits',
    badge: 'HOT',
    badgeColor: Colors.copper,
  },
  {
    id: 'fi3',
    name: 'Cogs Voice Pack',
    description: 'New dialogue lines and personality module for Cogs AI',
    emoji: '🎙️',
    price: '500 CR',
    priceType: 'credits',
  },
  {
    id: 'fi4',
    name: 'Deep Void Pass',
    description: 'Unlock the final four sectors of the Andros Cluster',
    emoji: '🗝️',
    price: '4.99',
    priceType: 'premium',
    badge: 'PREMIUM',
    badgeColor: Colors.circuit,
  },
];

const CREDIT_PACKS = [
  { id: 'c1', amount: '1,000', bonus: '', price: '$0.99', emoji: '💰' },
  { id: 'c2', amount: '5,500', bonus: '+500 BONUS', price: '$4.99', emoji: '💎' },
  { id: 'c3', amount: '12,000', bonus: '+2,000 BONUS', price: '$9.99', emoji: '👑' },
  { id: 'c4', amount: '30,000', bonus: '+8,000 BONUS', price: '$19.99', emoji: '🏆' },
];

type CreditPack = { id: string; amount: string; bonus: string; price: string; emoji: string };

function CreditCard({ pack, delay }: { pack: CreditPack; delay: number }) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: reveal.value }));
  return (
    <Animated.View style={[styles.creditCard, style]}>
      <LinearGradient
        colors={['rgba(26,58,92,0.7)', 'rgba(10,22,40,0.9)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.creditBorder} />
      <Text style={styles.creditEmoji}>{pack.emoji}</Text>
      <Text style={styles.creditAmount}>{pack.amount}</Text>
      <Text style={styles.creditCR}>CREDITS</Text>
      {pack.bonus ? (
        <Text style={styles.creditBonus}>{pack.bonus}</Text>
      ) : (
        <View style={styles.creditBonusPlaceholder} />
      )}
      <TouchableOpacity style={styles.buyBtn} activeOpacity={0.85}>
        <LinearGradient
          colors={[Colors.copper, Colors.amber]}
          style={styles.buyBtnGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.buyBtnText}>{pack.price}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function StoreCard({ item, delay }: { item: StoreItem; delay: number }) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(delay, withTiming(1, { duration: 450 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 10 }],
  }));
  return (
    <Animated.View style={[styles.storeCard, style]}>
      <LinearGradient
        colors={
          item.priceType === 'premium'
            ? ['rgba(40,25,70,0.85)', 'rgba(20,10,40,0.95)']
            : ['rgba(20,38,60,0.8)', 'rgba(10,18,30,0.9)']
        }
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View
        style={[
          styles.cardBorder,
          {
            borderColor:
              item.priceType === 'premium'
                ? 'rgba(167,139,250,0.35)'
                : 'rgba(74,158,255,0.18)',
          },
        ]}
      />
      <View style={styles.cardInner}>
        <View style={styles.cardLeft}>
          <Text style={styles.itemEmoji}>{item.emoji}</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.nameRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.badge && (
              <View
                style={[
                  styles.itemBadge,
                  { borderColor: item.badgeColor ?? Colors.muted },
                ]}
              >
                <Text
                  style={[
                    styles.itemBadgeText,
                    { color: item.badgeColor ?? Colors.muted },
                  ]}
                >
                  {item.badge}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.itemDesc}>{item.description}</Text>
        </View>
        <TouchableOpacity style={styles.priceBtn} activeOpacity={0.8}>
          <LinearGradient
            colors={
              item.priceType === 'premium'
                ? [Colors.circuit, '#7c5fcf']
                : [Colors.copper, Colors.amber]
            }
            style={styles.priceBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.priceBtnText}>{item.price}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function StoreScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Featured');
  const screenOpacity = useSharedValue(0);
  const headerReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
    headerReveal.value = withTiming(1, { duration: 600 });
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const headerRevealStyle = useAnimatedStyle(() => ({ opacity: headerReveal.value }));

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <StarField seed={6} />

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
            <Text style={styles.headerLabel}>AXIOM MARKET</Text>
            <Text style={styles.headerTitle}>STORE</Text>
          </View>
          <View style={styles.walletBox}>
            <Text style={styles.walletEmoji}>💰</Text>
            <Text style={styles.walletBalance}>4,250</Text>
          </View>
        </Animated.View>

        {/* Tabs */}
        <Animated.View style={[styles.tabRow, headerRevealStyle]}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'Featured' && (
            <>
              {FEATURED.map((item, i) => (
                <StoreCard key={item.id} item={item} delay={i * 80} />
              ))}
            </>
          )}

          {activeTab === 'Credits' && (
            <View style={styles.creditGrid}>
              {CREDIT_PACKS.map((pack, i) => (
                <CreditCard key={pack.id} pack={pack} delay={i * 100} />
              ))}
            </View>
          )}

          {activeTab === 'Bundles' && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>Bundles Coming Soon</Text>
              <Text style={styles.emptySub}>
                Cogs is negotiating deals across the sector. Check back soon.
              </Text>
            </View>
          )}
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
  walletBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200,121,65,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200,121,65,0.3)',
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    gap: 4,
  },
  walletEmoji: { fontSize: 12 },
  walletBalance: {
    fontFamily: Fonts.orbitron, fontSize: 11, fontWeight: 'bold', color: Colors.amber,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.1)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontFamily: Fonts.spaceMono, fontSize: 10, color: Colors.dim, letterSpacing: 1,
  },
  tabTextActive: { color: Colors.copper },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: Colors.copper,
    borderRadius: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  storeCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardLeft: { width: 44, alignItems: 'center' },
  itemEmoji: { fontSize: 28 },
  cardContent: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 3 },
  itemName: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.sm, fontWeight: 'bold',
    color: Colors.starWhite,
  },
  itemBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  itemBadgeText: { fontFamily: Fonts.spaceMono, fontSize: 6, letterSpacing: 0.5 },
  itemDesc: { fontFamily: Fonts.exo2, fontSize: 11, color: Colors.muted },
  priceBtn: { borderRadius: 8, overflow: 'hidden' },
  priceBtnGradient: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  priceBtnText: {
    fontFamily: Fonts.orbitron, fontSize: 9, fontWeight: 'bold',
    color: Colors.void, letterSpacing: 1,
  },
  creditGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  creditCard: {
    width: '47%',
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 160,
  },
  creditBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
  },
  creditEmoji: { fontSize: 32, marginBottom: Spacing.sm },
  creditAmount: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.xl, fontWeight: 'bold',
    color: Colors.amber,
  },
  creditCR: {
    fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.muted,
    letterSpacing: 2, marginBottom: 4,
  },
  creditBonus: {
    fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.green,
    letterSpacing: 1, marginBottom: Spacing.md,
  },
  creditBonusPlaceholder: { height: 12, marginBottom: Spacing.md },
  buyBtn: { width: '100%', borderRadius: 8, overflow: 'hidden' },
  buyBtnGradient: { paddingVertical: Spacing.sm, alignItems: 'center' },
  buyBtnText: {
    fontFamily: Fonts.orbitron, fontSize: 10, fontWeight: 'bold',
    color: Colors.void, letterSpacing: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.lg },
  emptyTitle: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.lg, color: Colors.muted,
    marginBottom: Spacing.sm,
  },
  emptySub: {
    fontFamily: Fonts.exo2, fontSize: FontSizes.sm, color: Colors.dim,
    textAlign: 'center',
  },
});
