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

**What actually remains is DEC-1 item 6** — the scoring-language rewrite. That
is in `SCORING_LANGUAGE.md`, and it is bigger than a copy pass.

---

## Files in this bundle

| File | What it is |
|---|---|
| `SCORING_LANGUAGE.md` | **The deliverable.** The Field Operative problem, rewrite rules, and draft replacement lines for sign-off. |
| `README.md` | This file. Scope, corrections, and what routes where. |

---

## The one-line version

Ratifying scoring v2 does not just change some adjectives in
`DIALOGUE_SYSTEM.md`. It deletes the metric that one of the three
disciplines is built on. The Field Operative is currently defined, in COGS's
own words, as *"watching for lean solutions. Every unnecessary piece is a
failure of the discipline."* Under v2, unnecessary pieces are worth points and
the Field Operative is defined by using both systems (3 active Protocol +
3 active Physics). The character's stated standard now contradicts the
scoring engine.

That needs a design decision about who the Field Operative is, not a
find-and-replace. `SCORING_LANGUAGE.md` puts two options in front of you and
recommends one.

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

- `SCORING_LANGUAGE.md` — needs Tucker's decision on Option A vs B, then the
  draft lines need sign-off before they enter `DIALOGUE_SYSTEM.md`.
- SPEC-02 / UX-01 — route to dev against
  `BRIEF_UX01_DIALOGUE_CARD_ANCHORS.md`. No design work outstanding.
- CONTENT-01 — close it. Delivered 2026-06-12.
- Codex type floor and the `CODEX_PIECES` duplication — hold for a Codex
  review, or fold into 003's Wave 3 if you want them now.
