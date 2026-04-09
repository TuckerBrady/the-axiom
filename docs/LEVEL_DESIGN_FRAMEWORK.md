# THE AXIOM — LEVEL DESIGN FRAMEWORK
### The Practical Guide for Building Levels | Version 1.0

Read docs/COMPUTATIONAL_MODEL.md and
docs/TEACHING_PROGRESSION.md before using this document.

---

## PART 1 — THE DESIGN SEQUENCE

Seven steps. Complete them in order. Do not skip.

### STEP 1 — STATE THE COMPUTATIONAL GOAL

Write one sentence describing the rule the machine must
implement. Not the narrative. Not the tape. The rule.

Good: "Output 1 only when the current input bit matches the
  value stored in the Latch"
Bad: "Connect input to output" (a wire, not a rule)
Bad: "Use the Scanner and Config Node" (pieces not behavior)

If you cannot write the rule in one sentence, the level is
not ready. Stop and think harder.

### STEP 2 — IDENTIFY THE CONCEPT BEING TAUGHT

One computational concept per level. Check the sector's
teaching progression. The concept must build on prerequisites
from prior levels. One new piece per level maximum.

### STEP 3 — DESIGN THE BOARD

Build the correct machine on paper first. The board must
accommodate it. The board must also allow at least two valid
approaches — the correct machine (optimal) and at least one
alternative (more pieces, lower score, but valid).

### STEP 4 — DESIGN THE TAPE

The tape is test data. It must:
- Contain cases that test both outcomes of the rule
- Contain at least one edge case that breaks hardcoded
  solutions but not correct logical machines
- Match narrative context in length
- Follow sector-appropriate visibility rules

### STEP 5 — DESIGN THE TRAY

Required pieces: every piece needed for the optimal solution.
Optional pieces: enable valid but non-optimal solutions.
Piece counts: slightly more than optimal solution requires.
One new piece rule: if introducing a new type, it appears
here for the first time with a tutorial step.

### STEP 6 — WRITE THE COGS LINE

Sets narrative context. Never describes puzzle mechanics.
Never instructs. Sounds like COGS. Contains at least one
layer of meaning. No double dashes. No emojis.

Tucker Brady sign-off required. No exceptions.

### STEP 7 — VERIFY AGAINST THE QUALITY CHECKLIST

---

## PART 2 — THE QUALITY CHECKLIST

Computational integrity:
[ ] Computational goal stated in one sentence
[ ] Correct machine is buildable on this board
[ ] Tape tests both outcomes of the rule
[ ] Tape contains at least one edge case
[ ] Level teaches exactly one computational concept
[ ] Concept builds on prerequisites from prior levels

Player experience:
[ ] Solvable at three stars with tray pieces, zero credits
[ ] At least two valid machine configurations exist
[ ] Optimal solution learnable from pieces and Codex entries
[ ] Board size is minimum necessary for correct solution
[ ] Player who understands the concept can solve the level
[ ] Player who hardcodes from tape fails or scores poorly

Narrative integration:
[ ] Computational goal maps to a coherent narrative problem
[ ] cogsLine is approved by Tucker Brady
[ ] Level name fits the sector's narrative arc
[ ] Level's story contribution is clear

Technical:
[ ] inputTape and expectedOutput correctly defined
[ ] computationalGoal, conceptTaught, prerequisiteConcept,
    tapeDesignRationale, difficultyBand, narrativeFrame
    fields populated in level definition
[ ] All four CI quality gates pass
[ ] Free-to-play guarantee verified

---

## PART 3 — RETROFIT GUIDANCE FOR EXISTING LEVELS

A1-5 through A1-8 were designed before this framework.
They require retrofitting before Kepler Belt launches.

A1-5 — Communication Array
Current failure: Uniform tape, pass-through output, no edge
  cases.
Computational goal: "Gate the signal based on what the Scanner
  reads from each input pulse."
Concept taught: Reading input into memory and gating on that
  memory value.
Fix: Redesign tape to include both 1 and 0 values. Update
  expectedOutput to reflect correct gate behavior. Add edge
  cases testing both open and closed gate states.

A1-6 — Sensor Grid
Current failure: Static Data Trail conflicts with mixed input
  tape. Config Nodes read stale values. Effectively broken.
Computational goal: "Multiple gates all reading from the same
  dynamic Scanner write — every gate must receive the correct
  live value."
Concept taught: Dynamic state — Data Trail as live memory not
  static preset.
Fix: Scanner must write dynamically to Data Trail each pulse.
  Config Nodes read live values. Tape tests both gate states.

A1-7 — Weapons Lock
Current failure: Tape may not adequately test Transmitter-
  before-Config-Node sequencing requirement.
Computational goal: "Transmitter writes the authorization
  value before the Config Node checks it — placement order
  determines execution order."
Concept taught: Write-before-read. Transmitter must precede
  the Config Node it is conditioning.
Fix: Tape must include pulses where Transmitter write timing
  is critical. Machine with Transmitter after Config Node
  should fail on specific pulse values.

A1-8 — Bridge Systems
Current failure: Minimal. Tape should more fully exercise
  all piece types.
Computational goal: "A machine using all available piece types
  correctly in a single coherent path demonstrating mastery
  of all Axiom sector concepts."
Concept taught: Synthesis.
Fix: Verify tape exercises all piece types' behavior. Ensure
  at least one pulse tests each piece's specific function.

---

## PART 4 — THE TUTORIAL PATTERN

Every level that introduces a new piece follows this four-step
pattern:

STEP 1 — INSTRUCTOR (target: boardGrid, eyeState: blue)
COGS surveys the battlefield. Strategic overview. What the
board presents, what the general approach requires.
Professional. Operational. No mention of specific pieces.

STEP 2 — COLLECTOR INTERRUPTS (target: tray slot, eyeState:
amber)
COGS spots something uncatalogued. The briefing stops. He
cannot help himself. Short, certain, reveals character.
codexEntryId set on this step triggers the Codex to open.

STEP 3 — CODEX OPENS
Handled automatically by codexEntryId on step 2. Player reads
the entry COGS just wrote. Codex dismissal returns to tutorial.

STEP 4 — INSTRUCTOR RESUMES (target: boardGrid, eyeState:
blue)
COGS returns to the briefing. Opens with "As I was saying."
Connects the piece to the strategy. Finishes what he started.
Slightly more crisp than step 1. The detour is not
acknowledged.

Levels with no new piece get two instructor steps only:
overview then specific guidance.

Collector step voice rules:
- COGS is noticing something uncatalogued
- He is excited in his own COGS way — contained, precise,
  but the urgency is there
- He is writing the entry himself, in real time, because he
  wants to — not because he is required to
- He never says "found" or "downloading" — he says
  "uncatalogued", "logging", "filing", "correcting that"
- The line is short. Three sentences maximum. Often one.

---

## PART 5 — SECTOR-SPECIFIC DESIGN NOTES

THE AXIOM
Keep boards small. Player is learning piece behavior not
routing complexity. Tutorial steps: board first, then tray,
then Codex, then board resume. Wires and placement highlights
are active. They come off in Kepler Belt.

KEPLER BELT
First sector without wires or placement highlights. Early
levels compensate with simple routing. Introduce non-uniform
tapes gradually. Latch introduction must make write-then-read
unavoidable by board design. Human stakes are active — do not
soften the consequence narratives.

NOVA FRINGE
Tape visibility begins to reduce. Start by hiding last few
values, progress to hiding all. Inverter introduction should
make the flip result obvious and satisfying. Capacitor
introduction requires a level where the trail is demonstrably
overwritten before a downstream piece needs the original value.
Give the player space to notice COGS's ambient lines — do not
make levels so demanding the narrative is missed.

THE RIFT
Every level should have at least one moment where the player
realizes that when something happens matters as much as
whether it happens. Relay introduction forces synchronization
problem. Counter introduction uses narrative frame that makes
counting feel natural. Fault tolerance introduced through
redundant path design.

DEEP VOID
Four-stage structure is non-negotiable. Stage 1 levels should
feel increasingly difficult in a specific way — not more
pieces, but more elaborate choreography, approaching the
ceiling of sequential processing. Navigator introduction
should feel like a release not a complication. When the beam
reaches the Navigator, COGS's eyes shift to amber, a brief
pause, the heads move visibly. The player watches COGS work.
DV-11 dossier is one of the most significant lines in the
game — the level should be challenging enough that the player
sits with the words before hitting launch.

THE CRADLE
The player does not know the rule in advance. Design levels
to reward observation and iteration. Boards designed around
pre-placed Resonators not the other way around. The level
after the Maker's fingerprint revelation should be quiet —
the player is processing something. Give them space. Final
level requires all concepts in natural synthesis. The machine
that solves it should feel inevitable in retrospect.

---

## PART 6 — THE LEVEL TEMPLATE

Every new level definition should include these documentation
fields alongside existing data. These are not rendered in
game — they exist so any future level designer can verify
the level teaches what it claims to teach.

computationalGoal: string
  The rule in one sentence.

conceptTaught: string
  The one concept this level introduces or reinforces.

prerequisiteConcept: string
  What the player must already understand.

tapeDesignRationale: string
  Why this tape tests the rule.

difficultyBand: 'intuitive' | 'derivable' | 'abstract' |
  'hidden'
  Intuitive: player can guess from narrative context.
  Derivable: requires thinking but derivable from pieces
    and tape.
  Abstract: requires understanding the CS concept.
  Hidden: rule not revealed by tape — discovered through play.

narrativeFrame: string
  How the computational rule maps to the story context.

---

## PART 7 — THE EXPANSE (POST-MVP)

Sandbox area. No computational goal, no quality checklist,
no tape. Free build.

COGS observes. He does not evaluate. His lines in The Expanse
are the quietest in the game.

The decoding puzzle that unlocks The Expanse is the first
sandbox interaction — a Cradle-style unknown-signal level
where the decoded coordinates are the solution.

Full design deferred to post-MVP. Name locked. Everything
else open.

---

END OF LEVEL_DESIGN_FRAMEWORK.md
