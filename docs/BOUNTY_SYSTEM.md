# THE AXIOM — COGS DAILY CHALLENGE BOUNTY SYSTEM
### Companion Document to Narrative Design Document v1.2
### Version 1.0 — For Tucker Brady Review and Sign-Off

---

> **USAGE NOTE FOR DEVELOPERS**
> This document defines the generative system for daily challenge bounty transmissions. It replaces the earlier draft which incorrectly framed COGS as the originator of challenges.
>
> **The correct model:**
> Bounties are posted by anyone in the galaxy. Colonists, merchants, military contractors, criminals, research institutions, anonymous sources, other ships, unknown entities. COGS intercepts these transmissions through the Axiom's communication array and presents them to the Engineer. He does not generate the work. He filters, reads, and relays it — with his own editorial attached.
>
> Occasionally COGS posts a bounty himself. This is rare. When it happens it feels different from every other transmission. It should.
>
> **Transmission structure — three visible fields in the dossier:**
> - `SENDER` — who posted the bounty. Displayed as a designation, not a name. Ranges from registered entities to completely anonymous.
> - `TRANSMISSION BODY` — the actual bounty request. Brief. Functional. Written in the voice of whoever sent it.
> - `COGS READ` — COGS's one or two line editorial on the sender and situation. This is where his character lives.
>
> **Generative architecture:**
> Each field is drawn from a pool specific to its difficulty tier. The date seed selects one entry from each pool independently. The three fields are designed to combine coherently regardless of which combination is selected, but they do not need to match perfectly — a slightly misaligned COGS read on a sender is realistic and sometimes more interesting than a clean match.
>
> **Pool sizing target:** Minimum 30 unique daily combinations per tier before repetition. Achieved by maintaining pools of at least 6 SENDER options, 5 TRANSMISSION BODY options, and 6 COGS READ options per tier.
>
> **One additional field: `REWARD LINE`**
> A brief COGS line that appears when the credit reward is displayed. Rotates from a pool of 5 per tier, independent of the other components.
>
> All content marked **[PROPOSED]** requires Tucker Brady sign-off before implementation.

---

## PART ONE: EASY TIER
### Sunday / Monday | Reward: 150 CR
*Senders: Registered colonial entities, relay station operators, transit authority contractors, maintenance crews. The work is real but it is not urgent. COGS treats these with measured efficiency. He does not dismiss them. He does not dramatize them.*

---

### SENDER Pool — Easy (6 options)

> SENDER: Kepler Belt Colonial Operations, Station 7
> [PROPOSED | Easy | Sender 1]

> SENDER: Transit Authority Maintenance Division, Kepler Corridor
> [PROPOSED | Easy | Sender 2]

> SENDER: Registered Resupply Contractor, Kepler Belt
> [PROPOSED | Easy | Sender 3]

> SENDER: Colonial Relay Operator, Outer Kepler
> [PROPOSED | Easy | Sender 4]

> SENDER: Infrastructure Maintenance Guild, Kepler Sector
> [PROPOSED | Easy | Sender 5]

> SENDER: Independent Contractor, Transit Corridor Registration Active
>[PROPOSED | Easy | Sender 6]

---

### TRANSMISSION BODY Pool — Easy (5 options)

*Written in the voice of the sender. Functional. Unremarkable. The work is clear.*

> "Relay node 7-C is running at reduced capacity. Standard maintenance required. Bounty posted for completed repair certification. One attempt only. Terms attached."
> [PROPOSED | Easy | Body 1]

> "Corridor junction showing signal degradation. Not critical. Affecting resupply scheduling. Posting bounty for resolution. Straightforward work, fair rate."
> [PROPOSED | Easy | Body 2]

> "Routine infrastructure maintenance required on transit relay. No hazards flagged. Compensation reflects task complexity. Reply not required, completion logged automatically."
> [PROPOSED | Easy | Body 3]

> "Signal array at colonial hub running below optimal. Colonists unaffected currently. Would prefer to address before that changes. Standard bounty terms."
> [PROPOSED | Easy | Body 4]

> "Maintenance request logged for outer relay chain. We have tried to address internally. We do not have the technical capacity. Bounty is fair. Work is not complicated."
> [PROPOSED | Easy | Body 5]

---

### COGS READ Pool — Easy (6 options)

*COGS is not excited about these. He is not dismissive either. He is practical.*

> "Registered sender. Legitimate work. The station manager has sent four follow-up transmissions since the initial post. I did not read them."
> [PROPOSED | Easy | Read 1]

> "Transit authority contractor. Verified registration. The work is what it says it is. I have no concerns about proceeding."
> [PROPOSED | Easy | Read 2]

> "The sender is registered. The task is routine. I flagged this one because the rate is fair and the location is convenient. That is the full extent of my reasoning."
> [PROPOSED | Easy | Read 3]

> "Standard maintenance bounty. Registered origin. Nothing unusual about the sender or the request. I recommend we address it and move on."
> [PROPOSED | Easy | Read 4]

> "Verified contractor. Clean record. The work is exactly what the description says. I find that straightforward requests are sometimes more reliable than complicated ones."
> [PROPOSED | Easy | Read 5]

> "Colonial operations hub. Registered, active, no flags. The transmission is the twelfth I have received from this sender. They post regularly. They pay reliably. I continue to flag their requests."
> [PROPOSED | Easy | Read 6]

---

### REWARD LINE Pool — Easy (5 options, rotate weekly)

> "150 Credits on completion. The rate is appropriate. The work is not complicated."
> [PROPOSED | Easy | Reward 1]

> "Bounty: 150 Credits. Standard rate for standard work. The terms are clear."
> [PROPOSED | Easy | Reward 2]

> "Compensation is 150 Credits. I have verified the sender's credit history. They pay."
> [PROPOSED | Easy | Reward 3]

> "150 Credits available. Nothing complicated about the arrangement."
> [PROPOSED | Easy | Reward 4]

> "The bounty is 150 Credits. I flagged this one. The reward reflects my assessment of the task."
> [PROPOSED | Easy | Reward 5]

---

## PART TWO: MEDIUM TIER
### Tuesday / Wednesday | Reward: 200 CR
*Senders: Outer settlement operators, Nova Fringe residents, independent traders, anonymous but plausibly legitimate sources, small criminal enterprises posting legal work. The senders here are less predictable. COGS pays closer attention. His reads carry more weight.*

---

### SENDER Pool — Medium (6 options)

> SENDER: Nova Fringe Settlement, Designation Withheld by Request
> [PROPOSED | Medium | Sender 1]

> SENDER: Independent Trader, Registration Lapsed, Currently Active
> [PROPOSED | Medium | Sender 2]

> SENDER: Anonymous. Transmission routed through three relay points.
> [PROPOSED | Medium | Sender 3]

> SENDER: Freehold Operations, Nova Fringe Outer Boundary
> [PROPOSED | Medium | Sender 4]

> SENDER: Salvage Contractor, Outer Kepler. No fixed registration.
> [PROPOSED | Medium | Sender 5]

> SENDER: Small Merchant Collective, Nova Fringe. Pooled bounty posting.
> [PROPOSED | Medium | Sender 6]

---

### TRANSMISSION BODY Pool — Medium (5 options)

*The voice here is more varied. Some of these senders are not used to writing bounty requests. Some are very used to it.*

> "We have a signal routing problem that is costing us time and credits. We cannot afford to let it continue. We are not able to specify the exact nature of the problem in this transmission. The work will be clear on site. Rate is fair. One attempt."
> [PROPOSED | Medium | Body 1]

> "Bounty posted for relay repair. This is not a complicated job. We have had two contractors fail it already. We do not know why. We are not asking questions about methodology. We want it done."
> [PROPOSED | Medium | Body 2]

> "Signal infrastructure repair needed at coordinates included separately. Do not transmit coordinates on open channels. The work is legitimate. The discretion request is also legitimate. Rate reflects both."
> [PROPOSED | Medium | Body 3]

> "Our communication array has been running at reduced capacity for eleven days. We have lost two trade contracts as a result. The bounty reflects what those contracts were worth to us. Fix it."
> [PROPOSED | Medium | Body 4]

> "Repair work available. We are not going to oversell it. It is harder than it looks. The previous operator said it was impossible. It is not impossible. It is just harder than it looks. Fair rate for difficult work."
> [PROPOSED | Medium | Body 5]

---

### COGS READ Pool — Medium (6 options)

*COGS is more engaged here. Some of these senders are interesting to him. Some concern him mildly. He does not hide either state.*

> "The sender withheld their designation by request. That is allowed in the outer settlements. The work itself appears legitimate based on the technical description. I am recommending it on the strength of the job, not the sender."
> [PROPOSED | Medium | Read 1]

> "Routed through three relay points. Someone wanted the origin obscured. The technical request is genuine. Whether the reason for obscuring the origin is something we need to know is a question I cannot answer from here."
> [PROPOSED | Medium | Read 2]

> "Independent trader with a lapsed registration. That is common in Nova Fringe. Not an automatic concern. I flagged this one because the rate is above standard for the described work, which usually means the work is more complicated than described. The Engineer should know that."
> [PROPOSED | Medium | Read 3]

> "Freehold posting. Nova Fringe outer boundary. I have received three prior transmissions from this sender. They paid on the first two. The third is pending. I am flagging this with that context attached."
> [PROPOSED | Medium | Read 4]

> "Small merchant collective. Pooled bounty. Multiple signatories on the posting, none of them individually large enough to post this rate. They combined. I find that detail worth noting. It suggests the problem has affected more than one operation."
> [PROPOSED | Medium | Read 5]

> "Two previous contractors failed this job according to the sender's own transmission. I want the Engineer to have that information before accepting. It is not a reason to decline. It is context."
> [PROPOSED | Medium | Read 6]

---

### REWARD LINE Pool — Medium (5 options, rotate weekly)

> "200 Credits on completion. Above standard rate. The sender knows what the work is worth."
> [PROPOSED | Medium | Reward 1]

> "Bounty: 200 Credits. The rate reflects the sender's urgency, not just the task complexity."
> [PROPOSED | Medium | Reward 2]

> "200 Credits available. I have flagged the payment terms. One attempt. No partial credit."
> [PROPOSED | Medium | Reward 3]

> "Compensation: 200 Credits. The pooled bounty means multiple parties are watching this completion. I am noting that as context."
> [PROPOSED | Medium | Reward 4]

> "200 Credits. The sender paid two prior contractors before posting this. Their credit is established. Their patience may not be."
> [PROPOSED | Medium | Reward 5]

---

## PART THREE: HARD TIER
### Thursday / Saturday | Reward: 250 CR
*Senders: Rift-adjacent operations, military contractors, research institutions, known criminal organizations posting legitimate work, unregistered entities with resources, sources COGS cannot fully identify. COGS reads these carefully. His editorials are longer. There is something in them that is not quite concern but is adjacent to it.*

---

### SENDER Pool — Hard (6 options)

> SENDER: Rift Approach Research Station, Designation 7-Rho-12
> [PROPOSED | Hard | Sender 1]

> SENDER: Military Logistics Contractor, Unspecified Division
> [PROPOSED | Hard | Sender 2]

> SENDER: Unknown. Transmission origin traces to Rift boundary.
> [PROPOSED | Hard | Sender 3]

> SENDER: Independent Research Vessel, Deep Survey Class
> [PROPOSED | Hard | Sender 4]

> SENDER: Criminal Enterprise, Registration Suspended. Bounty posting rights intact under Fringe Accord.
> [PROPOSED | Hard | Sender 5]

> SENDER: Coalition of Outer Settlements, Emergency Posting
> [PROPOSED | Hard | Sender 6]

---

### TRANSMISSION BODY Pool — Hard (5 options)

*The voice here has weight. These senders know what they are asking for and why.*

> "Signal routing failure at Rift approach coordinates. We are operating in a degraded state. We cannot transit without this repair. We are aware of the difficulty. The rate reflects the difficulty. One attempt. We do not have time for more."
> [PROPOSED | Hard | Body 1]

> "Military logistics require a signal relay repaired at coordinates enclosed. The work is time-sensitive. Failure has downstream consequences we are not authorized to specify. The rate is what the timeline demands. Discretion required."
> [PROPOSED | Hard | Body 2]

> "We have been transmitting on a compromised frequency for six days. We are aware the frequency is compromised. We do not have an alternative. We need a repair contractor who can work in unstable signal conditions. Most cannot. The rate assumes the Engineer can."
> [PROPOSED | Hard | Body 3]

> "Research vessel has suffered signal array damage near Rift boundary. We can maintain position for approximately seventy-two hours. After that the drift will take us past recoverable range. The bounty is everything we have available. We are not negotiating."
> [PROPOSED | Hard | Body 4]

> "Emergency coalition posting. Fourteen settlements have lost primary signal routing simultaneously. The failure point is a single relay in a difficult location. We are pooling every available credit. We need this fixed before the next resupply window or people go without."
> [PROPOSED | Hard | Body 5]

---

### COGS READ Pool — Hard (6 options)

*COGS is alert here. Not alarmed. Alert. There is a difference and he maintains it.*

> "The sender is the research installation at 7-Rho-12. I have received their transmissions before. They are not given to exaggeration. If they say they cannot transit without this repair, they cannot transit without it. I recommend we take this seriously."
> [PROPOSED | Hard | Read 1]

> "Military logistics contractor. Unspecified division. The work is real. The reason they will not specify the downstream consequences is also real. I am flagging this for the Engineer's awareness, not as a reason to decline."
> [PROPOSED | Hard | Read 2]

> "Origin traces to the Rift boundary. I cannot get a cleaner trace than that. The transmission itself is technically sound. Whoever sent this knows what they are doing. They do not want to be found. Those two things are not necessarily in conflict."
> [PROPOSED | Hard | Read 3]

> "Research vessel near the Rift with a seventy-two hour window. I have calculated the drift trajectory. The number is accurate. If we take this we take it now. I am not issuing that as a recommendation. I am issuing it as a timeline."
> [PROPOSED | Hard | Read 4]

> "Criminal enterprise posting under the Fringe Accord. The accord permits this. The work is legitimate regardless of who posted it. I want the Engineer to know I am aware of the source. I am recommending the bounty anyway. The work is real and the affected settlements did nothing to deserve the problem."
> [PROPOSED | Hard | Read 5]

> "Fourteen settlements, emergency posting, everything they have available. The rate is high because they have pooled everything. Not because the work is routine. The Engineer should know the difference before accepting."
> [PROPOSED | Hard | Read 6]

---

### REWARD LINE Pool — Hard (5 options, rotate weekly)

> "250 Credits on completion. The rate reflects urgency. The sender does not have time to negotiate."
> [PROPOSED | Hard | Reward 1]

> "Bounty: 250 Credits. Above standard rate. The difficulty is real. So is the compensation."
> [PROPOSED | Hard | Reward 2]

> "250 Credits available. Emergency posting terms. One attempt. Payment on completion confirmation."
> [PROPOSED | Hard | Reward 3]

> "Compensation: 250 Credits. This is the pooled total from fourteen settlements. I want that noted. It is not an abstraction."
> [PROPOSED | Hard | Reward 4]

> "250 Credits. The rate is what the timeline demands. I have flagged the window. The Engineer should consider both."
> [PROPOSED | Hard | Reward 5]

---

## PART FOUR: EXPERT TIER
### Friday | Reward: 350 CR
*Senders: Deep Void adjacent, completely unknown, entities that should not be able to post bounties by any registered mechanism, sources that concern COGS in ways he does not fully articulate. Some of these senders COGS cannot identify at all. Some of them he suspects he could identify if he looked harder. He has chosen not to look harder. He flags them anyway because the work is real.*

---

### SENDER Pool — Expert (6 options)

> SENDER: Unknown. Transmission origin: Deep Void. No further trace available.
> [PROPOSED | Expert | Sender 1]

> SENDER: Unregistered. Signal characteristics consistent with Deep Void survey class vessel.
> [PROPOSED | Expert | Sender 2]

> SENDER: Designation redacted. Transmission authenticated through an unknown protocol.
> [PROPOSED | Expert | Sender 3]

> SENDER: No designation. Transmission routed through the Axiom's own nav beacon. I do not know how.
> [PROPOSED | Expert | Sender 4]

> SENDER: Unknown entity. Signal origin consistent with coordinates in historical nav record.
> [PROPOSED | Expert | Sender 5]

> SENDER: C.O.G.S Unit 7, Axiom Internal Post.
> [PROPOSED | Expert | Sender 6]

*Note on Sender 4: "Routed through the Axiom's own nav beacon" is a significant story beat. Something used the Axiom's own infrastructure to post a bounty to itself. COGS does not explain this. Tucker to review for saga implications.*

*Note on Sender 5: "Coordinates in historical nav record" is a direct reference to the Deep Void breadcrumb. Something at the coordinates where the Maker's life sign dropped from the log has posted a bounty. COGS is flagging it. He is not commenting on what it means. Tucker to review.*

*Note on Sender 6: COGS posting his own bounty. Rare. Should not appear more than once every few weeks in the rotation. Tucker to confirm frequency cap.*

---

### TRANSMISSION BODY Pool — Expert (5 options)

*Some of these are clearly written by entities operating at the edge of what language can describe. Some are precise to the point of being unsettling. One is COGS.*

> "Signal relay failure at coordinates enclosed. Repair required. The difficulty is not the repair. The difficulty is the location. You have been to this location before. Your guidance system has records. The rate is what the work requires. One attempt."
> [PROPOSED | Expert | Body 1]

*Note: "Your guidance system has records" implies the sender knows the Axiom and knows COGS. This is intentional. Tucker to review.*

> "The signal array at these coordinates is degraded. It is not degraded from neglect. Something is causing active interference. The interference has a pattern. The pattern is not random. The bounty covers the repair. What the Engineer does with the pattern is their own decision."
> [PROPOSED | Expert | Body 2]

> "This transmission will be received by one ship. We have confirmed the recipient. The work is at coordinates we are not including in this body. The coordinates will be available to your guidance system on acceptance. We do not transmit them openly."
> [PROPOSED | Expert | Body 3]

*Note: "One ship. We have confirmed the recipient." Something specifically targeted the Axiom. Tucker to review for saga implications.*

> "Repair work available. Deep Void location. The conditions are unlike standard operational parameters. The rate reflects that. The Engineer should know that prior contractors have declined this posting. That is the complete information we are providing."
> [PROPOSED | Expert | Body 4]

> "I have identified a signal degradation point that is affecting the Axiom's long-range communication capability. The Engineer has not noticed yet. I have chosen to post this as a bounty rather than simply flagging it as a maintenance task because I want to see how the Engineer approaches a problem when they know I know about it. The rate is what the repair is worth. The methodology is the actual point."
> [PROPOSED | Expert | Body 5]

*Note: Body 5 is COGS's internal post. He is testing the Engineer. He is also being transparent about the fact that he is testing them, which is its own kind of COGS. This body only pairs with Sender 6. Tucker to review.*

---

### COGS READ Pool — Expert (6 options)

*COGS is careful here. His reads on expert transmissions are the most revealing lines in the daily challenge system. He is not panicking. He is paying very close attention.*

> "I should not be receiving this signal from this location. I am noting that without further comment. The work itself is real. I have verified the technical parameters independently. What I cannot verify is the sender. I am flagging this for the Engineer's full awareness."
> [PROPOSED | Expert | Read 1]

> "The sender used an authentication protocol I do not recognize. I have checked against every registered and unregistered protocol in my database. No match. The signal is genuine. The protocol is unknown. I am recommending this bounty because the work is real. I want the Engineer to understand that I have flagged everything else about it."
> [PROPOSED | Expert | Read 2]

> "This transmission was routed through the Axiom's own nav beacon. I do not have an explanation for how that is possible. I have run three diagnostics. The beacon has not been compromised. Something used it anyway. I am still working on what that means. I am flagging the bounty in the meantime because the work exists regardless of how the transmission arrived."
> [PROPOSED | Expert | Read 3]

> "The signal origin is consistent with coordinates I have in the historical nav record. I am going to leave that statement where it is and not add to it. The work is real. The rate is legitimate. The Engineer should decide with full awareness that I know where this came from and have chosen to present it anyway."
> [PROPOSED | Expert | Read 4]

*Note: Read 4 pairs most naturally with Sender 5. COGS is acknowledging that something at the coordinates where the Maker disappeared has posted a bounty, and he is choosing to present it anyway. That choice is a story beat. Tucker to review.*

> "I cannot identify the sender. That is not a statement I make often. I have considerable capability for tracing transmission origins. This one terminates at a point I cannot trace past. The work is legitimate by every technical measure I can apply. I am recommending it because declining unknown senders is a policy I do not have and do not want. But I am telling the Engineer everything I know, which in this case is very little."
> [PROPOSED | Expert | Read 5]

> "I posted this one. The technical problem is real. The rate is accurate. The rest of it I will explain when the Engineer accepts. I recommend accepting."
> [PROPOSED | Expert | Read 6]

*Note: Read 6 is COGS's read on his own post. The understatement of "I will explain when the Engineer accepts" is very COGS. Tucker to review.*

---

### REWARD LINE Pool — Expert (5 options, rotate weekly)

> "350 Credits on completion. The rate reflects the location and the conditions. The sender does not appear to be negotiating."
> [PROPOSED | Expert | Reward 1]

> "Bounty: 350 Credits. I have verified the payment mechanism to the extent I am able. Which is not as far as I would prefer."
> [PROPOSED | Expert | Reward 2]

> "350 Credits available. The rate is the highest in the current bounty pool. The difficulty justifies it. So does everything else about this posting."
> [PROPOSED | Expert | Reward 3]

> "Compensation: 350 Credits. I want to note that the rate was set by the sender without negotiation or counter-posting. They knew the number before they sent it. That implies familiarity with the work and with standard contractor rates. I am adding that to the file."
> [PROPOSED | Expert | Reward 4]

> "350 Credits. The bounty is mine. The repair is real. The methodology observation is free."
> [PROPOSED | Expert | Reward 5]

*Note: Reward 5 is COGS's reward line for his own post. Tucker to review.*

---

## PART FIVE: SPECIAL TRANSMISSION TYPES

*Fires on specific calendar dates or game-state conditions regardless of daily difficulty tier. These override the standard generation for that day.*

---

### The Axiom Anniversary Transmission
*Fires on the one-year anniversary of the player's first session.*

> SENDER: C.O.G.S Unit 7, Axiom Internal Post
>
> TRANSMISSION BODY: "One year. I have reviewed the mission log. The work has been consistent. The results have been above standard. I do not have a formal framework for marking this kind of interval. I am posting a bounty because it is the vocabulary we both understand. The work is real. So is the reason I chose today."
>
> COGS READ: "I posted this one. The Engineer should know that. The rest is in the transmission."
>
> REWARD: 500 Credits
> [PROPOSED | Special | Anniversary]

---

### The Maker Echo Transmission
*Fires once, triggered by first Deep Void sector entry. Overrides that day's standard challenge. Does not repeat.*

> SENDER: Unknown. Signal characteristics match no registered entity. Origin trace terminates at Deep Void interior.
>
> TRANSMISSION BODY: "The relay at these coordinates requires maintenance. The work is straightforward. The location is not. Someone who knew this location posted this before you arrived. We do not know if they are still able to post transmissions. We are passing it along."
>
> COGS READ: "I have been sitting with this transmission for some time before flagging it. I am flagging it now because not flagging it would be a decision I would have to justify. I cannot justify it. The work is real. Everything else about this transmission I will not comment on."
>
> REWARD: 350 Credits
> [PROPOSED | Special | Maker Echo | fires once on first Deep Void entry]

*Note: "Someone who knew this location posted this before you arrived" is as close as the daily challenge system gets to directly referencing the Maker. The transmission implies the Maker may still be posting bounties from somewhere in Deep Void. It does not confirm this. COGS refuses to comment. Tucker to review carefully — this is a significant story beat delivered through the daily challenge system.*

---

### The COGS Self-Diagnostic Transmission
*Fires after the second modification in Deep Void. Overrides that day's standard challenge. Does not repeat.*

> SENDER: C.O.G.S Unit 7, Axiom Internal Post
>
> TRANSMISSION BODY: "I have identified a calibration point in the second modification that could be optimized. The Engineer built it correctly. There is room to make it more correct. I am posting this as a bounty because I want the work to be the Engineer's choice, not my maintenance request. The difference matters to me."
>
> COGS READ: "I posted this one. The modification the Engineer built is already functional. This is optional work. I want to be clear that it is optional. I am also posting a 400 Credit bounty for optional work, which should indicate how optional I actually think it is."
>
> REWARD: 400 Credits
> [PROPOSED | Special | Post-Modification | fires once after second modification complete]

*Note: COGS posting optional work on the Engineer's modification at above-standard rate. He is asking them to improve something they built for him. The framing as a bounty rather than a maintenance request is COGS respecting the Engineer's agency. Tucker to review.*

---

## PART SIX: ASSEMBLY RULES FOR DEVELOPERS

> **Standard daily challenge generation:**
> 1. Determine difficulty tier from day of week
> 2. Use date seed to select one SENDER, one BODY, one READ, one REWARD from the appropriate tier pools
> 3. Assemble in order: SENDER / BODY / READ / REWARD
> 4. Check against last 7 days of generated transmissions — if exact combination has appeared, increment seed by 1 and regenerate READ only
> 5. Log the combination with the date

> **Special transmission priority:**
> Special transmissions override standard generation for that day. If a special transmission fires, no standard generation occurs. The standard generation resumes the following day.

> **Expert tier pairing rule:**
> Body 5 (COGS internal post) must only pair with Sender 6 (COGS internal post) and Read 6 (COGS internal post) and Reward 5 (COGS internal post). The seed should check for this pairing and enforce it — if Sender 6 is selected, Body 5, Read 6, and Reward 5 are automatically selected regardless of other seed outputs.

> **Frequency cap on COGS self-posts:**
> Sender 6 should appear no more than once every 14 days in standard rotation. The seed should enforce this cap. Special transmissions that are COGS posts do not count against the cap.

---

*All content in this document is proposed. Tucker Brady has final sign-off on every line. Nothing enters the codebase without explicit approval.*

*Version 1.0 — April 2026. Full rebuild from earlier draft. Correct sender architecture established. COGS as relay and editorial voice, not originator. Three-field generative system with date-seed component selection. Four difficulty tiers plus special transmission types. Assembly rules for developer implementation.*
