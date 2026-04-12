# BLOCKER: Ship Damage Mechanic — Design Decisions Needed
### April 2026

---

## Summary

The damage mechanic spec is implementable but requires Tucker
decisions on 4 design points before code enters the codebase.
Implementing without these answers risks rework.

---

## Decision 1: Damage on Axiom (Sector 0) Levels

The spec defines damage tiers by sector position (early, mid,
boss). The Axiom sector is the tutorial sector where:
- Pieces cost 0 CR
- Tutorial levels always award 3 stars
- Progressive teaching is the priority

Question: Should Axiom levels trigger structural damage on
failure? The current design awards 3 stars regardless of
performance on Axiom levels. If the player never gets 0 stars
on Axiom, the damage system never fires for Sector 0. But if
the scoring override is removed later, this needs a decision.

Recommendation: Axiom levels should be exempt from structural
damage. The first sector where damage matters is Kepler Belt.
The spec seems to assume this but does not state it explicitly.

---

## Decision 2: Repair Level Mapping

The spec calls for 8 repair templates (one per ship system).
But the existing repair levels use sector-specific context:
- repairPropulsionSurge: tied to Kepler boss consequence
- repairHyperdrive: tied to Nova Fringe pirate consequence

These are narrative-specific, not generic system repairs.

Question: Should the 8 new generic repair templates REPLACE
the 2 existing narrative repair levels, or COEXIST alongside
them? If coexist: which triggers when? Does a Kepler boss
failure use the narrative repair (propulsion surge) or the
generic repair (repair_propulsion)?

Recommendation: Keep the 2 narrative repairs for their specific
consequence triggers. Add 8 generic repair templates for the
damage-on-failure system. The getRepairLevel() function returns
the generic template for the damaged system. Narrative repairs
fire only through their specific consequence paths.

---

## Decision 3: Damage During Repair Levels

If the player fails a repair level, does the damage get worse?
The spec does not address this.

Options:
A) No additional damage — the system stays damaged but does not
   degrade further. Player retries the repair.
B) Cascading damage — each repair failure adds COGS integrity
   loss. Pressure increases but system state does not worsen.
C) Wear damage — each repair failure adds a wear point but no
   structural damage.

Recommendation: Option A (no additional damage on repair failure).
Repair levels should be safe to retry without fear. The existing
lives system already gates attempts. Adding damage on top of
lives cost would feel punitive.

---

## Decision 4: SHIP_SYSTEMS Mapping to Level systemRepaired

The damage system needs to map level failures to specific ship
systems. Axiom levels have systemRepaired set:
  A1-1: Emergency Power, A1-2: Life Support, etc.

Kepler levels do NOT have systemRepaired set. When a Kepler
level fails, which system gets damaged?

Options:
A) Add systemRepaired to all Kepler levels (what system does
   each level's station repair map to?)
B) Use a default mapping: K1-1 through K1-3 -> communicationArray,
   K1-4 through K1-7 -> sensorGrid, K1-8 through K1-10 ->
   navigationArray (or similar thematic mapping)
C) Kepler failures damage a "kepler relay" system not tied to
   the Axiom's 8 systems. This requires a new system type.

Recommendation: Option B with Tucker providing the specific
mapping. The systems should reflect the Kepler narrative:
communication relays, sensor grid, navigation array are all
thematically appropriate for a mining corridor.

---

## What I Can Implement Now (Without Blockers)

Phase 1 (wear tracking in consequenceStore) is unblocked.
Phase 6 (wear visual in ShipRepairProgress) is unblocked.
Phase 7 (tests for wear) is unblocked.

These three phases have no design ambiguity. I can implement
them now and defer Phases 2-5 until Tucker answers the four
questions above.

---

## Recommended Next Step

Tucker reviews this report and provides answers to all four
decisions. Then I implement the full mechanic in one sprint.

Alternatively: I implement Phase 1 + 6 + 7 now (wear system
only) and defer structural damage to a follow-up sprint after
decisions land.

---

END OF BLOCKER
