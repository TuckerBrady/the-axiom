import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Orbitron_400Regular,
  Orbitron_700Bold,
} from '@expo-google-fonts/orbitron';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono';
import {
  Exo2_400Regular,
  Exo2_700Bold,
} from '@expo-google-fonts/exo-2';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    Orbitron: Orbitron_400Regular,
    'Orbitron-Bold': Orbitron_700Bold,
    'Space Mono': SpaceMono_400Regular,
    'Space Mono Bold': SpaceMono_700Bold,
    'Exo 2': Exo2_400Regular,
    'Exo 2 Bold': Exo2_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#06090f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#c87941" />
      </View>
    );
  }

  return <RootNavigator />;
}
