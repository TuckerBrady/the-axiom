import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LaunchScreen from '../screens/LaunchScreen';
import LevelSelectScreen from '../screens/LevelSelectScreen';
import GameplayScreen from '../screens/GameplayScreen';
import StoreScreen from '../screens/StoreScreen';
import TabNavigator from './TabNavigator';

// Onboarding
import BootScreen from '../screens/onboarding/BootScreen';
import DistressScreen from '../screens/onboarding/DistressScreen';
import RepairScreen from '../screens/onboarding/RepairScreen';
import CodexEntryScreen from '../screens/onboarding/CodexEntryScreen';
import IntroductionScreen from '../screens/onboarding/IntroductionScreen';
import CharacterNameScreen from '../screens/onboarding/CharacterNameScreen';
import DisciplineScreen from '../screens/onboarding/DisciplineScreen';
import LoginScreen from '../screens/onboarding/LoginScreen';

import { Colors } from '../theme/tokens';

export type RootStackParamList = {
  // Onboarding
  Boot: undefined;
  Distress: undefined;
  Repair: undefined;
  OnboardingCodexEntry: undefined;
  Introduction: undefined;
  CharacterName: undefined;
  Discipline: undefined;
  Login: undefined;
  // Main app
  Tabs: undefined;
  Launch: undefined;
  LevelSelect: undefined;
  Gameplay: undefined;
  Store: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const ONBOARDING_KEY = '@axiom_onboarding_complete';

export default function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<'Boot' | 'Tabs' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then(val => setInitialRoute(val === 'true' ? 'Tabs' : 'Boot'))
      .catch(() => setInitialRoute('Boot'));
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.void, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.copper} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        {/* ── Onboarding ── */}
        <Stack.Screen name="Boot" component={BootScreen} />
        <Stack.Screen name="Distress" component={DistressScreen} />
        <Stack.Screen name="Repair" component={RepairScreen} />
        <Stack.Screen name="OnboardingCodexEntry" component={CodexEntryScreen} />
        <Stack.Screen name="Introduction" component={IntroductionScreen} />
        <Stack.Screen name="CharacterName" component={CharacterNameScreen} />
        <Stack.Screen name="Discipline" component={DisciplineScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* ── Main app ── */}
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Launch" component={LaunchScreen} />
        <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
        <Stack.Screen
          name="Gameplay"
          component={GameplayScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Store" component={StoreScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
