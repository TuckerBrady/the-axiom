import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import CogsAvatar from '../CogsAvatar';
import { Button } from '../Button';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';
import type { LevelDefinition, ScoringCategory } from '../../game/types';
import type { ScoreResult } from '../../game/scoring';
import type { Discipline } from '../../store/playerStore';
import { useEconomyStore } from '../../store/economyStore';
import type { WrongOutputData, PulseResultData } from '../../hooks/useGameplayModals';

const { width: screenWidth } = Dimensions.get('window');

const VOID_QUOTES = [
  '"The signal did not reach Output. I observed the exact moment it failed."',
  '"Void state. I could explain why. You should already know."',
  '"The machine did not lock. Review your connections."',
  '"Signal lost. The configuration was incorrect. Adjust and retry."',
];

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function renderStars(count: number) {
  return [1, 2, 3].map(i => (
    <Animated.View
      key={i}
      entering={FadeInUp.delay(i * 200).duration(400)}
    >
      <Svg width={40} height={40} viewBox="0 0 24 24">
        <Path
          d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z"
          fill={i <= count ? Colors.amber : 'rgba(74,158,255,0.15)'}
          stroke={i <= count ? Colors.copper : 'rgba(74,158,255,0.3)'}
          strokeWidth="1"
        />
      </Svg>
    </Animated.View>
  ));
}

export interface GameplayModalsProps {
  // Modal flags + data (from useGameplayModals)
  showPauseModal: boolean;
  setShowPauseModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAbandonConfirm: boolean;
  setShowAbandonConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  showVoid: boolean;
  setShowVoid: React.Dispatch<React.SetStateAction<boolean>>;
  showResults: boolean;
  setShowResults: React.Dispatch<React.SetStateAction<boolean>>;
  showCompletionCard: boolean;
  showWrongOutput: boolean;
  setShowWrongOutput: React.Dispatch<React.SetStateAction<boolean>>;
  wrongOutputData: WrongOutputData;
  setWrongOutputData: React.Dispatch<React.SetStateAction<WrongOutputData>>;
  showInsufficientPulses: boolean;
  setShowInsufficientPulses: React.Dispatch<React.SetStateAction<boolean>>;
  pulseResultData: PulseResultData;
  setPulseResultData: React.Dispatch<React.SetStateAction<PulseResultData>>;
  showOutOfLives: boolean;
  setShowOutOfLives: React.Dispatch<React.SetStateAction<boolean>>;
  showEconomyIntro: boolean;
  setShowEconomyIntro: React.Dispatch<React.SetStateAction<boolean>>;
  showSystemRestored: string | null;
  showCompletionScene: boolean;
  completionText: string;
  showDisciplineCard: boolean;
  setShowDisciplineCard: React.Dispatch<React.SetStateAction<boolean>>;
  showTeachCard: string[] | null;
  setShowTeachCard: React.Dispatch<React.SetStateAction<string[] | null>>;
  scoreResult: ScoreResult | null;
  cogsScoreComment: string;
  firstTimeBonus: boolean;
  elaborationMult: number;

  // Failure state (from useGameplayFailure)
  blownCells: Set<string>;
  setBlownCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  failCount: number;
  getBlownCellCOGSLine: (count: number) => string | null;

  // Stores
  lives: number;
  livesCredits: number;
  discipline: Discipline;
  credits: number;
  loseLife: () => void;
  refillLives: () => boolean;
  stars: number;

  // Level
  level: LevelDefinition;
  isAxiomLevel: boolean;
  isDailyChallenge: boolean;

  // Timer
  elapsedSeconds: number;

  // Layout
  CELL_SIZE: number;

  // Callbacks
  navigation: NativeStackNavigationProp<RootStackParamList, 'Gameplay'>;
  handleReset: () => void;
  onCompletionContinue: () => void;
  onWrongOutputRetry: () => void;
  onDebug: () => void;
}

function GameplayModalsImpl(props: GameplayModalsProps) {
  const {
    showPauseModal, setShowPauseModal,
    showAbandonConfirm, setShowAbandonConfirm,
    showVoid, setShowVoid,
    showResults, setShowResults,
    showCompletionCard,
    showWrongOutput, setShowWrongOutput,
    wrongOutputData, setWrongOutputData,
    showInsufficientPulses, setShowInsufficientPulses,
    pulseResultData, setPulseResultData,
    showOutOfLives, setShowOutOfLives,
    showEconomyIntro, setShowEconomyIntro,
    showSystemRestored,
    showCompletionScene, completionText,
    showDisciplineCard, setShowDisciplineCard,
    showTeachCard, setShowTeachCard,
    scoreResult, cogsScoreComment, firstTimeBonus, elaborationMult,
    blownCells, setBlownCells,
    getBlownCellCOGSLine,
    lives, livesCredits, discipline, credits,
    loseLife, refillLives, stars,
    level, isAxiomLevel, isDailyChallenge,
    elapsedSeconds,
    navigation, handleReset,
    onCompletionContinue, onWrongOutputRetry, onDebug,
  } = props;

  return (
    <>
      {/* ── Economy Intro (first non-Axiom level) ── */}
      {showEconomyIntro && (
        <Animated.View style={styles.overlay} entering={FadeIn.duration(400)}>
          <LinearGradient
            colors={['rgba(6,9,15,0.97)', 'rgba(10,22,40,0.99)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.overlayContent}>
            <CogsAvatar size="medium" state="online" />
            <Text style={{
              fontFamily: Fonts.exo2, fontSize: 14, fontStyle: 'italic',
              color: Colors.starWhite, lineHeight: 22, textAlign: 'center',
              marginTop: Spacing.xl, maxWidth: 300,
            }}>
              The Axiom is repaired. The training protocols are behind you. Pieces cost Credits here. You have been accumulating them. Spend wisely.
            </Text>
            <TouchableOpacity
              style={{ marginTop: Spacing.xxl }}
              onPress={async () => {
                await AsyncStorage.setItem('axiom_economy_intro_seen', '1');
                setShowEconomyIntro(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.dim, letterSpacing: 3 }}>
                TAP TO CONTINUE
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ── System Restored Overlay ── */}
      {showSystemRestored && (
        <Animated.View style={styles.overlay} entering={FadeIn.duration(300)}>
          <LinearGradient
            colors={['rgba(6,9,15,0.96)', 'rgba(10,22,40,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.overlayContent}>
            <Text style={styles.systemRestoredText}>
              {showSystemRestored.toUpperCase()}{'\n'}RESTORED
            </Text>
          </View>
        </Animated.View>
      )}

      {/* ── Post-completion CONTINUE (gates Results screen) ── */}
      {showCompletionCard && !showResults && (
        <View style={styles.completionContinueWrap} pointerEvents="box-none">
          <Button
            variant="primary"
            label="CONTINUE"
            onPress={onCompletionContinue}
            style={styles.completionContinueBtn}
          />
        </View>
      )}

      {/* ── Results Overlay (Success) ── */}
      {showResults && (
        <Animated.View style={styles.overlay} entering={FadeIn.duration(400)}>
          <LinearGradient
            colors={['rgba(6,9,15,0.94)', 'rgba(10,22,40,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.overlayContent}>
            <View style={styles.starsRow}>{renderStars(scoreResult?.stars ?? stars)}</View>
            <Text style={styles.resultsTitle}>CIRCUIT COMPLETE</Text>
            <Text style={styles.resultsLevel}>{level.name}</Text>

            {/* Score breakdown strip — progressive reveal */}
            {scoreResult && (() => {
              const visible = level.scoringCategoriesVisible ?? ['efficiency'];
              const allCats: [ScoringCategory, string, number, number][] = [
                ['efficiency', 'EFFICIENCY', scoreResult.breakdown.efficiency, 30],
                ['protocolPrecision', 'PROTOCOL', scoreResult.breakdown.protocolPrecision, 25],
                ['chainIntegrity', 'INTEGRITY', scoreResult.breakdown.chainIntegrity, 20],
                ['disciplineBonus', 'DISCIPLINE', scoreResult.breakdown.disciplineBonus, 15],
                ['speedBonus', 'SPEED', scoreResult.breakdown.speedBonus, 10],
                ['elaboration', 'ELABORATION', scoreResult.breakdown.elaboration, 15],
              ];
              const shown = allCats.filter(([cat, , val]) => {
                if (cat === 'elaboration') return val > 0 && level.sector !== 'axiom';
                return visible.includes(cat);
              });
              return (
                <View style={styles.scoreStrip}>
                  {shown.map(([, label, val, max]) => (
                    <View key={label} style={styles.scoreCell}>
                      <Text style={[
                        styles.scoreCellVal,
                        { color: val >= max ? '#4ecb8d' : val > 0 ? '#f0b429' : 'rgba(224,85,85,0.7)' },
                      ]}>{val}</Text>
                      <Text style={styles.scoreCellLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}

            {level.id === 'A1-8' && firstTimeBonus && (
              <Text style={{ fontFamily: Fonts.spaceMono, fontSize: 9, color: '#4ecb8d', letterSpacing: 3, marginBottom: Spacing.md, textAlign: 'center' }}>
                FULL SCORING UNLOCKED
              </Text>
            )}

            {scoreResult && scoreResult.breakdown.forfeitedPurchasedCount > 0 && (
              <Text style={styles.forfeitedNotice}>
                {scoreResult.breakdown.forfeitedPurchasedCount}{' '}
                {scoreResult.breakdown.forfeitedPurchasedCount === 1
                  ? 'COMPONENT FORFEITED'
                  : 'COMPONENTS FORFEITED'}
              </Text>
            )}

            <View style={styles.cogsResultRow}>
              <CogsAvatar size="small" state="online" />
              <Text style={styles.resultsQuote}>
                {'"'}{cogsScoreComment || 'Circuit complete.'}{'"'}
                {firstTimeBonus ? '\n\n"Mission logged. 25 CR credited to your account."' : ''}
                {elaborationMult > 1 ? `\n\nElaboration: ${elaborationMult.toFixed(1)}x credits` : ''}
              </Text>
            </View>
            <View style={styles.resultsActions}>
              <Button
                variant="secondary"
                label="REPLAY"
                onPress={handleReset}
                style={{ flex: 1 }}
              />
              <Button
                variant="gradient"
                label="CONTINUE"
                onPress={async () => {
                  // A1-3 discipline acknowledgment (first time only)
                  if (level.id === 'A1-3' && firstTimeBonus && discipline) {
                    const seen = await AsyncStorage.getItem('axiom_a13_discipline_seen');
                    if (!seen) {
                      await AsyncStorage.setItem('axiom_a13_discipline_seen', '1');
                      setShowResults(false);
                      setShowDisciplineCard(true);
                      return;
                    }
                  }
                  navigation.reset({
                    index: 1,
                    routes: [{ name: 'Tabs' }, { name: 'LevelSelect' }],
                  });
                }}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Wrong Output Diagnostic Modal ── */}
      {showWrongOutput && wrongOutputData && (
        <Animated.View style={styles.completionCardWrap} entering={FadeIn.duration(300)}>
          <View style={styles.wrongOutputCard}>
            <Text style={styles.wrongOutputTitle}>OUTPUT MISMATCH</Text>
            <View style={styles.wrongOutputSection}>
              <Text style={styles.wrongOutputLabel}>EXPECTED</Text>
              <View style={styles.wrongOutputRow}>
                {wrongOutputData.expected.map((v, i) => {
                  const match = wrongOutputData.produced[i] === v;
                  return (
                    <View key={`exp-${i}`} style={[styles.wrongOutputCell, !match && styles.wrongOutputCellMismatch]}>
                      <Text style={[styles.wrongOutputCellText, !match && { color: '#EF4444' }]}>{v}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={styles.wrongOutputSection}>
              <Text style={styles.wrongOutputLabel}>PRODUCED</Text>
              <View style={styles.wrongOutputRow}>
                {wrongOutputData.produced.map((v, i) => {
                  const match = wrongOutputData.expected[i] === v;
                  const isEmpty = v === -1;
                  return (
                    <View key={`prod-${i}`} style={[styles.wrongOutputCell, !match && styles.wrongOutputCellMismatch]}>
                      <Text style={[styles.wrongOutputCellText, !match && { color: '#EF4444' }]}>
                        {isEmpty ? '_' : v}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <CogsAvatar size="small" state="online" />
              <Text style={styles.wrongOutputCogsText}>
                {"\""}The machine produced an answer. It was not the correct one. The data shows where.{"\""}
              </Text>
            </View>
            {blownCells.size > 0 && (
              <TouchableOpacity
                style={[styles.wrongOutputRetryBtn, {
                  borderColor: credits >= 50 ? Colors.amber : Colors.dim,
                  opacity: credits >= 50 ? 1 : 0.5,
                  marginBottom: 8,
                }]}
                onPress={() => {
                  const ok = useEconomyStore.getState().spendDirect(50);
                  if (ok) {
                    setShowWrongOutput(false);
                    setWrongOutputData(null);
                    setBlownCells(new Set());
                    handleReset();
                  }
                }}
                activeOpacity={0.8}
                disabled={credits < 50}
              >
                <Text style={[styles.wrongOutputRetryText, {
                  color: credits >= 50 ? Colors.amber : Colors.dim,
                }]}>
                  {credits >= 50 ? 'RESET BOARD — 50 CR' : 'RESET BOARD — INSUFFICIENT'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.wrongOutputRetryBtn}
              onPress={onWrongOutputRetry}
              activeOpacity={0.8}
            >
              <Text style={styles.wrongOutputRetryText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ── Insufficient Pulses Overlay (requiredTerminalCount not met) ── */}
      {showInsufficientPulses && pulseResultData && (
        <Animated.View style={styles.completionCardWrap} entering={FadeIn.duration(300)}>
          <View style={styles.wrongOutputCard}>
            <Text style={styles.wrongOutputTitle}>INSUFFICIENT PULSES</Text>
            <Text style={styles.insufficientSubtext}>
              {pulseResultData.achieved} of {pulseResultData.required} required pulses reached the terminal.
            </Text>
            <View style={styles.pulseResultsRow}>
              {pulseResultData.results.map((reached, i) => (
                <View
                  key={`pulse-${i}`}
                  style={[
                    styles.pulseResultCell,
                    reached ? styles.pulseResultPass : styles.pulseResultFail,
                  ]}
                >
                  <Text style={[
                    styles.pulseResultText,
                    { color: reached ? '#22C55E' : '#EF4444' },
                  ]}>
                    {'P' + (i + 1)}
                  </Text>
                  <Text style={[
                    styles.pulseResultIcon,
                    { color: reached ? '#22C55E' : '#EF4444' },
                  ]}>
                    {reached ? 'PASS' : 'BLOCKED'}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <CogsAvatar size="small" state="damaged" />
              <Text style={styles.wrongOutputCogsText}>
                {`"${pulseResultData.required} pulse${pulseResultData.required === 1 ? '' : 's'} ${pulseResultData.required === 1 ? 'was' : 'were'} required. The machine delivered fewer. The configuration was not aligned with the input."`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.wrongOutputRetryBtn}
              onPress={() => {
                setShowInsufficientPulses(false);
                setPulseResultData(null);
                handleReset();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.wrongOutputRetryText}>TRY AGAIN</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ── Void State Overlay (Failure) ── */}
      {showVoid && (
        <Animated.View style={styles.voidOverlay} entering={FadeIn.duration(400)}>
          <LinearGradient
            colors={['rgba(30,5,5,0.94)', 'rgba(15,2,2,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.overlayContent}>
            <Text style={styles.voidTitle}>VOID STATE</Text>
            <Text style={styles.voidSubtext}>Signal lost. Machine failed.</Text>
            <View style={styles.cogsResultRow}>
              <CogsAvatar size="small" state="damaged" />
              <Text style={styles.voidQuote}>
                {VOID_QUOTES[Math.floor(Math.random() * VOID_QUOTES.length)]}
              </Text>
              {!isAxiomLevel && blownCells.size > 0 && (
                <Text style={styles.voidQuote}>
                  {getBlownCellCOGSLine(blownCells.size)}
                </Text>
              )}
            </View>
            {isDailyChallenge && (
              <Text style={{ fontFamily: Fonts.spaceMono, fontSize: 10, color: Colors.red, letterSpacing: 3, marginBottom: Spacing.md, textAlign: 'center' }}>
                REWARD FORFEITED
              </Text>
            )}
            <View style={styles.voidActions}>
              {!isDailyChallenge && (
                <TouchableOpacity
                  style={styles.voidBtn}
                  onPress={() => {
                    if (lives <= 0) {
                      setShowVoid(false);
                      setShowOutOfLives(true);
                    } else {
                      loseLife();
                      handleReset();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.voidBtnText}>TRY AGAIN</Text>
                </TouchableOpacity>
              )}
              {!isDailyChallenge && blownCells.size > 0 && (
                <TouchableOpacity
                  style={[styles.voidBtn, {
                    borderColor: credits >= 50 ? Colors.amber : Colors.dim,
                    opacity: credits >= 50 ? 1 : 0.5,
                  }]}
                  onPress={() => {
                    const ok = useEconomyStore.getState().spendDirect(50);
                    if (ok) {
                      setBlownCells(new Set());
                      handleReset();
                    }
                  }}
                  activeOpacity={0.7}
                  disabled={credits < 50}
                >
                  <Text style={[styles.voidBtnText, {
                    color: credits >= 50 ? Colors.amber : Colors.dim,
                  }]}>
                    {credits >= 50 ? 'RESET BOARD — 50 CR' : 'RESET BOARD — INSUFFICIENT'}
                  </Text>
                </TouchableOpacity>
              )}
              {!isDailyChallenge && (
                <TouchableOpacity
                  style={[styles.voidBtn, { borderColor: Colors.amber }]}
                  onPress={onDebug}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.voidBtnText, { color: Colors.amber }]}>DEBUG (50 CR)</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.voidBtn, { borderColor: Colors.muted }]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Text style={[styles.voidBtnText, { color: Colors.muted }]}>{isDailyChallenge ? 'RETURN TO SHIP' : 'BACK TO MAP'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── COGS Teach Card (failure teaching, single-tap dismiss) ── */}
      {showTeachCard && (
        <Animated.View style={styles.overlay} entering={FadeIn.duration(400)}>
          <LinearGradient
            colors={['rgba(6,9,15,0.97)', 'rgba(10,22,40,0.99)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.overlayContent}>
            <CogsAvatar size="medium" state="engaged" />
            <View style={{ gap: 16, marginTop: Spacing.xl, maxWidth: 320 }}>
              {showTeachCard.map((line, i) => (
                <Text key={i} style={{
                  fontFamily: Fonts.exo2, fontSize: 13, fontStyle: 'italic',
                  color: Colors.starWhite, lineHeight: 20,
                }}>{line}</Text>
              ))}
            </View>
            <TouchableOpacity
              style={{ marginTop: Spacing.xl }}
              onPress={() => {
                setShowTeachCard(null);
                setShowVoid(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.dim, letterSpacing: 3 }}>
                TAP TO CONTINUE
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ── Out of Lives Overlay ── */}
      {showOutOfLives && (
        <Animated.View style={styles.overlay} entering={FadeIn.duration(400)}>
          <LinearGradient
            colors={['rgba(6,9,15,0.96)', 'rgba(10,22,40,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.overlayContent}>
            <Svg width={48} height={48} viewBox="0 0 24 24" style={{ marginBottom: Spacing.lg }}>
              <Path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill={Colors.dim}
                stroke={Colors.muted}
                strokeWidth="1"
              />
            </Svg>
            <Text style={styles.resultsTitle}>OUT OF LIVES</Text>
            <View style={[styles.cogsResultRow, { marginTop: Spacing.md }]}>
              <CogsAvatar size="small" state="online" />
              <Text style={styles.resultsQuote}>
                {'"'}You are out of lives. I could tell you to wait. But there is an alternative.{'"'}
              </Text>
            </View>
            <Button
              variant="gradient"
              label={livesCredits >= 30 ? 'REFILL LIVES · 30 CR' : `NEED ${30 - livesCredits} MORE CR`}
              onPress={() => {
                const ok = refillLives();
                if (ok) {
                  setShowOutOfLives(false);
                  handleReset();
                }
              }}
              disabled={livesCredits < 30}
              style={{ width: '100%', marginBottom: Spacing.sm }}
            />
            <Button
              variant="secondary"
              label="MAYBE LATER"
              onPress={() => {
                setShowOutOfLives(false);
                navigation.goBack();
              }}
              style={{ width: '100%' }}
            />
          </View>
        </Animated.View>
      )}

      {/* ── A1-3 Discipline Acknowledgment ── */}
      {showDisciplineCard && discipline && (
        <TouchableOpacity
          style={styles.completionScene}
          activeOpacity={1}
          onPress={() => {
            setShowDisciplineCard(false);
            navigation.reset({
              index: 1,
              routes: [{ name: 'Tabs' }, { name: 'LevelSelect' }],
            });
          }}
        >
          <View style={styles.completionInner}>
            <CogsAvatar size="large" state="online" />
            <Text style={[styles.completionText, { maxWidth: 300 }]}>
              {discipline === 'systems'
                ? 'Config Node. Protocol logic. This is your domain. I expected you would handle it well.'
                : discipline === 'drive'
                ? 'You navigated a Protocol piece. It was not elegant. But it worked. I am noting that.'
                : 'Physics and Protocol in the same machine. That is the Field Operative\'s answer to everything. I am beginning to understand the choice.'}
            </Text>
            <Text style={{ fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.dim, letterSpacing: 3, marginTop: Spacing.xl }}>
              TAP TO CONTINUE
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── A1-8 Completion Scene ── */}
      {showCompletionScene && (
        <View style={styles.completionScene}>
          <View style={styles.completionInner}>
            <CogsAvatar size="medium" state="online" />
            <Text style={styles.completionText}>{completionText}</Text>
          </View>
        </View>
      )}

      {/* ── Pause Modal ── */}
      {showPauseModal && (
        <View style={styles.pauseDim}>
          <View style={styles.pauseCard}>
            {/* HUD corner brackets */}
            <View style={[styles.pauseCorner, { top: 6, left: 6, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderTopLeftRadius: 3 }]} />
            <View style={[styles.pauseCorner, { top: 6, right: 6, borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 3 }]} />
            <View style={[styles.pauseCorner, { bottom: 6, left: 6, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderBottomLeftRadius: 3 }]} />
            <View style={[styles.pauseCorner, { bottom: 6, right: 6, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 3 }]} />

            {!showAbandonConfirm ? (
              <>
                <Text style={styles.pauseLabel}>MISSION PAUSED</Text>
                <Text style={styles.pauseLevelName}>
                  {level.id} {(level.systemRepaired ?? level.name).toUpperCase()}
                </Text>

                <View style={styles.pauseTimerWrap}>
                  <Text style={styles.pauseTimerBig}>{formatMMSS(elapsedSeconds)}</Text>
                  <Text style={styles.pauseTimerLabel}>ELAPSED</Text>
                </View>

                <Button
                  variant="primary"
                  label="RESUME"
                  onPress={() => setShowPauseModal(false)}
                  style={styles.pauseModalBtn}
                />

                <Button
                  variant="secondary"
                  label="RESTART LEVEL"
                  onPress={() => {
                    handleReset();
                    setShowPauseModal(false);
                  }}
                  style={styles.pauseModalBtn}
                />

                <Button
                  variant="danger"
                  label="ABANDON MISSION"
                  onPress={() => setShowAbandonConfirm(true)}
                  style={styles.pauseModalBtnLast}
                />
              </>
            ) : (
              <>
                <Text style={styles.pauseLabel}>CONFIRM ABANDON</Text>
                <Text style={[styles.pauseAbandonWarn, { marginTop: 16 }]}>
                  Abandoning this mission will cost 1 life.
                </Text>
                <Text style={styles.pauseAbandonSub}>This cannot be undone.</Text>

                <View style={styles.pauseConfirmRow}>
                  <TouchableOpacity
                    style={styles.pauseCancelBtn}
                    onPress={() => setShowAbandonConfirm(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.pauseCancelText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pauseConfirmBtn}
                    onPress={() => {
                      // Lives store: lives <= 1 means about to hit 0
                      if (lives <= 1) {
                        loseLife();
                        setShowAbandonConfirm(false);
                        setShowPauseModal(false);
                        setShowOutOfLives(true);
                      } else {
                        loseLife();
                        setShowAbandonConfirm(false);
                        setShowPauseModal(false);
                        navigation.pop(2);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.pauseConfirmText}>CONFIRM ABANDON</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </>
  );
}

const GameplayModals = React.memo(GameplayModalsImpl);
export default GameplayModals;

const styles = StyleSheet.create({
  // Pause modal
  pauseDim: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,6,18,0.88)',
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseCard: {
    width: screenWidth - 48,
    backgroundColor: 'rgba(4,8,20,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  pauseCorner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: 'rgba(0,212,255,0.35)',
  },
  pauseLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#00D4FF',
    opacity: 0.6,
    letterSpacing: 2,
  },
  pauseLevelName: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: '#E8F4FF',
    marginTop: 4,
    letterSpacing: 1,
  },
  pauseTimerWrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  pauseTimerBig: {
    fontFamily: Fonts.spaceMono,
    fontSize: 28,
    fontWeight: '300',
    color: '#E8F4FF',
  },
  pauseTimerLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: '#00D4FF',
    opacity: 0.5,
    letterSpacing: 2,
    marginTop: 4,
  },
  pauseModalBtn: {
    width: '100%',
    marginBottom: 10,
  },
  pauseModalBtnLast: {
    width: '100%',
  },
  pauseAbandonWarn: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: '#FF3B3B',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 6,
  },
  pauseAbandonSub: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#B0CCE8',
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 20,
  },
  pauseConfirmRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  pauseCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pauseCancelText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
  },
  pauseConfirmBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,59,59,0.4)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pauseConfirmText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: '#FF3B3B',
    letterSpacing: 1.5,
  },

  // Overlays
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  voidOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  overlayContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    width: '100%',
  },

  // System restored
  systemRestoredText: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.display,
    fontWeight: 'bold',
    color: Colors.green,
    textAlign: 'center',
    letterSpacing: 4,
    lineHeight: 44,
  },

  // Score strip
  scoreStrip: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(10,18,30,0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.1)',
    overflow: 'hidden',
  },
  scoreCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  scoreCellVal: {
    fontFamily: Fonts.orbitron,
    fontSize: 11,
    fontWeight: 'bold',
  },
  scoreCellLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 5,
    color: Colors.dim,
    letterSpacing: 0.5,
  },

  // Forfeiture notice
  forfeitedNotice: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: 'rgba(224,85,85,0.8)',
    letterSpacing: 2,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },

  // Completion CONTINUE wrappers
  completionContinueWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 48,
    paddingHorizontal: 20,
    zIndex: 250,
  },
  completionCardWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(2,5,12,0.88)',
    zIndex: 250,
  },
  completionContinueBtn: {
    alignSelf: 'center',
  },

  // Wrong Output Modal
  wrongOutputCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: 'rgba(6,9,15,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    padding: 20,
  },
  wrongOutputTitle: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.lg,
    color: '#EF4444',
    letterSpacing: 3,
    marginBottom: 16,
    textAlign: 'center',
  },
  wrongOutputSection: {
    marginBottom: 12,
  },
  wrongOutputLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  wrongOutputRow: {
    flexDirection: 'row',
    gap: 4,
  },
  wrongOutputCell: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1A3050',
    backgroundColor: '#08101C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrongOutputCellMismatch: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  wrongOutputCellText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 12,
    color: Colors.neonCyan,
  },
  wrongOutputCogsText: {
    fontFamily: Fonts.exo2,
    fontSize: 13,
    color: '#B0CCE8',
    lineHeight: 18,
    flex: 1,
    fontStyle: 'italic',
  },
  wrongOutputRetryBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.amber,
    borderRadius: 4,
  },
  wrongOutputRetryText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 12,
    color: Colors.amber,
    letterSpacing: 3,
  },

  // Results
  starsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  resultsTitle: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.xxl, fontWeight: 'bold',
    color: Colors.amber, letterSpacing: 3, marginBottom: Spacing.sm,
  },
  resultsLevel: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.sm, color: Colors.muted,
    marginBottom: Spacing.xl,
  },
  cogsResultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  resultsQuote: {
    flex: 1,
    fontFamily: Fonts.exo2, fontSize: FontSizes.sm, color: Colors.muted,
    fontStyle: 'italic', lineHeight: 18,
  },
  resultsActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },

  // Void state
  voidTitle: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.display, fontWeight: 'bold',
    color: Colors.red, letterSpacing: 4, marginBottom: Spacing.sm,
  },
  voidSubtext: {
    fontFamily: Fonts.exo2, fontSize: FontSizes.md, color: Colors.muted,
    marginBottom: Spacing.xl,
  },
  voidQuote: {
    flex: 1,
    fontFamily: Fonts.exo2, fontSize: FontSizes.sm, color: Colors.muted,
    fontStyle: 'italic', lineHeight: 18,
  },
  voidActions: {
    gap: Spacing.sm,
    width: '100%',
  },
  voidBtn: {
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  voidBtnText: {
    fontFamily: Fonts.orbitron, fontSize: 10, color: Colors.red, letterSpacing: 1,
  },

  // A1-8 Completion scene
  completionScene: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.void,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  completionInner: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.xl,
  },
  completionText: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.lg,
    color: Colors.starWhite,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 28,
  },

  // Insufficient pulses
  insufficientSubtext: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  pulseResultsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 8,
  },
  pulseResultCell: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseResultPass: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  pulseResultFail: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  pulseResultText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 1,
  },
  pulseResultIcon: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    letterSpacing: 1,
    marginTop: 2,
  },
});
