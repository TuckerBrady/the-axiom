// AXM-036 P6 (F6) — tray scroll haptic tick. `hapticSelection()` follows the
// same shape as the other haptics.ts exports: a light selection tick, gated
// by the settings store's `hapticsEnabled`, swallowing a rejection.
// Red on origin/master: `hapticSelection` does not exist on
// src/utils/haptics.ts, so this file fails to compile.

jest.mock('../../../src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn(),
  },
}));

import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../../../src/store/settingsStore';
import { hapticSelection } from '../../../src/utils/haptics';

const mockGetState = useSettingsStore.getState as jest.Mock;
const mockSelection = Haptics.selectionAsync as jest.Mock;

describe('hapticSelection (AXM-036 P6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[P6-1] calls selectionAsync when enabled', () => {
    mockGetState.mockReturnValue({ hapticsEnabled: true });
    hapticSelection();
    expect(mockSelection).toHaveBeenCalledTimes(1);
  });

  it('[P6-1] silent when disabled', () => {
    mockGetState.mockReturnValue({ hapticsEnabled: false });
    hapticSelection();
    expect(mockSelection).not.toHaveBeenCalled();
  });

  it('[P6-1] does not propagate a rejection', async () => {
    mockGetState.mockReturnValue({ hapticsEnabled: true });
    mockSelection.mockRejectedValueOnce(new Error('haptics unavailable'));
    hapticSelection();
    await Promise.resolve();
  });
});
