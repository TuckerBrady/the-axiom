/**
 * COPY-01 — Numbered Codex by discovery order (Scheme A, Tucker approved
 * 2026-06-12). The "ENTRY 00X" chrome-bar number is the order COGS
 * catalogues the entry, not its position in CODEX_PIECES. Before this fix
 * the tutorial reveal called CodexDetailView without entryNumber, so every
 * reveal showed "ENTRY 001".
 */
import {
  CODEX_DISCOVERY_ORDER,
  getCodexEntryNumber,
} from '../../src/game/codexOrder';

describe('Codex numbering — discovery order (Scheme A)', () => {
  it('numbers the Axiom sector entries 001..010 in discovery order', () => {
    expect(getCodexEntryNumber('source')).toBe(1);
    expect(getCodexEntryNumber('terminal')).toBe(2);
    expect(getCodexEntryNumber('conveyor')).toBe(3);
    expect(getCodexEntryNumber('gear')).toBe(4);
    expect(getCodexEntryNumber('configNode')).toBe(5);
    expect(getCodexEntryNumber('inputTape')).toBe(6);
    expect(getCodexEntryNumber('dataTrail')).toBe(7);
    expect(getCodexEntryNumber('scanner')).toBe(8);
    expect(getCodexEntryNumber('transmitter')).toBe(9);
    expect(getCodexEntryNumber('outputTape')).toBe(10);
  });

  it('counts Source and Terminal as numbered entries (Scheme A, not B)', () => {
    // Scheme B would leave these unnumbered; Scheme A numbers them 1 and 2.
    expect(getCodexEntryNumber('source')).toBe(1);
    expect(getCodexEntryNumber('terminal')).toBe(2);
  });

  it('has no duplicate ids in the canonical order', () => {
    const unique = new Set(CODEX_DISCOVERY_ORDER);
    expect(unique.size).toBe(CODEX_DISCOVERY_ORDER.length);
  });

  it('returns a stable, non-colliding fallback for unmapped ids', () => {
    const fallback = getCodexEntryNumber('nonexistent-piece');
    expect(fallback).toBe(CODEX_DISCOVERY_ORDER.length + 1);
    // Fallback must never collide with a real entry number.
    expect(fallback).toBeGreaterThan(CODEX_DISCOVERY_ORDER.length);
  });
});
