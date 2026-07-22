# SCORING ALGORITHM v2 — SPECIFICATION
### RFC 2119 Formal Spec | The Axiom | April 2026

---

## STATUS

PROPOSED. Requires Tucker Brady sign-off before implementation.

Supersedes: the scoring system documented in CLAUDE_CONTEXT.md and
implemented in src/game/scoring.ts (Completion Bonus / Machine
Complexity / Protocol Precision / Path Integrity / Speed Bonus /
Elaboration Bonus).

---

## DEFINITIONS

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in
this document are to be interpreted as described in RFC 2119.

**Floor solve:** The minimum-piece solution achievable using only
the level's pre-assigned tray pieces and pre-provided tape
infrastructure. No purchased pieces. No purchased tapes.

**Purchased piece:** Any piece the Engineer acquires through the
expanding tray store using credits. Not part of the level's
availablePieces array.

**Purchased tape:** Any tape infrastructure (TRAIL or OUT) the
Engineer buys for a level that did not provide it. IN tape is
always provided.

**Active piece:** A player-placed piece (not pre-placed) through
which the signal passed successfully during at least one pulse.

**Total investment:** The sum of credits spent on purchased pieces
plus credits spent on purchased tapes for a single level attempt.

**Piece diversity:** The count of distinct PieceType values among
all active player-placed pieces (excluding source and terminal).

**Pre-placed piece:** A piece placed by the level definition that
the Engineer cannot move or remove. Source and Terminal are always
pre-placed. Some levels pre-place additional pieces (e.g.,
Resonator in The Cradle).

---

## PART 1 — DESIGN PRINCIPLES

This scoring algorithm exists to serve the soul of the game:
the joy is building elaborate, interesting machines. Every
category below rewards complexity, creativity, and investment.
No category penalizes the Engineer for using more pieces,
building longer paths, or spending credits.

### 1.1 The Floor-Solve Ceiling

REQ-1: A level completed using ONLY pre-assigned pieces and
pre-provided tape infrastructure MUST score a maximum of 54
points, regardless of how well those pieces are used.

REQ-2: The star thresholds MUST remain: 3 stars = 80+,
2 stars = 55-79, 1 star = 30-54, void = 0-29.

REQ-3: REQ-1 and REQ-2 together enforce the 1-star ceiling:
a floor solve can earn at most 1 star. To reach 2 or 3 stars,
the Engineer MUST invest beyond the floor solve.

REQ-4: Tutorial levels (Axiom sector, isTutorial: true) are
EXEMPT from the floor-solve ceiling. Tutorial levels MUST
always award 3 stars regardless of score. The raw score is
still calculated and COGS comments on it honestly.

### 1.2 The Investment Reward

REQ-5: Spending credits on pieces and tapes that contribute to
a successful machine MUST increase the score. The scoring
system MUST make investment feel rewarding, not wasteful.

REQ-6: The credit reward for a well-built machine MUST exceed
the credits spent building it, creating a virtuous cycle.
This is enforced by the economy layer (credit payout formula),
not by this scoring spec directly, but the scoring categories
MUST produce scores that make this payout achievable.

### 1.3 Failure Is Acceptable

REQ-7: A void result (0-29 points) MUST still be possible.
The scoring system does not guarantee success. A machine that
fails to lock, or that locks with poor construction, earns a
low score. This is correct. Failure teaches.

---

## PART 2 — SCORING CATEGORIES

Maximum total: 100 points.

Six categories. Two are gated behind investment (unreachable
on floor solve alone). Four are available to all completions
but scaled so floor-solve-only completions cannot exceed 54.

| # | Category | Max | Available on floor solve? |
|---|----------|-----|--------------------------|
| 1 | Completion | 25 | Yes |
| 2 | Path Integrity | 15 | Yes (scaled) |
| 3 | Signal Depth | 14 | Yes (scaled) |
| 4 | Investment | 25 | No (requires purchases) |
| 5 | Diversity | 11 | Partially (limited types) |
| 6 | Discipline | 10 | Partially |
| | **Total** | **100** | **Max 54 without purchases** |

### Floor-Solve Ceiling Proof

A perfect floor solve earns:
- Completion: 25
- Path Integrity: 15 (all pre-assigned pieces active)
- Signal Depth: 14 (maximum path length from pre-assigned set)
- Investment: 0 (nothing purchased)
- Diversity: 0 to ~6 (limited types in pre-assigned set)
- Discipline: 0 to ~5 (partial, see below)

Worst case for ceiling: 25 + 15 + 14 + 0 + 6 + 5 = 65. This
breaks the ceiling.

Therefore, Signal Depth and Diversity MUST be scaled by an
investment factor when no purchases are made. See REQ-16 and
REQ-22.

**Revised floor-solve maximum with scaling:**
- Completion: 25
- Path Integrity: 15
- Signal Depth: 14 * 0 = 0 (no purchased active pieces)
- Investment: 0
- Diversity: 11 * 0 = 0 (no purchased active pieces)
- Discipline: 10 * 0.5 = 5 (floor-solve partial credit)

**True floor-solve maximum: 45.** Well within 1-star range.

A floor solve that uses all pieces perfectly scores 45. A
sloppy floor solve scores lower. This is correct: even within
the 1-star band, better construction earns more points.

---

## PART 3 — CATEGORY SPECIFICATIONS

### Category 1: Completion (max 25 points)

REQ-8: A machine that locks (output matches expected output
across all pulses) MUST earn 25 points.

REQ-9: A machine that does not lock MUST earn 0 points for
this category.

REQ-10: "Lock" means: the machine ran all pulses, the
Transmitter wrote to the output tape each pulse, and the
output tape matches expectedOutput exactly.

**Calculation:**

```
completionBonus = succeeded ? 25 : 0
```

**Test cases:**
- Machine locks: 25
- Machine voids (signal dies): 0
- Machine completes but wrong output: 0

---

### Category 2: Path Integrity (max 15 points)

Rewards machines where every placed piece contributes. A piece
that sits on the board but never sees signal is dead weight.
The Engineer should build intentional machines.

REQ-11: Path Integrity MUST be calculated as the ratio of
active player-placed pieces to total player-placed pieces,
scaled to 15.

REQ-12: Pre-placed pieces MUST NOT be counted in the Path
Integrity calculation (neither numerator nor denominator).

REQ-13: If the Engineer placed zero pieces, Path Integrity
MUST be 15 (vacuously true — no dead weight).

**Calculation:**

```
if playerPieces.length === 0:
  pathIntegrity = 15
else:
  activeCount = count of playerPieces where signal passed through
  pathIntegrity = round((activeCount / playerPieces.length) * 15)
```

**Test cases:**
- 6 placed, 6 active: 15
- 6 placed, 4 active: 10
- 6 placed, 1 active: 3 (round(1/6 * 15) = 3)
- 0 placed: 15

---

### Category 3: Signal Depth (max 14 points)

Rewards longer, more elaborate signal paths. A machine where
the signal passes through more pieces demonstrates more
complex construction.

REQ-14: Signal Depth MUST be calculated from the total number
of active player-placed pieces (pieces signal passed through).

REQ-15: The raw Signal Depth value MUST be calculated as:
```
rawDepth = min(activePlayerPieces, depthCeiling) / depthCeiling * 14
```
where depthCeiling is a level-defined constant representing
the number of active pieces in a "fully elaborate" machine
for that level. Default: floorSolvePieces * 2.

REQ-16: Signal Depth MUST be multiplied by an investment
gate factor:
```
investmentGate = min(purchasedActivePieces / 1, 1.0)
```
If the Engineer has zero purchased active pieces, Signal
Depth is 0. One or more purchased active pieces unlocks the
full Signal Depth score.

This is a binary gate, not a gradient. The purpose is to
ensure floor-solve-only completions cannot earn Signal Depth
points, enforcing the ceiling. Even a single purchased piece
that contributes to the machine unlocks the category.

REQ-17: depthCeiling MUST be defined per level. If omitted,
it defaults to floorSolvePieces * 2 (rounded up).

**Calculation:**

```
purchasedActivePieces = count of purchased pieces where signal passed through
investmentGate = purchasedActivePieces >= 1 ? 1.0 : 0.0

rawDepth = min(activePlayerPieces, depthCeiling) / depthCeiling * 14
signalDepth = round(rawDepth * investmentGate)
```

**Test cases (depthCeiling = 10):**
- 10 active, 3 purchased active: round(10/10 * 14 * 1.0) = 14
- 7 active, 2 purchased active: round(7/10 * 14 * 1.0) = 10
- 5 active, 0 purchased (floor solve): round(5/10 * 14 * 0) = 0
- 12 active, 4 purchased: round(10/10 * 14 * 1.0) = 14 (capped)

---

### Category 4: Investment (max 25 points)

The primary driver of the new scoring philosophy. Rewards
the Engineer for spending credits on pieces and tapes that
contribute to a working machine.

REQ-18: Investment score MUST be based on the number of
purchased pieces that are active (signal passed through them)
plus tape infrastructure purchases that were utilized.

REQ-19: Investment MUST NOT reward buying pieces that sit
unused. Only active purchased pieces count.

REQ-20: Purchased tape infrastructure MUST contribute to
Investment score when the tape is utilized during execution:
- Purchased TRAIL tape: +4 points if any Scanner or
  Capacitor wrote to the Data Trail during execution.
- Purchased OUT tape: +4 points if any Transmitter wrote
  to the output tape during execution.

REQ-21: The per-piece investment contribution MUST be:
```
pieceInvestment = min(purchasedActivePieces * 3, 17)
tapeInvestment = trailTapePurchased && trailUsed ? 4 : 0
               + outTapePurchased && outUsed ? 4 : 0
investment = min(pieceInvestment + tapeInvestment, 25)
```

This means:
- 1 purchased active piece: 3 pts
- 2 purchased active pieces: 6 pts
- 3 purchased active pieces: 9 pts
- 4 purchased active pieces: 12 pts
- 5 purchased active pieces: 15 pts
- 6+ purchased active pieces: 17 pts (piece cap)
- Plus up to 8 from tape purchases
- Hard cap at 25

**Test cases:**
- 0 purchased pieces, no tape purchases: 0
- 3 purchased active, no tape: 9
- 5 purchased active, purchased TRAIL used: min(15 + 4, 25) = 19
- 6 purchased active, both tapes purchased and used: min(17 + 8, 25) = 25
- 4 purchased active but 2 inactive (bought but unused): 4 active * 3 = 12
- Purchased TRAIL tape but no Scanner/Capacitor used it: 0 tape pts

---

### Category 5: Diversity (max 11 points)

Rewards using a variety of piece types. A machine built
entirely of Conveyors is less interesting than one using
Conveyors, Gears, Splitters, Config Nodes, and Scanners.

REQ-22: Diversity MUST be calculated from the count of
distinct PieceType values among active player-placed pieces
(excluding source, terminal, and obstacle).

REQ-23: Diversity MUST be multiplied by the same investment
gate as Signal Depth (REQ-16). If the Engineer has zero
purchased active pieces, Diversity is 0.

REQ-24: The Diversity score MUST be:
```
distinctTypes = count of unique PieceType among active player pieces
rawDiversity = min(distinctTypes, 6) / 6 * 11
diversity = round(rawDiversity * investmentGate)
```

Six or more distinct active types earns full Diversity.

**Test cases:**
- 4 distinct types, 2 purchased active: round(4/6 * 11 * 1.0) = 7
- 6 distinct types, 1 purchased active: round(6/6 * 11 * 1.0) = 11
- 3 distinct types, 0 purchased (floor solve): 0
- 1 distinct type (all Conveyors), 1 purchased: round(1/6 * 11) = 2

---

### Category 6: Discipline (max 10 points)

Preserves the three-discipline system. Reframed: instead of
rewarding minimalism (Field Operative) or type dominance
(Systems Architect / Drive Engineer), each discipline now
rewards a specific approach to ELABORATION.

REQ-25: Discipline MUST remain three archetypes: Systems
Architect, Drive Engineer, Field Operative.

REQ-26: Discipline score MUST be calculated as follows:

**Systems Architect** — rewards Protocol piece depth.
```
protocolActive = count of active Protocol pieces (player-placed)
rawSA = min(protocolActive, 4) / 4 * 10
```
Four or more active Protocol pieces earns full Discipline.

**Drive Engineer** — rewards Physics piece depth.
```
physicsActive = count of active Physics pieces (player-placed)
rawDE = min(physicsActive, 5) / 5 * 10
```
Five or more active Physics pieces earns full Discipline.
(Higher threshold because Physics pieces are cheaper and
more commonly available.)

**Field Operative** — rewards balanced elaboration.
```
protocolActive = count of active Protocol pieces
physicsActive = count of active Physics pieces
minCategory = min(protocolActive, physicsActive)
rawFO = min(minCategory, 3) / 3 * 10
```
Three or more of EACH type earns full Discipline. The Field
Operative is rewarded for depth in both categories, not for
minimalism.

REQ-27: Discipline score MUST be multiplied by 0.5 if the
Engineer has zero purchased active pieces (floor-solve
partial credit). This allows some Discipline score on floor
solves (up to 5 points) but not the full 10.

```
disciplineGate = purchasedActivePieces >= 1 ? 1.0 : 0.5
discipline = round(rawDiscipline * disciplineGate)
```

**Test cases (Systems Architect):**
- 4 active Protocol, 2 purchased active: round(4/4 * 10 * 1.0) = 10
- 2 active Protocol, 1 purchased active: round(2/4 * 10 * 1.0) = 5
- 3 active Protocol, 0 purchased (floor): round(3/4 * 10 * 0.5) = 4
- 0 active Protocol, 2 purchased Physics: 0

**Test cases (Drive Engineer):**
- 5 active Physics, 3 purchased active: round(5/5 * 10 * 1.0) = 10
- 3 active Physics, 0 purchased (floor): round(3/5 * 10 * 0.5) = 3

**Test cases (Field Operative):**
- 3 Protocol + 4 Physics active, 2 purchased: round(3/3 * 10 * 1.0) = 10
- 2 Protocol + 5 Physics active, 1 purchased: round(2/3 * 10 * 1.0) = 7
- 1 Protocol + 2 Physics, 0 purchased (floor): round(1/3 * 10 * 0.5) = 2

---

## PART 4 — SCORE COMPOSITION

REQ-28: The total score MUST be:
```
total = completionBonus + pathIntegrity + signalDepth
      + investment + diversity + discipline
```

REQ-29: The total MUST be clamped to [0, 100].

REQ-30: Stars MUST be derived from total using:
```
stars = total >= 80 ? 3
      : total >= 55 ? 2
      : total >= 30 ? 1
      : 0
```

REQ-31: The ScoreBreakdown interface MUST expose all six
category values individually for UI display and COGS
commentary.

---

## PART 5 — FLOOR-SOLVE CEILING VERIFICATION

REQ-32: The floor-solve ceiling MUST be verified
algebraically for every level during level design review.
The verification is:

```
maxFloorSolve = 25 (completion, perfect lock)
              + 15 (path integrity, all pre-assigned active)
              + 0  (signal depth, gated by investment)
              + 0  (investment, nothing purchased)
              + 0  (diversity, gated by investment)
              + round(rawDiscipline * 0.5) (discipline, half credit)
```

For any level, rawDiscipline <= 10, so the discipline
contribution on floor solve <= 5.

**Maximum possible floor solve: 25 + 15 + 0 + 0 + 0 + 5 = 45.**

This is within the 1-star band (30-54). The ceiling holds
structurally. No per-level tuning is required.

REQ-33: If a future change to category maximums or gate
factors causes the theoretical floor-solve maximum to exceed
54, the change MUST be rejected or the gate factors adjusted
to restore the ceiling.

---

## PART 6 — CREDIT ECONOMY INTEGRATION

This section specifies how scoring interacts with credit
rewards. The payout formula itself lives in the economy
layer, but the scoring spec constrains its behavior.

REQ-34: The credit payout after a level completion MUST be
a function of the total score. RECOMMENDED formula:

```
basePayout = level.baseReward  (defined per level)
scoreMultiplier = total / 100  (0.0 to 1.0)
payout = round(basePayout * (0.3 + 0.7 * scoreMultiplier))
```

This ensures:
- Void result (score ~15): payout = ~0.4x base (partial)
- 1 star (score ~40): payout = ~0.58x base
- 2 stars (score ~65): payout = ~0.76x base
- 3 stars (score ~90): payout = ~0.93x base

REQ-35: The credit payout at 3 stars MUST exceed the total
investment for a well-built machine. Level designers MUST
set baseReward such that:
```
baseReward * 0.93 > expectedInvestmentFor3Stars
```

This is the virtuous cycle: spend more to build well, earn
back more than you spent.

REQ-36: Level definitions MUST include a new field:
```
baseReward: number  // credit payout base for this level
```

REQ-37: Tutorial levels MUST award a flat credit amount (no
score scaling). Tutorial levels are free — no spending, full
reward. RECOMMENDED: 25 CR per tutorial level.

---

## PART 7 — PURCHASABLE TAPE INTERACTION

REQ-38: Level definitions MUST specify which tapes are
provided:
```
providedTapes: ('IN' | 'TRAIL' | 'OUT')[]
```
IN is always included. TRAIL and OUT may be absent.

REQ-39: When a tape is not provided, the Engineer MAY
purchase it from the expanding tray store. Tape prices:
- TRAIL tape: 40 CR
- OUT tape: 40 CR

REQ-40: A purchased tape that is utilized during execution
contributes to the Investment category (REQ-20). A purchased
tape that is NOT utilized (bought but no piece interacted
with it) earns 0 Investment points from that tape.

REQ-41: Some levels MUST be designed such that 2 or 3 stars
are unreachable without purchasing missing tape
infrastructure. This is a level design constraint, not a
scoring constraint. The scoring system handles it naturally:
without the tape, certain pieces cannot function, reducing
active piece count and thus Investment, Signal Depth, and
Diversity scores.

REQ-42: The IN tape is ALWAYS provided. It MUST NOT be
purchasable. The machine always has input.

---

## PART 8 — EDGE CASES

### 8.1 Purchased but unused pieces

REQ-43: Pieces purchased but not placed on the board MUST
NOT affect scoring in any category. They are simply not
part of the machine.

REQ-44: Pieces purchased and placed but not active (signal
never passed through) MUST reduce Path Integrity (they
increase the denominator without increasing the numerator)
but MUST NOT contribute to Investment, Signal Depth, or
Diversity.

This is correct behavior: buying pieces you do not use
effectively is penalized through Path Integrity loss, not
rewarded through Investment. The system encourages
intentional building.

### 8.2 Pre-placed pieces

REQ-45: Pre-placed pieces (isPrePlaced: true) MUST NOT be
counted in any scoring category's numerator or denominator.
They are infrastructure, not the Engineer's work.

REQ-46: Source and Terminal are always pre-placed. Their
contribution to the signal path is a given, not scored.

REQ-47: Pre-placed Resonators (The Cradle sector) follow
the same rule. They contribute to the machine's function
but not to the Engineer's score.

### 8.3 Replay and personal best

REQ-48: Replaying a level MUST recalculate score from
scratch. No carryover from previous attempts.

REQ-49: The player's stored star count for a level MUST be
the maximum ever achieved (high-water mark). Replaying and
scoring lower does not reduce stored stars.

### 8.4 Daily challenges

REQ-50: Daily challenges MUST use the same scoring
algorithm. The expanding tray and purchasable tapes are
available in daily challenges.

### 8.5 Zero player pieces

REQ-51: If a level is solvable with zero player-placed
pieces (e.g., only pre-placed pieces carry the signal), the
score MUST be: Completion 25 + Path Integrity 15 + all
gated categories 0 + Discipline floor = ~45 max. This
is an edge case in level design, not a scoring bug.

### 8.6 Axiom sector (tutorial levels)

REQ-52: Axiom sector levels are tutorial levels. They use
the old tray model (no expanding tray, no purchases). The
scoring algorithm runs normally but stars are overridden to
3. COGS comments on the raw score. No credits are spent.

REQ-53: The Investment category will be 0 for all tutorial
levels (nothing purchased). This is correct. The tutorial
teaches building, not investing.

### 8.7 Pieces bought then returned to tray

REQ-54: If the Engineer purchases a piece, places it, then
long-presses to return it to tray before engaging, that
piece MUST NOT count as placed or active. It was returned.
Credits spent on it are still spent (no refunds during a
level attempt).

---

## PART 9 — DISCIPLINE SYSTEM REFRAME

The discipline system previously rewarded:
- Systems Architect: Protocol piece focus
- Drive Engineer: Physics piece focus (minimalism)
- Field Operative: minimal piece count

All three now reward ELABORATION within their domain:

REQ-55: Systems Architect MUST reward depth of Protocol
piece usage, not mere presence. Four active Protocol pieces
is the target, not "any Protocol piece touched."

REQ-56: Drive Engineer MUST reward depth of Physics piece
usage. Five active Physics pieces is the target.

REQ-57: Field Operative MUST reward balanced elaboration
across both categories. Three of each is the target, meaning
at least six active pieces total with good balance.

REQ-58: Discipline cost discounts (20% for in-category, 10%
for Field Operative) MUST remain. These make it cheaper to
invest in your discipline's preferred pieces, reinforcing
the incentive to elaborate within your specialization.

REQ-59: The COGS post-level dialogue system (DIALOGUE_SYSTEM.md)
MUST be updated to reflect the new scoring philosophy. "Played
to type" now means "elaborated deeply in your discipline's
domain" not "used your discipline's pieces efficiently."
This is a copy change requiring Tucker sign-off, not a
scoring change.

---

## PART 10 — MIGRATION FROM v1

### What changes

| v1 Category | v2 Category | Change |
|-------------|-------------|--------|
| Completion Bonus (25) | Completion (25) | Unchanged |
| Machine Complexity (30) | Investment (25) | Reframed: rewards purchased active pieces, not tray utilization |
| Protocol Precision (20) | Diversity (11) | Reframed: rewards type diversity across all pieces, not Protocol count |
| Path Integrity (15) | Path Integrity (15) | Unchanged in calculation |
| Speed Bonus (10) | REMOVED | Speed rewards rushing, contradicts soul of the game |
| Elaboration (15) | Signal Depth (14) | Reframed: rewards total path length, gated behind investment |
| (none) | Discipline (10) | New standalone category (was embedded in other categories) |

### What is removed

REQ-60: Speed Bonus MUST be removed. The game rewards
building elaborate machines, not building them fast. Time
pressure contradicts the design philosophy. COGS MAY still
comment on time taken, but it MUST NOT affect score.

### ScoreBreakdown interface

REQ-61: The ScoreBreakdown interface MUST be updated to:
```typescript
interface ScoreBreakdown {
  completion: number;       // 0 or 25
  pathIntegrity: number;    // 0-15
  signalDepth: number;      // 0-14
  investment: number;       // 0-25
  diversity: number;        // 0-11
  discipline: number;       // 0-10
}
```

REQ-62: Legacy aliases (efficiency, chainIntegrity,
disciplineBonus) MUST be removed. Any UI code referencing
them MUST be updated to use the new category names.

### Level definition additions

REQ-63: Level definitions MUST add:
```typescript
depthCeiling?: number;        // default: floorSolvePieces * 2
baseReward: number;           // credit payout base
providedTapes: TapeType[];    // which tapes are free
```

---

## PART 11 — WORKED EXAMPLES

### Example A: Floor solve only (Kepler K1-3)

Setup: 5 pre-assigned pieces. 0 purchased. All 5 placed and
active. depthCeiling = 10. Discipline = Systems Architect.
2 active Protocol pieces. Machine locks.

```
completion     = 25
pathIntegrity  = round(5/5 * 15) = 15
signalDepth    = round(5/10 * 14 * 0.0) = 0  (no purchased)
investment     = 0
diversity      = round(3/6 * 11 * 0.0) = 0  (no purchased)
discipline     = round(2/4 * 10 * 0.5) = 3  (floor gate)

total = 43  ->  1 star
```

The Engineer completed the level. Clean machine. But no
investment = no elaboration rewards. 1 star.

### Example B: Moderate investment (Kepler K1-3)

Setup: 5 pre-assigned + 3 purchased pieces. 7 placed, 7
active. depthCeiling = 10. Discipline = Systems Architect.
3 active Protocol pieces among the 7. 4 distinct types.

```
completion     = 25
pathIntegrity  = round(7/7 * 15) = 15
signalDepth    = round(7/10 * 14 * 1.0) = 10
investment     = min(3 * 3, 17) = 9
diversity      = round(4/6 * 11 * 1.0) = 7
discipline     = round(3/4 * 10 * 1.0) = 8

total = 74  ->  2 stars
```

Solid machine. Good investment. 2 stars.

### Example C: Full elaboration (Kepler K1-3)

Setup: 5 pre-assigned + 6 purchased pieces. 10 placed, 10
active. depthCeiling = 10. Purchased TRAIL tape, used.
Discipline = Systems Architect. 4 active Protocol pieces.
6 distinct types.

```
completion     = 25
pathIntegrity  = round(10/10 * 15) = 15
signalDepth    = round(10/10 * 14 * 1.0) = 14
investment     = min(6*3 + 4, 25) = min(22, 25) = 22
diversity      = round(6/6 * 11 * 1.0) = 11
discipline     = round(4/4 * 10 * 1.0) = 10

total = 97  ->  3 stars
```

Beautiful machine. Deep investment. Every piece working.
Purchased infrastructure utilized. Full discipline alignment.
97 points. The Engineer earned it.

### Example D: Bought but did not use well

Setup: 5 pre-assigned + 4 purchased. 9 placed, 6 active
(3 purchased pieces placed but signal never reached them).
depthCeiling = 10. Discipline = Drive Engineer. 4 active
Physics. 3 distinct types.

```
purchasedActive = 1 (only 1 of 4 purchased pieces was active)

completion     = 25
pathIntegrity  = round(6/9 * 15) = 10  (3 dead pieces hurt)
signalDepth    = round(6/10 * 14 * 1.0) = 8
investment     = min(1 * 3, 17) = 3
diversity      = round(3/6 * 11 * 1.0) = 6
discipline     = round(4/5 * 10 * 1.0) = 8

total = 60  ->  2 stars
```

The Engineer invested but built sloppily. Dead pieces hurt
Path Integrity. Only 1 purchased piece was active, so
Investment is low. The system correctly distinguishes between
spending credits and spending them well.

### Example E: Failed machine (void)

Setup: 5 pre-assigned + 2 purchased. 7 placed, 4 active.
Machine does not lock (wrong output). Discipline = Field
Operative.

```
completion     = 0  (did not lock)
pathIntegrity  = round(4/7 * 15) = 9
signalDepth    = round(4/10 * 14 * 1.0) = 6
investment     = min(2 * 3, 17) = 6
diversity      = round(3/6 * 11 * 1.0) = 6
discipline     = round(min(1,2)/3 * 10 * 1.0) = 3

total = 30  ->  1 star
```

Wait — the machine did not lock but scored 30? That is
because non-completion only removes the 25-point Completion
bonus. The other categories still measure machine quality.
A well-built machine that produces wrong output still
demonstrates engineering skill. 1 star is the floor for a
machine that was close. A truly broken machine (signal dies
early, few active pieces) will score lower:

```
completion = 0, pathIntegrity = 3, signalDepth = 1,
investment = 3, diversity = 2, discipline = 2 = 11 -> void
```

This is correct. COGS diagnostic feedback tells the Engineer
what went wrong. They invest and try again.

---

## PART 12 — TEST DERIVATION GUIDANCE

### Unit test strategy

Each category function MUST be independently testable with
mock inputs. No category depends on another category's
output.

### Required test matrix

For each category, test:
1. Minimum input (0 pieces, 0 purchased, machine failed)
2. Floor solve (pre-assigned only, machine locked)
3. Moderate investment (some purchased, some active)
4. Full elaboration (many purchased, all active)
5. Waste case (purchased but inactive pieces)

### Integration tests

REQ-64: At least three integration tests MUST verify the
floor-solve ceiling:
- A floor solve on an early Kepler level scores <= 54
- A floor solve on a late Kepler level scores <= 54
- A floor solve with perfect execution scores <= 54

REQ-65: At least two integration tests MUST verify the
investment reward:
- A well-invested machine scores higher than a floor solve
- A fully elaborated machine scores 80+

REQ-66: At least one integration test MUST verify that
purchased-but-unused pieces reduce Path Integrity without
increasing Investment.

### Boundary tests

REQ-67: Test the exact star boundaries: 29->void, 30->1star,
54->1star, 55->2stars, 79->2stars, 80->3stars.

REQ-68: Test the investment gate transitions: 0 purchased
active -> gated categories return 0; 1 purchased active ->
gated categories return full calculation.

### Discipline tests

REQ-69: For each discipline, test:
- Full elaboration in preferred domain -> 10 pts
- Partial elaboration -> proportional
- Zero relevant pieces -> 0 pts
- Floor-solve gate (0.5 multiplier) applied correctly

---

## PART 13 — OPEN QUESTIONS FOR TUCKER

1. **Speed Bonus removal:** The spec removes Speed Bonus
   entirely. If Tucker wants to preserve some time-based
   element, it could be reframed as a tiebreaker or COGS
   commentary without affecting score. Confirm removal.

2. **Tape prices:** 40 CR each for TRAIL and OUT tape.
   This is a balance lever. Tucker may want to adjust.

3. **Investment per-piece rate:** 3 points per purchased
   active piece, capped at 17 from pieces. This means ~6
   purchased active pieces maxes the piece component. Tucker
   may want to adjust the rate or cap.

4. **depthCeiling default:** floorSolvePieces * 2 means a
   level with a 5-piece floor solve has depthCeiling = 10.
   The Engineer needs 10 active pieces for full Signal Depth.
   Is this the right ratio?

5. **Discipline thresholds:** SA needs 4 Protocol, DE needs
   5 Physics, FO needs 3+3. These are tuning levers. Do
   these feel right given the piece costs and typical level
   sizes?

6. **COGS dialogue update:** The dialogue system references
   the old scoring philosophy heavily (efficiency, lean
   solutions, piece count vs optimal). A dialogue rewrite
   is needed. Should that be a separate spec or bundled?

---

END OF SCORING ALGORITHM v2 SPECIFICATION
