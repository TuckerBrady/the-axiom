import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import CogsAvatar from '../components/CogsAvatar';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import {
  useProgressionStore,
  AXIOM_TOTAL_LEVELS,
} from '../store/progressionStore';
import { useConsequenceStore } from '../store/consequenceStore';
import { useEconomyStore } from '../store/economyStore';
import { useChallengeStore } from '../store/challengeStore';
import { AXIOM_LEVELS } from '../game/levels';
import { RANK_NAMES } from '../components/RankInsignia';
import {
  getHudState,
  getHudCornerColor,
  getHudScanLineColor,
  getHudHeaderBorderColor,
} from '../utils/hudState';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReturnBrief'>;
};

const { height: H } = Dimensions.get('window');
const SESSION_KEY = 'axiom_last_session';
const SESSION_COUNT_KEY = 'axiom_session_count';

// ─── Color tokens for terminal lines ─────────────────────────────────────────

type LineColor = 'amber' | 'muted' | 'blue' | 'green' | 'copper' | 'red';

const COLOR_MAP: Record<LineColor, string> = {
  amber: Colors.amber,
  muted: Colors.muted,
  blue: Colors.blue,
  green: Colors.green,
  copper: Colors.copper,
  red: Colors.red,
};

// ─── Sector / rank helpers ───────────────────────────────────────────────────

const SECTOR_DISPLAY: Record<string, { name: string; total: number }> = {
  'A1-': { name: 'THE AXIOM', total: 8 },
  '2-':  { name: 'KEPLER BELT', total: 10 },
  '3-':  { name: 'NOVA FRINGE', total: 10 },
  '4-':  { name: 'THE RIFT', total: 8 },
  '5-':  { name: 'DEEP VOID', total: 12 },
  '6-':  { name: 'THE CRADLE', total: 8 },
};

// Total completed → rank index (0..9)
const RANK_THRESHOLDS = [0, 3, 8, 15, 25, 35, 50, 65, 80, 95];
function getRank(totalCompleted: number): { id: string; name: string } {
  let idx = 0;
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    if (totalCompleted >= RANK_THRESHOLDS[i]) idx = i;
  }
  const num = String(idx + 1).padStart(2, '0');
  return { id: `R${num}`, name: RANK_NAMES[idx].toUpperCase() };
}

function getActiveSectorPrefix(activeSector: string): string {
  // progressionStore stores 'A1', '2', etc.
  return activeSector.endsWith('-') ? activeSector : `${activeSector}-`;
}

function formatTimeOffline(lastSession: number | null): string {
  if (!lastSession) return 'FIRST CONTACT';
  const elapsed = Date.now() - lastSession;
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  if (hours < 1) return 'LESS THAN 1 HR';
  if (hours < 24) return `${hours} HRS`;
  const days = Math.floor(hours / 24);
  const rem = hours - days * 24;
  return rem > 0 ? `${days} DAYS, ${rem} HRS` : `${days} DAYS`;
}

function formatLastSession(lastSession: number | null): string {
  if (!lastSession) return '—';
  const d = new Date(lastSession);
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const mm = months[d.getMonth()];
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm} ${dd} — ${hh}:${mi}`;
}

function getActiveMissionId(prefix: string, completedCount: number): { id: string; name: string } {
  if (prefix === 'A1-') {
    const idx = Math.min(completedCount, AXIOM_LEVELS.length - 1);
    const lvl = AXIOM_LEVELS[idx];
    return { id: lvl.id, name: lvl.name.toUpperCase() };
  }
  // Generic: <sector>-<n>
  const sectorNum = prefix.replace('-', '');
  const next = completedCount + 1;
  // Use K prefix display for Kepler per spec example "K1-6"
  const displayPrefix = sectorNum === '2' ? 'K1' : sectorNum;
  return { id: `${displayPrefix}-${next}`, name: 'INCOMING TRANSMISSION' };
}

function getBountyDifficulty(): string {
  const day = new Date().getDay();
  // Sun/Mon=EASY, Tue/Wed=MEDIUM, Thu/Sat=HARD, Fri=EXPERT
  if (day === 0 || day === 1) return 'EASY';
  if (day === 2 || day === 3) return 'MEDIUM';
  if (day === 5) return 'EXPERT';
  return 'HARD';
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Item =
  | { kind: 'section'; text: string }
  | { kind: 'line'; label: string; value: string; color: LineColor }
  | { kind: 'gap' }
  | { kind: 'tap' }
  | { kind: 'cursor' };

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ReturnBriefScreen({ navigation }: Props) {
  const { getSectorCompletedCount, getLevelStars, completedLevels, activeSector } =
    useProgressionStore();
  const { cogsIntegrity, damagedSystems } = useConsequenceStore();
  const { credits } = useEconomyStore();
  const { challengeStatus } = useChallengeStore();

  const [lastSession, setLastSession] = useState<number | null>(null);
  const [sessionsTotal, setSessionsTotal] = useState<number>(0);
  const [ready, setReady] = useState(false);

  // Hydrate session metadata + increment session count
  useEffect(() => {
    (async () => {
      const last = await AsyncStorage.getItem(SESSION_KEY);
      const count = await AsyncStorage.getItem(SESSION_COUNT_KEY);
      const nextCount = (count ? parseInt(count, 10) : 0) + 1;
      await AsyncStorage.setItem(SESSION_COUNT_KEY, String(nextCount));
      setLastSession(last ? parseInt(last, 10) : null);
      setSessionsTotal(nextCount);
      setReady(true);
    })();
  }, []);

  // ── Build items + COGS line (only when ready) ──
  const { items, cogsLine } = useMemo(() => {
    if (!ready) return { items: [] as Item[], cogsLine: '' };

    const axiomCompleted = getSectorCompletedCount('A1-');
    const sectorPrefix = getActiveSectorPrefix(activeSector);
    const sectorInfo = SECTOR_DISPLAY[sectorPrefix] ?? SECTOR_DISPLAY['A1-'];
    const sectorCompleted = getSectorCompletedCount(sectorPrefix);
    const totalCompleted = Object.keys(completedLevels).length;

    // Stars earned in active sector
    const sectorLevelIds = Object.keys(completedLevels).filter(id => id.startsWith(sectorPrefix));
    const starsEarned = sectorLevelIds.reduce((sum, id) => sum + getLevelStars(id), 0);
    const starsTotal = sectorInfo.total * 3;

    const mission = getActiveMissionId(sectorPrefix, sectorCompleted);
    const rank = getRank(totalCompleted);

    // COGS integrity formatting
    const integrity = Math.round(cogsIntegrity);
    let integrityValue: string;
    let integrityColor: LineColor;
    if (integrity >= 80) { integrityValue = `${integrity}% — NOMINAL`; integrityColor = 'green'; }
    else if (integrity >= 40) { integrityValue = `${integrity}% — DEGRADED`; integrityColor = 'amber'; }
    else { integrityValue = `${integrity}% — CRITICAL`; integrityColor = 'red'; }

    // Hull status
    let hullValue: string;
    let hullColor: LineColor;
    if (damagedSystems.length === 0) {
      hullValue = 'NOMINAL';
      hullColor = 'green';
    } else if (damagedSystems.length === 1) {
      hullValue = `${damagedSystems[0].toUpperCase()} — DAMAGED`;
      hullColor = 'amber';
    } else {
      hullValue = `${damagedSystems.length} SYSTEMS DAMAGED`;
      hullColor = 'red';
    }

    const showBounty = axiomCompleted >= AXIOM_TOTAL_LEVELS;
    let bountyValue = '';
    let bountyColor: LineColor = 'blue';
    if (showBounty) {
      switch (challengeStatus) {
        case 'available':
          bountyValue = `AVAILABLE — ${getBountyDifficulty()}`;
          bountyColor = 'blue';
          break;
        case 'attempted':
          bountyValue = 'ATTEMPTED';
          bountyColor = 'muted';
          break;
        case 'completed':
          bountyValue = 'COMPLETE';
          bountyColor = 'green';
          break;
        case 'declined':
          bountyValue = 'DECLINED';
          bountyColor = 'muted';
          break;
      }
    }

    const built: Item[] = [
      { kind: 'section', text: '// SESSION LOG' },
      { kind: 'line', label: 'TIME OFFLINE', value: formatTimeOffline(lastSession), color: 'amber' },
      { kind: 'line', label: 'LAST SESSION', value: formatLastSession(lastSession), color: 'muted' },
      { kind: 'line', label: 'SESSIONS TOTAL', value: String(sessionsTotal), color: 'blue' },
      { kind: 'gap' },

      { kind: 'section', text: '// MISSION STATUS' },
      { kind: 'line', label: 'ACTIVE SECTOR', value: sectorInfo.name, color: 'amber' },
      { kind: 'line', label: 'ACTIVE MISSION', value: `${mission.id} — ${mission.name}`, color: 'blue' },
      { kind: 'line', label: 'SECTOR PROGRESS', value: `${sectorCompleted} / ${sectorInfo.total} COMPLETE`, color: 'green' },
      { kind: 'line', label: 'STARS EARNED', value: `${starsEarned} / ${starsTotal}`, color: 'copper' },
      { kind: 'gap' },

      { kind: 'section', text: '// SHIP SYSTEMS' },
      { kind: 'line', label: 'COGS INTEGRITY', value: integrityValue, color: integrityColor },
      { kind: 'line', label: 'HULL STATUS', value: hullValue, color: hullColor },
      { kind: 'gap' },

      { kind: 'section', text: '// RESOURCES' },
      { kind: 'line', label: 'CREDITS', value: `${credits} CR`, color: 'copper' },
      { kind: 'line', label: 'RANK', value: `${rank.id} — ${rank.name}`, color: 'blue' },
    ];

    if (showBounty) {
      built.push({ kind: 'line', label: 'BOUNTY', value: bountyValue, color: bountyColor });
    }

    built.push({ kind: 'gap' });
    built.push({ kind: 'tap' });
    built.push({ kind: 'cursor' });

    // COGS line by priority
    let line: string;
    if (damagedSystems.length > 0) {
      line = `The ${damagedSystems[0]} damage is not improving on its own. I recommend we address it before continuing.`;
    } else if (integrity < 60) {
      line = `Integrity at ${integrity}%. Recommend repair before proceeding.`;
    } else if (lastSession && Date.now() - lastSession > 7 * 24 * 60 * 60 * 1000) {
      line = 'I had nearly reclassified you as previous crew. Welcome back.';
    } else if (showBounty && challengeStatus === 'available') {
      line = `There is a bounty transmission waiting. Difficulty: ${getBountyDifficulty()}.`;
    } else {
      line = getDefaultTimeAwayLine(lastSession);
    }

    return { items: built, cogsLine: line };
  }, [
    ready,
    lastSession,
    sessionsTotal,
    activeSector,
    completedLevels,
    cogsIntegrity,
    damagedSystems,
    credits,
    challengeStatus,
    getSectorCompletedCount,
    getLevelStars,
  ]);

  // ── Animations: one Animated.Value per item, plus card + screen ──
  const screenFade = useRef(new Animated.Value(0)).current;
  const exitFade = useRef(new Animated.Value(1)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const itemAnimsRef = useRef<Animated.Value[]>([]);
  const dismissed = useRef(false);

  // (Re)allocate per item count
  if (itemAnimsRef.current.length !== items.length) {
    itemAnimsRef.current = items.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    if (!ready || items.length === 0) return;

    Animated.timing(screenFade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    let delay = 200;
    const timers: ReturnType<typeof setTimeout>[] = [];
    items.forEach((it, i) => {
      const step = it.kind === 'section' ? 250 : it.kind === 'gap' ? 80 : 150;
      delay += step;
      const t = setTimeout(() => {
        if (dismissed.current) return;
        Animated.timing(itemAnimsRef.current[i], {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      }, delay);
      timers.push(t);
    });

    // COGS card after all lines
    const cardDelay = delay + 250;
    const cardTimer = setTimeout(() => {
      if (dismissed.current) return;
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, cardDelay);
    timers.push(cardTimer);

    // Auto-advance 8s after card appears
    const autoTimer = setTimeout(() => {
      if (!dismissed.current) goToHub();
    }, cardDelay + 8000);
    timers.push(autoTimer);

    return () => timers.forEach(clearTimeout);
  }, [ready, items.length]);

  const goToHub = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    AsyncStorage.setItem(SESSION_KEY, Date.now().toString()).catch(() => {});
    Animated.timing(exitFade, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      navigation.replace('Tabs');
    });
  };

  const hudStateRef = useRef(getHudState());
  const cornerColor = getHudCornerColor(hudStateRef.current);
  const scanColor = getHudScanLineColor(hudStateRef.current);
  const headerBorderColor = getHudHeaderBorderColor(hudStateRef.current);

  if (!ready) return <View style={s.root} />;

  return (
    <TouchableWithoutFeedback onPress={goToHub}>
      <Animated.View
        style={[s.root, { opacity: Animated.multiply(screenFade, exitFade) }]}
      >
        <ScanLine color={scanColor} />
        <HudCorners color={cornerColor} />

        {/* Header bar */}
        <View style={[s.headerBar, { borderBottomColor: headerBorderColor }]}>

          <Text style={s.headerLabel}>THE AXIOM — SYSTEM BOOT LOG</Text>
          <BlinkingText style={s.headerStatus}>RECONNECTING</BlinkingText>
        </View>

        {/* Terminal */}
        <View style={s.terminal}>
          {items.map((it, i) => {
            const opacity = itemAnimsRef.current[i] ?? 0;
            if (it.kind === 'gap') {
              return <Animated.View key={i} style={{ height: 6, opacity }} />;
            }
            if (it.kind === 'section') {
              return (
                <Animated.Text key={i} style={[s.section, { opacity }]}>
                  {it.text}
                </Animated.Text>
              );
            }
            if (it.kind === 'tap') {
              return (
                <Animated.Text key={i} style={[s.line, { opacity }]}>
                  <Text style={s.prompt}>{'> '}</Text>
                  <Text style={{ color: Colors.starWhite }}>Tap anywhere to continue.</Text>
                </Animated.Text>
              );
            }
            if (it.kind === 'cursor') {
              return (
                <Animated.View key={i} style={{ opacity }}>
                  <BlinkingText style={[s.line, { color: Colors.blue }]}>
                    {'> _'}
                  </BlinkingText>
                </Animated.View>
              );
            }
            const c = COLOR_MAP[it.color];
            return (
              <Animated.Text
                key={i}
                style={[s.line, { opacity }]}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                <Text style={s.prompt}>{'> '}</Text>
                <Text style={{ color: c }}>{it.label}</Text>
                <Text style={{ color: c }}> ... </Text>
                <Text style={{ color: c }}>{it.value}</Text>
              </Animated.Text>
            );
          })}
        </View>

        {/* COGS assessment card */}
        <Animated.View style={[s.cogsCard, { opacity: cardFade }]}>
          <View style={s.cogsAvatar}>
            <CogsAvatar size="small" state="online" />
          </View>
          <View style={s.cogsBody}>
            <Text style={s.cogsLabel}>C.O.G.S UNIT 7 — ASSESSMENT</Text>
            <Text style={s.cogsText}>{cogsLine}</Text>
          </View>
        </Animated.View>

        {/* Status bar */}
        <View style={s.statusBar}>
          <Text style={s.statusItem}>
            SYS: <Text style={s.statusVal}>{damagedSystems.length === 0 ? 'NOMINAL' : 'DEGRADED'}</Text>
          </Text>
          <Text style={s.statusItem}>
            COGS: <Text style={s.statusVal}>{Math.round(cogsIntegrity)}%</Text>
          </Text>
          <Text style={s.statusItem}>
            PWR: <Text style={s.statusVal}>94%</Text>
          </Text>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

// ─── Default time-away COGS line (replacement for old getTimeAwayLine) ──────

function getDefaultTimeAwayLine(lastSession: number | null): string {
  if (!lastSession) return 'Systems are nominal. Your previous session has been logged.';
  const elapsed = Date.now() - lastSession;
  const hours = elapsed / (1000 * 60 * 60);
  const days = Math.floor(hours / 24);
  if (hours < 1) return 'You were not gone long. I barely updated my estimates.';
  if (hours < 8) return 'Short absence. The Axiom held together without incident.';
  if (hours < 24) return 'Several hours offline. Nothing critical. I handled the maintenance log.';
  if (days <= 3) return `You have been away for ${days} day${days > 1 ? 's' : ''}. The Axiom managed. As it tends to.`;
  return `It has been ${days} days. I began to wonder. Briefly.`;
}

// ─── HUD chrome ──────────────────────────────────────────────────────────────

function HudCorners({ color }: { color: string }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      delay: 150,
      useNativeDriver: true,
    }).start();
  }, [fade]);
  const C = color;
  const corners: Array<{ pos: object; h: object; v: object }> = [
    { pos: { top: 14, left: 14 },     h: { top: 0, left: 0 },     v: { top: 0, left: 0 } },
    { pos: { top: 14, right: 14 },    h: { top: 0, right: 0 },    v: { top: 0, right: 0 } },
    { pos: { bottom: 14, left: 14 },  h: { bottom: 0, left: 0 },  v: { bottom: 0, left: 0 } },
    { pos: { bottom: 14, right: 14 }, h: { bottom: 0, right: 0 }, v: { bottom: 0, right: 0 } },
  ];
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="none">
      {corners.map((c, i) => (
        <View key={i} style={[s.corner, c.pos]}>
          <View style={[s.cornerH, c.h, { backgroundColor: C }]} />
          <View style={[s.cornerV, c.v, { backgroundColor: C }]} />
        </View>
      ))}
    </Animated.View>
  );
}

function ScanLine({ color }: { color: string }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(y, {
        toValue: H,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [y]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[s.scanLine, { backgroundColor: color, transform: [{ translateY: y }] }]}
    />
  );
}

function BlinkingText({
  style,
  children,
}: {
  style?: any;
  children: React.ReactNode;
}) {
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return <Animated.Text style={[style, { opacity: op }]}>{children}</Animated.Text>;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const BRACKET_SIZE = 22;
const BRACKET_THICKNESS = 2;

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
    height: 2,
    backgroundColor: 'rgba(74,158,255,0.18)',
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
  },
  cornerV: {
    position: 'absolute',
    width: BRACKET_THICKNESS,
    height: BRACKET_SIZE,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.10)',
  },
  headerLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.muted,
    letterSpacing: 2,
  },
  headerStatus: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.blue,
    letterSpacing: 2,
  },
  terminal: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  section: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.starWhite,
    paddingTop: Spacing.lg,
    paddingBottom: 7,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,244,255,0.10)',
  },
  line: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11.5,
    lineHeight: 26,
    letterSpacing: 0.5,
  },
  prompt: {
    color: Colors.muted,
  },
  cogsCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md + 2,
    backgroundColor: 'rgba(74,158,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.18)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  cogsAvatar: {
    flexShrink: 0,
    marginTop: 2,
  },
  cogsBody: {
    flex: 1,
  },
  cogsLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    letterSpacing: 2,
    color: Colors.blue,
    opacity: 0.7,
    marginBottom: 5,
  },
  cogsText: {
    fontFamily: Fonts.exo2,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    color: Colors.starWhite,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xl,
    paddingTop: 10,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(224,85,85,0.20)',
  },
  statusItem: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.red,
  },
  statusVal: {
    color: Colors.blue,
  },
});
