# KEPLER BELT — CANONICAL TEACHING MAP (K1-1 through K1-10)

Author role: Teaching Progression Mapper, Kepler Belt rebuild.
Scope: READ-ONLY analysis of four source docs. No source files modified.
Status of player-facing copy in this report: all PROPOSED, pending Tucker sign-off.

---

## CRITICAL FRAMING — WHAT THE DOCS ACTUALLY SAY

Before mapping anything, the honest accounting of source authority. The
docs do NOT contain a per-level (K1-1 ... K1-10) concept map for Kepler.
What they contain is:

1. A SECTOR-WIDE concept set for Kepler:
   - "Introduces: Stateful computation, non-uniform tapes, Latch,
     Merger, Bridge." (TEACHING_PROGRESSION.md:57-58)
   - Question answered: "How does a machine handle different inputs
     differently?" (TEACHING_PROGRESSION.md:54-55)
   - Key principle: "Every level must have a tape that tests the rule,
     not a tape that telegraphs the solution. A player who hardcodes
     from the tape should fail." (TEACHING_PROGRESSION.md:60-62)

2. A SECTOR-WIDE prerequisite-exit list (what must be true before Nova
   Fringe unlocks): TEACHING_PROGRESSION.md:70-76.

3. The Axiom sector's per-level concept map (the PREREQUISITE pool that
   Kepler builds on): TEACHING_PROGRESSION.md:30-37.

4. Three named consequence levels: "Consequence levels (K1-4, K1-8,
   K1-10)" (LEVEL_DESIGN_FRAMEWORK.md:419-420). These are the ONLY
   specific K1-N facts in the entire doc set. The framework tells us
   what is true of those three slots (dual penalty: blown cell + ship
   damage on void) but NOT what concept each teaches.

5. Kepler design constraints: first sector without placement highlights
   (LEVEL_DESIGN_FRAMEWORK.md:399-402, 394-396), first sector with blown
   cells and lives (LEVEL_DESIGN_FRAMEWORK.md:404-431), wires remain on
   (LEVEL_DESIGN_FRAMEWORK.md:400-401), Latch introduction must make
   write-then-read unavoidable by board design (LEVEL_DESIGN_FRAMEWORK.md:404-405).

THEREFORE: The assignment of a specific concept to a specific level
number K1-N (other than the three consequence slots existing) is NOT
present in the docs. The mapping below is a PROPOSED ordering derived by
applying the framework's own ordering rule ("The concept must build on
prerequisites from prior levels. One new piece per level maximum." —
LEVEL_DESIGN_FRAMEWORK.md:30-31) to the sector-wide concept set. Every
concept used below is drawn ONLY from the documented Kepler concept set
plus the documented Axiom prerequisite pool. No concept is invented.

The line-number "OPEN QUESTION" markers flag each decision the docs do
not adjudicate. See the consolidated Open Questions list at the end.

---

## THE PREREQUISITE POOL (Axiom exit state)

These are the lessons a player carries INTO K1-1. Every Kepler level's
"prerequisite concept" cites one of these or an earlier Kepler level.

Axiom per-level lessons (TEACHING_PROGRESSION.md:30-37):
- A1-1 Data movement, path building (Conveyor) — line 30
- A1-2 Direction change, routing (Gear) — line 31
- A1-3 Conditional gating (Config Node) — line 32
- A1-4 Complex routing, multi-bend (Gear advanced) — line 33
- A1-5 Reading input, writing memory (Scanner) — line 34
- A1-6 Multiple conditions, shared state (Config Node advanced) — line 35
- A1-7 Writing to memory, sequence (Transmitter) — line 36
- A1-8 Synthesis of all concepts (All piece types) — line 37

Axiom exit prerequisites, named explicitly (TEACHING_PROGRESSION.md:43-49):
- Signal travels along a path and direction matters — line 44
- Memory (Data Trail) persists and can be read and written — line 45
- Conditions (Config Node) gate signal based on memory values — line 46
- Order of placement determines order of execution — line 47
- Input (Scanner) and output (Transmitter) are separate — line 48

Kepler new concepts available to spend across the ten levels
(TEACHING_PROGRESSION.md:57-58, and the exit list 70-76):
- Stateful computation (TEACHING_PROGRESSION.md:57)
- Non-uniform tapes (TEACHING_PROGRESSION.md:57)
- Latch piece — single stored value influencing multiple decisions
  (TEACHING_PROGRESSION.md:58, 74; COMPUTATIONAL_MODEL.md:461-468)
- Merger piece — OR logic, parallel-path convergence
  (TEACHING_PROGRESSION.md:58; COMPUTATIONAL_MODEL.md:337-344)
- Bridge piece — independence, two paths share a cell
  (TEACHING_PROGRESSION.md:58; COMPUTATIONAL_MODEL.md:346-354)
- Dynamic write/read across pulses (TEACHING_PROGRESSION.md:73)
- Parallel paths serving different purposes (TEACHING_PROGRESSION.md:75)
- "The difference between a solution and an algorithm"
  (TEACHING_PROGRESSION.md:76)

Catalog note: The CLAUDE.md current-state section lists five built-but-
unassigned pieces (Merger, Bridge, Inverter, Counter, Latch). Of those,
the docs assign Merger, Bridge, and Latch to KEPLER. Inverter and Counter
are assigned to LATER sectors (Inverter -> Nova Fringe,
COMPUTATIONAL_MODEL.md:441-449 + TEACHING_PROGRESSION.md:85; Counter ->
The Rift, COMPUTATIONAL_MODEL.md:451-459 + TEACHING_PROGRESSION.md:114).
Kepler must WITHHOLD Inverter and Counter to preserve the curriculum.

---

## ONE-PASS DIFFICULTY READING

The framework requires concept order to build on prerequisites
(LEVEL_DESIGN_FRAMEWORK.md:30-31) and one new piece per level maximum
(same lines). It also constrains Kepler specifically: simple routing
early ("Early levels compensate with simple routing. Introduce non-
uniform tapes gradually." LEVEL_DESIGN_FRAMEWORK.md:401-403), and the
Latch's introduction must make write-then-read unavoidable by board
design (LEVEL_DESIGN_FRAMEWORK.md:404-405). Three consequence slots are
fixed at K1-4, K1-8, K1-10 (LEVEL_DESIGN_FRAMEWORK.md:419-420).

These constraints produce a natural concept spine. The Kepler question
is "how does a machine handle different inputs differently?"
(TEACHING_PROGRESSION.md:54-55), so the sector's through-line is
non-uniform tapes + stateful computation, climaxing in the Latch (the
piece that lets one stored value drive multiple decisions) and the
"solution vs algorithm" distinction (TEACHING_PROGRESSION.md:76).

The new-piece budget for the sector is exactly three (Merger, Bridge,
Latch). With ten levels and a max of one new piece per level, at least
seven levels teach a non-piece concept (non-uniform tape handling,
dynamic state, parallel purpose, algorithm-vs-solution) or reinforce a
prior one. The proposed spine below honors that.

---

## PER-LEVEL MAP (PROPOSED ORDERING)

For each level: prerequisite concept (cited), new concept (cited),
order rationale, failure-mode/diagnostic opportunity, and pieces to
EXPOSE vs WITHHOLD. Diagnostic copy is PROPOSED and uses COGS voice;
COGS-to-Engineer speech may use "you" (the carveout). No COGS line here
is approved — all require Tucker sign-off per
LEVEL_DESIGN_FRAMEWORK.md:82-83 and PIECE_CREATION_STANDARD.md:52-55.

---

### K1-1 — Reintroduction under new rules: non-uniform tape, no highlights

- Prerequisite concept: Reading input into memory and gating on it; the
  full three-layer pipeline from Axiom (Scanner reads / Config Node
  gates / Transmitter records). Cited: TEACHING_PROGRESSION.md:34
  (Scanner), :36 (Transmitter), :46 (conditions gate on memory).
- New concept: Non-uniform tapes — the machine must handle different
  inputs differently. Cited: TEACHING_PROGRESSION.md:57 (non-uniform
  tapes), :54-55 (the sector question). Plus the meta-change: first
  sector without placement highlights (LEVEL_DESIGN_FRAMEWORK.md:401-402,
  CLAUDE.md design-principle "placement highlights ... Axiom sector only").
- Order rationale: Kepler opens by re-running a known pipeline but on a
  tape that varies. The framework mandates simple routing early
  (LEVEL_DESIGN_FRAMEWORK.md:401-403). This isolates the ONE new variable
  (the tape is no longer uniform) against an otherwise-familiar machine,
  satisfying "build on prerequisites" (LEVEL_DESIGN_FRAMEWORK.md:30-31).
- Failure mode / diagnostic opportunity: The Engineer hardcodes for the
  first tape value (a stateless pass-through that happened to work in
  Axiom) and the machine produces wrong output on the differing bit.
  This is the canonical Kepler failure: "A player who hardcodes from the
  tape should fail." (TEACHING_PROGRESSION.md:60-62). Diagnostic should
  name it in computational terms per COMPUTATIONAL_MODEL.md:152-158, e.g.
  PROPOSED: "The output matched the first pulse and missed the rest. The
  machine answered one question and assumed the others were identical.
  They were not."
- EXPOSE: Conveyor, Gear, Config Node, Scanner, Transmitter (all Axiom
  pieces — the carried-forward vocabulary).
- WITHHOLD: Merger, Bridge, Latch (the three Kepler-new pieces are saved
  for their own introduction levels), and all later-sector pieces
  (Inverter, Counter, Capacitor, Divergence Gate, Confluence Node,
  Navigator, Resonator, Sequencer, Threshold Relay, Amplifier, Junction,
  Splitter unless a level explicitly needs it). DOCS SILENT on exact tray
  per level — see Open Questions.

---

### K1-2 — Dynamic state across pulses (Data Trail as live memory)

- Prerequisite concept: Non-uniform tape handling (K1-1, this report);
  memory persists and can be read and written
  (TEACHING_PROGRESSION.md:45).
- New concept: Memory written and read dynamically across pulses — the
  Data Trail as live memory, not a static preset. Cited:
  TEACHING_PROGRESSION.md:73 ("Memory can be written and read dynamically
  across pulses"); reinforced by the A1-6 retrofit lesson that the Data
  Trail is live not static (LEVEL_DESIGN_FRAMEWORK.md:158-161) and by
  COMPUTATIONAL_MODEL.md:246-249 (Layer 2 is what makes a machine
  stateful).
- Order rationale: Once the tape varies (K1-1), the next competence is
  reacting to that variation by writing/reading state each pulse. This is
  "stateful computation" (TEACHING_PROGRESSION.md:57) in its simplest
  single-write/single-read form, before any new piece is introduced.
  Keeps one-new-concept discipline (LEVEL_DESIGN_FRAMEWORK.md:30-31).
- Failure mode / diagnostic opportunity: The Engineer writes the trail
  once (static) and every pulse reads the same stale value, so gates
  behave identically regardless of input. This is exactly the documented
  A1-6 failure pattern reframed as a Kepler lesson (Config Nodes read
  stale values — LEVEL_DESIGN_FRAMEWORK.md:158-159). PROPOSED diagnostic:
  "The trail was written once and read many times. The signal kept asking
  a question that had already stopped changing its answer."
- EXPOSE: Conveyor, Gear, Config Node, Scanner, Transmitter (Scanner must
  write each pulse). No new piece.
- WITHHOLD: Merger, Bridge, Latch; all later-sector pieces. DOCS SILENT
  on exact tray.

---

### K1-3 — Merger: OR logic / parallel-path convergence (NEW PIECE)

- Prerequisite concept: Dynamic state and routing established (K1-1, K1-2);
  Gear-based routing from Axiom (TEACHING_PROGRESSION.md:31).
- New concept: Merger — two paths converge into one; either input
  suffices (OR logic). Cited: TEACHING_PROGRESSION.md:58 (Merger named as
  Kepler introduction); COMPUTATIONAL_MODEL.md:337-344 (Merger function:
  "Either is sufficient. OR logic"). This also begins the "parallel
  paths" thread (TEACHING_PROGRESSION.md:75).
- Order rationale: Merger is the gentlest of the three Kepler pieces to
  introduce because it requires no new tape concept — it is a Physics
  piece operating purely on Layer 1 (COMPUTATIONAL_MODEL.md:227-228).
  Introducing it before the Latch keeps the harder stateful piece last,
  matching "Introduce non-uniform tapes gradually"
  (LEVEL_DESIGN_FRAMEWORK.md:401-403) and one-new-piece-per-level
  (LEVEL_DESIGN_FRAMEWORK.md:30-31). Follows the four-step tutorial
  pattern for a new piece (LEVEL_DESIGN_FRAMEWORK.md:191-228).
- Failure mode / diagnostic opportunity: The Engineer treats the Merger
  as requiring BOTH inputs (confusing it with future AND logic), or
  routes only one path and leaves the second dangling, expecting failure.
  The diagnostic teaches that either input is sufficient. PROPOSED:
  "One path arrived. That was enough. The Merger does not count its
  inputs. It only notices that one of them showed up."
- EXPOSE: Merger (new, with tutorial step per PIECE_CREATION_STANDARD.md:41-46),
  plus Conveyor, Gear, Splitter (Splitter likely needed to create the two
  paths that the Merger reconverges — COMPUTATIONAL_MODEL.md:329-335),
  Scanner, Config Node, Transmitter as carried vocabulary.
- WITHHOLD: Bridge, Latch (saved); all later-sector pieces; Confluence
  Node specifically (AND logic must NOT appear here or the Merger/AND
  contrast collapses — Confluence Node is Nova Fringe,
  COMPUTATIONAL_MODEL.md:492-501, TEACHING_PROGRESSION.md:86).

---

### K1-4 — CONSEQUENCE LEVEL: precise placement under stakes

- Slot fact (documented): K1-4 is a consequence level — void result fires
  BOTH a blown cell and ship damage. Cited: LEVEL_DESIGN_FRAMEWORK.md:419-422.
- Prerequisite concept: Everything through K1-3 (non-uniform tape,
  dynamic state, Merger/OR). The blown-cell mechanic itself was introduced
  sector-wide at K1-1 onward (LEVEL_DESIGN_FRAMEWORK.md:404-431).
- New concept: DOCS DO NOT NAME a new computational concept for K1-4. The
  framework only fixes its consequence status. PROPOSED (flagged, not
  canonical): the consolidation concept here is "precise placement as the
  Kepler discipline" — "Precise placement is the lesson Kepler teaches
  through consequence" (LEVEL_DESIGN_FRAMEWORK.md:429-431). This is a
  mechanics/discipline lesson, not a new piece. OPEN QUESTION whether
  K1-4 should also carry a fresh computational concept or be a pure
  consequence/consolidation beat.
- Order rationale: Placing the first consequence beat at K1-4 (after the
  Merger has expanded routing options) lets the board carry the documented
  extra slack consequence levels require ("slightly more generous with
  board space" — LEVEL_DESIGN_FRAMEWORK.md:422-423) while the deterministic
  blown-cell rule (LEVEL_DESIGN_FRAMEWORK.md:429-431) makes the
  placement-precision lesson land with weight. Human stakes are active and
  must not be softened (LEVEL_DESIGN_FRAMEWORK.md:404-405,
  TEACHING_PROGRESSION.md:63-68).
- Failure mode / diagnostic opportunity: Signal dies at the piece where
  the Engineer was imprecise; that piece blows and scars the cell; a life
  is lost; the narrative consequence fires. The diagnostic must report
  the human consequence "without editorializing" (TEACHING_PROGRESSION.md:65-68)
  and name the computational fault (COMPUTATIONAL_MODEL.md:152-158).
  PROPOSED: "The signal stopped at the Conveyor on the third row. That
  cell is gone now. The people downstream of this system noticed. I am
  reporting that, not interpreting it."
- EXPOSE: DOCS SILENT on exact tray. By the spine, carried vocabulary plus
  Merger; board with documented extra slack (LEVEL_DESIGN_FRAMEWORK.md:411-412,
  422-423) so 2-3 cells can blow before geometric softlock.
- WITHHOLD: Bridge, Latch (not yet introduced); later-sector pieces.

---

### K1-5 — Bridge: independence / two paths share one cell (NEW PIECE)

- Prerequisite concept: Parallel paths from the Merger (K1-3,
  TEACHING_PROGRESSION.md:75); routing density now pressured by blown-cell
  scars (K1-4, LEVEL_DESIGN_FRAMEWORK.md:404-431).
- New concept: Bridge — two independent signal paths share one cell
  without interacting (independence). Cited: TEACHING_PROGRESSION.md:58
  (Bridge named as Kepler introduction); COMPUTATIONAL_MODEL.md:346-354
  ("Two things can occupy the same space without affecting each other").
- Order rationale: The Bridge solves a geometric problem (crossing paths),
  which becomes most motivated AFTER the board has tightened — i.e. after
  the first consequence level has potentially scarred cells (K1-4) and
  after parallel paths exist (Merger, K1-3). Placing Bridge at K1-5 means
  the Engineer needs it because the board demands a crossing, which is the
  cleanest possible "experience before vocabulary" framing
  (TEACHING_PROGRESSION.md:10-12). One new piece (LEVEL_DESIGN_FRAMEWORK.md:30-31);
  four-step tutorial (LEVEL_DESIGN_FRAMEWORK.md:191-228).
- Failure mode / diagnostic opportunity: The Engineer tries to cross two
  paths through an ordinary intersection (or a Junction/Gear) and the
  signals interfere or mis-route; or assumes the two Bridge paths affect
  each other. Diagnostic teaches independence. PROPOSED: "Two signals went
  through the same cell. They did not meet. They were never going to. The
  Bridge keeps them strangers."
- EXPOSE: Bridge (new, tutorial step), plus Conveyor, Gear, Merger,
  Scanner, Config Node, Transmitter.
- WITHHOLD: Latch (saved for the sector climax run); later-sector pieces.
  Junction specifically should be WITHHELD here so the Bridge is the only
  tool that solves a clean crossing (Junction is The Rift,
  TEACHING_PROGRESSION.md:114-116; COMPUTATIONAL_MODEL.md:387-395).

---

### K1-6 — Parallel paths serving DIFFERENT purposes simultaneously

- Prerequisite concept: Merger (OR convergence, K1-3) and Bridge
  (independent crossing, K1-5) both established.
- New concept: Parallel paths can serve different purposes
  simultaneously. Cited: TEACHING_PROGRESSION.md:75 ("Parallel paths can
  serve different purposes simultaneously"). This is the synthesis of the
  two Physics pieces just learned into a single board where one path
  carries the signal-of-record and another does independent work.
- Order rationale: Now that the Engineer has both a converging tool
  (Merger) and a non-interacting tool (Bridge), the level that makes the
  two paths do DIFFERENT jobs at once is the natural consolidation. No new
  piece (preserving budget for the Latch climax), satisfying
  one-new-concept (LEVEL_DESIGN_FRAMEWORK.md:30-31).
- Failure mode / diagnostic opportunity: The Engineer collapses the two
  purposes into one path (a single-path solution), losing one of the
  required behaviors; or merges paths that should have stayed independent.
  PROPOSED: "Both jobs went down one wire. One of them got done. The other
  is still waiting. Two purposes need two paths."
- EXPOSE: Merger, Bridge, plus carried vocabulary (Conveyor, Gear,
  Splitter, Scanner, Config Node, Transmitter). No new piece.
- WITHHOLD: Latch; later-sector pieces.

---

### K1-7 — Latch: a single stored value (NEW PIECE, write/read separated)

- Prerequisite concept: Dynamic state across pulses (K1-2,
  TEACHING_PROGRESSION.md:73); input and output are separate operations,
  i.e. the read/write distinction (TEACHING_PROGRESSION.md:48).
- New concept: Latch — stores a single bit; WRITE captures, READ outputs
  the stored value regardless of input. A single stored value can
  influence multiple decisions. Cited: TEACHING_PROGRESSION.md:58 (Latch
  named), :74 ("A single stored value (Latch) can influence multiple
  decisions"); COMPUTATIONAL_MODEL.md:461-468 (Latch function and "Write
  and read are separate operations"). Kepler-specific design mandate:
  "Latch introduction must make write-then-read unavoidable by board
  design" (LEVEL_DESIGN_FRAMEWORK.md:404-405).
- Order rationale: The Latch is the hardest and most load-bearing Kepler
  piece — it is the literal embodiment of "stateful computation"
  (TEACHING_PROGRESSION.md:57) and the prerequisite for the sector's
  capstone idea (solution vs algorithm). It comes last among the three
  pieces because it depends on the Engineer already understanding dynamic
  trail state (K1-2) and read/write separation. One new piece
  (LEVEL_DESIGN_FRAMEWORK.md:30-31); four-step tutorial
  (LEVEL_DESIGN_FRAMEWORK.md:191-228). The board must force write-then-read
  ordering (LEVEL_DESIGN_FRAMEWORK.md:404-405), which ties directly to the
  Axiom prerequisite "Order of placement determines order of execution"
  (TEACHING_PROGRESSION.md:47).
- Failure mode / diagnostic opportunity: The Engineer places the Latch in
  READ mode before any WRITE has occurred (reads garbage / default), or
  never toggles latchMode (tap toggles write/read —
  COMPUTATIONAL_MODEL.md:305-306, 463-464), so the stored bit is never
  captured. Diagnostic teaches that a read precedes a write only by
  mistake. PROPOSED: "The Latch read a value it was never given. Memory
  works in one order. Write, then read. You asked it to remember something
  before you told it anything."
- EXPOSE: Latch (new, tutorial step; note tap toggles latchMode per
  COMPUTATIONAL_MODEL.md:305-306), plus Scanner, Config Node, Transmitter,
  Conveyor, Gear.
- WITHHOLD: later-sector pieces. Capacitor specifically must be WITHHELD
  (it is the Nova Fringe contrast to the Latch — persistent vs dynamic
  state, COMPUTATIONAL_MODEL.md:470-479, TEACHING_PROGRESSION.md:103).

---

### K1-8 — CONSEQUENCE LEVEL: one stored value drives multiple decisions

- Slot fact (documented): K1-8 is a consequence level (blown cell + ship
  damage on void). Cited: LEVEL_DESIGN_FRAMEWORK.md:419-422.
- Prerequisite concept: The Latch and write-then-read ordering (K1-7,
  TEACHING_PROGRESSION.md:58, 74).
- New concept: A single stored value influencing MULTIPLE decisions —
  reading one Latch from several downstream Config Nodes. Cited:
  TEACHING_PROGRESSION.md:74 ("A single stored value (Latch) can influence
  multiple decisions"). This extends K1-7's single-decision Latch use,
  mirroring how A1-6 extended the single Config Node to multiple gates on
  shared state (TEACHING_PROGRESSION.md:35; LEVEL_DESIGN_FRAMEWORK.md:152-161).
- Order rationale: Placing the multi-decision Latch lesson on a consequence
  slot raises the stakes precisely where placement order and state timing
  are most error-prone, reinforcing Kepler's discipline lesson
  (LEVEL_DESIGN_FRAMEWORK.md:429-431) with the documented dual penalty.
  Consequence boards get extra slack (LEVEL_DESIGN_FRAMEWORK.md:422-423).
- Failure mode / diagnostic opportunity: The Engineer stores the right bit
  but one downstream gate reads before the Latch is in READ mode, or the
  Engineer duplicates state (multiple writes) instead of reusing one stored
  value, causing inconsistent gate behavior — and on void, a cell blows and
  the narrative consequence fires. PROPOSED: "One value. Three gates. Two
  of them agreed with it. The third checked too early and disagreed with
  the other two. A cell is gone. So is some trust downstream."
- EXPOSE: DOCS SILENT on exact tray. Spine: Latch, multiple Config Nodes,
  Scanner, Transmitter, Conveyor, Gear; board with consequence slack.
- WITHHOLD: later-sector pieces.

---

### K1-9 — Solution vs algorithm: a machine correct for ANY valid input

- Prerequisite concept: Stateful, multi-decision machines (K1-7, K1-8);
  non-uniform tapes (K1-1).
- New concept: The difference between a solution and an algorithm — a
  machine must produce correct output for ANY valid input, not just the
  shown tape. Cited: TEACHING_PROGRESSION.md:76 ("The difference between a
  solution and an algorithm") and :72 ("A machine must produce correct
  output for any valid input"). This is the Kepler exit thesis and the
  bridge to Nova Fringe's input-independence theme
  (TEACHING_PROGRESSION.md:90-93, COMPUTATIONAL_MODEL.md:551).
- Order rationale: This is the conceptual capstone and must come after all
  three Kepler pieces and after multi-decision state, because it is a
  statement ABOUT the machines the Engineer can now build, not a new piece.
  It generalizes the K1-1 anti-hardcode lesson into an explicit principle.
  One new concept, no new piece (LEVEL_DESIGN_FRAMEWORK.md:30-31).
- Failure mode / diagnostic opportunity: The Engineer builds a machine
  tuned to the visible tape (hardcoded) that the level's edge-case tape
  defeats — the documented mandatory Kepler failure
  (TEACHING_PROGRESSION.md:60-62) and the framework's tape rule
  (LEVEL_DESIGN_FRAMEWORK.md:64-69, 98). PROPOSED: "It solved the tape.
  It did not solve the problem. Those are different achievements. Only one
  of them survives a new tape."
- EXPOSE: Full carried Kepler vocabulary (Conveyor, Gear, Splitter, Merger,
  Bridge, Latch, Scanner, Config Node, Transmitter). No new piece.
- WITHHOLD: all later-sector pieces.

---

### K1-10 — CONSEQUENCE LEVEL: Kepler synthesis capstone

- Slot fact (documented): K1-10 is a consequence level (blown cell + ship
  damage on void). Cited: LEVEL_DESIGN_FRAMEWORK.md:419-422.
- Prerequisite concept: All Kepler concepts and pieces (K1-1 ... K1-9).
- New concept: DOCS DO NOT NAME a new computational concept for K1-10. As
  the sector's final level it is the synthesis/exit gate — it should verify
  the full Kepler exit prerequisite list before Nova Fringe unlocks. Cited
  (the exit checklist this level should certify): TEACHING_PROGRESSION.md:70-76.
  This mirrors the Axiom A1-8 synthesis-boss role (TEACHING_PROGRESSION.md:37;
  LEVEL_DESIGN_FRAMEWORK.md:178-187, 373-387). PROPOSED that K1-10 is the
  Kepler synthesis capstone; OPEN QUESTION whether the docs intend a final
  distinct concept or pure synthesis.
- Order rationale: Final slot, on a consequence beat, is where the sector's
  human-stakes arc culminates (TEACHING_PROGRESSION.md:63-68) and where the
  Engineer must demonstrate a robust algorithm under maximum pressure
  (dual penalty + tightest board). Consequence boards get extra slack
  (LEVEL_DESIGN_FRAMEWORK.md:422-423).
- Failure mode / diagnostic opportunity: Any single Kepler competence gap
  (stale state, hardcoded tape, wrong Latch ordering, collapsed parallel
  paths) surfaces here; void fires the dual penalty. The diagnostic should
  name the specific failed layer (COMPUTATIONAL_MODEL.md:152-158) and report
  the human consequence without editorializing (TEACHING_PROGRESSION.md:65-68).
- EXPOSE: DOCS SILENT on exact tray. Spine: all Kepler-and-earlier pieces;
  board with consequence slack. Per the expanding-tray model, by late Kepler
  the pre-assigned count is decreasing and the Engineer is expected to
  requisition (COMPUTATIONAL_MODEL.md:62-68).
- WITHHOLD: all later-sector pieces (Inverter, Counter, Capacitor,
  Divergence Gate, Confluence Node, Relay, Threshold Relay, Amplifier,
  Junction, Sequencer, Navigator, Resonator).

---

## SECTOR-WIDE EXPOSE / WITHHOLD SUMMARY

EXPOSED across Kepler (newly, in introduction order):
- Merger (PROPOSED K1-3) — TEACHING_PROGRESSION.md:58; COMPUTATIONAL_MODEL.md:337-344
- Bridge (PROPOSED K1-5) — TEACHING_PROGRESSION.md:58; COMPUTATIONAL_MODEL.md:346-354
- Latch (PROPOSED K1-7) — TEACHING_PROGRESSION.md:58; COMPUTATIONAL_MODEL.md:461-468

CARRIED FORWARD (available, not new): Conveyor, Gear, Splitter, Config
Node, Scanner, Transmitter (the Axiom vocabulary, TEACHING_PROGRESSION.md:30-37).
NOTE: Splitter is listed as a Physics piece (COMPUTATIONAL_MODEL.md:329-335)
but the Axiom per-level map (TEACHING_PROGRESSION.md:30-37) does not name a
Splitter introduction level. OPEN QUESTION: is Splitter introduced in Axiom
or Kepler? If it is first needed by the Merger (K1-3), its first appearance
may belong to Kepler.

WITHHELD across all of Kepler (reserved for later sectors), with the
sector that owns each:
- Inverter -> Nova Fringe (TEACHING_PROGRESSION.md:85; COMPUTATIONAL_MODEL.md:441-449)
- Capacitor -> Nova Fringe (TEACHING_PROGRESSION.md:85; COMPUTATIONAL_MODEL.md:470-479)
- Confluence Node -> Nova Fringe (TEACHING_PROGRESSION.md:86; COMPUTATIONAL_MODEL.md:492-501)
- Divergence Gate -> Nova Fringe (TEACHING_PROGRESSION.md:86; COMPUTATIONAL_MODEL.md:481-490)
- Relay -> The Rift (TEACHING_PROGRESSION.md:114; COMPUTATIONAL_MODEL.md:356-364)
- Counter -> The Rift (TEACHING_PROGRESSION.md:114; COMPUTATIONAL_MODEL.md:451-459)
- Threshold Relay -> The Rift (TEACHING_PROGRESSION.md:114; COMPUTATIONAL_MODEL.md:366-376)
- Junction -> The Rift (TEACHING_PROGRESSION.md:114; COMPUTATIONAL_MODEL.md:387-395)
- Amplifier -> not assigned a sector in the docs; OPEN QUESTION (catalog
  entry COMPUTATIONAL_MODEL.md:378-385 but no teaching-progression slot)
- Sequencer -> Deep Void (TEACHING_PROGRESSION.md:161; COMPUTATIONAL_MODEL.md:397-405)
- Navigator -> Deep Void (TEACHING_PROGRESSION.md:156-166; COMPUTATIONAL_MODEL.md:503-523)
- Resonator -> The Cradle (TEACHING_PROGRESSION.md:196-214; COMPUTATIONAL_MODEL.md:525-537)

---

## OPEN QUESTIONS FOR TUCKER (where the docs are SILENT)

1. The docs contain NO per-level (K1-1..K1-10) concept assignment beyond
   naming K1-4, K1-8, K1-10 as consequence levels
   (LEVEL_DESIGN_FRAMEWORK.md:419-420). The ordering above is PROPOSED.
   Confirm or re-order.
2. K1-4 and K1-10 (and arguably K1-8): do the consequence slots also carry
   a NEW computational concept, or are they consolidation/synthesis beats?
   Docs name only their consequence status, not a concept.
3. Tape visibility: TEACHING_PROGRESSION.md:226 says Kepler is "Full tape
   visible, complex patterns" — confirm no per-level visibility variation
   within Kepler.
4. Splitter ownership: is the Splitter introduced in Axiom or first in
   Kepler (e.g. to feed the Merger at K1-3)? The Axiom map does not name a
   Splitter level (TEACHING_PROGRESSION.md:30-37).
5. Amplifier has a catalog entry (COMPUTATIONAL_MODEL.md:378-385) but no
   teaching-progression sector assignment anywhere. Where does it belong?
6. Per-level tray composition (exact pieces and counts) and floor-solve
   piece counts are not specified for any Kepler level; the framework
   requires them (LEVEL_DESIGN_FRAMEWORK.md:38-60, 94-100) but they must be
   designed. The EXPOSE/WITHHOLD lists above are concept-level, not final
   trays.
7. Pre-assigned vs purchasable split: COMPUTATIONAL_MODEL.md:62-68 says
   pre-assigned counts decrease across the sector and "Completing a level
   using only the pre-assigned pieces (the floor solve) earns a MAXIMUM of
   1 star" (COMPUTATIONAL_MODEL.md:70-75). The per-level decrement schedule
   for K1-1..K1-10 is not specified.
8. All PROPOSED COGS diagnostic lines in this report require Tucker
   sign-off before any use (LEVEL_DESIGN_FRAMEWORK.md:82-83;
   PIECE_CREATION_STANDARD.md:52-55). They are drafted here only to show
   the diagnostic-feedback opportunity per level.
