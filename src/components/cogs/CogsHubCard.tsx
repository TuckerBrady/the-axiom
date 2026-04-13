import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { CogsEyeColor } from '../../constants/cogsEyeColors';
import { COGS_EYE_COLORS } from '../../constants/cogsEyeColors';
import CogsRobotAvatar from './CogsRobotAvatar';
import { Fonts } from '../../theme/tokens';

interface Props {
  color: CogsEyeColor;
  name?: string;
  role?: string;
  cta: string;
  body: string;
  onPress: () => void;
}

/**
 * COGS Hub message card (DECISION-07). Color-driven by eye state.
 * Used for mission guidance (amber) and bounty transmissions (blue).
 */
export default function CogsHubCard({
  color,
  name = 'C.O.G.S Unit 7',
  role = 'AI Companion',
  cta,
  body,
  onPress,
}: Props) {
  const c = COGS_EYE_COLORS[color];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`COGS Unit 7 message. ${body}. Tap to ${cta}.`}
      style={({ pressed }) => [
        st.card,
        { borderColor: c.border, backgroundColor: c.dim },
        pressed && { opacity: 0.85 },
      ]}
    >
      {/* Left accent bar */}
      <View style={[st.accentBar, { backgroundColor: c.solid }]} />

      {/* Header row */}
      <View style={st.header}>
        <CogsRobotAvatar color={color} size={30} />
        <View style={st.meta}>
          <Text style={[st.name, { color: c.solid }]}>{name.toUpperCase()}</Text>
          <Text style={st.role}>{role.toUpperCase()}</Text>
        </View>
        <Text style={[st.cta, { color: c.solid }]}>{cta}</Text>
      </View>

      {/* Body text */}
      <Text style={st.body}>{body}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 13,
    paddingLeft: 16, // room for accent bar
    position: 'relative',
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 9,
    borderBottomLeftRadius: 9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 6,
  },
  meta: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  role: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.3)',
  },
  cta: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 1.1,
    flexShrink: 0,
  },
  body: {
    fontFamily: Fonts.spaceMono,
    fontSize: 12,
    lineHeight: 18.6,
    color: 'rgba(255,255,255,0.74)',
  },
});
