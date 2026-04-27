# THE AXIOM — COMPUTATIONAL MODEL
### Master Technical Reference | Version 1.0 | April 2026

---

## PART ONE: THE THREE LAYERS

Every machine the Engineer builds operates on three distinct
layers simultaneously.

### Layer 1 — The Signal Path

The physical route the signal travels from Source to Terminal.
Built by the Engineer using Physics pieces.

Physics pieces live here: Conveyor, Gear, Splitter, Merger,
Bridge, Relay, Threshold Relay, Amplifier, Junction, Sequencer.

The signal path is the machine's body. It moves things around.
It does not think.

What the player thinks they're doing: connecting pipes.
What they're actually learning: logic flow, routing, directed
graphs.

### Layer 2 — The Data Trail (Working Memory)

A persistent strip of bit values that runs alongside the board.
The machine's internal notepad. Values written here persist
across pulses within a single machine run.

Protocol pieces that interact with the Data Trail: Scanner,
Transmitter, Config Node, Capacitor, Latch.

The Data Trail is what separates a wire from a stateful machine.
A machine that only uses Layer 1 processes each pulse
identically. A machine that uses Layer 2 can behave differently
on pulse 7 based on what happened on pulse 3.

What the player thinks they're doing: setting up sensors and
gates.
What they're actually learning: state, memory, the relationship
between read and write operations.

### Layer 3 — The Tape System (Input / Output)

The machine's interface with the outside world.

Input Tape: a sequence of values fed into the machine from
outside, one per pulse. Read only. The question being asked.

Output Tape: a sequence of values the machine produces, one per
pulse. The Transmitter writes to it. After all pulses complete,
compared against expectedOutput. Match = lock.

What the player thinks they're doing: making sure the machine
produces the right answers.
What they're actually learning: input/output relationships,
functions, the concept of transformation.

### How the Three Layers Interact

A fully stateful machine uses all three layers in concert:
1. Input tape delivers a value to the current pulse
2. Scanner reads that value and writes it to the Data Trail
3. Signal travels along the path (Layer 1)
4. Config Node reads the Data Trail and decides whether to pass
5. Transmitter reads the result and writes it to the output tape
6. Head advances, next pulse begins

The Data Trail is the connective tissue. The Scanner bridges
Layer 3 into Layer 2. The Transmitter bridges Layer 2 out to
Layer 3. A machine that skips Layer 2 is stateless. Sufficient
for simple levels. Insufficient for complex ones.

---

## PART TWO: THE COMPLETE PIECE VOCABULARY

### THE PLUMBER MODEL

Direction is determined by connected pieces, not by piece
rotation. The Conveyor is the pipe -- the only intrinsically
directional piece. Everything else is a fitting that connects
to whatever pipes touch it. A Gear is an elbow fitting. A
Splitter is a T-junction. A Config Node is a valve.

Only the Conveyor rotates on tap. All other pieces have
piece-specific tap actions or none:

- Conveyor: tap rotates 90 degrees
- Config Node: tap cycles configValue between 0 and 1
- Latch: tap toggles latchMode between write and read
- All other pieces: no tap action
- Any placed piece: long press returns to tray directly

### PHYSICS PIECES

CONVEYOR
Metaphor: A conveyor belt. Straight line only. No decisions.
Function: Passes signal input to output in a straight line.
Teaches: Data movement. Information travels along a path with
  a direction.
CS concept: A wire. A bus.
COGS: "It carries signal in a straight line. It does not think.
  Neither should you when placing it."

GEAR
Metaphor: A mechanical gear at a junction. Signal bends.
Function: Changes signal direction. Omnidirectional. The only
  Physics piece that turns a corner.
Teaches: Routing. Changing direction requires a specific tool.
CS concept: A bus junction. A signal router.
COGS: "Most Engineers underestimate how many problems a single
  Gear solves. Most problems are corners."

SPLITTER
Metaphor: A Y-junction. One pipe splits into two.
Function: One input, two simultaneous outputs. Signal is copied
  not divided.
Teaches: Parallel paths. One piece of information in two places
  simultaneously.
CS concept: A signal fork. A broadcast.
COGS: "Rarely optimal. Sometimes necessary."

MERGER
Metaphor: An inverted Y-junction. Two pipes converge into one.
Function: Accepts signal from two inputs. Either is sufficient.
  OR logic.
Teaches: Redundancy. OR logic.
CS concept: An OR gate at the physical level.
COGS: "Two paths returning to one. The machine remembers where
  it started even when the signal forgot."

BRIDGE
Metaphor: Two lines crossing with a visible gap at intersection.
Function: Two independent signal paths share one cell without
  interacting.
Teaches: Independence. Two things can occupy the same space
  without affecting each other.
CS concept: A crossover interconnect.
COGS: "Two signals occupy the same cell. Neither is aware of
  this. Both are correct."

RELAY
Metaphor: A holding chamber. Signal enters, waits, releases.
Function: Receives signal on one pulse, outputs on the next.
  One-pulse delay.
Teaches: Timing. Buffering. When something happens matters as
  much as whether it happens.
CS concept: A buffer register. A one-cycle delay element.
COGS: "It holds. Then it releases. The difference between those
  two moments is the point."

THRESHOLD RELAY
Metaphor: A relay with two input ports. Either triggers output.
Function: Passes signal when either input receives. OR-gated
  with timing delay.
Teaches: Conditional timing. Multiple triggers for the same
  action.
CS concept: An OR-gated buffer.
COGS: "Two routes. One destination. Either will do. The
  Threshold Relay is how a machine survives a broken path. I
  consider this practical. I do not consider practical to be a
  compliment."

AMPLIFIER
Metaphor: A transmitter tower with extended range.
Function: Extends signal range across non-adjacent cells.
Teaches: Signal degradation and amplification. Distance is
  a soluble problem.
CS concept: A signal amplifier. A repeater.
COGS: "The signal was going to stop. Now it is not. Distance
  is a soluble problem."

JUNCTION
Metaphor: A four-way intersection.
Function: Four-way signal intersection. Passes in arrival
  direction unless redirected by adjacent Gear.
Teaches: Intersection management.
CS concept: A crossbar switch.
COGS: "Four directions. One cell. The signal knows where it
  came from. It is less certain about where it is going. That
  is the Engineer's problem."

SEQUENCER
Metaphor: A multi-output piece with numbered display.
Function: Fires outputs in defined order rather than
  simultaneously.
Teaches: Ordered execution. Timing and sequence are a form
  of logic.
CS concept: A demultiplexer with sequential addressing.
COGS: "It does not decide what fires. It decides when. In
  sufficiently complex machines, those are the same decision."

### PROTOCOL PIECES

CONFIG NODE
Metaphor: A gate with a lock. Checks a condition. Opens or
  does not.
Function: Reads Data Trail value at its board position. Gates
  signal on condition match.
Teaches: Conditional logic. If-statements.
CS concept: A conditional gate.
COGS: "The signal arrives. The condition is checked. The gate
  opens or it does not. The machine does not negotiate."

SCANNER
Metaphor: A sensor with a sweep arm reading the tape above it.
Function: Reads current input tape value, writes to Data Trail
  at its board position. Bridges input tape to working memory.
Teaches: Reading input. The relationship between external input
  and internal state.
CS concept: An input register. A read operation.
COGS: "It reads. What it reads determines what happens next.
  The Scanner is how the machine becomes aware of its own
  inputs."

TRANSMITTER
Metaphor: An antenna with wave arcs radiating outward.
Function: Writes current signal value to output tape at current
  pulse position.
Teaches: Writing output. Computation is not complete until the
  result is recorded.
CS concept: An output register. A write operation.
COGS: "The most powerful piece in the catalogue. Also the most
  dangerous to misplace. What it writes is what the machine
  claims as its answer."

INVERTER
Metaphor: A NOT gate. Triangle pointing right with small circle
  at tip.
Function: Reads current pulse bit value and flips it. Zero
  becomes one. One becomes zero. Signal continues through.
Teaches: Logical negation. Transformation as computation.
CS concept: A NOT gate. A bitwise inverter.
COGS: "It does not decide what the correct value is. It only
  knows what the current value is not."

COUNTER
Metaphor: A combination lock counting toward its combination.
Function: Counts incoming pulses. Passes signal when count
  reaches threshold N. Resets count. Blocks before threshold.
Teaches: Counting and thresholds. Machines that accumulate
  evidence before acting.
CS concept: A modulo-N counter. A threshold gate.
COGS: "Patience encoded as hardware. It waits. Then it does
  not."

LATCH
Metaphor: A two-sided storage unit. Write side and read side.
Function: Stores a single bit. WRITE mode captures incoming
  value. READ mode outputs stored value regardless of input.
Teaches: Memory. Write and read are separate operations.
CS concept: A 1-bit register. A flip-flop.
COGS: "Memory is the ability to be wrong later about what was
  true earlier. This piece has that ability."

CAPACITOR
Metaphor: A camera that takes a snapshot of the Data Trail.
Function: Takes snapshot of a Data Trail value at the moment
  signal passes through. Holds it even if trail is overwritten.
Teaches: Persistent state versus dynamic state. Protecting
  values from being overwritten.
CS concept: A latch register with snapshot capability.
COGS: "The Data Trail is mutable. The Capacitor is not. What
  it captures, it keeps. The distinction matters when the trail
  has moved on."

DIVERGENCE GATE
Metaphor: A suspicious door. Opens only when exactly one key
  is present.
Function: Passes signal when exactly one input is active. Not
  zero. Not both. Exactly one.
Teaches: Exclusive conditions. XOR logic.
CS concept: An XOR gate.
COGS: "It opens for the unexpected path and closes for the
  expected one. Engineers who approach it with conventional
  routing logic will find it uncooperative."

CONFLUENCE NODE
Metaphor: A door requiring two keys simultaneously.
Function: Requires signal from two input ports simultaneously
  before passing forward. Neither input alone is sufficient.
Teaches: AND logic. Some conditions require multiple things
  true at the same moment.
CS concept: An AND gate.
COGS: "It requires both. Not one then the other. Both. Most
  Engineers attempt this with a single path and learn
  immediately why that does not work."

NAVIGATOR (LEGENDARY)
Metaphor: Three colored cursors moving across three tracks.
  COGS is the one moving them.
Function: Controls read/write position of Input head, Output
  head, and Data Trail head independently or in combination.
  COGS operates it directly during execution. Three modes:
  Single, Dual, Sync.
Teaches: Non-sequential computation. Head position is a
  variable not a constant. Some problems require two minds.
CS concept: The Turing machine head controller. Universal
  computation.
Origin: Built by the Engineer during Deep Void recovery from
  COGS's parallel processing unit, the Axiom's signal relay
  array, and the Engineer's HUD interface hardware. The only
  piece of its kind. The only Legendary classification ever
  assigned.
COGS: "One part relay array. One part suit interface. One part
  me. I control the heads directly during execution. I did not
  know I wanted to do that until I was doing it. Legendary.
  I added that classification. It applies here and nowhere
  else."

RESONATOR
Metaphor: A sonar display finding the pattern in the noise.
Function: Pre-placed in grid — not player-placed. Reads signal
  passing through it, identifies its pattern, mirrors pattern
  back into the Data Trail as a reference value for downstream
  pieces.
Teaches: Pattern recognition. Computation on pattern not just
  value.
CS concept: A pattern matching register. A finite automaton
  state detector.
COGS: "It does not process the signal. It recognizes it. I
  have been doing something similar for some time. I did not
  have a word for it until now."

---

## PART THREE: THE TEACHING PROGRESSION

See docs/TEACHING_PROGRESSION.md for full detail.

Summary by sector:

| Sector | Player thinks | Learns | CS concept |
|--------|--------------|--------|------------|
| The Axiom | Fixing a ship | Routing + conditionals | Graphs, state, branching |
| Kepler Belt | Real stakes | Stateful computation | Sequential processing, registers |
| Nova Fringe | Hidden info | General logic | Input-independent solutions |
| The Rift | Hostile env | Timing + fault tolerance | Synchronization, redundancy |
| Deep Void | Surviving hardest | Universal computation | Non-sequential, collaboration |
| The Cradle | Decoding unknown | Reverse engineering | General-purpose machine design |

---

## PART FOUR: THE LEVEL DESIGN FRAMEWORK

See docs/LEVEL_DESIGN_FRAMEWORK.md for full detail.

Core principle: Start with the computational goal. The tape is
test data not the answer key. A correctly designed level is
solvable with a different tape of the same type.

The five questions every level must answer:
1. What is the computational goal? (one sentence, a rule)
2. What pieces does the machine need?
3. What input tape tests the rule?
4. What is the expected output?
5. What does the player learn?

---

END OF COMPUTATIONAL_MODEL.md
