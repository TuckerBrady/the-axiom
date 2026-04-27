import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '../../theme/tokens';
import type { TapeHighlight } from '../../game/engagement';

export type TapeRole = 'in' | 'trail' | 'out';

interface Props {
  value: number | null;
  highlight: TapeHighlight | undefined;
  index: number;
  tape: TapeRole;
  // IN-tape extras
  isActive?: boolean;
  isPast?: boolean;
  isFuture?: boolean;
  isPreBeamNext?: boolean;
  // TRAIL-tape extras
  isHead?: boolean;
  // OUT-tape extras
  gatePassed?: boolean;
  gateBlocked?: boolean;
  hasValue?: boolean;
  written?: number | undefined;
  // Optional ref for the first cell (anchors tutorial measurement)
  cellRef?: React.Ref<View>;
}

function arePropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.value === next.value &&
    prev.highlight === next.highlight &&
    prev.tape === next.tape &&
    prev.index === next.index &&
    prev.isActive === next.isActive &&
    prev.isPast === next.isPast &&
    prev.isFuture === next.isFuture &&
    prev.isPreBeamNext === next.isPreBeamNext &&
    prev.isHead === next.isHead &&
    prev.gatePassed === next.gatePassed &&
    prev.gateBlocked === next.gateBlocked &&
    prev.hasValue === next.hasValue &&
    prev.written === next.written &&
    prev.cellRef === next.cellRef
  );
}

// Per-cell memo barrier. When tapeCellHighlights changes, the shell
// re-renders, but only cells whose highlight prop changed will
// actually re-render (clause 4.1.6).
const TapeCell = React.memo(function TapeCell(props: Props) {
  const { tape, value, highlight, cellRef } = props;
  if (tape === 'in') {
    const { isActive, isPast, isFuture, isPreBeamNext } = props;
    return (
      <View style={styles.tapeCellWrap}>
        <View style={[styles.tapeHead, !(isActive || isPreBeamNext) && { opacity: 0 }]} />
        <View
          ref={cellRef}
          collapsable={false}
          style={[
            styles.tapeCell,
            styles.tapeCellIn,
            isActive && styles.tapeCellInActive,
            isPast && styles.tapeCellPast,
            isFuture && { opacity: 0.55 },
            highlight === 'read' && styles.tapeCellHighlightRead,
            highlight === 'write' && styles.tapeCellHighlightWrite,
            highlight === 'gate-pass' && styles.tapeCellHighlightGatePass,
            highlight === 'gate-block' && styles.tapeCellHighlightGateBlock,
            highlight === 'departing' && styles.tapeCellHighlightDeparting,
          ]}
        >
          <Text
            style={[
              styles.tapeCellText,
              styles.tapeCellTextIn,
              isActive && styles.tapeCellTextInActive,
              isPast && styles.tapeCellTextInPast,
            ]}
          >
            {value}
          </Text>
        </View>
      </View>
    );
  }
  if (tape === 'trail') {
    const { isHead } = props;
    return (
      <View style={styles.tapeCellWrap}>
        <View style={[styles.tapeHead, { opacity: 0 }]} />
        <View
          ref={cellRef}
          collapsable={false}
          style={[
            styles.tapeCell,
            isHead && { borderColor: Colors.neonGreen, backgroundColor: 'rgba(0,255,135,0.08)' },
            highlight === 'read' && styles.tapeCellHighlightRead,
            highlight === 'write' && styles.tapeCellHighlightWrite,
            highlight === 'gate-pass' && styles.tapeCellHighlightGatePass,
            highlight === 'gate-block' && styles.tapeCellHighlightGateBlock,
          ]}
        >
          <Text style={[styles.tapeCellText, { color: Colors.neonGreen }, isHead && { fontWeight: 'bold' as const }, value === null && { opacity: 0.2 }]}>
            {value === null ? '·' : value}
          </Text>
        </View>
      </View>
    );
  }
  // OUT tape
  const { gatePassed, gateBlocked, hasValue, written } = props;
  return (
    <View style={styles.tapeCellWrap}>
      <View style={[styles.tapeHead, { opacity: 0 }]} />
      <View
        ref={cellRef}
        collapsable={false}
        style={[
          styles.tapeCell,
          gatePassed && styles.tapeCellGatePassed,
          gateBlocked && styles.tapeCellGateBlocked,
        ]}
      >
        <Text
          style={[
            styles.tapeCellText,
            gatePassed && styles.tapeCellTextGatePassed,
            gateBlocked && styles.tapeCellTextGateBlocked,
          ]}
        >
          {gatePassed && hasValue
            ? written
            : gateBlocked
              ? '·'
              : '_'}
        </Text>
      </View>
    </View>
  );
}, arePropsEqual);

export default TapeCell;

const styles = StyleSheet.create({
  tapeCellWrap: {
    alignItems: 'center',
  },
  tapeHead: {
    width: 6,
    height: 4,
    backgroundColor: '#8B5CF6',
    marginBottom: 2,
  },
  tapeCell: {
    width: 24,
    height: 24,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#0D1E30',
    backgroundColor: '#08101C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapeCellIn: {},
  tapeCellInActive: {
    borderColor: '#BFFF3F',
    backgroundColor: 'rgba(191,255,63,0.14)',
  },
  tapeCellPast: {
    borderColor: 'rgba(139,92,246,0.3)',
  },
  tapeCellHighlightRead: {
    borderColor: 'rgba(0,229,255,0.9)',
    backgroundColor: 'rgba(0,229,255,0.18)',
  },
  tapeCellHighlightWrite: {
    borderColor: 'rgba(0,229,255,0.9)',
    backgroundColor: 'rgba(0,229,255,0.22)',
  },
  tapeCellHighlightGatePass: {
    borderColor: 'rgba(0,255,135,0.9)',
    backgroundColor: 'rgba(0,255,135,0.18)',
  },
  tapeCellHighlightGateBlock: {
    borderColor: 'rgba(255,59,59,0.9)',
    backgroundColor: 'rgba(255,59,59,0.18)',
  },
  tapeCellHighlightDeparting: {
    opacity: 0.3,
    borderColor: 'rgba(0,229,255,0.2)',
  },
  tapeCellGatePassed: {
    borderColor: '#00FF87',
    backgroundColor: 'rgba(0,255,135,0.14)',
  },
  tapeCellGateBlocked: {
    borderColor: '#FF3B3B',
    backgroundColor: 'rgba(255,59,59,0.14)',
  },
  tapeCellText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: Colors.neonCyan,
  },
  tapeCellTextIn: {
    color: '#BFFF3F',
  },
  tapeCellTextInActive: {
    color: '#BFFF3F',
    fontWeight: 'bold' as const,
  },
  tapeCellTextInPast: {
    color: 'rgba(191,255,63,0.4)',
  },
  tapeCellTextGatePassed: {
    color: '#00FF87',
  },
  tapeCellTextGateBlocked: {
    color: '#FF3B3B',
  },
});
