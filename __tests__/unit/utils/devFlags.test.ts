describe('SHOW_DEV_TOOLS', () => {
  const originalEnv = process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS;
  const originalDev = (global as unknown as { __DEV__: boolean }).__DEV__;

  afterEach(() => {
    process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS = originalEnv;
    (global as unknown as { __DEV__: boolean }).__DEV__ = originalDev;
    jest.resetModules();
  });

  it('resolves true when EXPO_PUBLIC_SHOW_DEV_TOOLS is "true" and __DEV__ is false', () => {
    process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS = 'true';
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    jest.resetModules();
    const { SHOW_DEV_TOOLS } = require('../../../src/utils/devFlags');
    expect(SHOW_DEV_TOOLS).toBe(true);
  });

  it('falls back to __DEV__ when env var is unset', () => {
    delete process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS;
    (global as unknown as { __DEV__: boolean }).__DEV__ = true;
    jest.resetModules();
    const { SHOW_DEV_TOOLS } = require('../../../src/utils/devFlags');
    expect(SHOW_DEV_TOOLS).toBe(true);
  });

  it('is false when __DEV__ is false and env var is unset', () => {
    delete process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS;
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    jest.resetModules();
    const { SHOW_DEV_TOOLS } = require('../../../src/utils/devFlags');
    expect(SHOW_DEV_TOOLS).toBe(false);
  });
});
