import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import CodexDetailView, { PieceEntry } from '../../components/CodexDetailView';
import { Colors } from '../../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Introduction'>;
};

const CONVEYOR_ENTRY: PieceEntry = {
  id: 'conveyor',
  name: 'Conveyor',
  type: 'Physics',
  description:
    'Accepts signal from one direction, outputs in the opposite. Cannot change direction on its own — it carries, it does not think. Named for the industrial belt systems that inspired its design. The first piece any Engineer learns to place.',
  cogsNote: 'It moves things forward. A quality I find underrated.',
  firstEncountered: 'Repair Bay — First Contact',
};

export default function CodexEntryScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <CodexDetailView
        entry={CONVEYOR_ENTRY}
        onUnderstood={() => navigation.navigate('Introduction')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
});
