# Request 004 — COGS Dialogue Language, Card Anchors, Tape Codex

Prepared for Claude Design. Repo: `TuckerBrady/the-axiom` @ `master`
(local dev name `TheTinkerer`).

## Ask

Three items, all previously identified by you (two flagged as owed in
Handoff 003's `REQUIREMENTS.md`, one raised in your own
`SKEPTIC_PLAYTEST_2026-06-09.md` as blocked on design). None are new scope
you're being asked to discover — this request is you delivering what you
already told us was outstanding, plus one piece of context that changed
since you flagged it.

1. **COGS dialogue scoring-language rewrite.** `DIALOGUE_SYSTEM.md`
   currently frames post-level commentary in v1 scoring terms — efficiency,
   lean solutions, piece count vs. optimal, "played to type" meaning
   minimal/type-focused play. Scoring v2 was ratified 2026-09-10 (see
   `project-docs/DESIGN_HANDOFFS/003-gameplay-review/DECISIONS.md`, DEC-1):
   the soul is now explicitly elaboration-rewarding — Signal Depth,
   Investment, and Diversity all score *more* pieces and *more* spending as
   better, and Discipline's "played to type" now means "elaborated deeply
   in your discipline's domain," not "used your discipline's pieces
   efficiently." Every line in `DIALOGUE_SYSTEM.md` that praises leanness,
   comments on piece-count efficiency, or implies minimal is virtuous needs
   to be re-authored against that model. This is a copy rewrite, not a
   system change — `scoring-algorithm-v2.md` Part 13's own open question #6
   ("Should [the dialogue rewrite] be a separate spec or bundled?") is
   answered here: bundled, as this request.

2. **SPEC-02 / UX-01 — COGS dialogue card pixel anchors.**
   `SKEPTIC_PLAYTEST_2026-06-09.md` flagged this and marked it explicitly
   blocked on design: exact pixel anchors for the two-position COGS
   dialogue card (where it docks in each of its two states — read that
   playtest doc for the original framing of the two positions, we're not
   restating it here). Still undefined. Needs hi-fi anchor points, same
   convention as your other `.dc.html` device-scale references.

3. **CONTENT-01 — tape Codex entry format.** IN, TRAIL, and OUT are the
   only three game objects with no Codex entry — every piece gets the
   "???" → entry-unlocked → UNDERSTOOD discovery beat when the Engineer
   first interacts with it; the tape layers never do, despite being one of
   the two stated signature moments (the tape revealing what the machine
   computed). Design the entry format — text, any diagram/visual per entry,
   unlock trigger — for all three tape roles, consistent with how a piece's
   Codex entry is structured. Check `docs/PIECE_CREATION_STANDARD.md`
   and/or wherever the existing per-piece Codex format is documented so
   this doesn't invent a second, inconsistent format.

## Scope

**Primary artifact:**

- `docs/DIALOGUE_SYSTEM.md` — the full authored dialogue matrix. Item 1
  above touches the language of existing entries; **do not restructure the
  matrix itself** (discipline × behavior × phase, plus hub follow-ups) —
  that structure is sound and already approved (Handoff 003, DEC-3). You're
  rewriting sentences, not the system.

**Secondary reading, for item 1's grounding:**

- `project-docs/SPECS/scoring-algorithm-v2.md` — the ratified scoring
  model. Sections 9 ("Discipline System Reframe," especially REQ-59) and
  Part 13 Q6 are directly relevant.
- `project-docs/DESIGN_HANDOFFS/003-gameplay-review/DECISIONS.md` — DEC-1's
  full ratification record, including which of v2's open questions were
  answered and how.

**For item 2:**

- `project-docs/SPECS/SKEPTIC_PLAYTEST_2026-06-09.md` — read the original
  finding in full; this request doesn't restate its detail.

**For item 3:**

- `docs/PIECE_CREATION_STANDARD.md` — or wherever the per-piece Codex entry
  format actually lives in the current codebase; find it before designing
  a parallel format, don't assume this doc still has the canonical
  version.
- `docs/COMPUTATIONAL_MODEL.md` — the three-layer model (Signal Path / Data
  Trail / Tape System), for what a tape's Codex entry needs to actually
  teach.

**Standard required reading, same as every prior request:**

- `docs/CLAUDE.md` (repo root) — Design Principles, especially #2 (tone is
  load-bearing, no copy changes without Tucker sign-off) and #3 (the player
  is always "the Engineer," never "you," never a chosen name before Deep
  Void).
- `docs/NARRATIVE.md` — COGS's voice: dry, precise, reluctantly warm, never
  a cheerleader, never "good job" unprompted, uses "acceptable" the way
  other people use "extraordinary."

## What's already decided — do not relitigate

- The void dialogue matrix's **structure** (discipline × behavior × phase,
  hub follow-ups) is approved as authored — Handoff 003, DEC-3. Item 1
  above is a language pass on existing lines within that structure, not a
  redesign of it.
- Scoring v2 is ratified in full, including all six of its own open
  questions (tape prices, investment rate, depthCeiling, discipline
  thresholds, Speed Bonus removed entirely — see `DECISIONS.md`). Don't
  re-ask any of those; treat v2 as locked ground truth for item 1's
  language.
- Amber (`#F0B429`) is no longer exclusive to the Physics beam — Handoff
  003 DEC-2 superseded Request 001's D-03. Source stays amber; Physics
  piece static identity may also use it. Relevant only if item 2 or 3
  touches color, which isn't expected but flagging in case a card anchor
  or Codex diagram brushes against it.
- No new player-facing copy anywhere in the game gets Tucker's sign-off by
  default — Design Principle 2. Everything in item 1 and item 3 needs
  explicit sign-off before implementation, same as every dialogue/copy
  change before it.

## What we want back

Same shape as prior requests:

1. For item 1: either a redlined `DIALOGUE_SYSTEM.md` (showing exactly
   which lines changed and why) or a standalone `DIALOGUE_REWRITE.md`
   cross-referencing the original file's entry keys — whichever makes the
   sign-off review faster. Your call.
2. For item 2: pixel anchor values for both card positions, plus a
   `.dc.html` reference at device scale if a picture earns its place (your
   judgment — this may be simple enough for values in prose).
3. For item 3: the Codex entry format for IN/TRAIL/OUT — text content per
   entry, any accompanying visual, and the unlock trigger — consistent
   with the existing per-piece format.
4. A short README indexing the bundle and what still needs Tucker's
   sign-off before implementation vs. what's ready to wire as-is, same
   convention as prior rounds.

## Explicitly out of scope

- **No change to the dialogue matrix's structure** — discipline × behavior
  × phase plus hub follow-ups stays exactly as authored. Language only.
- **No scoring changes.** v2 is ratified and locked; if item 1's language
  pass surfaces a scoring inconsistency you think should change the
  *system* rather than the *copy*, say so explicitly and stop — don't
  propose the systems change yourself.
- **No new screens or interaction patterns.** Item 2 is anchor points for
  an existing card; item 3 is content for an existing discovery mechanism
  (the Codex). Neither should require new UI patterns beyond what already
  exists for other Codex entries or dialogue cards.
- **No re-review of Handoff 003's scope.** The gameplay screen itself
  (board, tape rendering, beam animation, requisition, HUD) is fully
  implemented and closed — see AXM-004/005/006 on the mission board, all
  merged. Nothing here should touch those files except `DIALOGUE_SYSTEM.md`
  and wherever the Codex/dialogue-card components actually live.

## Context Tucker gave directly

This closes out everything you flagged as owed across Handoffs 001–003.
After this lands and gets Tucker's sign-off, REQ-G-08 parts 2–3 (wiring
the full void dialogue matrix and its board-state diagnostic — currently
stubbed with a 4-line placeholder array, see `src/game/voidQuotes.ts`) can
finally be built against real copy instead of staying blocked. There is no
Request 005 planned yet; if you find something else while you're in here,
flag it, don't fix it out of scope.
