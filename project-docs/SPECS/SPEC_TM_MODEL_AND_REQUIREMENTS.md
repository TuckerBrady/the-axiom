# SPEC: Turing Machine Model Correction and Systems Engineering Requirements Layer

**ID:** SE-TM
**Author:** T-Bot (Strategy)
**Status:** SIGNED OFF — Tucker review complete 2026-06-13. Sequencer ruled TM-core (Section 8 #1, confirmed). Ready for Code/QA scoping per Section 9.
**Date:** 2026-06-13
**Depends on:** docs/COMPUTATIONAL_MODEL.md, docs/TEACHING_PROGRESSION.md, project-docs/SPECS/scoring-algorithm-v2.md, docs/LEVEL_DESIGN_FRAMEWORK.md
**Touches (live/tested code):** src/game/engine (signal engine), src/game/levels (level data), `__tests__/unit/engagement/requiredTerminalCount.test.ts`, `__tests__/unit/transmitterContract.test.ts`, TRANSMITTER_WRITE_CONTRACT.md, docs/COMPUTATIONAL_MODEL.md, Codex data/components

---

## 0. Why This Spec Exists

The Axiom teaches Turing machines through Rube Goldberg machines without telling the player that's what's happening. This only works if the underlying model is a real Turing machine — not an approximation that breaks down under scrutiny. This spec corrects three places where the current implementation (or its documentation) diverges from a real TM, and adds a systems-engineering requirements layer that uses the divergence-correction as an opportunity rather than pure overhead.

Every section below is checked against the SOUL OF THE GAME (Section 7): a change that makes the model more correct but less fun is wrong, and a change that's more fun but breaks the CS is wrong. Both axes must clear.

This is a big lift across docs, level data, the signal engine, and two live test suites. Per Tucker's direction: if the big lift is the right call, we take it. Sections are ordered so each one's scope is independently assessable — Code/QA can scope them as separate PRs even though they share a root cause.

---

## 1. The Core Correction: Win Condition Is an Output-Tape Comparison, Full Stop

### SE-TM-001 — Output Tape Is the Only Success Gate

A level is WON when, after all pulses complete, the Output Tape matches `expectedOutput`. This and only this determines pass/fail at the Completion-category level. Nothing else — not pulses-reaching-Terminal, not pieces-placed, not signal-paths-completed — determines whether the *machine is correct*. Those other things may still matter for *scoring* (Section 6 categories other than Completion), but they MUST NOT gate the win/lose determination once a level has a Transmitter.

**Why this is the correct TM model:** a Turing machine halts and you read the tape. You do not grade it on how many times the head moved through a particular square. `docs/COMPUTATIONAL_MODEL.md` already says this in Layer 3 ("After all pulses complete, compared against expectedOutput. Match = lock.") — REQ-10 in scoring-algorithm-v2.md already defines "Lock" the same way. This spec is bringing the live engine into agreement with documentation and the proposed scoring spec that already state the correct model.

### SE-TM-002 — `requiredTerminalCount` Is Pre-Transmitter Scaffolding, Not a Permanent Mechanic

`requiredTerminalCount` (currently the live success gate for A1-5, per `requiredTerminalCount.test.ts`) exists because A1-5 has no Transmitter — the player hasn't been introduced to Output Tape writing yet, so "pulses reach Terminal" is the only available signal of correctness at that point in the curriculum.

This is a legitimate scaffold, not a bug, for levels that precede Transmitter introduction (A1-1 through A1-6 per TEACHING_PROGRESSION.md). It MUST NOT be retrofitted as the success condition for any level from A1-7 onward, and for any such level `expectedOutput` comparison (SE-TM-001) MUST be the live gate.

**Required changes:**

- `requiredTerminalCount` remains valid and live ONLY for levels with no Transmitter in their solution space (effectively: tutorial levels before Output Tape exists).
- For A1-7 onward, `requiredTerminalCount`, if present in level data at all, becomes a documentary/diagnostic field only (analogous to how `expectedOutput` is currently documentary for A1-5) — it MUST NOT be read by the success-condition code path.
- `requiredTerminalCount.test.ts` needs a new top-level describe block documenting this split explicitly, so a future contributor doesn't "fix" A1-7 by reintroducing a pulse-count gate.

### SE-TM-003 — Blank Symbol (⊔) Semantics for Output Tape

An Output Tape cell that never received a Transmitter write during the run is a **blank symbol** (⊔), not `0`, not `null`-as-error, not "missing." This is the standard TM blank — the tape square the head never visited with a write head down.

- Output Tape is represented as `(number | BLANK)[]`, positionally aligned to Input Tape (same length/indexing — "sparse with blanks," not a compacted/shortened array). A pulse that never reaches a Transmitter leaves `OUT[i] = BLANK` for that pulse index `i`.
- `expectedOutput` comparison (SE-TM-001) treats `BLANK` as a real symbol that can be matched or required. A level CAN require `expectedOutput[i] = BLANK` (i.e., "this pulse must NOT produce output") — this is itself a teachable concept (conditional/filtered output, the `Optional`/`Maybe` pattern in real systems).
- Display: COGS/UI render `BLANK` distinctly from `0` (e.g., empty cell glyph vs. "0" glyph) so the player can see the difference between "the machine wrote zero" and "the machine wrote nothing here." **This is already true in the live build** — Tucker confirmed the dash glyph (`_`) is the current rendering for unwritten OUT cells (see A1-7 reference screenshot, 2026-06-13: `OUT: 1 1 _ 1 _ _ 1 1`), and it reads correctly distinct from `0`/`1`. The rendering work is done; SE-TM-003's remaining scope is the *semantic/type* layer underneath it (positional alignment, requirability in `expectedOutput`, comparator treatment of `BLANK` as a real symbol).

**Scope note:** this requires an Output Tape type change (`number[]` → `(number | typeof BLANK)[]` or equivalent) everywhere Output Tape is touched — engine, `expectedOutput` comparator, Codex field simulations referencing OUT. UI rendering is already correct and out of scope for this change. Flag for Code as a type-level change with wide blast radius on the data/comparator side; needs a full grep pass.

---

## 2. Transmitter / Terminal Topological Constraint

### SE-TM-010 — Transmitter Writes Are Currently Correct in Isolation, Wrong in Aggregate

`transmitterContract.test.ts` is right about everything it tests in isolation: Transmitter writes the carried `signalValue` (not Data Trail, not raw tape value), writes happen regardless of what happens to the signal *after* the Transmitter, last-write-wins for multiple Transmitters at one position. None of that is wrong and SE-TM-001 does not require changing any of it.

What's wrong is a *placement* pattern the engine currently permits: a Transmitter upstream of a Config Node that then blocks the pulse from reaching Terminal. In that pattern, the Output Tape receives a write for a pulse that the machine, as a whole, did not "complete" — i.e., OUT behaves like TRAIL (mutable scratch that records intermediate state) rather than like a tape you read after halting.

### SE-TM-011 — Topological Constraint: Transmitter Must Be Downstream of All Gating (RESOLVED — Option 1)

For a pulse's Transmitter write to count toward the final Output Tape (and therefore toward SE-TM-001's comparison), the Transmitter MUST sit on the signal path such that no gating piece (Config Node, Counter threshold, Divergence Gate, etc.) can block that pulse *after* the Transmitter has fired but *before* Terminal. Equivalently: gating happens upstream of Transmitter; Transmitter is the last meaningful piece before Terminal on any path that writes.

This is a **topological/placement constraint enforced by level design and (optionally) by engine validation**, not a new piece and not a redesign of Transmitter itself. `LEVEL_DESIGN_FRAMEWORK.md`'s own A1-7 guidance already states this informally: "It must be downstream of the Config Node... Placement order is execution order. Scanner before Config Node before Transmitter." This spec promotes that informal guidance to a formal constraint with engine-level consequences.

**Resolved 2026-06-13 — Option 1 (soft, level-design-only).** No engine retraction pass. Tucker confirmed via an A1-7 reference screenshot (proper placement: Scanner → Config Node → gate → Transmitter → Terminal) that the engine *already produces the correct OUT tape* (`1 1 _ 1 _ _ 1 1`) when the Transmitter is placed correctly downstream of the gate — the write-commit mechanics in `transmitterContract.test.ts` are fine as-is. There is no "phantom write" bug to retract; there is a **placement-teaching** problem and a **win-condition** problem (the latter is SE-TM-002/SE-TM-001, see below).

What Option 1 actually requires:
- COGS diagnostic feedback when a Transmitter is placed upstream of a gate that can block its pulse — descriptive, not blocking ("that write happened before the gate resolved — it won't reflect in the final tape if the gate blocks this pulse").
- Section 4's Spec Sheet documents the placement convention as a SHALL/SHOULD (per the new board-topology SHALL family — see SE-TM-035).
- Incorrect placement remains a **legitimate failure mode** — the player can still build a machine that places the Transmitter wrong, get a wrong/incomplete OUT tape, and fail SE-TM-001's comparison. That's the curriculum (build, fail, learn, rebuild), not a bug to be engineered away.

This was the single largest open engineering question in the spec and it has shrunk to: fix the A1-7 win condition (SE-TM-002, already specced), add the diagnostic copy, document the convention. No engine retraction pass, no BLANK-reversion-on-resolution logic. Section 2 is now low-risk and can ship alongside Section 1.

### SE-TM-012 — `transmitterContract.test.ts` Impact (RESOLVED — minimal)

With Option 1 confirmed, none of the existing assertions need to change on correctness grounds:

- [1.5]/[2.1]/[2.3] ("Transmitter upstream of Config Node writes on every pulse regardless of gate outcome") — remains TRUE and remains correct. This is real engine behavior; the level-design/diagnostic layer is what changes, not this assertion.
- [2.2] (Transmitter downstream of failing Config Node correctly does not write) — unaffected, already consistent with SE-TM-011.
- [4.1]-[4.4] (writes to `outputTape[pulseIndex]`, last-write-wins, writes past `expectedOutput.length`) — unaffected.
- [5.1]-[5.3] (Transmitter-then-blocker still writes, void step pushed) — remains TRUE; this is the documented "wrong placement produces a wrong-but-legitimate OUT tape" case, which SE-TM-001's comparison then correctly fails.

No test-suite revisions anticipated for Section 2 itself. The only live-test touch in this spec's Sections 1-2 is `requiredTerminalCount.test.ts` (SE-TM-002, A1-7 win condition correction) and the SE-TM-003 type/comparator change. Section 2 no longer needs its own PR — fold into Unit B alongside Section 1, or even ship as a level-data + COGS-copy change ahead of Unit B if Code wants a quick win.

---

## 3. Piece Taxonomy: TM-Core vs. Board/Physics

### SE-TM-020 — No Piece Roster Gap

Auditing all 20 pieces against real TM components: there is no missing 1:1 component. Every TM primitive (read head / Scanner, write head / Transmitter, state register / Data Trail + Config Node, transition function / the board layout itself, halt / Terminal) has a corresponding piece. The fix is documentation and Codex framing, not new pieces.

### SE-TM-021 — Two-Tier Classification

`docs/COMPUTATIONAL_MODEL.md` and the Codex SHOULD restructure the piece vocabulary into two explicit tiers, layered on top of (not replacing) the existing Physics/Protocol split:

**TM-core** — pieces with a direct 1:1 correspondence to a Turing machine component or operation:

| Piece | TM correspondence |
|-------|-------------------|
| Scanner | Read head (Input Tape → Data Trail) |
| Transmitter | Write head (signal value → Output Tape) |
| Config Node | State-dependent transition (reads Data Trail, gates based on state) |
| Latch | State register (D flip-flop — stores one bit across pulses) |
| Inverter | Logical NOT — transition function transformation |
| Counter | Bounded state accumulator — threshold-based transition |
| Capacitor | Persistent state distinct from Data Trail — extended memory |
| Divergence Gate | Logical branch (state-dependent path selection) |
| Confluence Node | Logical AND/join (multiple conditions must be satisfied) |
| Navigator | Multi-tape head reassignment — non-sequential head movement (Deep Void) |
| Sequencer | Universal-computation enabler — arbitrary sequencing/looping makes the machine Turing-complete (Deep Void). Resolved TM-core 2026-06-13 (Section 8 #1) — same category of claim as Navigator: changes what the machine *as a whole* can compute, not how signal routes on the board. Most abstract TM-core correspondence; expect this to need the most COGS scaffolding. |

**Board/physics** — pieces that route, time, or lay out signal on the physical board. Real engineering (signal routing, timing, fan-out/fan-in are genuine EE/CS topics) but the lesson is "how do you physically realize a computation," not "what is the computation":

| Piece | What it actually teaches |
|-------|---------------------------|
| Conveyor | Directional routing / wire |
| Gear | Direction change — physical layout constraint |
| Splitter | Signal fan-out (copy) |
| Merger | Signal fan-in (OR-join) |
| Bridge | Independent path crossing — board-space multiplexing |
| Relay | Timing / synchronization delay |
| Threshold Relay | OR-gated delay — fault tolerance via redundancy |
| Junction | Pass-through intersection |

**Flagged as non-CS:**

| Piece | Issue |
|-------|-------|
| Amplifier | "Signal jumps across non-adjacent cells" has no TM or even general CS correspondence — it's a pure board-geometry workaround (lets layouts skip cells). EE framing (signal boosting/repeater) is the closest real-world analog but is a stretch. Codex MUST NOT claim this piece teaches a computational concept. Framing as "infrastructure" (a repeater/relay station in the ship-systems fiction) rather than as a taught concept is fine — it just shouldn't appear in any "concept taught" field. |

### SE-TM-022 — Sequencer Placement (RESOLVED — TM-core)

Sequencer is TM-core (see SE-TM-021 table). TEACHING_PROGRESSION.md's framing of Sequencer as the Deep Void "universal computation arrives" piece was the correct signal — Sequencer is the mechanism that makes the machine Turing-complete (arbitrary program sequencing/looping), which is a claim about what the machine *can compute*, not how signal is routed. Resolved 2026-06-13 (Section 8 #1). Deep Void Codex framing for Sequencer should lean into this directly: it's the piece that completes the TM, narratively and computationally.

### SE-TM-023 — Scope: Documentation Only

This section is pure documentation/Codex restructuring. No engine or test changes. Lowest-risk section in this spec; can ship independently and immediately. Each piece's Codex entry gets a `tmCorrespondence` field (or equivalent) per `PIECE_CREATION_STANDARD.md`'s existing Codex Entry checklist — this is an additive field, not a rewrite of existing `description`/`cogsNote` fields (those still require Tucker sign-off if changed, but adding a new factual field does not need to alter existing approved copy).

---

## 4. The Spec Sheet: Reviving the Info Icon as an In-Fiction Requirements Surface

### SE-TM-030 — Purpose and Naming

The dormant top-right info icon (removed because it did nothing) is repurposed as **the Spec Sheet** — a per-level, mid-gameplay reference where COGS states what the machine needs to do, in the language an engineer actually uses on the job. The discipline being taught is real systems engineering (RFC-2119-style requirement language), but the game never names it that. "Systems engineering" is a real-world label for what the player is learning, not an in-game one — same pattern as every other concept in the game (the player builds a D flip-flop in Kepler without anyone saying "flip-flop").

In-fiction, the Spec Sheet is simply what it would be called on a working ship: the job's spec, the tasking, the requirements for this repair. COGS calling up "the specs" for a job reads as completely natural engineer behavior and requires zero new vocabulary or framing devices — it sits naturally alongside the existing Mission Dossier (which already surfaces "requirements" per the bounty dossier fields in CLAUDE_CONTEXT.md). The Spec Sheet is the condensed, always-available, mid-build version of what the Dossier promised before launch.

This serves three purposes: (1) gives the player a second framing of the same problem — what does this job actually require — without naming the framework, (2) makes star thresholds and bonus payouts legible as requirements rather than opaque scoring, (3) is itself a teachable vocabulary, taught experience-first per SE-TM-033.

This satisfies SOUL OF THE GAME (Section 7): it's "real" (RFC-2119-style requirement language is genuinely how engineering teams write specs — including, recursively, this document) and it's "fun" (a second lens on the same puzzle, with real economic stakes per SE-TM-031a, at zero added mechanical complexity).

### SE-TM-031 — Requirement Language Mapping (RESOLVED — SHALL/SHOULD/MAY/WILL/MUST/CAN are visible Spec Sheet labels from A1-1)

Adapting the standard hierarchy Tucker supplied to Axiom's existing star/scoring/economy structure. **Resolved 2026-06-13**: these terms ARE the visible section labels COGS uses on the Spec Sheet, starting at A1-1 — not Codex-only, not introduced progressively. Canon justification: COGS is not learning alongside the player. He has a working Codex/manual before the player ever boots up — these are pre-existing entries in his reference material, not concepts the game discovers together with the Engineer. "The rules of the board are in place from day one" (Tucker, 2026-06-13). Codex entries (SE-TM-034) define what each term *means* for a player who wants the formal framing; the Spec Sheet itself just uses them as labels, the way any real spec document would.

This is a reversal of the original "experience before vocabulary, formal terms are Codex-only" framing for this specific mechanic — flagged explicitly because it's a real shift from how every other concept in the game is taught. It does NOT reverse "systems engineering" remaining unnamed (SE-TM-030 stands): SHALL/SHOULD/MAY/etc. are RFC-2119 terms that read as "formal spec document," not as "this is a class on systems engineering." The terse, slightly cold formal register is itself on-brand for a COGS-authored document.

| Term | Meaning | Axiom usage |
|------|---------|-------------|
| **SHALL** | Mandatory requirement on the system (the machine) | Defines 1-star pass: "The Output Tape SHALL match the expected result." Directly maps to SE-TM-001 — SHALL statements are, mechanically, `expectedOutput` (literal or rule-based, Section 5). |
| **SHOULD** | Recommended; deviation requires justification | Maps to 2-star/3-star scoring categories (Path Integrity, Diversity, Investment, etc.) — "The machine SHOULD use no more than N pieces" / "SHOULD demonstrate at least two piece types." Not meeting a SHOULD doesn't fail the level, it caps the star ceiling. |
| **MAY** | Optional; no scoring impact on stars, but can pay out beyond stars | See SE-TM-031a — MAY statements are where "went above and beyond" gets rewarded outside the star system. |
| **CAN** | Capability statement — what a piece/system is able to do | Codex-only. "The Scanner CAN read any Input Tape cell the head currently occupies." Describes capability, not a per-level requirement. Never appears on a level's Spec Sheet. |
| **WILL** | Statement of fact about the environment | Describes the given (IN tape facts, board layout facts): "The Input Tape WILL contain exactly 5 values." Not a requirement on the player's machine — a fact about the world the machine operates in. |
| **MUST** | Hard constraint outside the system's control — physical/lore law | Reserved for constraints the player cannot violate regardless of design: "The signal MUST originate at the Source" (a board-geometry law, not a per-level choice). Distinct from SHALL: SHALL is "your design needs to satisfy this," MUST is "this is true no matter what you design." Used sparingly — most Axiom constraints are SHALL (the player's responsibility) not MUST (physics that can't be broken anyway, so stating it is rarely useful — but occasionally narratively load-bearing, e.g., a damaged-cell MUST-not-be-used-as-output constraint in Kepler). |

### SE-TM-031a — MAY Statements as a Third Incentive Track (Bonus Credits, Power-ups)

MAY statements get real teeth without touching the star system. A MAY statement is an optional, above-and-beyond condition — meeting it on top of a 3-star clear pays out beyond the level's base credit reward, exactly as a real engineer who exceeds the brief might get a bonus. This is additive to the existing credit economy, not a replacement for it:

- A MAY condition met alongside 3 stars triggers a **bonus credit payout** on top of the level's normal CR reward. The base reward and star thresholds are untouched — this is a separate, additive line.
- MAY conditions are also a natural unlock path for **power-ups** (referenced in passing in this session — not yet specced elsewhere). A power-up unlock tied to a MAY condition is "the Engineer went out of their way to do X, here's a tool for going further" — consistent with the credit economy's existing "spend more, build well, get rewarded with more than you spent" loop (CLAUDE.md, Soul of the Game).
- MAY conditions MUST NOT be required for 3 stars (that would make them SHOULD/SHALL by definition) and MUST NOT be the only path to any power-up needed for free-to-play completion (CLAUDE.md Design Principle 10 — every level solvable without spending real money; a MAY-gated power-up must always be optional flavor, not a progression bottleneck).
- This is a content/economy addition, not an engine change — it reuses the existing post-level results/reward pipeline with an additional conditional payout line. Flag for Code as additive scope once the base Spec Sheet ships; not a blocker for Sections 1-3.

### SE-TM-032 — Spec Sheet Content Structure (Per Level)

Each level's Spec Sheet SHOULD contain, at minimum:

1. **WILL statements** — facts about the given tapes/board (e.g., "The Input Tape WILL contain 5 values, each 0 or 1").
2. **SHALL statements** — the 1-star pass condition(s), derived from TWO sources (see SE-TM-035): `expectedOutput` (Section 5 makes this derivation mechanical for both literal and rule-based forms) AND, where applicable, board-topology constraints (e.g., "The board layout SHALL include at least 2 direction changes").
3. **SHOULD statements** — 2/3-star guidance, derived from the level's scoring-category weights (which categories matter most for this level).
4. Optionally, **MAY** statements (SE-TM-031a — bonus CR / power-up conditions), and **MUST** statements where a hard physical/lore constraint is narratively relevant.

This is generated content where possible (SHALL/WILL derived mechanically from level data, MAY derived from the bonus-condition definition) with COGS-voice wrapper text [PROPOSED] around the generated facts. Per SE-TM-031, the labels SHALL/SHOULD/MAY/WILL/MUST/CAN themselves appear as section headers on the Spec Sheet — not just in this internal description.

### SE-TM-033 — Discoverability and Axiom-Sector Framing (UPDATED — labels from day one, not progressive)

The Spec Sheet is present from A1-1 — it is foundational, not a late unlock. **Resolved 2026-06-13**: per SE-TM-031, the formal SHALL/SHOULD/MAY/WILL/MUST/CAN labels appear on the Spec Sheet from A1-1 — this supersedes the original "experience before vocabulary, terms introduced progressively" framing for this mechanic specifically. The player sees a real spec document, COGS-authored, from the first level.

Axiom-sector framing specifically: everything in Sector 0 is calculated and known (full tape visibility, tutorial levels are 3-star-on-pass regardless of score per existing locked rule). The Spec Sheet in the Axiom sector SHOULD reflect this — its requirements are simple, few, and effectively guaranteed by passing the level at all. This is deliberate: the Spec Sheet becomes part of the furniture, something the player has always consulted, before it ever has real stakes (MAY bonuses become meaningful starting Kepler, where variable inputs and the expanding tray give "above and beyond" actual room to exist).

COGS's narrative hook for *why* the icon was dormant and is "finally worth activating" — exact wording is Tucker's call (Section 8, #6) — should land before or at A1-1, framed as COGS routing a feed that was always technically available rather than introducing new instrumentation. **Note Tucker's confirmation that re-enabling the icon is a small lift** (it was removed, not redesigned) — this is a UI-visibility change plus the narrative hook, not new instrumentation in either the fictional or technical sense.

Codex entries (SE-TM-034) provide the *definitions* for players who want them — "what does SHALL mean" — but the Spec Sheet's use of the terms as labels does not wait for those Codex entries to unlock. The labels are load-bearing from A1-1; the Codex entries are reference material that can unlock on its own pace.

### SE-TM-034 — Codex Additions and In-Game Copy (UPDATED)

New Codex entries needed (category: folded into an existing category, not a new "Systems Engineering" category — per SE-TM-030, the discipline isn't named in-fiction):

- SHALL / SHOULD / MAY / CAN / WILL / MUST — six short entries, COGS voice [PROPOSED], each tied to a `firstEncountered` level. **Updated**: these entries define terms the player has *already seen* as Spec Sheet labels (per SE-TM-031/033) — they are not introducing new vocabulary, they're explaining vocabulary already on screen. Framing should reflect that ("You've seen SHALL on every job so far. Here's what it means.") rather than "here's a new concept."
- A "Spec Sheet" meta-entry explaining what the panel is and how to read it, written in COGS's voice without naming the underlying discipline.

Spec Sheet copy uses SHALL/SHOULD/MAY/WILL/MUST/CAN as visible section labels from A1-1 (SE-TM-031/033) — this is the resolution of the prior open question. COGS's natural-language phrasing fills in *under* each label (e.g., "SHALL: The output tape matches the expected result, exactly." rather than just the label alone) — the formal term and COGS's voice coexist; the label isn't replacing the explanation, it's framing it.

All COGS lines [PROPOSED] pending Tucker sign-off per `PIECE_CREATION_STANDARD.md` COGS Voice Rule (this rule isn't piece-scoped in practice — it applies to all COGS dialogue).

### SE-TM-035 — Board-Topology SHALL Statements (NEW)

A second SHALL family, distinct from the OUT-tape-comparison SHALL (SE-TM-001/SE-TM-031): **structural/topological requirements on the board layout itself**, independent of what the machine computes. Example raised by Tucker: COGS tells the player in (approximately) A1-3 that the board layout SHALL include at least 2 direction changes (bends) — currently stated as flavor/guidance but NOT enforced as a win condition.

This is real systems engineering — specs constrain implementation *architecture*, not just input/output behavior (e.g., "the system SHALL be implemented as at least N independently deployable services," independent of whether it produces correct output). The Axiom currently has a gap where COGS states an architectural SHALL that has no teeth — Section 7's "Real" axis is weaker for it.

**Required changes:**

- Define a board-topology validator: given the placed pieces and their positions/connections, evaluate topology predicates (e.g., "count of direction-change pieces/connections >= 2"). This sits alongside, not inside, the OUT-tape comparator (SE-TM-001) — a level can have a topology SHALL, an output SHALL, both, or (rare) neither.
- For levels with a topology SHALL (e.g., A1-3), 1-star pass requires BOTH `expectedOutput` match (if applicable) AND the topology predicate. A player who gets the right OUT tape via a layout that violates a stated topology SHALL has NOT met the level's full SHALL set — this is a real failure, consistent with "incorrect placement is a legitimate failure mode" (SE-TM-011).
- Spec Sheet (SE-TM-032) surfaces topology SHALLs alongside output SHALLs under the same SHALL label — from the player's perspective it's one list of mandatory requirements, some about what the machine produces and some about how it's built.
- **Scope/sequencing**: identify which existing levels (starting with A1-3) currently have an unenforced COGS-stated topology requirement, and whether retrofitting enforcement onto already-shipped levels is in scope for this spec's Unit B/C or a follow-up. Flag for Code to audit level data for existing COGS topology lines before scoping.

This is additive to Sections 1-2 (output-tape model) — a topology validator is a separate code path from the OUT-tape comparator, can be developed in parallel, and doesn't block or get blocked by SE-TM-001/SE-TM-011.

---

## 5. Rule-Based `expectedOutput`

### SE-TM-040 — `expectedOutput` Generalizes from Literal Array to Predicate

`expectedOutput` currently is (or is documented as) a literal array (`[1, 1, 1]` for A1-5). SE-TM-001's comparison generalizes to support two forms:

- **Literal form** (early Axiom — concrete, learnable, matches current data shape): `expectedOutput: (number | BLANK)[]`. Comparison is positional equality.
- **Rule form** (later sectors — algorithmic, prevents tape-memorization solutions): `expectedOutput: { predicate: ... }` where the predicate is evaluated against the actual Output Tape as a whole or per-cell. Examples directly from this session's discussion: "every non-blank cell is even," "exactly N non-blank cells," "OUT[i] = NOT IN[i] for all i."

Literal form is a degenerate case of rule form (`predicate = (out) => arraysEqual(out, literalArray)`), so the engine's comparator can be a single code path that accepts either a literal array (auto-wrapped) or a predicate function/descriptor.

**Canon language note (Tucker, 2026-06-13):** when these predicates surface as SHALL statements on the Spec Sheet (SE-TM-042), the phrasing must stay in-world/COGS-voice — "every non-blank cell is even" is correct as an internal/engineering description in this spec, but the in-game SHALL text needs canon-appropriate language (ship-systems framing, not textbook-CS framing). Treat the predicate descriptions in this section as the *semantic* spec, not as draft UI copy — actual Spec Sheet wording for predicate-based SHALLs is [PROPOSED] COGS copy per SE-TM-034's sign-off requirement, same as everything else on the Spec Sheet.

### SE-TM-041 — Scope and Sequencing

This section is the natural *next* step after SE-TM-001 through SE-TM-012 land — it depends on Output Tape having correct blank-symbol semantics (SE-TM-003) and a correct write-commit model (Section 2) to be meaningful; a rule like "every non-blank cell is even" is meaningless if blanks aren't modeled correctly or if writes can be phantom/uncommitted. **This section is NOT scoped for immediate implementation** — it's recorded here so the data-model and engine work in Sections 1-2 is done with rule-based predicates in mind (e.g., don't hardcode `expectedOutput` as `number[]` anywhere it could instead be `number | BLANK[] | PredicateDescriptor`).

### SE-TM-042 — Predicate Authoring and Spec Sheet Interaction

Rule-based `expectedOutput` is where the Spec Sheet (Section 4) becomes most valuable — "the output needs to contain only even numbers" is a SHALL statement (internally) that's easy to state on the Spec Sheet and hard to state as a literal array. This is also where the underlying SE discipline pays off most without ever being named: real spec-writing is specifying *properties* of correct output, not enumerating every correct output.

---

## 6. Hidden / Looping Input Tapes

### SE-TM-050 — Concept

Extending the existing TEACHING_PROGRESSION.md plan (Deep Void: "Length hidden, values unknown until pulse fires") earlier and further: an Input Tape can loop an unspecified number of times, with each cell's value hidden until that pulse fires. Combined with rule-based `expectedOutput` (Section 5), this forces the player toward general/algorithmic solutions — "solve for what you can see" stops being viable because there's nothing stable to see.

### SE-TM-051 — Scope: Explicitly Deferred

This is a genuine engine lift (tape iteration becomes potentially unbounded or dynamically-bounded, head/loop state needs new model fields, UI needs to represent "unknown length"). It is **explicitly out of scope for this spec's implementation** and is recorded here only to confirm it's a validated direction — not a new idea introduced by this spec, but an extension of Deep Void's already-planned tape visibility escalation (TEACHING_PROGRESSION.md's Tape Visibility table) and Nova Fringe's "tape is test data, not an answer key" principle. Scope AFTER Sections 1-2 ship and prove out the OUT-tape-as-truth model end to end.

**Sequencing note (Tucker, 2026-06-13):** open to bringing this forward earlier than Deep Void if a good opportunity presents itself once Sections 1-2 are live — not committing to a specific sector now, but don't treat "Deep Void" as a hard placement constraint when this gets scoped. Cross that bridge when SE-TM-040/041 are further along.

---

## 7. Soul of the Game: Real + Fun Evaluation

Every section above is checked against both axes. Summary:

| Section | Real (CS/EE/SE correspondence) | Fun (machine-building impact) |
|---------|--------------------------------|-------------------------------|
| 1. OUT-tape-as-truth, blank symbol | Exact TM tape-read-after-halt model; blank symbol is the literal TM term | Mostly invisible to the player day-to-day — corrects a thing that was already *supposed* to work this way. Net neutral-to-positive: makes "did I actually solve it" legible (no more confusing partial-credit-looking pulses). |
| 2. Transmitter/Terminal topology | The OUT tape was already a true commit log when placement is correct (confirmed by A1-7 reference) — the fix is teaching correct placement, plus the A1-7 win-condition correction | Adds a real placement constraint the player must learn ("Transmitter goes last") — a NEW thing to discover and master, exactly the kind of "elaborate machine" knowledge the game wants to reward. Wrong placement is a legitimate, COGS-diagnosed failure — no engine surprises, low risk. |
| 3. Piece taxonomy retier | Honest about what each piece teaches; removes a false claim (Amplifier) | Zero mechanical impact — pure Codex/docs. No fun cost, modest "I trust this game's claims" benefit. |
| 4. Spec Sheet (+ MAY bonus economy + board-topology SHALLs) | RFC-2119 language is real engineering practice — and now VISIBLE as such (SHALL/SHOULD/MAY/etc. labels from A1-1), justified in-fiction by COGS's pre-existing manual. SE-TM-035 closes a real gap: a stated architectural requirement (A1-3's "2 bends") finally has teeth. | Gives the player a second lens on the same puzzle for free, with real formal-document texture from day one — no new mechanics, just a new way to read what's already true. MAY-statement bonus CR/power-ups give "above and beyond" real economic teeth without touching star math. Revives a previously-cut feature. Risk: if COGS already speaking in SHALL/SHOULD/etc. from A1-1 reads as too dense for a first level — worth a pass once copy exists. |
| 5. Rule-based expectedOutput | Moves from "an answer" to "a specification" — the actual CS/SE distinction between a solution and an algorithm | High potential — this is where "build something elaborate that handles the general case" becomes possible rather than "find the one path that works for this exact tape." Deferred, but the highest-upside item long-term. |
| 6. Hidden/looping tapes | Forces TM-completeness in practice (unbounded tape) | High potential, high cost — explicitly deferred until 1-2 are proven, but not pinned to Deep Void specifically (open to earlier placement). |

Section 2's original Option 1 vs 2 fork — the one place this spec initially flagged a real undecided correctness/fun trade-off — resolved to Option 1 with no trade-off needed: the engine was already correct, the gap was teaching + win-condition data, not engine logic. No section in this spec trades CS-correctness for fun or vice versa.

---

## 8. Open Questions for Tucker

**Resolved (2026-06-13 review pass):**

- Spec Sheet present from A1-1, always-on, low-stakes/simple requirements in the Axiom sector (SE-TM-033).
- "Systems engineering" is never named in-fiction; the surface is "the specs"/Spec Sheet, in the same family as the existing Mission Dossier (SE-TM-030).
- MAY statements get a real economic incentive (bonus CR, power-up unlocks) on top of 3-star clears, additive to the existing economy (SE-TM-031a).
- **Section 2 fork** (was #1): Option 1 confirmed. A1-7 reference screenshot shows the engine already produces a correct OUT tape with correct placement — Section 2 is now placement-teaching + the A1-7 win-condition fix (SE-TM-002), not an engine retraction pass (SE-TM-011/012).
- **SE-TM-003 dash glyph**: already implemented in the live build (confirmed via A1-7 screenshot). SE-TM-003's remaining scope is type/semantic only.
- **Section 4 SHALL/SHOULD/MAY/WILL/MUST/CAN labels** (was #4): visible on the Spec Sheet from A1-1, justified by COGS's pre-existing Codex/manual — "the rules of the board are in place from day one" (SE-TM-031/033/034).
- **Power-ups** (was #5): stub — referenced as a MAY-unlock path (SE-TM-031a) with no further system design in this spec. Whoever scopes Unit C should treat "power-up" as a placeholder reward type, not build out a power-up system.
- **Sequencing** (was #6): Tucker's call, deferred to Code/QA scoping — see Section 9, Unit A still recommended first as a quick win but not mandated.
- **New — SE-TM-035 (board-topology SHALL)**: confirmed as a real, currently-unenforced requirement family (A1-3's "2 bends"). Added to Section 4 as SE-TM-035; needs a level-data audit to find all existing COGS-stated-but-unenforced topology lines before Code scopes it.
- **New — SE-TM-040 canon language**: predicate-based SHALL descriptions in this spec ("every non-blank cell is even") are semantic/internal, not draft UI copy — actual Spec Sheet wording is [PROPOSED] COGS copy per usual sign-off.
- **New — SE-TM-051 sequencing**: hidden/looping tapes not pinned to Deep Void; open to earlier placement once Sections 1-2 are live, decide later.

**Resolved (follow-up pass):**

- **Section 3.2 (Sequencer)**: TM-core, confirmed (SE-TM-022). Unit A is now fully unblocked.

**Still open:**

1. **Section 4:** Does the Spec Sheet ever contain deliberately incomplete or misleading information in later sectors (Nova Fringe's "trust the logic not what you see" resonance)? **Resolved in direction, not detail** — Tucker confirmed yes, requirements CAN be corrupted/incomplete in-game, framed as "reqs change and evolve, or are missing information, the Engineer persists" (real-world resonance: requirements drift is itself a real SE phenomenon, not just a Nova Fringe gimmick). Still needs: which sector this starts in, what the "tell" is so it reads as a taught mechanic rather than a broken Spec Sheet, and whether SE-TM-035's topology SHALLs are also subject to corruption or only output SHALLs. Flag as a follow-up spec once Units A-C are underway — it's a Section 4 *extension*, not a blocker for the base Spec Sheet.

---

## 9. Summary for Code/QA Scoping

Section 2's scope reduction means Units A and B are both smaller/lower-risk than originally drafted. Independently shippable units, roughly ordered by dependency:

- **Unit A (docs only, no code/test changes):** Section 3 — piece taxonomy retier in COMPUTATIONAL_MODEL.md + Codex `tmCorrespondence` fields, including Sequencer as TM-core (SE-TM-022, resolved). Fully unblocked — can ship immediately.
- **Unit B (engine + data model, touches live tests):** Sections 1 + 2 together — now a smaller lift than originally scoped. Requires: Output Tape type change for BLANK semantics (SE-TM-003 — comparator/data-model side only, rendering already done), `requiredTerminalCount` scope-narrowing for A1-7+ (SE-TM-002), COGS diagnostic copy [PROPOSED] for incorrect-Transmitter-placement (SE-TM-011). `transmitterContract.test.ts` needs NO revisions (SE-TM-012, resolved). `requiredTerminalCount.test.ts` needs the new describe-block split (SE-TM-002).
- **Unit C (new feature, additive):** Section 4 — Spec Sheet UI (with SHALL/SHOULD/MAY/WILL/MUST/CAN as visible labels from A1-1, per SE-TM-031/033) + board-topology SHALL validator (SE-TM-035, including the level-data audit for existing unenforced COGS topology lines) + Codex entries + MAY-bonus economy hook (SE-TM-031a, power-up as stub reward type). Can be built in parallel with Unit B once Unit B's `expectedOutput`/scoring-category shapes are stable enough to derive SHALL/SHOULD text from. The MAY-bonus payout line and the topology validator can each ship slightly after the base Spec Sheet without blocking it.
- **Unit D (deferred):** Sections 5 and 6 — not scoped for implementation now; recorded so Units B/C don't paint the data model into a corner. Section 6 (hidden/looping tapes) is not pinned to a specific sector (SE-TM-051).
- **Unit E (follow-up spec, not this spec's scope):** Section 8 #2 — Spec Sheet requirements that can become corrupted/incomplete later in the game (requirements drift as a taught mechanic). Direction confirmed by Tucker; needs its own spec once Units A-C establish the baseline Spec Sheet to corrupt.

---

END OF SPEC_TM_MODEL_AND_REQUIREMENTS.md
