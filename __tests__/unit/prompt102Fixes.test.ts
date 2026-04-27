// Source-contract guards for Prompt 102 — tagline on LoginScreen
// and A1-1 batch collection flow. Each describe block pins one fix
// so a future refactor can't silently regress it.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const loginSrc = read('src/screens/onboarding/LoginScreen.tsx');
const overlayHudSrc = read('src/components/TutorialHUDOverlay.tsx');
const levelsSrc = read('src/game/levels.ts');
const codexDetailSrc = read('src/components/CodexDetailView.tsx');

describe('Prompt 102 — tagline + A1-1 batch collection', () => {
  describe('Task 1: Tagline on LoginScreen', () => {
    it('renders the tagline "not all damage is structural"', () => {
      expect(loginSrc).toContain('not all damage is structural');
    });

    it('tagline uses Animated.Text so it can fade in', () => {
      expect(loginSrc).toMatch(/Animated\.Text[\s\S]*?not all damage is structural/);
    });

    it('taglineReveal shared value exists', () => {
      expect(loginSrc).toMatch(/taglineReveal\s*=\s*useSharedValue\(0\)/);
    });

    it('tagline animation starts before button animation (lower delay)', () => {
      // Tagline delay must be < contentReveal delay so button appears after tagline
      const taglineDelayMatch = loginSrc.match(/taglineReveal\.value\s*=\s*withDelay\((\d+)/);
      const buttonDelayMatch = loginSrc.match(/contentReveal\.value\s*=\s*withDelay\((\d+)/);
      expect(taglineDelayMatch).not.toBeNull();
      expect(buttonDelayMatch).not.toBeNull();
      const taglineDelay = parseInt(taglineDelayMatch![1], 10);
      const buttonDelay = parseInt(buttonDelayMatch![1], 10);
      expect(taglineDelay).toBeLessThan(buttonDelay);
    });

    it('tagline animation duration is at least 600ms (design principle)', () => {
      const match = loginSrc.match(/taglineReveal\.value\s*=\s*withDelay\(\d+,\s*withTiming\(1,\s*\{\s*duration:\s*(\d+)/);
      expect(match).not.toBeNull();
      expect(parseInt(match![1], 10)).toBeGreaterThanOrEqual(600);
    });

    it('button animation duration is at least 600ms (design principle)', () => {
      const match = loginSrc.match(/contentReveal\.value\s*=\s*withDelay\(\d+,\s*withTiming\(1,\s*\{\s*duration:\s*(\d+)/);
      expect(match).not.toBeNull();
      expect(parseInt(match![1], 10)).toBeGreaterThanOrEqual(600);
    });

    it('button delay starts after tagline would be visible (delay + duration)', () => {
      const taglineDelayMatch = loginSrc.match(/taglineReveal\.value\s*=\s*withDelay\((\d+),\s*withTiming\(1,\s*\{\s*duration:\s*(\d+)/);
      const buttonDelayMatch = loginSrc.match(/contentReveal\.value\s*=\s*withDelay\((\d+)/);
      expect(taglineDelayMatch).not.toBeNull();
      expect(buttonDelayMatch).not.toBeNull();
      const taglineStart = parseInt(taglineDelayMatch![1], 10);
      const taglineDuration = parseInt(taglineDelayMatch![2], 10);
      const buttonDelay = parseInt(buttonDelayMatch![1], 10);
      // Button must not start before tagline completes
      expect(buttonDelay).toBeGreaterThanOrEqual(taglineStart + taglineDuration);
    });

    it('tagline style uses muted color (opacity below 0.6)', () => {
      const match = loginSrc.match(/tagline:\s*\{[\s\S]*?color:\s*'rgba\([\d,]+,\s*([\d.]+)\)'/);
      expect(match).not.toBeNull();
      const alpha = parseFloat(match![1]);
      expect(alpha).toBeLessThan(0.6);
    });
  });

  describe('Task 2: A1-1 batch collection flow', () => {
    it('A1-1 has exactly 3 steps with codexEntryId (source, terminal, conveyor)', () => {
      const a11Match = levelsSrc.match(/levelA1_1[\s\S]*?tutorialSteps:\s*\[([\s\S]*?)\n  \],/);
      expect(a11Match).not.toBeNull();
      const stepsBlock = a11Match![1];
      const codexIds = [...stepsBlock.matchAll(/codexEntryId:\s*'(\w+)'/g)].map(m => m[1]);
      expect(codexIds).toHaveLength(3);
      expect(codexIds).toContain('source');
      expect(codexIds).toContain('terminal');
      expect(codexIds).toContain('conveyor');
    });

    it('TutorialHUDOverlay handles A1-1 source step silently (no codex popup)', () => {
      expect(overlayHudSrc).toMatch(/levelId === 'A1-1'[\s\S]*?codexEntryId === 'source'[\s\S]*?advanceStep/);
    });

    it('TutorialHUDOverlay handles A1-1 terminal step silently (no codex popup)', () => {
      expect(overlayHudSrc).toMatch(/levelId === 'A1-1'[\s\S]*?codexEntryId === 'terminal'[\s\S]*?advanceStep/);
    });

    it('TutorialHUDOverlay shows one combined codex on conveyor step for A1-1', () => {
      expect(overlayHudSrc).toMatch(/levelId === 'A1-1'[\s\S]*?codexEntryId === 'conveyor'[\s\S]*?setCodexVisible\(true\)/);
    });

    it('A1-1 conveyor batch marks source and terminal discovered', () => {
      const conveyorBlock = overlayHudSrc.match(/levelId === 'A1-1'[\s\S]*?codexEntryId === 'conveyor'[\s\S]*?setCodexVisible\(true\)/);
      expect(conveyorBlock).not.toBeNull();
      expect(conveyorBlock![0]).toMatch(/markDiscovered\('source'\)/);
      expect(conveyorBlock![0]).toMatch(/markDiscovered\('terminal'\)/);
      expect(conveyorBlock![0]).toMatch(/markDiscovered\('conveyor'\)/);
    });

    it('CodexDetailView accepts alsoCollected prop', () => {
      expect(codexDetailSrc).toMatch(/alsoCollected\?:\s*PieceEntry\[\]/);
    });

    it('CodexDetailView renders alsoCollected section when provided', () => {
      expect(codexDetailSrc).toMatch(/alsoCollected[\s\S]*?ALSO CATALOGUED/);
    });

    it('codexAlsoCollected state exists in TutorialHUDOverlay', () => {
      expect(overlayHudSrc).toMatch(/codexAlsoCollected[\s\S]*?useState/);
    });

    it('codexAlsoCollected is cleared when codex is dismissed', () => {
      expect(overlayHudSrc).toMatch(/setCodexAlsoCollected\(\[\]\)/);
    });
  });
});
