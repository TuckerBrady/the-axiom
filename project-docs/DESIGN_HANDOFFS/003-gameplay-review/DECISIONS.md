# Decisions — Handoff 003 (Gameplay Screen Review)

**Decided:** 2026-09-10 · Tucker Brady
**Answers:** `REQUIREMENTS.md` Wave 0 (DEC-1, DEC-2, DEC-3) and the six open
questions in `project-docs/SPECS/scoring-algorithm-v2.md` Part 13.

---

## DEC-1 — Scoring model: ratify v2

`scoring-algorithm-v2.md` is ratified. It supersedes the scoring system in
`CLAUDE_CONTEXT.md` and implemented in `src/game/scoring.ts`. Its status
changes from PROPOSED to **ratified**.

Answers to the six open questions in that spec's Part 13:

1. **Speed Bonus removal** — confirmed. Removed entirely; no score effect
   from elapsed time. COGS MAY still comment on time taken as color
   commentary, but it MUST NOT affect score or stars.
2. **Tape prices** — accepted as proposed: 40 CR each for TRAIL and OUT.
   Revisit only if playtesting flags it.
3. **Investment per-piece rate** — accepted as proposed: 3 pts per purchased
   active piece, capped at 17 from pieces, up to 8 more from tape use, hard
   cap 25 total.
4. **depthCeiling default** — accepted as proposed: `floorSolvePieces * 2`.
   Level designers may override per level where 2x doesn't fit.
5. **Discipline thresholds** — accepted as proposed: Systems Architect 4
   active Protocol, Drive Engineer 5 active Physics, Field Operative 3+3.
6. **COGS dialogue update** — the scoring-philosophy language in
   `DIALOGUE_SYSTEM.md` (efficiency / lean-solution framing) needs a rewrite
   to v2 language ("elaborated deeply" vs. "used efficiently"). Bundled into
   a follow-up **004 handoff**, alongside Design's two already-offered items
   (SPEC-02/UX-01 dialogue-card anchors, CONTENT-01 tape Codex entries).

This unblocks REQ-G-12, REQ-G-16, REQ-G-17 in `REQUIREMENTS.md`.

## DEC-2 — Amber: Source keeps amber, D-03 exclusivity dropped

Source stays amber (`#F0B429`) — the charge glow reads as continuous with
it. Request 001's D-03 no longer reserves amber exclusively for the Physics
beam; Physics-piece static identity may also use it. `CLAUDE_CONTEXT.md` and
`TRIBAL_KNOWLEDGE.md` §3 stand; D-03's exclusivity claim is superseded.

This unblocks REQ-G-03 and the charge-color half of REQ-G-05.

## DEC-3 — Void dialogue matrix: approved as authored

The void `resultsLine` matrix in `DIALOGUE_SYSTEM.md` (discipline × behavior
× phase, plus hub follow-ups) is approved as written. No new copy required.
The scoring-language portions of that same file get the same v2-language
pass as DEC-1 item 6, in the 004 handoff — this approval covers the void
matrix content itself, not that later language pass.

This unblocks REQ-G-08 part 2 (part 1 — the `Math.random()`-in-render fix —
ships regardless of this decision).

---

## Net effect on REQUIREMENTS.md

All Wave 0 decisions are resolved. Waves 1–3 may proceed in the order given
there. `scoring-algorithm-v2.md` should be updated to drop its PROPOSED
status and Part 13 open-questions section, or have this file linked from it,
before implementation of the scoring engine itself begins.

A 004 handoff is requested from Design to cover: the COGS dialogue
scoring-language rewrite (DEC-1 item 6), SPEC-02/UX-01 dialogue card
anchors, and CONTENT-01 tape Codex entries.
