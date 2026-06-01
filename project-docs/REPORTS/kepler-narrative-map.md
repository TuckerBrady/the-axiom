# KEPLER BELT — NARRATIVE MAP (K1-1 through K1-10)

### Narrative Mapper Report | Kepler Belt Sector Rebuild
### Source of truth: docs/NARRATIVE.md (v1.3), docs/DIALOGUE_SYSTEM.md (v1.0)
### Status: ALL DIALOGUE PROPOSED — Tucker Brady sign-off required before any line enters the codebase

---

> SCOPE NOTE
> This is a read-only narrative mapping pass. Every COGS line below is flagged PROPOSED.
> The Engineer is "The Engineer" in UI copy; COGS speech may address "you" (the carveout).
> The Engineer's chosen name is NOT used anywhere in Kepler — it is reserved for the post-Deep-Void integration beat.
> No emojis. No "good job." "Acceptable" is COGS's ceiling for casual praise.
>
> SOURCING: Where a cogsLine already exists in NARRATIVE.md Part Six, it is carried over verbatim and cited.
> Eye states, narrativeFrames, post-level discipline dialogue, codex entries, and consequence-level
> warnings/effects are NEW mappings proposed here, consistent with the existing source.

---

## SECTOR-LEVEL CONTEXT (from NARRATIVE.md Part Four, Sector 1)

- Narrative Arc: "The first real work. Stakes become human." Kepler Belt introduces consequences. The colonists depend on infrastructure the Engineer is fixing. COGS frames human stakes as operational parameters; the player closes the gap.
- COGS arc here: more engaged, not more encouraging, more present. He is watching how the Engineer handles work that has weight.
- Game phase per DIALOGUE_SYSTEM: Kepler Belt = early-game (Sectors 0-1). Early-game COGS is assessing.
- Breadcrumb (NARRATIVE.md Part Three, Sector 1): the Axiom has transited Kepler Belt before — residual route marker, no mission data. Surfaces post-boss as `hubAmbient` BLUE (existing, carried below).
- Consequence levels flagged for cogsWarning + failureEffect: K1-4, K1-8, K1-10. (Note: only K1-10 is the formal boss with an existing `consequenceNarrative`. K1-4 and K1-8 are mid-sector consequence beats; warnings/effects below are NEW PROPOSED, scaled below boss weight.)

---

## K1-1 — Corridor Entry

- narrativeFrame: Arrival at a former mining corridor the Axiom has, per the charts, transited before. The first work outside the home ship.
- cogsLine (EXISTING, NARRATIVE.md L586): "Kepler Belt. Former mining corridor, mostly decommissioned. Some salvage activity remains. We have been here before. The charts confirm it."
  - [PROPOSED | cogsLine | BLUE]
- eyeState (intro beat): BLUE. Operational. "We have been here before" is delivered flat — the breadcrumb lands without COGS flagging it. No per-step change.
- Post-level discipline dialogue (early phase, resultsLine):
  - SUCCESS (to-type, 3 stars — sample across disciplines):
    - Systems Architect: "Protocol efficiency at maximum. The configuration held exactly as designed. This is what the discipline is for." [PROPOSED | resultsLine | BLUE] (DIALOGUE_SYSTEM L48)
    - Drive Engineer: "Three stars. Physics-primary. Efficient. Direct. The discipline is working." [PROPOSED | resultsLine | BLUE] (DIALOGUE_SYSTEM L288)
    - Field Operative: "Three stars. Piece count within one of optimal. The Field Operative approach is about finding the minimum path that does the maximum work. This was that." [PROPOSED | resultsLine | BLUE] (DIALOGUE_SYSTEM L506)
  - FAILURE (void, early — sample): "No stars. The pieces were present. The routing logic was not. Kepler Belt is the first corridor where the work has weight. The corridor is repairable. We try again." [PROPOSED | resultsLine | RED]
    - (Built on the Boss-void early special case L788 framing "The systems are repairable. We try again" adapted for a non-boss level; discipline-specific void line from L342 also applies.)
- Codex unlocked:
  - PROPOSED codex: CDX-KEPLER-CORRIDOR (sector primer — "Kepler Belt: former mining corridor, decommissioned, salvage and disputed claims"). Cite NARRATIVE.md L26 worldbuilding.
  - PROPOSED codex: CDX-PRIOR-TRANSIT (locked stub; "Residual route marker. No mission data." Fully revealed by the post-boss hub ambient at K1-10). Cite NARRATIVE.md L133-137.

---

## K1-2 — Relay Splice

- narrativeFrame: A primary relay chain that has outlasted the people who maintained it — the corridor's default condition.
- cogsLine (EXISTING, L590): "The primary relay chain out here was built to last. It has lasted past the people responsible for maintaining it. That is a common condition in this corridor."
  - [PROPOSED | cogsLine | BLUE]
- eyeState (intro beat): BLUE. No per-step change.
- Post-level discipline dialogue (early, resultsLine):
  - SUCCESS (to-type, 2 stars — sample):
    - Drive Engineer: "Two stars. Physics-primary. The routing was sound. The optimization was not complete. One fewer piece would have changed the rating." [PROPOSED | resultsLine | BLUE] (L310)
  - FAILURE (1 star, against type — Systems Architect sample): "One star. The Protocol pieces were present in the solution. Their contribution to the outcome was marginal. The discipline expects more of them." [PROPOSED | resultsLine | BLUE] (L96)
- Codex unlocked:
  - PROPOSED codex piece-context: CDX-RELAY (Relay piece, if introduced/reinforced here per Level Design retrofit). Cite docs/PIECE_CREATION_STANDARD.md for required fields; defer to existing Relay codex if one exists.

---

## K1-3 — Junction 7

- narrativeFrame: A routing bottleneck where eleven settlements feed through one underbuilt point. The original engineers underestimated the load.
- cogsLine (EXISTING, L594): "Junction 7 is a routing bottleneck. Eleven settlements feed through this point. The original engineers underestimated the load. It is not the last time that has happened out here."
  - [PROPOSED | cogsLine | BLUE]
- eyeState (intro beat): BLUE. No per-step change.
- Post-level discipline dialogue (early, resultsLine):
  - SUCCESS (mixed, 3 stars — Drive Engineer sample): "Three stars. Mixed approach from a Drive Engineer. The Physics routing was supplemented with Protocol pieces. The result is full marks. The method is unconventional. The result argues for itself." [PROPOSED | resultsLine | BLUE] (L432)
  - FAILURE (void, mixed — early sample): "No stars. Mixed approach, void result. Neither piece type was used effectively. The Engineer was present. The discipline was not." [PROPOSED | resultsLine | RED] (L260)
- Codex unlocked:
  - PROPOSED codex: CDX-JUNCTION (Junction piece — multi-input routing; if introduced here). Defer to existing Junction codex if present. Cite piece category Physics (NARRATIVE/CLAUDE Physics list).

---

## K1-4 — Mining Platform Alpha  [CONSEQUENCE LEVEL]

- narrativeFrame: A platform decommissioned six years ago, repurposed by colonists as a signal relay it was never built for — and still doing the job.
- cogsLine (EXISTING, L598): "Mining Platform Alpha has been decommissioned for six years. The colonists use it as a signal relay. It was not designed for this purpose. It is doing the job anyway."
  - [PROPOSED | cogsLine | BLUE]
- eyeState (intro beat): BLUE. PROPOSED per-step change: shift to AMBER at the moment the colonist-dependency reveal would surface in-level (engagement — COGS is more present where the work has weight, per Sector 1 arc, L251). Returns to BLUE on completion.
- cogsWarning (PRE-LEVEL, NEW PROPOSED): "Mining Platform Alpha is carrying more than it was built to carry. If the relay drops, it does not fail quietly. The colonists routing through it lose their signal path before they know it is gone. I am stating the stakes once. Proceed."
  - [PROPOSED | cogsWarning | AMBER | K1-4]
- failureEffect (IN-UNIVERSE CONSEQUENCE, NEW PROPOSED — scaled below boss weight): "The platform relay dropped. Four settlements on the Alpha branch lost signal routing for the duration. They reverted to manual relay, the way they did before this ship arrived. No casualties logged. I am logging the interruption. They will have noticed it." [PROPOSED | failureEffect | AMBER | K1-4]
  - Voice check: facts, not blame. "They will have noticed it" lands the human stakes without COGS editorializing. Consistent with Sector 1 consequence framing (L254-258).
- Post-level discipline dialogue (early, resultsLine):
  - SUCCESS (to-type, 3 stars — Field Operative sample): "Full marks. Efficient use of both piece types. No redundancy. The Field Operative discipline rewards this kind of solution. So does the scoring engine." [PROPOSED | resultsLine | BLUE] (L510)
  - FAILURE (void, to-type — Drive Engineer sample): "No stars. Physics pieces used extensively, void rating achieved. The pieces were present. The routing logic was not." [PROPOSED | resultsLine | RED] (L342)
    - hubFollowUp (void, any phase, fires if no discipline-specific void follow-up): "I have reviewed the last level. I am available to run a systems diagnostic on the approach if that would be useful. The offer stands without judgment attached to it." [PROPOSED | hubFollowUp | BLUE] (L778)
- Codex unlocked:
  - PROPOSED codex: CDX-PLATFORM-ALPHA (lore stub — decommissioned mining platform repurposed as relay; colonist improvisation as a recurring Kepler theme).

---

## K1-5 — Resupply Chain

- narrativeFrame: Four degraded relay nodes the colonists have compensated for manually for years, never filing a formal repair request.
- cogsLine (EXISTING, L602): "The resupply chain for this region runs through four independent relay nodes. All four are degraded. The colonists have been compensating manually for at least two years. They have not filed a formal repair request. I find that worth noting."
  - [PROPOSED | cogsLine | BLUE]
- eyeState (intro beat): BLUE. "I find that worth noting" is COGS filing the colonists' self-reliance away — delivered controlled, eyes stay BLUE. No per-step change.
- Post-level discipline dialogue (early, resultsLine):
  - SUCCESS (to-type, 3 stars — Systems Architect alt line): "Full Protocol integrity on the first pass. The Systems Architect approach produces these results when it is applied correctly. It was applied correctly." [PROPOSED | resultsLine | BLUE] (L51)
  - FAILURE (2 stars, against type — Drive Engineer sample): "Two stars. Protocol-heavy from a Drive Engineer. The Physics pieces were available. The approach that uses them is the approach the discipline is built for. Two stars is the cost of not using it." [PROPOSED | resultsLine | BLUE] (L382)
- Codex unlocked:
  - PROPOSED codex: CDX-COLONIST-SELFRELIANCE (lore — the Kepler pattern of colonists compensating manually rather than requesting help; reinforces "stakes become human" arc).

---

## K1-6 — Colonist Hub

- narrativeFrame: A coordination hub for thirty-one settlements running on equipment three cycles overdue for replacement. The people depending on it cannot wait for better.
- cogsLine (EXISTING, L606): "The Colonist Hub coordinates resupply for thirty-one settlements. It is running on equipment that should have been replaced three cycles ago. The people depending on it do not have the option of waiting for something better."
  - [PROPOSED | cogsLine | AMBER]
- eyeState (intro beat): AMBER (existing source marks this line AMBER). This is COGS more present than the situation requires — the human stakes register on him. No per-step change; returns to BLUE on completion if not otherwise triggered.
- Post-level discipline dialogue (early, resultsLine):
  - SUCCESS (mixed, 3 stars — Systems Architect sample): "Three stars. Mixed approach from a Systems Architect. Protocol and Physics in balance. The discipline favors Protocol. The Engineer found a third option. It worked." [PROPOSED | resultsLine | BLUE] (L208)
  - FAILURE (1 star, mixed — early sample): "One star. Mixed methodology from a Systems Architect. Neither the Protocol nor the Physics pieces were used to their potential. Splitting the focus split the result." [PROPOSED | resultsLine | BLUE] (L244)
- Codex unlocked:
  - PROPOSED codex: CDX-COLONIST-HUB (lore — thirty-one settlements, aging infrastructure; the human-stakes peak of the non-boss Kepler levels).

---

## K1-7 — Ore Processing

- narrativeFrame: An ore processing relay still transmitting on its frequency despite no active mining in the corridor. The source is unidentified — and a Chapter Two seed.
- cogsLine (EXISTING, L610): "The ore processing relay is still active. There is no active mining in this corridor. Something is still transmitting on the processing frequency. I have not identified the source. It is not relevant to the current objective."
  - [PROPOSED | cogsLine | AMBER]
- eyeState (intro beat): AMBER (existing source marks AMBER). "It is not relevant to the current objective" is COGS filing something away — engagement beyond the task. No per-step change.
- SAGA NOTE (existing, L613): the unexplained transmission is a flagged Chapter Two seed (NARRATIVE.md Part Ten item 11). Do NOT resolve in Kepler.
- Post-level discipline dialogue (early, resultsLine):
  - SUCCESS (to-type, 2 stars — Systems Architect sample): "Protocol pieces engaged. Results acceptable. The approach was sound. The execution had room." [PROPOSED | resultsLine | BLUE] (L76)
    - (Note: "acceptable" used at ceiling, per voice constraint.)
  - FAILURE (void, against type — Drive Engineer sample): "Void. Protocol-dominant, Drive Engineer discipline. The mismatch produced the expected result. That is the only thing about this outcome that was expected." [PROPOSED | resultsLine | RED] (L418)
- Codex unlocked:
  - PROPOSED codex: CDX-ORE-RELAY-GHOST (locked lore stub — "Transmission source unidentified. Filed." Chapter Two seed; never resolved in Chapter One). Cite NARRATIVE.md L1062.

---

## K1-8 — Transit Gate  [CONSEQUENCE LEVEL]

- narrativeFrame: A traffic-regulation gate never updated since the mining operations closed, routing ghost traffic from ships that no longer exist.
- cogsLine (EXISTING, L616): "The transit gate regulates traffic flow through the entire corridor. It has not been updated since the mining operations closed. It is routing ghost traffic from ships that no longer exist. I find that inefficient and something else I will not specify."
  - [PROPOSED | cogsLine | BLUE]
- eyeState (intro beat): BLUE (existing source marks BLUE). PROPOSED per-step change: a brief flicker to AMBER on the line "something else I will not specify" — the "ghost traffic from ships that no longer exist" lands differently against COGS's 847 days (existing dev note L619). Brief, then back to BLUE. This is a buried beat; do not over-signal it.
- cogsWarning (PRE-LEVEL, NEW PROPOSED): "The transit gate sorts everything moving through this corridor, including traffic that stopped existing years ago. If the routing logic fails, live traffic gets queued behind ghosts. Nothing collides. Everything waits. Hold the routing clean. Proceed."
  - [PROPOSED | cogsWarning | BLUE | K1-8]
- failureEffect (IN-UNIVERSE CONSEQUENCE, NEW PROPOSED — scaled below boss weight): "The gate routing collapsed back to its default table. Live corridor traffic queued behind transit records for ships that no longer exist. The backlog cleared on its own in time. No vessel was lost. The gate kept faithfully directing the dead. I have left that observation in the log without further comment." [PROPOSED | failureEffect | BLUE | K1-8]
  - Voice check: dry, factual, the "directing the dead" image carries the buried 847-days weight without naming it. Consistent with the dev note's restraint (L619). Eyes BLUE — COGS holds control.
- Post-level discipline dialogue (early, resultsLine):
  - SUCCESS (to-type, 3 stars — Drive Engineer alt line): "Clean routing. Physics pieces used efficiently. This is the Drive Engineer approach at its best. The signal path found the shortest distance and took it." [PROPOSED | resultsLine | BLUE] (L284)
  - FAILURE (void, to-type — Field Operative sample): "Void. The Field Operative discipline is built around the idea that the best solution uses the fewest pieces. This solution used the most pieces. Those are opposite ideas." [PROPOSED | resultsLine | RED] (L568)
- Codex unlocked:
  - PROPOSED codex: CDX-TRANSIT-GATE (lore — corridor traffic regulation; ghost-traffic routing as a Kepler decay motif). Subtle thematic rhyme with COGS's waiting, never stated.

---

## K1-9 — The Narrows

- narrativeFrame: The densest, most interference-heavy section of the corridor. Named by colonists for what it does to communication; it has an older name on older charts.
- cogsLine (EXISTING, L622): "The Narrows is the densest section of the corridor. Maximum signal interference. The colonists call it The Narrows because of what it does to communication. It has another name on older charts. I will use the current one."
  - [PROPOSED | cogsLine | BLUE]
- eyeState (intro beat): BLUE. "It has another name on older charts. I will use the current one." — a quiet breadcrumb (the corridor's history predates current habitation). Delivered controlled, BLUE. No per-step change.
- Post-level discipline dialogue (early, resultsLine):
  - SUCCESS (to-type, 3 stars — Field Operative alt line): "Three stars. Optimal piece count. The solution was tight. I find tight solutions preferable to elaborate ones. Not as a preference. As an engineering principle." [PROPOSED | resultsLine | BLUE] (L516)
  - FAILURE (1 star, against type — Field Operative single-type sample): "One star. Single piece type, above-optimal count, one-star result. The Field Operative methodology is built for exactly this kind of level. It was not applied to it." [PROPOSED | resultsLine | BLUE] (L616)
- Codex unlocked:
  - PROPOSED codex: CDX-THE-NARROWS (lore stub — "Older chart name withheld." Reinforces the corridor-predates-current-habitation thread; light Chapter Two texture, not a flagged seed).

---

## K1-10 — Central Hub (BOSS)  [CONSEQUENCE LEVEL]

- narrativeFrame: The corridor's single point of failure. Everything routes through here; three hundred thousand people depend on infrastructure with no redundancy. Bad design, current situation.
- cogsLine (EXISTING, L626): "The Central Hub. Everything in this corridor routes through here. If it holds, the corridor holds. Three hundred thousand people depend on infrastructure that runs through a single point. That is not good design. It is, however, the current situation."
  - [PROPOSED | cogsLine | AMBER]
- eyeState (intro beat): AMBER (existing source marks AMBER). The scale of the stakes registers on COGS. PROPOSED per-step: hold AMBER through the run; on failure escalate to AMBER (not RED — RED is reserved for the Rift/Deep Void strain arc; Kepler boss failure consequence in source is delivered AMBER, L257). On success return to BLUE.

### cogsWarning (PRE-LEVEL, NEW PROPOSED — boss-weight)
> "The Central Hub is the corridor's single point of failure. There is no redundancy. If this routing does not hold, it does not degrade gracefully. It drops. Three hundred thousand people are downstream of the work you are about to do. I am not saying that to apply pressure. I am saying it because it is the situation, and you should have it before you begin. Proceed."
> [PROPOSED | cogsWarning | AMBER | K1-10]

### failureEffect — consequenceNarrative (EXISTING, NARRATIVE.md L254-258, boss failure)
> "The relay failure has been logged with the transit authority. Three hundred and fourteen colonists lost scheduled resupply access for eleven days. The transit authority has filed a negligence inquiry against this vessel."
>
> [Amber eyes.]
>
> "I would suggest we resolve the inquiry through competence rather than correspondence. The systems are repairable."
> [PROPOSED | consequenceNarrative | AMBER | Sector 1 boss]

- Boss-void special-case resultsLine (early phase, fires after consequence narrative, DIALOGUE_SYSTEM L788):
  > "The boss level was not completed at a passing threshold. The sector is not closed. The systems are repairable. We try again."
  > [PROPOSED | resultsLine | BLUE]

### Boss completion lines (EXISTING, NARRATIVE.md L440-450) — SUCCESS PATH
- Standard completion (L442):
  > "Central Hub relay restored. The corridor is functional. The colonists will receive their resupply on schedule. That is the intended outcome."
  > [PROPOSED | bossComplete | BLUE]
- First attempt (L446):
  > "Central Hub restored. Single attempt. The colonists will not know how close the margin was. That is acceptable."
  > [PROPOSED | bossCompleteFirstAttempt | BLUE]
- First attempt, three stars (L449):
  > "Central Hub restored. First attempt. The efficiency rating is the highest I have logged for an operation of this complexity. I have nothing to add to that. The work speaks."
  > [PROPOSED | bossCompleteFirstAttemptThreeStars | AMBER]
- First-attempt-3-star special-case precursor line (early, fires BEFORE discipline/boss line, DIALOGUE_SYSTEM L722):
  > "First attempt. Full marks. I am noting the methodology for future reference."
  > [PROPOSED | resultsLine | BLUE]

### Post-boss breadcrumb (EXISTING, NARRATIVE.md L135-137) — fires on Sector 1 boss completion, after the standard completion line
> "The nav system has logged this route before. Prior transit. No mission data attached. I have nothing to add to that."
> [PROPOSED | hubAmbient | BLUE | triggers post Sector 1 boss]

### Post-sector arc line (EXISTING, DIALOGUE_SYSTEM L844) — fires after full Kepler Belt completion
> "Kepler Belt sector complete. The corridor is stable. The colonists have resupply. I want to note that the work in this sector had consequences for real people. The Engineer should know that was not lost on me."
> [PROPOSED | hubAmbient | BLUE | post Kepler completion]

- Codex unlocked by K1-10:
  - PROPOSED codex: CDX-CENTRAL-HUB (lore — corridor single-point-of-failure architecture; "not good design, current situation").
  - CDX-PRIOR-TRANSIT (UNLOCK/REVEAL — the stub seeded at K1-1 resolves to its visible state here via the post-boss breadcrumb). Cite NARRATIVE.md L133-137.
  - PROPOSED codex: CDX-TRANSIT-AUTHORITY (lore — the negligence inquiry and the investigator who "will not forget the Axiom," NARRATIVE.md L261; flagged Chapter Two thread, surfaced only on boss failure path).

---

## CROSS-LEVEL DIALOGUE MECHANICS (DIALOGUE_SYSTEM compliance)

- Phase: all Kepler levels evaluate as EARLY (Sectors 0-1). Use early-phase lines only.
- Two delivery points per notable completion: `resultsLine` (immediate) and optional `hubFollowUp` (next Hub visit, only when behavior warrants).
- Repetition rule: cycle through available lines for a given (discipline x behavior x tier x phase) state before repeating within a session. The samples above are representative, not exhaustive — the full matrix in DIALOGUE_SYSTEM Sections 1-3 supplies all variants.
- Special cases applicable in Kepler: First-Attempt-3-Star (L717-735, early), Multiple-Attempts (L739-753, early), Personal-Best on replay (L757-770), Void hub follow-up (L774-779), Boss-Void (L783-797, early for K1-10).
- Eye-state discipline: BLUE is COGS's default/controlled state and the dominant Kepler state. AMBER appears where source already marks it (K1-6, K1-7, K1-10 intros) and on the two new buried beats (K1-4 stakes reveal, K1-8 "ghost traffic" flicker). RED is NOT used in Kepler intros or consequence lines — it is reserved for the Rift/Deep Void strain arc; Kepler void resultsLines use RED only in the standard performance-matrix void tier (per DIALOGUE_SYSTEM), while the K1-10 consequence narrative stays AMBER per source. GREEN and DARK do not appear in Kepler.

---

## CONFLICTS / OPEN QUESTIONS FOR TUCKER (surfaced by this mapping)

1. Consequence-level scope. The brief flags K1-4, K1-8, K1-10 as consequence levels, but NARRATIVE.md only defines a formal `consequenceNarrative` for the K1-10 boss. K1-4 and K1-8 cogsWarning/failureEffect lines are NEW PROPOSED and scaled below boss weight (no transit-authority inquiry, no casualties). Confirm this is the intended tier, or whether mid-sector consequence levels should carry heavier in-universe stakes.
2. RED eye state in early-game. DIALOGUE_SYSTEM marks standard void resultsLines RED across all phases, but the Sector 1 arc reserves visible strain (RED) for COGS later. Confirm whether early-game void results should use RED eyes or a softer BLUE/AMBER to protect the strain arc's first real appearance in the Rift.
3. K1-8 buried "ghost traffic" beat. The dev note (L619) says COGS does NOT say what the ghost traffic lands against. The PROPOSED AMBER flicker risks over-signaling. Confirm keep, soften to BLUE-only, or cut the per-step change entirely.
4. Codex IDs. All CDX-* IDs above are PROPOSED placeholders. No existing Kepler codex registry was located in the two source docs. Confirm the canonical codex ID scheme and whether piece codex entries (Relay, Junction) already exist to avoid duplication.
5. Eye state on K1-4 stakes-reveal mid-level shift. NARRATIVE.md gives K1-4 a BLUE intro line; the PROPOSED mid-level AMBER shift is an addition. Confirm whether per-step eye changes are supported on non-boss Kepler levels or should be reserved for boss/consequence beats only.
