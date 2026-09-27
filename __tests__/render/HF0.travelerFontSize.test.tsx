// AXM-036 hotfix HF-0 — Android crash on every gameplay mount (build 50).
//
// Reproduced on the Android emulator with build 50's master APK: tapping A1-1
// from the hub kills the app, every time:
//   java.lang.IllegalArgumentException: FontSize should be a positive value.
//   Current value: 0  (TextAttributeProps.getLetterSpacing, Fabric mount)
// BeamOverlay's always-mounted bit-traveler digit (P4b, #73) sets
// `fontSize: traveler.r`, and BIT_TRAVELER_INITIAL.r is 0, so the idle digit
// mounts with fontSize 0. iOS tolerates that; Android Fabric throws. The
// existing P4b test renders the same idle state but never checks the size.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';

// See axm036P4aBeamOverlay.test.tsx for why react-native-svg is mocked to
// plain pass-through elements in this render tier.
jest.mock('react-native-svg', () => {
  const ReactLib = require('react');
  const make = (name: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => ReactLib.createElement(name, props, props.children);
  return {
    __esModule: true,
    default: make('Svg'),
    Circle: make('Circle'),
    G: make('G'),
    Polyline: make('Polyline'),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer = require('react-test-renderer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BeamOverlay = require('../../src/components/gameplay/BeamOverlay').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Animated } = require('react-native');
import type { BeamState } from '../../src/game/engagement';

function baseBeamState(overrides: Partial<BeamState> = {}): BeamState {
  return {
    heads: [],
    headColor: '#8B5CF6',
    trails: [],
    branchTrails: [],
    voidPulse: null,
    phase: 'beam',
    litWires: new Set(),
    shimmer: 0,
    headData: false,
    traveler: { visible: false, x: 0, y: 0, value: 0, r: 0 },
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function render(beamState: BeamState): any {
  let r: any;
  TestRenderer.act(() => {
    r = TestRenderer.create(
      <BeamOverlay
        beamState={beamState}
        chargeState={{ pos: null, progress: 0, color: null }}
        lockRingCenter={null}
        voidBurstCenter={null}
        chargeProgressAnim={new Animated.Value(0)}
        lockRingProgressAnim={new Animated.Value(0)}
        voidPulseRingProgressAnim={new Animated.Value(0)}
        beamOpacity={new Animated.Value(1)}
        gridW={300}
        gridH={300}
      />,
    );
  });
  return r;
}

describe('[HF-0] BeamOverlay traveler digit never mounts with fontSize <= 0', () => {
  it('[HF-0] idle initial state (BIT_TRAVELER_INITIAL) renders a positive fontSize', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BIT_TRAVELER_INITIAL } = require('../../src/game/engagement/types');
    const r = render(baseBeamState({ traveler: BIT_TRAVELER_INITIAL }));
    const digit = r.root.findAllByProps({ testID: 'bit-traveler-digit' })[0];
    expect(digit.props.style.fontSize).toBeGreaterThan(0);
  });

  it('[HF-0] a traveler written with r = 0 still renders a positive fontSize', () => {
    const r = render(baseBeamState({ traveler: { visible: false, x: 0, y: 0, value: 0, r: 0 } }));
    const digit = r.root.findAllByProps({ testID: 'bit-traveler-digit' })[0];
    expect(digit.props.style.fontSize).toBeGreaterThan(0);
  });

  it('[HF-0] a real traveler keeps its radius as the digit size', () => {
    const r = render(baseBeamState({ traveler: { visible: true, x: 5, y: 5, value: 1, r: 9 } }));
    const digit = r.root.findAllByProps({ testID: 'bit-traveler-digit' })[0];
    expect(digit.props.style.fontSize).toBe(9);
  });
});
