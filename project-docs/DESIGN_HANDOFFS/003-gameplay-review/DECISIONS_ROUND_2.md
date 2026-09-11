# Decisions — Round 2

**Date:** 2026-09-10 · **Decided by:** Tucker Brady
**Context:** follow-on to `DECISIONS.md` (DEC-1/2/3), taken after the 003
requirements and 004 scoring-language pass were delivered.

All six recommendations accepted as proposed. Both handoffs have been amended;
this file is the record.

---

## DEC-4 — Cyan mirrors amber

`#00D4FF` is valid Protocol static identity, exactly as DEC-2 made amber valid
Physics static identity. Request 001's D-03 reserved both hues for beams; DEC-2
settled only amber, leaving cyan hanging.

**Effect:** the color half of REQ-G-03 is fully withdrawn.
`TAB_COLORS.PROTOCOL` and `SECTION_ACCENT.WILL` stay as shipped. What survives
of REQ-G-03 is not about color at all — the `getPieceColor` code/comment
contradiction, and `SOURCE_COLORS` encoding purchase provenance, which violates
`COMPUTATIONAL_MODEL.md`'s Option B regardless of which hues are used.

---

## DEC-5 — Scoring engine before the requisition UI

REQ-G-17's premise is v2's one-star ceiling on a floor solve. `scoring.ts`
still implements Efficiency 30 + Speed Bonus 10.

**Effect:** REQ-G-17 is sequenced behind **ENG-001** (implement scoring v2),
newly recorded in `REQUIREMENTS.md`. The panel never teaches a constraint the
engine does not enforce. ENG-001 is a systems task; the 003 bundle records it
because it gates a requirement, not because it owns it.

---

## DEC-6 — Kepler grids cap at 8 columns

8 is the widest grid holding a 48 pt cell at 390 pt, which keeps board icons at
the 22 pt catchability floor. REQ-G-01's clamp removal stops the clipping;
this stops the illegibility.

**Effect:** ten of eleven Kepler grids (9–12 columns) need re-floor-solving,
tracked as **LD-001** and owned by level design. Height is unconstrained — a
level needing more room grows in rows, noting that `CELL_SIZE` takes the
`min()` of both fits, so tall grids trade cell size the same way wide ones do.

---

## DEC-7 — Field Operative section split: commitment

Option A collapsed "played to type" into "played mixed." The ratified split:

| Section | Meaning |
|---|---|
| 3A Played to Type | Both systems used, both doing real work |
| 3B Played Against Type | One system carried the machine |
| 3C Played Without Commitment | Both present, one placed but not leveraged |

Matches how v2 counts — it scores *active* pieces, so a piece the signal never
touches is not load-bearing.

**Effect:** `OPTION_A_FULL_PASS.md` drafts are final-form. Line-level sign-off
is all that remains.

---

## DEC-8 — Rewrite the four §3 void lines that cite piece count

DEC-3 approved the void matrix as authored; four §3 void lines name optimal
piece count, the metric DEC-1 deleted.

**Effect:** those four are rewritten in the 004 pass. The two decisions are
consistent — DEC-3 approved the matrix's structure and voice, DEC-1 removed a
metric four of its lines happened to name. The rest of the void matrix stands
verbatim.

---

## DEC-9 — Wave 1 starts now

Seven self-contained fixes with acceptance criteria and no design or engine
dependency: tape colors (REQ-G-04), `MIN_CELL` (REQ-G-01), wire colors
(REQ-G-07), void reroll (REQ-G-08 part 1), dot grid (REQ-G-14), scar tokens
(REQ-G-15), dead styles (REQ-G-11).

---

## Current state

**Cleared to build:** Wave 1 in full. Wave 2 except REQ-G-17. Wave 3 in full.

**Owned elsewhere:** ENG-001 (systems), LD-001 (level design).

**Still with Tucker:** line-level sign-off on the 56 drafts in
`004-scoring-language/OPTION_A_FULL_PASS.md`. Nothing in 003 waits on it.
