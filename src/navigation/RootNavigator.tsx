import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LaunchScreen from '../screens/LaunchScreen';
import LevelSelectScreen from '../screens/LevelSelectScreen';
import GameplayScreen from '../screens/GameplayScreen';
import StoreScreen from '../screens/StoreScreen';
import MissionDossierScreen from '../screens/MissionDossierScreen';
import DailyRewardScreen from '../screens/DailyRewardScreen';
import ReturnBriefScreen from '../screens/ReturnBriefScreen';
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
import { usePlayerStore } from '../store/playerStore';
import { useChallengeStore } from '../store/challengeStore';

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
  ReturnBrief: undefined;
  DailyReward: undefined;
  Tabs: undefined;
  Launch: undefined;
  LevelSelect: undefined;
  MissionDossier: {
    missionId: number;
    missionName: string;
    iconType: string;
    stars: number;
    bestTime: string;
    piecesUsed: number;
    cogsQuote: string;
    levelId: string | undefined;
    nodeState: 'completed' | 'active' | 'unplayed' | 'locked';
  };
  Gameplay: undefined;
  Store: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const ONBOARDING_KEY = '@axiom_onboarding_complete';
const DAILY_REWARD_KEY = '@axiom_last_daily_reward_date';
const SESSION_KEY = 'axiom_last_session';

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<'Boot' | 'ReturnBrief' | 'DailyReward' | 'Tabs' | null>(null);

  // ── Session tracking: write timestamp when app goes to background ──
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        AsyncStorage.setItem(SESSION_KEY, Date.now().toString());
      }
    });
    return () => sub.remove();
  }, []);

  // ── Hydrate stores from AsyncStorage ──
  useEffect(() => {
    usePlayerStore.getState().hydrate();
    useChallengeStore.getState().loadOrGenerateChallenge();
  }, []);

  // ── Determine initial route ──
  useEffect(() => {
    (async () => {
      try {
        const onboarded = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (onboarded !== 'true') {
          setInitialRoute('Boot');
          return;
        }

        // Check if this is a return visit (session key exists)
        const lastSession = await AsyncStorage.getItem(SESSION_KEY);

        // Check daily reward
        const lastReward = await AsyncStorage.getItem(DAILY_REWARD_KEY);
        const needsReward = lastReward !== getTodayString();
        if (needsReward) {
          await AsyncStorage.setItem(DAILY_REWARD_KEY, getTodayString());
        }

        if (lastSession) {
          // Returning player → show return brief (it navigates to Tabs on dismiss)
          setInitialRoute('ReturnBrief');
        } else if (needsReward) {
          setInitialRoute('DailyReward');
        } else {
          setInitialRoute('Tabs');
        }
      } catch {
        setInitialRoute('Boot');
      }
    })();
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
        screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#06090f' } }}
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
        <Stack.Screen name="ReturnBrief" component={ReturnBriefScreen} />
        <Stack.Screen name="DailyReward" component={DailyRewardScreen} />
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Launch" component={LaunchScreen} />
        <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
        <Stack.Screen
          name="MissionDossier"
          component={MissionDossierScreen}
          options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }}
        />
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
