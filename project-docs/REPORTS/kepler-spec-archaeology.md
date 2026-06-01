# Kepler Belt Spec Archaeology — Level-by-Level Diff (K1-1 through K1-10)

Author: Spec Archaeologist (read-only audit)
Date: 2026-05-31
Scope: Surface every disagreement across three sources. Do NOT resolve.

## Sources

- (a) ORIGINAL: `project-docs/SPECS/kepler-belt-levels.md` (titled "v3" internally; the brief calls it the original; it is the broad design doc covering all 10 levels plus the new-mechanic narrative).
- (b) V2: `project-docs/SPECS/kepler-belt-levels-v2-part1.md` (K1-1..K1-5), `-part2.md` (K1-6..K1-8), `-part3.md` (K1-9..K1-10). RFC-2119 rework with canonical Transmitter Model β and required-pieces enforcement.
- (c) CODE: `src/game/levels.ts` entries `levelK1_1` through `levelK1_10`.

Note on (a): the original file was only partially readable in this pass (lines 1-1376 of 2261). Full prose for K1-8 (from its mid-section), K1-9, and K1-10 was NOT visible. Those rows are marked "ORIGINAL NOT READ (file truncated past line 1376)" where the relevant text falls beyond the readable range. The teaching-sequence table and per-mechanic sections that WERE readable still inform those levels and are cited.

PROPOSED-copy flagging: all player-facing copy quoted below (level names, COGS lines, tutorial text, failure-message slots) is content that requires Tucker sign-off and is treated as PROPOSED unless a source explicitly marks it "DO NOT MODIFY / APPROVED in NARRATIVE.md." Where a source marks it approved, that status is noted.

---

## GLOBAL / CROSS-LEVEL DISAGREEMENTS

These are not level-specific but affect multiple levels and must be surfaced.

1. DOCUMENT-IDENTITY CONFLICT. The brief frames `kepler-belt-levels.md` as "the original" and v2 parts as the revision. But internally `kepler-belt-levels.md` titles itself "Kepler Belt Level Design v3" and claims to be the latest, layering REQUISITION store / credit economy on top of v2. The v2 part files in turn claim to REPLACE sections of `kepler-belt-levels.md`. The three documents each assert primacy over the others. This circular precedence is itself an unresolved conflict.

2. TRANSMITTER SEMANTICS. ORIGINAL (a) is silent on Model alpha vs beta. V2 (b) part1 locks canonical Model β (REQ-T-1..4): Transmitter writes the carried signal VALUE, never a presence "1". CODE (c) has no comment encoding this; behavior is implicit in the engine (not in levels.ts).

3. prePlaced() CATEGORY BUG. V2 part1 §GLOBAL CODE FIX (REQ-3) mandates adding `latch`, `inverter`, `counter` to the protocol category in `prePlaced()` lines 17-20. CODE (c) lines 17-20 still read only `configNode || scanner || transmitter`. NOT FIXED. This mis-categorizes the pre-placed Latch in K1-3 as `physics`.

4. REQUISITION STORE / CREDIT ECONOMY FIELDS. ORIGINAL (a) defines `freeTapes`, `purchasableTapes`, `creditBudget`, `depthCeiling`, `baseReward` for every level. V2 (b) defines `creditBudget`, `budget`, `scoringCategoriesVisible` but is largely SILENT on `freeTapes`/`purchasableTapes`/`depthCeiling`/`baseReward`. CODE (c) only carries those fields on K1-1; K1-2 through K1-10 have NO `freeTapes`, `purchasableTapes`, `creditBudget`, `depthCeiling`, or `baseReward`. Massive three-way divergence on the economy layer.

5. requiredPieces ENFORCEMENT. V2 part2 locks flavor A3a (post-run COGS-voiced rejection, consumes a life). ORIGINAL (a) describes a PRE-engage rejection modal ("REQUIREMENTS NOT MET", "no life lost"). These two enforcement models DIRECTLY CONTRADICT (pre-engage + no life lost vs post-run + consumes a life). CODE (c) carries `requiredPieces` data on K1-6 and K1-8 but levels.ts does not encode enforcement timing.

6. "TRAY" vs "ARC WHEEL" TERMINOLOGY. V2 part2 mandates Arc Wheel terminology, "Tray never appears." ORIGINAL (a) and CODE (c) both still use "tray" extensively (e.g. K1-1 tutorial targetRef `'tray'`, ORIGINAL "Pre-assigned tray"). Unresolved.

7. LATCH DELAY MODE. V2 part3 mandates a new third Latch mode (`delay`, D flip-flop) as a prerequisite for K1-9 and K1-10. ORIGINAL (a): SILENT (XOR/running-count framing, no delay mode). CODE (c): no delay mode; K1-9 is XOR, K1-10 is "running count" — both engine-broken per v2 part3 audit.

---

## K1-1 — Corridor Entry

| Field | (a) ORIGINAL kepler-belt-levels.md | (b) V2 part1 | (c) CODE levels.ts |
|---|---|---|---|
| Name | Corridor Entry | Corridor Entry | Corridor Entry |
| Grid | 8x6 | 8x6 | 8x6 (gridWidth 8, gridHeight 6) |
| Source | (1,1) | (1,2) | (1,2) |
| Terminal | (6,4) | (6,4) | (6,4) |
| Pre-placed | Source, Terminal only | Source, Terminal only | source(1,2), terminal(6,4) |
| Available pieces | Conveyor x3, Gear x2 (5) | Conveyor x4, Gear x2 (6) — REQ-6 FIX | Conveyor x3, Gear x2 (5) |
| optimalPieces | 5 | 6 | 5 |
| Input tape | None | undefined | undefined (no inputTape field) |
| Expected output | None | undefined | undefined |
| Computational goal | Two direction changes, no highlights | Exactly two direction changes, no highlights | "two direction changes ... player decides where pieces go" |
| Mechanic introduced | REQUISITION store, no highlights | Requisition Store (no new piece) | Requisition store (tutorial steps present) |
| Consequence | None | None | None |
| Scoring categories | (not enumerated as a field; floor-solve table generic) | `['efficiency','chainIntegrity']` — REMOVE protocolPrecision | `['efficiency','chainIntegrity','protocolPrecision']` |
| budget | (not given; floor-solve cost 40 implied) | 40 | 30 |
| creditBudget | 75 | 90 | 75 |
| depthCeiling | 10 | SILENT | 10 |
| baseReward | 100 CR | SILENT | 100 |
| freeTapes | IN | IN | ['IN'] |
| purchasableTapes | TRAIL, OUT | TRAIL, OUT (implied by goal #6 routing) | ['TRAIL','OUT'] |

### DISAGREEMENTS — K1-1

- SOURCE POSITION. (a) says Source (1,1). (b) and (c) say (1,2). Conflict between original and the other two.
- AVAILABLE PIECES / SOLVABILITY. (a)=3 Conveyors, (b)=4 Conveyors (explicitly flags the 3-Conveyor tray as UNSOLVABLE per Manhattan distance from (1,2)->(6,4)=7), (c)=3 Conveyors. CODE still has the unsolvable tray that V2 REQ-6 was written to fix. Three-way conflict; (c) matches the version (b) calls a bug.
- optimalPieces. (a)=5, (b)=6, (c)=5. Conflict; (c) does not reflect the V2 fix.
- budget. (a) implies 40 (floor-solve cost); (b)=40; (c)=30. (c) diverges.
- creditBudget. (a)=75, (b)=90, (c)=75. (b) diverges upward.
- SCORING CATEGORIES. (b) requires REMOVING protocolPrecision (no Protocol pieces present). (c) still includes protocolPrecision. (a) does not enumerate a visible-categories field. Conflict (b) vs (c).
- TUTORIAL COPY (all PROPOSED; COGS line marked APPROVED in NARRATIVE). (a) prescribes 5 instructor steps with specific store copy ("The tray contains the minimum. Swipe up..."). (c) has 6 steps with DIFFERENT store copy ("The supply manifest is below. Swipe up for the full REQUISITION store." / "Three departments. Physics components..." / forfeiture / window). (b) says "Current tutorialSteps in levels.ts are correct. No changes needed" and "6 steps" — so (b) endorses (c)'s 6 steps, contradicting (a)'s 5-step copy. The board-intro/board-resume wording also differs across (a) and (c) ("entirely up to the Engineer now" vs "entirely the Engineer's call now").
- COGS LINE. Identical text across all three. (b) marks DO NOT MODIFY / APPROVED.

---

## K1-2 — Relay Splice

| Field | (a) ORIGINAL | (b) V2 part1 | (c) CODE |
|---|---|---|---|
| Name | Relay Splice | Relay Splice | Relay Splice |
| Grid | 9x6 | 9x6 | 9x6 |
| Source | (1,3) | (1,3) | (1,3) |
| Terminal | (7,3) | (7,3) | (7,3) |
| Pre-placed | Source, Terminal | Source, Terminal | source(1,3), terminal(7,3) |
| Available pieces | Scanner x1, Conveyor x3, Transmitter x1 (5) | Conveyor x4, Scanner x1, Transmitter x1, Gear x1 (7) | Conveyor x4, Scanner x1, Transmitter x1, Gear x1 (7) |
| optimalPieces | 5 (floor solve) | 5 | 5 |
| Input tape | [1,0,1,1,0] | [1,0,1,1,0] | [1,0,1,1,0] |
| Expected output | [1,0,1,1,0] | [1,0,1,1,0] | [1,0,1,1,0] |
| Computational goal | Pass each value through unchanged | Pass each value through unchanged (identity) | "Pass each input tape value through to output unchanged" |
| Mechanic introduced | None (tape review) | None | None |
| Consequence | None | None | None |
| Scoring categories | SILENT (field) | `['efficiency','chainIntegrity','protocolPrecision']` | `['efficiency','chainIntegrity','protocolPrecision']` |
| budget | SILENT | 80 | 35 |
| creditBudget | 80 | 130 | (absent) |
| depthCeiling | 10 | SILENT | (absent) |
| baseReward | 100 CR | SILENT | (absent) |
| Data Trail | [0]x8 | 5 cells [null]x5 | [null]x5 |
| freeTapes | IN, TRAIL, OUT | SILENT | (absent) |
| purchasableTapes | None | SILENT | (absent) |

### DISAGREEMENTS — K1-2

- AVAILABLE PIECES. (a)=5 pieces (3 Conveyors, no Gear). (b)/(c)=7 pieces (4 Conveyors + 1 optional Gear). Conflict between original and the others.
- budget. (a) SILENT; (b)=80; (c)=35. (c) diverges from (b).
- creditBudget. (a)=80; (b)=130; (c)=ABSENT. Three-way divergence.
- DATA TRAIL SIZE/CONTENT. (a)="Data Trail: [0,0,0,0,0,0,0,0]" (8 zero cells). (b)=5 null cells. (c)=5 null cells. (a) conflicts (8 vs 5; zeros vs null).
- FREE/PURCHASABLE TAPES. (a) declares all three free, none purchasable. (b) SILENT. (c) field ABSENT. Divergence.
- depthCeiling/baseReward. (a) present (10/100); (b) SILENT; (c) ABSENT.
- TUTORIAL COPY (PROPOSED). (a) 2 instructor steps; (b) 2 steps (same wording); (c) 2 steps matching. Aligned. COGS line identical, marked APPROVED by (b).

---

## K1-3 — Junction 7

| Field | (a) ORIGINAL | (b) V2 part1 | (c) CODE |
|---|---|---|---|
| Name | Junction 7 | Junction 7 | Junction 7 |
| Grid | 10x7 | 10x7 | 10x7 |
| Source | (1,3) | (1,3) | (1,3) |
| Terminal | (8,5) | (8,3) | (8,3) |
| Pre-placed | Source, Terminal; (no Latch mentioned in original K1-3 — see note) | Source(1,3); Latch(4,3) WRITE; Terminal(8,3) | source(1,3), terminal(8,3), latch(4,3) |
| Available pieces | Conveyor x3, Splitter x1, Gear x2 (6) | Conveyor x4, Scanner x1, Transmitter x1, ConfigNode x1, Gear x1 (8) | Conveyor x4, Scanner x1, Transmitter x1, configNode x1, Gear x1 (8) |
| optimalPieces | 6 (min) | 5 | 5 |
| Input tape | [1,1,0,1] | [1,1,0,1,1] | [1,1,0,1,1] |
| Expected output | reach_output (no tape-gated output) | [1,1,0,1,1] | [1,1,0,1,1] |
| Computational goal | SPLITTER fork; both paths reach Terminal; signal arrives via whichever path open | Per-pulse gating (REQ-1 rewrite): Latch WRITE captures per pulse, Config gates | "Store the FIRST input value in a Latch ... gate SUBSEQUENT pulses" (the cross-pulse description v2 calls WRONG) |
| Mechanic introduced | SPLITTER (new piece) | LATCH (pre-placed, Codex here) | Latch (Codex tutorial) |
| Consequence | None | None | None |
| Scoring categories | SILENT (field) | `['efficiency','chainIntegrity','protocolPrecision']` | `['efficiency','chainIntegrity','protocolPrecision']` |
| budget | SILENT | 100 | 40 |
| creditBudget | 100 | 150 | (absent) |
| Latch latchMode | n/a (no Latch) | MUST set 'write' explicitly | NOT SET on prePlaced('latch',4,3) |
| Data Trail | [0]x8 | [null]x5 | [null]x5 |

### DISAGREEMENTS — K1-3 (largest divergence in the set)

- WHICH NEW PIECE. This is a fundamental three-way conflict. (a) K1-3 = Junction 7 introduces the SPLITTER (its teaching table row: "K1-3 Junction 7 SPLITTER Signal fork"). (b) K1-3 = Junction 7 introduces the LATCH (pre-placed). (c) K1-3 = Junction 7 introduces the Latch (pre-placed, Codex tutorial 'latch'). The original assigns the Splitter to K1-3; v2 and code assign the Latch to K1-3 and move Splitter to K1-5. The piece taught at this level is contested.
- TERMINAL POSITION. (a)=(8,5); (b)/(c)=(8,3). Conflict.
- PRE-PLACED LATCH. (a) has NO Latch (it is a Splitter level). (b)/(c) pre-place a Latch at (4,3). Conflict.
- AVAILABLE PIECES. (a)=Conveyor x3 + Splitter + Gear x2. (b)/(c)=Conveyor x4 + Scanner + Transmitter + ConfigNode + Gear. Entirely different piece sets. (a) has a Splitter in the tray; (b)/(c) do not.
- INPUT TAPE. (a)=[1,1,0,1] (4 values). (b)/(c)=[1,1,0,1,1] (5 values). Conflict.
- EXPECTED OUTPUT. (a)=reach_output, no tape-gated output. (b)/(c)=[1,1,0,1,1] identity. Conflict.
- COMPUTATIONAL GOAL. (a)=Splitter dual-path routing. (b)=per-pulse Latch-write gating (REQ-1 explicitly labels the (c) text WRONG and says it must be rewritten). (c)=the cross-pulse "store first value, gate subsequent" text v2 condemns. Three-way conflict; (c) carries the goal v2 flags as a documented bug.
- tapeDesignRationale. (c) references "stored value does not match" (cross-pulse framing); (b) REQ-1 mandates per-pulse rewrite. NOT FIXED in (c).
- latchMode. (b) requires explicit `latchMode:'write'` on the pre-placed Latch; (c) does not set it. NOT FIXED.
- prePlaced category. Per global bug #3, (c)'s Latch gets category 'physics'; (b) requires 'protocol'. NOT FIXED.
- budget. (a) SILENT; (b)=100; (c)=40. Divergence.
- creditBudget. (a)=100; (b)=150; (c)=ABSENT.
- optimalPieces. (a)=6; (b)=5; (c)=5. (a) diverges.
- COGS LINE. (a)/(b)/(c) identical text ("Junction 7 is a routing bottleneck..."), marked APPROVED by (b). Note: the SAME approved COGS line is attached to a Splitter level in (a) and a Latch level in (b)/(c).
- TUTORIAL COPY (PROPOSED). (a) describes Splitter 4-step + tape hint (step "One input. Two outputs. ... [codexEntryId: splitter]"). (b)/(c) describe Latch 3-step (codexEntryId 'latch'). Entirely different tutorial content for the same level id. (c) matches (b).
- PURCHASABLE-TAPE HINT. (a) adds a step 5 "INFRA tab ... additional capability" hint at K1-3. (b)/(c) have no such step (the tape-hint concept is tied in (a) to K1-3 as the first reach_output level; (b)/(c) make K1-3 a fully-taped identity level with no purchasable tapes). Conflict.

---

## K1-4 — Mining Platform Alpha (CONSEQUENCE)

| Field | (a) ORIGINAL | (b) V2 part1 | (c) CODE |
|---|---|---|---|
| Name | Mining Platform Alpha | Mining Platform Alpha | Mining Platform Alpha |
| Grid | 10x7 | 10x7 | 10x7 |
| Source | (8,1) top-right (reversed) | (1,3) | (1,3) |
| Terminal | (2,5) bottom-left | (8,3) | (8,3) |
| Pre-placed | Latch at (5,3) pre-placed (write mode) | Source, Terminal only (player places Latch) | source(1,3), terminal(8,3) only |
| Available pieces | Scanner, Conveyor x2, ConfigNode, Transmitter, Gear (6) | Conveyor x4, Scanner, Latch, ConfigNode, Transmitter, Gear x2 (10) | Conveyor x4, Scanner, latch, configNode, transmitter, Gear x2 (10) |
| optimalPieces | 6 | 6 | 6 |
| Input tape | [1,0,0,1,1,0] | [1,0,0,1,1,0] | [1,0,0,1,1,0] |
| Expected output | [1,0,0,1,1,0] | [1,0,0,1,1,0] | [1,0,0,1,1,0] |
| Computational goal | Store first value in Latch (write), gate subsequent via Config reading Latch | Identity via player-placed Latch WRITE per-pulse + Config gate | "Output 1 when input 1, 0 when 0. Latch stores each pulse value ... gates a Config Node" |
| Mechanic introduced | LATCH (per original teaching table) | None (Latch introduced K1-3) | (no tutorialSteps) |
| Consequence | cogsWarning "Pay attention to this one." / failureEffect 7 settlements 48h | same | same (matches) |
| Scoring categories | SILENT (field) | `['efficiency','chainIntegrity','protocolPrecision']` | `['efficiency','chainIntegrity','protocolPrecision']` |
| budget | SILENT | 130 | 45 |
| creditBudget | 100 | 180 | (absent) |
| Data Trail | [0]x8 | 6 null cells | [null]x6 |

### DISAGREEMENTS — K1-4

- SOURCE/TERMINAL POSITIONS. (a)=Source (8,1) reversed top-right, Terminal (2,5) bottom-left. (b)/(c)=Source (1,3), Terminal (8,3) horizontal. Direct conflict on board geometry and the "reversed direction" pedagogical intent.
- PRE-PLACED LATCH. (a) pre-places a Latch at (5,3). (b)/(c) have NO pre-placed Latch (player places it; Latch is in the tray). Conflict.
- AVAILABLE PIECES. (a)=6 pieces, no Latch in tray (it is pre-placed), no extra Gear. (b)/(c)=10 pieces including Latch x1 and Gear x2. Conflict.
- MECHANIC INTRODUCED. (a) teaching table marks K1-4 as the LATCH introduction. (b)/(c) treat Latch as already introduced in K1-3 (no new piece, no tutorial steps in code). Conflict — tied to the K1-3 Splitter-vs-Latch dispute.
- COMPUTATIONAL GOAL. (a)=cross-pulse "store first, gate subsequent." (b)=per-pulse identity. (c)=per-pulse identity ("Output 1 when input 1..."). (a) diverges; (b)/(c) align.
- budget. (a) SILENT; (b)=130; (c)=45. Large divergence.
- creditBudget. (a)=100; (b)=180; (c)=ABSENT.
- Data Trail. (a)=8 zero cells; (b)/(c)=6 null cells. Conflict.
- TUTORIAL. (a) prescribes a Latch 4-step tutorial. (b) says no tutorialSteps is acceptable for this consequence level. (c) has NO tutorialSteps. (a) vs (b)/(c) conflict.
- CONSEQUENCE. All three agree on cogsWarning + failureEffect text. (b) confirms requireThreeStars is NOT set on K1-4. (c) does not set requireThreeStars. Aligned.
- COGS LINE. Identical across all three; (b) marks APPROVED.

---

## K1-5 — Resupply Chain

| Field | (a) ORIGINAL | (b) V2 part1 | (c) CODE |
|---|---|---|---|
| Name | Resupply Chain | Resupply Chain | Resupply Chain |
| Grid | 10x7 | 10x8 | 10x8 |
| Source | (1,5) bottom-left | (1,4) | (1,4) |
| Terminal | (8,2) top-right | (8,4) | (8,4) |
| Pre-placed | none beyond Source/Terminal | Source(1,4); Splitter(3,4); Terminal(8,4) | source(1,4), terminal(8,4), splitter(3,4) |
| Damaged cells | (3,3),(4,4),(5,3),(6,4) — diagonal barrier | NONE | NONE (no damagedCells field) |
| Available pieces | Scanner, Conveyor x2, Latch, ConfigNode, Transmitter, Gear (7) | Conveyor x6, Scanner, ConfigNode, Merger, Transmitter, Gear x2 (12) | Conveyor x6, merger, scanner, configNode, transmitter, Gear x2 (12) |
| optimalPieces | 7 (min) | 9 (likely; code says 8, flagged VERIFY) | 8 |
| Input tape | [1,0,1,0,1] (5 values) | [1,0,1,0] (4 values) | [1,0,1,0] |
| Expected output | [1,0,1,0,1] | [1,0,1,0] (REQ-2 correction to [1,1,1,1] REJECTED) | [1,0,1,0] |
| Computational goal | Route around damaged cells, Latch store/gate | OR-redundancy: Splitter -> gated Path A + bypass Path B -> Merger | "Splitter ... Path A Config gate, Path B bypass, Merger reconverges. Bypass guarantees signal always reaches output" |
| Mechanic introduced | DAMAGED CELLS (no new piece) | SPLITTER (pre-placed, Codex) + MERGER (tray, Codex) — dual intro, REQ-5 | Merger (Codex tutorial 'merger'); Splitter pre-placed but NO Codex step |
| Consequence | None | None | None |
| Scoring categories | SILENT (field) | `['efficiency','chainIntegrity','protocolPrecision']` | `['efficiency','chainIntegrity','protocolPrecision']` |
| budget | SILENT | 155 | 50 |
| creditBudget | 100 | 205 | (absent) |
| Data Trail | [0]x8 | 4 null cells | [null]x4 |

### DISAGREEMENTS — K1-5 (second-largest divergence)

- IDENTITY OF THE LEVEL. (a) K1-5 = Resupply Chain teaches DAMAGED CELLS (no new piece), with Latch routing around a damaged diagonal. (b)/(c) K1-5 = Resupply Chain teaches MERGER (and back-introduces SPLITTER) with NO damaged cells. The level's purpose is contested at the root.
- DAMAGED CELLS. (a) specifies four damaged cells (3,3),(4,4),(5,3),(6,4) forming a diagonal barrier — the entire puzzle. (b)/(c) have NO damaged cells. Major conflict; the original's signature mechanic for this level is absent downstream.
- SOURCE/TERMINAL. (a)=Source(1,5), Terminal(8,2). (b)/(c)=Source(1,4), Terminal(8,4). Conflict.
- GRID HEIGHT. (a)=10x7; (b)/(c)=10x8. Conflict.
- PRE-PLACED SPLITTER. (a)=none. (b)/(c)=Splitter pre-placed at (3,4). Conflict.
- AVAILABLE PIECES. (a)=7 pieces incl. Latch, no Merger. (b)/(c)=12 pieces incl. Merger x1 + 6 Conveyors, NO Latch. Different sets; (a) has Latch, (b)/(c) have Merger.
- INPUT TAPE LENGTH. (a)=[1,0,1,0,1] (5). (b)/(c)=[1,0,1,0] (4). Conflict.
- EXPECTED OUTPUT. (a)=[1,0,1,0,1]. (b)/(c)=[1,0,1,0]. Note: (b) part1 §16/REQ-2 documents a REJECTED proposal to change this to [1,1,1,1] (Model alpha), confirming [1,0,1,0] under Model β. (a)'s value differs in length.
- optimalPieces. (a)=7; (b)=9 (states code's 8 is likely wrong, flagged VERIFY); (c)=8. Three-way conflict, with (b) explicitly disputing (c).
- SPLITTER CODEX. (b) REQ-5 mandates a 7-step dual-introduction tutorial that adds a Splitter collector step (codexEntryId 'splitter') because the Splitter has no prior Codex entry. (c) has only 3 tutorial steps (Merger only) — NO Splitter Codex step. NOT FIXED. (a)'s K1-5 tutorial is about damaged cells (2 steps), entirely different.
- budget. (a) SILENT; (b)=155; (c)=50. Large divergence.
- creditBudget. (a)=100; (b)=205; (c)=ABSENT.
- Data Trail. (a)=8 zero cells; (b)/(c)=4 null cells. Conflict.
- COMPUTATIONAL GOAL wording. (b) REQ wants explicit OR-redundancy framing. (c) says "bypass guarantees the signal always reaches output regardless of input value" — under Model β this is misleading (output tracks input, not always-1). (b) flags this for update. Conflict between (c) prose and Model β.
- COGS LINE. Identical across all three; (b) marks APPROVED.

---

## K1-6 — Colonist Hub (PIECE REQUIREMENT)

| Field | (a) ORIGINAL | (b) V2 part2 | (c) CODE |
|---|---|---|---|
| Name | Colonist Hub | Colonist Hub | Colonist Hub |
| Grid | 11x8 | 11x8 | 11x8 |
| Source | (1,4) | (1,4) | (1,4) |
| Terminal | (9,4) | (9,4) | (9,4) |
| Pre-placed | Splitter at (3,4) | Source, Terminal only | source(1,4), terminal(9,4) only |
| Damaged cells | (5,2),(6,6) | NONE | NONE |
| Available pieces | Conveyor x4, Merger, Scanner, ConfigNode, Transmitter, Gear x2 (10) | Conveyor x6, Scanner, Latch, Splitter, ConfigNode, Merger, Transmitter, Gear x2 (14) | Conveyor x6, scanner, latch, splitter, merger, configNode, transmitter, Gear x2 (14) |
| optimalPieces | 8 (min) | 11 (REQ-52, was 7) | 11 |
| requiredPieces | merger x1 (with reason string) | splitter x1, merger x1 (REQ-51) | splitter x1, merger x1 |
| Input tape | [1,0,1,0] (4 values) | [1,0,1,1,0,1] (6) | [1,0,1,1,0,1] |
| Expected output | [1,1,1,1] (output 1 every pulse) | [1,0,1,1,0,1] (identity) | [1,0,1,1,0,1] |
| Computational goal | OR-redundancy: bypass guarantees output 1 regardless of input | Identity via Latch-store + Splitter + gated/bypass + Merger | Identity "Output each input value faithfully using stateful branching ... Latch stores" |
| Mechanic introduced | MERGER + piece requirements | None (new mechanic = requiredPieces enforcement) | None (no tutorialSteps in code per (b)) |
| Consequence | None | None | None |
| Scoring categories | SILENT (field) | efficiency, chainIntegrity, protocolPrecision, disciplineBonus | same 4 |
| budget | SILENT | 55 CR (unchanged) | 55 |
| Data Trail | [0]x8 | 6 null cells | [null]x6 |
| Tutorial | 4-step Merger intro | 2 instructor steps (REQ-53, MUST add) | NONE (no tutorialSteps field) |

### DISAGREEMENTS — K1-6

- EXPECTED OUTPUT / COMPUTATIONAL GOAL. (a)=output [1,1,1,1], goal is "always output 1 regardless of input" (OR-redundancy bypass). (b)/(c)=identity output [1,0,1,1,0,1], goal is faithful pass-through with Latch state. DIRECT CONFLICT on what the machine computes. (a)'s always-1 framing here also collides with (a)'s OWN K1-5 (which (a) makes a damaged-cell level) — the OR-bypass concept lives at K1-6 in (a) but at K1-5 in (b)/(c).
- INPUT TAPE. (a)=[1,0,1,0] (4). (b)/(c)=[1,0,1,1,0,1] (6). Conflict.
- MERGER INTRODUCTION. (a) introduces the MERGER at K1-6 (teaching table + 4-step tutorial). (b)/(c) already introduced Merger at K1-5, so K1-6 has no new piece. Conflict.
- requiredPieces. (a)=merger x1 (with a `reason` string: "The Colonist Hub requires redundant routing..."). (b)/(c)=splitter x1 + merger x1, NO reason string. Conflict on which pieces are required and whether a reason is attached.
- PRE-PLACED SPLITTER. (a) pre-places Splitter at (3,4). (b)/(c) have NO pre-placed Splitter (Splitter is in the tray and required). Conflict.
- DAMAGED CELLS. (a)=(5,2),(6,6). (b)/(c)=none. Conflict.
- AVAILABLE PIECES. (a)=10 pieces (no Latch, no Splitter in tray). (b)/(c)=14 pieces incl. Latch + Splitter. Different sets.
- optimalPieces. (a)=8; (b)/(c)=11. Conflict.
- TUTORIAL. (a)=4-step Merger intro. (b) REQ-53 MUST add 2 instructor steps. (c) has NONE. Three-way conflict — (c) is missing the steps (b) mandates AND the steps (a) describes.
- requiredPieces ENFORCEMENT MODEL. (a) pre-engage modal, no life lost. (b) post-run rejection, consumes a life (REQ-RP-5). Direct contradiction (see global #5).
- COGS FAILURE-MESSAGE SLOT (PROPOSED). (b) defines a `requiredPiecesNotEngagedDialogue` slot, status PROPOSED, copy NOT yet authored, must reference Splitter + Merger by name. (a) describes a generic "REQUIREMENTS NOT MET" modal. (c) carries no such dialogue. Conflict + unwritten copy.
- COGS LINE. Identical text; (a) tags eyeState AMBER and so does (c). (b) marks DO NOT MODIFY.

---

## K1-7 — Ore Processing

| Field | (a) ORIGINAL | (b) V2 part2 | (c) CODE |
|---|---|---|---|
| Name | Ore Processing | Ore Processing | Ore Processing |
| Grid | 10x8 | 10x8 | 10x8 |
| Source | (1,6) bottom-left | (1,3) | (1,3) |
| Terminal | (8,2) top-right | (8,6) | (8,6) |
| Pre-placed | Bridge at (5,4) | Source(1,3), Terminal(8,6), Splitter(4,3), Bridge(5,5) | source(1,3), terminal(8,6), bridge(5,5), splitter(4,3) |
| Damaged cells | (4,5) — one cell | NONE | NONE |
| Available pieces | Conveyor x3, Scanner, Transmitter, Gear x2 (7) | Conveyor x6, Scanner, Transmitter, Gear x3, ConfigNode (12) | Conveyor x6, scanner, transmitter, Gear x3, configNode (12) |
| optimalPieces | 7 (min) | 7 (Path A floor solve; was 8, Blocker 3 removed collision Conveyor) | 7 |
| Input tape | [1,0,1,1] | [1,0,1,1] | [1,0,1,1] |
| Expected output | [1,0,1,1] | [1,0,1,1] | [1,0,1,1] |
| Computational goal | Two independent paths cross via Bridge; Path B monitoring loop | Same — Path A primary N-S, Path B monitoring E-W through Bridge | "Two independent signal processes ... Bridge allows both to cross" |
| Mechanic introduced | BRIDGE | BRIDGE (pre-placed, Codex) | Bridge (Codex tutorial 'bridge') |
| Consequence | None | None | None |
| Scoring categories | SILENT (field) | efficiency, chainIntegrity, protocolPrecision, disciplineBonus | same 4 |
| budget | SILENT | 55 (unchanged) | 55 |
| Data Trail | [0]x8 | 4 null cells | [null]x4 |

### DISAGREEMENTS — K1-7

- SOURCE/TERMINAL POSITIONS. (a)=Source(1,6) bottom-left, Terminal(8,2) top-right. (b)/(c)=Source(1,3), Terminal(8,6). Direct conflict; (a)'s "upward/breaking conventions" framing differs.
- PRE-PLACED BRIDGE POSITION. (a)=Bridge at (5,4). (b)/(c)=Bridge at (5,5). Conflict.
- PRE-PLACED SPLITTER. (a)=none (Bridge only). (b)/(c)=Splitter pre-placed at (4,3) (REQ-59, "without it Bridge's second crossing path has no signal source"). Conflict — (a) has no second signal source.
- DAMAGED CELL. (a)=(4,5). (b)/(c)=none. Conflict.
- AVAILABLE PIECES. (a)=7 pieces (3 Conveyors, no ConfigNode). (b)/(c)=12 pieces (6 Conveyors + ConfigNode + Gear x3). Different sets. Note (b) REQ-60 explicitly says Splitter must NOT be in availablePieces (it is pre-placed) — (c) correctly omits Splitter from the tray.
- optimalPieces. All three = 7. Aligned (though by different routes: (b) reaches 7 only after Blocker-3 removal of a collision Conveyor; (a) says 7 min directly).
- TUTORIAL "tray" FIX. (b) REQ-61 requires board-intro to say "available pieces" not "tray." (c) board-intro ALREADY reads "Something in the available pieces solves this" — so (c) has applied this; (a)'s K1-7 tutorial step 1 reads "Something on the board solves this" (different again). Three-way wording difference, though (c) matches (b)'s required text.
- ENGINE DEAD-END / NarrativeConsequence. (b) REQ-62 (split-arm void) and adjacency notes are engine/verify items not visible in levels.ts; (a) and (c) SILENT on these.
- budget/Data Trail. budget all 55 where stated ((a) SILENT). Data Trail (a)=8 zeros vs (b)/(c)=4 nulls — conflict.
- COGS LINE. Identical; (b) DO NOT MODIFY. eyeState AMBER in (c).

---

## K1-8 — Transit Gate (CONSEQUENCE, TWO TERMINALS in original)

| Field | (a) ORIGINAL | (b) V2 part2 | (c) CODE |
|---|---|---|---|
| Name | Transit Gate | Transit Gate | Transit Gate |
| Grid | 11x9 | 11x8 | 11x8 |
| Source | (5,1) top-center | (1,4) | (1,4) |
| Terminal(s) | TWO: Terminal A (1,7), Terminal B (9,7) | ONE: Terminal (9,4) | ONE: terminal(9,4) |
| Pre-placed | (original text past line 1376 not fully read; header says damaged (3,4),(7,4)) | Source(1,4), Terminal(9,4) only | source(1,4), terminal(9,4) only |
| Damaged cells | (3,4),(7,4) | NONE | NONE |
| Available pieces | ORIGINAL NOT READ (file truncated past line 1376) | Conveyor x6, Scanner, Latch, Bridge, ConfigNode, Transmitter, Gear x3, Merger, Splitter (16) | Conveyor x6, scanner, latch, bridge, splitter, configNode, transmitter, Gear x3, merger (16) |
| optimalPieces | ORIGINAL NOT READ | 12 (REQ-69, was 7) | 12 |
| requiredPieces | ORIGINAL NOT READ | bridge x1, latch x1, splitter x1, merger x1 (REQ-68) | bridge, latch, splitter, merger (each x1) |
| Input tape | ORIGINAL NOT READ | [1,1,0,1,0,0,1,1] | [1,1,0,1,0,0,1,1] |
| Expected output | ORIGINAL NOT READ | [1,1,0,1,0,0,1,1] | [1,1,0,1,0,0,1,1] |
| Computational goal | Two-terminal: Splitter to two Terminals, both must receive | Bridge + Latch integration, identity output, single terminal | "crosses itself via Bridge, Latch storing state" |
| Mechanic introduced | TWO-TERMINAL LEVELS (no new piece) | None (integration) | None |
| Consequence | CONSEQUENCE level (header). Text NOT READ | cogsWarning + failureEffect (DO NOT MODIFY); requireThreeStars NOT set | same cogsWarning/failureEffect; requireThreeStars not set |
| Scoring categories | NOT READ | eff, chain, protocol, discipline, speed | same 5 |
| budget | NOT READ | 60 (unchanged) | 60 |
| Data Trail | NOT READ | 8 null cells | [null]x8 |
| Tutorial | NOT READ | 2 steps (REQ-70, MUST add) | NONE |

### DISAGREEMENTS — K1-8

- TWO TERMINALS vs ONE. (a) K1-8 = Transit Gate is the TWO-TERMINAL level: Terminal A (1,7) + Terminal B (9,7), Source (5,1) top-center, both terminals must receive signal. (b)/(c) have a SINGLE Terminal at (9,4), Source (1,4), and frame K1-8 as Bridge+Latch integration. This is a root-level conflict on the level's defining mechanic. CODE has only one terminal in prePlacedPieces.
- SOURCE POSITION. (a)=(5,1) top-center; (b)/(c)=(1,4) left. Conflict.
- GRID. (a)=11x9; (b)/(c)=11x8. Conflict.
- DAMAGED CELLS. (a)=(3,4),(7,4); (b)/(c)=none. Conflict.
- MECHANIC. (a)=two-terminal levels. (b)/(c)=integration of prior pieces + requiredPieces enforcement. Conflict.
- requiredPieces. (b)/(c)=4 required types (bridge, latch, splitter, merger). (a) ORIGINAL text NOT READ for K1-8's requirements. (a)'s teaching table marks K1-8 mechanic as "Two terminals," not piece requirements.
- TUTORIAL. (b) REQ-70 MUST add 2 steps; (c) has NONE; (a) NOT READ. Conflict (c) missing mandated steps.
- NarrativeConsequence (REQ-72/75). (b) requires a NarrativeConsequence record (triggerLevelId 'K1-8', damage_system) separate from the consequence object. (c) carries only the `consequence` object; the NarrativeConsequence record is not in levels.ts. (a) NOT READ.
- COGS FAILURE-MESSAGE SLOT (PROPOSED). (b) §13 defines `requiredPiecesNotEngagedDialogue`, PROPOSED, unwritten, must enumerate Bridge/Latch/Splitter/Merger. (c) carries none. Conflict + unwritten copy.
- COGS LINE / CONSEQUENCE TEXT. (b) marks the cogsWarning ("This mission matters more than most...") and failureEffect (72h suspension, negligence inquiry) DO NOT MODIFY; (c) matches. (a) NOT READ for this text but (a)'s narrative frame for a two-terminal consequence may differ.
- AVAILABLE PIECES (b) REQ-67 adds Splitter to the tray ("current code has no Splitter"); (c) DOES include splitter in availablePieces — so (c) has applied REQ-67.

---

## K1-9 — The Narrows

| Field | (a) ORIGINAL | (b) V2 part3 | (c) CODE |
|---|---|---|---|
| Name | The Narrows | The Narrows | The Narrows |
| Grid | (teaching table: synthesis; detailed layout NOT READ, past line 1376) | 11x9 | 11x9 |
| Source | NOT READ | (1,4) | (1,4) |
| Terminal | NOT READ | (9,4) | (9,4) |
| Pre-placed | NOT READ | Source, Terminal only; no obstacles | source(1,4), terminal(9,4) |
| Available pieces | NOT READ | Conveyor x8, Latch x2, Transmitter, Scanner, ConfigNode x2, Splitter, Merger, Gear x3, Bridge | Conveyor x8, Scanner, Latch x2, Splitter, Merger, ConfigNode x2, Transmitter, Gear x3, bridge |
| optimalPieces | NOT READ | 7 (CHANGED from 11) | 11 |
| Input tape | NOT READ | [0,1,1,0,1,0] | [0,1,1,0,1,0] |
| Expected output | NOT READ | [0,0,1,1,0,1] (CHANGED from [0,1,0,1,1,1]) | [0,1,0,1,1,1] |
| Computational goal | "Synthesis" (teaching table) | output[N] = input[N-1], 1-pulse shift; output[0]=0 | XOR of current input and previously stored Latch value |
| Mechanic introduced | Synthesis (no new piece per table) | Latch DELAY mode (third tap state) | (none; XOR framing, no delay mode) |
| Consequence | NOT a consequence level (table: K1-9 not in K1-4/8/10 list) | NOT a consequence level (REQ-85) | none |
| Scoring categories | NOT READ | eff, chain, protocol, discipline, speed | same 5 |
| budget | NOT READ | 50 CR (CHANGED from 70) | 70 |
| baseReward | NOT READ | 120 CR | (absent) |
| Data Trail | NOT READ | 6 null cells | [null]x6 |
| Tutorial | NOT READ | exactly 3 steps (Latch DELAY collect) | NONE |

### DISAGREEMENTS — K1-9

- COMPUTATIONAL GOAL. (b)=1-pulse shift register, output[N]=input[N-1] (Latch DELAY). (c)=XOR of current input and stored Latch value. DIRECT CONFLICT. (b) part3 AUDIT declares the XOR design UNSOLVABLE AS DESIGNED with Kepler pieces (no Inverter; engine indexes trail.cells[pulseIndex] with no cross-pulse read). (a) NOT READ for the detailed goal (table says "Synthesis").
- EXPECTED OUTPUT. (b)=[0,0,1,1,0,1]. (c)=[0,1,0,1,1,1]. Conflict — (b) explicitly changes the (c) value, which it calls "broken."
- optimalPieces. (b)=7; (c)=11. Conflict.
- budget. (b)=50; (c)=70. Conflict.
- LATCH DELAY MODE. (b) requires a new engine mode and a 3-step tutorial introducing it (codexEntryId 'latch', updated entry). (c) has no delay mode and no tutorialSteps. Conflict; engine prerequisite unmet.
- baseReward. (b)=120; (c)=ABSENT.
- COGS LINE. (b) preserves exactly ("The Narrows is the densest section..."), eyeState 'blue'. (c) matches the text and eyeState. Aligned.
- TUTORIAL. (b)=3 steps (MUST); (c)=NONE. Conflict.

---

## K1-10 — Central Hub (BOSS, requireThreeStars)

| Field | (a) ORIGINAL | (b) V2 part3 | (c) CODE |
|---|---|---|---|
| Name | Central Hub | Central Hub | Central Hub |
| Grid | (table: Boss; layout NOT READ) | 12x9 | 12x9 |
| Source | NOT READ | (1,4) | (1,4) |
| Terminal | NOT READ | (10,4) | (10,4) |
| Pre-placed | NOT READ | Source, Terminal only; no obstacles | source(1,4), terminal(10,4) |
| Available pieces | NOT READ | Conveyor x8, Scanner x2, Latch x2, ConfigNode x2, Transmitter, Splitter, Merger, Gear x4, Bridge | Conveyor x8, Scanner x2, Latch x2, Splitter, Merger, ConfigNode x2, Transmitter, Gear x4, bridge |
| optimalPieces | NOT READ | 8 (CHANGED from 13) | 13 |
| Input tape | NOT READ | [1,1,0,1,1,1,0,0,1,1] | [1,1,0,1,1,1,0,0,1,1] |
| Expected output | NOT READ | [0,1,0,0,1,1,0,0,0,1] (CORRECT, MUST NOT change) | [0,1,0,0,1,1,0,0,0,1] |
| Computational goal | Boss / full stateful computation (table) | output[N]=input[N] AND input[N-1]; output[0]=0 (consecutive-1 detector) | "running count machine: output 1 when two or more consecutive 1s" |
| Mechanic introduced | Boss synthesis | None (synthesis; needs Latch DELAY from K1-9) | (none new) |
| Consequence | CONSEQUENCE + requireThreeStars (table) | consequence preserved exactly; requireThreeStars true | consequence with requireThreeStars: true (matches) |
| Scoring categories | NOT READ | eff, chain, protocol, discipline, speed | same 5 |
| budget | NOT READ | 80 CR (unchanged) | 80 |
| baseReward | NOT READ | 150 CR | (absent) |
| Data Trail | NOT READ | 10 null cells | [null]x10 |
| Tutorial | NOT READ | exactly 2 steps | 1 step (board-intro only) |

### DISAGREEMENTS — K1-10

- COMPUTATIONAL GOAL FRAMING. (b)=output[N]=input[N] AND input[N-1] (consecutive-1 / temporal AND, requires Latch DELAY). (c)="running count machine: output 1 when two or more consecutive 1s have been seen." These describe the SAME tape result but via different mechanisms: (b) explicitly requires the missing Latch DELAY mode (D flip-flop) and declares the current engine WRITE mode insufficient ("ENGINE FIX REQUIRED"); (c)'s "running count" prose implies cross-pulse counting that the engine cannot do per (b)'s audit. Conflict on machine design and solvability.
- EXPECTED OUTPUT. (b) and (c) agree: [0,1,0,0,1,1,0,0,0,1]. (b) marks it CORRECT, MUST NOT change. Aligned.
- optimalPieces. (b)=8; (c)=13. Conflict — (b) explicitly changes 13 to 8.
- LATCH DELAY PREREQUISITE. (b) REQ-99: K1-10 MUST NOT ship without the DELAY mode engine change. (c) has no delay mode. Conflict; prerequisite unmet.
- baseReward. (b)=150; (c)=ABSENT.
- TUTORIAL. (b) REQ-95 = exactly 2 steps (board-intro amber + board-resume blue, specific copy referencing "the Engineer"). (c) has 1 step only, with DIFFERENT copy ("Twelve columns. The largest board in this sector... compare each incoming pulse against what the Latch stored"). (c)'s single step references Latch-stored-previous (consistent with delay) but the count and wording diverge from (b). Conflict.
- COGS LINE. (b) preserves exactly ("The Central Hub. Everything in this corridor routes through here..."), eyeState 'amber'. (c) matches text and eyeState. Aligned.
- CONSEQUENCE. (b) preserves exactly (cogsWarning "Do not fail here. I will not elaborate.", failureEffect 314 colonists / 11 days / negligence inquiry, requireThreeStars true). (c) matches. Aligned.
- Data Trail. (b)/(c) both 10 null cells. Aligned.

---

## SUMMARY OF DISAGREEMENT COUNTS BY LEVEL

- K1-1: ~7 disagreements (Source pos, pieces/solvability, optimalPieces, budget, creditBudget, scoring categories, tutorial copy).
- K1-2: ~5 (available pieces, budget, creditBudget, Data Trail, free/purchasable tapes + absent econ fields).
- K1-3: ~12 (which new piece Splitter-vs-Latch, Terminal pos, pre-placed Latch, piece set, tape, expected output, comp goal, latchMode, prePlaced category, budget, creditBudget, tutorial copy). LARGEST.
- K1-4: ~8 (Source/Terminal reversed, pre-placed Latch, piece set, mechanic, comp goal, budget, creditBudget, Data Trail, tutorial).
- K1-5: ~11 (level identity damaged-cells-vs-Merger, damaged cells absent, Source/Terminal, grid height, pre-placed Splitter, piece set, tape length, expected output, optimalPieces, Splitter Codex, budget/creditBudget, Data Trail).
- K1-6: ~11 (expected output [1,1,1,1] vs identity, comp goal, tape, Merger intro, requiredPieces set+reason, pre-placed Splitter, damaged cells, piece set, optimalPieces, tutorial, enforcement model, failure dialogue).
- K1-7: ~8 (Source/Terminal, Bridge pos, pre-placed Splitter, damaged cell, piece set, tutorial wording, Data Trail; optimalPieces aligned).
- K1-8: ~9+ (two terminals vs one, Source pos, grid, damaged cells, mechanic, tutorial, NarrativeConsequence, failure dialogue; much of original NOT READ).
- K1-9: ~7 (comp goal XOR-vs-shift, expected output, optimalPieces, budget, Latch DELAY, baseReward, tutorial).
- K1-10: ~6 (comp goal/mechanism, optimalPieces, Latch DELAY prerequisite, baseReward, tutorial count+copy; tape/consequence aligned).

Approximate total flagged disagreements: ~84 across the 10 levels, plus 7 global/cross-level conflicts.

## HIGHEST-SEVERITY ROOT CONFLICTS (for Tucker)

1. K1-3 / K1-5 / K1-6 piece-and-mechanic reassignment: the ORIGINAL puts Splitter at K1-3, Damaged Cells at K1-5, Merger+PieceRequirements at K1-6; V2 and CODE put Latch at K1-3, Splitter+Merger at K1-5, integration at K1-6. The teaching sequence is fundamentally re-pinned between (a) and (b)/(c).
2. K1-8 two-terminal level (original) vs single-terminal Bridge+Latch integration (V2/code). The defining mechanic of the level is different.
3. K1-9 XOR (code) vs 1-pulse shift register (V2), with V2 declaring the code design engine-unsolvable.
4. requiredPieces enforcement timing: pre-engage/no-life-lost (original) vs post-run/consumes-a-life (V2).
5. Damaged cells: a signature original mechanic (K1-5, K1-6, K1-7, K1-8) entirely ABSENT from both V2 and code.
6. Credit-economy fields (creditBudget, freeTapes, purchasableTapes, depthCeiling, baseReward) present in original for all levels, partial in V2, present only on K1-1 in code.
