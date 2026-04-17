import React, { useEffect } from 'react';
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
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { TabParamList } from '../navigation/TabNavigator';
import StarField from '../components/StarField';
import ShipIcon from '../components/icons/ShipIcon';
import { KeplerBeltIcon, NovaFringeIcon, RiftIcon, DeepVoidIcon } from '../components/icons/SectorIcons';
import PadlockIcon from '../components/icons/PadlockIcon';
import SectorsIcon from '../components/icons/SectorsIcon';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useProgressionStore, AXIOM_TOTAL_LEVELS } from '../store/progressionStore';

const SECTORS_AHEAD_VISIBLE = 1;
const SCANNER_TIER_1 = 0.25; // name revealed
const SCANNER_TIER_2 = 0.50; // level count revealed
const SCANNER_TIER_3 = 0.75; // description revealed

// ─── Types ────────────────────────────────────────────────────────────────────

type SectorStatus = 'completed' | 'active' | 'locked';

type SectorIconType = 'axiom' | 'kepler' | 'nova' | 'rift' | 'deep';

type Sector = {
  id: string;
  name: string;
  subtitle: string;
  iconType: SectorIconType;
  levelsCompleted: number;
  levelsTotal: number;
  status: SectorStatus;
  borderColor: string;
  accentColor: string;
  glowColor: string | null;
};

// ─── Sector data ──────────────────────────────────────────────────────────────

// Static base data for sectors after Axiom (Kepler onwards)
const SECTORS_AFTER_AXIOM: Sector[] = [
  {
    id: 'kepler',
    name: 'Kepler Belt',
    subtitle: 'Asteroid fields & relay stations',
    iconType: 'kepler',
    levelsCompleted: 0,
    levelsTotal: 10,
    status: 'locked',
    borderColor: 'rgba(58,80,112,0.3)',
    accentColor: Colors.dim,
    glowColor: null,
  },
  {
    id: 'nova',
    name: 'Nova Fringe',
    subtitle: 'Stellar nursery & plasma storms',
    iconType: 'nova',
    levelsCompleted: 0,
    levelsTotal: 10,
    status: 'locked',
    borderColor: 'rgba(58,80,112,0.3)',
    accentColor: Colors.dim,
    glowColor: null,
  },
  {
    id: 'rift',
    name: 'The Rift',
    subtitle: 'Dimensional anomaly zone',
    iconType: 'rift',
    levelsCompleted: 0,
    levelsTotal: 6,
    status: 'locked',
    borderColor: 'rgba(58,80,112,0.3)',
    accentColor: Colors.dim,
    glowColor: null,
  },
  {
    id: 'deep',
    name: 'Deep Void',
    subtitle: 'Unknown space — hostile',
    iconType: 'deep',
    levelsCompleted: 0,
    levelsTotal: 12,
    status: 'locked',
    borderColor: 'rgba(58,80,112,0.3)',
    accentColor: Colors.dim,
    glowColor: null,
  },
];

// ─── Status label helpers ─────────────────────────────────────────────────────

function statusLabel(status: SectorStatus): string {
  if (status === 'completed') return 'COMPLETED ✓';
  if (status === 'active') return 'IN PROGRESS';
  return 'LOCKED';
}

function statusLabelColor(status: SectorStatus, accentColor: string): string {
  if (status === 'locked') return Colors.dim;
  return accentColor;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({
  completed,
  total,
  color,
}: {
  completed: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? completed / total : 0;
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.round(pct * 100)}%` as unknown as number, backgroundColor: color },
        ]}
      />
    </View>
  );
}

// ─── Sector icon resolver ────────────────────────────────────────────────────

function SectorIcon({ iconType, size, color }: { iconType: SectorIconType; size: number; color: string }) {
  switch (iconType) {
    case 'axiom':
      return <ShipIcon size={size} color={color} />;
    case 'kepler':
      return <KeplerBeltIcon size={size} color={color} />;
    case 'nova':
      return <NovaFringeIcon size={size} color={color} />;
    case 'rift':
      return <RiftIcon size={size} color={color} />;
    case 'deep':
      return <DeepVoidIcon size={size} color={color} />;
  }
}

// ─── Sector card ─────────────────────────────────────────────────────────────

type SectorCardProps = {
  sector: Sector;
  delay: number;
  onPress: () => void;
  scannerTier?: number; // 0-3 for locked sectors being scanned
};

function scannerBadgeLabel(tier: number): string {
  if (tier === 0) return 'SIGNAL DETECTED';
  if (tier === 1) return 'SCANNING';
  if (tier === 2) return 'PARTIAL LOCK';
  return 'LOCKED';
}

function SectorCard({ sector, delay, onPress, scannerTier }: SectorCardProps) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(delay, withTiming(1, { duration: 500 }));
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));

  const locked = sector.status === 'locked';
  const isScanning = locked && scannerTier !== undefined;
  const tier = scannerTier ?? 3;
  const levelText = `${sector.levelsCompleted} / ${sector.levelsTotal} levels`;

  const cardShadow = sector.glowColor
    ? {
        shadowColor: Colors.copper,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
      }
    : {};

  // Scanner tier determines what's visible
  const showName = !isScanning || tier >= 1;
  const showLevelCount = !isScanning || tier >= 2;
  const showDescription = !isScanning || tier >= 3;

  // Badge for scanning sectors
  const badgeLabel = isScanning ? scannerBadgeLabel(tier) : statusLabel(sector.status);
  const badgeColor = isScanning && tier < 3 ? Colors.amber : statusLabelColor(sector.status, sector.accentColor);
  const badgeBorderColor = isScanning && tier < 3
    ? 'rgba(240,180,41,0.4)'
    : locked ? 'rgba(58,80,112,0.4)' : sector.borderColor;
  const badgeBgColor = isScanning && tier < 3
    ? 'rgba(240,180,41,0.08)'
    : locked ? 'rgba(58,80,112,0.08)' : `rgba(${iconBgComponents(sector.accentColor)},0.1)`;

  return (
    <Animated.View style={[styles.sectorCard, cardShadow, animStyle]}>
      <TouchableOpacity
        onPress={locked ? undefined : onPress}
        activeOpacity={locked ? 1 : 0.8}
        style={styles.sectorCardTouch}
      >
        <LinearGradient
          colors={
            locked
              ? ['rgba(14,22,35,0.7)', 'rgba(10,15,24,0.85)']
              : ['rgba(26,58,92,0.7)', 'rgba(10,22,40,0.92)']
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View
          style={[
            styles.sectorBorder,
            { borderColor: isScanning && tier < 3 ? 'rgba(240,180,41,0.15)' : sector.borderColor },
          ]}
        />

        {/* Scanline overlay for tier 0 */}
        {isScanning && tier === 0 && (
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 14 }]} pointerEvents="none">
            {Array.from({ length: 12 }, (_, i) => (
              <View key={i} style={{
                position: 'absolute',
                left: 0, right: 0,
                top: i * 8,
                height: 1,
                backgroundColor: 'rgba(240,180,41,0.04)',
              }} />
            ))}
          </View>
        )}

        <View style={styles.sectorRow}>
          {/* Icon circle */}
          <View
            style={[
              styles.sectorIcon,
              {
                backgroundColor: locked
                  ? 'rgba(58,80,112,0.2)'
                  : `rgba(${iconBgComponents(sector.accentColor)},0.18)`,
              },
            ]}
          >
            {locked ? (
              <PadlockIcon size={16} color={isScanning && tier < 3 ? Colors.amber : Colors.dim} />
            ) : (
              <SectorIcon iconType={sector.iconType} size={26} color={sector.accentColor} />
            )}
          </View>

          {/* Info column */}
          <View style={styles.sectorInfo}>
            {/* Name + status badge row */}
            <View style={styles.sectorNameRow}>
              <Text
                style={[
                  styles.sectorName,
                  { color: showName ? (locked ? Colors.dim : Colors.starWhite) : Colors.dim },
                ]}
              >
                {showName ? sector.name : '———————'}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { borderColor: badgeBorderColor, backgroundColor: badgeBgColor },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: badgeColor }]}>
                  {badgeLabel}
                </Text>
              </View>
            </View>

            {/* Subtitle */}
            <Text
              style={[
                styles.sectorSub,
                { color: locked ? Colors.dim : Colors.muted },
              ]}
            >
              {showDescription ? sector.subtitle : (isScanning ? 'ANALYSIS PENDING...' : sector.subtitle)}
            </Text>

            {/* Level count */}
            <Text
              style={[
                styles.sectorLevels,
                { color: isScanning && tier < 3 ? Colors.dim : sector.accentColor },
              ]}
            >
              {showLevelCount ? levelText : '?? LEVELS'}
            </Text>

            {/* Progress bar */}
            <ProgressBar
              completed={sector.levelsCompleted}
              total={sector.levelsTotal}
              color={sector.accentColor}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Helper: extract r,g,b string from a known token color for inline rgba backgrounds.
// We use a simple lookup rather than parsing hex to keep it clean.
function iconBgComponents(color: string): string {
  if (color === Colors.green) return '78,203,141';
  if (color === Colors.copper) return '200,121,65';
  if (color === Colors.blue) return '74,158,255';
  if (color === Colors.circuit) return '167,139,250';
  if (color === Colors.amber) return '240,180,41';
  if (color === Colors.dim) return '58,80,112';
  return '74,158,255';
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<TabParamList, 'SectorMap'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

export default function SectorMapScreen({ navigation }: Props) {
  const { getSectorCompletedCount, setActiveSector } = useProgressionStore();
  const axiomCompleted = getSectorCompletedCount('A1-');
  const axiomDone = axiomCompleted >= AXIOM_TOTAL_LEVELS;

  // Build dynamic sector list with The Axiom at top
  const axiomSector: Sector = {
    id: 'axiom',
    name: 'The Axiom',
    subtitle: 'Shipboard systems repair campaign',
    iconType: 'axiom',
    levelsCompleted: axiomCompleted,
    levelsTotal: AXIOM_TOTAL_LEVELS,
    status: axiomDone ? 'completed' : 'active',
    borderColor: axiomDone ? 'rgba(78,203,141,0.4)' : 'rgba(74,158,255,0.5)',
    accentColor: axiomDone ? Colors.green : Colors.blue,
    glowColor: axiomDone ? null : 'rgba(74,158,255,0.18)',
  };

  // Kepler unlocks after Axiom is complete
  const dynamicSectors: Sector[] = [
    axiomSector,
    ...SECTORS_AFTER_AXIOM.map(sector => {
      if (sector.id === 'kepler' && axiomDone) {
        return {
          ...sector,
          status: 'active' as SectorStatus,
          borderColor: 'rgba(200,121,65,0.5)',
          accentColor: Colors.copper,
          glowColor: 'rgba(200,121,65,0.18)',
          levelsCompleted: getSectorCompletedCount('K1-'),
        };
      }
      return sector;
    }),
  ];

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
      <StarField seed={1} />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ── */}
        <Animated.View style={[styles.header, headerRevealStyle]}>
          <View style={styles.backBtn} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>SECTOR MAP</Text>
            <Text style={styles.headerLabel}>NAVIGATION</Text>
          </View>
          <View style={styles.headerSpacer} />
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Galaxy header ── */}
          <Animated.View style={[styles.galaxyContainer, headerRevealStyle]}>
            <SectorsIcon size={32} color={Colors.blue} />
            <Text style={styles.galaxyLabel}>ANDROS CLUSTER</Text>
            <Text style={styles.galaxyCoords}>47.2N · 183.5E</Text>
          </Animated.View>

          {/* ── Sector cards (gated visibility + scanner reveal) ── */}
          {(() => {
            // Calculate active sector progress for scanner tiers
            const activeSector = dynamicSectors.find(sec => sec.status === 'active');
            const currentProgress = activeSector && activeSector.levelsTotal > 0
              ? activeSector.levelsCompleted / activeSector.levelsTotal
              : 0;

            // Determine scanner tier based on progress
            const scanTier = currentProgress >= SCANNER_TIER_3 ? 3
              : currentProgress >= SCANNER_TIER_2 ? 2
              : currentProgress >= SCANNER_TIER_1 ? 1
              : 0;

            // Find first locked sector index
            const firstLockedIdx = dynamicSectors.findIndex(sec => sec.status === 'locked');
            const visibleCount = firstLockedIdx < 0
              ? dynamicSectors.length
              : firstLockedIdx + SECTORS_AHEAD_VISIBLE;

            return dynamicSectors.slice(0, visibleCount).map((sector, i) => (
              <SectorCard
                key={sector.id}
                sector={sector}
                delay={i * 120}
                scannerTier={sector.status === 'locked' ? scanTier : undefined}
                onPress={() => {
                  setActiveSector(sector.id === 'axiom' ? 'A1' : sector.id === 'kepler' ? 'K' : sector.id);
                  navigation.navigate('LevelSelect');
                }}
              />
            ));
          })()}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.lg,
    color: Colors.muted,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 2,
  },
  headerLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
    marginTop: 2,
  },
  headerSpacer: {
    width: 36,
  },

  // Scroll
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },

  // Galaxy header
  galaxyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  galaxyEmoji: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  galaxyLabel: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.md,
    color: Colors.cream,
    letterSpacing: 3,
  },
  galaxyCoords: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
    marginTop: 4,
  },

  // Sector card
  sectorCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  sectorCardTouch: {
    minHeight: 100,
  },
  sectorBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sectorIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectorInfo: {
    flex: 1,
    gap: 4,
  },
  sectorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  sectorName: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    letterSpacing: 0.5,
  },
  sectorSub: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.sm,
  },
  sectorLevels: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 1,
  },

  // Progress bar
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(58,80,112,0.35)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
});
