import {
  setBeamHeads,
  setBeamHeadColor,
  setTrailSegments,
  setBranchTrails,
  setVoidPulse,
  setSignalPhase,
  updateLitWires,
  updateFlashingPieces,
  updateActiveAnimations,
  updateGateResults,
  updateFailColors,
  setLockedPieces,
  setChargePos,
  setChargeProgress,
} from '../../../src/game/engagement/stateHelpers';
import type {
  BeamState,
  PieceAnimState,
  ChargeState,
  TapeIndicatorBarState,
} from '../../../src/game/engagement/types';
import {
  TAPE_BAR_INITIAL,
  BEAM_INITIAL,
  PIECE_ANIM_INITIAL,
  CHARGE_INITIAL,
} from '../../../src/game/engagement/types';

// Drive a React-like setState: accept either a value or an updater fn,
// apply it to `state.value`, and return the new value.
function makeState<T>(initial: T): { state: { value: T }; setter: (arg: T | ((prev: T) => T)) => void } {
  const state = { value: initial };
  const setter = (arg: T | ((prev: T) => T)): void => {
    if (typeof arg === 'function') {
      state.value = (arg as (prev: T) => T)(state.value);
    } else {
      state.value = arg;
    }
  };
  return { state, setter };
}

describe('beam state helpers', () => {
  it('setBeamHeads replaces only the heads field', () => {
    const { state, setter } = makeState<BeamState>({
      ...BEAM_INITIAL,
      trails: [{ points: [], color: '#abc' }],
      phase: 'beam',
      litWires: new Set(['x']),
    });
    setBeamHeads(setter, [{ x: 1, y: 2 }]);
    expect(state.value.heads).toEqual([{ x: 1, y: 2 }]);
    expect(state.value.trails).toEqual([{ points: [], color: '#abc' }]);
    expect(state.value.phase).toBe('beam');
    expect(state.value.litWires.has('x')).toBe(true);
  });

  it('setBeamHeadColor replaces only headColor', () => {
    const { state, setter } = makeState<BeamState>({ ...BEAM_INITIAL, litWires: new Set() });
    setBeamHeadColor(setter, '#FF00AA');
    expect(state.value.headColor).toBe('#FF00AA');
  });

  it('setTrailSegments replaces only trails', () => {
    const { state, setter } = makeState<BeamState>({
      ...BEAM_INITIAL,
      heads: [{ x: 5, y: 5 }],
      litWires: new Set(),
    });
    setTrailSegments(setter, [{ points: [{ x: 0, y: 0 }], color: '#111' }]);
    expect(state.value.trails).toHaveLength(1);
    expect(state.value.heads).toEqual([{ x: 5, y: 5 }]);
  });

  it('setBranchTrails replaces only branchTrails', () => {
    const { state, setter } = makeState<BeamState>({ ...BEAM_INITIAL, litWires: new Set() });
    setBranchTrails(setter, [[{ points: [], color: '#aa' }], []]);
    expect(state.value.branchTrails).toHaveLength(2);
  });

  it('setVoidPulse replaces only voidPulse', () => {
    const { state, setter } = makeState<BeamState>({ ...BEAM_INITIAL, litWires: new Set() });
    setVoidPulse(setter, { x: 1, y: 2, r: 3, opacity: 0.5 });
    expect(state.value.voidPulse).toEqual({ x: 1, y: 2, r: 3, opacity: 0.5 });
    setVoidPulse(setter, null);
    expect(state.value.voidPulse).toBeNull();
  });

  it('setSignalPhase replaces only phase', () => {
    const { state, setter } = makeState<BeamState>({ ...BEAM_INITIAL, litWires: new Set() });
    setSignalPhase(setter, 'lock');
    expect(state.value.phase).toBe('lock');
  });

  it('updateLitWires applies the updater to the current litWires', () => {
    const { state, setter } = makeState<BeamState>({ ...BEAM_INITIAL, litWires: new Set(['a']) });
    updateLitWires(setter, prev => {
      const n = new Set(prev);
      n.add('b');
      return n;
    });
    expect(state.value.litWires.has('a')).toBe(true);
    expect(state.value.litWires.has('b')).toBe(true);
  });
});

describe('piece anim state helpers', () => {
  it('updateFlashingPieces applies the updater and preserves siblings', () => {
    const { state, setter } = makeState<PieceAnimState>({
      ...PIECE_ANIM_INITIAL,
      flashing: new Map(),
      animations: new Map([['a', 'rolling']]),
      gates: new Map(),
      failColors: new Map(),
      locked: new Set(['L']),
    });
    updateFlashingPieces(setter, prev => {
      const m = new Map(prev);
      m.set('p', '#FF0000');
      return m;
    });
    expect(state.value.flashing.get('p')).toBe('#FF0000');
    expect(state.value.animations.get('a')).toBe('rolling');
    expect(state.value.locked.has('L')).toBe(true);
  });

  it('updateActiveAnimations preserves other fields', () => {
    const { state, setter } = makeState<PieceAnimState>({
      flashing: new Map([['f', '#ff0']]),
      flashCounter: new Map(),
      animations: new Map(),
      gates: new Map(),
      failColors: new Map(),
      locked: new Set(),
    });
    updateActiveAnimations(setter, prev => {
      const m = new Map(prev);
      m.set('x', 'spinning');
      return m;
    });
    expect(state.value.animations.get('x')).toBe('spinning');
    expect(state.value.flashing.get('f')).toBe('#ff0');
  });

  it('updateGateResults applies the updater', () => {
    const { state, setter } = makeState<PieceAnimState>({
      ...PIECE_ANIM_INITIAL,
      flashing: new Map(),
      animations: new Map(),
      gates: new Map(),
      failColors: new Map(),
      locked: new Set(),
    });
    updateGateResults(setter, prev => {
      const m = new Map(prev);
      m.set('g', 'pass');
      return m;
    });
    expect(state.value.gates.get('g')).toBe('pass');
  });

  it('updateFailColors applies the updater', () => {
    const { state, setter } = makeState<PieceAnimState>({
      ...PIECE_ANIM_INITIAL,
      flashing: new Map(),
      animations: new Map(),
      gates: new Map(),
      failColors: new Map(),
      locked: new Set(),
    });
    updateFailColors(setter, prev => {
      const m = new Map(prev);
      m.set('f', '#FF3B3B');
      return m;
    });
    expect(state.value.failColors.get('f')).toBe('#FF3B3B');
  });

  it('setLockedPieces replaces locked', () => {
    const { state, setter } = makeState<PieceAnimState>({
      ...PIECE_ANIM_INITIAL,
      flashing: new Map([['x', '#abc']]),
      animations: new Map(),
      gates: new Map(),
      failColors: new Map(),
      locked: new Set(),
    });
    setLockedPieces(setter, new Set(['a', 'b']));
    expect(state.value.locked.has('a')).toBe(true);
    expect(state.value.locked.has('b')).toBe(true);
    expect(state.value.flashing.get('x')).toBe('#abc');
  });
});

describe('charge state helpers', () => {
  it('setChargePos replaces pos', () => {
    const { state, setter } = makeState<ChargeState>({ ...CHARGE_INITIAL, progress: 0.5 });
    setChargePos(setter, { x: 10, y: 20 });
    expect(state.value.pos).toEqual({ x: 10, y: 20 });
    expect(state.value.progress).toBe(0.5);
  });

  it('setChargeProgress replaces progress', () => {
    const { state, setter } = makeState<ChargeState>({ pos: { x: 5, y: 5 }, progress: 0 });
    setChargeProgress(setter, 0.75);
    expect(state.value.progress).toBe(0.75);
    expect(state.value.pos).toEqual({ x: 5, y: 5 });
  });
});

describe('TapeIndicatorBarState export', () => {
  it('TAPE_BAR_INITIAL is exported with the correct shape', () => {
    const state: TapeIndicatorBarState = TAPE_BAR_INITIAL;
    expect(state).toEqual({ inIndex: null, trailIndex: null, outIndex: null });
  });

  it('TapeIndicatorBarState type accepts numeric and null indices', () => {
    const filled: TapeIndicatorBarState = { inIndex: 0, trailIndex: 5, outIndex: 7 };
    const empty: TapeIndicatorBarState = { inIndex: null, trailIndex: null, outIndex: null };
    expect(filled.inIndex).toBe(0);
    expect(empty.outIndex).toBeNull();
  });
});
