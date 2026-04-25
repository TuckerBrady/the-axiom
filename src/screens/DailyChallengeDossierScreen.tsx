import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import CogsAvatar from '../components/CogsAvatar';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useGameStore } from '../store/gameStore';
import { useChallengeStore } from '../store/challengeStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DailyChallengeDossier'>;
};

export default function DailyChallengeDossierScreen({ navigation }: Props) {
  const { currentChallenge, markAttempted, declineChallenge } = useChallengeStore();
  const setLevel = useGameStore(s => s.setLevel);

  if (!currentChallenge) {
    navigation.goBack();
    return null;
  }

  const { sender, reward, cogsPresentation, cogsFullBrief } = currentChallenge;

  const senderBadgeColor =
    sender.type === 'known_contact' ? Colors.green :
    sender.type === 'pirate_adjacent' ? Colors.red :
    sender.type === 'government' ? Colors.blue :
    Colors.amber;

  const senderBadgeLabel =
    sender.type === 'known_contact' ? 'KNOWN CONTACT' :
    sender.type === 'pirate_adjacent' ? 'CLASSIFIED' :
    sender.type === 'government' ? 'OFFICIAL' :
    'UNKNOWN';

  const handleAccept = async () => {
    await markAttempted();
    setLevel(currentChallenge.level);
    // replace (not navigate) — see MissionDossierScreen.handleLaunch
    // for the rationale. Forces a fresh GameplayScreen mount.
    navigation.replace('Gameplay');
  };

  const handleDecline = async () => {
    await declineChallenge();
    navigation.goBack();
  };

  return (
    <View style={st.root}>
      <SafeAreaView style={st.safeArea}>
        {/* Header */}
        <View style={st.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={st.headerCenter}>
            <Text style={st.headerLabel}>INCOMING TRANSMISSION</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          {/* Sender block */}
          <Text style={st.senderName}>{sender.name}</Text>
          <View style={st.senderRow}>
            <Text style={st.senderSector}>{sender.sector}</Text>
            <View style={[st.senderBadge, { borderColor: senderBadgeColor }]}>
              <Text style={[st.senderBadgeText, { color: senderBadgeColor }]}>{senderBadgeLabel}</Text>
            </View>
          </View>

          {/* Transmission text */}
          <Text style={st.briefText}>{'"'}{cogsFullBrief}{'"'}</Text>

          {/* Reward block */}
          <View style={st.rewardBox}>
            <Text style={st.rewardLabel}>MISSION REWARD</Text>
            <Text style={st.rewardAmount}>{reward.creditAmount ?? 0} CR</Text>
            {reward.bonusDescription && (
              <Text style={st.rewardBonus}>+ {reward.bonusDescription}</Text>
            )}
          </View>

          {/* Reward conditions */}
          <View style={st.conditionsBox}>
            <Text style={st.conditionLine}>★★★  FULL BOUNTY: {reward.creditAmount ?? 0} CR</Text>
            <Text style={[st.conditionLine, { color: Colors.dim }]}>★★☆  PARTIAL: 0 CR</Text>
            <Text style={[st.conditionLine, { color: Colors.dim }]}>VOID: 0 CR</Text>
          </View>

          {/* One attempt warning */}
          <Text style={st.warningText}>ONE ATTEMPT</Text>
          <Text style={st.warningSubtext}>★★★ THREE STARS REQUIRED FOR FULL BOUNTY</Text>

          {/* Mission requirements */}
          <View style={st.requirementsBox}>
            {currentChallenge.level.optimalPieces <= 3 && (
              <Text style={st.requirementLine}>Minimal routing expected. Use only what is needed.</Text>
            )}
            {currentChallenge.level.dataTrail.cells.length > 0 && (
              <Text style={st.requirementLine}>Data Trail manipulation required. The Transmitter is not optional.</Text>
            )}
            {currentChallenge.level.gridHeight > 6 && (
              <Text style={st.requirementLine}>Non-linear routing required. Plan before placing.</Text>
            )}
            <Text style={st.requirementLine}>This transmission demands precision. The sender is not offering a second attempt.</Text>
          </View>

          {/* COGS assessment */}
          <View style={st.cogsCard}>
            <View style={st.cogsCardHeader}>
              <CogsAvatar size="small" state="engaged" />
              <Text style={st.cogsCardLabel}>COGS ASSESSMENT</Text>
            </View>
            <Text style={st.cogsCardText}>{'"'}{cogsPresentation}{'"'}</Text>
          </View>
        </ScrollView>

        {/* Bottom buttons */}
        <View style={st.bottomBar}>
          <Button variant="gradient" label="ACCEPT MISSION" onPress={handleAccept} />
          <TouchableOpacity style={st.declineBtn} onPress={handleDecline} activeOpacity={0.7}>
            <Text style={st.declineText}>DECLINE</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,121,65,0.15)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: Colors.copper,
    letterSpacing: 4,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  senderName: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 1,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  senderSector: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
  },
  senderBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  senderBadgeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    letterSpacing: 0.5,
  },
  briefText: {
    fontFamily: Fonts.exo2,
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.starWhite,
    lineHeight: 22,
    marginTop: Spacing.md,
  },
  rewardBox: {
    backgroundColor: 'rgba(200,121,65,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(200,121,65,0.25)',
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  rewardLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.copper,
    letterSpacing: 2,
  },
  rewardAmount: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.amber,
  },
  rewardBonus: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
  },
  conditionsBox: {
    backgroundColor: 'rgba(10,18,30,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(200,121,65,0.15)',
    borderRadius: 10,
    padding: Spacing.md,
    gap: 4,
  },
  conditionLine: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: Colors.amber,
    letterSpacing: 1,
  },
  warningText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: Colors.red,
    letterSpacing: 3,
    textAlign: 'center',
  },
  warningSubtext: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.amber,
    letterSpacing: 2,
    textAlign: 'center',
  },
  requirementsBox: {
    gap: 6,
  },
  requirementLine: {
    fontFamily: Fonts.exo2,
    fontSize: 11,
    color: Colors.muted,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  cogsCard: {
    backgroundColor: 'rgba(10,18,30,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.18)',
    borderRadius: 14,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cogsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cogsCardLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.blue,
    letterSpacing: 1.5,
  },
  cogsCardText: {
    fontFamily: Fonts.exo2,
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.cream,
    lineHeight: 20,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200,121,65,0.1)',
  },
  declineBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  declineText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 2,
  },
});
