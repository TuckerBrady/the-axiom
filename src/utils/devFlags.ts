/**
 * True when dev-only UI should render. Enabled in Expo Go (`__DEV__`)
 * and in EAS builds made with the `testflight` profile (which sets
 * EXPO_PUBLIC_SHOW_DEV_TOOLS=true). Never true in an App Store /
 * `production` profile build.
 */
export const SHOW_DEV_TOOLS =
  __DEV__ || process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === 'true';
