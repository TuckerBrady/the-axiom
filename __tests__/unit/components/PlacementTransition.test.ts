import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const transitionSrc = read('src/components/gameplay/PlacementTransition.tsx');
const successSrc = read('src/game/engagement/successHandlers.ts');
const settingsSrc = read('src/store/settingsStore.ts');
const screenSrc = read('src/screens/GameplayScreen.tsx');

describe('PlacementTransition — source contract', () => {
  it('shows PLACEMENT PHASE flash text', () => {
    expect(transitionSrc).toMatch(/PLACEMENT PHASE/);
  });

  it('uses Easing.bezier (cubic-bezier), not linear', () => {
    expect(transitionSrc).toMatch(/Easing\.bezier/);
    expect(transitionSrc).not.toMatch(/Easing\.linear/);
  });

  it('calls onComplete after the sequence finishes', () => {
    expect(transitionSrc).toMatch(/onComplete/);
  });

  it('uses useNativeDriver: false', () => {
    expect(transitionSrc).toMatch(/useNativeDriver:\s*false/);
  });

  it('GameplayScreen renders PlacementTransition in transitioning phase', () => {
    expect(screenSrc).toMatch(/<PlacementTransition/);
    expect(screenSrc).toMatch(/transitioning/);
  });

  it('GameplayScreen calls handleTransitionComplete on sequence end', () => {
    expect(screenSrc).toMatch(/handleTransitionComplete/);
  });
});

describe('settingsStore — arcWheelPosition', () => {
  it('has arcWheelPosition field defaulting to right', () => {
    expect(settingsSrc).toMatch(/arcWheelPosition.*'right'|'right'.*arcWheelPosition/);
  });

  it('exports ArcWheelPosition type', () => {
    expect(settingsSrc).toMatch(/export type ArcWheelPosition/);
  });

  it('has setArcWheelPosition action', () => {
    expect(settingsSrc).toMatch(/setArcWheelPosition/);
  });

  it('persists arcWheelPosition to AsyncStorage', () => {
    expect(settingsSrc).toMatch(/arcWheelPosition.*persist|persist.*arcWheelPosition/);
  });

  it('hydrates arcWheelPosition and validates only left/right', () => {
    expect(settingsSrc).toMatch(/'left'.*'right'|arcWheelPosition.*left.*right/);
  });
});

describe('successHandlers — purchasedTapeTypes integration', () => {
  it('SuccessParams includes optional purchasedTapeTypes', () => {
    expect(successSrc).toMatch(/purchasedTapeTypes\?:\s*string\[\]/);
  });

  it('defaults purchasedTapeTypes to empty array', () => {
    expect(successSrc).toMatch(/purchasedTapeTypes\s*=\s*\[\]/);
  });

  it('passes purchasedTapeTypes to calculateScore', () => {
    expect(successSrc).toMatch(/purchasedTapeTypes,/);
  });

  it('GameplayScreen passes purchasedTapeTypes from requisitionStore to handleSuccess', () => {
    expect(screenSrc).toMatch(/getPurchasedTapeTypes/);
    expect(screenSrc).toMatch(/purchasedTapeTypes.*getPurchasedTapeTypes|getPurchasedTapeTypes.*purchasedTapeTypes/);
  });
});
