// AXM-036 P4a (F13b) — "the shimmer starts at the Scanner, not at the
// Source" (Tucker). A segment carries data once the beam has passed a
// piece that reads a bit into the beam's story (Scanner, Inverter,
// Latch) or transforms it — never a Config Node, which gates without
// attaching anything.

import { deriveSegmentDataFlags, DATA_ONSET_TYPES } from '../../../src/game/engagement/beamData';
import { shimmer, SHIMMER_PERIOD_MS } from '../../../src/game/engagement/constants';

const step = (type: string, success?: boolean) => ({ type, success });

describe('[P4a-7] deriveSegmentDataFlags', () => {
  it('scanner starts data', () => {
    const steps = [
      step('source'),
      step('conveyor'),
      step('scanner'),
      step('conveyor'),
      step('configNode'),
      step('conveyor'),
      step('terminal'),
    ];
    expect(deriveSegmentDataFlags(steps)).toEqual([false, false, true, true, true, true]);
  });

  it('config node alone does not start data (A1-3)', () => {
    const steps = [step('source'), step('conveyor'), step('configNode'), step('conveyor'), step('terminal')];
    expect(deriveSegmentDataFlags(steps)).toEqual([false, false, false, false]);
  });

  it('blocked run keeps flags up to the block', () => {
    const steps = [step('source'), step('scanner'), step('conveyor'), step('configNode', false)];
    expect(deriveSegmentDataFlags(steps)).toEqual([false, true, true]);
  });

  it('carryIn marks every segment', () => {
    const steps = [step('source'), step('conveyor'), step('conveyor'), step('terminal')];
    expect(deriveSegmentDataFlags(steps, true)).toEqual([true, true, true]);
  });

  it('empty and single-step paths give []', () => {
    expect(deriveSegmentDataFlags([])).toEqual([]);
    expect(deriveSegmentDataFlags([step('source')])).toEqual([]);
  });

  it('a failed onset step does not start data', () => {
    const steps = [step('source'), step('scanner', false), step('conveyor'), step('terminal')];
    expect(deriveSegmentDataFlags(steps)).toEqual([false, false, false]);
  });

  it('inverter and latch are onset types too', () => {
    expect(DATA_ONSET_TYPES.has('scanner')).toBe(true);
    expect(DATA_ONSET_TYPES.has('inverter')).toBe(true);
    expect(DATA_ONSET_TYPES.has('latch')).toBe(true);
    expect(DATA_ONSET_TYPES.has('configNode')).toBe(false);
    expect(DATA_ONSET_TYPES.has('source')).toBe(false);
  });
});

describe('[P4a-8] shimmer', () => {
  it('shimmer(0) is 0.5', () => {
    expect(shimmer(0)).toBeCloseTo(0.5);
  });

  it('shimmer(150) is 1 (quarter period)', () => {
    expect(shimmer(150)).toBeCloseTo(1);
  });

  it('shimmer(450) is 0 (three-quarter period)', () => {
    expect(shimmer(450)).toBeCloseTo(0);
  });

  it('shimmer(600) is 0.5 (full period)', () => {
    expect(shimmer(SHIMMER_PERIOD_MS)).toBeCloseTo(0.5, 6);
  });

  it('stays within [0, 1] across a full sweep', () => {
    for (let t = 0; t <= 1200; t += 10) {
      const v = shimmer(t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
