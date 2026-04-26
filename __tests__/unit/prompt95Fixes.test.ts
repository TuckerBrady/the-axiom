// Source-contract guards for the safe subset of Prompt 95 — Fix 6
// (StarField memo), Fix 7 (safety-timer separation), Fix 8.2
// (playerPieces memo). Larger extractions (BeamOverlay, BoardPiece,
// WireOverlay, TapeRow) are tracked as follow-up work; their prompt
// code samples don't match the actual data shape (see LAST_REPORT
// "Creative interpretation calls").

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const screenSrc = read('src/screens/GameplayScreen.tsx');
const beamSrc = read('src/game/engagement/beamAnimation.ts');
const typesSrc = read('src/game/engagement/types.ts');
const starFieldSrc = read('src/components/StarField.tsx');

describe('Prompt 95 (safe subset) — render-perf cleanup', () => {
  describe('Fix 6 — StarField is React.memo', () => {
    it('exports a React.memo-wrapped default', () => {
      expect(starFieldSrc).toMatch(
        /export default React\.memo\(StarFieldComponent\)/,
      );
    });

    it('inner component is named (not anonymous)', () => {
      expect(starFieldSrc).toMatch(/function StarFieldComponent\(/);
    });
  });

  describe('Fix 7 — safety timers held in their own ref', () => {
    it('EngagementContext declares a separate safetyTimersRef field', () => {
      expect(typesSrc).toMatch(
        /safetyTimersRef:\s*MutableRefObject<ReturnType<typeof setTimeout>\[\]>/,
      );
    });

    it('beamAnimation pushes the 8s safety timer to safetyTimersRef, not flashTimersRef', () => {
      // The push site that previously read `ctx.flashTimersRef.current.push(safetyTimer)`
      // now reads `ctx.safetyTimersRef.current.push(safetyTimer)`.
      const safetyBlock = beamSrc.match(
        /const safetyTimer = setTimeout[\s\S]*?\.push\(safetyTimer\)/,
      );
      expect(safetyBlock).not.toBeNull();
      expect(safetyBlock?.[0]).toMatch(/safetyTimersRef\.current\.push\(safetyTimer\)/);
      expect(safetyBlock?.[0]).not.toMatch(/flashTimersRef\.current\.push\(safetyTimer\)/);
    });

    it('GameplayScreen declares safetyTimersRef and threads it into the EngagementContext', () => {
      expect(screenSrc).toMatch(
        /const safetyTimersRef = useRef<ReturnType<typeof setTimeout>\[\]>\(\[\]\)/,
      );
      // Threaded into the context object (alongside flashTimersRef).
      expect(screenSrc).toMatch(/flashTimersRef,\s*\n\s*safetyTimersRef,/);
    });

    it('GameplayScreen unmount + handleReset clear the safety timers', () => {
      // Two cleanup callsites should sweep safety timers (unmount,
      // handleReset). The per-pulse loop sweep does NOT touch them
      // — that's the bug Fix 7 was preventing.
      const sweeps = screenSrc.match(
        /safetyTimersRef\.current\.forEach\(t => clearTimeout\(t\)\);\s*safetyTimersRef\.current = \[\];/g,
      ) ?? [];
      expect(sweeps.length).toBeGreaterThanOrEqual(2);
    });

    it('the per-pulse flash-timer sweep does NOT touch safetyTimersRef', () => {
      // The pulse-loop sweep block must clear flashTimersRef without
      // also nuking safetyTimersRef. We pin this by extracting the
      // loop-anchored sweep block and asserting only flashTimers
      // appears inside it.
      const loopSweep = screenSrc.match(
        /for \(let p = 0; p < pulses\.length; p\+\+\) \{[\s\S]*?await engageRunPulse/,
      );
      expect(loopSweep).not.toBeNull();
      expect(loopSweep?.[0]).toMatch(/flashTimersRef\.current\.forEach/);
      expect(loopSweep?.[0]).not.toMatch(/safetyTimersRef/);
    });
  });

  describe('Fix 8.2 — playerPieces memoized', () => {
    it('playerPieces is wrapped in useMemo keyed on pieces', () => {
      expect(screenSrc).toMatch(
        /const playerPieces = useMemo\(\s*\(\)\s*=>\s*pieces\.filter\(p => !p\.isPrePlaced\),\s*\[pieces\],?\s*\)/,
      );
    });
  });
});
