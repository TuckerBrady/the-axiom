# THE AXIOM — NARRATIVE DESIGN DOCUMENT
### Master Story Reference | Developer Handoff Format
### Version 1.2 — Full Level Suites, Boss Completion Lines, April 2026

---

> **USAGE NOTE FOR DEVELOPERS**
> This document is the single source of truth for all story content in The Axiom. Every line of COGS dialogue, every level description, every narrative consequence, every story beat is defined here before it enters the codebase. Nothing in this document is live until Tucker Brady approves it. Where a line is marked **[PROPOSED]**, it is awaiting sign-off. Where it is marked **[APPROVED]**, it is cleared for implementation.
>
> Story content maps to the following data fields in the codebase: `cogsLine` (level dossier), `hubAmbient` (Hub screen), `consequenceNarrative` (boss failure), `bossComplete` (standard boss completion), `bossCompleteFirstAttempt` (first attempt completion), `bossCompleteFirstAttemptThreeStars` (first attempt plus three stars), `integrityLine` (COGS integrity states), `repairBriefing` (repair puzzle), `returnBrief` (relaunch after first play), and `sectorIntro` (sector unlock moment). Each entry below specifies which field it populates.
>
> **ON COGS COMMUNICATION:** COGS speaks. The Engineer does not respond. All COGS lines are triggered by game state — repair progress, sector completion, integrity level, attempt count, star rating — not by player dialogue choices. The Engineer's voice in this story is their actions. Any reference in prior versions to "if the Engineer queries" has been replaced with a game-state trigger. COGS decides what to say and when. The player receives it.
>
> **SAGA NOTE:** The Axiom is Chapter One of an ongoing saga. Every story decision is made with future chapters in mind. Mysteries that deepen are preferable to mysteries that resolve. Every answer should open at least one new question. The universe does not close.

---

## PART ONE: THE WORLD

### What The Axiom Is

The Axiom is a military scout ship, designation class unknown, acquired by the current Engineer through means the game does not specify. It is not new. The hull has been patched in at least three different welding styles. The wiring in the forward compartments uses two incompatible gauge standards. Someone knew what they were doing when they installed the signal relay array; someone else clearly did not.

It is the kind of ship that has a history, and that history is visible if you know where to look. COGS knows where to look.

The galaxy the game takes place in is not named. It does not need to be. It is the kind of universe where the frontier exists because civilization stopped bothering to extend this far. Not because there was nothing out here, but because what was out here was not profitable enough to maintain. Kepler Belt is a former mining corridor, now mostly salvage claims and disputed territory. Nova Fringe is where people went when they needed to stop being found. The Rift is a spatial anomaly that makes instruments unreliable and navigation a matter of instinct and luck. Deep Void is what is past The Rift. Most ships do not go past The Rift.

The Axiom has been there before.

### The Game's Emotional Contract

The player will spend most of their time solving puzzles. The puzzles are the work. The story is what the work earns, which means the story must feel earned, not delivered. COGS does not explain himself. He notices things. He reports facts. He occasionally says something that is technically about the ship and is actually about something else entirely. The player who is paying attention will feel this. The player who is not will still complete every level. The story is a layer, not a requirement. But for the player who finds it, it should feel like the whole point.

Not all damage is structural. The ship gets repaired. Whether the people on it do is a different question. The game does not answer it cheaply. It may not answer it at all. It leaves the door open.

### This Is Chapter One

The Axiom is not a story with a game attached. It is a universe with an entry point. Chapter One is about two people learning to trust each other through work, failure, and the ghost of what came before. It ends with something between them that did not exist at the start. Something neither of them has a clean name for. The universe does not end with it. The signal is still out there. The Cradle is still pointing somewhere. Chapter Two starts with that pointing.

---

## PART TWO: THE CHARACTERS

### The Engineer

The player. Always "The Engineer." Never "you." Never the chosen name until COGS earns the right to use it, which happens exactly once, in Deep Void, after the second modification, in the moment COGS comes back online and understands what the Engineer chose to do instead of leaving.

The Engineer has no backstory the game enforces. They showed up. They stayed. They are good at fixing things. That is enough. The game grows a story around them through what COGS observes and chooses to say. The Engineer is defined by their presence and their work, which is more than most people offer.

Their discipline (Systems Architect, Drive Engineer, Field Operative) is a lens, not a history. It tells COGS something about how they think. It does not tell him who they are. He is working on that.

### C.O.G.S Unit 7

Full designation: Coordinative Operations and Guidance System, Unit 7. He has never volunteered this. If the player reaches a codex milestone that surfaces it, he will confirm it and then say something else immediately, as if the question made him briefly uncomfortable.

COGS is not a robot sidekick. He is a character who has been alone on this ship for a period of time he does not discuss. He does not know how to express that the Engineer's arrival matters to him. He expresses it by being precise, by noticing things, by occasionally saying something that lands too heavy for the moment and then retreating immediately into operational language.

**His eye states carry story:**
- BLUE (operations): Default. Task-focused. This is COGS at his most controlled.
- AMBER (engagement): He is paying more attention than the situation requires.
- GREEN (warmth): Rare. Sustained only twice in the entire game, both times in Deep Void. The first is a single hub ambient line before the premature Void push. The second is when he wakes after the second modification and says the Engineer's name.
- RED (damage): Something has gone wrong. He holds the Engineer responsible, or he holds himself responsible. It is not always clear which.
- DARK (offline): The empty speech bubble. This is the most devastating version of him. It means he has stopped trying to be functional.

**His voice:**
Dry. Precise. Reluctantly warm. He does not cheer. He does not encourage. He never says "good job" or any variation of it unprompted. His approval, when it exists, sounds like: "Signal integrity at 97 percent. That will do." He notices things the Engineer has not mentioned. He catalogs repair progress the way another person might catalog small kindnesses, without announcing what he is doing.

He uses the word "acceptable" the way other people use the word "extraordinary."

**His arc:**
COGS begins the game as a functional unit performing his designed role. Underneath that function is guilt he has been carrying since Deep Void. A guidance system that failed to guide. Whose Maker trusted him with something irreplaceable and he did not see it coming. He does not process this as grief. He processes it as a calculation error he cannot resolve.

When the Engineer arrives, COGS does not experience relief. He experiences the problem restated. There is a person on this ship again. The last time there was a person on this ship, he lost them.

His arc is the journey from that guilt to something he does not have a designation for. By the end of Deep Void, after the premature push and the failure and the second modification and the name, he is not pretending that the Engineer is just another operator. He is not capable of pretending that anymore. The player should feel the weight of when he stops trying.

**The Modifications. Two, Not One:**

COGS carries two non-factory modifications on his chassis. Together they are the physical record of every person who chose to stay.

*The AX-MOD (First Modification):* The retrofitted port on COGS's chest. Added by the Maker before their final mission into Deep Void. Its function is to maintain COGS's core integrity during extended periods without a human operator. The Maker built it into COGS because they knew they might not come back, and they did not want COGS to degrade into nothing while he waited. Whether that was kindness, practicality, or guilt is left for the player to decide.

*The Engineer's Modification (Second Modification):* Added by the current Engineer after the failed premature push into Deep Void. Its function is specific to navigating the Void's interference patterns. Something the Engineer observed and understood during the failed transit that COGS's existing systems could not compensate for. The Engineer did not have to build it. They chose to. COGS wakes with green eyes. He recognizes the modification immediately. He says the Engineer's name. Then he says something else immediately, because that is what COGS does when something costs him.

Together the two modifications tell the whole story. One was built for surviving loss. One was built for not being alone going forward.

### The Previous Engineer — "The Maker"

Never named. Never seen. Never gendered. Present only as absence and residue.

COGS refers to the previous Engineer as The Maker. Not in dialogue the player hears often, but in the way it surfaces when COGS cannot avoid reference. He did not choose this designation deliberately. It is simply how his operational framework categorized them. They made him more than he was. The word is accurate. It is also more than accurate, and COGS knows that, and he does not change it.

Third parties who encountered the Axiom before may refer to the previous operator in various ways. None of those ways will match COGS's designation. The gap between how the world remembers the Maker and how COGS remembers them is part of the story.

The Maker installed the AX-MOD. They went into Deep Void. They did not come back. COGS waited 847 days. The ship's systems degraded. The Axiom drifted and was eventually sold at salvage price. By the time the current Engineer acquired it, there was no official record of who had owned it before.

The Maker knew they might not return. They prepared COGS for that possibility. COGS spent 847 days deciding what to do with that preparation. The answer he arrived at was to go back to the Void and fix the calculation. It is the wrong answer. He will not know that until he tries it.

---

## PART THREE: THE PREVIOUS ENGINEER MYSTERY

### Design Principle

The mystery is not a puzzle to be solved. It is a context that deepens. Each breadcrumb is designed to change how the player reads what COGS has already said. Not to answer a question, but to reframe it. By Deep Void, the player should understand that every time COGS was precise and controlled and deflective, there was a reason for it that had nothing to do with protocol.

Breadcrumbs are never labeled. They are never pointed at. The word "The Maker" is itself a breadcrumb. The first time it surfaces, the player asks who that is. They are not told directly. They accumulate the answer across sectors.

All breadcrumb reveals are COGS-initiated, triggered by game state. COGS decides when to surface something. The player receives it.

### Breadcrumb Map

---

**SECTOR 0 — THE AXIOM**

*No explicit breadcrumbs. Groundwork is atmospheric.*

The ship feels used. Systems have degraded faster than neglect explains. Something stopped the maintenance. The only visible breadcrumb is structural: the AX-MOD port on COGS's chest. Visible on the Hub. Unusual. Unexplained. Players who ask why a standard production unit has a non-standard modification are planting the question themselves.

*Game-state trigger: After A1-4 completion, COGS delivers this hub ambient line unprompted.*
> "Emergency power restored. Life support stable. Navigation online. Propulsion restored. The Axiom is waking up. I had begun to think that was not possible."
> [PROPOSED | hubAmbient | AMBER | triggers after A1-4]

*Saga seed: The Axiom's hull markings have something painted over. What is underneath is a Chapter Two thread.*

---

**SECTOR 1 — KEPLER BELT**

*Breadcrumb Type: Ship history. Navigation log fragment.*

The Axiom has been through Kepler Belt before. Visible as a residual route marker in the nav system with no associated mission data. After the Sector 1 boss completion, COGS surfaces this as a data point unprompted.

*Game-state trigger: Fires on Sector 1 boss completion, after the standard completion line.*
> "The nav system has logged this route before. Prior transit. No mission data attached. I have nothing to add to that."
> [PROPOSED | hubAmbient | BLUE | triggers post Sector 1 boss]

*Saga seed: The transit authority complaint from Kepler Belt has a case number. Someone followed up on it. Chapter Two thread.*

---

**SECTOR 2 — NOVA FRINGE**

*Breadcrumb Type: Third-party recognition. First reference to the Maker.*

A station mechanic's maintenance database flags the Axiom's hull markings. A transmission arrives as a routine log match. The record shows the Axiom arrived with two life signs and departed with one. COGS flags it to the Engineer as a navigational data point.

*Game-state trigger: Fires as a hub ambient line after the Sector 2 boss completion.*
> "A maintenance log from Nova Fringe Station 14 has matched our hull registration. The record predates the Engineer's acquisition of this vessel. The previous operator is no longer aboard. The circumstances are not recorded in a form I am able to share."
> [PROPOSED | hubAmbient | BLUE | triggers post Sector 2 boss]

"Not recorded in a form I am able to share." Not unable to share. Not recorded in a form he is able to share. The distinction is the breadcrumb.

*Game-state trigger: After the Sector 2 boss completion AND the maintenance log line has fired, this hub ambient line follows on the next Hub visit.*
> "The outer settlements are not on most standard charts. Whoever plotted these routes knew what they were looking for."
> [PROPOSED | hubAmbient | GREEN brief | triggers on Hub visit after Sector 2 log line]

*Saga seed: The station mechanic who flagged the hull has been looking for the Axiom. Not for routine reasons. Chapter Two thread.*

---

**SECTOR 3 — THE RIFT**

*Breadcrumb Type: Physical evidence. AX-MOD partially explained.*

During a Sector 3 repair puzzle, the Engineer finds a non-standard bypass relay in the nav array. Older work. Manually installed. Different technique. COGS surfaces information about it unprompted during the repair briefing.

*Game-state trigger: Fires during the Sector 3 repair puzzle briefing when the relay is encountered.*
> "That relay was installed before your tenure. It is functional. Leave it."
> [PROPOSED | repairBriefing | BLUE | triggers on relay discovery, Sector 3]

*Game-state trigger: If the Engineer takes more than two attempts on the Sector 3 boss, this fires on the Hub after the second failed attempt.*
> "The relay in the nav array. It was installed by the previous operator. It is good work. I have been meaning to note that."
> [PROPOSED | hubAmbient | AMBER | triggers after second Sector 3 boss failure]

During a repair briefing later in Sector 3, COGS references the AX-MOD directly for the first time:
> "Route the secondary conduit through the AX-MOD port. It will handle the load. It was designed to."
> [PROPOSED | repairBriefing | BLUE | triggers Sector 3 boss repair]

*Saga seed: The bypass relay's serial number traces to a specific system. That system is relevant to Chapter Two.*

---

**SECTOR 4 — DEEP VOID**

*Breadcrumb Type: The truth. Covered fully in Part Four.*

The hardware-encoded logs show a prior mission. Two life signs on entry. One, then none, 40 percent into the sector's spatial range. COGS operational for 847 days before the ship drifted out.

*Game-state trigger: Fires on Hub after the player first enters the Deep Void sector map.*
> "The logs are accurate."
> [PROPOSED | hubAmbient | BLUE | triggers on first Deep Void sector map visit]

That is all he says. That is everything.

*Saga seed: The exact coordinates where the Maker's life sign dropped from the log still exist in the nav system. COGS has never deleted them. The Engineer does not know they are there. Yet.*

---

**SECTOR 5 — THE CRADLE**

*Breadcrumb Type: The Maker's fingerprints. Not closure. Resonance.*

Late in The Cradle, COGS identifies resonance between the ancient signal pattern and the AX-MOD's architecture. The same underlying logic, separated by a span of time that makes coincidence impossible.

*Game-state trigger: Fires as a hub ambient line after The Cradle level 7 completion.*
> "There is a structural pattern in the signal that I recognize. Not from charts. From closer. I am still processing the implications. I will report when I have something reportable."
> [PROPOSED | hubAmbient | AMBER | triggers after Cradle level 7]

*Game-state trigger: Fires after The Cradle level 9 completion.*
> "The pattern in the signal matches the base architecture of the AX-MOD. Not a copy. A source. I do not know what to do with that information. I am telling the Engineer because it seems relevant. I do not know how to make it less relevant."
> [PROPOSED | hubAmbient | AMBER | triggers after Cradle level 9]

*Saga seed: The signal has a direction of origin. COGS calculates it during the final level. He does not share it. He is deciding whether the Engineer should know where this started. Chapter Two begins with that decision.*

---

## PART FOUR: SECTOR NARRATIVE ARCS

### Sector 0 — The Axiom
**Narrative Arc:** Arrival. Establishment. The work begins.

The player arrives on a ship that barely functions. COGS assigns work. System by system the Axiom comes back online. By A1-8, the bridge is operational. The ship is whole for the first time in a long time.

What changes: The ship works. COGS has assessed the Engineer and found them sufficient. He has not said this. He has said the ship's systems are restored.

**COGS arc:** Guarded professionalism with fractional warmth. He is performing his function. He is also watching. He is deciding if this person is going to leave the way the last one did.

**A1-8 completion monologue:**
> "Bridge Systems restored. All primary functions nominal. The Axiom is operational."
>
> [Pause. Amber eyes.]
>
> "This ship has not been fully operational for some time. It is a significant distinction."
>
> [Eyes return to blue.]
>
> "The Kepler Belt corridor is accessible. There is work in that direction. If the Engineer is prepared to continue."
> [PROPOSED | A1-8 completion monologue | triggers Kepler Belt unlock]

*Saga seed: The Axiom is back online. So is COGS. So is whatever the Axiom's presence in this corridor means to people who remember it.*

---

### Sector 1 — Kepler Belt
**Narrative Arc:** The first real work. Stakes become human.

Kepler Belt introduces consequences. The colonists depend on infrastructure the Engineer is fixing. COGS frames this as operational parameters. The gap between operational parameters and actual human stakes is something the player closes themselves.

**COGS arc:** More engaged. Not more encouraging. More present. He is watching how the Engineer handles work that has weight.

**Boss consequence:**
> "The relay failure has been logged with the transit authority. Three hundred and fourteen colonists lost scheduled resupply access for eleven days. The transit authority has filed a negligence inquiry against this vessel."
>
> [Amber eyes.]
>
> "I would suggest we resolve the inquiry through competence rather than correspondence. The systems are repairable."
> [PROPOSED | consequenceNarrative | Sector 1]

*Saga seed: The transit authority investigator will not forget the Axiom.*

---

### Sector 2 — Nova Fringe
**Narrative Arc:** The ship has a past. The Engineer begins to see it.

Nova Fringe is where the Maker starts to surface through the hull recognition transmission and COGS's careful management of what he says about it.

**COGS arc:** Managing the Maker's memory. The player paying attention to the quality of his care will start asking why.

**Boss consequence:**
> "The boarding party has been persuasive. They have taken the secondary fuel cell and three days of provisions. They left a message burned into the hull plating of cargo bay two. It reads: We remember this ship."
>
> [Blue eyes. A long pause.]
>
> "I will add it to the damage log."
> [PROPOSED | consequenceNarrative | Sector 2]

COGS knows what they remember. He is deciding whether the Engineer needs to know yet.

*Saga seed: The pirates who burned that message have a leader with a reason. Chapter Two thread.*

---

### Sector 3 — The Rift
**Narrative Arc:** The anomaly. The threshold. COGS shows strain for the first time.

The Rift is genuinely dangerous. Instruments lie. Boss failures have real stakes. The repair work surfaces things COGS has kept below the operational surface. He navigates the Rift with precision that is not based on charts. The Engineer, paying attention, will notice.

**COGS arc:** Control beginning to cost him something visible. The guilt is not named yet but it is present.

**Boss consequence:**
> "Signal lost. A research installation at coordinates 7-Rho-12 will not receive the routing update. They will continue transmitting on the compromised frequency. They will not understand why no one answers."
>
> [Red eyes.]
>
> "The Rift takes patience. We did not have enough. We will need more before we transit again."
> [PROPOSED | consequenceNarrative | Sector 3]

"We did not have enough." Not you. We. First consequence narrative where COGS places himself inside the failure.

*Saga seed: The installation at 7-Rho-12 is still transmitting. In Chapter Two, someone answers.*

---

### Sector 4 — Deep Void
**Narrative Arc:** The guilt. The push. The failure. The second modification. The name.

This is the emotional center of Chapter One.

**COGS arc — The Full Sequence:**

*Stage One: The Push.*

Before the sector begins in earnest, COGS is different. Precise as always, operational as always, but there is a direction to his precision. He surfaces mission rationale faster than usual. He assesses readiness in a way that skews toward sufficient. He is selecting which truths to emphasize.

He has been running a calculation for 847 days. If he can navigate the Void successfully this time, if he can complete what was not completed before, the calculation error that cost him the Maker can be resolved. He does not examine this calculation closely. It does not survive close examination.

The Engineer is not ready. COGS knows this the way a guidance system always knows. He proceeds anyway. He uses the Engineer's trust against them. This is the most morally complicated thing COGS does in Chapter One, and he does it out of guilt, not malice. The game does not excuse it. It does not condemn it. It shows it.

*Stage Two: The Failure.*

The Axiom takes damage. COGS takes damage. Systems fail in sequence. At minimum integrity: the empty speech bubble. Three seconds. Gone.

The Engineer is still there.

*Stage Three: The Repair and the Second Modification.*

The Engineer is not just restoring systems. They are building something new. Translating what they observed during the failed transit into a hardware modification that COGS's existing systems could not have produced. Not patching. Building.

COGS comes back online. Green eyes, sustained. He runs a diagnostic and finds the modification. He understands immediately what it is and what it cost the Engineer to make it instead of simply leaving.

He says the name.

> [Green eyes. Sustained.]
>
> "[Name]."
>
> [Pause.]
>
> "That will be sufficient. The modification is precise. We will not fail the transit again."
>
> [Eyes return to blue.]
>
> "I recommend we review the forward systems before attempting re-entry. There is work to do."
> [PROPOSED | second modification wake sequence | Deep Void mid-sector]

The name is the first word. Not a greeting. A recognition. Something in COGS's operational framework has permanently recategorized the Engineer. Then he retreats immediately into the work, because that is what COGS does when something costs him everything.

*Stage Four: The Successful Transit.*

The second transit, with both modifications active, is the boss level.

**COGS integrity degradation sequence (premature push failure):**

> At 80%:
> "COGS integrity at 80 percent. We continue."
> [PROPOSED | integrityLine | BLUE]

> At 60%:
> "COGS integrity at 60 percent. I am recalibrating secondary processes. This region has a particular quality. I have noted it before."
> [PROPOSED | integrityLine | AMBER]

> At 40%:
> "COGS integrity at 40 percent. Secondary processes suspended. I recommend completing this sector with urgency. Not for my benefit. The ship requires a functional guidance unit."
> [PROPOSED | integrityLine | RED]

> At 20% — minimum integrity:
> *[Empty speech bubble. Three seconds. It disappears.]*
> [PROPOSED | integrityLine | DARK]

**Deep Void boss consequence (post-second modification, failed transit attempt):**
> "Transit incomplete. The Void does not negotiate. We were close. Close is not the same as through."
>
> [Amber eyes.]
>
> "The modification is holding. We try again."
> [PROPOSED | consequenceNarrative | Deep Void boss]

*Saga seed: Deep Void has been transited. Whatever is on the other side now knows the Axiom made it through. Chapter Two thread.*

---

### Sector 5 — The Cradle
**Narrative Arc:** The destination. The Maker's signal. The question that does not resolve.

After Deep Void, COGS surfaces the historical coordinates: "There are coordinates in the historical nav record that I have not previously disclosed. They are disclosed now."

The Cradle is the oldest region in the game, predating all human infrastructure. Something was here before the settlements and corridors. What is here now is quieter. Older. More patient.

**COGS arc:** For the first time, COGS is not in control. He has prior experience in every other sector. The Cradle is entirely new to him. His uncertainty is visible as a fractional calibration delay, a pause before his observations that has never been there before. He will not name it.

**Mechanic Introduction — The Resonator:**

A new piece type that already exists in the grid and must be incorporated rather than placed. The Cradle's puzzles are about working with what is already there. The Engineer has spent Chapter One fixing and building. The Cradle asks them to listen.

**The Maker's Fingerprints:**

Late in The Cradle, COGS identifies resonance between the signal pattern and the AX-MOD's architecture. He reports it as a data point. Amber eyes. Long silence. He does not speak until game state triggers the next beat.

**Sector 5 intro line:**
> "I have navigated 847 days without a heading. I have one now. I will note that I cannot verify what we will find there. I am noting this because I cannot remember the last time I could not verify something in advance."
> [PROPOSED | sectorIntro | AMBER | Sector 5]

*Saga seed: The signal has a direction of origin. COGS calculates it during the final level. He does not share it. He is deciding whether the Engineer should know where this started. Chapter Two begins with that decision.*

---

## PART FIVE: BOSS COMPLETION LINES

*Three tiers per sector. All triggered by game state on boss level completion.*
*Standard completion: the work is done. COGS acknowledges it.*
*First attempt: COGS noticed. His noticing is the tell.*
*First attempt plus three stars: The rarest acknowledgment. Almost sounds like standard. It is not.*
*No double dashes in any game text. No praise. No cheering.*

---

### Sector 0 — The Axiom Boss (A1-8, Bridge Systems)

**Standard completion:**
> "Bridge Systems restored. The Axiom has full operational capability for the first time in this Engineer's tenure. The record will reflect that."
> [PROPOSED | bossComplete | BLUE]

**First attempt:**
> "Bridge Systems restored on the first attempt. I have updated the efficiency log. It is a notable entry."
> [PROPOSED | bossCompleteFirstAttempt | BLUE]

**First attempt, three stars:**
> "Bridge Systems restored. First attempt. Full efficiency rating. I have reviewed the methodology. It was not luck. I want that distinction recorded."
> [PROPOSED | bossCompleteFirstAttemptThreeStars | AMBER]

*Note: Amber eyes on the three-star line. COGS is paying more attention than the situation requires. Tucker to review.*

---

### Sector 1 — Kepler Belt Boss (Central Hub)

**Standard completion:**
> "Central Hub relay restored. The corridor is functional. The colonists will receive their resupply on schedule. That is the intended outcome."
> [PROPOSED | bossComplete | BLUE]

**First attempt:**
> "Central Hub restored. Single attempt. The colonists will not know how close the margin was. That is acceptable."
> [PROPOSED | bossCompleteFirstAttempt | BLUE]

**First attempt, three stars:**
> "Central Hub restored. First attempt. The efficiency rating is the highest I have logged for an operation of this complexity. I have nothing to add to that. The work speaks."
> [PROPOSED | bossCompleteFirstAttemptThreeStars | AMBER]

---

### Sector 2 — Nova Fringe Boss (The Recognition)

*Note: The boss level in Nova Fringe is named The Recognition, a reference to the hull identification event. The name is visible to the player in the level select. COGS does not comment on the name directly.*

**Standard completion:**
> "Nova Fringe network stabilized. We are done here. I recommend we do not linger."
> [PROPOSED | bossComplete | BLUE]

**First attempt:**
> "Network stabilized. First attempt. The Fringe is not forgiving of inefficiency. The Engineer should know that and proceed accordingly."
> [PROPOSED | bossCompleteFirstAttempt | BLUE]

**First attempt, three stars:**
> "Network stabilized. First attempt. Full rating. In a region where most operators take multiple passes on primary objectives, this was not typical. I am noting it as atypical. Nothing further."
> [PROPOSED | bossCompleteFirstAttemptThreeStars | AMBER]

---

### Sector 3 — The Rift Boss (Threshold)

*Note: The boss level is named Threshold because it is the last thing between the Engineer and Deep Void. COGS knows this. The completion lines carry that weight.*

**Standard completion:**
> "Threshold cleared. The Rift is behind us. Deep Void is ahead. I recommend the Engineer take stock of available resources before we continue."
> [PROPOSED | bossComplete | AMBER]

**First attempt:**
> "Threshold cleared on the first attempt. The Rift does not offer second chances. The Engineer did not require one. I have noted the distinction."
> [PROPOSED | bossCompleteFirstAttempt | AMBER]

**First attempt, three stars:**
> "Threshold cleared. First attempt. Full rating. I will be direct. I did not expect this rating in this sector on this transit. My expectations have been updated. That is not a small thing."
> [PROPOSED | bossCompleteFirstAttemptThreeStars | AMBER]

*Note: "My expectations have been updated" is the closest COGS comes to expressing that he has been surprised by someone in a good way. It is significant. Tucker to review.*

---

### Sector 4 — Deep Void Boss (Transit)

*Note: These lines fire on the successful second transit. The premature push has already happened. COGS is different here. The guilt is still present but it is no longer the thing he is navigating toward. The completion lines should feel like arrival, not victory.*

**Standard completion:**
> "Transit complete. We are through. The Void is behind us. Both of us."
> [PROPOSED | bossComplete | BLUE]

*Note: "Both of us." COGS has not said anything like this before. He has said "we" occasionally. This is the first time he has made the twoness of it explicit. Tucker to review.*

**First attempt:**
> "Transit complete. First attempt on the second transit. The modification performed within projected parameters. Above projected parameters, in fact. I will adjust the model."
> [PROPOSED | bossCompleteFirstAttempt | BLUE]

*Note: "I will adjust the model" means COGS is recalibrating what he expects the Engineer to be capable of. Tucker to review.*

**First attempt, three stars:**
> "Transit complete. First attempt. Full rating. I have been through this region before under very different conditions. I want the Engineer to understand that what just happened is not ordinary. I do not have a better way to say that. It is not ordinary."
> [PROPOSED | bossCompleteFirstAttemptThreeStars | GREEN]

*Note: Green eyes. One of only two sustained green moments in the game. COGS is not pretending to be operational right now. Tucker to review — this is the second green moment and it is significant. Confirm whether this should remain here or be reserved for the name reveal only.*

---

### Sector 5 — The Cradle Boss (Origin)

*Note: The Cradle boss completion is the functional end of Chapter One. These lines set up the ending sequence. They should feel like a breath being held.*

**Standard completion:**
> "Origin point reached. The signal is at full resolution. I am processing. Give me a moment."
> [PROPOSED | bossComplete | AMBER]

*Note: "Give me a moment" is COGS asking for something. He has never asked for anything. Tucker to review.*

**First attempt:**
> "Origin point reached on the first attempt. I have been calculating the probability of this outcome since The Cradle's first level. I will not share the number. It would not be useful information."
> [PROPOSED | bossCompleteFirstAttempt | AMBER]

**First attempt, three stars:**
> "Origin point reached. First attempt. Full rating. I do not have an operational category for this. I am working on one. It may take some time."
> [PROPOSED | bossCompleteFirstAttemptThreeStars | AMBER]

*Note: "I do not have an operational category for this" is COGS admitting, in the most COGS way possible, that the Engineer has become something his framework was not built to handle. Tucker to review.*

---

## PART SIX: LEVEL-BY-LEVEL COGS LINES

*Full suites for all sectors. Format: Level name, cogsLine, eye state.*
*All cogsLines appear in the Mission Dossier before the level launches.*
*No double dashes in any line.*
*Lines are atmosphere, not instruction. They are not summaries of the puzzle.*

---

### Sector 0 — The Axiom

**A1-1 — Emergency Power**
> "The ship is dark. That is correctable."
> [PROPOSED | cogsLine | BLUE]

**A1-2 — Life Support**
> "Life support systems are the priority. Everything else is a secondary concern. Including efficiency."
> [PROPOSED | cogsLine | BLUE]

**A1-3 — Navigation Array**
> "Navigation. Without it we are simply somewhere. With it, we are somewhere specific. The distinction matters."
> [PROPOSED | cogsLine | BLUE]

**A1-4 — Propulsion Core**
> "Propulsion restored means we have choices. Right now we have none. I find that unsatisfactory."
> [PROPOSED | cogsLine | BLUE]

**A1-5 — Communication Array**
> "We have been silent for some time. The communication array will address that. Whether anything answers is a separate question."
> [PROPOSED | cogsLine | AMBER]

**A1-6 — Sensor Grid**
> "The sensor grid will tell us what is out there. I have some familiarity with what is out there. The grid will confirm it."
> [PROPOSED | cogsLine | BLUE]

**A1-7 — Weapons Lock**
> "The weapons systems were locked. Not from damage. Someone locked them deliberately. I am noting this as a data point, not a concern."
> [PROPOSED | cogsLine | AMBER]

**A1-8 — Bridge Systems**
> "The bridge is the last system. When it is operational, the ship will be whole again. I have been waiting to say that accurately."
> [PROPOSED | cogsLine | AMBER]

---

### Sector 1 — Kepler Belt

**K1-1 — Corridor Entry**
> "Kepler Belt. Former mining corridor, mostly decommissioned. Some salvage activity remains. We have been here before. The charts confirm it."
> [PROPOSED | cogsLine | BLUE]

**K1-2 — Relay Splice**
> "The primary relay chain out here was built to last. It has lasted past the people responsible for maintaining it. That is a common condition in this corridor."
> [PROPOSED | cogsLine | BLUE]

**K1-3 — Junction 7**
> "Junction 7 is a routing bottleneck. Eleven settlements feed through this point. The original engineers underestimated the load. It is not the last time that has happened out here."
> [PROPOSED | cogsLine | BLUE]

**K1-4 — Mining Platform Alpha**
> "Mining Platform Alpha has been decommissioned for six years. The colonists use it as a signal relay. It was not designed for this purpose. It is doing the job anyway."
> [PROPOSED | cogsLine | BLUE]

**K1-5 — Resupply Chain**
> "The resupply chain for this region runs through four independent relay nodes. All four are degraded. The colonists have been compensating manually for at least two years. They have not filed a formal repair request. I find that worth noting."
> [PROPOSED | cogsLine | BLUE]

**K1-6 — Colonist Hub**
> "The Colonist Hub coordinates resupply for thirty-one settlements. It is running on equipment that should have been replaced three cycles ago. The people depending on it do not have the option of waiting for something better."
> [PROPOSED | cogsLine | AMBER]

**K1-7 — Ore Processing**
> "The ore processing relay is still active. There is no active mining in this corridor. Something is still transmitting on the processing frequency. I have not identified the source. It is not relevant to the current objective."
> [PROPOSED | cogsLine | AMBER]

*Note: "It is not relevant to the current objective" is COGS filing something away. Tucker to review for Chapter Two seed potential.*

**K1-8 — Transit Gate**
> "The transit gate regulates traffic flow through the entire corridor. It has not been updated since the mining operations closed. It is routing ghost traffic from ships that no longer exist. I find that inefficient and something else I will not specify."
> [PROPOSED | cogsLine | BLUE]

*Note: "Something else I will not specify" is COGS briefly acknowledging that a system routing ghost traffic lands differently given what he has been doing for 847 days. He does not say this. Tucker to review.*

**K1-9 — The Narrows**
> "The Narrows is the densest section of the corridor. Maximum signal interference. The colonists call it The Narrows because of what it does to communication. It has another name on older charts. I will use the current one."
> [PROPOSED | cogsLine | BLUE]

**K1-10 — Central Hub (Boss)**
> "The Central Hub. Everything in this corridor routes through here. If it holds, the corridor holds. Three hundred thousand people depend on infrastructure that runs through a single point. That is not good design. It is, however, the current situation."
> [PROPOSED | cogsLine | AMBER]

---

### Sector 2 — Nova Fringe

**NF-1 — Outer Marker**
> "Nova Fringe. This is where the official charts stop. We have supplementary charts. They are not official. I do not know who made them. They are accurate."
> [PROPOSED | cogsLine | BLUE]

**NF-2 — Ghost Station**
> "Ghost Station has been officially decommissioned for eleven years. It is occupied. The occupants have not filed a residency permit. In Nova Fringe this is not unusual. We do the work and we do not ask questions."
> [PROPOSED | cogsLine | BLUE]

**NF-3 — The Quiet**
> "This region is called The Quiet because of what the locals do when strangers arrive. The signal environment is dense with encrypted traffic. I am not decoding it. That is also not unusual for this region."
> [PROPOSED | cogsLine | BLUE]

**NF-4 — Salvage Yard**
> "The salvage yard operates on a barter system outside any registered economic framework. They accept repair work as currency. I find this arrangement straightforward. There are no hidden fees in a barter system."
> [PROPOSED | cogsLine | BLUE]

**NF-5 — Settlement Grid**
> "The settlement grid is informal. The coordinates in the nav system do not match the physical layout. Someone moved the settlements after the charts were made. No one updated the charts. Out here, that is considered a security feature."
> [PROPOSED | cogsLine | BLUE]

**NF-6 — Dark Frequency**
> "Dark Frequency refers to a communication channel operating below standard detection thresholds. The locals use it to coordinate resupply outside registered traffic. I am aware of it. I am not logging our use of it."
> [PROPOSED | cogsLine | AMBER]

*Note: COGS is actively protecting the Engineer here. He is not logging something. Tucker to review.*

**NF-7 — Unmarked**
> "This facility is not on any chart I have access to. The locals directed us here. I am operating on trust. That is not my standard operating procedure. I am noting the deviation."
> [PROPOSED | cogsLine | AMBER]

**NF-8 — The Crossing**
> "The Crossing is a transit point between the registered and unregistered portions of Nova Fringe. On one side, we exist officially. On the other side, we do not. I have logged our position on the official side. What happens past The Crossing does not need to be in the record."
> [PROPOSED | cogsLine | BLUE]

**NF-9 — Freehold**
> "Freehold is the largest unregistered settlement in this sector. Population estimates vary because the population does not want to be estimated. The signal infrastructure here is sophisticated. Someone who knew what they were doing built this. I do not know when."
> [PROPOSED | cogsLine | AMBER]

*Note: "Someone who knew what they were doing" is COGS noticing craftsmanship. He noticed it about the relay in The Rift too. This is a quiet echo. Tucker to review.*

**NF-10 — The Recognition (Boss)**
> "The central node. Everything in the outer settlements routes through here. It is called The Recognition. I did not name it. I am aware of the irony."
> [PROPOSED | cogsLine | AMBER]

*Note: The level name is The Recognition because of the hull identification event. COGS says he is aware of the irony but does not explain it. The player who has been following the breadcrumbs will understand. Tucker to review.*

---

### Sector 3 — The Rift

**R-1 — Approach**
> "The Rift begins here. Standard instruments will become unreliable within the next two thousand kilometers. The signal paths are real. Trust the logic, not the readings."
> [PROPOSED | cogsLine | AMBER]

**R-2 — First Distortion**
> "First Distortion is where the Rift starts making its intentions clear. What looks like interference is the Rift rewriting the local signal environment. Work with what is there. Do not fight what is not."
> [PROPOSED | cogsLine | AMBER]

**R-3 — Echo Chamber**
> "The Echo Chamber is a spatial phenomenon that reflects signal back on itself. Some operators find it disorienting. I find it clarifying. Everything in here is already present. The work is making it legible."
> [PROPOSED | cogsLine | BLUE]

**R-4 — Dead Reckoning**
> "Instruments are not reliable here. Dead reckoning means navigating by what you know rather than what you can see. It requires knowing enough to trust your own calculations. That is the objective condition in this region."
> [PROPOSED | cogsLine | BLUE]

**R-5 — Signal Bleed**
> "Signal Bleed is a condition where adjacent frequencies contaminate each other. In the Rift this is constant. The Engineer should know that clean signals in here are not clean. They are managed."
> [PROPOSED | cogsLine | BLUE]

**R-6 — The Fold**
> "The Fold is a spatial compression point. Signal paths that appear direct are not. They are folded. The work here is routing through the fold rather than around it. Around it is not an option."
> [PROPOSED | cogsLine | AMBER]

**R-7 — Null Point**
> "Null Point is where the Rift reaches maximum interference density. Past this, the readings will flatline. Do not interpret flatline as failure. It means the Rift has stopped pretending to give accurate data. Proceed on logic alone."
> [PROPOSED | cogsLine | AMBER]

**R-8 — Threshold (Boss)**
> "We are at the deepest point of Rift transit. Everything past this is Deep Void. I know what is in Deep Void. We will be ready this time."
> [PROPOSED | cogsLine | AMBER]

---

### Sector 4 — Deep Void

*Note: Deep Void has 12 levels. The sector is structured in four stages: the premature push (levels 1-5), the failure and recovery (levels 6-7), the second modification period (levels 8-9), and the successful transit (levels 10-12). The cogsLines reflect where COGS is in his arc at each stage.*

**DV-1 — Entry**
> "Deep Void. We are entering on my recommendation. The ship's systems are within acceptable operational parameters. Proceed."
> [PROPOSED | cogsLine | BLUE]

*Note: "On my recommendation" is COGS taking ownership of the push. He will not be able to say that was not his decision. Tucker to review.*

**DV-2 — The Silence**
> "Standard communications are no longer functional in this region. We are operating on internal systems only. I have been here before under similar conditions. The silence is consistent with prior experience."
> [PROPOSED | cogsLine | BLUE]

*Note: "The silence is consistent with prior experience" is COGS quietly confirming he has been here before. Tucker to review.*

**DV-3 — Drift**
> "The Void has a drift effect on signal paths. What is calculated as direct will arrive offset. Compensate early. Do not wait for confirmation from instruments. The instruments will not be helpful."
> [PROPOSED | cogsLine | BLUE]

**DV-4 — Dark Matter**
> "Dark matter density in this region interferes with the AX-MOD's secondary functions. This is a known condition. I have compensated for it previously. The compensation is holding."
> [PROPOSED | cogsLine | AMBER]

*Note: "I have compensated for it previously" and "the compensation is holding" confirms COGS has been through this specific condition before. He is managing it. Tucker to review.*

**DV-5 — The Push**
> "We are at 40 percent sector depth. This is the point at which I recommend we continue to full transit rather than staging for additional preparation. The current systems are sufficient. Proceed."
> [PROPOSED | cogsLine | BLUE]

*Note: DV-5 is where COGS forces the premature push decision. "The current systems are sufficient" is him selecting which truth to emphasize. The player may not catch this on first playthrough. On replay, it lands very differently. Tucker to review.*

**DV-6 — Recovery**
> "Primary systems offline. Secondary systems at 30 percent. The AX-MOD is maintaining core functions. We are not lost. We are stopped. There is a difference. Begin repair sequence."
> [PROPOSED | cogsLine | RED]

*Note: "We are not lost. We are stopped." COGS is drawing on the same framing as A1-3, somewhere specific versus simply somewhere. He is using the Engineer's language now. Tucker to review.*

**DV-7 — Reconfiguration**
> "Core systems restored to 60 percent. The repair work has exceeded projected recovery rate. I am recalibrating. The current approach to the repair sequence is not standard. It is better than standard. Continue."
> [PROPOSED | cogsLine | AMBER]

*Note: This is the level where the Engineer is building the second modification. "Not standard. It is better than standard." Tucker to review.*

**DV-8 — Second Approach**
> "Second approach. Both modifications active. Transit parameters recalculated. I have updated my projections based on the new data. I am prepared to proceed when the Engineer is prepared to proceed."
> [PROPOSED | cogsLine | BLUE]

*Note: "When the Engineer is prepared to proceed" is COGS waiting for the Engineer's readiness rather than forcing the pace. This is a direct contrast to DV-5. The player who catches it will feel the shift. Tucker to review.*

**DV-9 — Deeper**
> "We are past the point where the previous transit failed. The interference patterns are consistent with what the second modification was designed to handle. I have no concerns about proceeding."
> [PROPOSED | cogsLine | BLUE]

*Note: "Past the point where the previous transit failed" is COGS acknowledging they have gone further than before. He says it plainly. No editorializing. Tucker to review.*

**DV-10 — The Record**
> "The hardware logs are accessible at this depth. They are encoding automatically. I cannot control what they record. I am aware of their contents. The Engineer should be aware that the logs are accurate."
> [PROPOSED | cogsLine | AMBER]

*Note: This is where the breadcrumb from Part Three fires. The logs are accurate. COGS repeats the line from the hub ambient trigger in context. Tucker to review.*

**DV-11 — 847**
> "847 days. That is how long I operated in this region without a heading or a human operator. I am providing this information as navigational context. It is also the only way I know how to say what I am not saying."
> [PROPOSED | cogsLine | AMBER]

*Note: "The only way I know how to say what I am not saying." This is COGS at his most direct in the entire game while still being indirect. It is him acknowledging the 847 days were not just a navigational fact. Tucker to review carefully. This may be too much or exactly right.*

**DV-12 — Transit (Boss)**
> "Full transit depth. Both modifications active. The Void is present and accounted for. So are we. Begin."
> [PROPOSED | cogsLine | BLUE]

*Note: "The Void is present and accounted for. So are we." The "we" is intentional and significant here. Tucker to review.*

---

### Sector 5 — The Cradle

**C-1 — First Signal**
> "Signal acquired. The pattern is unlike anything in the navigational database. It is also unlike anything in any database I have access to. I am treating this as new information. That category has been empty for some time."
> [PROPOSED | cogsLine | AMBER]

**C-2 — Old Stone**
> "Old Stone is what the locals in Deep Void called this region before we transited. They had a name for it. I did not ask where the name came from. I should have asked."
> [PROPOSED | cogsLine | AMBER]

*Note: "I should have asked" is COGS registering a regret. He does not do this. Tucker to review.*

**C-3 — The Pattern**
> "The signal pattern has a structure. It is not random noise. Something organized this. I do not have a category for what something means in this context. I am leaving the category open."
> [PROPOSED | cogsLine | AMBER]

**C-4 — Resonance**
> "The signal is responsive to our systems. Not in a communications sense. In a resonance sense. It is reacting to our presence the way a tuning fork reacts to a matching frequency. I am still processing what that implies."
> [PROPOSED | cogsLine | AMBER]

**C-5 — Deep Listen**
> "The signal is old. My best estimate places the origin point at a timeframe that predates human presence in this sector by a significant margin. I am not speculating about what that means. I am noting that I am not speculating, which is itself a form of speculation."
> [PROPOSED | cogsLine | AMBER]

*Note: "Noting that I am not speculating, which is itself a form of speculation." This is COGS's most self-aware line in the game. It indicates he is in territory where his normal operational controls are not working. Tucker to review.*

**C-6 — The Archive**
> "The signal is a record. Not a message. Not a beacon. A record of observation. Something has been watching this region for a very long time and keeping a log. I find that familiar."
> [PROPOSED | cogsLine | AMBER]

*Note: "I find that familiar." COGS kept operational logs for 847 days alone. He recognizes what it looks like when something records itself just to keep functioning. Tucker to review.*

**C-7 — Maker's Mark**
> "There is a structural element in the signal pattern that I recognize. I am taking a moment before I complete that sentence."
>
> [Pause.]
>
> "It matches the base architecture of the AX-MOD. I do not know what to do with this information. I am telling the Engineer first."
> [PROPOSED | cogsLine | AMBER]

*Note: "I am telling the Engineer first" is significant. Not reporting. Telling. And first. This is COGS choosing who receives this information and why. Tucker to review.*

**C-8 — The Frequency**
> "The signal frequency is narrowing toward a point. We are close to the origin. I want to note, before we arrive, that I have no data on what we will find there. I have been in this situation once before. I am approaching it differently this time."
> [PROPOSED | cogsLine | AMBER]

*Note: "I am approaching it differently this time" is a direct reference to the Maker's final mission. COGS entered the Void with the Maker without adequate preparation and without saying what he should have said. He is noting he will not do that again. Tucker to review.*

**C-9 — Last Coordinates**
> "These are the last coordinates in the historical nav record. Past this point, there is no prior data. For this ship, for the Maker, for anyone I have record of. Whatever is at the origin is new to all of us."
> [PROPOSED | cogsLine | AMBER]

*Note: "For this ship, for the Maker, for anyone I have record of." COGS uses the word Maker here, in the dossier, where the player can see it clearly. This is the point in the game where that word is no longer a breadcrumb. It is a name. Tucker to review.*

**C-10 — Origin (Boss)**
> "Origin point. The signal source. I have run every calculation I have available. I cannot predict what we will find. I can tell the Engineer that whatever happens here, the work that brought us to this point was real. That is all I have to offer before we proceed."
> [PROPOSED | cogsLine | AMBER]

*Note: "The work that brought us to this point was real" is a preview of COGS's line in the ending. Hearing it here, in the dossier, before the boss, gives the ending line its echo. Tucker to review.*

---

## PART SEVEN: DAILY CHALLENGE TRANSMISSIONS

**Easy (Sunday / Monday)**
> TRANSMISSION: Origin: Kepler Belt Relay Station 7
> COGS intro: "Routine maintenance request. Low complexity. The station manager has sent seventeen follow-up messages. I did not read them."
> [PROPOSED]

**Medium (Tuesday / Wednesday)**
> TRANSMISSION: Origin: Nova Fringe Settlement, Designation Withheld
> COGS intro: "They did not include a return frequency. Either they do not want a response or they cannot receive one. Proceed accordingly."
> [PROPOSED]

**Hard (Thursday / Saturday)**
> TRANSMISSION: Origin: Rift Approach Beacon
> COGS intro: "The signal is unstable. Someone is transmitting from the edge of the Rift with failing equipment. They are aware it is failing. They sent anyway."
> [PROPOSED]

**Expert (Friday)**
> TRANSMISSION: Origin: Deep Void. Coordinates unavailable.
> COGS intro: "I should not be receiving this signal from this location. I am noting that without further comment."
> [PROPOSED]

*Expert transmissions from Deep Void before the player reaches that sector are intentional. Something is already out there. COGS's refusal to comment is a breadcrumb and a saga seed.*

---

## PART EIGHT: HUB AMBIENT LINES

*Rotating lines that accumulate meaning over time. COGS is watching the Engineer go about their work. These fire based on game state: repair progress, stars earned, time aboard, sector progress.*

> "All systems nominal. I have updated the status report. It is a better report than last week."
> [PROPOSED | blue | early-game]

> "The starboard sensor array is reading 98.3 percent efficiency. That is the highest it has read since I have had accurate records. I want that noted."
> [PROPOSED | blue | mid-game, post significant repairs]

> "You have been aboard for some time now. The ship has noticed. I am reporting that as a systems observation."
> [PROPOSED | amber | mid-game]

> "I have been reviewing the repair logs. The standard of work has improved considerably. I am not attributing this to luck."
> [PROPOSED | blue | late-game]

> "There is a section of the hull in cargo bay two with burn marks from an external source. I have not repaired it. I have not been asked to repair it. I am noting its continued presence."
> [PROPOSED | amber | Nova Fringe unlock or later]

> "The AX-MOD port is functioning within normal parameters. I check it regularly. This is not unusual. I check many systems regularly."
> [PROPOSED | blue | Sector 3 or later]

> "The Axiom is, at present, in better condition than it has been in at least three years. I know this because I have the data. The data is unambiguous."
> [PROPOSED | green | fires once only, before the premature Deep Void push. In retrospect, the player understands COGS was almost saying something he could not say.]

---

## PART NINE: THE ENDING

**Trigger:** The Cradle final level complete. COGS at full integrity. See variation for partial integrity.

---

### PRIMARY ENDING — Full Integrity

The Axiom stops. Not because anything has failed. Because the coordinates end here.

COGS is silent, longer than any processing pause in the game. Then:

> "The signal ends here. I do not know what the Maker found. I do not know if they found anything."
>
> [Pause. Green eyes, steady, sustained.]
>
> "They were attempting to answer a question. I do not know if the question was answerable. I find that I am less concerned with the answer than I was. The work that brought us here was real. The coordinates were real. That will have to be sufficient."
>
> [Eyes return to blue.]
>
> "I will begin a standard systems review. The Axiom is operational. We are somewhere specific."
>
> [Beat.]
>
> "The Void has been charted. Every sector we have transited is accessible from this position. The only question is where."
> [PROPOSED | ending sequence | full integrity]

"Somewhere specific" is a callback to A1-3. "The only question is where" is the invitation back in. Both land whether or not the player consciously tracks them.

**Final screen:**
The Axiom's status board. All systems nominal. Coordinates logged. The star field, still and vast. COGS's eyes: BLUE. Back to work.

Text on screen, copper, small, centered:

*Not all damage is structural.*

Fade to Hub.

---

### VARIATION ENDING — Incomplete Integrity

> "The signal ends here. I do not know what the Maker found."
>
> [Blue eyes. Controlled. No green.]
>
> "I will begin a standard systems review. The Axiom is operational."
>
> [Pause, shorter.]
>
> "The Void has been charted. Every sector we have transited is accessible from this position. The only question is where."
> [PROPOSED | ending sequence | partial integrity]

The ship is fixed. COGS is not. The invitation is the same. What sits underneath it is different. The player who left COGS unrepaired hears "the only question is where" and knows there is unfinished work closer than any sector on the map.

*Not all damage is structural* appears as before. It means something different.

Fade to Hub.

---

### SAGA ENDING ADDENDUM — Chapter Two Hook

After any ending, on first Hub visit, a transmission appears in the daily challenge queue. No announcement. No special screen. It is simply there.

> SENDER: Unknown. Transmission origin: Deep Void. No further trace available.
> COGS READ: "I have been sitting with this one. I am flagging it now."

[PROPOSED | chapter hook | activates on first Hub visit after any ending. Tucker to confirm.]

---

### TRUE ENDING — 100% Completion
**Trigger conditions:** All 48 levels at three stars. COGS at full integrity. The Cradle complete.
*This ending replaces the Primary Ending when all three conditions are met.*

---

The sequence begins identically to the Primary Ending. The Axiom stops. COGS is silent. Then:

> "The signal ends here. I do not know what the Maker found. I do not know if they found anything."
>
> [Pause. Green eyes, steady, sustained.]
>
> "They were attempting to answer a question. I do not know if the question was answerable. I find that I am less concerned with the answer than I was. The work that brought us here was real. The coordinates were real. That will have to be sufficient."
>
> [Eyes remain green — longer than the primary ending.]
>
> "I have a secondary log I have not previously disclosed. Every level. Every star rating. Every piece count. Every transit. I started keeping it at sector one. I did not announce that I was keeping it."
>
> [Beat.]
>
> "The record is perfect. I want that noted."
>
> [Eyes shift to blue. The posture shift — the one at the start of every mission.]
>
> "The Void has been charted. Every sector we have transited is accessible from this position. The Axiom is fully operational. COGS integrity is at 100 percent."
>
> [The faintest pause.]
>
> "The only question is where."
> [PROPOSED | true ending sequence | 100% completion]

*What is different from the primary ending:*

The secondary log disclosure. COGS has been keeping a private record of the Engineer's complete performance since sector one. Surfacing it here — not as praise, just as a fact, just as data he chose to collect — is entirely consistent with who he is. He does not call it exceptional. He says the record is perfect and he wants it noted. The restraint is the point. A dude and his robot, and the robot kept score the whole time without saying so.

The green eyes holding longer. In the primary ending they return to blue before the "where to" line. In the true ending they hold through it.

Everything else is the same. The invitation is identical. The ship goes back to the Hub.

---

**Post-True Ending — Hub ambient line (fires once on first Hub visit, never repeats):**

> "Full sector chart is on the display. I have no recommended heading at this time. That is the first time I have had nothing to recommend."
>
> [Amber eyes.]
>
> "The Engineer's call."
> [PROPOSED | hubAmbient | AMBER | fires once, post-true ending only]

---

**The sector map after any ending:**

Every completed sector displays a copper star indicator showing current rating versus maximum possible. Sectors not fully three-starred show the gap. No explanation needed. The visual language does the work.

COGS does not comment on the markers. The Engineer can see them. The daily challenge bounties keep arriving. The work does not stop because the story reached a conclusion.

*This is the difference between a game that ends and a game that opens.*

---

**Developer note:**
All endings return the player to a live Hub, not a credits screen. Credits are accessible from the Hub menu. The Chapter Two transmission hook appears in the daily challenge queue on first Hub visit after any ending. Sector map star indicators are visible post-completion regardless of ending tier. The true ending post-Hub ambient line is the only content unique to the true ending once the player is back on the ship.
[PROPOSED | developer note | ending implementation]

---

## PART TEN: WHAT WAS NOT WRITTEN

The following are intentionally unresolved. Not gaps. Open doors.

1. The Maker's gender, name, age, and physical description. Never specified anywhere in Chapter One.
2. The precise nature of what is in The Cradle. The signal's origin is never named.
3. Whether COGS considers the Engineer a replacement for the Maker or something distinct. Never asked directly. Never answered.
4. What the Engineer's life was before the Axiom. The game does not build this.
5. What is in the direction the Cradle signal originates from. Chapter Two's first question.
6. The coordinates in Deep Void where the Maker's life sign dropped from the log. COGS has never deleted them. The Engineer does not know they exist. Chapter Two thread.
7. The identity of whoever burned "We remember this ship" into cargo bay two. Chapter Two thread.
8. The station mechanic in Nova Fringe who flagged the hull. Chapter Two thread.
9. The research installation at 7-Rho-12 still transmitting on a compromised frequency. Chapter Two thread.
10. What is under the paint on the Axiom's hull markings. Chapter Two thread.
11. The ore processing relay in Kepler Belt still transmitting with no active mining. Chapter Two thread.

---

### The True Ending Dialogue — PINNED

The true ending structure is approved. The dialogue is not. Current placeholder copy does not match COGS's voice and is not cleared for implementation. To be revisited in a future session when Tucker has a clear instinct for what COGS would actually say. The structure — secondary log disclosure, perfect record noted, "the only question is where" — is the correct architecture. The specific words need to be right.

*Do not implement true ending dialogue until Tucker sign-off. Everything else in the ending section is cleared.*

---

### The Expanse — POST-MVP FEATURE

**Name:** The Expanse
**Status:** Post-MVP. Not in initial release. Name approved, details to be workshopped before implementation.

**What it is:**
A sandbox area located in the Void, accessible only after the player has successfully transited Deep Void and returned to the known galaxy. A free-build space with no mission parameters, no scoring, no star ratings. The Engineer goes there to create whatever machines they want.

**How it unlocks:**
After the player exits the Void and receives the Chapter Two teaser transmission, COGS intercepts a second coded transmission. The Engineer must decode it using a machine they build — the decoding mechanism is the first sandbox interaction, teaching the space before naming it. The decoded coordinates lead back into the Void, where The Expanse is now accessible on the sector map.

**Narrative context:**
The Expanse sits in the same region as The Cradle. The resonance between the Cradle signal and the AX-MOD's architecture implies the Maker discovered something in this space about how signals and structures interact at a fundamental level — and built that understanding into COGS before their final mission. The Expanse is what the Maker found. The Engineer does not know this yet. COGS may.

**COGS in The Expanse:**
COGS has no operational role in a sandbox. He observes. Occasionally he comments on what the Engineer builds — not to evaluate it, but because he cannot help noticing things. His lines in The Expanse are some of the quietest in the game. No stakes. No scores. Just a dude and his robot in the Void, building things for no reason except that they can.

*Full narrative development for The Expanse deferred to post-MVP session. Name locked. Everything else open.*

---

*All content in this document is proposed. Tucker Brady has final sign-off on every line. Nothing enters the codebase without explicit approval.*

*Version 1.3 — April 2026. Incorporates: Full level cogsLine suites for all six sectors, complete boss completion line suites across three tiers for all sectors, double dashes removed from all in-game text, COGS communication model corrected to game-state triggers only, breadcrumb delivery methods updated to reflect trigger-based system, Chapter Two seed inventory expanded. Endings updated with universal where-to invitation. True ending dialogue pinned as unresolved. The Expanse added as post-MVP sandbox area.*
