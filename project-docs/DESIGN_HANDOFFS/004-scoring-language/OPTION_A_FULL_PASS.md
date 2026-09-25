# COGS Scoring Language — Option A, Full Pass

> **STATUS: LANDED 2026-09-23 (AXM-009, PROMPT_162).** Every draft below is applied to
> `docs/DIALOGUE_SYSTEM.md` under the COGS DIALOGUE DOCTRINE (Tucker confirmed 2026-09-23 that
> these ship). DIALOGUE_SYSTEM.md is now the source of truth; this file is the record of the change.

**Handoff:** 004 · **Decision:** Option A ratified by Tucker, 2026-09-10
**Target file:** `docs/DIALOGUE_SYSTEM.md`
**Status:** DRAFT throughout. Nothing enters the codebase without your
line-level sign-off, per that document's own standing rule.
**Structure confirmed 2026-09-10:** the commitment split below is ratified,
and the four §3 void lines citing optimal count are to be rewritten. Both
decisions are already reflected in the drafts.

Companion to `SCORING_LANGUAGE.md`, which carries the reasoning. This file is
the work: every line that needs to change, current text beside draft text, in
document order.

---

## One structural decision you need to make first

Option A defines the Field Operative by **breadth** — did the Engineer use
both systems, and use each for what it is good at. That creates a collision
the count-based version did not have:

- §3A is currently *"played to type — lean solution, near-optimal count."*
- §3C is currently *"played mixed but inefficiently — both types used, count
  above optimal."*

Under Option A, "played to type" **is** "played mixed." Using both systems is
now the standard, so the two sections describe the same behavior and are
separated only by a metric that no longer exists. They cannot both survive
unchanged.

**Recommended split**, which keeps all three sections and matches how v2
actually counts — v2 scores *active* pieces, so a piece placed but never
touched by the signal is not load-bearing:

| Section | Option A meaning |
|---|---|
| **3A — Played to Type** | Both systems used, both doing real work. Breadth achieved. |
| **3B — Played Against Type** | One system carried the machine; the other is absent or nearly so. |
| **3C — Played Without Commitment** | Both systems present, but one is token — placed, not leveraged. The signal barely touches it. |

This preserves the discipline's most interesting failure state (the Engineer
who technically satisfied 3+3 without meaning it) and keeps COGS's measured
tone in 3C, which the existing note asks for.

**RATIFIED 2026-09-10.** The drafts below are final-form against this split
and need only line-level sign-off.

---

## Part 1 — Headers and framing

### Usage note, discipline definitions

> Current: *"Field Operative: All pieces, minimal count. COGS expects lean,
> efficient solutions regardless of type."*
>
> DRAFT — *"Field Operative: Both piece categories, used deliberately. COGS
> expects solutions that reach into Physics and Protocol and ask each for what
> it does well."*

### §3 preamble, first paragraph

> Current: *"The Field Operative discipline is the most demanding to read
> because its strength is efficiency across all piece types, not dominance in
> one. COGS evaluates a Field Operative on piece count relative to optimal, not
> on which type they used. He is watching for lean solutions. Every unnecessary
> piece is a failure of the discipline. Every piece that earned its place is
> exactly what he expected."*
>
> DRAFT — *"The Field Operative discipline is the most demanding to read
> because its strength is reach, not dominance. COGS evaluates a Field
> Operative on whether both systems were used for what they are good at, not on
> how many pieces it took. He is watching for intent. A piece placed because the
> Engineer understood what it does is exactly what he expected. A piece placed
> to fill a requirement is the failure he is looking for."*

### §3 preamble, second paragraph

> Current: *"COGS finds the Field Operative methodology the most interesting of
> the three disciplines and the most difficult to comment on, because its
> signature is absence — fewer pieces, tighter solutions — and he respects
> absence as a design principle more than he lets on."*
>
> DRAFT — *"COGS finds the Field Operative methodology the most interesting of
> the three disciplines and the most difficult to comment on, because its
> signature is range rather than a single strength, and a machine that does
> several things well is harder to praise precisely than a machine that does
> one thing perfectly. He prefers precision. He works at it anyway."*

### Section headings

| Current | DRAFT |
|---|---|
| 3A. Played to Type (lean solution, near-optimal piece count) | 3A. Played to Type (both systems used with intent) |
| 3B. Played Against Type (over-reliance on one piece category, higher count) | 3B. Played Against Type (one system carried the machine) |
| 3C. Played Mixed but Inefficiently (both types used, but count above optimal) | 3C. Played Without Commitment (both systems present, one not leveraged) |

### §3B note

> Current: *"For the Field Operative, 'against type' means leaning heavily into
> one piece category at the expense of efficiency — using only Physics when a
> Protocol piece would have shortened the path, or vice versa. The discipline
> does not care which type is used. It cares that the choice was the efficient
> one."*
>
> DRAFT — *"For the Field Operative, 'against type' means leaning on one piece
> category and leaving the other on the bench — building with Physics alone
> when a Protocol piece would have done something Physics cannot, or the
> reverse. The discipline does not favor either category. It expects both to be
> asked."*

### §3C note

> Current: *"This is the most common Field Operative failure state — using both
> piece types but placing too many. COGS is more measured here than in other
> void or one-star states because the Engineer is at least operating within the
> discipline's framework. The problem is precision, not approach."*
>
> DRAFT — *"This is the most common Field Operative failure state — both piece
> categories on the board, but one of them barely touched by the signal. COGS is
> more measured here than in other void or one-star states because the Engineer
> is at least operating within the discipline's framework. The problem is
> commitment, not approach."*

---

## Part 2 — Section Three, line by line

### 3A · Three Stars

*Early, line 1:*
> Current: *"Three stars. Piece count within one of optimal. The Field
> Operative approach is about finding the minimum path that does the maximum
> work. This was that."*
>
> DRAFT — *"Three stars. Both systems engaged, both load-bearing. The Field
> Operative approach is about asking each system for what only it can do. This
> did that."*

*Early, line 2 — the engine-invoking line:*
> Current: *"Full marks. Efficient use of both piece types. No redundancy. The
> Field Operative discipline rewards this kind of solution. So does the scoring
> engine."*
>
> DRAFT — *"Full marks. Both piece types used for what they are good at. The
> Field Operative discipline rewards this kind of solution. So does the scoring
> engine."*

*Mid, line 1:*
> Current: *"Three stars. Lean solution. The Engineer used what the level
> required and nothing more. I have been waiting to see what the Field Operative
> discipline looks like at full efficiency. This is what it looks like."*
>
> DRAFT — *"Three stars. The Engineer used both systems and asked each for what
> it does well. I have been waiting to see what the Field Operative discipline
> looks like at full reach. This is what it looks like."*

*Mid, line 2:*
> Current: *"Three stars. Optimal piece count. The solution was tight. I find
> tight solutions preferable to elaborate ones. Not as a preference. As an
> engineering principle."*
>
> DRAFT — *"Three stars. The signal went further than the level required and
> every stage of it did something. Depth is not the same as size. This was
> depth."*

*Late:*
> Current: *"Three stars. Piece count at optimal. This has been the consistent
> standard for this Engineer in this discipline for several sectors now. I have
> nothing to add to that. The record is the assessment."*
>
> DRAFT — *"Three stars. Both systems fully engaged. This has been the
> consistent standard for this Engineer in this discipline for several sectors
> now. I have nothing to add to that. The record is the assessment."*

*Hub follow-up:*
> Current: *"The last level was solved at optimal piece count. Full marks. The
> Field Operative methodology applied completely. I want to note that this
> approach is harder than it looks. The Engineer makes it look like it is not
> hard. I am noting that as the opposite of an insult."*
>
> DRAFT — *"The last level was solved with both systems doing real work. Full
> marks. The Field Operative methodology applied completely. I want to note that
> this approach is harder than it looks — two systems is two things to be right
> about. The Engineer makes it look like it is not hard. I am noting that as the
> opposite of an insult."*

### 3A · Two Stars

*Early:*
> Current: *"Two stars. The solution worked. The piece count was above optimal.
> The Field Operative discipline accounts for efficiency. The excess pieces
> account for the missing star."*
>
> DRAFT — *"Two stars. The solution worked. One system did most of the work and
> the other assisted. The Field Operative discipline accounts for reach. The
> imbalance accounts for the missing star."*

*Mid:*
> Current: *"Two stars. The path was correct. The piece count was not lean. The
> Field Operative approach is about removing what is not necessary. Something
> unnecessary remained."*
>
> DRAFT — *"Two stars. The path was correct. One system was underused. The
> Field Operative approach is about asking both systems for what they do best.
> One of them was not asked."*

*Late:*
> Current: *"Two stars. Above optimal piece count. The discipline expects lean.
> The solution was not lean. I have noted the gap between what was placed and
> what was needed."*
>
> DRAFT — *"Two stars. One system carried more than its share. The discipline
> expects balance. I have noted the gap between what was available and what was
> used."*

### 3A · One Star

*Early:*
> Current: *"One star. The Field Operative discipline penalizes excess. The
> piece count exceeded optimal by a margin that exceeds what the discipline can
> absorb. One star."*
>
> DRAFT — *"One star. The Field Operative discipline penalizes narrowness. One
> system did nearly all of the work by a margin the discipline cannot absorb.
> One star."*

*Mid:*
> Current: *"One star. The solution was functional but not efficient. The Field
> Operative approach requires the Engineer to see the minimum path before placing
> the first piece. That step was skipped."*
>
> DRAFT — *"One star. The solution was functional but narrow. The Field
> Operative approach requires the Engineer to know what each system is for
> before placing the first piece. That step was skipped."*

*Late:*
> Current: *"One star. Piece count significantly above optimal. At this point in
> the mission the minimum path should be visible before the work begins. It was
> not. Or it was and was not followed. I do not know which is worse."*
>
> DRAFT — *"One star. One system carried nearly the entire machine. At this
> point in the mission the Engineer knows what the other one does. Either it was
> not considered, or it was and was set aside. I do not know which is worse."*

### 3A · Void

*Early:*
> Current: *"No stars. The piece count was significantly above optimal. The
> Field Operative methodology was not applied. The solution worked mechanically
> and failed by every metric the discipline tracks."*
>
> DRAFT — *"No stars. One system was used and the other was not. The Field
> Operative methodology was not applied. The solution worked mechanically and
> failed by every metric the discipline tracks."*

*Mid:*
> Current: *"Void. The Field Operative discipline is built around the idea that
> the best solution uses the fewest pieces. This solution used the most pieces.
> Those are opposite ideas."*
>
> DRAFT — *"Void. The Field Operative discipline is built around the idea that
> a machine should use everything available to it. This machine used half of
> what was available. Those are opposite ideas."*

*Late:*
> Current: *"Void. Piece count far above optimal. I do not have a more precise
> analysis than: something went wrong at the planning stage, not the execution
> stage. The Engineer should start there."*
>
> DRAFT — *"Void. One system, used alone, to a void result. I do not have a
> more precise analysis than: something went wrong at the planning stage, not
> the execution stage. The Engineer should start there."*

### 3B · Three Stars

*Early:*
> Current: *"…The piece count is above optimal but the path held. The
> discipline would have found a shorter route with both piece types available.
> The Engineer found a longer route that still works."*
>
> DRAFT — *"Three stars. Physics-dominant solution from a Field Operative. The
> path held without Protocol involvement. The discipline would have reached for
> both. The Engineer reached for one and made it carry the level."*

*Mid:*
> Current: *"Three stars. Protocol-heavy approach. The field operative
> methodology allows for piece type flexibility when efficiency is maintained.
> The efficiency was maintained, just not maximized. Three stars covers the
> difference."*
>
> DRAFT — *"Three stars. Protocol-heavy approach. The Field Operative
> methodology allows for one system to lead when the machine still does what the
> level asks. It did. The other system sat idle. Three stars covers the
> difference."*

*Late:*
> Current: *"Three stars. Single piece type dominant. At full marks the
> methodology choice is difficult to argue with. I am noting it is not the most
> efficient version of the solution. The stars do not reflect the most efficient
> version. They reflect this version."*
>
> DRAFT — *"Three stars. Single piece type dominant. At full marks the
> methodology choice is difficult to argue with. I am noting it is not the
> fullest version of the solution. The stars do not reflect the version that used
> everything. They reflect this version."*

### 3B · Two Stars

*Early:*
> Current: *"Two stars. Single piece type used heavily. The Field Operative
> discipline is not type-specific. It is efficiency-specific. The efficiency
> loss from avoiding the other type cost a star."*
>
> DRAFT — *"Two stars. Single piece type used heavily. The Field Operative
> discipline is not type-specific. It is reach-specific. Avoiding the other
> system cost a star."*

*Mid:*
> Current: *"Two stars. The solution leaned on one piece category when both were
> available. A shorter path existed using both. The Field Operative should find
> the shorter path."*
>
> DRAFT — *"Two stars. The solution leaned on one piece category when both were
> available. There was work in this level that only Protocol can do. It was
> routed around instead."*

*Late:*
> Current: *"Two stars. Single-type dominance. The efficient solution for this
> level required both piece categories. The Engineer chose one. Two stars is
> what that choice produces."*
>
> DRAFT — *"Two stars. Single-type dominance. This level had work for both
> categories. The Engineer chose one. Two stars is what that choice produces."*

### 3B · One Star

*Early:*
> Current: *"One star. Single piece type, above-optimal count, one-star result.
> The Field Operative methodology is built for exactly this kind of level. It
> was not applied to it."*
>
> DRAFT — *"One star. Single piece type, one-star result. The Field Operative
> methodology is built for exactly this kind of level. It was not applied to
> it."*

*Mid:*
> Current: *"One star. Physics-only solution where Protocol pieces would have
> shortened the path significantly. The discipline does not prefer piece types.
> It prefers the shortest path. This was not the shortest path."*
>
> DRAFT — *"One star. Physics-only solution where Protocol pieces would have
> done work Physics cannot. The discipline does not prefer piece types. It
> expects both to be used. Only one was."*

*Late:*
> Current: *"One star. Single-type dominant approach at one-star efficiency. The
> Field Operative has access to the full toolkit. This solution used half of
> it."*
>
> DRAFT — *"One star. Single-type dominant approach. The Field Operative has
> access to the full toolkit. This solution used half of it."*

### 3B · Void

*Early:*
> Current: *"No stars. Single piece type, above optimal count, void rating. The
> Field Operative discipline is the most flexible of the three. That flexibility
> was not used."*
>
> DRAFT — *"No stars. Single piece type, void rating. The Field Operative
> discipline is the most flexible of the three. That flexibility was not used."*

*Mid:*
> Current: *"Void. The solution avoided one entire piece category and achieved
> void efficiency with the other. The discipline exists to prevent this outcome
> by using all available tools."*
>
> DRAFT — *"Void. The solution avoided one entire piece category and failed with
> the other. The discipline exists to prevent this outcome by using all
> available tools."*

*Late:* unchanged — *"Void. Single-type approach, void result. I am not going
to elaborate. The Engineer has the data."*

### 3C · Three Stars (the anomaly line)

*Note above it:*
> Current: *"Three stars with above-optimal count is almost impossible for a
> Field Operative given scoring weights. If it occurs, COGS notes it as an
> anomaly."*
>
> DRAFT — *"Three stars with one system barely engaged is almost impossible for
> a Field Operative given scoring weights. If it occurs, COGS notes it as an
> anomaly."*

*All phases:*
> Current: *"Three stars. Piece count above optimal. The Field Operative
> discipline would predict a lower rating at this piece count. The prediction was
> wrong. I am updating the model."*
>
> DRAFT — *"Three stars. One system barely engaged. The Field Operative
> discipline would predict a lower rating at this level of commitment. The
> prediction was wrong. I am updating the model."*

### 3C · Two Stars

*Early:*
> Current: *"Two stars. Both piece types used. Piece count above optimal. The
> approach was right. The precision was not complete. Two stars is where the
> imprecision lands."*
>
> DRAFT — *"Two stars. Both piece types on the board. One of them barely in the
> signal's way. The approach was right. The commitment was not complete. Two
> stars is where that lands."*

*Mid:*
> Current: *"Two stars. Mixed piece usage, above optimal count. The Field
> Operative methodology was applied in the right direction but not to its
> conclusion. The final piece count was not lean enough."*
>
> DRAFT — *"Two stars. Both categories present, one doing very little. The
> Field Operative methodology was applied in the right direction but not to its
> conclusion. Placing a piece is not the same as using it."*

*Late:*
> Current: *"Two stars. Both types used, above optimal count, two-star result.
> This is a precision problem, not a methodology problem. The approach is
> correct. The execution is not complete."*
>
> DRAFT — *"Two stars. Both types used, one of them nominally, two-star result.
> This is a commitment problem, not a methodology problem. The approach is
> correct. The execution is not complete."*

*Hub follow-up:*
> Current: *"The last level was a two-star result at above-optimal piece count.
> The methodology was sound. The solution was not lean enough to close the gap.
> The difference between two stars and three stars at this discipline is usually
> one piece. I am noting that as a specific observation, not a general one."*
>
> DRAFT — *"The last level was a two-star result with one system barely
> engaged. The methodology was sound. The machine did not commit to it. The
> difference between two stars and three stars at this discipline is usually one
> piece doing real work instead of sitting adjacent to the path. I am noting
> that as a specific observation, not a general one."*

### 3C · One Star

*Early:*
> Current: *"One star. Both piece types present, piece count significantly above
> optimal. The Field Operative approach requires precision from the start. The
> precision was approximate."*
>
> DRAFT — *"One star. Both piece types present, one of them decorative. The
> Field Operative approach requires intent from the start. The intent was
> approximate."*

*Mid:*
> Current: *"One star. Mixed approach, inefficient count. The discipline is not
> about which pieces are used. It is about using as few of them as possible.
> This solution did not minimize."*
>
> DRAFT — *"One star. Both systems present, neither committed to. The discipline
> is not about which pieces are used. It is about using each one for what it is
> for. This solution did neither."*

*Late:*
> Current: *"One star. Above optimal count on a mixed approach. I want to note
> the Engineer is using both piece types correctly. The number of them is the
> problem. Fewer would have produced a better outcome."*
>
> DRAFT — *"One star. Both piece types present on a one-star result. I want to
> note the Engineer is choosing the right categories. What they are asked to do
> is the problem. One of them was asked for almost nothing."*

### 3C · Void

*Early:*
> Current: *"No stars. Both piece types used, piece count well above optimal,
> void result. The solution worked. The discipline requires more than a solution
> that works."*
>
> DRAFT — *"No stars. Both piece types used, one of them incidentally, void
> result. The pieces were placed. The discipline requires more than pieces being
> placed."*

*Mid:*
> Current: *"Void. Mixed approach, maximum inefficiency. The Field Operative
> discipline rewards the minimum path. The minimum path was not taken. The
> result is the void."*
>
> DRAFT — *"Void. Both categories on the board, neither leveraged. The Field
> Operative discipline rewards machines that use what they are given. This one
> was given two systems and committed to neither. The result is the void."*

*Late:*
> Current: *"Void. Mixed pieces, above optimal count, void rating. At this point
> in the mission the minimum path should be visible without effort. I am not
> sure what prevented it here."*
>
> DRAFT — *"Void. Both piece types placed, neither doing work, void rating. At
> this point in the mission the Engineer knows what each system is for. I am not
> sure what prevented it here."*

---

## Part 3 — Section Two, Drive Engineer

Most of §2 survives. Per rule 3, directness stays a Physics virtue — it is
about **routing quality**, not count. Six lines make a count or
shortest-path claim the engine no longer supports.

One caution worth stating: **"shortest" is now the wrong word even for the
Drive Engineer.** v2 rewards Signal Depth, so a line praising the shortest
route contradicts the engine in the same way §3 did. "Clean," "deliberate,"
and "every turn earned" carry the same admiration without the conflict. That
is the substitution below.

*2A Three Stars, Early line 1:*
> Current: *"Clean routing. Physics pieces used efficiently. This is the Drive
> Engineer approach at its best. The signal path found the shortest distance and
> took it."*
>
> DRAFT — *"Clean routing. Physics pieces used deliberately. This is the Drive
> Engineer approach at its best. Every turn in the path was there for a
> reason."*

*2A Three Stars, Early line 2:*
> Current: *"Three stars. Physics-primary. Efficient. Direct. The discipline is
> working."*
>
> DRAFT — *"Three stars. Physics-primary. Clean. Deliberate. The discipline is
> working."*

*2A Three Stars, Mid line 1:*
> Current: *"Three stars. Physics-primary. The path was clean and the piece
> count was optimal. A Drive Engineer should solve it this way. This one did."*
>
> DRAFT — *"Three stars. Physics-primary. The path was clean and nothing in it
> was accidental. A Drive Engineer should solve it this way. This one did."*

*2A Three Stars, Late:*
> Current: *"…The efficiency metrics on this one are worth keeping on record.
> Not because they are exceptional. Because they are consistent…"*
>
> DRAFT — *"Three stars. Physics-primary. The routing on this one is worth
> keeping on record. Not because it is exceptional. Because it is consistent.
> Consistency at this level is its own kind of exceptional."*

*2A hub follow-up:*
> Current: *"The routing efficiency on the last level was as clean as anything I
> have logged from a Drive Engineer. The piece count matched optimal within one.
> I do not often get to write that in the log."*
>
> DRAFT — *"The routing on the last level was as clean as anything I have
> logged from a Drive Engineer. Every turn in the path was there for a reason. I
> do not often get to write that in the log."*

*2A Two Stars, Early:*
> Current: *"Two stars. Physics-primary. The routing was sound. The optimization
> was not complete. One fewer piece would have changed the rating."*
>
> DRAFT — *"Two stars. Physics-primary. The routing was sound. It was not fully
> resolved. One placement in the path was doing nothing the others were not."*

*2A Two Stars, Mid:*
> Current: *"Two stars. The path was functional. It was not the most direct path
> available. A Drive Engineer finds the most direct path. This was the second
> most direct."*
>
> DRAFT — *"Two stars. The path was functional. It was not the cleanest path
> available. A Drive Engineer finds the line where every piece is load-bearing.
> This was close to it."*

*2A Two Stars, Late:*
> Current: *"…The efficiency the discipline is built for was partially applied…"*
>
> DRAFT — *"Two stars. Physics-primary. The routing discipline was partially
> applied. I have seen this Engineer do better. So have they."*

*2A One Star, Early:*
> Current: *"One star. The Physics pieces were used but the routing was
> indirect. More pieces than the path required. The Drive Engineer discipline is
> about finding the efficient line. This was not the efficient line."*
>
> DRAFT — *"One star. The Physics pieces were used but the routing wandered.
> Placements that did not advance the signal. The Drive Engineer discipline is
> about finding the line where every piece earns its place. This was not that
> line."*

*2A One Star, Mid:* unchanged — *"…The pieces were right. The placement was
not."* Reads correctly under v2.

*2A Void, Mid:*
> Current: *"Void. A Drive Engineer with a void efficiency rating. The
> discipline exists to prevent exactly this outcome. It did not prevent it."*
>
> DRAFT — *"Void. A Drive Engineer with a void routing result. The discipline
> exists to prevent exactly this outcome. It did not prevent it."*

*2C Three Stars, Mid:*
> Current: *"…The efficiency metrics are solid. The approach is not what the
> discipline was built for…"*
>
> DRAFT — *"Three stars. Mixed. A Drive Engineer blending Physics routing with
> Protocol configuration. The routing holds. The approach is not what the
> discipline was built for. The stars suggest the Engineer has built something
> else."*

*2C One Star, Early:*
> Current: *"One star. Mixed methodology, one-star result. The Physics routing
> was diluted by Protocol placement that was not necessary for the solution. The
> path was longer than it needed to be."*
>
> DRAFT — *"One star. Mixed methodology, one-star result. The Physics routing
> was interrupted by Protocol placement that did not do anything the routing
> needed. The two halves were not working toward the same thing."*

*2C One Star, Mid:*
> Current: *"…The Drive Engineer's strength is in committing to the efficient
> line. This solution did not commit."*
>
> DRAFT — *"One star. Mixed. Neither piece type was used to its potential. The
> Drive Engineer's strength is in committing to a line and making every piece
> serve it. This solution did not commit."*

*2B Two Stars, Mid* — *"The Drive Engineer's discount is on Physics pieces.
That discount went unused."* Unchanged, and worth flagging as **now more
accurate**, not less: under v2's Investment scoring, an unused discount is a
real forfeited advantage.

---

## Part 4 — Section One, Systems Architect

**No changes required.** §1 evaluates Protocol engagement and configuration
integrity, neither of which v2 touches. Its two uses of "efficiency" —
*"Protocol efficiency at maximum"* and *"the signal path lost efficiency"* —
describe chain integrity, not piece economy, and fall under rule 2 as plain
characterization.

One line to watch rather than change: §1B Void Early, *"that is a specific
kind of inefficiency."* It reads as a judgment about using wrong tools, which
survives. Flagging it only so it is a decision and not an oversight.

---

## Part 5 — Sections Four and Five

**No changes required.** Special cases score on attempts, first-try
completion, personal bests and boss thresholds. Arc lines score on totals.
Neither family references piece economy.

---

## Summary of the pass

| Area | Lines changed |
|---|---|
| Usage note, discipline definition | 1 |
| §3 preamble, headings, section notes | 6 |
| §3A | 13 |
| §3B | 11 |
| §3C | 12 |
| §2 Drive Engineer | 13 |
| §1, §4, §5 | 0 |
| **Total** | **56** |

**Void lines — CONFIRMED 2026-09-10.** The void `resultsLine` matrix approved
under DEC-3 stands as authored everywhere it does not name piece count. The
four §3 void lines that explicitly cite optimal count are rewritten above, as
ratified. DEC-3's approval and this rewrite are consistent: DEC-3 approved the
matrix's structure and voice, DEC-1 removed the metric four of its lines
happened to name.

Also not touched: any score value, threshold, or star boundary. DEC-1
accepted all six of v2's open questions as proposed and this document changes
none of them.
