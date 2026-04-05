import React from 'react';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: { sectorId: 0 } }),
  useIsFocused: () => true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ sectorId: '0' }),
}));

describe('LevelSelectScreen', () => {
  it('module exists and can be imported', () => {
    expect(() => require('../../src/screens/LevelSelectScreen')).not.toThrow();
  });
});
