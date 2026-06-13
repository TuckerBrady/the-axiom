# Numbered Codex + Tape Codex Entries

Decision record. Resolves walkthrough findings **COPY-01** (numbered codex) and
**CONTENT-01** (tape codex entries) from the A1-1..A1-8 QA walkthrough
(2026-06-09). Approved by Tucker 2026-06-12.

## Problem

1. **COPY-01.** The Codex "ENTRY 00X" number was a static array index, and the
   in-tutorial reveal (`TutorialHUDOverlay`) opened `CodexDetailView` without an
   `entryNumber`, so every gameplay reveal showed **ENTRY 001**. COGS's spoken
   "Nth entry" reveal lines were also self-contradictory (Source = "first entry"
   / Terminal = "two entries", but Gear = "two entries in two missions", Config
   Node = "three entries", Transmitter = "five entries").
2. **CONTENT-01.** The tape system (IN / TRAIL / OUT) was narrated in passing but
   never catalogued. Tapes should get the same `???` -> Codex discovery flow as
   pieces (Axiom sector).

## Decision

### Numbering — Scheme A (count everything, in discovery order)

The "ENTRY 00X" number is the order COGS *catalogues* the entry. Source and
Terminal are counted. Tapes are interleaved at their discovery points. Canonical
order lives in `src/game/codexOrder.ts` (`CODEX_DISCOVERY_ORDER` /
`getCodexEntryNumber`):

| # | Entry | Where |
|---|-------|-------|
| 001 | Source | A1-1 |
| 002 | Terminal | A1-1 |
| 003 | Conveyor | A1-1 |
| 004 | Gear | A1-2 |
| 005 | Config Node | A1-3 |
| 006 | Input Tape | A1-5 |
| 007 | Data Trail | A1-5 |
| 008 | Scanner | A1-5 |
| 009 | Transmitter | A1-7 |
| 010 | Output Tape | A1-7 |

Kepler+ pieces append after. COGS's spoken reveal counts were reconciled to
match (Gear -> "Four entries now", Config Node -> "Five entries", Scanner ->
"Eighth entry", Transmitter -> "Nine entries", plus the new tape reveals).

### Tape entries — DATA STREAM type

Tapes are catalogued as a third Codex entry type, `Stream`, badged **DATA
STREAM** (they are neither Physics nor Protocol). They use the tape bar colors
(IN `#BFFF3F`, TRAIL `#A97FDB`, OUT `#FF7D3F`), a dedicated hero glyph, and a
tape-strip field simulation instead of `PieceIcon` / `PieceSimulation`. Copy
(descriptions + COGS notes) approved as drafted.

Discovery flow mirrors pieces: a `*-notice` step (amber, `codexEntryId`, `???`
caption) -> tap opens the Codex entry -> a `*-reveal` step (green, named, entry
count). IN + TRAIL catalogued at A1-5; OUT at A1-7.

## Implementation

- `src/game/codexOrder.ts` — canonical numbering (dependency-free, unit tested).
- `src/components/CodexDetailView.tsx` — `Stream` type, three tape entries,
  `TapeGlyph` / `TapeFieldStrip` / `hexToRgba` (exported for reuse), wires
  `entryNumber` at the reveal call site.
- `src/screens/CodexScreen.tsx` — tape entries in the library grid + detail, a
  "Tapes" filter, shared tape rendering.
- `src/game/levels.ts` — A1-5 and A1-7 tape notice/reveal steps; reconciled
  reveal counts on Gear / Config Node / Scanner / Transmitter.

Design mock: `design/mockups/codex-numbering-and-tape-entries.html`.

## Out of scope (separate PR)

A1-7 OUT-tape highlight should fire on **Terminal arrival** for **any** value
(not when the Transmitter fires, not keyed to value=1), with arrival-fill cell
styling. Engine change in `src/game/engagement/interactions.ts` — tracked
separately.
