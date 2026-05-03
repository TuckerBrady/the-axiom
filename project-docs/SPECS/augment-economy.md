# THE AXIOM — AUGMENT ECONOMY SPEC
### Feature Specification | Version 1.0 | May 2026
### Status: PROPOSED — Awaiting Tucker Brady Sign-Off

---

> **USAGE NOTE FOR DEVELOPERS**
> This document defines the augment system — a layer of consumable and rechargeable power-ups that change board conditions without solving puzzles for the Engineer. Augments integrate with the existing credit economy and requisition flow. They do not replace pieces, tapes, or any existing resource. They expand the Engineer's strategic options at the planning stage.
>
> **Core principle: change conditions, not answers.** An augment never places a piece, completes a path, or bypasses a puzzle requirement. It changes what the Engineer can see, how much time they have, or what happens when something goes wrong. The machine is still theirs to build.
>
> **Visual language:** Neon mint (#00FFC8), hexagonal shape. Augments are visually distinct from Physics pieces (amber) and Protocol pieces (blue). They occupy their own namespace in the UI.
>
> **Free-to-play guarantee:** Every level in The Axiom is solvable without augments. Augments make the work easier or more forgiving. They never make the work possible. A player who never touches the augment system will never hit a wall because of it.
>
> All content marked **[PROPOSED]** requires Tucker Brady sign-off before implementation.

---

## PART ONE: ACQUISITION — THE STREAK SYSTEM

Augments are primarily earned through consistent performance. The streak system rewards Engineers who show up, build well, and do it repeatedly. Credits remain the currency. Augments are the recognition.

### 1.1 Streak Types

Two independent streak counters run simultaneously:

**Win Streak** — consecutive level completions (any star rating, including 1-star). Resets on void (0-star) result. Failing and retrying does not break the streak as long as the Engineer eventually completes the level before moving on.

**Prestige Streak** — consecutive 3-star completions. Resets on any result below 3 stars. This is the hard streak. It rewards Engineers who are not just completing levels but mastering them.

Daily challenge completions count toward both streaks. A 3-star daily challenge advances both the Win Streak and the Prestige Streak.

[PROPOSED]

### 1.2 Streak Reward Thresholds

**Win Streak rewards:**

| Streak Length | Reward |
|---------------|--------|
| 3 wins | 1 Common augment (random from Common pool) |
| 5 wins | 1 Common augment (player's choice from Common pool) |
| 8 wins | 1 Uncommon augment (random from Uncommon pool) |
| 12 wins | 1 Uncommon augment (player's choice) + 50 CR bonus |
| 15 wins | 1 Rare augment (random from Rare pool) |
| 20 wins | 1 Rare augment (player's choice) + 100 CR bonus |

After the 20-win threshold, the cycle repeats from the 3-win tier. The streak counter continues incrementing but the reward table loops. An Engineer on a 23-win streak receives the 3-win reward again, then the 5-win reward at 25, and so on.

**Prestige Streak rewards:**

| Streak Length | Reward |
|---------------|--------|
| 2 stars-3 | 1 Common augment (player's choice) |
| 4 stars-3 | 1 Uncommon augment (player's choice) |
| 6 stars-3 | 1 Rare augment (player's choice) |
| 8 stars-3 | 1 Rare augment (player's choice) + 150 CR bonus |

Prestige Streak rewards are always player's choice. The Engineer who earns six consecutive 3-star completions has demonstrated they know what they are doing. They pick what they want.

After the 8-streak threshold, the cycle repeats from the 2-streak tier.

[PROPOSED]

### 1.3 Streak Tracker — Visual Design

A persistent streak indicator lives on the Hub screen, adjacent to the credit balance. Two concentric hex rings:

- **Outer ring (neon mint, #00FFC8):** Win Streak progress. Fills clockwise as the streak advances. Segments correspond to the next reward threshold.
- **Inner ring (white, #FFFFFF):** Prestige Streak progress. Same fill mechanic, tighter tolerance.

When a streak reward is earned, the corresponding ring pulses and a hex-shaped augment icon rises from the center. The augment is added to inventory automatically with a brief COGS line.

When a streak breaks, the ring dims and resets. No dramatic failure animation — this is not punitive. It is a counter returning to zero.

[PROPOSED]

### 1.4 Streak Reset Rules

- Win Streak resets on void (0-star) result only. A 1-star completion keeps it alive.
- Prestige Streak resets on any result below 3 stars. Including void.
- Closing the app does not reset streaks. They persist across sessions.
- Streaks are per-Engineer (per save file). Not shared across profiles.
- Replaying already-completed levels does NOT advance streaks. Only first completions and daily challenges count. This prevents farming.

[PROPOSED]

---

## PART TWO: THE TEN AUGMENTS

### 2.1 Augment Roster and Tiers

Each augment is classified into one of three tiers. Tier determines acquisition rarity and credit purchase cost. It does not determine power — a Common augment used well can matter more than a Rare augment used poorly.

**COMMON TIER (neon mint, single hex border)**

| # | Augment | Effect | Category |
|---|---------|--------|----------|
| 1 | Flux Capacitor | Extends the level timer by 30 seconds. Applied at level start. | Time |
| 2 | Waveform Lens | Displays signal flow projection lines on the board during placement phase. Shows where a signal would travel from Source through currently placed pieces. Updates in real time as pieces are moved. | Vision |
| 3 | Insurance Protocol | If the machine fails (void result), the Engineer keeps all purchased pieces in tray for the retry attempt instead of forfeiting them. One use — covers a single failure. | Safety |
| 4 | Salvage Drone | After a void result, recovers 50% of the CR spent on purchased pieces (rounded down). Does not recover pieces — recovers credits. Stacks with Insurance Protocol: if both are active, the Engineer keeps pieces AND gets partial credit refund if the retry also fails. | Recovery |

**UNCOMMON TIER (neon mint, double hex border)**

| # | Augment | Effect | Category |
|---|---------|--------|----------|
| 5 | Spectrograph | Reveals one hidden board element: a damaged cell location, a pre-placed piece's configuration, or the optimal signal entry angle on a complex Source. What it reveals depends on the level. If the level has no hidden information, this augment cannot be requisitioned for it. | Vision |
| 6 | Signal Echo | After running the machine (success or failure), grants one replay of the signal path at 0.5x speed with per-step piece highlighting. Does not change the result — it is diagnostic. The Engineer sees exactly where and why the signal behaved as it did. | Diagnostic |
| 7 | Overclock | Select one piece during placement. That piece operates at enhanced capacity for the level: Conveyors move signal two cells instead of one, Gears rotate adjacent pieces twice, Scanners read two tape positions. Enhancement is piece-specific. | Enhancement |
| 8 | Phase Shift | Select one placed piece after placement is complete but before running the machine. That piece temporarily adopts one property of an adjacent piece category (a Physics piece gains one Protocol behavior or vice versa). Specific cross-category mappings defined per piece in implementation. | Enhancement |

**RARE TIER (neon mint, triple hex border, subtle pulse animation)**

| # | Augment | Effect | Category |
|---|---------|--------|----------|
| 9 | Resonance Probe | Before committing to a full run, the Engineer can execute a partial test: select any contiguous subset of placed pieces and run the signal through just that section. The result shows whether that segment works in isolation. Two partial tests per use. | Diagnostic |
| 10 | Crosslink Beam | Enables one cross-layer connection for the level. A single piece can read from or write to a tape it normally cannot access, or a Physics piece can trigger a Protocol effect (or vice versa). The connection is placed like a piece — the Engineer chooses the source piece, the target, and the interaction. | Architecture |

[PROPOSED]

### 2.2 Augment Availability by Sector

Not all augments are available from the start. Augments unlock as the Engineer progresses through sectors, matching the complexity of the levels where they become relevant.

| Sector | Augments Available |
|--------|--------------------|
| Axiom (tutorial) | None. Augments do not appear in the tutorial sector. |
| Kepler Belt | Flux Capacitor, Insurance Protocol, Waveform Lens |
| Nova Fringe | + Salvage Drone, Spectrograph, Signal Echo |
| The Rift | + Overclock, Phase Shift |
| Deep Void | + Resonance Probe, Crosslink Beam |

The full roster of ten is available only in the final sector. This mirrors the piece discovery arc — the Engineer earns access to more complex tools as they demonstrate readiness.

[PROPOSED]

---

## PART THREE: CONSUMABLE VS. RECHARGEABLE

### 3.1 The Distinction

**Consumable augments** are single-use. Requisition one, use it, it is gone. The inventory count decreases by one.

**Rechargeable augments** are permanent once acquired. They have a cooldown measured in levels completed (not real time). Use one, it enters cooldown, it becomes available again after the Engineer completes a set number of levels.

### 3.2 Classification

| Augment | Model | Rationale |
|---------|-------|-----------|
| Flux Capacitor | Consumable | Time is straightforward. Use it when you need it. Common enough to not worry about scarcity. |
| Waveform Lens | Rechargeable (2-level cooldown) | Vision tools reward learning. The Engineer who uses this repeatedly is learning to read signal flow. That behavior should be encouraged, not taxed per use. |
| Insurance Protocol | Consumable | Safety nets should cost something. The decision to insure is part of the planning challenge. |
| Salvage Drone | Consumable | Credit recovery is a real economic benefit. Single-use keeps it honest. |
| Spectrograph | Consumable | Revealing hidden info is a significant advantage. One and done. |
| Signal Echo | Rechargeable (3-level cooldown) | Diagnostic replay teaches. The Engineer who watches their signal path learn from it. Recharging rewards continued play. |
| Overclock | Consumable | Enhancement is powerful. Each use is a deliberate investment. |
| Phase Shift | Consumable | Cross-category behavior is a major capability shift. Must be spent intentionally. |
| Resonance Probe | Rechargeable (4-level cooldown) | Partial testing is the most educational augment in the system. It teaches the Engineer to think in modules. Recharging it means the Engineer who plays more gets to practice modular thinking more. |
| Crosslink Beam | Consumable | The most architecturally significant augment. Each use reshapes what is possible on the board. Must remain scarce and deliberate. |

[PROPOSED]

### 3.3 Cooldown Rules

- Cooldowns count completed levels only. Void results (0-star) do not advance cooldowns.
- Daily challenge completions advance cooldowns.
- Replaying already-completed levels advances cooldowns. This is intentional — it gives the Engineer a reason to revisit earlier levels beyond star-chasing.
- Cooldowns persist across sessions.

[PROPOSED]

---

## PART FOUR: USAGE INCENTIVES

The augment system fails if Engineers hoard augments and never spend them. The design must make using augments feel smart, not wasteful.

### 4.1 The Augment Bonus — Scoring Integration

When the Engineer requisitions and uses an augment on a level, the scoring engine applies an **Augment Utilization modifier** to the final score. This is not a flat bonus — it scales with how well the augment was actually leveraged.

**Calculation:** If the Engineer used an augment and achieved 2 or 3 stars, the Augment Utilization modifier adds +3 points to the raw score (before star threshold evaluation). This is enough to potentially push a borderline 2-star into 3-star range (score of 77-79 becomes 80-82), but not enough to carry a weak build. Using an augment on a 1-star or void result provides no bonus. The augment is still consumed.

This means: if the Engineer is building well and augments the build, the system rewards the combination. If the Engineer uses an augment as a crutch for a bad build, they get nothing extra and lose the augment.

[PROPOSED]

### 4.2 Inventory Pressure — The Soft Cap

Augment inventory has a soft cap of **5 augments per tier**. The Engineer can hold up to 5 Common, 5 Uncommon, and 5 Rare augments simultaneously (15 total maximum).

When a tier is at capacity and the Engineer earns a new augment of that tier (via streak reward), they must choose: use or discard an existing augment to make room, or forfeit the incoming reward.

This creates natural pressure to use augments rather than stockpile them. The Engineer who hoards hits the cap and starts losing earned rewards. The Engineer who spends regularly always has room for the next one.

COGS acknowledges the cap when it is reached. He does not nag about it.

[PROPOSED]

### 4.3 Streak Spending Incentive

Using an augment on a level does not break a streak, but completing a level with an augment active while on an active Prestige Streak earns a **Streak Amplifier**: the next streak reward is upgraded one rarity tier (Common becomes Uncommon, Uncommon becomes Rare). This amplifier stacks once — it does not cascade.

This creates a positive loop: the Engineer on a Prestige Streak is incentivized to spend augments during the streak (when they are playing well) rather than saving them for when they are struggling.

[PROPOSED]

---

## PART FIVE: CREDIT ECONOMY INTEGRATION

### 5.1 Augments and Credits — The Relationship

Augments can be purchased with credits as an alternative to earning them through streaks. This ensures the free-to-play path always has access, even if the Engineer's streak breaks at an inconvenient time.

**Credit prices by tier:**

| Tier | Price (CR) |
|------|------------|
| Common | 75 CR |
| Uncommon | 150 CR |
| Rare | 300 CR |

For reference: Easy daily challenges pay 150 CR, Medium pay 200 CR, Hard pay 250 CR, Expert pay 350 CR. A Common augment costs half of the easiest daily challenge reward. A Rare augment costs slightly less than an Expert bounty. The prices are set so that an Engineer who completes daily challenges consistently can afford augments through credits alone, but doing so competes directly with piece purchasing. This tension is intentional — credits fund pieces (the core creative loop) and augments (the support layer). The Engineer must choose how to allocate.

Streak acquisition removes this tension. Augments earned through streaks are free. The credit purchase path exists as a safety valve, not the primary channel.

[PROPOSED]

### 5.2 Purchase Flow

Augment credit purchases happen in the Requisition Panel (see Part Seven). They are part of the one-time requisition window. The Engineer cannot buy augments outside of the pre-level flow. No augment shop on the Hub. No mid-level purchases.

This keeps augments firmly inside the planning loop: study the board, assess what you need, buy pieces, buy augments (if desired), build.

[PROPOSED]

### 5.3 Unused Augment Rule

Augments follow the same forfeiture rule as purchased pieces: if the Engineer requisitions a consumable augment for a level and does not trigger it, **the augment is returned to inventory.** It is not forfeited.

This is a deliberate exception to the piece forfeiture rule. Rationale: pieces are placed on the board and physically used in the machine. An un-triggered augment was part of the plan but the plan did not require it. Forfeiting it would punish cautious planning. The Engineer who brings Insurance Protocol "just in case" and then builds a perfect machine should not lose the augment for building well.

Rechargeable augments that are requisitioned but not triggered do not enter cooldown.

[PROPOSED]

---

## PART SIX: AUGMENT INVENTORY

### 6.1 Inventory Structure

The augment inventory is a persistent collection stored per save file. It displays as a hex grid accessible from the Hub screen via a dedicated button (hexagonal, neon mint border, positioned near the credit balance and streak tracker).

Each augment shows:
- Hex icon with tier border (single/double/triple)
- Quantity (for consumables) or cooldown status (for rechargeables)
- Augment name and one-line description

### 6.2 Capacity

- **Soft cap:** 5 per tier (15 total). See Part Four, Section 4.2.
- **Hard cap:** None. The soft cap creates pressure through lost rewards, not a technical wall. An Engineer who only purchases with credits (never earns via streaks) can exceed the soft cap. The soft cap only applies to streak reward overflow.

### 6.3 Inventory States

| State | Display |
|-------|---------|
| Available | Full brightness, neon mint glow |
| On Cooldown | Dimmed, cooldown counter overlay (e.g., "2 levels") |
| At Cap (for streak reward) | Subtle pulse on capped tier, COGS line on next streak reward |

[PROPOSED]

---

## PART SEVEN: REQUISITION PANEL INTEGRATION

### 7.1 The Augment Tab

The Requisition Panel gains a new tab: **AUGMENT**. It sits after the existing PHYSICS, PROTOCOL, DATA, and INFRA tabs. Tab color is neon mint (#00FFC8).

Tab order with discipline priority is preserved. The AUGMENT tab is always last regardless of discipline. It is a support layer, not a primary tool.

### 7.2 Tab Contents

The AUGMENT tab displays two sections:

**FROM INVENTORY** — Augments the Engineer currently owns. Selecting one moves it to the "requisitioned for this level" area. No credit cost. For rechargeable augments on cooldown, the entry is visible but dimmed with the cooldown counter. Cannot be selected.

**FOR PURCHASE** — Augments available for credit purchase at this sector's unlock level. Standard plus/minus quantity selector (consistent with piece purchasing). Price displayed per unit. Total updates the requisition spend counter at the bottom of the panel.

The Engineer can requisition augments from both sections in the same session. Mix inventory augments with credit-purchased ones freely.

### 7.3 Augment Limit Per Level

Maximum **2 augments per level.** The Engineer cannot stack five augments on a single level. Two is enough to combine effects meaningfully (Insurance Protocol + Overclock, Waveform Lens + Resonance Probe) without turning the level into a walkthrough.

If the Engineer attempts to requisition a third augment, COGS intervenes with a line. The UI does not allow it.

### 7.4 Requisition Confirmation

Augments appear in the requisition summary alongside pieces and tapes. The confirmation screen shows:

```
REQUISITION SUMMARY
───────────────────
Pieces:    2x Conveyor, 1x Scanner
Tapes:     Trail Tape
Augments:  Waveform Lens (inventory), Insurance Protocol (75 CR)
───────────────────
Total:     185 CR
```

One confirm button. One requisition window. Same flow as today, expanded to include augments.

[PROPOSED]

---

## PART EIGHT: COGS DIALOGUE HOOKS

COGS is aware of the augment system. He treats it the way he treats everything — with measured observation and occasional editorial.

### 8.1 Streak Events

**Streak reward earned (Win Streak):**
> "Win streak at [N]. Augment requisitioned to inventory. [Augment name]. Use it or do not. It does not expire."
> [PROPOSED | hubAmbient | BLUE]

**Streak reward earned (Prestige Streak):**
> "Consecutive three-star completions: [N]. That consistency has earned something. [Augment name], Engineer's choice. I note the pattern."
> [PROPOSED | hubAmbient | AMBER]

**Win Streak broken:**
> "Streak reset. The counter does not judge. It counts."
> [PROPOSED | hubAmbient | BLUE]

**Prestige Streak broken:**
> "The three-star run ends at [N]. It was a good run. The standard is not lower because of it."
> [PROPOSED | hubAmbient | BLUE]

### 8.2 Augment Requisition

**First time requisitioning any augment:**
> "Augment system active. These change conditions. They do not change requirements. The machine is still the Engineer's responsibility."
> [PROPOSED | requisitionLine | BLUE]

**Requisitioning Crosslink Beam (Rare):**
> "Cross-layer connection authorized. I want to be clear: this does not simplify the problem. It changes the problem. Whether that is an improvement depends entirely on what the Engineer does with it."
> [PROPOSED | requisitionLine | AMBER]

**Requisitioning Insurance Protocol:**
> "Insurance filed. If the machine fails, purchased pieces are retained for one retry. I will note that the best insurance is a machine that does not fail."
> [PROPOSED | requisitionLine | BLUE]

### 8.3 Augment Results

**Augment used, 3-star result:**
> "Augment deployed. Three stars achieved. The augment helped. The machine is what earned it."
> [PROPOSED | resultsLine | GREEN]

**Augment used, void result:**
> "Augment consumed. Result: void. The augment changed the conditions. The conditions were not the problem."
> [PROPOSED | resultsLine | BLUE]

**Insurance Protocol triggered (machine failed, pieces retained):**
> "Insurance triggered. Purchased pieces retained for retry. The failure still happened. The investment is protected. The lesson is not."
> [PROPOSED | resultsLine | AMBER]

### 8.4 Inventory Cap

**Streak reward forfeited due to cap:**
> "Inventory at capacity for [tier] augments. The streak reward cannot be stored. Spend what you have, or this happens again."
> [PROPOSED | hubAmbient | AMBER]

### 8.5 Augment Limit Hit

**Engineer tries to requisition a third augment:**
> "Two augments per level. That is the limit. Choose which two matter most."
> [PROPOSED | requisitionLine | BLUE]

[PROPOSED — ALL DIALOGUE REQUIRES TUCKER SIGN-OFF]

---

## PART NINE: IMPLEMENTATION NOTES

### 9.1 Data Model

New persistent state (extends playerStore or new augmentStore):

- `augmentInventory`: Map of augment ID to quantity (consumables) or cooldown state (rechargeables)
- `winStreak`: number (current consecutive wins)
- `prestigeStreak`: number (current consecutive 3-star completions)
- `streakRewardCycleOffset`: number (tracks position in the looping reward table)

### 9.2 Requisition Store Extension

The existing `RequisitionPurchase` type in `requisitionStore.ts` extends to include augment entries:

```
type: PieceType | 'TRAIL_TAPE' | 'OUT_TAPE' | AugmentType
source: 'inventory' | 'purchased'
```

The `GameplayPhase` type does not change. Augment selection happens during the existing `requisition` phase.

### 9.3 Scoring Integration

The `scoring.ts` module gains an `augmentUtilizationBonus` function that checks:
1. Was an augment requisitioned for this level?
2. Was it triggered (used)?
3. Did the Engineer achieve 2+ stars?

If all three: +3 to raw score before `starsFromTotal` evaluation.

### 9.4 Visual Hierarchy

Augment UI elements use the neon mint (#00FFC8) color exclusively. No overlap with Physics amber (#F0B429), Protocol blue (#00D4FF), or Config Node purple (#8B5CF6). The hex shape language is unique to augments — no other game element uses hexagons as a primary shape.

### 9.5 Animation Standards

All augment animations follow the existing cinematic standard: 0.6s cubic-bezier minimum. Streak ring fills use eased progression. Augment activation during gameplay uses a brief hex-pulse overlay on the affected area. No particle effects. Clean geometry.

---

## PART TEN: WHAT THIS DOES NOT INCLUDE

- **Real-money augment purchases.** Augments are earned through play (streaks) or bought with credits (earned currency). No IAP path to augments. This is a free-to-play game and augments are a free-to-play system.
- **Augment trading or gifting.** Single-player game. No social economy.
- **Augment crafting or combining.** Considered and rejected. Adds complexity without teaching anything. The Axiom teaches through building machines, not managing menus.
- **Augments that place pieces, complete paths, or bypass requirements.** This is the line. Augments change conditions. They never change answers.
- **Mid-level augment activation.** All augment decisions happen in the requisition window. Once the level starts, augments are either active or they are not. No pause-menu augment deployment.

---

## OPEN QUESTIONS FOR TUCKER

1. **Overclock piece-specific enhancements:** The spec describes general behavior. Each piece needs a specific enhancement definition. Should this be a companion document or added to COMPUTATIONAL_MODEL.md?

2. **Phase Shift cross-category mappings:** Same question. The specific behavior of "a Physics piece gaining one Protocol behavior" needs per-piece definition.

3. **Crosslink Beam placement UX:** This augment is architecturally complex. Does it warrant its own placement mode (a brief sub-phase within the requisition window where the Engineer draws the cross-layer connection)?

4. **Streak counting for level replays:** The spec says replays do not count toward streaks (anti-farming). Should there be a separate "mastery replay" streak for Engineers who 3-star levels they previously scored lower on?

5. **Augment tab position:** Spec places it last. If testing shows Engineers miss it, should it be second (after the discipline-primary tab)?

6. **COGS dialogue volume:** Eight hooks are defined. Is this the right density, or should augment-related dialogue be sparser to avoid diluting COGS's existing lines?

---

*This document is the single source of truth for the augment economy. No augment-related feature enters the codebase until this spec is approved. Implementation follows the Cowork-to-Code handoff process defined in CLAUDE.md.*
