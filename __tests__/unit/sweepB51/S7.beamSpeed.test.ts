// SWEEP-B51 S7 (AXM-040): beam speed. Tucker, build 51: constant pacing
// approved, too slow overall. BEAM_MS_PER_CELL 75 -> 50; the pulse-0
// slow-motion multiplier (getPulseSpeed) is unchanged.

import * as fs from 'fs';
import * as path from 'path';
import { BEAM_MS_PER_CELL } from '../../../src/game/engagement/constants';
import { beamTravelMs } from '../../../src/game/engagement/beamData';
import { getPulseSpeed } from '../../../src/game/bubbleMath';

describe('SWEEP-B51 S7: beam speed', () => {
  test('[S7-1] BEAM_MS_PER_CELL is 50', () => {
    expect(BEAM_MS_PER_CELL).toBe(50);
  });

  test('[S7-1] a 10-cell path takes 500 ms at speed 1 and 1000 ms on pulse 0', () => {
    const cell = 48;
    expect(getPulseSpeed(1)).toBe(1.0);
    expect(getPulseSpeed(0)).toBe(2.0);
    expect(beamTravelMs(10 * cell, cell, getPulseSpeed(1))).toBeCloseTo(500);
    expect(beamTravelMs(10 * cell, cell, getPulseSpeed(0))).toBeCloseTo(1000);
  });

  test('[S7-2] ANIMATION_RULES.md records the change', () => {
    const doc = fs
      .readFileSync(path.resolve(__dirname, '../../../docs/ANIMATION_RULES.md'), 'utf8')
      .replace(/\r\n/g, '\n');
    const updates = doc.slice(doc.indexOf('## Updates'));
    expect(doc.indexOf('## Updates')).toBeGreaterThan(-1);
    expect(updates).toContain(
      '2026-09-27 (SWEEP-B51 S7): BEAM_MS_PER_CELL 75 -> 50 at Tucker\'s request (constant pacing kept, overall speed raised). Pulse 0 keeps its 2.0 multiplier.',
    );
  });
});
