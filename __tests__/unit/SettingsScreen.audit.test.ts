/**
 * Static analysis: SettingsScreen UX audit fixes (PROMPT_120).
 *
 * Fix 1 — UNKNOWN BUILD fallback:
 *   Constants.expoConfig?.extra?.commitHash is undefined in Expo web
 *   dev. Settings must fall back to the legacy `manifest` API so the
 *   dev-build codename resolves on web as well as native dev.
 *
 * Fix 2A — Cogs Hints toggle sub-label:
 *   "Show AI tips during levels" → "Show COGS hints during levels"
 *   (COGS is a droid in out-of-gameplay chrome, never an "AI").
 *
 * Fix 2B — About credit:
 *   "Cogs AI v2.1 · All systems nominal." → "C.O.G.S Unit 7 · …".
 */

import * as fs from 'fs';
import * as path from 'path';

const SETTINGS_PATH = path.resolve(__dirname, '../../src/screens/SettingsScreen.tsx');

describe('SettingsScreen — UX audit round 1', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(SETTINGS_PATH, 'utf-8');
  });

  describe('Fix 1 — UNKNOWN BUILD fallback', () => {
    it('falls back to Constants.manifest.extra.commitHash when expoConfig.extra is undefined', () => {
      // The two-level fallback chain must be present in the dev-codename block.
      expect(source).toMatch(
        /Constants\.expoConfig\?\.extra\?\.commitHash[\s\S]*?manifest\?\.extra\?\.commitHash/,
      );
    });

    it('still preserves the final unknown sentinel for the "UNKNOWN BUILD" path', () => {
      expect(source).toContain("'unknown'");
    });
  });

  describe('Fix 2A — Cogs Hints toggle sub-label', () => {
    it('does not contain "Show AI tips during levels"', () => {
      expect(source).not.toContain('Show AI tips during levels');
    });

    it('contains "Show COGS hints during levels"', () => {
      expect(source).toContain('Show COGS hints during levels');
    });
  });

  describe('Fix 2B — About credit', () => {
    it('does not contain "Cogs AI v2.1"', () => {
      expect(source).not.toContain('Cogs AI v2.1');
    });

    it('contains "C.O.G.S Unit 7"', () => {
      expect(source).toContain('C.O.G.S Unit 7');
    });
  });

  describe('Fix 2 — global word-boundary check on rendered string literals', () => {
    // Strip imports and identifiers — only inspect quoted string content that
    // could appear as visible UI text. This guards against new occurrences of
    // standalone "AI" in any future copy on this screen while tolerating
    // common false positives like "wait", "available", "Snail", etc.
    it('no rendered string literal contains the standalone word "AI"', () => {
      const stringLiterals = source.match(/(["'`])((?:\\.|(?!\1).)*)\1/g) ?? [];
      const visibleStringLiterals = stringLiterals
        .map(s => s.slice(1, -1))
        .filter(s => /\s/.test(s) || /^[A-Z][a-z]/.test(s));
      const offenders = visibleStringLiterals.filter(s => /\bAI\b/.test(s));
      expect(offenders).toEqual([]);
    });
  });
});
