# SPEC: Ship Damage Mechanic
### MVP Implementation | April 2026

---

## Overview

Failing missions causes real damage to the Axiom. The ship's
health status (already displayed on Hub) becomes mechanically
meaningful. Two damage tiers: structural (blocks story progress)
and wear (cosmetic, accumulates without blocking).

---

## Damage Tiers

### Structural Damage (Story Missions)

Fires when the Engineer fails a story mission. Severity scales
with mission importance:

EARLY SECTOR LEVELS (K1-1 through K1-3, etc.):
- Effect: Minor system degradation. One ship system drops to
  "strained" state.
- Repair: Quick repair puzzle (existing repair level format,
  small board, 2-3 minutes).
- COGS integrity: no loss.
- Credits: no loss.
- Blocks: Cannot advance to next story mission until repaired.

MID SECTOR LEVELS (K1-4 through K1-7, etc.):
- Effect: System damage. One ship system goes offline.
- Repair: Standard repair puzzle (medium board, 5 minutes).
- COGS integrity: -5 points.
- Credits: no loss.
- Blocks: Cannot advance to next story mission until repaired.

CONSEQUENCE LEVELS (K1-4, K1-8 marked consequence):
- Effect: As defined in existing ConsequenceConfig. System
  damage plus narrative consequence.
- Repair: Standard repair puzzle.
- COGS integrity: -5 to -10 points.
- Credits: possible loss (steal_credits effect).
- Blocks: Cannot advance until repaired AND consequence
  acknowledged.

BOSS LEVELS (K1-10, sector bosses):
- Effect: Major system failure. Multiple effects from existing
  consequence definitions.
- Repair: Multi-step repair (2 repair puzzles in sequence).
- COGS integrity: -10 to -30 points (per existing definitions).
- Credits: possible significant loss.
- Blocks: Cannot advance to next sector until all repairs
  complete.

### Wear Damage (Bounty Missions)

Fires when the Engineer fails a daily bounty. Does NOT block
story progress.

- Effect: Hull wear point added to ship profile. Visible as
  additional scratch/mark on ShipRepairProgress SVG.
- Accumulation: Each bounty failure adds 1 wear point. Max
  wear points: 20. At 20, COGS comments on the hull state.
- COGS integrity: no loss.
- Credits: bounty reward forfeited (already the case).
- Cosmetic: ship profile shows wear level (pristine/scuffed/
  battered/rough). Affects ship visualization opacity/detail.
- Optional repair: Engineer can spend 50 CR to remove 5 wear
  points. Not required.

---

## Progression Gate

Before launching any story mission, check:
1. Are any ship systems currently damaged?
2. If yes: show "SHIP DAMAGED" modal with:
   - List of damaged systems
   - COGS line: context-appropriate (not generic)
   - "Begin Repair" button -> navigates to repair level
   - Cannot dismiss without repairing or returning to Hub

The gate applies to story missions only. Bounties are always
accessible regardless of ship damage state.

---

## Repair Flow

1. Player taps "Begin Repair" from the damage modal
2. MissionDossierScreen shows repair level briefing
   (cogsLine from repair level definition)
3. Player completes repair puzzle
4. On success: system removed from damagedSystems,
   COGS acknowledges repair
5. If multiple systems damaged (boss failure): return to
   gate, show remaining damage, repeat

Repair levels already exist in levels.ts (repairPropulsionSurge,
repairHyperdrive). New repair levels needed:
- Generic repair per system (8 templates, one per ship system)
- Difficulty scales with the system: early systems (Emergency
  Power, Life Support) are easy repairs. Later systems (Weapons
  Lock, Bridge Systems) are harder.

---

## Damage Triggers — Implementation

Story mission failure is defined as: score < 30 (void result,
0 stars). This is already tracked in the scoring engine.

Consequence level failure uses existing ConsequenceConfig
thresholds (some require 3 stars, some just require completion).

Bounty failure: void result on daily challenge attempt.

---

## Ship Wear Levels

0 wear points: PRISTINE — clean hull, all details sharp
1-5 points: SCUFFED — minor scratches visible
6-12 points: BATTERED — visible dents, dimmer hull glow
13-19 points: ROUGH — heavy scarring, reduced hull opacity
20 points: CRITICAL — COGS comments, maximum visual wear

COGS lines at wear thresholds:
5: "The hull is showing wear. I am noting it."
12: "The hull has taken more contact than I would recommend.
  The Engineer may want to address that."
20: "I have run out of diplomatic ways to describe the hull
  condition. It is bad."

---

## Data Model Changes

consequenceStore additions:
- wearPoints: number (0-20)
- addWearPoint(): increment, cap at 20
- removeWearPoints(count): decrement, floor at 0
- getWearLevel(): 'pristine'|'scuffed'|'battered'|'rough'|'critical'

progressionStore additions:
- isShipDamaged(): boolean (any damagedSystems.length > 0)
- getRepairLevel(system): returns appropriate repair LevelDefinition

---

## What This Connects To

- ShipRepairProgress.tsx: already renders 8 zones. Add wear
  overlay based on wearPoints.
- HubScreen: already shows ship status. Add wear visual +
  optional repair button when wear > 5.
- MissionDossierScreen: add progression gate check before
  ENGAGE button.
- GameplayScreen: on void result, trigger appropriate damage.
- DailyChallengeDossierScreen: on void result, add wear point.
- consequenceStore: extend with wear tracking.
- levels.ts: add 8 repair level templates (one per system).

---

END OF damage-mechanic.md
