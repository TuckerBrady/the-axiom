// AXM-036 P4b-1 (F13 a, c) — BeamOverlay's persistent bit-traveler host:
// always mounted, opacity 0 while idle, visible with its digit during a
// travel. Red on origin/master: BeamState has no `traveler` field at all,
// so this test's beam-state literal fails to compile against master's
// BeamState shape (the same "fails to compile" red H-1 allows).

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

describe('[P4b-1] BeamOverlay bit-traveler host', () => {
  it('[P4b-1] traveler host mounted when idle, opacity 0', () => {
    const r = render(baseBeamState());
    // react-native-svg is mocked here to a functional passthrough per
    // element (see the jest.mock above) — react-test-renderer surfaces
    // both that wrapper AND the host element it renders for the SAME
    // <G testID="bit-traveler" ...> instance, both carrying the same
    // props, so `findAllByProps` legitimately returns two matches for
    // one logical host. `[0]` is enough to read its props.
    const hosts = r.root.findAllByProps({ testID: 'bit-traveler' });
    expect(hosts.length).toBeGreaterThanOrEqual(1);
    expect(hosts[0].props.opacity).toBe(0);

    const digits = r.root.findAllByProps({ testID: 'bit-traveler-digit' });
    expect(digits).toHaveLength(1);
    expect(digits[0].props.style.opacity).toBe(0);
  });

  it('[P4b-1] visible with digit during travel', () => {
    const r = render(baseBeamState({ traveler: { visible: true, x: 42, y: 17, value: 1, r: 10 } }));
    const host = r.root.findAllByProps({ testID: 'bit-traveler' })[0];
    expect(host.props.opacity).toBe(1);

    const disc = host.findByType('Circle');
    expect(disc.props.cx).toBe(42);
    expect(disc.props.cy).toBe(17);
    expect(disc.props.r).toBe(10);

    const digit = r.root.findAllByProps({ testID: 'bit-traveler-digit' })[0];
    expect(digit.props.style.opacity).toBe(1);
    expect(digit.props.children).toBe('1');
  });

  it('mounted even when the beam is idle (no cond mount on phase)', () => {
    const r = render(baseBeamState({ phase: 'idle' }));
    expect(r.root.findAllByProps({ testID: 'bit-traveler' }).length).toBeGreaterThanOrEqual(1);
  });
});
