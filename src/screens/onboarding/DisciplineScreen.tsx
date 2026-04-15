import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import CogsAvatar from '../../components/CogsAvatar';
import { usePlayerStore, DISCIPLINE_MAP } from '../../store/playerStore';
import { DISCIPLINE_REACTIONS, DISCIPLINE_NEUTRAL_PROMPT } from '../../constants/disciplineReactions';

type OnboardingDiscipline = 'architect' | 'engineer' | 'operative' | null;
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Discipline'>;
};

const DISCIPLINES: Array<{
  id: OnboardingDiscipline;
  name: string;
  tag: string;
  tagColor: string;
  description: string;
  cogsResponse: string;
}> = [
  {
    id: 'architect',
    name: 'Systems Architect',
    tag: 'PROTOCOL',
    tagColor: '#00D4FF',
    description: 'You design the logic. You plan before you act. Protocol pieces are your native language.',
    cogsResponse: DISCIPLINE_REACTIONS.architect,
  },
  {
    id: 'engineer',
    name: 'Drive Engineer',
    tag: 'PHYSICS',
    tagColor: '#F0B429',
    description: 'You work with mechanisms. Movement, force, consequence. Physics pieces respond to your instincts.',
    cogsResponse: DISCIPLINE_REACTIONS.engineer,
  },
  {
    id: 'operative',
    name: 'Field Operative',
    tag: 'BALANCED',
    tagColor: '#00C48C',
    description: 'You adapt. You improvise. No specialisation means no limitation. We will see how that holds up.',
    cogsResponse: DISCIPLINE_REACTIONS.operative,
  },
];

function DisciplineCard({
  item,
  selected,
  onSelect,
  index,
}: {
  item: typeof DISCIPLINES[0];
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(index * 150 + 300, withTiming(1, { duration: 450 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateX: (1 - reveal.value) * -20 }],
  }));
  return (
    <Animated.View style={style}>
      <TouchableOpacity
        style={[s.disciplineCard, selected && s.disciplineCardSelected]}
        onPress={onSelect}
        activeOpacity={0.85}
      >
        <View style={s.cardTop}>
          <Text style={s.cardName}>{item.name}</Text>
          <View style={[s.cardTag, { borderColor: item.tagColor, backgroundColor: `${item.tagColor}18` }]}>
            <Text style={[s.cardTagText, { color: item.tagColor }]}>{item.tag}</Text>
          </View>
        </View>
        <Text style={s.cardDesc}>{item.description}</Text>
        {selected && (
          <View style={s.selectedIndicator}>
            <Text style={s.selectedText}>✓ SELECTED</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function CogsResponseCard({
  response,
  selected,
}: {
  response: string;
  selected: boolean;
}) {
  // Fade-swap animation: fade out old text, swap, fade in new text (380ms total)
  const textOpacity = useSharedValue(1);
  const [displayText, setDisplayText] = useState(response);

  useEffect(() => {
    // Fade out, swap text, fade in
    textOpacity.value = withTiming(0, { duration: 190 });
    const timer = setTimeout(() => {
      setDisplayText(response);
      textOpacity.value = withTiming(1, { duration: 190 });
    }, 190);
    return () => clearTimeout(timer);
  }, [response]);

  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));

  return (
    <View
      style={s.cogsResponse}
      accessibilityLiveRegion="polite"
    >
      <View style={s.cogsResponseHeader}>
        <CogsAvatar size="small" state={selected ? 'engaged' : 'online'} />
        <Text style={s.cogsResponseLabel}>C.O.G.S</Text>
      </View>
      <Animated.View style={textStyle}>
        <Text style={s.cogsResponseText}>{'"'}{displayText}{'"'}</Text>
      </Animated.View>
    </View>
  );
}

export default function DisciplineScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<OnboardingDiscipline>(null);
  const setDiscipline = usePlayerStore(s => s.setDiscipline);

  const screenOpacity = useSharedValue(0);
  const confirmReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  useEffect(() => {
    if (selected) {
      confirmReveal.value = withTiming(1, { duration: 400 });
    }
  }, [selected]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const confirmStyle = useAnimatedStyle(() => ({
    opacity: confirmReveal.value,
    transform: [{ translateY: (1 - confirmReveal.value) * 10 }],
  }));

  const handleConfirm = () => {
    if (!selected) return;
    const mapped = DISCIPLINE_MAP[selected] ?? null;
    setDiscipline(mapped);
    navigation.navigate('Login');
  };

  const selectedDisc = DISCIPLINES.find(d => d.id === selected);

  return (
    <Animated.View style={[s.root, screenStyle]}>
      <View pointerEvents="none" style={[s.bracket, { top: 8, left: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderTopLeftRadius: 3 }]} />
      <View pointerEvents="none" style={[s.bracket, { top: 8, right: 8, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderTopRightRadius: 3 }]} />
      <View pointerEvents="none" style={[s.bracket, { bottom: 8, left: 8, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderBottomLeftRadius: 3 }]} />
      <View pointerEvents="none" style={[s.bracket, { bottom: 8, right: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderBottomRightRadius: 3 }]} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>YOUR DISCIPLINE</Text>
        </View>

        {/* Discipline cards */}
        <View style={s.cards}>
          {DISCIPLINES.map((item, i) => (
            <DisciplineCard
              key={item.id}
              item={item}
              index={i}
              selected={selected === item.id}
              onSelect={() => setSelected(item.id)}
            />
          ))}
        </View>

        {/* COGS response — always visible, swaps text reactively */}
        <View style={s.responseSection}>
          <CogsResponseCard
            response={selectedDisc?.cogsResponse ?? DISCIPLINE_NEUTRAL_PROMPT}
            selected={!!selected}
          />
        </View>

        {/* Confirm button */}
        {selected && (
          <Animated.View style={[s.confirmSection, confirmStyle]}>
            <TouchableOpacity
              style={s.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text style={s.confirmBtnText}>CONFIRM DISCIPLINE</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
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
  scroll: { flexGrow: 1, paddingBottom: 60 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,212,255,0.08)',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.spaceMono,
    fontSize: 15,
    fontWeight: '400',
    color: '#E8F4FF',
    letterSpacing: 2,
  },
  cards: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md },
  disciplineCard: {
    backgroundColor: 'rgba(6,9,18,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  disciplineCardSelected: {
    borderColor: 'rgba(0,212,255,0.35)',
    backgroundColor: 'rgba(0,212,255,0.05)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  cardName: {
    fontFamily: Fonts.exo2,
    fontSize: 15,
    fontWeight: '500',
    color: '#E8F4FF',
    flex: 1,
  },
  cardTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardTagText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  cardDesc: {
    fontFamily: Fonts.exo2,
    fontSize: 13,
    fontWeight: '300',
    color: '#7A9AB8',
    lineHeight: 21,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  selectedText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: '#00D4FF',
    letterSpacing: 1.2,
  },
  responseSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    minHeight: 80,
  },
  cogsResponse: {
    backgroundColor: 'rgba(6,9,18,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.12)',
    borderRadius: 10,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cogsResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cogsResponseLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: '#00D4FF',
    opacity: 0.7,
    letterSpacing: 1.2,
  },
  cogsResponseText: {
    fontFamily: Fonts.exo2,
    fontSize: 14,
    fontWeight: '300',
    color: '#B0CCE8',
    fontStyle: 'italic',
    lineHeight: 23,
  },
  confirmSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  confirmBtn: {
    backgroundColor: 'rgba(240,180,41,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.45)',
    borderRadius: 8,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F0B429',
    letterSpacing: 1.5,
  },
});
