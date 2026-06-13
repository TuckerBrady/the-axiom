/**
 * Static analysis: CodexDetailView tag-color audit fix (PROMPT_120 Fix 3).
 *
 * Physics pieces use amber (#F0B429). Protocol pieces use cyan (#00D4FF).
 * The current accent object inverts this — Physics is rendered with the
 * blue Field-Operative tone and Protocol with the Credits copper tone.
 *
 * This test pins the accent object to the canonical engine-semantic
 * palette: Physics→amber, Protocol→cyan.
 *
 * Scope: lines 125–127 (the `accent` object) only. The screen-level
 * `atmosphereColor` on line 128 carries the same inversion but is out
 * of scope for this prompt and intentionally untouched.
 */

import * as fs from 'fs';
import * as path from 'path';

const CODEX_PATH = path.resolve(__dirname, '../../src/components/CodexDetailView.tsx');

describe('CodexDetailView — tag color audit (Fix 3)', () => {
  let source: string;
  let accentBlock: string;

  beforeAll(() => {
    source = fs.readFileSync(CODEX_PATH, 'utf-8');
    // Extract the accent ternary. Captures from `const accent = isPhysics`
    // through the `: { ... };` closer.
    // PROMPT (numbered-codex/tape entries): the accent ternary now leads with
    // the isStream (DATA STREAM tape) branch before the Physics/Protocol split.
    const match = source.match(/const accent = isStream[\s\S]*?\};/);
    accentBlock = match ? match[0] : '';
  });

  it('locates the accent block in the source', () => {
    expect(accentBlock).not.toBe('');
  });

  // The accent block has exactly two branches (Physics ? / Protocol :)
  // and four palette token candidates. Two of them are correct (amber,
  // cyan), two are the inversion (blue, copper). Whole-block presence
  // checks are sufficient and avoid brittle branch-boundary parsing
  // around object literals that contain their own `:` chars.

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

  // ── PROMPT_122 Fix 1 ──
  // The atmosphereColor ternary one line below the accent block had
  // the same Physics-blue / Protocol-copper inversion. PROMPT_120
  // scope was line 125-127 only; PROMPT_122 closes the remaining
  // inversion in CodexDetailView.tsx.
  describe('atmosphereColor ternary (Fix 1, PROMPT_122)', () => {
    let atmosphereLine: string;

    beforeAll(() => {
      const match = source.match(/const atmosphereColor = isStream[^;]*;/);
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
