// AXM-036 P4a (F13b) — BeamOverlay renders a data-carrying segment with
// an underlay glow polyline and a pulsing head halo; a non-data segment
// renders exactly as master.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';

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
    ...overrides,
  };
}

function render(beamState: BeamState) {
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

const seg = (data: boolean) => ({
  points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
  color: '#00D4FF',
  data,
});

describe('[P4a-8] BeamOverlay data segment glow', () => {
  it('one data trail renders one beam-data-glow', () => {
    const r = render(baseBeamState({ trails: [seg(true)], shimmer: 0.5 }));
    const glows = r.root.findAllByProps({ testID: 'beam-data-glow' });
    expect(glows).toHaveLength(1);
  });

  it('no data trails render no beam-data-glow', () => {
    const r = render(baseBeamState({ trails: [seg(false)], shimmer: 0.5 }));
    const glows = r.root.findAllByProps({ testID: 'beam-data-glow' });
    expect(glows).toHaveLength(0);
  });

  it('a branch data trail also renders a beam-data-glow', () => {
    const r = render(baseBeamState({ branchTrails: [[seg(true)], [seg(false)]], shimmer: 1 }));
    const glows = r.root.findAllByProps({ testID: 'beam-data-glow' });
    expect(glows).toHaveLength(1);
  });

  it('the glow polyline is scaled and capped per P4a-8 constants', () => {
    const r = render(baseBeamState({ trails: [seg(true)], shimmer: 1 }));
    const [glow] = r.root.findAllByProps({ testID: 'beam-data-glow' });
    // Single trail => it is also the "active" (last) segment: baseWidth 2.5.
    expect(glow.props.strokeWidth).toBeCloseTo(2.5 * 2.5);
    expect(glow.props.opacity).toBeCloseTo(0.3 * 1);
  });
});

describe('[P4a-8] BeamOverlay head halo', () => {
  it('headData true and shimmer 1: r 14, opacity 0.40', () => {
    const r = render(baseBeamState({ heads: [{ x: 5, y: 5 }], headData: true, shimmer: 1 }));
    const circles = r.root.findAllByType(require('react-native-svg').Circle);
    // The halo is the first Circle drawn inside the head's <G>.
    const halo = circles.find((c: any) => c.props.opacity !== 0.95);
    expect(halo).toBeDefined();
    expect(halo.props.r).toBeCloseTo(14);
    expect(halo.props.opacity).toBeCloseTo(0.4);
  });

  it('headData false: r 11, opacity 0.25, regardless of shimmer', () => {
    const r = render(baseBeamState({ heads: [{ x: 5, y: 5 }], headData: false, shimmer: 1 }));
    const circles = r.root.findAllByType(require('react-native-svg').Circle);
    const halo = circles.find((c: any) => c.props.opacity !== 0.95);
    expect(halo).toBeDefined();
    expect(halo.props.r).toBeCloseTo(11);
    expect(halo.props.opacity).toBeCloseTo(0.25);
  });
});

describe('[P4a-8] a non-data trail Polyline matches master exactly', () => {
  it('active (last) segment: strokeWidth 2.5, opacity 0.72', () => {
    const r = render(baseBeamState({ trails: [seg(false)] }));
    const polylines = r.root.findAllByType(require('react-native-svg').Polyline);
    expect(polylines).toHaveLength(1);
    expect(polylines[0].props.strokeWidth).toBe(2.5);
    expect(polylines[0].props.opacity).toBe(0.72);
    expect(polylines[0].props.testID).toBeUndefined();
  });

  it('non-active segment: strokeWidth 2, opacity 0.45', () => {
    const r = render(baseBeamState({ trails: [seg(false), seg(false)] }));
    const polylines = r.root.findAllByType(require('react-native-svg').Polyline);
    expect(polylines).toHaveLength(2);
    expect(polylines[0].props.strokeWidth).toBe(2);
    expect(polylines[0].props.opacity).toBe(0.45);
    expect(polylines[1].props.strokeWidth).toBe(2.5);
    expect(polylines[1].props.opacity).toBe(0.72);
  });
});
