// Source-contract guards for Prompt 92 — COGS dialogue accuracy,
// codex collection order, tutorial polish. Each describe block pins
// one fix so a future refactor can't silently regress it.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const screenSrc = read('src/screens/GameplayScreen.tsx');
const levelsSrc = read('src/game/levels.ts');
const overlaySrc = read('src/components/TutorialHUDOverlay.tsx');
const codexScreenSrc = read('src/screens/CodexScreen.tsx');

describe('Prompt 92 — COGS dialogue + codex polish', () => {
  describe('Fix 1 — dynamic pulse-count text', () => {
    it('does not hardcode "Three pulses were required"', () => {
      expect(screenSrc).not.toMatch(/Three pulses were required/);
    });

    it('interpolates pulseResultData.required into the failure text', () => {
      expect(screenSrc).toMatch(
        /\$\{pulseResultData\.required\} pulse\$\{pulseResultData\.required === 1 \? '' : 's'\}/,
      );
    });

    it('uses singular/plural agreement (was/were)', () => {
      expect(screenSrc).toMatch(
        /pulseResultData\.required === 1 \? 'was' : 'were'/,
      );
    });
  });

  describe('Fix 3+4 — A1-1 codex collection order', () => {
    it('removes the standalone codex-intro step (codex is taught through collection)', () => {
      const a11 = levelsSrc.match(/levelA1_1:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a11).not.toBeNull();
      expect(a11?.[0]).not.toMatch(/id: 'codex-intro'/);
    });

    it("adds source-collect step targeting the Source port with codexEntryId 'source'", () => {
      const a11 = levelsSrc.match(/levelA1_1:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a11?.[0]).toMatch(
        /id: 'source-collect'[\s\S]*?targetRef: 'sourceNode'[\s\S]*?codexEntryId: 'source'/,
      );
    });

    it("adds terminal-collect step targeting the Output port with codexEntryId 'terminal'", () => {
      const a11 = levelsSrc.match(/levelA1_1:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a11?.[0]).toMatch(
        /id: 'terminal-collect'[\s\S]*?targetRef: 'outputNode'[\s\S]*?codexEntryId: 'terminal'/,
      );
    });

    it('keeps the conveyor-collect step', () => {
      const a11 = levelsSrc.match(/levelA1_1:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a11?.[0]).toMatch(
        /id: 'conveyor-collect'[\s\S]*?codexEntryId: 'conveyor'/,
      );
    });
  });

  describe('Fix 5 — A1-5 output-tape-intro removed', () => {
    it("does not target outputTapeRow on A1-5 (the OUT row doesn't render until a Transmitter exists)", () => {
      const a15 = levelsSrc.match(/levelA1_5:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a15).not.toBeNull();
      expect(a15?.[0]).not.toMatch(/targetRef: 'outputTapeRow'/);
      expect(a15?.[0]).not.toMatch(/id: 'output-tape-intro'/);
    });

    it('still introduces the input tape and data trail on A1-5', () => {
      const a15 = levelsSrc.match(/levelA1_5:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a15?.[0]).toMatch(/id: 'input-tape-intro'[\s\S]*?targetRef: 'inputTapeRow'/);
      expect(a15?.[0]).toMatch(/id: 'data-trail-intro'[\s\S]*?targetRef: 'dataTrailRow'/);
    });
  });

  describe('Fix 6 — Tutorial glow brightness', () => {
    it('morphPortalIn settles glowOpacity at 0.85 (was 0.45)', () => {
      // Match the timing block whose toValue feeds glowOpacity. We
      // pin "0.85" inside the glowOpacity block so a future refactor
      // can't silently revert.
      expect(overlaySrc).toMatch(
        /Animated\.timing\(glowOpacity,\s*\{[\s\S]*?toValue:\s*0\.85/,
      );
      expect(overlaySrc).not.toMatch(
        /Animated\.timing\(glowOpacity,\s*\{[\s\S]*?toValue:\s*0\.45/,
      );
    });

    it('glow pulse oscillates between 0.7 and 1.0 (was 0..1)', () => {
      // The pulse loop sets the bottom of the range to 0.7 (was 0).
      // We assert the loop body contains both bounds.
      const loop = overlaySrc.match(
        /\/\/ ── Glow pulse loop ──[\s\S]*?\}, \[showPieceGlow/,
      );
      expect(loop).not.toBeNull();
      expect(loop?.[0]).toMatch(/toValue:\s*1,/);
      expect(loop?.[0]).toMatch(/toValue:\s*0\.7,/);
      // setValue at start matches the pulse floor so the first frame
      // is bright, not dim.
      expect(loop?.[0]).toMatch(/glowPulse\.setValue\(0\.7\)/);
    });
  });

  describe('Fix 8 — Codex discovery gating', () => {
    it('CodexScreen reads discoveredIds from useCodexStore', () => {
      expect(codexScreenSrc).toMatch(/from '\.\.\/store\/codexStore'/);
      expect(codexScreenSrc).toMatch(/useCodexStore\(s => s\.discoveredIds\)/);
    });

    it('declares getEffectiveStatus that gates on SHOW_DEV_TOOLS or discovery', () => {
      expect(codexScreenSrc).toMatch(/function getEffectiveStatus/);
      expect(codexScreenSrc).toMatch(/SHOW_DEV_TOOLS/);
      expect(codexScreenSrc).toMatch(/discovered\.has\(entry\.id\)/);
    });

    it('SectionView projects PIECES through the discovery gate', () => {
      expect(codexScreenSrc).toMatch(
        /const projected = PIECES\.map\(p => \(\{[\s\S]*?status: getEffectiveStatus/,
      );
    });

    it('redacted entries stay redacted regardless of dev-tools state', () => {
      expect(codexScreenSrc).toMatch(
        /if \(entry\.status === 'redacted'\) return 'redacted'/,
      );
    });

    it('TutorialHUDOverlay marks the codex piece discovered when the codex view opens', () => {
      expect(overlaySrc).toMatch(/from '\.\.\/store\/codexStore'/);
      expect(overlaySrc).toMatch(
        /useCodexStore\.getState\(\)\.markDiscovered\(step\.codexEntryId\)/,
      );
    });

    it('RootNavigator hydrates the codex store on mount', () => {
      const navSrc = read('src/navigation/RootNavigator.tsx');
      expect(navSrc).toMatch(/from '\.\.\/store\/codexStore'/);
      expect(navSrc).toMatch(/useCodexStore\.getState\(\)\.hydrate\(\)/);
    });
  });

  describe('Fix 9 — Codex header copy (Pokemon collecting flavor)', () => {
    it('home greeting mentions the compulsion to catalog', () => {
      expect(codexScreenSrc).toMatch(/compulsion to catalog/);
    });

    it('keeps a dynamic entry count in the greeting', () => {
      expect(codexScreenSrc).toMatch(/\$\{unlocked\} entries logged/);
    });

    it("does not retain the old 'You are making adequate progress' boilerplate", () => {
      expect(codexScreenSrc).not.toMatch(/You are making adequate progress/);
    });
  });

  describe('Fix 7 — A1-4 direction enforcement (TODO/blocker only)', () => {
    it('records a TODO comment in A1-4 referencing min_direction_changes', () => {
      const a14 = levelsSrc.match(/levelA1_4:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a14).not.toBeNull();
      expect(a14?.[0]).toMatch(/min_direction_changes/);
      expect(a14?.[0]).toMatch(/Out of scope for Prompt 92/);
    });
  });
});
