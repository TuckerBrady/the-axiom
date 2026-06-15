import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LevelDefinition, OutputTapeValue } from '../game/types';
import type { ScoreResult } from '../game/scoring';

export type WrongOutputData = {
  expected: OutputTapeValue[];
  produced: OutputTapeValue[];
} | null;

export type PulseResultData = {
  results: boolean[];
  required: number;
  achieved: number;
} | null;

// SE-TM-031a — MAY bonus surfaced on the results card. credits is the total
// bonus CR awarded; metDescriptions are the [PROPOSED] condition lines that
// were satisfied. null when no MAY condition was met (or the level has none).
export type MayBonusData = {
  credits: number;
  metDescriptions: string[];
} | null;

export interface UseGameplayModalsResult {
  showPauseModal: boolean;
  setShowPauseModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAbandonConfirm: boolean;
  setShowAbandonConfirm: React.Dispatch<React.SetStateAction<boolean>>;

  showVoid: boolean;
  setShowVoid: React.Dispatch<React.SetStateAction<boolean>>;

  showResults: boolean;
  setShowResults: React.Dispatch<React.SetStateAction<boolean>>;

  showCompletionCard: boolean;
  setShowCompletionCard: React.Dispatch<React.SetStateAction<boolean>>;

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
  setShowSystemRestored: React.Dispatch<React.SetStateAction<string | null>>;

  showCompletionScene: boolean;
  setShowCompletionScene: React.Dispatch<React.SetStateAction<boolean>>;
  completionText: string;
  setCompletionText: React.Dispatch<React.SetStateAction<string>>;

  showDisciplineCard: boolean;
  setShowDisciplineCard: React.Dispatch<React.SetStateAction<boolean>>;

  showTeachCard: string[] | null;
  setShowTeachCard: React.Dispatch<React.SetStateAction<string[] | null>>;

  // SE-TM-030 — Spec Sheet panel visibility, and the one-time A1-1 activation
  // hook (COGS line pointing at the revived info icon).
  showSpecSheet: boolean;
  setShowSpecSheet: React.Dispatch<React.SetStateAction<boolean>>;
  showSpecSheetHook: boolean;
  setShowSpecSheetHook: React.Dispatch<React.SetStateAction<boolean>>;

  scoreResult: ScoreResult | null;
  setScoreResult: React.Dispatch<React.SetStateAction<ScoreResult | null>>;
  cogsScoreComment: string;
  setCogsScoreComment: React.Dispatch<React.SetStateAction<string>>;
  firstTimeBonus: boolean;
  setFirstTimeBonus: React.Dispatch<React.SetStateAction<boolean>>;
  elaborationMult: number;
  setElaborationMult: React.Dispatch<React.SetStateAction<number>>;
  mayBonus: MayBonusData;
  setMayBonus: React.Dispatch<React.SetStateAction<MayBonusData>>;

  anyModalOpen: boolean;
}

export function useGameplayModals(
  level: LevelDefinition | null,
): UseGameplayModalsResult {
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [showVoid, setShowVoid] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showCompletionCard, setShowCompletionCard] = useState(false);
  const [showWrongOutput, setShowWrongOutput] = useState(false);
  const [wrongOutputData, setWrongOutputData] = useState<WrongOutputData>(null);
  const [showInsufficientPulses, setShowInsufficientPulses] = useState(false);
  const [pulseResultData, setPulseResultData] = useState<PulseResultData>(null);
  const [showOutOfLives, setShowOutOfLives] = useState(false);
  const [showEconomyIntro, setShowEconomyIntro] = useState(false);
  const [showSystemRestored, setShowSystemRestored] = useState<string | null>(null);
  const [showCompletionScene, setShowCompletionScene] = useState(false);
  const [completionText, setCompletionText] = useState('');
  const [showDisciplineCard, setShowDisciplineCard] = useState(false);
  const [showTeachCard, setShowTeachCard] = useState<string[] | null>(null);

  const [showSpecSheet, setShowSpecSheet] = useState(false);
  const [showSpecSheetHook, setShowSpecSheetHook] = useState(false);

  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [cogsScoreComment, setCogsScoreComment] = useState('');
  const [firstTimeBonus, setFirstTimeBonus] = useState(false);
  const [elaborationMult, setElaborationMult] = useState(1);
  const [mayBonus, setMayBonus] = useState<MayBonusData>(null);

  // Economy intro on first non-Axiom level (moved from GameplayScreen).
  useEffect(() => {
    if (!level || level.sector === 'axiom') return;
    AsyncStorage.getItem('axiom_economy_intro_seen').then(seen => {
      if (!seen) setShowEconomyIntro(true);
    });
  }, [level?.id]);

  // SE-TM-033 — Spec Sheet activation hook. The first time the player loads
  // A1-1, COGS speaks the one-time line that points at the (revived) info icon.
  // Framed as routing a feed that was always on file, not new instrumentation.
  // Monotonic seen-flag, mirroring the economy-intro pattern above.
  useEffect(() => {
    if (!level || level.id !== 'A1-1') return;
    AsyncStorage.getItem('axiom_spec_sheet_hook_seen').then(seen => {
      if (!seen) setShowSpecSheetHook(true);
    });
  }, [level?.id]);

  const anyModalOpen =
    showPauseModal ||
    showVoid ||
    showResults ||
    showWrongOutput ||
    showInsufficientPulses ||
    showOutOfLives ||
    showEconomyIntro ||
    showCompletionCard;

  return {
    showPauseModal, setShowPauseModal,
    showAbandonConfirm, setShowAbandonConfirm,
    showVoid, setShowVoid,
    showResults, setShowResults,
    showCompletionCard, setShowCompletionCard,
    showWrongOutput, setShowWrongOutput,
    wrongOutputData, setWrongOutputData,
    showInsufficientPulses, setShowInsufficientPulses,
    pulseResultData, setPulseResultData,
    showOutOfLives, setShowOutOfLives,
    showEconomyIntro, setShowEconomyIntro,
    showSystemRestored, setShowSystemRestored,
    showCompletionScene, setShowCompletionScene,
    completionText, setCompletionText,
    showDisciplineCard, setShowDisciplineCard,
    showTeachCard, setShowTeachCard,
    showSpecSheet, setShowSpecSheet,
    showSpecSheetHook, setShowSpecSheetHook,
    scoreResult, setScoreResult,
    cogsScoreComment, setCogsScoreComment,
    firstTimeBonus, setFirstTimeBonus,
    elaborationMult, setElaborationMult,
    mayBonus, setMayBonus,
    anyModalOpen,
  };
}
