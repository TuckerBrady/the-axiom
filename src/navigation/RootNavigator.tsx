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
import DailyChallengeDossierScreen from '../screens/DailyChallengeDossierScreen';
import TabNavigator from './TabNavigator';

// Onboarding
import BootScreen from '../screens/onboarding/BootScreen';
import DistressScreen from '../screens/onboarding/DistressScreen';
import RepairScreen from '../screens/onboarding/RepairScreen';
import IntroductionScreen from '../screens/onboarding/IntroductionScreen';
import CharacterNameScreen from '../screens/onboarding/CharacterNameScreen';
import DisciplineScreen from '../screens/onboarding/DisciplineScreen';
import LoginScreen from '../screens/onboarding/LoginScreen';

import PieceSandboxScreen from '../screens/dev/PieceSandboxScreen';
import { Colors } from '../theme/tokens';
import { useLivesStore } from '../store/livesStore';
import { usePlayerStore } from '../store/playerStore';
import { useChallengeStore } from '../store/challengeStore';
import { useProgressionStore } from '../store/progressionStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCodexStore } from '../store/codexStore';
import { resolveInitialRoute, SESSION_KEY } from './resolveInitialRoute';

export type RootStackParamList = {
  // Onboarding
  Boot: undefined;
  Distress: undefined;
  Repair: undefined;
  Introduction: undefined;
  CharacterName: undefined;
  Discipline: undefined;
  Login: undefined;
  // Main app
  ReturnBrief: undefined;
  DailyReward: { fromReturningSession?: boolean } | undefined;
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
  DailyChallengeDossier: undefined;
  Gameplay: undefined;
  Store: undefined;
  PieceSandbox: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();


export default function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<'Boot' | 'ReturnBrief' | 'DailyReward' | 'Tabs' | null>(null);
  // When DailyReward is the initial route, this records whether the user was
  // a returning session at app launch. The screen uses this to pick its
  // post-collect destination (ReturnBrief vs Tabs).
  const [dailyRewardReturningSession, setDailyRewardReturningSession] = useState(false);

  // ── Session tracking: write timestamp when app goes to background ──
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Regenerate lives when app returns to foreground
        useLivesStore.getState().regenerate();
      }
      if (state === 'background' || state === 'inactive') {
        AsyncStorage.setItem(SESSION_KEY, Date.now().toString());
      }
    });
    return () => sub.remove();
  }, []);

  // ── Hydrate stores from AsyncStorage ──
  useEffect(() => {
    usePlayerStore.getState().hydrate();
    useProgressionStore.getState().hydrate();
    useSettingsStore.getState().hydrate();
    useCodexStore.getState().hydrate();
    useChallengeStore.getState().loadOrGenerateChallenge();
  }, []);

  // ── Determine initial route ──
  useEffect(() => {
    (async () => {
      try {
        console.log('[BUILD24-DIAG] resolveInitialRoute:start', { timestamp: Date.now() });
        const resolution = await resolveInitialRoute(AsyncStorage);
        console.log('[BUILD24-DIAG] resolveInitialRoute:complete', { route: resolution.route, timestamp: Date.now() });
        if (resolution.route === 'DailyReward') {
          setDailyRewardReturningSession(resolution.fromReturningSession);
        }
        setInitialRoute(resolution.route);
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
        <Stack.Screen name="Introduction" component={IntroductionScreen} />
        <Stack.Screen name="CharacterName" component={CharacterNameScreen} />
        <Stack.Screen name="Discipline" component={DisciplineScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* ── Main app ── */}
        <Stack.Screen name="ReturnBrief" component={ReturnBriefScreen} />
        <Stack.Screen
          name="DailyReward"
          component={DailyRewardScreen}
          initialParams={{ fromReturningSession: dailyRewardReturningSession }}
        />
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Launch" component={LaunchScreen} />
        <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
        <Stack.Screen
          name="MissionDossier"
          component={MissionDossierScreen}
          options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <Stack.Screen
          name="DailyChallengeDossier"
          component={DailyChallengeDossierScreen}
          options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <Stack.Screen
          name="Gameplay"
          component={GameplayScreen}
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
        <Stack.Screen name="Store" component={StoreScreen} />
        <Stack.Screen name="PieceSandbox" component={PieceSandboxScreen} options={{ animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
