# Kepler Open-Questions Canon Discovery

Date: 2026-05-31
Author: Code (read-only canon discovery per PROMPT_133)
Scope: `SPEC_KEPLER_REBUILD_v3.md` Section 5, all 17 open questions EXCEPT
Q2 (scoring model) and Q3 (Latch DELAY mode) — those are Tucker's direct calls.

Purpose: discover what the project's canonical documentation and shipped code
ALREADY say about each open question, so Tucker only adjudicates the genuinely
undecided residue. Verdicts:
- DOCUMENTED — canon clearly answers it.
- PARTIAL — canon constrains the space but does not fully settle the decision.
- OPEN — genuinely undecided; docs are silent (or it needs build-time verification).

No canon was invented. No player-facing copy was authored (that remains a Tucker
sign-off item). Citations are file + line + short quote.

---

## Q1 — PRECEDENCE (level/mechanic ordering)

**Verdict: PARTIAL**

The spec adopts the V2/CODE assignment (Latch@K1-3, Merger@K1-5, Bridge@K1-7) over
the original (Splitter@K1-3, Damaged Cells@K1-5, Merger@K1-6) and the teaching-map
alternative (Merger@K1-3, Bridge@K1-5, Latch@K1-7). Primary prose canon does NOT by
itself force the V2/CODE ordering — it is settled by the engine data plus the
rebuild spec's own precedence ruling.

**Evidence:**
- `docs/NARRATIVE.md:593-594` — `K1-3 — Junction 7`: "Junction 7 is a routing
  bottleneck. Eleven settlements feed through this point." The approved COGS lines
  are keyed to level NAMES/POSITIONS but describe LOCATIONS, not pieces — they are
  mechanic-agnostic. Same for `NARRATIVE.md:601` (K1-5 Resupply Chain) and
  `NARRATIVE.md:609` (K1-7 Ore Processing).
- `src/game/levels.ts:746` `id:'K1-3', name:'Junction 7'` pre-places `latch`
  (`:751`), `conceptTaught:'Latch...'` (`:759-760`); `:802` K1-5 Resupply Chain
  pre-places `splitter` + adds `merger` (`conceptTaught` Merger, `:816`); `:858`
  K1-7 Ore Processing pre-places `bridge` (`:871`). The name to piece binding that
  actually distinguishes the orderings lives ONLY in the engine data.
- `project-docs/SPECS/kepler-belt-levels.md:473` — original binds the SAME names to
  DIFFERENT pieces: "| K1-3 | Junction 7 | SPLITTER |". So the level NAME is not
  canonically welded to one piece across sources.
- `docs/TEACHING_PROGRESSION.md:57-58` lists the sector's pieces (Latch, Merger,
  Bridge) as an UNORDERED set with no per-level pinning; COMPUTATIONAL_MODEL.md
  likewise.
- `SPEC_KEPLER_REBUILD_v3.md:24-30` — the spec's own ruling: adopt V2+CODE "because
  (a) it is the ordering the engine, the per-level approved COGS lines, the
  narrative map, and the arc-wheel surface map are ALL already keyed to by level
  NAME."

**Recommendation:** Confirm V2/CODE as canonical. The honest canon statement is
that NARRATIVE/TEACHING_PROGRESSION bind names to POSITIONS only (mechanic-agnostic
and consistent across all candidate orderings); the name to piece mapping is settled
by `levels.ts`, which the rebuild spec elevates to canonical. The rejected
alternatives (original Splitter@K1-3; teaching-map Merger@K1-3) are incompatible
with the current `levels.ts` bindings. This is a one-line Tucker ratification, not a
from-scratch decision.

---

## Q4 — CREDIT BUDGET COVERAGE (requisition universal vs. selective)

**Verdict: DOCUMENTED**

Requisition is a universal capability for Kepler+ story levels and dailies, but the
window itself is conditionally skipped when `creditBudget` is undefined or 0.

**Evidence:**
- `project-docs/SPECS/piece-selector-system.md:547` (REQ-77): "For Kepler Belt
  levels and beyond, creditBudget MUST be defined. If creditBudget is undefined or
  0, the REQUISITION store MUST NOT appear for that level."
- `piece-selector-system.md:79-81` (REQ-5): "The REQUISITION store and Arc Wheel
  MUST be available from Kepler Belt (K1-1) onward for all story levels and daily
  challenges."
- `piece-selector-system.md` REQ-99: "creditBudget 0 = skip REQUISITION, go straight
  to PLACEMENT."
- `piece-selector-system.md:74-76` (REQ-4): Axiom (isTutorial) levels MUST NOT show
  the store; they keep the tray.
- `project-docs/SPECS/scoring-algorithm-v2.md:521` (REQ-41): "Some levels MUST be
  designed such that 2 or 3 stars are unreachable without purchasing missing tape
  infrastructure." (implies budget > 0 on those levels)
- `CLAUDE.md:17` — "One-time requisition window: Purchases happen once, before the
  level starts."

**Recommendation:** Carry a `creditBudget` on every Kepler level (the spec's PROPOSED
budgets satisfy REQ-77). A level intended as pure floor-solve sets `creditBudget: 0`
to skip the phase. There is no "only K1-1" carve-out in canon — the spec's
recommendation (open requisition across the sector) is the canon-aligned answer.

---

## Q5 — K1-8 ONE TERMINAL vs TWO

**Verdict: PARTIAL**

Canon strongly constrains toward a single terminal; multi-terminal is not modeled by
the schema or engine, though it is not forbidden in prose.

**Evidence:**
- `src/game/types.ts:118` — `prePlacedPieces: PlacedPiece[];` There is no dedicated
  terminal field; terminals are pieces of type `'terminal'` inside `prePlacedPieces`,
  uncapped by schema.
- `src/game/levels.ts` — every level defines exactly ONE terminal via
  `prePlaced('terminal', x, y)` (e.g. `:682`). No level defines two.
- `src/game/engine.ts:476-481` — the tracer `return`s on the FIRST terminal reached
  ("Signal reached output — success!"). A second terminal would never be evaluated.
- `src/game/engine.ts:287` — BFS seeds from a single source
  (`pieces.find(p => p.type === 'source')`).
- `src/game/types.ts:135-139` — `requiredTerminalCount` is about PULSES reaching the
  terminal, not multiple terminal pieces.

**Recommendation:** Adopt the V2/CODE single-terminal model for K1-8. A two-terminal
(A + B, both must receive) design is unsupported and would need new engine logic
(don't return on first terminal; per-terminal arrival tracking) plus a new objective
type. The rebuild spec's recommendation is canon-aligned.

---

## Q6 — DAMAGED CELLS (designer-placed vs void-blown scars)

**Verdict: PARTIAL**

Two distinct concepts. Void-blown scars (runtime) are fully canon. Designer-placed
damaged cells are an unwired stub with no doc spec and no engine support.

**Evidence — void-blown scars (DOCUMENTED, runtime):**
- `docs/LEVEL_DESIGN_FRAMEWORK.md:407-409` — "First sector with blown cells and
  lives ... the piece where the signal died blows up and scars the board cell
  permanently (within the session)."
- `docs/LEVEL_DESIGN_FRAMEWORK.md:428-430` — "The blown cell is always
  deterministic: the piece where the signal stopped is the piece that blows."
- `src/hooks/useGameplayFailure.ts:25` — `blownCells` is a runtime `Set<string>`,
  cleared per level. Not a level field.

**Evidence — designer-placed damaged cells (OPEN / unused):**
- `src/game/types.ts:155` — the field exists but is annotated unused:
  `damagedCells?: Array<{ gridX: number; gridY: number }>;` ("not used in K1-1 but
  type is defined here", `:154`).
- No level in `levels.ts` populates `damagedCells`; `engine.ts` never references it.
- The engine's existing authored-blocked-cell mechanism is the `'obstacle'` piece
  type (`engine.ts:56,94,578`) — impassable, distinct from `damagedCells`.
- `project-docs/SPECS/damage-mechanic.md` is about SHIP-system damage (failing
  missions degrade ship systems), NOT designer-placed board cells — it never
  mentions `damagedCells`, board scars, or blocked cells.

**Recommendation:** Do not re-introduce the original's damaged-cell mechanic as if it
were supported. Rely on void-blown scars (fully canon) for now, exactly as the spec
recommends. If authored blocked cells are wanted today, the canonical mechanism is
the `'obstacle'` piece type. A distinct "damaged by design" cell would need its own
spec + engine wiring — `damagedCells` does nothing at present.

---

## Q7 — requiredPieces ENFORCEMENT TIMING

**Verdict: DOCUMENTED**

The implemented behavior is unambiguous: post-run rejection that consumes a life.
This was Tucker-confirmed in code.

**Evidence:**
- `src/screens/GameplayScreen.tsx:1031-1048` — enforcement runs AFTER the run
  completes and only when the machine otherwise succeeded, then calls `loseLife()`
  and shows the rejection modal. Inline comment: "A3a flavor: run completes, then
  evaluate. If any required piece was not engaged, consume a life ... REQ-RP-5: same
  life-cost as damage failure. Tucker confirmed 2026-05-01."
- `src/game/engine.ts:610-630` — `evaluateRequiredPieces` checks `firedDuringRun`
  (`:620-622`), which is only knowable after execution; the function is structurally
  post-run and cannot run pre-engage.
- `CLAUDE.md` — "Failure is the curriculum ... build, fail, learn, invest, build
  better." The post-run/life-cost model matches this philosophy.

**Recommendation:** Keep the V2 model (post-run rejection, consumes a life). It is
implemented, structurally tied to `firedDuringRun`, and carries a dated Tucker
sign-off (2026-05-01). The original "pre-engage modal, no life lost" model
contradicts both — do not revert without a new Tucker decision. NOTE: the
`requiredPiecesNotEngaged` COGS copy for K1-6/K1-8 is still unwritten and is a Tucker
sign-off item (player-facing copy).

---

## Q8 — CONSEQUENCE TIER for K1-4 and K1-8

**Verdict: OPEN**

Canon defines a formal `consequenceNarrative` for BOSS levels only (one per sector).
There is no tier system or weight-scaling rule for mid-sector consequence levels. The
spec's proposed below-boss K1-4/K1-8 warning/failure lines are net-new canon.

**Evidence:**
- `docs/NARRATIVE.md:253-259` — the sole Sector 1 consequence is the K1-10 boss
  negligence-inquiry line, tagged `[PROPOSED | consequenceNarrative | Sector 1]`.
- `docs/NARRATIVE.md:597-617` — K1-4 (Mining Platform Alpha) and K1-8 (Transit Gate)
  each carry only a standard ambient `cogsLine` (`[PROPOSED | cogsLine | BLUE]`); no
  consequence/warning/failure variant exists.
- `src/game/consequences.ts:9-11` — header states the model: "The player does NOT
  know specifics before the level. COGS gives weight-only warnings. The reveal
  happens after failure." Code carries exactly one `NarrativeConsequence` per sector,
  all keyed to boss levels.

**Recommendation (OPEN residue):** Author the tier scale in the spec as a NEW
decision and route to Tucker. The K1-10 boss line (human casualties + external
inquiry, AMBER eyes) sets the ceiling these mid-sector beats must stay below
(operational/local setback, no casualties, no inquiry). No existing canon to inherit;
copy stays a Tucker sign-off item.

---

## Q9 — RED EYE STATE IN EARLY GAME

**Verdict: PARTIAL**

Two layers must be separated. Void RESULTS lines are canonically RED in early game.
COGS's personal visible STRAIN (RED in a consequence-narrative beat) is reserved for
Sector 3, The Rift — its "first time."

**Evidence — results lines are RED (DOCUMENTED):**
- `docs/DIALOGUE_SYSTEM.md:113` (Systems Architect, early void): "... The discipline
  is not decorative." `[PROPOSED | resultsLine | RED]`. Also `:343` (Drive Engineer)
  and `:565` (Field Operative) — both `[... | resultsLine | RED]`.
- `docs/NARRATIVE.md:62` — matrix: "RED (damage): Something has gone wrong."

**Evidence — strain arc reserves RED consequence eyes for the Rift:**
- `docs/NARRATIVE.md:287` — "COGS shows strain for the first time." (Sector 3, The
  Rift)
- `docs/NARRATIVE.md:296` — the Rift boss consequence carries `[Red eyes.]`, while the
  Sector 1 boss consequence is `[Amber eyes.]` (`:256`) and Sector 2 is `[Blue eyes.]`
  (`:275`).

**Recommendation:** Keep early-game void RESULTS lines RED (matrix is explicit). For
any NEW K1-4/K1-8 consequence/warning beats, do NOT use RED eyes — stay BLUE/AMBER to
protect the Rift "first strain" beat. The Sector 1 boss precedent is AMBER
(`NARRATIVE.md:256`); mid-sector beats should sit at or below that. This matches the
spec's recommendation.

---

## Q10 — PER-STEP EYE SHIFTS on non-boss levels

**Verdict: DOCUMENTED**

Per-step eye shifts ARE allowed on any level (the type system encodes it), but the
per-step palette is restricted to blue/amber/green; red/dark are excluded at the
tutorial-step layer.

**Evidence:**
- `src/game/types.ts:262-266` — each `TutorialStep` carries its own `eyeState`, so
  per-step shifts are a built-in, level-agnostic capability (not boss-only).
- `src/game/types.ts:260` — `export type TutorialStepEye = 'blue' | 'amber' |
  'green';` — deliberately omits 'red' and 'dark'.
- `src/game/types.ts:115` — the whole-level `LevelDefinition.eyeState` allows all
  five (`'blue' | 'amber' | 'green' | 'red' | 'dark'`).
- `docs/TEACHING_PROGRESSION.md:207` — eye state used as an ambient teaching device:
  "COGS's amber eyes throughout the Cradle ..."

**Recommendation:** The proposed K1-4 mid-level amber shift and K1-8 amber flicker are
SUPPORTED, provided they stay within blue/amber (per Q9, do not introduce RED on
these non-boss beats). RED and DARK are unavailable at the per-step layer by type
design. This refines the spec's recommendation: per-step shifts are allowed, not
boss-reserved — just palette-limited.

---

## Q11 — SPLITTER OWNERSHIP

**Verdict: DOCUMENTED**

The Splitter is NOT introduced in Axiom; it first appears in Kepler K1-5
(pre-placed). The existing Codex entry claiming Axiom origin is a known bug.

**Evidence:**
- `src/game/levels.ts` A1-1..A1-8 — no Axiom level lists `splitter` in
  `availablePieces` or `prePlacedPieces` (only conveyor/gear/configNode/scanner/
  transmitter/source/terminal). A1-4 "Propulsion Core" `availablePieces` (`:305`)
  has no Splitter.
- `src/game/levels.ts:807` — first Splitter appearance is `prePlaced('splitter',3,4)`
  in K1-5 (Resupply Chain).
- `project-docs/SPECS/kepler-belt-levels-v2-part1.md:831` — "The Splitter has not
  appeared in any prior level (Axiom or Kepler). K1-5 is the first time the player
  encounters it." REQ-5 (`:829,:843`): Splitter MUST get a Codex step at K1-5.
- `project-docs/SPECS/kepler-belt-levels.md:38-41` — the Codex entry claiming A1-4
  "is a bug to fix."

**Recommendation:** Treat the Splitter as a Kepler-first piece, introduce its Codex at
K1-5 (the spec's recommendation). Two acknowledged code/canon defects to fix when
levels land (do NOT author corrected copy here — `firstEncountered` is player-facing,
Tucker sign-off): (1) Splitter Codex `firstEncountered` wrongly says "THE AXIOM —
A1-4 Propulsion Core" (`src/screens/CodexScreen.tsx:123`,
`src/components/CodexDetailView.tsx:69`); (2) `levelK1_5.tutorialSteps`
(`levels.ts:820-828`) is missing the Splitter collector step
(`codexEntryId:'splitter'`) required by REQ-5.

---

## Q12 — requiredPieces REASON STRINGS

**Verdict: PARTIAL**

The optional `reason` field exists in the schema but is never read or rendered
anywhere — it is currently inert.

**Evidence:**
- `src/game/types.ts:156` — `requiredPieces?: Array<{ type: string; count: number;
  reason?: string }>;`
- Repo-wide search: no component reads `requiredPieces[].reason`. The COGS rejection
  copy is built by `buildRequiredPiecesCogsLine(level.id, rpResult.missing)`
  (`src/screens/GameplayScreen.tsx:1044`); `rpResult.missing` entries are
  `{ type, required, engaged }` (`src/game/engine.ts:601,617`) — no `reason`.
- `evaluateRequiredPieces` (`engine.ts:619-625`) reads only `entry.type`/`entry.count`.

**Recommendation:** The schema supports `reason?` without a type change, so the spec
MAY include reason strings. But it is inert today — surfacing it to the player needs
(a) plumbing `reason` through `RequiredPiecesResult.missing` in `engine.ts`, and (b)
rendering it in `buildRequiredPiecesCogsLine` / the rejection modal. Any player-facing
reason copy is a Tucker sign-off item. Decision (whether to surface) is partly a
design call — flag for Tucker, but the "is it possible / what's the cost" half is
documented.

---

## Q13 — K1-5 optimalPieces (9 vs 8)

**Verdict: OPEN**

V2 says `optimalPieces: 9` and flags CODE's 8 as likely wrong; the spec itself calls
for a build-time floor-solve verification. No document settles the true minimum — it
must be verified by actually solving the board.

**Evidence:**
- `SPEC_KEPLER_REBUILD_v3.md:520` — "optimalPieces: 9 (CANONICAL = V2, which flags
  CODE's 8 as likely wrong — VERIFY at build.)"
- `SPEC_KEPLER_REBUILD_v3.md:923-924` (Open Q13) — "this needs a build-time
  floor-solve verification. RECOMMENDATION: verify by actually solving the board
  before locking the value."

**Recommendation (OPEN residue):** This is not a doc question — it is a verification
task. Floor-solve the K1-5 board (Source(1,4) -> Splitter(3,4) -> gated Path A +
bypass Path B -> Merger -> Terminal(8,4)) at build time and lock `optimalPieces` to
the verified minimum. Cannot be resolved from canon alone.

---

## Q14 — TAPE NODES ON THE WHEEL

**Verdict: PARTIAL**

Direct contradiction between approved spec and shipped code. The spec says tapes ARE
a wheel category; the code never emits them, so the component's tape branch is
presently dead.

**Evidence — spec says tapes belong on the wheel:**
- `project-docs/SPECS/piece-selector-system.md:240-242` (REQ-22a): "Tapes are their
  own category on the Arc Wheel during the PLACEMENT phase, displayed with purple
  (#8B5CF6) borders."
- `piece-selector-system.md:357-362` (REQ-43 amendment): "Category order: Physics,
  Protocol, Data (tapes). Tapes are their own category on the wheel."

**Evidence — code never emits tape nodes (branch is unreachable):**
- `src/store/requisitionStore.ts:117-119` — requisitioned tapes are skipped from the
  pieces array ("if (purchase.type === 'TRAIL_TAPE' || ... 'OUT_TAPE') continue;");
  tapes are tracked separately in `inventory.tapes`.
- `src/screens/GameplayScreen.tsx:281` — the wheel is fed only from
  `inventory.pieces.filter(p => !p.placed)`, so `isTape` is never set true.
- `src/components/gameplay/ArcWheel.tsx:42,44-47,315` — `TAPE_COLOR`,
  `getNodeBorderColor(piece, isTape)`, `piece.isTape ?? false` exist but are never
  populated upstream — the branch is dead.

**Recommendation:** Genuinely unresolved at the decision level (spec REQ-22a vs.
implementation). Surface for a Tucker ruling. Two coherent resolutions: (a) honor
REQ-22a — emit purple tape nodes during placement; or (b) ratify the shipped model
(tapes live only in the REQUISITION store / `inventory.tapes`) and retract REQ-22a +
delete the dead branch. Do not keep both. NOTE: tape PURCHASE in the REQUISITION DATA
tab is unambiguously canon (REQ-20..22); the dispute is only placement-phase wheel
rendering.

---

## Q15 — KEPLER NEW-PIECE CODEX TARGET (`arcWheelMain` vs `boardGrid`)

**Verdict: OPEN**

No canon settles the Kepler codex-collection target. The only approved
codex-collection spec (`arc-wheel-tutorial.md`) is explicitly Axiom-scoped and never
addresses Kepler, pre-placed pieces, or a `boardGrid` target.

**Evidence:**
- `project-docs/SPECS/arc-wheel-tutorial.md:1` — title: "ARC WHEEL TUTORIAL — CODEX
  COLLECTION REWORK FOR AXIOM LEVELS".
- `arc-wheel-tutorial.md:8` — "Five Axiom levels introduce new pieces" (all targets
  `arcWheelMain`); the doc never describes a Kepler / pre-placed-piece case.
- `arc-wheel-tutorial.md:15` — Beat 3 capture animates "COGS orb flies to placed
  piece's board cell" — establishing the precedent that the capture target should be
  "where the piece actually is."

**Recommendation (OPEN residue):** Needs a Tucker/design ruling. There is a sound
canon-consistent rationale for KEEPING the split (the spec's recommendation):
`arc-wheel-tutorial.md` itself sets the precedent that capture targets "where the
piece is" — for pre-placed Kepler pieces that is `boardGrid`, not the wheel. Adopting
the split is the cleanest path, but it is not yet written down as canon.

---

## Q16 — CODEX ID SCHEME; Latch/Merger/Bridge entries

**Verdict: DOCUMENTED**

Codex entries are keyed by the piece's lowercase camelCase ID string (not `CDX-*`).
Latch, Merger, and Bridge entries all already exist and are unlocked.

**Evidence — ID scheme:**
- `src/store/codexStore.ts:16-17` — `discoveredIds: string[]; isDiscovered: (pieceId:
  string) => boolean;` — entries keyed by raw piece IDs.
- `CLAUDE.md` Common Gotchas — "Config Node Codex ID: use `configNode` not
  `config_node`" — confirms camelCase piece-ID scheme, no `CDX-` prefix.
- The only `CDX-`-style IDs found are non-piece lore entries in `consequences.ts`
  (e.g. `codexEntryId:'previous_engineer_signal'`, `:92`) — snake_case, also not
  `CDX-*`. The narrative map's `CDX-*` placeholders are NOT the implemented scheme.

**Evidence — entries exist:**
- `src/components/CodexDetailView.tsx:85` (merger), `:89` (bridge), `:101` (latch) —
  authored `cogsNote`s; merger `firstEncountered:'THE AXIOM — Kepler Belt'`.
- `src/screens/CodexScreen.tsx:159` (merger, Physics), `:169` (bridge, Physics),
  `:199` (latch, Protocol) — richer entries, `status:'unlocked'`.
- Tutorial hooks already reference them: `levels.ts:769,825,881` set
  `codexEntryId:'latch'/'merger'/'bridge'`.

**Recommendation:** Drop the `CDX-*` placeholders; use the existing camelCase piece-ID
scheme (`merger`, `bridge`, `latch`, matching `configNode`). Reference the existing
entries — do not recreate them. CAVEAT: entries are duplicated across
`CodexDetailView.tsx` and `CodexScreen.tsx`, so any copy edits must touch both.

---

## Q17 — WHEEL ONBOARDING COPY + DISCOVERABILITY

**Verdict: PARTIAL** (process rule DOCUMENTED; the actual copy and the discoverability
affordance are OPEN.)

### (a) Wheel-onboarding tutorial copy — rule DOCUMENTED, copy OPEN
- `CLAUDE.md` Design Principle #2 — "Tone is load-bearing ... Do not change text
  without Tucker sign-off." Reinforced under "What NOT To Do": "Do not change any UI
  copy without Tucker approval."
- `project-docs/SPECS/tray-to-arc-wheel-rename.md:33-36` — new Kepler COGS lines
  "MUST NOT reference 'tray.' Use 'the wheel,' reference pieces directly, or omit the
  container name entirely."
- The specific wheel-intro/scroll/place lines are unapproved (`SPEC_KEPLER_REBUILD_v3
  .md:935-936`).

### (b) Discoverability affordance (dot-strip / quick-jump) — OPEN (net-new)
- `piece-selector-system.md:363-365` (REQ-43) — only scroll: "MUST be able to browse
  inventory by swiping up/down along the arc."
- `piece-selector-system.md:366-369` (REQ-44) — only wrap: "Scrolling MUST wrap around
  if the inventory contains more pieces than can be displayed simultaneously." Wrap is
  the sole large-inventory accommodation in canon.
- `ArcWheel.tsx:26` (`VISIBLE_NODES = 5`) + `:233` (modulo wrap) — no index/jump UI
  exists. The resolved-questions list in `piece-selector-system.md:678-688` contains
  no discoverability item.

**Recommendation:** Mark all proposed onboarding lines PROPOSED and route through
Tucker (CLAUDE.md #2); avoid "tray." The dot-strip/quick-jump index is net-new: canon
mandates only scroll + wrap regardless of inventory size. If Tucker adopts it (the
20-22-node K1-9/K1-10 worst case is a real ergonomics argument), it must be added as
an amendment to `piece-selector-system.md` Part 3 (Navigation), with any labels going
through copy sign-off. Decision residue (final copy + whether to build the index)
stays with Tucker; the constraints around them are documented.

---

## Cross-cutting flags (surfaced during discovery, not Section-5 questions)

- **Kepler boss consequence is mis-keyed.** `src/game/consequences.ts:18-21` keys the
  Kepler boss `NarrativeConsequence` to `triggerLevelId:'K2-10'`, but the boss is
  `K1-10` (`docs/NARRATIVE.md:625`). It will never fire. (Already noted in spec
  Section 4 gap 8 — repeated here as it surfaced independently.)
- **Codex copy duplication.** Piece codex entries are duplicated across
  `CodexDetailView.tsx` and `CodexScreen.tsx`; edits must touch both.

---

## Summary tally

| Q | Topic | Verdict |
|---|-------|---------|
| Q1 | Precedence / ordering | PARTIAL |
| Q4 | Credit budget coverage | DOCUMENTED |
| Q5 | K1-8 one vs two terminals | PARTIAL |
| Q6 | Damaged cells | PARTIAL |
| Q7 | requiredPieces enforcement timing | DOCUMENTED |
| Q8 | Consequence tier (K1-4/K1-8) | OPEN |
| Q9 | Red eye state in early game | PARTIAL |
| Q10 | Per-step eye shifts (non-boss) | DOCUMENTED |
| Q11 | Splitter ownership | DOCUMENTED |
| Q12 | requiredPieces reason strings | PARTIAL |
| Q13 | K1-5 optimalPieces (9 vs 8) | OPEN |
| Q14 | Tape nodes on the wheel | PARTIAL |
| Q15 | Kepler new-piece codex target | OPEN |
| Q16 | Codex ID scheme + entries | DOCUMENTED |
| Q17 | Wheel onboarding copy + discoverability | PARTIAL |

**Tally: 5 DOCUMENTED, 7 PARTIAL, 3 OPEN** (Q2 and Q3 excluded — Tucker's direct calls).

**OPEN residue (genuinely undecided, for Tucker):**
- **Q8** — Consequence tier/weight scale for mid-sector levels K1-4/K1-8 (no canon to
  inherit; author the tier system + copy).
- **Q13** — K1-5 `optimalPieces` (9 vs 8): requires a build-time floor-solve, not a
  doc lookup.
- **Q15** — Kepler new-piece codex collection target (`arcWheelMain` vs `boardGrid`):
  no spec covers the pre-placed-piece case; needs a design ruling.

Note: several PARTIAL items still carry Tucker-only residue inside an otherwise
documented frame — specifically the unwritten player-facing copy for Q7
(`requiredPiecesNotEngaged`), Q11 (Splitter `firstEncountered` correction), Q12
(reason strings if surfaced), and Q17a (onboarding lines). Copy authoring remains a
Tucker sign-off item throughout.
