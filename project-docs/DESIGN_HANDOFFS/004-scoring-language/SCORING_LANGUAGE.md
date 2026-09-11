# COGS Scoring Language — v2 Rewrite

**Handoff:** 004 · **Answers:** `003-gameplay-review/DECISIONS.md` DEC-1 item 6
**Target file:** `docs/DIALOGUE_SYSTEM.md`
**Status:** Draft lines require Tucker sign-off before they enter the doc.
COGS dialogue is not written without approval; everything in Part 3 below is
marked DRAFT for that reason.

---

## Part 1 — The problem is not vocabulary

DEC-1 item 6 describes this as swapping "used efficiently" for "elaborated
deeply." That covers about a third of it. The other two thirds:

**1. One discipline is defined by the deleted metric.**

`DIALOGUE_SYSTEM.md` §3 preamble, verbatim:

> *"The Field Operative discipline is the most demanding to read because its
> strength is efficiency across all piece types, not dominance in one. COGS
> evaluates a Field Operative on piece count relative to optimal, not on which
> type they used. He is watching for lean solutions. Every unnecessary piece is
> a failure of the discipline. Every piece that earned its place is exactly
> what he expected."*

Under v2, an unnecessary piece is worth up to 3 points of Investment and
extends Signal Depth. The sentence "every unnecessary piece is a failure of the
discipline" is now false in the engine's terms, and it is the discipline's
thesis statement. Its subsections are built on it — §3A is titled *"lean
solution, near-optimal piece count"* and §3C *"both types used, but count above
optimal."* Those are section headings, not stray adjectives.

Meanwhile `scoring-algorithm-v2.md` redefines Field Operative structurally: 3
active Protocol + 3 active Physics. The discipline's v2 identity is **breadth**
— using both systems — and has nothing to do with count.

**2. COGS's authority depends on him being right about the scoring engine.**

`NARRATIVE.md` establishes that his credibility is specificity. Lines like
*"Full marks. Efficient use of both piece types. No redundancy. The Field
Operative discipline rewards this kind of solution. So does the scoring
engine"* make a claim about the engine that, post-v2, is incorrect. That line
is the clearest case: it explicitly invokes the scoring engine to back a
standard the engine no longer applies. There are roughly forty lines in this
family across §2 and §3.

**3. Some lines are fine and must not be touched.**

`NARRATIVE.md` and `BOUNTY_SYSTEM.md` use "efficiency" as *plain
characterization* — the sensor array reading 98.3 percent efficiency, COGS
treating routine bounties "with measured efficiency," life support being the
priority "including efficiency." None of those reference scoring. DEC-1 item 1
also preserved COGS commenting on time as color. A blanket find-and-replace on
"efficien*" would damage the character's normal register.

---

## Part 2 — The decision I need from you

### Option A — Field Operative becomes the breadth discipline

Its standard becomes: *did the Engineer use both systems, and use each for
what it is good at?* Praise is for a machine that reaches into Physics and
Protocol with intent. Criticism is for a machine that leaned on one when the
other was the right tool. Count is never mentioned.

This matches v2's structural definition (3+3) and needs no engine change. It
keeps COGS's *tone* toward the Field Operative intact — he already reads that
discipline as the most demanding one — and changes what he is demanding.

The cost: §3's subsection structure is rebuilt. "Played to Type" becomes
"used both systems with intent," "Played Mixed but Inefficiently" becomes
something like "used both systems without committing to either." Roughly
twenty lines rewritten, and three section headings.

### Option B — Field Operative keeps a restraint standard as character, not scoring

COGS personally values economy and says so, while the engine rewards
elaboration. He becomes a voice slightly out of step with the scoring — a
deliberate tension.

This preserves the existing §3 almost entirely. It is also the more
interesting character choice, and `NARRATIVE.md` supports COGS having opinions
the ship does not share.

The cost is real: the player is told by the game's only authority that lean is
good, while the score card pays for elaborate. `TEACHING_PROGRESSION.md` relies
on COGS as the teaching voice, and a teaching voice that contradicts the
reward signal teaches the wrong lesson. `COMPUTATIONAL_MODEL.md`'s "failure is
the curriculum" depends on his diagnostics being actionable.

### Recommendation: Option A

The tension in Option B is good writing and bad teaching, and this game has
decided repeatedly that teaching wins. Option A also costs less than it looks
— the Field Operative's *voice* is unchanged, only his criterion moves, and
COGS noting a machine did more than it needed is still available to him as
color under DEC-1 item 1.

**Everything in Part 3 assumes Option A.** If you take B, Part 3 shrinks to
the §2 Drive Engineer lines and the two engine-invoking lines, and I will
redraft.

---

## Part 3 — Rewrite rules and draft lines

### Rules

1. **Never invoke the scoring engine to support a claim about piece economy.**
   COGS may state what the engine rewards; it must be true post-v2.
2. **"Efficient" survives only as plain characterization** — routing that is
   direct, a system running clean, time taken as color. It never appears as a
   scoring criterion or a discipline standard.
3. **Drive Engineer (§2) keeps directness as a Physics virtue.** v2 rewards
   Signal Depth, but a Drive Engineer admiring a clean line is about
   *routing quality*, not count. Most §2 lines survive with "piece count
   matched optimal" excised.
4. **v2's vocabulary is `depth`, `elaboration`, `investment`, `commitment`.**
   Not "complex" (sounds like a fault), not "more" (sounds like padding).
   Depth is the noun COGS would use.
5. **Star-count lines stay verbatim** where they do not name a criterion.
6. **The void matrix is untouched** — approved as authored in DEC-3.

### Draft lines — DRAFT, pending sign-off

§3 preamble, replacing the thesis quoted in Part 1:

> DRAFT — *"The Field Operative discipline is the most demanding to read
> because its strength is reach, not dominance. COGS evaluates a Field
> Operative on whether both systems were used for what they are good at, not
> on how many pieces it took. He is watching for intent. A machine that
> reaches into Physics and Protocol and asks each for what it does well is
> what he expects. A machine that leans on one because the other was
> unfamiliar is the failure he is looking for."*

The engine-invoking line (§3A):

> Current: *"Full marks. Efficient use of both piece types. No redundancy. The
> Field Operative discipline rewards this kind of solution. So does the
> scoring engine."*
>
> DRAFT — *"Full marks. Both piece types used for what they are good at. The
> Field Operative discipline rewards this kind of solution. So does the
> scoring engine."*

§3A, the "lean solution" praise:

> Current: *"Three stars. Lean solution. The Engineer used what the level
> required and nothing more. I have been waiting to see what the Field
> Operative discipline looks like at full efficiency. This is what it looks
> like."*
>
> DRAFT — *"Three stars. The Engineer used both systems and asked each for
> what it does well. I have been waiting to see what the Field Operative
> discipline looks like at full reach. This is what it looks like."*

§3C, the count-based criticism:

> Current: *"One star. Mixed approach, inefficient count. The discipline is
> not about which pieces are used. It is about using as few of them as
> possible. This solution did not minimize."*
>
> DRAFT — *"One star. Both systems present, neither committed to. The
> discipline is not about which pieces are used. It is about using each one
> for what it is for. This solution did neither."*

§3B, the single-type criticism (currently frames the fault as efficiency loss):

> Current: *"Two stars. Single piece type used heavily. The Field Operative
> discipline is not type-specific. It is efficiency-specific. The efficiency
> loss from avoiding the other type cost a star."*
>
> DRAFT — *"Two stars. Single piece type used heavily. The Field Operative
> discipline is not type-specific. It is reach-specific. Avoiding the other
> system cost a star."*

§2 Drive Engineer — a survives-with-excision example:

> Current: *"The routing efficiency on the last level was as clean as anything
> I have logged from a Drive Engineer. The piece count matched optimal within
> one. I do not often get to write that in the log."*
>
> DRAFT — *"The routing on the last level was as clean as anything I have
> logged from a Drive Engineer. Every turn in the path was there for a reason.
> I do not often get to write that in the log."*

One new line the v2 vocabulary makes available, for a deeply elaborated
machine — v2 has a reward tier the current dialogue has no voice for:

> DRAFT — *"Three stars. The signal traveled further than the level required
> and every stage of it did something. Depth is not the same as size. This was
> depth."*

### Section headings

| Current | DRAFT |
|---|---|
| §3A Played to Type (lean solution, near-optimal piece count) | Played to Type (both systems used with intent) |
| §3B Played Against Type (single-type dominance at the expense of efficiency) | Played Against Type (one system carried the machine) |
| §3C Played Mixed but Inefficiently (both types used, but count above optimal) | Played Mixed Without Commitment (both types present, neither leveraged) |

### Do not touch

`NARRATIVE.md` lines 427, 431, 449, 463, 554, 616, 888; `BOUNTY_SYSTEM.md`
line 34. All use "efficiency" as characterization, none reference scoring.
Confirmed by reading each.

---

## Part 4 — Scope of the full pass

Once Option A or B is settled, the mechanical pass covers roughly 40 lines in
`DIALOGUE_SYSTEM.md` §2 and §3 plus three headings and the §3 preamble. I have
drafted the load-bearing seven above — the thesis, the engine-invoking line,
and one representative from each pattern — deliberately, rather than dumping
forty drafts you would have to review in bulk. Approve the direction and the
seven, and the remainder follows the same rules mechanically; I will deliver
them in one file for a single sign-off pass.

Two things this document does not do: it does not touch the void matrix
(approved as authored), and it does not change any score value, threshold or
star boundary — DEC-1 accepted all six of those as proposed.
