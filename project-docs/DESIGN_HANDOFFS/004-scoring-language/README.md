# Handoff 004 — COGS Scoring Language

**Requested:** 2026-09-10 by Tucker, in `003-gameplay-review/DECISIONS.md`
**Delivered:** 2026-09-10
**Repo:** `TuckerBrady/the-axiom` @ `master` (tree `b2990bc66f20`)

---

## Scope correction, before anything else

The 004 request asked for three things. **Two of them already exist in the
repo** — delivered after the June playtest report that flagged them, which is
the document I was reading when I offered to do them. I am not rebuilding
them. Evidence:

**SPEC-02 / UX-01 dialogue card anchors — already specified.**
`project-docs/BRIEFS/BRIEF_UX01_DIALOGUE_CARD_ANCHORS.md`, dated 2026-06-09,
defines both anchors at the canonical 390 × 844 viewport: upper `top: 80`,
lower `top: 576` (`SCREEN_H - NAV_HEIGHT - 16 - CALLOUT_H_EST`), the centering
formula, the branch rule, the `targetRef === 'center'` special case, the exact
lines to delete from `calloutPos`, and six acceptance criteria. Nothing is
missing. `STATUS_CHECK_2026-07-22.md` lists it as an active brief.

**This is a dev task, not a design task.** It is unimplemented, not
unspecified. Route to WRENCH against the existing brief.

**CONTENT-01 tape Codex entries — already designed, approved, and built.**
`src/components/CodexDetailView.tsx` carries all three entries under a
`── Tape system (DATA STREAM) — copy approved by Tucker 2026-06-12 ──`
marker, each with `description`, `cogsNote` and `firstEncountered`. A
dedicated `Stream` entry type exists alongside Physics and Protocol, with its
own `DATA STREAM` badge, a `TapeGlyph` hero icon, and a `TapeFieldStrip` that
replaces `PieceSimulation` for tape entries. Discovery is wired:
`levels.ts` fires `codexEntryId: 'inputTape'` and `'dataTrail'` at A1-5 and
`'outputTape'` at A1-7.

**Correction to my own document:** `INTENT_VS_BUILD.md` §6 claimed the three
tape elements were "the only game objects with no Codex entry, so they never
get the discovery beat." That is wrong and I have amended it. I read the
playtest report's blocker and did not check whether it had since been cleared.

**What actually remains is DEC-1 item 6** — the scoring-language rewrite,
delivered here as `OPTION_A_FULL_PASS.md`. It is bigger than a copy pass: 56
lines, three section headings, the discipline's definition in the usage note,
and both paragraphs of the §3 preamble.

---

## Files in this bundle

| File | What it is | Read order |
|---|---|---|
| `OPTION_A_FULL_PASS.md` | **The deliverable.** All 56 changed lines, current beside draft, in document order. Needs line-level sign-off. | 1 |
| `SCORING_LANGUAGE.md` | The reasoning: why this is not a vocabulary swap, and the Option A/B analysis that produced the decision. | 2, as background |
| `README.md` | This file. Scope, corrections, routing. | — |

---

## The one-line version

Ratifying scoring v2 deletes the metric one of the three disciplines is built
on. The Field Operative was defined, in COGS's own words, as *"watching for
lean solutions — every unnecessary piece is a failure of the discipline."*
Under v2, unnecessary pieces are worth points and the discipline is defined by
using both systems (3 active Protocol + 3 active Physics).

**Option A ratified 2026-09-10:** the Field Operative becomes the breadth
discipline. Its standard is now *did the Engineer use both systems, and use
each for what it is good at.* Count is never mentioned. COGS's voice toward
the discipline is unchanged; only his criterion moves.

## Structure ratified 2026-09-10 — line-level sign-off is all that remains

Option A collapses two existing sections into each other. §3A was "played to
type — lean solution, near-optimal count" and §3C was "played mixed but
inefficiently." Under a breadth standard, **playing to type IS playing
mixed** — they describe the same behavior, separated only by a metric that no
longer exists.

The pass proposes this split, which keeps all three sections and matches how
v2 actually counts (it scores *active* pieces, so a piece the signal never
touches is not load-bearing):

- **3A Played to Type** — both systems used, both doing real work
- **3B Played Against Type** — one system carried the machine
- **3C Played Without Commitment** — both present, one placed but not leveraged

3C is the more interesting failure state under v2 anyway: the Engineer who
technically satisfied 3+3 without meaning it.

**Ratified**, along with rewriting the four §3 void lines that cite optimal
piece count. The drafts in `OPTION_A_FULL_PASS.md` are final-form against both
decisions.

---

## Also found while reading — routes to 003, not 004

Three items belong in existing 003 requirements rather than a new handoff:

1. **`getCodexPieceColor` carries the same tape-color drift as the gameplay
   screen.** `CodexDetailView.tsx` returns `'#BFFF3F'` for `inputTape` with a
   comment reading `IN — neon green`. Same locked-value violation as
   REQ-G-04, in a second file. **Added to REQ-G-04's file list.**
2. **The Codex detail view has nine strings below the 11 pt floor** —
   `stripCaption` 9, `firstEncLabel` 8, `firstEncValue` 9, `alsoLabel` 8,
   `alsoChipText` 9, `cogsLabel` 9, `teachBadgeText` 8, `loggedBadgeText` 9,
   `actionLabel` 9. D-07 applies. This is outside 003's gameplay scope, so it
   is **logged here for a future Codex pass** rather than added to REQ-G-10.
3. **`CODEX_PIECES` is a manual duplicate.** Its own comment says *"Source of
   truth is CodexScreen — kept in sync manually."* Two copies of the teaching
   copy for every piece, kept in sync by hand, is how the `#BFFF3F` drift in
   item 1 survives in one file after being fixed in another. Worth a single
   shared module. **Logged, not filed** — it is an architecture call.

One question I could not answer from reading, for whoever picks up the Codex:
`CodexDetailView` animates with `react-native-reanimated` (`useSharedValue`,
`withTiming`), while `ANIMATION_RULES.md` governs RN `Animated` and the
JS-driver rule. Whether the two SIGABRT incidents' mitigation extends to
reanimated's UI-thread values is a question for WRENCH, not an assertion from
me.

---

## Routing

- `OPTION_A_FULL_PASS.md` — needs the §3C structural confirmation, then
  line-level sign-off before anything enters `DIALOGUE_SYSTEM.md`.
- **Scoring engine** — DEC-1's ratification makes `src/game/scoring.ts` a work
  item in its own right: it implements the superseded model (Efficiency 30,
  Speed Bonus 10). Systems task, outside this bundle.
- SPEC-02 / UX-01 — route to dev against
  `BRIEF_UX01_DIALOGUE_CARD_ANCHORS.md`. No design work outstanding.
- CONTENT-01 — close it. Delivered 2026-06-12.
- Codex type floor and the `CODEX_PIECES` duplication — hold for a Codex
  review, or fold into 003's Wave 3 if you want them now.
