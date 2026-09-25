# PROMPT_162 REPORT — Cleanups: HUD line, dead ship icon, scoring dialogue, the timer (AXM-002, AXM-009, AXM-022)

Branch `chore/axm-162-cleanups`, off master at `dd5bc41`. Nash (WRENCH), 2026-09-23. Three commits (code, dialogue, this report).

## Gates

| Gate | Result |
|------|--------|
| `npx expo lint --max-warnings 0` | PASS, 0 errors, 0 warnings |
| `npx tsc --noEmit` | PASS, 0 errors |
| `npx jest --coverage` | PASS, 2261 passed, 28 skipped, 2 todo. Coverage 84.64 / 75.93 / 83.76 / 85.54 (stmts / branches / funcs / lines); master is 84.62 / 75.93 / 83.73 / 85.51. Thresholds 80 / 70 / 80 / 80 hold |
| `npm run audit` | PASS, 0 high/critical advisories |

## 1. `AxiomShipSVG` deleted (AXM-002 part 2)

`git grep AxiomShipSVG` on `dd5bc41` found one consumer: the barrel re-export in
`src/components/icons/index.ts`. Nothing imported it from the barrel. The file and the export line are
gone. No test or snapshot existed for it. The ship handoff README row now notes the deletion; the design
review's mention stays as the historical record.

## 1b. HUD level line merged (AXM-002 part 1)

`src/components/gameplay/HUDChrome.tsx` draws one line, `{levelId} · {levelTitle}`, e.g.
`K1-1 · CORRIDOR ENTRY`:

- The parent `Text` (`styles.levelLine`, 11pt Space Mono, muted) holds two styled runs: the id in copper
  at the 11pt floor, and the name in starWhite Orbitron bold. The spaced middle dot (U+00B7) sits
  between them in the parent style.
- `numberOfLines={1}`, `ellipsizeMode="tail"`, `alignSelf: 'stretch'`: a long title ellipsizes at its
  end and never wraps or pushes the pause and Spec Sheet buttons.
- The D-07 comment block now records that the merge landed.

**Longest title.** Across `src/game/levels.ts` the longest HUD line is
`REPAIR-PROP-SURGE · PROPULSION CORE` (a repair level), then `K1-4 · Mining Platform Alpha`, the
longest sector title. I shot it on `axiom_compact` (360x640dp) from a release APK built from this branch at `279157d`:
[`PROMPT_162_hud_360dp_K1-4.png`](PROMPT_162_hud_360dp_K1-4.png). `K1-4 · Mining Platform Alpha` fits on
one line with no ellipsis, clear of the Spec Sheet button, and no clock is drawn. The repair-level line
is about 7 characters longer. It isn't reachable from a seeded save without the repair flow, so it went
unshot. At that length the tail truncation shortens the title rather than wrapping or pushing the
buttons. Pause screen, same build:
[`PROMPT_162_pause_360dp_K1-4.png`](PROMPT_162_pause_360dp_K1-4.png): no clock, and RESUME keeps a clear gap
under the level name.

## 2. Option A scoring dialogue landed (AXM-009)

Every draft in `project-docs/DESIGN_HANDOFFS/004-scoring-language/OPTION_A_FULL_PASS.md` is applied to
`docs/DIALOGUE_SYSTEM.md`:

- **50 quoted COGS lines.** §3A 15, §3B 11, §3C 11, §2 Drive Engineer 13. Each touched line drops its
  retired `[PROPOSED]` tag, per the COGS DIALOGUE DOCTRINE; untouched lines keep theirs.
- **9 framing edits.**
  - the Field Operative definition in the usage note
  - both §3 preamble paragraphs
  - the three §3 headings, carrying the ratified 3A / 3B / 3C split (Played to Type / Played Against
    Type / Played Without Commitment)
  - the 3B note, the 3C note, and the 3C three-star anomaly note
- The four rewritten void lines are included: 3A void Early / Mid / Late, and 3C void Mid.
- The pass's own summary table totals 56. Counting line by line, its drafts come to 59 (50 quoted and
  9 framing), so all 59 are applied.

**Two additions of my own, needed so the document stays coherent:**
1. The usage note defined played to type / against / mixed for every discipline alike. Option A
   redefines them for the Field Operative only, so I added a one-paragraph "Field Operative alignment"
   note under those definitions, taken from the pass's ratified split table. It adds no new rule.
2. The 3C hub follow-up trigger read "fires after two-star, above optimal, late only". Above-optimal no
   longer exists, so it now reads "fires after two-star, without commitment, late only".

**In code.** None of these lines are in `src/`. `getCOGSScoreComment` (`src/game/scoring.ts`) has its
own short line set, selected on the v2 breakdown (investment, diversity, path integrity), not on
count against optimal. `VOID_QUOTES` is still the five-line array; wiring the full matrix is its own
blocked 004 item. So there is no code change, no new test, and no blocker report.

**Voice check (NARRATIVE.md: dry, precise, reluctantly impressed, "acceptable" the ceiling, never
"good job", no emojis).** I read all 59 drafts against it. None
breaks the rules, so I changed no line from its draft.

**Out of scope, flagged for the owner (not changed):** these lines outside the pass still carry
count-based or shortest-path logic that v2 no longer supports:

- **§2B One Star Early:** "The Physics pieces in the tray would have produced a cleaner path. The
  rating reflects the longer route."
- **§2B Two Stars Late:** "Neither is optimal."
- **§2C Two Stars Early and Mid:** "rewards Physics efficiency" and "most efficient when the balance
  tips toward Physics".
- **§2A One Star Late:** "one-star routing efficiency". This one reads as characterization, so it can
  probably stay.

These are Pierce's or T-Bot's to rule on. I did not invent replacements.

`OPTION_A_FULL_PASS.md` carries a `STATUS: LANDED 2026-09-23` line at the top. The file is not deleted.

## 3. Visible timer and the two anti-soul MAY goals removed (AXM-022)

- **HUD:** the `timerText` prop, its conditional `Text`, and `styles.timerText` are gone, and
  GameplayScreen no longer formats or passes a clock. The timer was mounted conditionally, hidden during
  results, void and tutorial. Removing it takes out a source of HUD height change. The REQ-G-02
  fixed-height pulse row is untouched.
- **Pause screen:** `GameplayModals` loses the `elapsedSeconds` prop, `formatMMSS`, and the
  `pauseTimerWrap` / `pauseTimerBig` / `pauseTimerLabel` block and styles. `pauseLevelName` gains
  `marginBottom: 40` so RESUME doesn't ride up against the level name.
- **Silent tracking stays.** `useGameplayTimer` is unchanged. `lockTimer()` still returns the locked
  value, and `handleSuccess` still receives `lockedElapsed`. With `underSeconds` gone it has no reader,
  so it is held with `void lockedElapsed` and a comment naming its purpose (COGS time commentary under
  REQ-60, and playtest data). It is never shown and never scored.
- **MAY predicates:** `underPieceCount` and `underSeconds` are removed from `MayPredicate`
  (`src/game/types.ts`) and from `meetsMayPredicate`. `noProtocolPieces` is the only type left.
  `placedPieceCount` and `elapsedSeconds` are dropped from `MayEvalContext`, since nothing else read
  them. `git grep` found no level using either predicate.
- **`resumeTimer` (#53) stays.** The silent tracking needs it: a wrong-output RETRY calls
  `lockTimer()` on the failed run, and without `resumeTimer()` the silent count would stop for the rest
  of the attempt. With no visible clock, RETRY neither keeps nor resets anything the player can see, so
  the #53 question is closed.
- **Specs:** `scoring-algorithm-v2.md` REQ-60 notes that elapsed time is never displayed and no MAY goal
  may test time or piece count. Part 13 open question 1 is marked answered: removal confirmed, no time
  element. No other doc lists MAY predicate types.

**Flagged, not changed:** the Mission Dossier (`MissionDossierScreen.tsx:165`) still has a "BEST
TIME" stat tile. The value is always the `'--:--'` placeholder from `LevelSelectScreen`, so no real time
is ever shown. The label still presents time as a stat, though. The brief named only the HUD and the
pause screen, so whether that tile goes is T-Bot's call.

## Tests

- **New, `__tests__/render/hudChrome.test.tsx`** (render tier):
  - the id and the title render on one line, joined by ` · `, with `numberOfLines={1}` and tail
    truncation
  - they are two styled runs, in different colours, both at 11pt or larger
  - the id no longer renders as its own stacked line
  - no clock is drawn, even when a caller passes a timer string
  - the pulse row is the only line under the header
- **HUDChrome.tsx joins the render tier's coverage allowlist**, one of Vaughn's 17 items.
- **`__tests__/unit/components/HUDChrome.test.ts`: superseded source contracts replaced.**
  - "does not merge levelTag and levelName (needs Tucker sign-off)" pinned a gate that Tucker's
    2026-09-23 approval retired. It now pins the merged line.
  - "renders the timer text only when timerText is non-null" now asserts no timer in the HUD and none
    passed from GameplayScreen.
- **`__tests__/integration/GameplayModals.test.tsx`:** new "no visible timer" block (no pause clock, no
  `elapsedSeconds` prop). The void-quote comment no longer cites the per-second re-render.
- **`__tests__/unit/spec/mayConditions.test.ts`:**
  - The `underPieceCount` and `underSeconds` tests are deleted, not skipped.
  - A compile-time check (`@ts-expect-error` on both shapes) proves they are no longer `MayPredicate`s.
  - The evaluator and bonus tests now drive `noProtocolPieces`, both met and unmet.
- **`__tests__/unit/spec/specChecklist.test.ts`:** its two MAY fixtures used the removed predicates as
  sample data. They now use `noProtocolPieces`. The checklist assertions are unchanged.

All of these were red before the implementation (9 failing), then green.
