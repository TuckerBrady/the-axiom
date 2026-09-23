jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Error: 'Error' },
}));

jest.mock('../../../src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn(),
  },
}));

import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../../../src/store/settingsStore';
import { hapticLight, hapticMedium, hapticHeavy, hapticError } from '../../../src/utils/haptics';

const mockGetState = useSettingsStore.getState as jest.Mock;
const mockImpact = Haptics.impactAsync as jest.Mock;

describe('haptics utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when hapticsEnabled is true', () => {
    beforeEach(() => {
      mockGetState.mockReturnValue({ hapticsEnabled: true });
    });

    it('hapticLight calls ImpactFeedbackStyle.Light', () => {
      hapticLight();
      expect(mockImpact).toHaveBeenCalledTimes(1);
      expect(mockImpact).toHaveBeenCalledWith('Light');
    });

    it('hapticMedium calls ImpactFeedbackStyle.Medium', () => {
      hapticMedium();
      expect(mockImpact).toHaveBeenCalledTimes(1);
      expect(mockImpact).toHaveBeenCalledWith('Medium');
    });

    it('hapticHeavy calls ImpactFeedbackStyle.Heavy', () => {
      hapticHeavy();
      expect(mockImpact).toHaveBeenCalledTimes(1);
      expect(mockImpact).toHaveBeenCalledWith('Heavy');
    });
  });

  describe('when hapticsEnabled is false', () => {
    beforeEach(() => {
      mockGetState.mockReturnValue({ hapticsEnabled: false });
    });

    it('hapticLight does not call impactAsync', () => {
      hapticLight();
      expect(mockImpact).not.toHaveBeenCalled();
    });

    it('hapticMedium does not call impactAsync', () => {
      hapticMedium();
      expect(mockImpact).not.toHaveBeenCalled();
    });

    it('hapticHeavy does not call impactAsync', () => {
      hapticHeavy();
      expect(mockImpact).not.toHaveBeenCalled();
    });
  });

  describe('when impactAsync rejects (device unavailable)', () => {
    beforeEach(() => {
      mockGetState.mockReturnValue({ hapticsEnabled: true });
    });

    it('hapticLight does not propagate the rejection', async () => {
      mockImpact.mockRejectedValueOnce(new Error('haptics unavailable'));
      hapticLight();
      await Promise.resolve();
    });

    it('hapticMedium does not propagate the rejection', async () => {
      mockImpact.mockRejectedValueOnce(new Error('haptics unavailable'));
      hapticMedium();
      await Promise.resolve();
    });

    it('hapticHeavy does not propagate the rejection', async () => {
      mockImpact.mockRejectedValueOnce(new Error('haptics unavailable'));
      hapticHeavy();
      await Promise.resolve();
    });
  });
});

describe('hapticError (AXM-013 blown-cell rejection)', () => {
  const mockNotify = Haptics.notificationAsync as jest.Mock;
  beforeEach(() => jest.clearAllMocks());

  it('fires the Error notification when haptics are on', () => {
    mockGetState.mockReturnValue({ hapticsEnabled: true });
    hapticError();
    expect(mockNotify).toHaveBeenCalledWith('Error');
  });

  it('stays silent when haptics are off', () => {
    mockGetState.mockReturnValue({ hapticsEnabled: false });
    hapticError();
    expect(mockNotify).not.toHaveBeenCalled();
  });
});
