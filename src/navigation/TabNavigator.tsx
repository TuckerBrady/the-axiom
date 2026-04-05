import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HubScreen from '../screens/HubScreen';
import SectorMapScreen from '../screens/SectorMapScreen';
import CodexScreen from '../screens/CodexScreen';
import FreeBuildScreen from '../screens/FreeBuildScreen';
import SettingsScreen from '../screens/SettingsScreen';

import ShipIcon from '../components/icons/ShipIcon';
import SectorsIcon from '../components/icons/SectorsIcon';
import CodexIcon from '../components/icons/CodexIcon';
import WorkshopIcon from '../components/icons/WorkshopIcon';
import EngineerIcon from '../components/icons/EngineerIcon';

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
          tabBarIcon: ({ color }) => <ShipIcon size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="SectorMap"
        component={SectorMapScreen}
        options={{
          tabBarLabel: 'Sectors',
          tabBarIcon: ({ color }) => <SectorsIcon size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Codex"
        component={CodexScreen}
        options={{
          tabBarLabel: 'Codex',
          tabBarIcon: ({ color }) => <CodexIcon size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="FreeBuild"
        component={FreeBuildScreen}
        options={{
          tabBarLabel: 'Workshop',
          tabBarIcon: ({ color }) => <WorkshopIcon size={20} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            (navigation as any).navigate('Store');
          },
        })}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Engineer',
          tabBarIcon: ({ color }) => <EngineerIcon size={20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
