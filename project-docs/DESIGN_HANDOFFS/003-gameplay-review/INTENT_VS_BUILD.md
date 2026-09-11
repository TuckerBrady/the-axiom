# Intent vs Build — The Axiom, Gameplay Loop

**Prepared:** 2026-09-10 · Product/UX pass for Tucker Brady
**Sources:** `CLAUDE_CONTEXT.md`, `TRIBAL_KNOWLEDGE.md`, `NARRATIVE.md`,
`DIALOGUE_SYSTEM.md`, `LEVEL_DESIGN_FRAMEWORK.md`, `COMPUTATIONAL_MODEL.md`,
`TEACHING_PROGRESSION.md`, `scoring-algorithm-v2.md`, `augment-economy.md`,
`audio-haptics.md`, `ARC_WHEEL_UX_ANALYSIS.md`,
`SKEPTIC_PLAYTEST_2026-06-09.md`, `SPEC_BEAM_ANIMATION.md`, and `src/`.

---

## Process note, first

I opened this task by sending you a nine-question product interview. That was
wrong. Every question on it — the core promise, COGS's role, whether the
economy is a real constraint, which palette is canon, what the signature
moment is — is answered in writing in this repo, most of it in
`TRIBAL_KNOWLEDGE.md` Section 3 and `NARRATIVE.md` Parts One and Two. Asking
you to retype your own design bible is not an interview, it is a tax.

Reading it also corrected three things in the review I delivered yesterday.
Those corrections are in the last section, and two of the three "decisions
needed from Tucker" are withdrawn.

---

## PART ONE — What the docs say the game is

Stated plainly, because the comparison depends on it.

**The promise.** A Rube Goldberg machine-builder with a hidden CS curriculum
and a story that has to be earned. `COMPUTATIONAL_MODEL.md` and
`TRIBAL_KNOWLEDGE.md` Section 3 both put it the same way: *the joy is building
elaborate, interesting machines — not finding the minimum solution.* When fun
and curriculum conflict, elaboration wins. `NARRATIVE.md` is explicit that the
story is a layer, not a requirement: "The player who is not paying attention
will still complete every level."

**The loop.** Build, fail, learn, invest, build better, succeed. Failure is the
curriculum — not a setback in the loop, the mechanism of the loop.

**The feel.** Y2K translucent hardware — N64 Funtastic, iMac G3, Game Boy
Color — wrapped around unchanged engine-semantic colors. Cinematic animation,
0.6 s minimum. Button-driven, never reactive. The Engineer is operating
spacecraft equipment, not a mobile UI.

**COGS.** Dry, precise, reluctantly warm. Never a cheerleader, never "good
job." Uses "acceptable" the way other people use "extraordinary." His
authority is that he is *specific*.

**The economy.** A real strategic constraint by design. Scoring v2 caps a
floor solve at 45 points — one star — and puts three of six categories behind
having purchased something that ended up load-bearing. Buying nothing is a
choice with a ceiling attached.

**Signature moments.** Two, from the docs: the signal reaching Terminal and
locking, and the tape revealing what the machine computed.

---

## PART TWO — Where the build diverges

Ordered by distance from intent, not by effort.

### 1. Shipped scoring rewards the opposite of the stated soul

The soul says more pieces is better. The shipped scoring engine says fewer.

| | Shipped (`CLAUDE_CONTEXT.md`, `scoring.ts`) | Scoring v2 spec | Tribal doc |
|---|---|---|---|
| Piece count | **Efficiency 30 pts — count vs `optimalPieces`** | Signal Depth 14, rewards *longer* paths | 3 stars at 75%+ tray usage |
| Speed | **Speed Bonus 10 pts, timer in HUD** | **REMOVED** — "speed rewards rushing, contradicts the design philosophy" | not mentioned |
| Investment | none | Investment 25 pts, floor solve capped at 45 | credits fund creativity |
| Categories | 5 | 6 | a third model again |

A player on the current build is scored for using *fewer* pieces and for
finishing *faster*. That is the exact inversion of the design principle, and it
is enforced by a running clock on screen. Three documents describe three
different scoring systems and the shipped one matches none of them.

This is the single largest intent gap in the game, and it is upstream of most
of the presentation findings in Request 003 — including my G-12, which I
framed as "the catalogue pushes the Engineer toward the floor solve." Under
v2 that is not a nudge, it is a hard one-star ceiling.

**RESOLVED 2026-09-10 — v2 ratified**, all six open questions accepted as
proposed, Speed Bonus deleted outright. See `DECISIONS.md`. The scoring engine
in `scoring.ts` now implements a superseded model and becomes a systems work
item.

### 2. The failure screen bypasses a dialogue system that is already written

`DIALOGUE_SYSTEM.md` contains an authored void-result line for every
discipline × behavior × phase combination — nine void variants plus special
cases plus hub follow-ups, all awaiting your sign-off. The build ships a
five-item `VOID_QUOTES` array with `Math.random()` called *in the render path*,
so the line rerolls once per second while the player reads it.

Failure is supposed to be the curriculum and COGS's authority is supposed to
be specificity. The most common failure in the game currently produces a
generic line that visibly changes its mind. The fix is not new copy — the copy
exists. It is wiring the existing matrix and selecting once, on entry.

(This is my G-08, but I under-called it. I flagged it as a missing diagnostic.
It is actually an entire authored system sitting unwired.)

### 3. The run has no payoff channel

`audio-haptics.md` specifies the machine heartbeat: one light tap per piece the
beam touches, medium on Terminal arrival, nothing during charge so the launch
is the first thing felt. It is unbuilt. There is no audio either — the audio
manager, ship ambient and Axiom playlist are all specced and unbuilt.

Combined with Request 003's G-05 (the beam head renders white, so the category
color the animation exists to communicate is the least visible part of it),
the locking moment — one of the two stated signature moments — currently lands
as a silent, colorless, untouched visual event. Everything specified to make
it feel like a machine completing is written down and not in the build.

### 4. Tape colors are locked and the build uses different ones

`TRIBAL_KNOWLEDGE.md` Section 3, verbatim: tape colors LOCKED. IN = Ice Blue
`#7FC8E8`, TRAIL = Atomic Purple `#A97FDB`, OUT = Fire Orange `#FF7D3F`.

The build ships `tapeInBar: '#BFFF3F'` and renders TRAIL cells in
`#00FF87`. Two of three locked colors are wrong in the shipped code.

I sent this to you as a decision — "which hex is canon?" It is not a decision.
It was decided, it is written down, and the code drifted. Withdrawn as a
question, restated as a straightforward bug. This is the other signature
moment (reading the tape) rendering in the wrong vocabulary.

### 5. Board sizing violates an explicit "do not"

`CLAUDE_CONTEXT.md` states the rule twice: `BOARD_SIZE = SCREEN_WIDTH - 24,
always square, CELL_SIZE = BOARD_SIZE / numColumns, all sizing dynamic — no
hardcoded pixel values`, and in WHAT NOT TO DO: *"Do not use a fixed
CELL_SIZE — always calculate dynamically from canvas dimensions and level grid
size."*

`MIN_CELL = 48` is a hardcoded floor that overrides the dynamic fit, which is
what clips ten of eleven Kepler grids (G-01). So the second decision I sent
you is also withdrawn: the docs do not support pan/zoom, they support a board
that always fits. And `LEVEL_DESIGN_FRAMEWORK.md`'s quality checklist already
requires "board size is minimum necessary for correct solution" — so a 12-wide
grid at 390 pt is a level that fails its own checklist, not a viewport that
needs a new interaction model.

Note on my arithmetic: I ran the review at 393 pt. `TRIBAL_KNOWLEDGE.md` sets
the canonical test viewport at 390 × 844. The conclusions are unchanged (at
390 pt a 12-wide grid computes to a 29 pt cell against a 48 pt floor), but the
numbers in the review should be read as approximate by 3 pt.

### 6. Three playtest specs are blocked on design work that is mine

`SKEPTIC_PLAYTEST_2026-06-09.md` established four canonical specs and two are
waiting on a designer, not a developer:

- **SPEC-02** — ~~pixel anchors still undefined~~ **CORRECTED 2026-09-10:
  specified in full** by `BRIEFS/BRIEF_UX01_DIALOGUE_CARD_ANCHORS.md`
  (2026-06-09) — upper `top: 80`, lower `top: 576`, branch rule, centering
  formula, lines to delete, six acceptance criteria. Unimplemented, not
  unspecified. Route to dev.
- **CONTENT-01** — ~~tape Codex entries, still undesigned~~ **CORRECTED
  2026-09-10: already delivered.** `CodexDetailView.tsx` carries all three
  entries under a "copy approved by Tucker 2026-06-12" marker, with a
  dedicated `Stream` type, `DATA STREAM` badge, `TapeGlyph` hero icon,
  `TapeFieldStrip`, and discovery wired at A1-5 and A1-7. I read the playtest
  report's blocker and did not check whether it had been cleared. One real
  defect remains in that file: `getCodexPieceColor` returns `#BFFF3F` for
  `inputTape`, the same drift as §4 — now folded into REQ-G-04.
- **SPEC-03/04** — the discovery flow and call-and-response rhythm are
  specified and partly unimplemented (UX-06, GAME-01).

**Corrected:** neither blocker was still open. What Design does owe is the
scoring-language rewrite (DEC-1 item 6), delivered as handoff 004 — where the
substantive finding is that the Field Operative discipline is defined, in
COGS's own words, by the exact metric scoring v2 deletes.

### 7. Arc Wheel is missing its one recommended investment

`ARC_WHEEL_UX_ANALYSIS.md` recommends keeping the wheel for Kepler+ and adds
exactly one requirement: a category quick-jump or dot-strip index, because
*"the expanding tray mechanic in Kepler needs the Engineer to be able to assess
their full inventory quickly. The wheel as-built does not support that well
enough."* Unbuilt. The wheel scored 3/10 on discoverability in your own
analysis, and the requisition flow that depends on inventory comprehension is
the flow scoring v2 hangs three categories on.

This compounds with G-13 (overview icons at 20 pt) and G-12 (catalogue shows
five rows, hides the rest). All three are the same problem: the Engineer cannot
see what they have or could have, on the surface where seeing it is the point.

---

## PART THREE — Where the build matches intent well

Worth stating, so the list above reads as proportionate.

- **The three-layer model is intact and legible.** Signal Path, Data Trail and
  the tape system all exist, the Data Trail persists across pulses, and trail
  cells initialize `null` rather than `0`. The hard part is built.
- **COGS's voice holds.** Every line in the build sounds like the character in
  `NARRATIVE.md`. No cheerleading, no "good job," no emoji anywhere in the
  project. Tone discipline has survived nineteen sprints, which is rare.
- **Sector contract is honored.** Axiom is genuinely a safe zone — no lives, no
  blown cells, always three stars, honest COGS commentary on the real score.
  Kepler introduces consequence deterministically: the piece where the signal
  stopped is the piece that blows. Cause and effect, not luck.
- **Teaching progression is real.** One concept per level, one new piece
  maximum, prerequisites tracked in level data, and the four-step tutorial
  pattern (instructor → collector interrupt → Codex → resume) is implemented
  across all eight Axiom levels.
- **The animation invariant is respected.** Every animation is JS-driven, and
  the two conditionally-mounted hosts are documented as FORM B with the driver
  as mitigation. Two SIGABRT incidents produced a rule and the rule is being
  followed.

---

## PART FOUR — Corrections to Request 003

Reading the full doc set changed three findings. The review file has been
amended.

**G-03 — partially retracted.** I recommended moving the Source to copper and
treating amber-on-Physics as a violation. Both are wrong against the docs:
`CLAUDE_CONTEXT.md` lists `Source visual: amber #F0B429` as a live locked
decision, and `TRIBAL_KNOWLEDGE.md` Section 3 states engine-semantic colors
stay unchanged including *"amber for Physics."* Request 001's D-03 reserved
amber for the beam. **These two documents conflict, and that conflict is the
actual finding.** The parts of G-03 that stand on their own are the ones the
docs already settle: `ArcWheel.getPieceColor` contradicts its own adjacent
comment, and `SOURCE_COLORS` encodes purchase provenance in the tray, which
`COMPUTATIONAL_MODEL.md` forbids outright (Option B — purchased pieces appear
identically to pre-assigned).

**G-04 — no longer a decision.** Tape colors are locked in writing. `#BFFF3F`
is drift, not a candidate.

**G-01 — decision withdrawn.** The docs answer it: board always fits, sizing
always dynamic, `MIN_CELL` violates an explicit prohibition. The 12-wide grid
is a level-design checklist failure, referred to level design rather than
solved with pan/zoom.

**Still needs you:** only the void diagnostic, and less than before. The copy
exists in `DIALOGUE_SYSTEM.md` awaiting sign-off. The ask is not "write a
line," it is "approve the void matrix and I will specify the wiring."

---

## Recommended order

1. Ratify or amend scoring v2. Everything about elaboration, the economy and
   the requisition UI is downstream of it, and the shipped engine currently
   contradicts the soul statement.
2. Fix the two locked tape colors and remove `Math.random()` from the render
   path. Both are small, both are drift from written decisions.
3. Wire the existing void dialogue matrix. No new writing required.
4. Remove `MIN_CELL`; refer 9-plus-column grids to level design.
5. Let me clear SPEC-02 pixel anchors and the tape Codex entry format.
6. Build the machine heartbeat. It is the cheapest available upgrade to the
   game's signature moment.
