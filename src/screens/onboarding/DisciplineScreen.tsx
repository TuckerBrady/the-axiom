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
import { usePlayerStore, Discipline } from '../../store/playerStore';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Discipline'>;
};

const DISCIPLINES: Array<{
  id: Discipline;
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
    tagColor: Colors.circuit,
    description: 'You design the logic. You plan before you act. Protocol pieces are your native language.',
    cogsResponse: 'Protocol logic. Precise. Good.',
  },
  {
    id: 'engineer',
    name: 'Drive Engineer',
    tag: 'PHYSICS',
    tagColor: Colors.copper,
    description: 'You work with mechanisms. Movement, force, consequence. Physics pieces respond to your instincts.',
    cogsResponse: 'Mechanical focus. Your skills will be needed.',
  },
  {
    id: 'operative',
    name: 'Field Operative',
    tag: 'BALANCED',
    tagColor: Colors.blue,
    description: 'You adapt. You improvise. No specialisation means no limitation. We will see how that holds up.',
    cogsResponse: 'Generalist. Adaptable. We will see.',
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
  visible,
}: {
  response: string;
  visible: boolean;
}) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      reveal.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    } else {
      reveal.value = 0;
    }
  }, [visible]);
  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 14 }],
  }));
  if (!visible) return null;
  return (
    <Animated.View style={[s.cogsResponse, style]}>
      <View style={s.cogsResponseHeader}>
        <CogsAvatar size="small" state="online" />
        <Text style={s.cogsResponseLabel}>C.O.G.S RESPONSE</Text>
      </View>
      <Text style={s.cogsResponseText}>"{response}"</Text>
    </Animated.View>
  );
}

export default function DisciplineScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<Discipline>(null);
  const playerName = usePlayerStore(s => s.name);
  const setDiscipline = usePlayerStore(s => s.setDiscipline);

  const screenOpacity = useSharedValue(0);
  const greetReveal = useSharedValue(0);
  const confirmReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 400 });
    greetReveal.value = withDelay(100, withTiming(1, { duration: 500 }));
  }, []);

  useEffect(() => {
    if (selected) {
      confirmReveal.value = withTiming(1, { duration: 400 });
    }
  }, [selected]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const greetStyle = useAnimatedStyle(() => ({
    opacity: greetReveal.value,
    transform: [{ translateY: (1 - greetReveal.value) * 10 }],
  }));
  const confirmStyle = useAnimatedStyle(() => ({
    opacity: confirmReveal.value,
    transform: [{ translateY: (1 - confirmReveal.value) * 10 }],
  }));

  const handleConfirm = () => {
    if (!selected) return;
    setDiscipline(selected);
    navigation.navigate('Login');
  };

  const selectedDisc = DISCIPLINES.find(d => d.id === selected);

  return (
    <Animated.View style={[s.root, screenStyle]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>YOUR DISCIPLINE</Text>
        </View>

        {/* COGS greeting */}
        <Animated.View style={[s.greeting, greetStyle]}>
          <View style={s.greetAvatar}>
            <CogsAvatar size="small" state="online" />
          </View>
          <View style={s.greetBubble}>
            <Text style={s.greetText}>
              Acknowledged, {playerName || 'Engineer'}. For operational purposes I will refer to you as The Engineer. It is accurate. It is efficient. It will do for now.{'\n\n'}
              Now. Your discipline.
            </Text>
          </View>
        </Animated.View>

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

        {/* COGS response */}
        <View style={s.responseSection}>
          <CogsResponseCard
            response={selectedDisc?.cogsResponse ?? ''}
            visible={!!selected}
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
              <Text style={s.confirmBtnText}>CONFIRM DISCIPLINE  →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  scroll: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 4,
  },
  greeting: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  greetAvatar: { paddingTop: 4 },
  greetBubble: {
    flex: 1,
    backgroundColor: 'rgba(74,158,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.18)',
    borderRadius: 14,
    padding: Spacing.md,
  },
  greetText: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.md,
    color: Colors.starWhite,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  cards: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  disciplineCard: {
    backgroundColor: 'rgba(10,22,40,0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(74,158,255,0.18)',
    borderRadius: 14,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  disciplineCardSelected: {
    borderColor: Colors.blue,
    backgroundColor: 'rgba(74,158,255,0.08)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  cardName: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.starWhite,
    flex: 1,
  },
  cardTag: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  cardTagText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    letterSpacing: 1.5,
  },
  cardDesc: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.sm,
    color: Colors.muted,
    lineHeight: 20,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  selectedText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 1.5,
  },
  responseSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    minHeight: 80,
  },
  cogsResponse: {
    backgroundColor: 'rgba(74,158,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    borderRadius: 14,
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
    color: Colors.blue,
    letterSpacing: 1.5,
  },
  cogsResponseText: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.md,
    color: Colors.starWhite,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  confirmSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  confirmBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 12,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 3,
  },
});
