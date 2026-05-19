/**
 * Static analysis: CodexScreen Physics/Protocol palette audit (PROMPT_123).
 *
 * Same engine-semantic palette rule applied to CodexDetailView in
 * PROMPT_120 (accent) and PROMPT_122 (atmosphereColor):
 *   Physics  → amber (#F0B429, rgba(240,180,41,...))
 *   Protocol → cyan  (#00D4FF, rgba(0,212,255,...))
 *
 * CodexScreen had both objects inverted — Physics blue, Protocol
 * copper. This guard pins each to the canonical palette and
 * forbids the inverted tokens from creeping back in.
 *
 * Detection style matches CodexDetailView.audit.test.ts: extract
 * the source span for each color expression (accent ternary,
 * atmosphereColor line), then run whole-block substring presence
 * and absence checks. Avoids brittle branch-boundary parsing
 * around object literals that contain their own `:` chars.
 */

import * as fs from 'fs';
import * as path from 'path';

const CODEX_PATH = path.resolve(__dirname, '../../src/screens/CodexScreen.tsx');

describe('CodexScreen — Physics/Protocol palette audit', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(CODEX_PATH, 'utf-8');
  });

  describe('accent object ternary (Fix 1)', () => {
    let accentBlock: string;

    beforeAll(() => {
      const match = source.match(/const accent = isPhysics[\s\S]*?\};/);
      accentBlock = match ? match[0] : '';
    });

    it('locates the accent block in the source', () => {
      expect(accentBlock).not.toBe('');
    });

    it('uses amber (rgba(240,180,41,...)) for the Physics branch', () => {
      expect(accentBlock).toContain('rgba(240,180,41');
    });

    it('uses cyan (rgba(0,212,255,...)) for the Protocol branch', () => {
      expect(accentBlock).toContain('rgba(0,212,255');
    });

    it('does NOT use blue (rgba(74,158,255,...)) anywhere in the accent block', () => {
      expect(accentBlock).not.toContain('rgba(74,158,255');
    });

    it('does NOT use copper (rgba(200,121,65,...)) anywhere in the accent block', () => {
      expect(accentBlock).not.toContain('rgba(200,121,65');
    });
  });

  describe('atmosphereColor ternary (Fix 2)', () => {
    let atmosphereLine: string;

    beforeAll(() => {
      const match = source.match(/const atmosphereColor = isPhysics[^;]*;/);
      atmosphereLine = match ? match[0] : '';
    });

    it('locates the atmosphereColor ternary in the source', () => {
      expect(atmosphereLine).not.toBe('');
    });

    it('Physics branch uses amber (rgba(240,180,41,...))', () => {
      expect(atmosphereLine).toContain('rgba(240,180,41');
    });

    it('Protocol branch uses cyan (rgba(0,212,255,...))', () => {
      expect(atmosphereLine).toContain('rgba(0,212,255');
    });

    it('does NOT use blue (rgba(74,158,255,...))', () => {
      expect(atmosphereLine).not.toContain('rgba(74,158,255');
    });

    it('does NOT use copper (rgba(200,121,65,...))', () => {
      expect(atmosphereLine).not.toContain('rgba(200,121,65');
    });
  });
});
