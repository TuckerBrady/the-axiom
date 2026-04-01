import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LaunchScreen from '../screens/LaunchScreen';
import HubScreen from '../screens/HubScreen';
import SectorMapScreen from '../screens/SectorMapScreen';
import LevelSelectScreen from '../screens/LevelSelectScreen';
import GameplayScreen from '../screens/GameplayScreen';
import FreeBuildScreen from '../screens/FreeBuildScreen';
import StoreScreen from '../screens/StoreScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  Launch: undefined;
  Hub: undefined;
  SectorMap: undefined;
  LevelSelect: undefined;
  Gameplay: undefined;
  FreeBuild: undefined;
  Store: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Launch"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Launch" component={LaunchScreen} />
        <Stack.Screen name="Hub" component={HubScreen} />
        <Stack.Screen name="SectorMap" component={SectorMapScreen} />
        <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
        <Stack.Screen name="Gameplay" component={GameplayScreen} />
        <Stack.Screen name="FreeBuild" component={FreeBuildScreen} />
        <Stack.Screen name="Store" component={StoreScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
