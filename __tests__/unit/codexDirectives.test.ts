// SE-TM-034 — Codex Directives data. Guards the entry set (six RFC-2119 terms
// + the Spec Sheet meta-entry), shape, and that no emoji leaked into COGS copy.

import { CODEX_DIRECTIVES, getDirectiveEntry } from '../../src/game/codexDirectives';

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

describe('CODEX_DIRECTIVES', () => {
  it('contains the six RFC-2119 terms plus the Spec Sheet meta-entry', () => {
    const ids = CODEX_DIRECTIVES.map(d => d.id).sort();
    expect(ids).toEqual(['can', 'may', 'must', 'shall', 'should', 'specSheet', 'will'].sort());
  });

  it('exactly one meta entry (the Spec Sheet panel); the rest are directives', () => {
    const meta = CODEX_DIRECTIVES.filter(d => d.kind === 'meta');
    expect(meta).toHaveLength(1);
    expect(meta[0].id).toBe('specSheet');
    expect(CODEX_DIRECTIVES.filter(d => d.kind === 'directive')).toHaveLength(6);
  });

  it('every entry has non-empty term, oneLine, cogsNote, firstEncountered', () => {
    for (const d of CODEX_DIRECTIVES) {
      expect(d.term.trim().length).toBeGreaterThan(0);
      expect(d.oneLine.trim().length).toBeGreaterThan(0);
      expect(d.cogsNote.trim().length).toBeGreaterThan(0);
      expect(d.firstEncountered.trim().length).toBeGreaterThan(0);
    }
  });

  it('no emoji anywhere in directive copy (Design Principle 1)', () => {
    for (const d of CODEX_DIRECTIVES) {
      expect(EMOJI.test(`${d.term} ${d.oneLine} ${d.cogsNote}`)).toBe(false);
    }
  });

  it('CAN is documented as Codex-only (never a Spec Sheet label)', () => {
    const can = getDirectiveEntry('can');
    expect(can).not.toBeNull();
    expect(can!.firstEncountered).toContain('Codex');
  });

  it('getDirectiveEntry returns null for an unknown id', () => {
    expect(getDirectiveEntry('nope')).toBeNull();
  });
});
