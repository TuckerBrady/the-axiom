// SE-TM-033 — A1-1 Spec Sheet activation hook.
//
// The first time the Engineer loads A1-1, COGS points at the (revived) top-right
// info button: the orb highlights it with a pulsing ring and the activation copy
// appears in a dialog box anchored beneath it — rather than a full-screen card.
// One-time; the caller persists the seen-flag on dismiss.
//
// Measures the live button position (delayed measureInWindow, the project's
// standard tutorial-measurement approach) so the ring + dialog land on the icon
// across devices/safe-area insets, with a sensible top-right fallback.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  findNodeHandle,
  UIManager,
} from 'react-native';
import CogsAvatar from '../CogsAvatar';
import { Colors, Fonts } from '../../theme/tokens';

const { width: SCREEN_W } = Dimensions.get('window');

type Layout = { x: number; y: number; width: number; height: number };

interface Props {
  visible: boolean;
  lines: string[];
  // Ref attached to the HUDChrome Spec Sheet button so we can anchor to it.
  targetRef: React.RefObject<View | null>;
  onDismiss: () => void;
}

function SpecSheetHookImpl({ visible, lines, targetRef, onDismiss }: Props) {
  const [layout, setLayout] = useState<Layout | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  // Delayed measure so the HUD has laid out before we read the button frame.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const t = setTimeout(() => {
      const node = targetRef.current;
      if (!node) return;
      const handle = findNodeHandle(node);
      if (handle == null) return;
      UIManager.measureInWindow(handle, (x, y, width, height) => {
        if (cancelled || width < 4 || height < 4) return;
        setLayout({ x, y, width, height });
      });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [visible, targetRef]);

  // Single-host opacity pulse on the ring. JS driver (useNativeDriver: false)
  // to stay clear of the native-driver-across-remount hazard the tutorial
  // overlay documents — the cost is one chrome element for the hook's lifetime.
  useEffect(() => {
    if (!visible) return;
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  if (!visible) return null;

  // Fallback frame: top-right corner if measurement isn't in yet.
  const box: Layout = layout ?? { x: SCREEN_W - 52, y: 44, width: 36, height: 36 };
  const ringPad = 7;
  const ringSize = box.height + ringPad * 2;

  const DIALOG_W = Math.min(300, SCREEN_W - 32);
  const dialogRight = 16;
  const dialogTop = box.y + box.height + 16;
  // Caret offset from the dialog's right edge so it points up at the icon.
  const iconCenterX = box.x + box.width / 2;
  const caretRight = Math.max(
    14,
    Math.min(DIALOG_W - 26, SCREEN_W - dialogRight - iconCenterX - 6),
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Light dim — tap anywhere to dismiss. */}
      <Pressable style={[StyleSheet.absoluteFill, st.dim]} onPress={onDismiss} />

      {/* Pulsing highlight ring on the info button. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: box.x - ringPad,
          top: box.y - ringPad,
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderWidth: 2,
          borderColor: '#00D4FF',
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
          shadowColor: '#00D4FF',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 10,
        }}
      />

      {/* Dialog box anchored beneath the icon. */}
      <View style={[st.dialog, { top: dialogTop, right: dialogRight, width: DIALOG_W }]}>
        <View style={[st.caret, { right: caretRight }]} />
        <View style={st.header}>
          <CogsAvatar size="small" state="online" />
          <Text style={st.headerText}>C.O.G.S</Text>
        </View>
        {lines.map((line, i) => (
          <Text key={i} style={st.line}>{line}</Text>
        ))}
        <TouchableOpacity
          style={st.btn}
          onPress={onDismiss}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss Spec Sheet hint"
        >
          <Text style={st.btnText}>UNDERSTOOD</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const SpecSheetHook = React.memo(SpecSheetHookImpl);
export default SpecSheetHook;

const st = StyleSheet.create({
  dim: {
    backgroundColor: 'rgba(2,5,12,0.55)',
  },
  dialog: {
    position: 'absolute',
    backgroundColor: 'rgba(6,9,18,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.25)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
  },
  caret: {
    position: 'absolute',
    top: -6,
    width: 12,
    height: 12,
    backgroundColor: 'rgba(6,9,18,0.98)',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(0,212,255,0.25)',
    transform: [{ rotate: '45deg' }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  headerText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: '#00D4FF',
    letterSpacing: 2,
  },
  line: {
    fontFamily: Fonts.exo2,
    fontSize: 12.5,
    fontStyle: 'italic',
    color: Colors.starWhite,
    lineHeight: 18,
  },
  btn: {
    alignSelf: 'flex-end',
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.4)',
    borderRadius: 6,
  },
  btnText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#00D4FF',
    letterSpacing: 2,
  },
});
