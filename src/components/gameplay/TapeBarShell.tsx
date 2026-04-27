import React from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import TapeCell from './TapeCell';
import { Colors, Fonts, Spacing } from '../../theme/tokens';
import type { TapeHighlight, TapeIndicatorBarState, GateOutcome, SignalPhase } from '../../game/engagement';

interface Props {
  // Tape data
  inputTape: number[] | undefined;
  trailCells: (0 | 1 | null)[];
  trailHeadPosition: number;
  outputTape?: number[];
  expectedOutput?: number[];
  hasOutTape: boolean;
  // Visual overrides for progressive reveal
  visualTrailOverride: (number | null)[] | null;
  visualOutputOverride: number[] | null;
  // Per-cell highlights
  tapeCellHighlights: Map<string, TapeHighlight>;
  tapeBarState: TapeIndicatorBarState;
  gateOutcomesByIndex: Map<number, GateOutcome>;
  // Beam phase / pulse marker
  beamPhase: SignalPhase;
  currentPulseIndex: number;
  // Refs the tutorial overlay measures
  inputTapeRowRef: React.Ref<View>;
  outputTapeRowRef: React.Ref<View>;
  dataTrailRowRef: React.Ref<View>;
  inputTapeCellsRef: React.Ref<View>;
  dataTrailCellsRef: React.Ref<View>;
  outputTapeCellsRef: React.Ref<View>;
  // Optional pulse target row
  requiredTerminalCount?: number;
  showPulseTarget: boolean;
}

// React.memo with default shallow compare. Re-renders whenever the
// tapeCellHighlights Map identity changes (the only allowed driver
// per clause 4.1.6). Per-cell short-circuit lives in TapeCell.
function TapeBarShellComponent({
  inputTape,
  trailCells,
  trailHeadPosition,
  outputTape,
  hasOutTape,
  visualTrailOverride,
  visualOutputOverride,
  tapeCellHighlights,
  tapeBarState,
  gateOutcomesByIndex,
  beamPhase,
  currentPulseIndex,
  inputTapeRowRef,
  outputTapeRowRef,
  dataTrailRowRef,
  inputTapeCellsRef,
  dataTrailCellsRef,
  outputTapeCellsRef,
  requiredTerminalCount,
  showPulseTarget,
}: Props) {
  const hasInputTape = !!inputTape && inputTape.length > 0;
  return (
    <View collapsable={false} style={styles.tapeSection}>
      {hasInputTape && (
      <View ref={inputTapeRowRef} collapsable={false} style={styles.tapeRow}>
        <Text style={styles.tapeLabel} numberOfLines={1}>IN</Text>
        {tapeBarState.inIndex !== null && (
          <RNAnimated.View
            style={[
              styles.tapeIndicatorBar,
              {
                backgroundColor: Colors.tapeInBar,
                transform: [{ translateX: tapeBarState.inIndex * (24 + 3) }],
                shadowColor: Colors.tapeInBar,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 12,
              },
            ]}
          />
        )}
        <View style={styles.tapeCells}>
          {inputTape!.map((bit, i) => {
            const isActive = beamPhase === 'beam' && i === currentPulseIndex;
            const isPast = beamPhase === 'beam' && i < currentPulseIndex;
            const isFuture = beamPhase === 'beam' && i > currentPulseIndex;
            const isPreBeamNext =
              (beamPhase === 'idle' || beamPhase === 'charge') && i === 0;
            const highlight = tapeCellHighlights.get(`in-${i}`);
            return (
              <TapeCell
                key={`in-${i}`}
                tape="in"
                index={i}
                value={bit}
                highlight={highlight}
                isActive={isActive}
                isPast={isPast}
                isFuture={isFuture}
                isPreBeamNext={isPreBeamNext}
                cellRef={i === 0 ? inputTapeCellsRef : undefined}
              />
            );
          })}
        </View>
      </View>
      )}
      {trailCells.length > 0 && (
        <View ref={dataTrailRowRef} collapsable={false} style={styles.tapeRow}>
          <Text style={styles.tapeLabel} numberOfLines={1}>TRAIL</Text>
          {tapeBarState.trailIndex !== null && (
            <RNAnimated.View
              style={[
                styles.tapeIndicatorBar,
                {
                  backgroundColor: Colors.tapeTrailBar,
                  transform: [{ translateX: tapeBarState.trailIndex * (24 + 3) }],
                  shadowColor: Colors.tapeTrailBar,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 12,
                },
              ]}
            />
          )}
          <View style={styles.tapeCells}>
            {trailCells.map((rawCell, i) => {
              const cell = visualTrailOverride ? visualTrailOverride[i] : rawCell;
              const isHead = i === trailHeadPosition;
              const highlight = tapeCellHighlights.get(`trail-${i}`);
              return (
                <TapeCell
                  key={`trail-${i}`}
                  tape="trail"
                  index={i}
                  value={cell}
                  highlight={highlight}
                  isHead={isHead}
                  cellRef={i === 0 ? dataTrailCellsRef : undefined}
                />
              );
            })}
          </View>
        </View>
      )}
      {hasOutTape && hasInputTape && (
        <View ref={outputTapeRowRef} collapsable={false} style={styles.tapeRow}>
          <Text style={styles.tapeLabel} numberOfLines={1}>OUT</Text>
          {tapeBarState.outIndex !== null && (
            <RNAnimated.View
              style={[
                styles.tapeIndicatorBar,
                {
                  backgroundColor: Colors.tapeOutBar,
                  transform: [{ translateX: tapeBarState.outIndex * (24 + 3) }],
                  shadowColor: Colors.tapeOutBar,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 12,
                },
              ]}
            />
          )}
          <View style={styles.tapeCells}>
            {inputTape!.map((_, i) => {
              const rawWritten = visualOutputOverride
                ? visualOutputOverride[i]
                : outputTape?.[i];
              const written = rawWritten;
              const isBlocked = rawWritten === -2;
              const hasValue =
                written !== undefined && written !== -1 && written !== -2;
              const outcome = gateOutcomesByIndex.get(i);
              const gatePassed = outcome === 'passed';
              const gateBlocked = outcome === 'blocked' || isBlocked;
              return (
                <TapeCell
                  key={`out-${i}`}
                  tape="out"
                  index={i}
                  value={null}
                  highlight={undefined}
                  gatePassed={gatePassed}
                  gateBlocked={gateBlocked}
                  hasValue={hasValue}
                  written={written ?? undefined}
                  cellRef={i === 0 ? outputTapeCellsRef : undefined}
                />
              );
            })}
          </View>
        </View>
      )}
      {showPulseTarget && hasInputTape && requiredTerminalCount && requiredTerminalCount > 1 && (
        <View style={styles.pulseTargetRow}>
          <Text style={styles.pulseTargetText}>
            TARGET: {requiredTerminalCount} OF {inputTape!.length} PULSES MUST REACH TERMINAL
          </Text>
        </View>
      )}
    </View>
  );
}

export default React.memo(TapeBarShellComponent);

const styles = StyleSheet.create({
  tapeSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
    flexShrink: 0,
  },
  tapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tapeIndicatorBar: {
    position: 'absolute',
    top: -2,
    left: 42 + 8,
    width: 24,
    height: 6,
    borderRadius: 3,
    zIndex: 2,
    elevation: 2,
  },
  tapeLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
    width: 42,
  },
  tapeCells: {
    flexDirection: 'row',
    gap: 3,
  },
  pulseTargetRow: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
  },
  pulseTargetText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.amber,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
});
