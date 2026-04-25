// Source-contract + type-level tests for the value-travel animation.
// The unit-tier jest project does not transform react-native (same
// reason the other .tsx unit tests use source-read patterns — see
// cogsHubCard.test.tsx's note "Maestro covers full render"). The
// behavior of the three-phase Animated.timing chain is verified via
// source-contract; the public types come from the types module which
// has no react-native runtime dependency.

import * as fs from 'fs';
import * as path from 'path';
import {
  GLOW_TRAVELER_INITIAL,
  type TapeHighlight,
} from '../../../src/game/engagement/types';

const animationSource = fs.readFileSync(
  path.resolve(__dirname, '../../../src/game/engagement/valueTravelAnimation.ts'),
  'utf8',
);

describe('GLOW_TRAVELER_INITIAL', () => {
  it('starts hidden with phase=idle', () => {
    expect(GLOW_TRAVELER_INITIAL.visible).toBe(false);
    expect(GLOW_TRAVELER_INITIAL.phase).toBe('idle');
    expect(GLOW_TRAVELER_INITIAL.value).toBe('');
    expect(GLOW_TRAVELER_INITIAL.fromX).toBe(0);
    expect(GLOW_TRAVELER_INITIAL.fromY).toBe(0);
    expect(GLOW_TRAVELER_INITIAL.toX).toBe(0);
    expect(GLOW_TRAVELER_INITIAL.toY).toBe(0);
  });
});

describe('TapeHighlight union', () => {
  it("includes 'departing' as a valid variant", () => {
    // Type-level assertion — would fail to compile if missing.
    const h: TapeHighlight = 'departing';
    expect(h).toBe('departing');
  });

  it('also includes the classic read/write/gate-pass/gate-block variants', () => {
    const read: TapeHighlight = 'read';
    const write: TapeHighlight = 'write';
    const pass: TapeHighlight = 'gate-pass';
    const block: TapeHighlight = 'gate-block';
    expect([read, write, pass, block]).toEqual([
      'read',
      'write',
      'gate-pass',
      'gate-block',
    ]);
  });
});

describe('valueTravelAnimation source contract', () => {
  it('exports runValueTravel returning a Promise', () => {
    expect(animationSource).toMatch(
      /export function runValueTravel\([\s\S]*?\): Promise<void>/,
    );
  });

  it('exports resetGlowTraveler taking ValueTravelRefs', () => {
    expect(animationSource).toMatch(
      /export function resetGlowTraveler\(refs: ValueTravelRefs\): void/,
    );
  });

  it('resetGlowTraveler sets x/y to 0, scale to 1, opacity to 0', () => {
    expect(animationSource).toMatch(/refs\.x\.setValue\(0\)/);
    expect(animationSource).toMatch(/refs\.y\.setValue\(0\)/);
    expect(animationSource).toMatch(/refs\.scale\.setValue\(1\)/);
    expect(animationSource).toMatch(/refs\.opacity\.setValue\(0\)/);
  });

  it('all Animated.timing calls use useNativeDriver: true (no false anywhere)', () => {
    expect(animationSource).toMatch(/useNativeDriver: true/);
    expect(animationSource).not.toMatch(/useNativeDriver:\s*false/);
    // Sanity: the three phases account for 7 timings — 3 parallel in
    // lift-off + 3 parallel in travel + 0 in impact (impact is a
    // synchronous setValue + setTimeout). Count the useNativeDriver
    // occurrences as a regression guard.
    const nativeDriverCount = (animationSource.match(/useNativeDriver: true/g) ?? []).length;
    expect(nativeDriverCount).toBeGreaterThanOrEqual(6);
  });

  it('phases transition liftoff → travel → impact → idle', () => {
    // The initial setGlowTravelerState call carries phase: 'liftoff'.
    expect(animationSource).toMatch(/phase: 'liftoff'/);
    // Travel transition after the lift-off start() callback.
    expect(animationSource).toMatch(/phase: 'travel'/);
    // Impact transition after the travel start() callback.
    expect(animationSource).toMatch(/phase: 'impact'/);
    // Final reset to idle with visible=false.
    expect(animationSource).toMatch(
      /visible: false,\s*phase: 'idle'/,
    );
  });

  it('uses cinematic easing bezier(0.4, 0, 0.2, 1)', () => {
    expect(animationSource).toMatch(/Easing\.bezier\(0\.4, 0, 0\.2, 1\)/);
  });

  it('impact phase fades opacity over 250ms before resolving (Prompt 91, Fix 6)', () => {
    // The instant `refs.opacity.setValue(0)` + 700ms wait was
    // replaced by a smooth Animated.timing fade so the IN→TRAIL
    // handoff is visually continuous.
    expect(animationSource).toMatch(
      /Animated\.timing\(refs\.opacity[\s\S]*?toValue:\s*0[\s\S]*?duration:\s*250/,
    );
    expect(animationSource).not.toMatch(
      /setTimeout\(\s*\(\)\s*=>\s*\{\s*resolve\(\);?\s*\},\s*700\s*\)/,
    );
  });

  it('accepts an onArrive callback fired at Phase 2 completion (Prompt 91, Fix 6)', () => {
    expect(animationSource).toMatch(/onArrive\?:\s*\(\)\s*=>\s*void/);
    expect(animationSource).toMatch(/onArrive\?\.\(\);/);
  });
});
