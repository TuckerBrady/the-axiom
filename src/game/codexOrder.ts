// Canonical Codex numbering (COPY-01, Scheme A — Tucker approved 2026-06-12).
// The "ENTRY 00X" number shown in the Codex chrome bar is the order COGS
// *catalogues* the entry, not its position in any display array. This is a
// fixed design ordering so a given entry always shows the same number
// (Source is always 001), independent of the player's live progress.
//
// Scheme A: Source/Terminal are counted. Tape entries are interleaved at
// their discovery points (Input Tape + Data Trail at A1-5, Output Tape at
// A1-7). COGS's spoken "Nth entry" reveal lines in levels.ts must match
// this ordering.
//
// Kept as a standalone, dependency-free module so the numbering can be unit
// tested without importing the CodexDetailView component (which pulls in
// react-native-reanimated).
export const CODEX_DISCOVERY_ORDER: string[] = [
  'source',       // 001 — A1-1 Emergency Power
  'terminal',     // 002 — A1-1 Emergency Power
  'conveyor',     // 003 — A1-1 Emergency Power
  'gear',         // 004 — A1-2 Life Support
  'configNode',   // 005 — A1-3 Navigation Array
  'inputTape',    // 006 — A1-5 Communication Array
  'dataTrail',    // 007 — A1-5 Communication Array
  'scanner',      // 008 — A1-5 Communication Array
  'transmitter',  // 009 — A1-7 Weapons Lock
  'outputTape',   // 010 — A1-7 Weapons Lock
  // Kepler Belt and beyond — appended in discovery order as levels ship.
  'splitter',
  'merger',
  'bridge',
  'inverter',
  'counter',
  'latch',
];

// Entry number for the chrome bar. Falls back to end-of-list + 1 for any
// id not yet placed in the canonical order, so an unmapped entry still
// renders a stable, non-colliding number rather than defaulting to 001.
export function getCodexEntryNumber(id: string): number {
  const idx = CODEX_DISCOVERY_ORDER.indexOf(id);
  return idx >= 0 ? idx + 1 : CODEX_DISCOVERY_ORDER.length + 1;
}
