// AXM-036 P4a (F13b) — BeamOverlay renders a data-carrying segment with
// an underlay glow polyline and a pulsing head halo; a non-data segment
// renders exactly as master.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';

// react-native-svg's compiled entry pulls in the Fabric codegen native
// component descriptors (AndroidSvgViewNativeComponent /
// IOSSvgViewNativeComponent), which the repo's minimal react-native mock
// (__tests__/__mocks__/react-native.ts) doesn't provide — under
// react-test-renderer the real package silently renders null. Every
// other react-native-svg consumer in this repo is covered by
// source-contract tests instead (DamagedCell.test.ts, PieceIcon), but
// P4a-8's glow/halo math is exactly the kind of prop arithmetic a real
// render assertion is best at, so this test mocks react-native-svg to
// plain pass-through elements — the same pattern this repo already uses
// for other native-backed packages in the render tier
// (pieceTrayCentreSelect.test.tsx mocks expo-linear-gradient the same
// way).
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
    // AXM-036 P4b traveler field (v1.2 authorized addition — additive only).
    traveler: { visible: false, x: 0, y: 0, value: 0, r: 0 },
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
  it('[P4a-8] one data trail renders one beam-data-glow', () => {
    const r = render(baseBeamState({ trails: [seg(true)], shimmer: 0.5 }));
    const glows = r.root.findAllByType('Polyline').filter((n: any) => n.props.testID === 'beam-data-glow');
    expect(glows).toHaveLength(1);
  });

  it('[P4a-8] no data trails render no beam-data-glow', () => {
    const r = render(baseBeamState({ trails: [seg(false)], shimmer: 0.5 }));
    const glows = r.root.findAllByType('Polyline').filter((n: any) => n.props.testID === 'beam-data-glow');
    expect(glows).toHaveLength(0);
  });

  it('a branch data trail also renders a beam-data-glow', () => {
    const r = render(baseBeamState({ branchTrails: [[seg(true)], [seg(false)]], shimmer: 1 }));
    const glows = r.root.findAllByType('Polyline').filter((n: any) => n.props.testID === 'beam-data-glow');
    expect(glows).toHaveLength(1);
  });

  it('the glow polyline is scaled and capped per P4a-8 constants', () => {
    const r = render(baseBeamState({ trails: [seg(true)], shimmer: 1 }));
    const [glow] = r.root.findAllByType('Polyline').filter((n: any) => n.props.testID === 'beam-data-glow');
    // Single trail => it is also the "active" (last) segment: baseWidth 2.5.
    expect(glow.props.strokeWidth).toBeCloseTo(2.5 * 2.5);
    expect(glow.props.opacity).toBeCloseTo(0.3 * 1);
  });
});

describe('[P4a-8] BeamOverlay head halo', () => {
  // Contract-worded test name (C-5). v1.2 authorizes widening
  // BeamOverlay.test.ts's head-halo regex to accept the shimmer-driven
  // base-11 expression, so the halo Circle's r/opacity are mutated
  // directly (single circle) rather than layered additively.
  it("[P4a-8] with headData true and shimmer 1 the head halo has r 14 and opacity 0.40; with headData false it has r 11 and opacity 0.25", () => {
    const rTrue = render(baseBeamState({ heads: [{ x: 5, y: 5 }], headData: true, shimmer: 1 }));
    const haloTrue = rTrue.root.findAllByType('Circle').find((c: any) => c.props.opacity !== 0.95);
    expect(haloTrue).toBeDefined();
    expect(haloTrue.props.r).toBeCloseTo(14);
    expect(haloTrue.props.opacity).toBeCloseTo(0.4);

    const rFalse = render(baseBeamState({ heads: [{ x: 5, y: 5 }], headData: false, shimmer: 1 }));
    const haloFalse = rFalse.root.findAllByType('Circle').find((c: any) => c.props.opacity !== 0.95);
    expect(haloFalse).toBeDefined();
    expect(haloFalse.props.r).toBe(11);
    expect(haloFalse.props.opacity).toBe(0.25);
  });
});

describe("[P4a-8] a non-data trail's Polyline props equal master's", () => {
  it("[P4a-8] a non-data trail's Polyline props equal master's", () => {
    // Active (last) segment: strokeWidth 2.5, opacity 0.72 — master's values
    // (BeamOverlay.tsx:77-116 pre-fix).
    const rActive = render(baseBeamState({ trails: [seg(false)] }));
    const activePolylines = rActive.root.findAllByType('Polyline');
    expect(activePolylines).toHaveLength(1);
    expect(activePolylines[0].props.strokeWidth).toBe(2.5);
    expect(activePolylines[0].props.opacity).toBe(0.72);
    expect(activePolylines[0].props.testID).toBeUndefined();

    // Non-active segment: strokeWidth 2, opacity 0.45 — master's values.
    const rTwo = render(baseBeamState({ trails: [seg(false), seg(false)] }));
    const twoPolylines = rTwo.root.findAllByType('Polyline');
    expect(twoPolylines).toHaveLength(2);
    expect(twoPolylines[0].props.strokeWidth).toBe(2);
    expect(twoPolylines[0].props.opacity).toBe(0.45);
    expect(twoPolylines[1].props.strokeWidth).toBe(2.5);
    expect(twoPolylines[1].props.opacity).toBe(0.72);
  });
});
