# Playtest Findings — Axiom Sector (A1-1 through A1-8)
**Date:** 2026-06-09
**Tester:** Tucker Brady
**Build:** 0.9.265 (master, commit 961d8c3)
**Device:** iPhone 15 Pro Max (390x844)
**Status:** AXIOM SECTOR COMPLETE — Kepler on hold pending Axiom finalization

---

## Triage Summary

| Count | Severity |
|-------|----------|
| 0 | P0 — Blocker |
| 0 | P1 — Major |
| 10 | P2 — Moderate |
| 4 | P3 — Polish |
| 1 | Terminology |
| 2 | Copy (pending Tucker decision) |
| 1 | Typo |

**Build blocking:** No  
**Recommended next action:** Route UX batch to Dev after PRISM defines dialogue card pixel anchors. Route GAME batch immediately. Hold CONTENT-01 until PRISM designs tape Codex entries.

---

## Canonical Design Specs Established This Session

### SPEC-01 — Presentation Mode (Canonical Definition)
- COGS AI Orb: blue, centered, does not move
- Board outline: renders once at entry, persists — does not reload between steps
- Dialogue card: snaps to upper or lower fixed position (SPEC-02) — only text changes between steps
- Amber square spotlights target only — one active at a time
- Nothing else changes between steps

### SPEC-02 — COGS Dialogue Card: Two Fixed Positions
- **Upper position:** card anchored near top of board frame. Use when spotlight/orb is in lower portion of screen.
- **Lower position:** card anchored near bottom of board frame, above tray/buttons. Use when spotlight/orb is in upper portion.
- Card and orb/spotlight never stack. Orb high → card low. Orb low → card high.
- **PRISM to define exact pixel anchors before Dev implements UX-01.**

### SPEC-03 — Unknown Piece/Element Discovery Flow
1. COGS encounters unknown piece or tape element
2. Labels it "???" centered over highlight square
3. Player taps
4. Codex entry screen — formally introduces the piece/element
5. Player taps "UNDERSTOOD"
6. Returns to gameplay, item labeled correctly, COGS comments

Applies to all pieces AND all three tape elements (IN, TRAIL, OUT).

### SPEC-04 — COGS Call-and-Response Rhythm
COGS explains → player acts → COGS reacts → COGS explains next → repeat.
COGS never instructs before the player has taken the relevant action.

---

## Terminology

### TERM-01 — "COGS Eye" → "COGS AI Orb"
**Severity:** P3  
**Routing:** WRENCH (codebase audit) + PRISM (docs)  
**Finding:** The circular animated element is canonically the **COGS AI Orb**. "COGS eye" has leaked into documentation and likely into code comments, component names, variable names.  
**Action:** Full grep audit across src/, docs/, comments, copy for all variants: "cogs eye", `cogsEye`, `cogs_eye`, `CogsEye`, "cogs' eye". Map all instances, then update to "COGS AI Orb" / `cogsAIOrb` as appropriate.  
**Blocks build:** No

---

## Codex Ordering

### CODEX-01 — Source and Terminal Must Be Entries 1 and 2
**Severity:** P2  
**Routing:** WRENCH  
**File:** `src/screens/CodexScreen.tsx`, line 74 — `PIECES` array  
**Finding:** The `PIECES` array currently orders: Conveyor (1), Source (2), Terminal (3). COGS in A1-1 explicitly calls Source and Terminal the first and second Codex entries. The Codex grid must reflect this.  
**Fix:** Reorder `PIECES` array to: Source (1), Terminal (2), Conveyor (3), then remaining pieces unchanged.  
**Blocks build:** No

---

## UX / Layout Issues

### UX-01 — COGS Dialogue Card Not Anchored to Fixed Positions
**Severity:** P2  
**Routing:** PRISM first (define pixel anchors), then WRENCH  
**File:** `src/components/TutorialHUDOverlay.tsx`  
**Finding:** Dialogue cards float at varying vertical positions. SPEC-02 two-position system not implemented.  
**Observed:** A1-1, A1-2, A1-3, A1-4, A1-5, A1-7  
**Blocks build:** No

### UX-02 — Remove Mission Sub-Headers Above Board
**Severity:** P2  
**Routing:** WRENCH  
**Finding:** Contextual sub-labels appear in the mission header during tutorial steps (e.g. "CIRCUIT BOARD", "INPUT TAPE", "CONFIG NODE", "PROPULSION CORE" as a second line below mission name). Remove across the entire game.  
**Observed:** A1-1, A1-2, A1-3, A1-4, A1-5  
**Blocks build:** No

### UX-03 — Piece/Element Labels Not Centered Over Highlight Square
**Severity:** P3  
**Routing:** WRENCH  
**Finding:** Label text above highlight squares is not horizontally centered. Observed on SOURCE, TERMINAL, CONVEYOR, PIECE TRAY labels.  
**Blocks build:** No

### UX-04 — Highlight Square Color Must Be Amber (Not Green)
**Severity:** P3  
**Routing:** WRENCH  
**Finding:** Tray highlight square rendered green in some steps. Green belongs exclusively to COGS AI Orb warmth state. Highlight squares are always amber.  
**Blocks build:** No

### UX-05 — Stray Highlight Circles on Non-Target Pieces
**Severity:** P3  
**Routing:** WRENCH  
**Scope:** A1-1, Conveyor teaching step  
**Finding:** Highlight circles appearing on Source and Terminal when COGS is pointing at Conveyor in tray. One amber square active at a time — target only.  
**Blocks build:** No

### UX-06 — "PIECE TRAY" Label Must Be "???"
**Severity:** P2  
**Routing:** WRENCH  
**Scope:** A1-2, A1-3, A1-5 tray spotlight steps (and any other level with uncatalogued tray piece)  
**Finding:** Unknown tray piece label reads "PIECE TRAY" instead of "???". Per SPEC-03, uncatalogued items show "???" centered over highlight square.  
**Blocks build:** No

### UX-07 — Presentation Mode Board Outline Reloads on Every Tap
**Severity:** P2  
**Routing:** WRENCH  
**File:** `src/components/TutorialHUDOverlay.tsx`  
**Scope:** A1-3 confirmed, likely others  
**Finding:** Board spotlight outline re-renders/flickers on every tap during Presentation Mode. Should render once on entry and persist. Root cause likely: entire overlay component re-mounting instead of updating state.  
**Blocks build:** No

### UX-08 — Remove Post-Engage COGS Dialogue Box (A1-8)
**Severity:** P2  
**Routing:** WRENCH  
**Scope:** A1-8  
**Finding:** After Engage Machine, a COGS dialogue fires mid-execution: "Timer running. Decisive solutions score higher." Interrupts execution, non-standard style, not needed. Remove entirely.  
**Blocks build:** No

---

## Gameplay / Logic Issues

### GAME-01 — Tutorial Sequencing: COGS Instructs Before Player Has Acted
**Severity:** P2  
**Routing:** WRENCH  
**Scope:** A1-3 confirmed, likely other levels  
**Finding:** COGS instructs player to interact with a piece before player has placed it. Per SPEC-04: player places piece → COGS spotlights it → Presentation Mode exits → player interacts → COGS reacts.  
**Action:** Audit and resequence all tutorial trigger points in Axiom sector. Review every `awaitPlacement` / tutorial step trigger in level data.  
**Blocks build:** No

### GAME-02 — A1-4 Direction Change Requirement Not Enforced
**Severity:** P2  
**Routing:** WRENCH  
**Scope:** A1-4 only  
**Finding:** COGS states "Two direction changes on this one" as a level requirement. Game does not enforce or track this. Player can complete with fewer and still lock.  
**Action:** Implement direction change counter. Enforce minimum of 2 in A1-4 validation logic.  
**Blocks build:** No

### GAME-03 — OUT Tape Cell Highlight Fires at Wrong Time
**Severity:** P2  
**Routing:** WRENCH  
**Scope:** A1-7 and any level with OUT tape  
**Finding:** OUT tape cells highlight at an indeterminate point during traversal. Should highlight at the precise moment that pulse's signal contacts the Terminal.  
**Action:** Tie OUT tape cell highlight to Terminal contact event.  
**Blocks build:** No

### GAME-04 — OUT Tape Highlight Logic is Value-Dependent, Should Be Arrival-Dependent
**Severity:** P2  
**Routing:** WRENCH  
**Scope:** A1-7 and any level with OUT tape  
**Finding:** Only 1s are highlighted in OUT tape. Highlight should fire for any signal reaching Terminal — 0s included. Highlight = "pulse arrived," not "pulse was a 1."  
**Action:** Fix OUT tape highlight to trigger on Terminal arrival regardless of signal value.  
**Blocks build:** No

---

## Content Gaps

### CONTENT-01 — Tape System Needs Codex Entries
**Severity:** P2  
**Routing:** PRISM first (design Codex entry format for tape elements), then WRENCH  
**Scope:** A1-5 (IN tape), appropriate levels for TRAIL and OUT  
**Finding:** IN, TRAIL, and OUT tapes have no Codex entries. Should use same "???" → Codex entry → "UNDERSTOOD" flow as pieces.  
**Action:** PRISM to design tape Codex entry format. Assign IN tape to A1-5, TRAIL and OUT to appropriate levels. Dev cannot implement until designs are ready.  
**Blocks build:** No

---

## Copy Flags — Pending Tucker Decision

### COPY-01 — "This is the first entry." (A1-1, Source spotlight)
**Status:** Flagged. Tucker to decide. Connects to COPY-02.  
**Note:** If COGS is counting Codex entries sequentially (which CODEX-01 now confirms as intentional), this copy is correct and stays. Decision: confirm or rework.

### COPY-02 — "Two entries. Gotta catch 'em all. That is a personal policy." (A1-1, Terminal spotlight)
**Status:** "Gotta catch 'em all" approved (Tucker easter egg). "Two entries" ties to COPY-01.  
**Note:** Pattern — COGS logs encountered pieces in sequence. Likely correct given CODEX-01. Tucker to confirm.

---

## Typos

### TYPO-01 — "PROPULSTON CORE" (A1-4 sub-header)
Missing 'I' — should be "PROPULSION CORE". Low priority given UX-02 removes sub-headers, but fix regardless.  
**Routing:** WRENCH

---

## Confirmed Correct Patterns

- **PATTERN-01:** Unknown piece discovery flow — working correctly in A1-1 (Conveyor). This is the standard.
- **PATTERN-02:** Codex Entry Screen — working correctly. Conveyor Entry 001 is clean.
- **PATTERN-03:** "???" label for uncatalogued items — working in A1-1, broken in A1-2/A1-3/A1-5 (fix per UX-06).

---

## Memory Updates Required (T-Bot)

1. Add "COGS AI Orb" as canonical name to `TRIBAL_KNOWLEDGE.md` and `CLAUDE.md`
2. Add SPEC-01 Presentation Mode definition to `TRIBAL_KNOWLEDGE.md`
3. Add SPEC-02 two-position card spec once PRISM defines pixel anchors
4. Add SPEC-04 call-and-response rhythm to `TRIBAL_KNOWLEDGE.md`
5. Add CODEX-01 ordering rule: Source (1), Terminal (2), Conveyor (3)
