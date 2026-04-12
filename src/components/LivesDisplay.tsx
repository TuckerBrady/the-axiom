import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '../theme/tokens';

interface Props {
  lives: number;
  maxLives: number;
  regenTimeLeft?: string;
}

/**
 * Reusable lives pip display. Filled pips = remaining lives.
 * Empty pips = lost lives. Optional regen timer below.
 */
export function LivesDisplay({ lives, maxLives, regenTimeLeft }: Props) {
  return (
    <View style={st.container}>
      <View style={st.pips}>
        {Array.from({ length: maxLives }, (_, i) => (
          <View
            key={i}
            style={[
              st.pip,
              i < lives ? st.pipFilled : st.pipEmpty,
            ]}
          />
        ))}
      </View>
      {regenTimeLeft && (
        <Text style={st.timer}>{regenTimeLeft}</Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  pips: {
    flexDirection: 'row',
    gap: 4,
  },
  pip: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pipFilled: {
    backgroundColor: '#c87941',
  },
  pipEmpty: {
    backgroundColor: '#1a2a38',
    borderWidth: 1,
    borderColor: '#2a3c50',
  },
  timer: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: '#6a7f9a',
    letterSpacing: 1,
  },
});
