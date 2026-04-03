import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.btn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d="M15 18L9 12L15 6" stroke="#4a9eff" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
