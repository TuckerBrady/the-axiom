import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HubScreen from '../screens/HubScreen';
import SectorMapScreen from '../screens/SectorMapScreen';
import CodexScreen from '../screens/CodexScreen';
import FreeBuildScreen from '../screens/FreeBuildScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type TabParamList = {
  Hub: undefined;
  SectorMap: undefined;
  Codex: undefined;
  FreeBuild: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a1628',
          borderTopColor: 'rgba(74,158,255,0.15)',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#c87941',
        tabBarInactiveTintColor: '#3a5070',
        tabBarLabelStyle: {
          fontFamily: 'Space Mono',
          fontSize: 9,
        },
      }}
    >
      <Tab.Screen
        name="Hub"
        component={HubScreen}
        options={{
          tabBarLabel: 'Ship',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🚀</Text>,
        }}
      />
      <Tab.Screen
        name="SectorMap"
        component={SectorMapScreen}
        options={{
          tabBarLabel: 'Sectors',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🗺️</Text>,
        }}
      />
      <Tab.Screen
        name="Codex"
        component={CodexScreen}
        options={{
          tabBarLabel: 'Codex',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>📖</Text>,
        }}
      />
      <Tab.Screen
        name="FreeBuild"
        component={FreeBuildScreen}
        options={{
          tabBarLabel: 'Workshop',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>⚙️</Text>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Engineer',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🤖</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
