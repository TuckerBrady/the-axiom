import React from 'react';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useIsFocused: () => true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

describe('SectorMapScreen', () => {
  it('module exists and can be imported', () => {
    expect(() => require('../../src/screens/SectorMapScreen')).not.toThrow();
  });
});
