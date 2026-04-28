import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Animated as RNAnimated, View } from 'react-native';
import type { LevelDefinition } from '../game/types';
import {
  TAPE_BAR_INITIAL,
  GLOW_TRAVELER_INITIAL,
  resetGlowTraveler,
  type TapeHighlight,
  type TapeIndicatorBarState,
  type GlowTravelerState,
  type GateOutcomeMap,
  type ValueTravelRefs,
} from '../game/engagement';

export interface UseGameplayTapeResult {
  visualTrailOverride: (number | null)[] | null;
  visualOutputOverride: number[] | null;
  tapeCellHighlights: Map<string, TapeHighlight>;
  tapeBarState: TapeIndicatorBarState;
  glowTravelerState: GlowTravelerState;
  glowTravelerX: RNAnimated.Value;
  glowTravelerY: RNAnimated.Value;
  glowTravelerScale: RNAnimated.Value;
  glowTravelerOpacity: RNAnimated.Value;
  inputTapeCellsRef: React.RefObject<View | null>;
  dataTrailCellsRef: React.RefObject<View | null>;
  outputTapeCellsRef: React.RefObject<View | null>;
  gateOutcomesRef: React.MutableRefObject<GateOutcomeMap>;
  tapeSetters: {
    setTapeCellHighlights: Dispatch<SetStateAction<Map<string, TapeHighlight>>>;
    setTapeBarState: Dispatch<SetStateAction<TapeIndicatorBarState>>;
    setGlowTravelerState: Dispatch<SetStateAction<GlowTravelerState>>;
    setVisualTrailOverride: Dispatch<SetStateAction<(number | null)[] | null>>;
    setVisualOutputOverride: Dispatch<SetStateAction<number[] | null>>;
  };
  valueTravelRefs: ValueTravelRefs;
  resetTape: () => void;
}

export function useGameplayTape(
  _level: LevelDefinition | null,
): UseGameplayTapeResult {
  const [visualTrailOverride, setVisualTrailOverride] = useState<(number | null)[] | null>(null);
  const [visualOutputOverride, setVisualOutputOverride] = useState<number[] | null>(null);
  const [tapeCellHighlights, setTapeCellHighlights] = useState<Map<string, TapeHighlight>>(new Map());
  const [tapeBarState, setTapeBarState] = useState<TapeIndicatorBarState>(TAPE_BAR_INITIAL);
  const [glowTravelerState, setGlowTravelerState] = useState<GlowTravelerState>(GLOW_TRAVELER_INITIAL);

  const glowTravelerX = useRef(new RNAnimated.Value(0)).current;
  const glowTravelerY = useRef(new RNAnimated.Value(0)).current;
  const glowTravelerScale = useRef(new RNAnimated.Value(1)).current;
  const glowTravelerOpacity = useRef(new RNAnimated.Value(0)).current;

  const inputTapeCellsRef = useRef<View>(null);
  const dataTrailCellsRef = useRef<View>(null);
  const outputTapeCellsRef = useRef<View>(null);
  const gateOutcomesRef = useRef<GateOutcomeMap>(new Map());

  const resetTape = useCallback(() => {
    setTapeCellHighlights(new Map());
    setTapeBarState(TAPE_BAR_INITIAL);
    resetGlowTraveler({ x: glowTravelerX, y: glowTravelerY, scale: glowTravelerScale, opacity: glowTravelerOpacity });
    setGlowTravelerState(GLOW_TRAVELER_INITIAL);
    gateOutcomesRef.current.clear();
    setVisualTrailOverride(null);
    setVisualOutputOverride(null);
  }, [glowTravelerX, glowTravelerY, glowTravelerScale, glowTravelerOpacity]);

  const tapeSetters = {
    setTapeCellHighlights,
    setTapeBarState,
    setGlowTravelerState,
    setVisualTrailOverride,
    setVisualOutputOverride,
  };

  const valueTravelRefs: ValueTravelRefs = {
    x: glowTravelerX,
    y: glowTravelerY,
    scale: glowTravelerScale,
    opacity: glowTravelerOpacity,
  };

  return {
    visualTrailOverride,
    visualOutputOverride,
    tapeCellHighlights,
    tapeBarState,
    glowTravelerState,
    glowTravelerX,
    glowTravelerY,
    glowTravelerScale,
    glowTravelerOpacity,
    inputTapeCellsRef,
    dataTrailCellsRef,
    outputTapeCellsRef,
    gateOutcomesRef,
    tapeSetters,
    valueTravelRefs,
    resetTape,
  };
}
