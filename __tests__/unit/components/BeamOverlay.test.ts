// Source-contract tests for BeamOverlay (Prompt 99B). The critical
// isolation point for clause 4.4.2: setBeamState re-renders the
// extracted BeamOverlay only — BoardGrid, WireOverlay, HUDChrome,
// PieceTray, TapeBarShell, and StarField stay mounted and unchanged.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const beamSrc = read('src/components/gameplay/BeamOverlay.tsx');
const screenSrc = read('src/screens/GameplayScreen.tsx');

describe('BeamOverlay — extracted beam + charge + lock + voidPulse layer', () => {
  it('exports a default React.memo-wrapped component', () => {
    expect(beamSrc).toMatch(/export default React\.memo\(BeamOverlayComponent\)/);
  });

  it('takes beamState, chargeState, lockRingCenter, three Animated.Values, and grid dims', () => {
    expect(beamSrc).toMatch(/beamState:\s*BeamState/);
    expect(beamSrc).toMatch(/chargeState:\s*ChargeState/);
    expect(beamSrc).toMatch(/lockRingCenter:\s*Pt \| null/);
    expect(beamSrc).toMatch(/chargeProgressAnim:\s*RNAnimated\.Value/);
    expect(beamSrc).toMatch(/lockRingProgressAnim:\s*RNAnimated\.Value/);
    expect(beamSrc).toMatch(/beamOpacity:\s*RNAnimated\.Value/);
    expect(beamSrc).toMatch(/gridW:\s*number/);
    expect(beamSrc).toMatch(/gridH:\s*number/);
  });

  it('renders charge rings (driven by chargeProgressAnim, native-driver-friendly)', () => {
    expect(beamSrc).toMatch(/beamState\.phase === 'charge' && chargeState\.pos/);
    expect(beamSrc).toMatch(/chargeProgressAnim\.interpolate/);
    // Two AnimatedCircles for the two charge rings.
    expect((beamSrc.match(/<AnimatedCircle/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('renders lock rings driven by lockRingProgressAnim with the staggered second-ring inputRange', () => {
    expect(beamSrc).toMatch(/lockRingCenter && \(/);
    expect(beamSrc).toMatch(/inputRange: \[0, 0\.625, 1\][\s\S]*?outputRange: \[6, 42, 42\]/);
    expect(beamSrc).toMatch(
      /inputRange: \[0, 0\.3125, 0\.9375, 1\][\s\S]*?outputRange: \[6, 6, 42, 42\]/,
    );
  });

  it('renders pre-fork trail polylines and fork branch trails', () => {
    expect(beamSrc).toMatch(/beamState\.trails\.map/);
    expect(beamSrc).toMatch(/beamState\.branchTrails\.map/);
  });

  it('renders beam heads with translucent halo + white core', () => {
    expect(beamSrc).toMatch(/beamState\.heads\.map/);
    expect(beamSrc).toMatch(/r=\{11\}[\s\S]*?fill=\{beamState\.headColor\}/);
    expect(beamSrc).toMatch(/r=\{3\.5\}[\s\S]*?fill="white"/);
  });

  it('renders the void pulse circle when voidPulse is non-null', () => {
    expect(beamSrc).toMatch(/beamState\.voidPulse && \(/);
    expect(beamSrc).toMatch(/stroke="#FF3B3B"/);
  });

  it('wraps everything in an Animated.View whose opacity is driven by beamOpacity (native-driver-friendly)', () => {
    expect(beamSrc).toMatch(/<RNAnimated\.View[\s\S]*?opacity:\s*beamOpacity/);
  });

  it('GameplayScreen imports and renders <BeamOverlay /> with the EngagementContext Animated.Values', () => {
    expect(screenSrc).toMatch(
      /import BeamOverlay from '\.\.\/components\/gameplay\/BeamOverlay'/,
    );
    expect(screenSrc).toMatch(/<BeamOverlay[\s\S]*?chargeProgressAnim=\{chargeProgressAnim\}/);
    expect(screenSrc).toMatch(/<BeamOverlay[\s\S]*?lockRingProgressAnim=\{lockRingProgressAnim\}/);
    expect(screenSrc).toMatch(/<BeamOverlay[\s\S]*?beamOpacity=\{beamOpacity\}/);
  });
});
