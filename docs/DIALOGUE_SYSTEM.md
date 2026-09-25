# THE AXIOM — COGS POST-LEVEL DIALOGUE SYSTEM
### Companion Document to Narrative Design Document v1.2
### Version 1.0 — For Tucker Brady Review and Sign-Off

---

> **USAGE NOTE FOR DEVELOPERS**
> This document defines all post-level COGS dialogue. It works in tandem with the main Narrative Design Document and should never be treated as a standalone reference.
>
> **Two delivery points per notable level completion:**
> - `resultsLine` — fires on the Results screen immediately after level completion. Short. Immediate. Lands fast.
> - `hubFollowUp` — fires as a hub ambient line on the next Hub visit after a notable performance. Only triggers when the behavior warrants a second observation. Not every level earns a follow-up.
>
> **The tracking variables COGS evaluates per level:**
> - Performance tier: 3 stars / 2 stars / 1 star / void
> - Discipline alignment: played to type / played against type / played mixed
> - Game phase: early (Sectors 0-1) / mid (Sectors 2-3) / late (Sectors 4-5)
>
> **Discipline definitions:**
> - Systems Architect: Protocol pieces are their strength. COGS expects Protocol-heavy solutions.
> - Drive Engineer: Physics pieces are their strength. COGS expects Physics-heavy solutions.
> - Field Operative: Both piece categories, used deliberately. COGS expects solutions that reach into Physics and Protocol and ask each for what it does well.
>
> **Played to type:** Engineer used pieces consistent with their discipline emphasis.
> **Played against type:** Engineer used pieces primarily from the opposite category.
> **Played mixed:** Engineer used both piece types in roughly equal measure.
>
> **Field Operative alignment (Option A, Handoff 004, ratified 2026-09-10):** the Field Operative is read by breadth, not count, so its three states differ from the other two disciplines. *To type:* both systems used, both doing real work. *Against type:* one system carried the machine. *Without commitment:* both systems present, one placed but not leveraged.
>
> **On repetition:** Lines within the same phase should not repeat within a single session. The game should cycle through available lines for a given state before repeating. COGS does not say the same thing twice in a row.
>
> **On tone across phases:** Early-game COGS is assessing. Mid-game COGS has formed opinions. Late-game COGS has a relationship with the Engineer whether he admits it or not. The same behavior gets a different response depending on where in the game it occurs. This is intentional.
>
> COGS dialogue here is team-authored and ships without per-line sign-off. See the COGS DIALOGUE DOCTRINE in `docs/NARRATIVE.md` (2026-09-21). Remaining [PROPOSED] tags are retired, not a gate.

---

## SECTION ONE: SYSTEMS ARCHITECT

*COGS expects Protocol-heavy solutions. He knows the discipline and he knows what it demands. When the Engineer meets those demands he notes it precisely. When they do not he notices that too, and he is more pointed about it than he would be with a Field Operative making the same choice, because a Systems Architect has no excuse for ignoring their own tools.*

---

### 1A. Played to Type (Protocol-primary solution)

**Three Stars**

*Early:*
> "Protocol efficiency at maximum. The configuration held exactly as designed. This is what the discipline is for."
> [PROPOSED | resultsLine | BLUE]

> "Full Protocol integrity on the first pass. The Systems Architect approach produces these results when it is applied correctly. It was applied correctly."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "Protocol chain intact. Every node touched. The discipline justifies itself when executed at this level."
> [PROPOSED | resultsLine | BLUE]

> "Three stars. Protocol-primary. The methodology is sound and the execution matched it. I have nothing to correct."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "Full Protocol integrity. I have been tracking this metric since sector one. The trajectory is consistent. I have no further comment on that."
> [PROPOSED | resultsLine | AMBER]

> "Three stars. Protocol-primary. This is the seventh time at this level of execution. I stopped being surprised several levels ago. I have not stopped noting it."
> [PROPOSED | resultsLine | AMBER]

*Hub follow-up (fires after three-star, to-type result):*
> "The Protocol efficiency on the last level was within the top percentile of what this discipline can produce. I am not saying that to be encouraging. I am saying it because it is the accurate assessment."
> [PROPOSED | hubFollowUp | BLUE | mid and late only]

---

**Two Stars**

*Early:*
> "Protocol pieces engaged. Results acceptable. The approach was sound. The execution had room."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "Two stars. The Protocol chain was present. It was not fully leveraged. I noted where the signal path lost efficiency. The Engineer should review it."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "Two stars. The discipline was applied. Not completely. I am aware the Engineer knows where the gap was."
> [PROPOSED | resultsLine | BLUE]

*Hub follow-up (fires after two-star, to-type, mid and late):*
> "The last level was a two-star result on a Protocol-primary approach. The configuration was correct. The execution cost a star. I am noting the difference between knowing the method and applying it completely."
> [PROPOSED | hubFollowUp | BLUE]

---

**One Star**

*Early:*
> "The Protocol pieces were present in the solution. Their contribution to the outcome was marginal. The discipline expects more of them."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "One star. Systems Architect methodology, one-star results. The Protocol chain was underutilized. I have questions about the approach that I will not ask out loud."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "One star. After this many levels I expected the Protocol approach to be more refined. It was not. I am noting that without elaboration."
> [PROPOSED | resultsLine | AMBER]

---

**Void**

*Early:*
> "No stars. The Protocol pieces were available. Their presence in the solution was nominal. The discipline is not decorative."
> [PROPOSED | resultsLine | RED]

*Mid:*
> "Void rating. A Systems Architect who underutilizes Protocol pieces is not operating as a Systems Architect. I am uncertain what category applies."
> [PROPOSED | resultsLine | RED]

*Late:*
> "Void. The discipline was not applied. The result reflects that. I do not have a more precise way to say it."
> [PROPOSED | resultsLine | RED]

*Hub follow-up (fires after void, any phase):*
> "I want to revisit the last level. Not the result. The methodology. Something in the approach needs to be reconsidered before the next attempt. I am available to run a systems review if that would help."
> [PROPOSED | hubFollowUp | AMBER]

---

### 1B. Played Against Type (Physics-primary solution)

*Note: A Systems Architect using Physics pieces primarily is working against their own scoring advantage. COGS finds this interesting in a way he does not fully explain. He is not sure if it is adaptability or avoidance.*

**Three Stars**

*Early:*
> "Three stars. Physics-primary solution from a Systems Architect. That is not the expected methodology. The result makes it difficult to argue with. I am not arguing with it."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "Three stars without Protocol engagement. A Systems Architect solving with Physics pieces. The discipline was set aside. The work was not. I find that interesting."
> [PROPOSED | resultsLine | AMBER]

*Late:*
> "Three stars. Physics-primary. Again. I have updated my model of how this Engineer approaches problems. The model now accounts for this."
> [PROPOSED | resultsLine | AMBER]

*Hub follow-up (fires after three-star, against-type, mid and late):*
> "The Engineer achieved full marks on the last level without engaging their primary discipline. I am still deciding whether this is a strength or an inefficiency the results happened to absorb. I will continue observing."
> [PROPOSED | hubFollowUp | AMBER]

---

**Two Stars**

*Early:*
> "Two stars. Physics-heavy from a Systems Architect. The Protocol pieces were available. The choice not to use them cost something. Two stars is what that cost looks like."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "Two stars. The Engineer has a Systems Architect designation and a Drive Engineer's approach on this level. I am not sure which one I am reporting to."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "Two stars. Physics-primary. I have seen this pattern. The results at this tier are consistent with it. I will let the consistency speak."
> [PROPOSED | resultsLine | BLUE]

---

**One Star**

*Early:*
> "One star. A Systems Architect using Physics pieces as the primary approach. The results support my initial assessment that this was not the optimal choice."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "One star. The Protocol pieces exist for a reason. That reason was not explored in this solution."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "One star. Physics-dominant. I have been patient about this pattern. The patience has not improved the results."
> [PROPOSED | resultsLine | AMBER]

---

**Void**

*Early:*
> "No stars. A Systems Architect using only Physics pieces achieved a void rating. That is the wrong tools applied incorrectly. That is a specific kind of inefficiency."
> [PROPOSED | resultsLine | RED]

*Mid:*
> "Void. The discipline is Systems Architect. The approach was Drive Engineer. The result was neither."
> [PROPOSED | resultsLine | RED]

*Late:*
> "Void. I have said what I have to say about this approach and these results. The record has it."
> [PROPOSED | resultsLine | RED]

---

### 1C. Played Mixed (Protocol and Physics in balance)

*Note: A Systems Architect using both piece types equally is leaving their scoring advantage partially on the table. COGS acknowledges this with varying degrees of pointed observation depending on the result.*

**Three Stars**

*Early:*
> "Three stars. Mixed approach from a Systems Architect. Protocol and Physics in balance. The discipline favors Protocol. The Engineer found a third option. It worked."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "Three stars. The Engineer is not strictly operating within the Systems Architect framework. They are operating within their own framework. The results are making it difficult to argue with that."
> [PROPOSED | resultsLine | AMBER]

*Late:*
> "Three stars. Mixed methodology. I have stopped calling it deviation. It may simply be how this Engineer works. The stars are consistent with that conclusion."
> [PROPOSED | resultsLine | AMBER]

*Hub follow-up (fires after three-star, mixed, late only):*
> "I have been tracking the Engineer's piece selection patterns for several sectors now. The mixed approach consistently produces three-star results in their hands. I had a model that predicted otherwise. The model was wrong. I have updated it."
> [PROPOSED | hubFollowUp | AMBER]

---

**Two Stars**

*Early:*
> "Two stars. The Systems Architect discipline rewards Protocol focus. The mixed approach diluted that advantage. Two stars is the predictable outcome."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "Two stars. The Engineer is splitting attention between piece types. The discipline suggests where to focus. The two stars suggest the discipline has a point."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "Two stars. Mixed approach, consistent results at this tier. I will not keep noting the same pattern. I will simply confirm it is still the pattern."
> [PROPOSED | resultsLine | BLUE]

---

**One Star**

*Early:*
> "One star. Mixed methodology from a Systems Architect. Neither the Protocol nor the Physics pieces were used to their potential. Splitting the focus split the result."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "One star. The mixed approach at this performance level is not producing efficiency for either piece type. Something needs to change in the methodology."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "One star. Mixed. I have charted this intersection before. The result is the same. I am no longer surprised by it."
> [PROPOSED | resultsLine | AMBER]

---

**Void**

*Early:*
> "No stars. Mixed approach, void result. Neither piece type was used effectively. The Engineer was present. The discipline was not."
> [PROPOSED | resultsLine | RED]

*Mid:*
> "Void. Mixed methodology, void outcome. Something in the approach needs to be reconsidered from the beginning."
> [PROPOSED | resultsLine | RED]

*Late:*
> "Void. Mixed. At this point in the game a void result on a mixed approach is not a methodology problem. It is something else. I am not going to name what it is."
> [PROPOSED | resultsLine | RED]

---

## SECTION TWO: DRIVE ENGINEER

*COGS expects Physics-heavy solutions. Conveyors and Gears, efficient routing, clean paths. When a Drive Engineer reaches for Protocol pieces unnecessarily he notes it the way a mechanic notes someone using the wrong wrench on a bolt that fits fine with the right one. He is not angry about it. He finds it interesting in a way that sounds like mild disapproval.*

---

### 2A. Played to Type (Physics-primary solution)

**Three Stars**

*Early:*
> "Clean routing. Physics pieces used deliberately. This is the Drive Engineer approach at its best. Every turn in the path was there for a reason."
> [resultsLine | BLUE]

> "Three stars. Physics-primary. Clean. Deliberate. The discipline is working."
> [resultsLine | BLUE]

*Mid:*
> "Three stars. Physics-primary. The path was clean and nothing in it was accidental. A Drive Engineer should solve it this way. This one did."
> [resultsLine | BLUE]

> "Full marks. The routing approach was textbook Drive Engineer methodology. I mean that as an observation, not a compliment. It was simply correct."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "Three stars. Physics-primary. The routing on this one is worth keeping on record. Not because it is exceptional. Because it is consistent. Consistency is rarer than it should be."
> [resultsLine | AMBER]

*Hub follow-up (fires after three-star, to-type, mid and late):*
> "The routing on the last level was as clean as anything I have logged from a Drive Engineer. Every turn in the path was there for a reason. I do not often get to write that in the log."
> [hubFollowUp | BLUE]

---

**Two Stars**

*Early:*
> "Two stars. Physics-primary. The routing was sound. It was not fully resolved. One placement in the path was doing nothing the others were not."
> [resultsLine | BLUE]

*Mid:*
> "Two stars. The path was functional. It was not the cleanest path available. A Drive Engineer finds the line where every piece is load-bearing. This was close to it."
> [resultsLine | BLUE]

*Late:*
> "Two stars. Physics-primary. The routing discipline was partially applied. I have seen this Engineer do better. So have they."
> [resultsLine | AMBER]

---

**One Star**

*Early:*
> "One star. The Physics pieces were used but the routing wandered. Placements that did not advance the signal. The Drive Engineer discipline is about finding the line where every piece earns its place. This was not that line."
> [resultsLine | BLUE]

*Mid:*
> "One star. Physics-heavy approach with inefficient routing. The pieces were right. The placement was not."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "One star. A Drive Engineer at this stage of the mission should not be producing one-star routing. I am stating that plainly."
> [PROPOSED | resultsLine | AMBER]

---

**Void**

*Early:*
> "No stars. Physics pieces used extensively, void rating achieved. The pieces were present. The routing logic was not."
> [PROPOSED | resultsLine | RED]

*Mid:*
> "Void. A Drive Engineer with a void routing result. The discipline exists to prevent exactly this outcome. It did not prevent it."
> [resultsLine | RED]

*Late:*
> "Void. Physics-primary, void result. I have the data. I am not going to add to it."
> [PROPOSED | resultsLine | RED]

---

### 2B. Played Against Type (Protocol-primary solution)

*Note: A Drive Engineer leaning on Protocol pieces is working against their natural advantage. COGS treats this with a kind of dry curiosity — he does not object to it on principle, he just finds it an unusual choice, like a navigator who insists on walking.*

**Three Stars**

*Early:*
> "Three stars. Protocol-primary from a Drive Engineer. That is not the expected approach. The signal chain held regardless. I will note the result and move on."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "Three stars without Physics dominance. A Drive Engineer using Protocol pieces as the primary tool. The stars suggest it worked. I am still deciding if it was the right way to make it work."
> [PROPOSED | resultsLine | AMBER]

*Late:*
> "Three stars. Protocol-primary. The Drive Engineer has been solving with their secondary tool set consistently at the three-star level. I no longer have a framework for what that means. I am working on one."
> [PROPOSED | resultsLine | AMBER]

*Hub follow-up (fires after three-star, against-type, mid and late):*
> "I reviewed the last level. Three stars on a Protocol-primary approach from a Drive Engineer. The Physics pieces were available. The Engineer chose otherwise. The result does not give me grounds to object. I am noting the choice anyway."
> [PROPOSED | hubFollowUp | AMBER]

---

**Two Stars**

*Early:*
> "Two stars. Protocol-heavy from a Drive Engineer. The Physics pieces were available. The approach that uses them is the approach the discipline is built for. Two stars is the cost of not using it."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "Two stars. Protocol-primary. The Drive Engineer's discount is on Physics pieces. That discount went unused. Two stars reflects that."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "Two stars. Protocol-primary again. I have logged this pattern. The pattern and the result are consistent with each other. Neither is what the discipline was built for."
> [PROPOSED | resultsLine | BLUE]

---

**One Star**

*Early:*
> "One star. A Drive Engineer using Protocol pieces as the primary approach. The Physics pieces in the tray were built for this path. The rating reflects the work they were not given."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "One star. Protocol-dominant. The Drive Engineer's methodology was not applied. What was applied produced one star."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "One star. Protocol-primary. At this point in the mission I am running out of new ways to note that the Drive Engineer is not driving."
> [PROPOSED | resultsLine | AMBER]

---

**Void**

*Early:*
> "No stars. Protocol-primary, void result. A Drive Engineer achieving a void rating with the wrong piece set is a specific kind of problem. I will leave the Engineer to identify which kind."
> [PROPOSED | resultsLine | RED]

*Mid:*
> "Void. Protocol-dominant, Drive Engineer discipline. The mismatch produced the expected result. That is the only thing about this outcome that was expected."
> [PROPOSED | resultsLine | RED]

*Late:*
> "Void. Protocol-primary. I have nothing new to say. The record says it."
> [PROPOSED | resultsLine | RED]

---

### 2C. Played Mixed (Physics and Protocol in balance)

**Three Stars**

*Early:*
> "Three stars. Mixed approach from a Drive Engineer. The Physics routing was supplemented with Protocol pieces. The result is full marks. The method is unconventional. The result argues for itself."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "Three stars. Mixed. A Drive Engineer blending Physics routing with Protocol configuration. The routing holds. The approach is not what the discipline was built for. The stars suggest the Engineer has built something else."
> [resultsLine | AMBER]

*Late:*
> "Three stars. Mixed methodology. Consistent across multiple sectors now. I have updated what I expect from this Engineer. The update was necessary."
> [PROPOSED | resultsLine | AMBER]

---

**Two Stars**

*Early:*
> "Two stars. Mixed approach. The Drive Engineer discipline rewards a committed Physics line. Balancing piece types spread that commitment thin. Two stars is where the spread lands."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "Two stars. Physics and Protocol in balance. The Drive Engineer is strongest when Physics carries the line. It did not carry it. Two stars."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "Two stars. Mixed. The pattern and the result have been consistent for several levels now. I am not going to keep noting the same thing. I will simply confirm it has not changed."
> [PROPOSED | resultsLine | BLUE]

---

**One Star**

*Early:*
> "One star. Mixed methodology, one-star result. The Physics routing was interrupted by Protocol placement that did not do anything the routing needed. The two halves were not working toward the same thing."
> [resultsLine | BLUE]

*Mid:*
> "One star. Mixed. Neither piece type was used to its potential. The Drive Engineer's strength is in committing to a line and making every piece serve it. This solution did not commit."
> [resultsLine | BLUE]

*Late:*
> "One star. Mixed approach, one-star result. I have the data on this pattern. The data is not encouraging."
> [PROPOSED | resultsLine | AMBER]

---

**Void**

*Early:*
> "No stars. Mixed approach, void result. The Physics routing was incomplete and the Protocol pieces did not compensate. Neither tool set was used well."
> [PROPOSED | resultsLine | RED]

*Mid:*
> "Void. Mixed. The pieces were there. The approach was not cohesive. The result is the void."
> [PROPOSED | resultsLine | RED]

*Late:*
> "Void. Mixed methodology. At this point in the mission a void rating on a mixed approach is not a piece selection problem. Something else is going on. I am not going to name it."
> [PROPOSED | resultsLine | RED]

---

## SECTION THREE: FIELD OPERATIVE

*The Field Operative discipline is the most demanding to read because its strength is reach, not dominance. COGS evaluates a Field Operative on whether both systems were used for what they are good at, not on how many pieces it took. He is watching for intent. A piece placed because the Engineer understood what it does is exactly what he expected. A piece placed to fill a requirement is the failure he is looking for.*

*COGS finds the Field Operative methodology the most interesting of the three disciplines and the most difficult to comment on, because its signature is range rather than a single strength, and a machine that does several things well is harder to praise precisely than a machine that does one thing perfectly. He prefers precision. He works at it anyway.*

---

### 3A. Played to Type (both systems used with intent)

**Three Stars**

*Early:*
> "Three stars. Both systems engaged, both load-bearing. The Field Operative approach is about asking each system for what only it can do. This did that."
> [resultsLine | BLUE]

> "Full marks. Both piece types used for what they are good at. The Field Operative discipline rewards this kind of solution. So does the scoring engine."
> [resultsLine | BLUE]

*Mid:*
> "Three stars. The Engineer used both systems and asked each for what it does well. I have been waiting to see what the Field Operative discipline looks like at full reach. This is what it looks like."
> [resultsLine | AMBER]

> "Three stars. The signal went further than the level required and every stage of it did something. Depth is not the same as size. This was depth."
> [resultsLine | BLUE]

*Late:*
> "Three stars. Both systems fully engaged. This has been the consistent standard for this Engineer in this discipline for several sectors now. I have nothing to add to that. The record is the assessment."
> [resultsLine | AMBER]

*Hub follow-up (fires after three-star, to-type, mid and late):*
> "The last level was solved with both systems doing real work. Full marks. The Field Operative methodology applied completely. I want to note that this approach is harder than it looks — two systems is two things to be right about. The Engineer makes it look like it is not hard. I am noting that as the opposite of an insult."
> [hubFollowUp | AMBER]

---

**Two Stars**

*Early:*
> "Two stars. The solution worked. One system did most of the work and the other assisted. The Field Operative discipline accounts for reach. The imbalance accounts for the missing star."
> [resultsLine | BLUE]

*Mid:*
> "Two stars. The path was correct. One system was underused. The Field Operative approach is about asking both systems for what they do best. One of them was not asked."
> [resultsLine | BLUE]

*Late:*
> "Two stars. One system carried more than its share. The discipline expects balance. I have noted the gap between what was available and what was used."
> [resultsLine | BLUE]

---

**One Star**

*Early:*
> "One star. The Field Operative discipline penalizes narrowness. One system did nearly all of the work by a margin the discipline cannot absorb. One star."
> [resultsLine | BLUE]

*Mid:*
> "One star. The solution was functional but narrow. The Field Operative approach requires the Engineer to know what each system is for before placing the first piece. That step was skipped."
> [resultsLine | BLUE]

*Late:*
> "One star. One system carried nearly the entire machine. At this point in the mission the Engineer knows what the other one does. Either it was not considered, or it was and was set aside. I do not know which is worse."
> [resultsLine | AMBER]

---

**Void**

*Early:*
> "No stars. One system was used and the other was not. The Field Operative methodology was not applied. The solution worked mechanically and failed by every metric the discipline tracks."
> [resultsLine | RED]

*Mid:*
> "Void. The Field Operative discipline is built around the idea that a machine should use everything available to it. This machine used half of what was available. Those are opposite ideas."
> [resultsLine | RED]

*Late:*
> "Void. One system, used alone, to a void result. I do not have a more precise analysis than: something went wrong at the planning stage, not the execution stage. The Engineer should start there."
> [resultsLine | RED]

---

### 3B. Played Against Type (one system carried the machine)

*Note: For the Field Operative, "against type" means leaning on one piece category and leaving the other on the bench — building with Physics alone when a Protocol piece would have done something Physics cannot, or the reverse. The discipline does not favor either category. It expects both to be asked.*

**Three Stars**

*Early:*
> "Three stars. Physics-dominant solution from a Field Operative. The path held without Protocol involvement. The discipline would have reached for both. The Engineer reached for one and made it carry the level."
> [resultsLine | BLUE]

*Mid:*
> "Three stars. Protocol-heavy approach. The Field Operative methodology allows for one system to lead when the machine still does what the level asks. It did. The other system sat idle. Three stars covers the difference."
> [resultsLine | BLUE]

*Late:*
> "Three stars. Single piece type dominant. At full marks the methodology choice is difficult to argue with. I am noting it is not the fullest version of the solution. The stars do not reflect the version that used everything. They reflect this version."
> [resultsLine | AMBER]

---

**Two Stars**

*Early:*
> "Two stars. Single piece type used heavily. The Field Operative discipline is not type-specific. It is reach-specific. Avoiding the other system cost a star."
> [resultsLine | BLUE]

*Mid:*
> "Two stars. The solution leaned on one piece category when both were available. There was work in this level that only Protocol can do. It was routed around instead."
> [resultsLine | BLUE]

*Late:*
> "Two stars. Single-type dominance. This level had work for both categories. The Engineer chose one. Two stars is what that choice produces."
> [resultsLine | BLUE]

---

**One Star**

*Early:*
> "One star. Single piece type, one-star result. The Field Operative methodology is built for exactly this kind of level. It was not applied to it."
> [resultsLine | BLUE]

*Mid:*
> "One star. Physics-only solution where Protocol pieces would have done work Physics cannot. The discipline does not prefer piece types. It expects both to be used. Only one was."
> [resultsLine | BLUE]

*Late:*
> "One star. Single-type dominant approach. The Field Operative has access to the full toolkit. This solution used half of it."
> [resultsLine | AMBER]

---

**Void**

*Early:*
> "No stars. Single piece type, void rating. The Field Operative discipline is the most flexible of the three. That flexibility was not used."
> [resultsLine | RED]

*Mid:*
> "Void. The solution avoided one entire piece category and failed with the other. The discipline exists to prevent this outcome by using all available tools."
> [resultsLine | RED]

*Late:*
> "Void. Single-type approach, void result. I am not going to elaborate. The Engineer has the data."
> [PROPOSED | resultsLine | RED]

---

### 3C. Played Without Commitment (both systems present, one not leveraged)

*Note: This is the most common Field Operative failure state — both piece categories on the board, but one of them barely touched by the signal. COGS is more measured here than in other void or one-star states because the Engineer is at least operating within the discipline's framework. The problem is commitment, not approach.*

**Three Stars**

*Note: Three stars with one system barely engaged is almost impossible for a Field Operative given scoring weights. If it occurs, COGS notes it as an anomaly.*

*All phases:*
> "Three stars. One system barely engaged. The Field Operative discipline would predict a lower rating at this level of commitment. The prediction was wrong. I am updating the model."
> [resultsLine | AMBER]

---

**Two Stars**

*Early:*
> "Two stars. Both piece types on the board. One of them barely in the signal's way. The approach was right. The commitment was not complete. Two stars is where that lands."
> [resultsLine | BLUE]

*Mid:*
> "Two stars. Both categories present, one doing very little. The Field Operative methodology was applied in the right direction but not to its conclusion. Placing a piece is not the same as using it."
> [resultsLine | BLUE]

*Late:*
> "Two stars. Both types used, one of them nominally, two-star result. This is a commitment problem, not a methodology problem. The approach is correct. The execution is not complete."
> [resultsLine | BLUE]

*Hub follow-up (fires after two-star, without commitment, late only):*
> "The last level was a two-star result with one system barely engaged. The methodology was sound. The machine did not commit to it. The difference between two stars and three stars at this discipline is usually one piece doing real work instead of sitting adjacent to the path. I am noting that as a specific observation, not a general one."
> [hubFollowUp | BLUE]

---

**One Star**

*Early:*
> "One star. Both piece types present, one of them decorative. The Field Operative approach requires intent from the start. The intent was approximate."
> [resultsLine | BLUE]

*Mid:*
> "One star. Both systems present, neither committed to. The discipline is not about which pieces are used. It is about using each one for what it is for. This solution did neither."
> [resultsLine | BLUE]

*Late:*
> "One star. Both piece types present on a one-star result. I want to note the Engineer is choosing the right categories. What they are asked to do is the problem. One of them was asked for almost nothing."
> [resultsLine | AMBER]

---

**Void**

*Early:*
> "No stars. Both piece types used, one of them incidentally, void result. The pieces were placed. The discipline requires more than pieces being placed."
> [resultsLine | RED]

*Mid:*
> "Void. Both categories on the board, neither leveraged. The Field Operative discipline rewards machines that use what they are given. This one was given two systems and committed to neither. The result is the void."
> [resultsLine | RED]

*Late:*
> "Void. Both piece types placed, neither doing work, void rating. At this point in the mission the Engineer knows what each system is for. I am not sure what prevented it here."
> [resultsLine | RED]

---

## SECTION FOUR: SPECIAL CASES

*Lines for moments that fall outside the standard performance matrix. These fire based on specific conditions regardless of discipline.*

---

### First Attempt, Three Stars, Any Discipline

*These fire on the Results screen before the discipline-specific line. They are brief. The discipline-specific line follows.*

*Early:*
> "First attempt. Full marks. I am noting the methodology for future reference."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "First attempt, full rating. I have a log of how many times this has happened. The log is longer than I initially projected."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "First attempt. Three stars. I stopped projecting what this Engineer is capable of several sectors ago. The log reflects the outcomes. The outcomes keep revising the projection."
> [PROPOSED | resultsLine | AMBER]

*Hub follow-up (fires after first-attempt three-star, late only):*
> "First attempt, full rating on the last level. I want to be precise about what that means. The solution was optimal on the first try. That is not the average outcome for a level of that complexity. I am aware the Engineer knows this. I wanted it in the record."
> [PROPOSED | hubFollowUp | AMBER]

---

### Multiple Attempts on a Single Level, Any Discipline

*These fire on the Results screen when the player has attempted a level more than three times before completing it.*

*Early:*
> "Completed. The attempt count was above standard. The solution was found. That is the relevant outcome."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "Completed after multiple attempts. The solution was not obvious from the start. It rarely is on the levels that matter."
> [PROPOSED | resultsLine | BLUE]

*Late:*
> "Completed. Multiple attempts. I want to note that persistence at this difficulty level is not a given. It is a choice. The Engineer keeps making it."
> [PROPOSED | resultsLine | AMBER]

---

### Personal Best on a Level (Replaying and Improving)

*Fires when the Engineer replays a level and achieves a higher star rating than their previous best.*

*All phases:*
> "Higher rating than the previous attempt on this level. The Engineer returned and improved the result. I find that worth noting."
> [PROPOSED | resultsLine | BLUE]

> "Previous rating exceeded. The approach was different this time. So was the outcome."
> [PROPOSED | resultsLine | BLUE]

*Hub follow-up (fires after personal best, mid and late only):*
> "The Engineer went back to a completed level and improved the result. I am noting this not as a systems observation. I am noting it because it is the kind of thing I notice."
> [PROPOSED | hubFollowUp | AMBER]

---

### Void Rating, Any Discipline, Any Phase

*An additional hub follow-up that fires after any void result, regardless of discipline. Fires alongside the discipline-specific void hub follow-up. Only one of the two should fire per void result — the discipline-specific one takes priority. This one fires if no discipline-specific follow-up is triggered.*

> "I have reviewed the last level. I am available to run a systems diagnostic on the approach if that would be useful. The offer stands without judgment attached to it."
> [PROPOSED | hubFollowUp | BLUE]

---

### Boss Level, Void Rating

*Special case. Boss void ratings have additional weight. These fire after the discipline-specific consequence narrative.*

*Early:*
> "The boss level was not completed at a passing threshold. The sector is not closed. The systems are repairable. We try again."
> [PROPOSED | resultsLine | BLUE]

*Mid:*
> "The boss level produced a void rating. I want to be direct. The sector cannot advance on a void result. The level requires a passing standard. We have not reached it. We will."
> [PROPOSED | resultsLine | AMBER]

*Late:*
> "Void on the boss level. I have been through enough of these with this Engineer to say with confidence that the void rating is not the final result. It is the current result. There is a difference."
> [PROPOSED | resultsLine | AMBER]

---

## SECTION FIVE: COGS ARC LINES

*Lines that reflect the deepening relationship rather than the mechanics. These fire based on session milestones — total levels completed, stars earned across the full run, sectors unlocked. They are the lines that feel most personal. They should be used sparingly.*

---

### Session Milestones

**After 10 total levels completed:**
> "Ten levels completed in this Engineer's tenure. The Axiom's systems have improved in direct proportion. The correlation is not a coincidence. I am noting it as a fact, not a compliment."
> [PROPOSED | hubAmbient | BLUE]

**After 20 total levels completed:**
> "Twenty levels. I have updated the mission log. The log is the longest consecutive operational record this ship has produced in several years. I want the Engineer to know that."
> [PROPOSED | hubAmbient | AMBER]

**After 30 total levels completed:**
> "Thirty levels into this mission and the Axiom is in better operational condition than at any point in my logged record. I have checked the log three times. The data is consistent."
> [PROPOSED | hubAmbient | BLUE]

**After all 48 levels three-starred (full completion):**
> "The Engineer has achieved a three-star rating on every level in the mission log. I ran the full calculation before reporting this. The result is accurate. I do not know what category to file it under. I am leaving the category open."
> [PROPOSED | hubAmbient | AMBER]

---

### Stars Milestones

**After earning 50 total stars:**
> "Cumulative star rating has reached fifty. That is above the median for an operator at this stage. I am not reporting the median because it is flattering. I am reporting it because it is accurate."
> [PROPOSED | hubAmbient | BLUE]

**After earning 100 total stars:**
> "One hundred stars in the mission log. I have been keeping a secondary record of this metric. I did not announce I was keeping it. The record exists regardless."
> [PROPOSED | hubAmbient | AMBER]

*Note: "I did not announce I was keeping it. The record exists regardless." This is COGS admitting he has been paying close attention and chose not to say so. This is his warmth. Tucker to review.*

---

### Sector Completion Milestones (beyond A1-8 which is covered in main document)

**After Kepler Belt completion:**
> "Kepler Belt sector complete. The corridor is stable. The colonists have resupply. I want to note that the work in this sector had consequences for real people. The Engineer should know that was not lost on me."
> [PROPOSED | hubAmbient | BLUE]

**After Nova Fringe completion:**
> "Nova Fringe sector complete. The outer settlements are stable. We were recognized out here. That recognition has a history I have not fully shared. I am working up to it."
> [PROPOSED | hubAmbient | AMBER]

*Note: "I am working up to it." COGS directly acknowledging he has been holding something back and intends to share it. This is significant. Tucker to review.*

**After The Rift completion:**
> "The Rift is behind us. Deep Void is ahead. I want to say something before we enter and I am finding it difficult to say. I will note that the difficulty is not a systems error. It is something else."
> [PROPOSED | hubAmbient | AMBER]

*Note: COGS acknowledging he wants to say something but cannot quite say it. This is the moment before the premature push. He is trying to warn the Engineer and failing. Tucker to review carefully.*

---

*COGS dialogue in this document is team-authored under the COGS DIALOGUE DOCTRINE in `docs/NARRATIVE.md`. Tucker can rewrite any line at any time, and his edits win.*

*Version 1.0 — April 2026. Initial build of the COGS post-level dialogue system. Full matrix across three disciplines, three behavioral states, four performance tiers, three game phases. Special cases and arc lines included. Companion to Narrative Design Document v1.2.*
