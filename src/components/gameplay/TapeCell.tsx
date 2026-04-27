import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
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

// Highlight palette carried forward from the deleted
// tapeCellHighlightRead/Write/GatePass/GateBlock/Departing style
// classes (Prompt 99C, Fix 3). Returning the visual values for the
// overlay rather than baking them into static StyleSheet entries lets
// the overlay fade in/out under a single native-driven Animated.Value.
function colorsForHighlight(h: TapeHighlight): { bg: string; border: string } {
  switch (h) {
    case 'read':
      return { bg: 'rgba(0,229,255,0.18)', border: 'rgba(0,229,255,0.9)' };
    case 'write':
      return { bg: 'rgba(0,229,255,0.22)', border: 'rgba(0,229,255,0.9)' };
    case 'gate-pass':
      return { bg: 'rgba(0,255,135,0.18)', border: 'rgba(0,255,135,0.9)' };
    case 'gate-block':
      return { bg: 'rgba(255,59,59,0.18)', border: 'rgba(255,59,59,0.9)' };
    case 'departing':
      // The pre-99C 'departing' class did `opacity: 0.3` + a faded
      // cyan border on the cell itself. The overlay can't reproduce
      // the cell-level alpha drop without a second animation, so we
      // approximate the "value just lifted off" state by tinting the
      // overlay dark with the same faded cyan border. The cue is
      // brief (~250ms in interactions.ts) and the glow traveler
      // visually leaves the cell during this window — the cell-level
      // dim was a redundant cue.
      return { bg: 'rgba(8,16,28,0.55)', border: 'rgba(0,229,255,0.2)' };
  }
}

const HIGHLIGHT_FADE_IN_MS = 120;
const HIGHLIGHT_FADE_OUT_MS = 180;

// Per-cell memo barrier. When tapeCellHighlights changes, the shell
// re-renders, but only cells whose highlight prop changed will
// actually re-render (clause 4.1.6). The highlight overlay's opacity
// runs on the native thread (PERFORMANCE_CONTRACT 2.1.6).
const TapeCell = React.memo(function TapeCell(props: Props) {
  const { tape, value, highlight, cellRef } = props;
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  // Latch the most recent highlight color so the overlay can keep
  // rendering while it fades out. If we read `highlight` directly,
  // the overlay would unmount the moment the prop becomes null and
  // skip the fade-out entirely.
  const lastColorsRef = useRef<{ bg: string; border: string } | null>(null);

  useEffect(() => {
    if (highlight) {
      lastColorsRef.current = colorsForHighlight(highlight);
      Animated.timing(highlightOpacity, {
        toValue: 1,
        duration: HIGHLIGHT_FADE_IN_MS,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(highlightOpacity, {
        toValue: 0,
        duration: HIGHLIGHT_FADE_OUT_MS,
        useNativeDriver: true,
      }).start();
    }
  }, [highlight, highlightOpacity]);

  const overlayColors = highlight ? colorsForHighlight(highlight) : lastColorsRef.current;
  const overlay = overlayColors ? (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.highlightOverlay,
        {
          backgroundColor: overlayColors.bg,
          borderColor: overlayColors.border,
          opacity: highlightOpacity,
        },
      ]}
    />
  ) : null;

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
          ]}
        >
          {overlay}
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
          ]}
        >
          {overlay}
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
        {overlay}
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
  highlightOverlay: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 3,
    borderWidth: 1,
  },
});
