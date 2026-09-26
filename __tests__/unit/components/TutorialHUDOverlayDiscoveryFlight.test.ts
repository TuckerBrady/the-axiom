// Pre-written by Pierce (SPEC_COGS_DISCOVERY_FLIGHT v1.1 §15.2), landed verbatim by Nash. Do not edit;
// a test believed wrong goes back to Pierce.

import * as fs from 'fs';
import * as path from 'path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8');
const src = read('src/components/TutorialHUDOverlay.tsx');
const hookSrc = read('src/hooks/useGameplayTutorial.ts');
const traySrc = read('src/components/gameplay/PieceTray.tsx');

const block = (re: RegExp) => (src.match(re) ?? [''])[0];
const runStep = block(/const runStep = useCallback\([\s\S]*?\n  \}, \[/);

describe('9.1 / 9.2 persistent orb host', () => {
  it('the orb host is not gated on phase', () => {
    expect(src).not.toMatch(/phase !== 'idle' && phase !== 'complete' && \(\s*<Animated\.View/);
  });
  it('exactly one host consumes orbX, orbY, orbOpacity', () => {
    expect((src.match(/left:\s*orbX\b/g) ?? []).length).toBe(1);
    expect((src.match(/top:\s*orbY\b/g) ?? []).length).toBe(1);
    expect((src.match(/opacity:\s*orbOpacity\b/g) ?? []).length).toBe(1);
  });
});

describe('9.3 orb movement stays on the JS driver', () => {
  it('no orbX / orbY / orbOpacity animation opts into the native driver', () => {
    for (const v of ['orbX', 'orbY', 'orbOpacity']) {
      const calls = src.match(new RegExp(`Animated\\.(timing|spring)\\(${v},[^}]*\\}`, 'g')) ?? [];
      expect(calls.length).toBeGreaterThan(0);
      for (const c of calls) expect(c).toMatch(/useNativeDriver:\s*false/);
    }
  });
});

describe('3.1 / 3.2 / 3.3 / 7.4 flight wiring', () => {
  it('imports the flight module and uses it in runStep', () => {
    expect(src).toMatch(/from '\.\.\/game\/discoveryFlight'/);
    expect(runStep).toMatch(/isPerchStep\(/);
    expect(runStep).toMatch(/computeDiscoveryPerch\(/);
  });
  it('perch flights use DISCOVERY_FLIGHT_MS', () => {
    expect(src).toMatch(/duration:\s*DISCOVERY_FLIGHT_MS/);
  });
  it('ORB_SIZE is tied to PERCH_ORB_SIZE', () => {
    expect(src).toMatch(/const ORB_SIZE = PERCH_ORB_SIZE/);
  });
  it('7.4 the overlay takes a resolveTargetPiece prop and derives board cells with boardCellLayout', () => {
    expect(src).toMatch(/resolveTargetPiece\?:\s*\(type: PieceType\) => PieceResolution/);
    expect(src).toMatch(/boardCellLayout\(/);
  });
});

describe('2.11 Presentation Mode stays the default', () => {
  it('home is still screen centre', () => {
    expect(runStep).toMatch(/let targetCx = SCREEN_W \/ 2;/);
    expect(runStep).toMatch(/let targetCy = SCREEN_H \/ 2;/);
  });
});

describe('5.1 eye colour follows the step, amber on the notice', () => {
  it("the '???' green override is gone", () => {
    expect(src).not.toMatch(/captionLabel === '\?\?\?'\s*\?\s*eyeStateColor\('green'\)/);
    expect(src).toMatch(/const eyeColor = eyeStateColor\(step\?\.eyeState\)/);
  });
});

describe('7.8 tray refs for merger and inverter', () => {
  it('the tray and the tutorial hook expose trayMerger and trayInverter', () => {
    for (const s of [traySrc, hookSrc]) {
      expect(s).toMatch(/trayMerger/);
      expect(s).toMatch(/trayInverter/);
    }
  });
});

describe('10 reduced motion', () => {
  it('reads and subscribes to the OS setting', () => {
    expect(src).toMatch(/AccessibilityInfo\.isReduceMotionEnabled\(\)/);
    expect(src).toMatch(/addEventListener\(\s*'reduceMotionChanged'/);
  });
});

describe('11.1 codex transition', () => {
  it('every animated codex slide is 600ms', () => {
    const calls = src.match(/Animated\.timing\(codexTranslate,[^}]*\}/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const c of calls) expect(c).toMatch(/duration:\s*600/);
  });
});
