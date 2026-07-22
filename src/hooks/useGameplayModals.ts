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

// SE-TM-035 — topology SHALL not met. The machine produced the right output
// but its signal path violated a stated board-topology requirement. Drives the
// "specification not met" diagnostic modal.
export type SpecNotMetData = {
  required: number;
  actual: number;
  requirementText: string;
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

  showSpecNotMet: boolean;
  setShowSpecNotMet: React.Dispatch<React.SetStateAction<boolean>>;
  specNotMetData: SpecNotMetData;
  setSpecNotMetData: React.Dispatch<React.SetStateAction<SpecNotMetData>>;

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
  const [showSpecNotMet, setShowSpecNotMet] = useState(false);
  const [specNotMetData, setSpecNotMetData] = useState<SpecNotMetData>(null);
  const [showOutOfLives, setShowOutOfLives] = useState(false);
  const [showEconomyIntro, setShowEconomyIntro] = useState(false);
  const [showSystemRestored, setShowSystemRestored] = useState<string | null>(null);
  const [showCompletionScene, setShowCompletionScene] = useState(false);
  const [completionText, setCompletionText] = useState('');
  const [showDisciplineCard, setShowDisciplineCard] = useState(false);
  const [showTeachCard, setShowTeachCard] = useState<string[] | null>(null);

  const [showSpecSheet, setShowSpecSheet] = useState(false);

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

  // SE-TM-033 — the Spec Sheet introduction is now the final A1-1 tutorial step
  // (targetRef 'specSheetBtn' in levels.ts), not a standalone hook. The old
  // one-time card and its seen-flag are retired.

  const anyModalOpen =
    showPauseModal ||
    showVoid ||
    showResults ||
    showWrongOutput ||
    showInsufficientPulses ||
    showSpecNotMet ||
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
    showSpecNotMet, setShowSpecNotMet,
    specNotMetData, setSpecNotMetData,
    showOutOfLives, setShowOutOfLives,
    showEconomyIntro, setShowEconomyIntro,
    showSystemRestored, setShowSystemRestored,
    showCompletionScene, setShowCompletionScene,
    completionText, setCompletionText,
    showDisciplineCard, setShowDisciplineCard,
    showTeachCard, setShowTeachCard,
    showSpecSheet, setShowSpecSheet,
    scoreResult, setScoreResult,
    cogsScoreComment, setCogsScoreComment,
    firstTimeBonus, setFirstTimeBonus,
    elaborationMult, setElaborationMult,
    mayBonus, setMayBonus,
    anyModalOpen,
  };
}
