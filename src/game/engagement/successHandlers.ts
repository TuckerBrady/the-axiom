import type { NavigationProp } from '@react-navigation/native';
import type {
  LevelDefinition,
  ExecutionStep,
  PlacedPiece,
} from '../types';
import type { ScoreResult } from '../scoring';
import type { Discipline } from '../../store/playerStore';
import {
  calculateScore,
  getCOGSScoreComment,
  getTutorialCOGSComment,
} from '../scoring';
import { useProgressionStore } from '../../store/progressionStore';

export interface SuccessParams {
  steps: ExecutionStep[];
  level: LevelDefinition;
  pieces: PlacedPiece[];
  discipline: Discipline;
  engageDurationMs: number;
  lockedElapsed: number;
  levelSpent: number;

  setScoreResult: (r: ScoreResult | null) => void;
  setCogsScoreComment: (c: string) => void;
  setFirstTimeBonus: (b: boolean) => void;
  setElaborationMult: (m: number) => void;
  setFlashColor: (c: string | null) => void;
  setShowSystemRestored: (s: string | null) => void;
  setShowCompletionScene: (b: boolean) => void;
  setCompletionText: (t: string) => void;
  setShowCompletionCard: (b: boolean) => void;

  completeLevel: (id: string, stars: 0 | 1 | 2 | 3) => boolean;
  earnCredits: (amount: number) => void;
  addLivesCredits: (amount: number) => void;
  triggerHints: (trigger: string) => void;

  navigation: NavigationProp<Record<string, object | undefined>>;

  greenColor: string;
}

// Handles the success path through results-card setup. Returns true
// when the function has already routed the player away (A1-8 completion
// scene navigates to 'Tabs'); caller should return early. Returns false
// when the caller should continue with the replay loop.
export async function handleSuccess(params: SuccessParams): Promise<boolean> {
  const {
    steps,
    level,
    pieces,
    discipline,
    engageDurationMs,
    lockedElapsed,
    levelSpent,
    setScoreResult,
    setCogsScoreComment,
    setFirstTimeBonus,
    setElaborationMult,
    setFlashColor,
    setShowSystemRestored,
    setShowCompletionScene,
    setCompletionText,
    setShowCompletionCard,
    completeLevel,
    earnCredits,
    addLivesCredits,
    triggerHints,
    navigation,
    greenColor,
  } = params;

  const currentDiscipline = discipline ?? 'field';
  const result = calculateScore({
    executionSteps: steps,
    placedPieces: pieces,
    optimalPieces: level.optimalPieces,
    trayPieceTypes: level.availablePieces ?? [],
    depthCeiling: level.depthCeiling,
    discipline: currentDiscipline,
    engageDurationMs,
    elapsedSeconds: lockedElapsed,
  });

  const isTutorial = level.sector === 'axiom';
  const displayStars = isTutorial ? 3 : result.stars;
  const displayResult: ScoreResult = isTutorial
    ? { ...result, stars: 3 as 0 | 1 | 2 | 3 }
    : result;
  setScoreResult(displayResult);

  const playerPieceCount = pieces.filter(p => !p.isPrePlaced).length;
  setCogsScoreComment(
    isTutorial
      ? getTutorialCOGSComment(result.total, currentDiscipline)
      : getCOGSScoreComment(result.breakdown, currentDiscipline, result.stars, playerPieceCount, level.optimalPieces),
  );

  const levelId = level.id;
  const starsEarned = displayStars as 0 | 1 | 2 | 3;
  const isFirst = completeLevel(levelId, starsEarned);
  setFirstTimeBonus(isFirst);

  const cappedMult = Math.min(1.0 + (result.breakdown.purchasedTouchedCount * 0.1), 1.5);
  setElaborationMult(cappedMult);
  if (result.stars === 3) earnCredits(Math.floor((levelSpent + 25) * cappedMult));
  else if (result.stars === 2) earnCredits(Math.floor(Math.ceil(levelSpent * 0.5) * cappedMult));
  if (isFirst) {
    earnCredits(25);
    addLivesCredits(25);
  }
  triggerHints('onSuccess');

  setFlashColor(greenColor);
  await new Promise(resolve => setTimeout(resolve, 300));
  setFlashColor(null);

  if (level.systemRepaired) {
    setShowSystemRestored(level.systemRepaired);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setShowSystemRestored(null);
  } else {
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (level.id === 'A1-8' && isFirst) {
    const { getSectorCompletedCount } = useProgressionStore.getState();
    if (getSectorCompletedCount('A1-') >= 8) {
      setShowCompletionScene(true);
      const lines = [
        'The Axiom is fully operational.',
        'For the first time since I can remember.',
        '',
        'You did that.',
        '',
        'I will not say that again.',
      ];
      const delays = [1200, 2400, 3600, 4400, 5200, 5800];
      for (let i = 0; i < lines.length; i++) {
        await new Promise(resolve => setTimeout(resolve, i === 0 ? delays[0] : delays[i] - delays[i - 1]));
        setCompletionText(lines.slice(0, i + 1).join('\n'));
      }
      await new Promise(resolve => setTimeout(resolve, 1200));
      setShowCompletionScene(false);
      useProgressionStore.getState().setActiveSector('2');
      navigation.navigate('Tabs' as never);
      return true;
    }
  }

  setShowCompletionCard(true);
  return false;
}
