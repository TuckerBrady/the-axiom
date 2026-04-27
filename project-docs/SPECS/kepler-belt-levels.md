# SPEC: Kepler Belt Level Design
### Sprint 19 | April 2026 | IN PROGRESS

---

## Overview

10 levels for Sector 1 (Kepler Belt). Replaces the 3 placeholder
levels currently in levels.ts. Introduces Latch, Merger, Bridge.
Non-uniform tapes. No wires or placement highlights. Human stakes
narrative with consequence levels at K1-4, K1-8, K1-10.

---

## Level Designs

### K1-1 Corridor Entry
Computational goal: Route signal from input to output with two
  direction changes on a board without wire guides.
Concept taught: Independent routing (no wires, no highlights).
Prerequisite: All Axiom sector concepts.
Tape: None (single pulse, no tape).
Difficulty band: intuitive.
Narrative frame: First repair in the mining corridor. Simple but
  unfamiliar territory.
Grid: 8x6.
Pre-placed: Source (1,2), Terminal (6,4).
Tray: Conveyor x4, Gear x2.
Optimal pieces: 4 (2 Conveyors, 2 Gears).
Tutorial steps: 2 instructor steps. No new piece. First step
  notes the absence of wire guides. Second step confirms the
  methodology still applies.

### K1-2 Relay Splice
Computational goal: Pass each input tape value through to output
  unchanged using Scanner to write and Transmitter to read.
Concept taught: Dynamic tape processing (review of Scanner +
  Transmitter in non-uniform context).
Prerequisite: Scanner reads input, Transmitter writes output.
Tape: [1, 0, 1, 1, 0] -> Expected: [1, 0, 1, 1, 0].
Difficulty band: derivable.
Narrative frame: Relay chain built to last, outlived its
  maintainers. The signal must pass faithfully.
Grid: 9x6.
Pre-placed: Source (1,3), Terminal (7,3).
Tray: Conveyor x4, Scanner x1, Transmitter x1, Gear x1.
Optimal pieces: 4 (Scanner, 2 Conveyors, Transmitter).
Data Trail: [0, 0, 0, 0, 0, 0, 0, 0].
Tutorial steps: 2 instructor steps. Reviews tape behavior in
  new context. No new piece.

### K1-3 Junction 7
Computational goal: Store the first input value in a Latch
  (write mode), then use that stored value to gate subsequent
  pulses via Config Node reading the Latch output (read mode).
Concept taught: Latch (write and read as separate operations,
  memory persists across pulses).
Prerequisite: Scanner, Config Node, Data Trail.
Tape: [1, 1, 0, 1, 1] -> Expected: [1, 1, 0, 1, 1].
  Edge case: the 0 at position 2 tests that the gate correctly
  blocks when the stored value does not match. But the Latch
  stores 1 on pulse 0 (write mode), then reads 1 for all
  subsequent pulses. The Config Node gates on that stored value.
  A hardcoded path that always passes would fail on a different
  tape like [0, 1, 1, 0, 1].
Difficulty band: derivable.
Narrative frame: Junction 7 is a routing bottleneck. Eleven
  settlements feed through it. The routing decision must be
  stored and applied consistently.
Grid: 10x7.
Pre-placed: Source (1,3), Terminal (8,3), Latch (4,3).
Tray: Conveyor x4, Scanner x1, Transmitter x1, Config Node x1,
  Gear x1.
Optimal pieces: 5.
Data Trail: [0, 0, 0, 0, 0, 0, 0, 0].
Tutorial steps: 4 steps (instructor, collector for Latch,
  Codex opens, instructor resumes).

### K1-4 Mining Platform Alpha (CONSEQUENCE)
Computational goal: Output 1 when the input is 1, output 0 when
  the input is 0. The Latch stores each pulse value (write mode)
  and the stored value gates a Config Node that controls whether
  the Transmitter fires.
Concept taught: Latch as dynamic per-pulse memory (write each
  pulse, read within same pulse for gating).
Prerequisite: Latch write/read, Config Node gating.
Tape: [1, 0, 0, 1, 1, 0] -> Expected: [1, 0, 0, 1, 1, 0].
  Edge case: three consecutive same values test that the machine
  is not just alternating.
Difficulty band: derivable.
Narrative frame: Decommissioned platform repurposed as signal
  relay. Not designed for this. Doing the job anyway. Failure
  affects colonist communication.
Grid: 10x7.
Pre-placed: Source (1,3), Terminal (8,3).
Tray: Conveyor x4, Scanner x1, Latch x1, Config Node x1,
  Transmitter x1, Gear x2.
Optimal pieces: 6.
Data Trail: [0, 0, 0, 0, 0, 0, 0, 0].
Consequence: cogsWarning = "Pay attention to this one."
  failureEffect = "Mining Platform Alpha relay failure. Seven
  settlements lost communication for forty-eight hours."

### K1-5 Resupply Chain
Computational goal: Signal must reach output through one of two
  paths. Path A goes through a Config Node (passes when trail
  value is 1). Path B bypasses the gate. A Merger reconverges
  both paths.
Concept taught: Merger (OR logic, two paths converge to one).
Prerequisite: Config Node gating, path routing.
Tape: [1, 0, 1, 0] -> Expected: [1, 1, 1, 1].
  The machine must output 1 for every pulse regardless of input.
  When input is 1, path A opens. When input is 0, path A blocks
  but path B always reaches the Merger. Both paths lead to output.
Difficulty band: derivable.
Narrative frame: Resupply chain with four relay nodes, all
  degraded. Redundancy is the only option. Two routes to the
  same destination.
Grid: 10x8.
Pre-placed: Source (1,4), Terminal (8,4), Splitter (3,4).
Tray: Conveyor x6, Merger x1, Scanner x1, Config Node x1,
  Transmitter x1, Gear x2.
Optimal pieces: 8.
Data Trail: [0, 0, 0, 0, 0, 0, 0, 0].
Tutorial steps: 4 steps (instructor, collector for Merger,
  Codex opens, instructor resumes).

### K1-6 Colonist Hub
Computational goal: Output the input value when input is 1,
  output the inverse when input is 0. Latch stores the value.
  Two paths from Splitter: one through Config Node (passes on
  1), the other always open. Merger reconverges. The Transmitter
  writes different values depending on which path the signal
  took.
Concept taught: Latch + Merger combined. Stateful branching.
  A single stored value influencing multiple decisions.
Prerequisite: Latch, Merger, Splitter, Config Node.
Tape: [1, 0, 1, 1, 0, 1] -> Expected: [1, 0, 1, 1, 0, 1].
Difficulty band: abstract.
Narrative frame: Hub coordinating resupply for 31 settlements.
  Running on equipment three cycles past replacement. The people
  depending on it do not have the option of waiting.
Grid: 11x8.
Pre-placed: Source (1,4), Terminal (9,4).
Tray: Conveyor x6, Scanner x1, Latch x1, Splitter x1,
  Merger x1, Config Node x1, Transmitter x1, Gear x2.
Optimal pieces: 9.
Data Trail: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0].

### K1-7 Ore Processing
Computational goal: Two independent signal processes share the
  board. Path A carries the primary signal from input to output.
  Path B is a monitoring loop. The Bridge allows both paths to
  cross without interfering.
Concept taught: Bridge (two independent paths sharing one cell).
Prerequisite: All prior Kepler concepts.
Tape: [1, 0, 1, 1] -> Expected: [1, 0, 1, 1].
Difficulty band: derivable.
Narrative frame: Ore processing relay still active despite no
  mining. Something transmitting on the frequency. Two signals
  that must not interfere.
Grid: 10x8.
Pre-placed: Source (1,3), Terminal (8,6), Bridge (5,5).
Tray: Conveyor x6, Scanner x1, Transmitter x1, Gear x3,
  Config Node x1.
Optimal pieces: 7.
Data Trail: [0, 0, 0, 0, 0, 0, 0, 0].
Tutorial steps: 4 steps (instructor, collector for Bridge,
  Codex opens, instructor resumes).

### K1-8 Transit Gate (CONSEQUENCE)
Computational goal: Route signal through a path that crosses
  itself via Bridge, with Latch storing state that determines
  the output value. The machine must handle both 0 and 1 inputs
  and produce the correct gated output for each pulse.
Concept taught: Bridge + Latch integration under pressure.
  Crossing paths and state maintenance in a single machine.
Prerequisite: Bridge, Latch, Config Node, Merger.
Tape: [1, 1, 0, 1, 0, 0, 1, 1] -> Expected: [1, 1, 0, 1, 0, 0, 1, 1].
Difficulty band: abstract.
Narrative frame: Transit gate routing ghost traffic from ships
  that no longer exist. Regulating flow for the entire corridor.
  Failure disrupts all traffic.
Grid: 11x8.
Pre-placed: Source (1,4), Terminal (9,4).
Tray: Conveyor x6, Scanner x1, Latch x1, Bridge x1,
  Config Node x1, Transmitter x1, Gear x3, Merger x1.
Optimal pieces: 9.
Data Trail: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0].
Consequence: cogsWarning = "This mission matters more than most.
  That is all."
  failureEffect = "Transit gate failure. All corridor traffic
  suspended for seventy-two hours. The transit authority has
  escalated the negligence inquiry."

### K1-9 The Narrows
Computational goal: Process a tape where the output for each
  pulse is the XOR of the current input and the previously
  stored Latch value. The machine writes the current input to
  the Latch after using the previous stored value for the
  comparison.
Concept taught: Synthesis. Dynamic memory across pulses where
  the stored value changes each pulse. The difference between
  a solution and an algorithm.
Prerequisite: All Kepler pieces and concepts.
Tape: [0, 1, 1, 0, 1, 0] -> Expected: [0, 1, 0, 1, 1, 1].
  Pulse 0: Latch empty (0), input 0, XOR = 0.
  Pulse 1: Latch has 0, input 1, XOR = 1.
  Pulse 2: Latch has 1, input 1, XOR = 0.
  Pulse 3: Latch has 1, input 0, XOR = 1.
  Pulse 4: Latch has 0, input 1, XOR = 1.
  Pulse 5: Latch has 1, input 0, XOR = 1.
Difficulty band: abstract.
Narrative frame: The densest section of the corridor. Maximum
  signal interference. The machine must compare each new signal
  against what came before.
Grid: 11x9.
Pre-placed: Source (1,4), Terminal (9,4).
Tray: Conveyor x8, Scanner x1, Latch x2, Splitter x1,
  Merger x1, Config Node x2, Transmitter x1, Gear x3,
  Bridge x1.
Optimal pieces: 11.
Data Trail: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0].

### K1-10 Central Hub (Boss, CONSEQUENCE requireThreeStars)
Computational goal: Implement a running count machine. The output
  for each pulse is 1 if two or more consecutive 1s have been
  seen in the input (including the current pulse). Otherwise
  output 0. The Latch stores whether the previous input was 1.
Concept taught: Full stateful computation. A machine that behaves
  differently on pulse N based on what happened on pulse N-1.
  This is the difference between a solution and an algorithm.
Prerequisite: All Kepler concepts mastered.
Tape: [1, 1, 0, 1, 1, 1, 0, 0, 1, 1]
  -> Expected: [0, 1, 0, 0, 1, 1, 0, 0, 0, 1].
  Pulse 0: first 1, no previous, output 0.
  Pulse 1: 1 and previous was 1, output 1.
  Pulse 2: 0, reset, output 0.
  Pulse 3: 1, no previous 1, output 0.
  Pulse 4: 1 and previous was 1, output 1.
  Pulse 5: 1 and previous was 1, output 1.
  Pulse 6: 0, reset, output 0.
  Pulse 7: 0, still reset, output 0.
  Pulse 8: 1, no previous 1, output 0.
  Pulse 9: 1 and previous was 1, output 1.
Difficulty band: abstract.
Narrative frame: Everything routes through the Central Hub.
  Three hundred thousand people depend on it. Single point of
  failure. The machine must track state across every pulse.
Grid: 12x9.
Pre-placed: Source (1,4), Terminal (10,4).
Tray: Conveyor x8, Scanner x2, Latch x2, Splitter x1,
  Merger x1, Config Node x2, Transmitter x1, Gear x4,
  Bridge x1.
Optimal pieces: 13.
Data Trail: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].
Consequence: cogsWarning = "Do not fail here. I will not
  elaborate."
  failureEffect = "Central Hub failure. The corridor is offline.
  Three hundred and fourteen colonists lost scheduled resupply
  access for eleven days. The transit authority has filed a
  negligence inquiry against this vessel."
  requireThreeStars = true.

---

## Tutorial Copy for New Pieces

### Latch (K1-3)

Step 1 (instructor, boardGrid, blue):
"Junction 7. Eleven settlements feed through this point. The
routing decision here must be stored and applied to every signal
that passes through. The board has a piece that remembers. It
has two modes. Placement determines which mode it uses."

Step 2 (collector, tray Latch slot, amber):
"A storage unit. Two modes. Uncatalogued. This goes in the Codex
immediately."
[codexEntryId: latch]

Step 3: Codex opens automatically.

Step 4 (instructor resumes, boardGrid, blue):
"As I was saying. Write mode captures the value. Read mode outputs
what was captured. The order matters. Write before read. The
junction depends on what was stored."

### Merger (K1-5)

Step 1 (instructor, boardGrid, blue):
"The resupply chain has four relay nodes. All degraded. One path
may not be enough. The board splits the signal into two routes.
Something downstream needs to bring them back together."

Step 2 (collector, tray Merger slot, amber):
"Two inputs. One output. Either is sufficient. Logging this under
redundancy infrastructure."
[codexEntryId: merger]

Step 3: Codex opens automatically.

Step 4 (instructor resumes, boardGrid, blue):
"As I was saying. The Merger accepts signal from either input.
Both paths lead to the same destination. The resupply chain does
not care which route the signal took. It cares that it arrived."

### Bridge (K1-7)

Step 1 (instructor, boardGrid, blue):
"Two signals on this board. Both need to reach their destination.
The board does not have room for both to go around each other.
Something in the tray solves this without the signals being
aware of it."

Step 2 (collector, tray Bridge slot, amber):
"Two paths. One cell. Neither interferes. I have been waiting
for something like this to catalog."
[codexEntryId: bridge]

Step 3: Codex opens automatically.

Step 4 (instructor resumes, boardGrid, blue):
"As I was saying. The Bridge allows two independent paths to
share one cell. Neither signal is aware of the other. Both are
correct. Place it where the paths cross."

---

## Prerequisites Verified

By K1-10 completion, player has demonstrated:
[x] A machine must produce correct output for any valid input
  (K1-4 through K1-10 all use non-trivial tapes)
[x] Memory can be written and read dynamically across pulses
  (K1-3 introduces, K1-4 through K1-10 require)
[x] A single stored value (Latch) can influence multiple decisions
  (K1-6, K1-9, K1-10)
[x] Parallel paths can serve different purposes simultaneously
  (K1-5 introduces with Merger, K1-7 with Bridge)
[x] The difference between a solution and an algorithm
  (K1-9 XOR, K1-10 consecutive detection)

---

## Implementation Notes

- Replace 3 placeholder levels with 10 new levels
- Sector string: 'kepler' (lowercase, matching existing)
- KEPLER_LEVELS array: all 10 in order
- pieceCounter: start at 800, increment by 10 per level
- No wires, no placement highlights
- All COGS lines from NARRATIVE.md (K1-1 through K1-10)
- LevelDefinition type needs new fields added:
  computationalGoal, conceptTaught, prerequisiteConcept,
  tapeDesignRationale, difficultyBand, narrativeFrame
- These are documentation-only fields, not rendered in game

---

END OF kepler-belt-levels.md
