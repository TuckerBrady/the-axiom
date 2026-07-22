# QA REPORT — Arc Wheel Tutorial
### Branch: `claude/frosty-golick-f5086d` | Commit: `88c0b99` | Reviewed: 2026-04-30

---

## VERDICT: CONDITIONAL PASS

Implementation is architecturally sound and all approved dialogue matches exactly. One blocking gap: the 13 spec-required tests (dialogue integrity, level structure, eye sequences) were not written — instead 13 hook-mechanic tests were shipped. All design principles hold. Two minor issues flagged below.

---

## 1. Dialogue Integrity

Character-for-character comparison of spec-approved text vs. `levels.ts` at `88c0b99`.

**A1-1 — CONVEYOR**
| Step | Approved | Implemented | Match |
|------|----------|-------------|-------|
| conveyor-notice | `Hold on. That piece on the wheel. I have no record of it.` | identical | PASS |
| conveyor-instruct | `Drag it onto the board. Any valid cell. I need to see it operational before I can catalogue it. Standard procedure. Go.` | identical | PASS |
| conveyor-capture | `Conveyor. Straight-line signal carrier. Rotation on tap. Entry logged. ...I have been waiting 847 days to log something new.` | identical | PASS |
| conveyor-teach | `One thing. Tap the Conveyor. It rotates. Only piece that does this. Everything else aligns to the path. The Conveyor, the Engineer aims.` | identical | PASS |

**A1-2 — GEAR**
| Step | Match |
|------|-------|
| gear-notice | PASS |
| gear-instruct | PASS |
| gear-capture | PASS |
| gear-teach | PASS |

**A1-3 — CONFIG NODE**
| Step | Match |
|------|-------|
| confignode-notice | PASS |
| confignode-instruct | PASS |
| confignode-capture | PASS |
| confignode-teach-a | PASS |
| confignode-teach-b | PASS |

**A1-5 — SCANNER**
| Step | Match |
|------|-------|
| scanner-notice | PASS |
| scanner-instruct | PASS |
| scanner-capture | PASS |
| scanner-teach | PASS |

**A1-7 — TRANSMITTER**
| Step | Match |
|------|-------|
| transmitter-notice | PASS |
| transmitter-instruct | PASS — see Design Compliance note |
| transmitter-capture | PASS |
| transmitter-teach | PASS |

All 20 dialogue strings verified character-for-character. **PASS.**

---

## 2. Eye State Sequence

Verified for all five new-piece levels. Sequence: amber → blue → green → blue.

| Level | NOTICE | INSTRUCT | CAPTURE | TEACH |
|-------|--------|----------|---------|-------|
| A1-1 | amber | blue | green | blue |
| A1-2 | amber | blue | green | blue |
| A1-3 | amber | blue | green | blue (x2 sub-steps) |
| A1-5 | amber | blue | green | blue |
| A1-7 | amber | blue | green | blue |

`eyeStateColor('green')` returns `'#00C48C'` at `TutorialHUDOverlay.tsx:81`. Correct. **PASS.**

---

## 3. Type Changes

| Change | Spec Requirement | Status |
|--------|-----------------|--------|
| `TutorialStepEye` += `'green'` | `'blue' \| 'amber' \| 'green'` | `types.ts:257` — PASS |
| `TutorialStep.awaitPlacement?: PieceType` | Beat 2 pause | `types.ts:272` — PASS |
| `TutorialStep.allowPieceTap?: boolean` | Beat 4 pass-through | `types.ts:274` — PASS |
| `TutorialStep.awaitPieceTap?: PieceType` | Beat 4a auto-advance | `types.ts:276` — PASS |
| `LevelDefinition.tutorialFocusPiece?: PieceType` | Pre-selects Arc Wheel | `types.ts:154` — PASS |

**PASS.**

---

## 4. Ref Changes

**Removed from `useGameplayTutorial`:**
- `trayConveyorRef` — removed from refs, hook return, and tutorialTargetRefs ✓
- `trayGearRef` — removed ✓
- `trayConfigNodeRef` — removed ✓
- `traySplitterRef` — removed ✓
- `trayScannerRef` — removed ✓
- `trayTransmitterRef` — removed ✓
- `tutorialTrayRefs` memoized object — removed ✓
- `TutorialTrayRefs` import from PieceTray — removed ✓

**Added:**
- `arcWheelMainRef` — in refs, hook return, tutorialTargetRefs ✓
- `placedPieceRef` — in refs, hook return, tutorialTargetRefs ✓
- Dynamic `'placedPiece'` targetRef resolved via invisible zero-size View positioned at `tutorialPlacedGridPos` inside board canvas ✓

**ArcWheel `mainNodeRef` prop:** `ref={isSelected ? mainNodeRef : undefined}` — attached only to selected center node. Correct; focus piece is pre-selected on level load. `collapsable={false}` present. ✓

**PieceTray `refs` prop:** Made optional (`refs?: TutorialTrayRefs`). Tray still renders for A1-4/6/8. `measureRef` properly falls back to `undefined` when `refs` is not provided. One minor code-quality note: the added outer `refs ? ... : undefined` produces a nested ternary that ESLint's `no-nested-ternary` might flag (if enabled), but lint passed. **PASS.**

---

## 5. Level Mapping

Verified by inspecting `levels.ts` at commit `88c0b99`:

| Level | tutorialFocusPiece | Four-Beat Steps | Status |
|-------|--------------------|-----------------|--------|
| A1-1  | `'conveyor'`       | YES (lines 62, 103–137) | PASS |
| A1-2  | `'gear'`           | YES (lines 170, 177–211) | PASS |
| A1-3  | `'configNode'`     | YES + 2 teach sub-steps (lines 251, 258–301) | PASS |
| A1-4  | undefined          | unchanged | PASS |
| A1-5  | `'scanner'`        | YES (lines 406, 436–470) | PASS |
| A1-6  | undefined          | unchanged | PASS |
| A1-7  | `'transmitter'`    | YES (lines 572, 579–613) | PASS |
| A1-8  | undefined          | unchanged | PASS |

A1-4, A1-6, A1-8 do not appear in the `levels.ts` diff. ✓ **PASS.**

---

## 6. A1-3 Config Node Special Case

Two sub-steps after CAPTURE:
- `confignode-teach-a`: `eyeState: 'blue'`, `allowPieceTap: true`, `awaitPieceTap: 'configNode'` — board interactive, auto-advances when Config Node is tapped ✓
- `confignode-teach-b`: `eyeState: 'blue'` — standard tap-to-advance ✓

`handleTapAnywhere` blocks advancement on `awaitPlacement` steps but NOT on `awaitPieceTap` steps. However, for teach-a, `allowPieceTap: true` causes `pointerEvents="none"` on the dim backdrop — the Pressable is absent entirely, so `handleTapAnywhere` cannot fire. The guard is correct via the backdrop's pointer events. Belt-and-suspenders would be to also guard on `awaitPieceTap` in `handleTapAnywhere`, but no bug exists with current level data. **PASS.**

---

## 7. Test Coverage

**Gap — this is the blocking item for CONDITIONAL PASS.**

The spec (`arc-wheel-tutorial.md`) lists 13 required tests. Thirteen tests were shipped in `arc-wheel-tutorial.test.ts`, but they cover hook callback mechanics exclusively:

| Spec Requirement | Covered? |
|-----------------|----------|
| 1. `TutorialStepEye` accepts `'green'` | NO |
| 2. `TutorialStep` accepts new fields without type errors | NO |
| 3. Each new-piece level has four consecutive beats with correct IDs | NO |
| 4. Eye states are amber, blue, green, blue per level | NO |
| 5. Only capture step has `codexEntryId` | NO |
| 6. Only instruct step has `awaitPlacement` | NO |
| 7. `tutorialFocusPiece` correct for each level | NO |
| 8. Removed refs not exported from hook | NO |
| 9. `arcWheelMainRef` IS exported | Partially (test 13 checks target refs, not the export directly) |
| 10. `eyeStateColor('green')` returns `'#00C48C'` | NO |
| 11. Dialogue integrity: each message matches approved text character-for-character | NO |
| 12. A1-3 has `awaitPieceTap: 'configNode'` on teach-a | NO |
| 13. A1-1 Conveyor capture triggers batch collection of Source + Terminal | NO |

What the 13 implemented tests DO cover (hook mechanics):
- `onPiecePlaced` fires `lastPlacedTrigger` with correct type and increments seq
- Same type placed/tapped twice still increments seq (dedup guard)
- `onPiecePlaced` stores grid coordinates in `tutorialPlacedGridPos`
- `onPieceTapped` fires `lastTappedTrigger` correctly
- All three state values reset on level change
- `arcWheelMainRef` and `placedPieceRef` are stable across renders
- `tutorialTargetRefs` memo includes both new keys

The callback tests are thorough and correct. But spec requirements 1-7, 10-13 were shipped without coverage. Dialogue integrity and level-structural assertions are unverified by test. **FAIL on coverage.** Needs 10+ additional tests targeting the spec requirements.

---

## 8. Code Quality

**Quality gates per commit message:** lint clean, tsc clean, 1189/1189 tests pass, audit clean.

**Independent verification attempt:** The `frosty-golick` worktree returns one lint error and one tsc error (`Cannot find module '../buildInfo'`). This module is gitignored and generated at build time — it exists in the main repo checkout but not in any worktree. This is a worktree environment artifact, not introduced by this commit. Error is pre-existing. The test suite also returned "No tests found" in the worktree (Jest `rootDir` likely resolves differently), so independent count verification was not possible from this reviewer's context.

The commit's own quality gate report (1189/1189) is taken on trust given the environment limitation.

**Code observations:**
- `PieceTray.tsx`: Nested ternary `refs ? pt === 'conveyor' ? refs.trayConveyor : ... : undefined : undefined` is syntactically correct but visually awkward. Lint passed. Low severity.
- `GameplayScreen.tsx` `handleDragEnd`: Guards drag-drop codex firing behind `isAxiomLevel` check. A1-4/6/8 Axiom levels (no Arc Wheel) never reach this path since Arc Wheel isn't rendered for those levels — correct but would be cleaner as `hasAxiomArcWheel`.
- No stray `console.log`, no inline TODOs, no emojis in code or comments.

**PASS** (with environment caveat on gate independence).

---

## 9. Design Compliance

| Principle | Status |
|-----------|--------|
| No emojis anywhere | PASS — none found in dialogue, code, or commit message |
| Engineer, never "you" (UI labels/narration) | See note below |
| Button-driven — no auto-advance without explicit trigger | PASS — awaitPlacement advances on placement event; awaitPieceTap on tap event; otherwise Confirm press required |
| Animations cinematic ≥0.6s | Existing capture animation uses `Animated.spring tension 100, friction 12` — not a duration-based animation, spring-based. Consistent with prior codex collection behavior. No regression |
| No HUD chrome on personal screens | Not applicable to this change |
| COGS voice — dry, witty, reluctantly impressed | PASS — "This is... this is acceptable progress." "I may need a bigger archive." "It is becoming something." All hold voice |
| useNativeDriver: false for piece animations | Existing overlay uses `useNativeDriver: false` — no change here |

**"You know the drill" note:** `transmitter-instruct` contains `'Place it. You know the drill by now. Operational necessity.'` — the word "you" appears. CLAUDE.md says "Player is always The Engineer. Never 'you.'" However, this is COGS speech, the spec is marked STATUS: APPROVED, and the spec says "DO NOT MODIFY ANY DIALOGUE TEXT." Tucker explicitly approved this line. Flagging for awareness; this reviewer treats it as a deliberate COGS speech tic in approved copy, not a blocking violation. **Tucker to confirm.**

---

## 10. Summary

| Item | Result |
|------|--------|
| Dialogue integrity | PASS — all 20 strings exact |
| Eye state sequence | PASS — amber→blue→green→blue on all 5 levels |
| Type changes | PASS — all 4 new fields present and correct |
| Ref changes | PASS — 6 tray refs removed, arcWheelMain + placedPiece added |
| Level mapping | PASS — correct 5 levels get four-beat; A1-4/6/8 untouched |
| A1-3 Config Node special case | PASS — teach-a/teach-b with awaitPieceTap |
| Test coverage | **FAIL** — 13 hook tests shipped; 13 spec-required structural/dialogue tests missing |
| Code quality | PASS (environment caveat) |
| Design compliance | PASS — one "you" in spec-approved copy, flagged for Tucker |

**VERDICT: CONDITIONAL PASS**

Merge blocked pending: write the 10+ structural and dialogue integrity tests the spec required. Hook mechanic tests are solid and can stay. The outstanding tests should cover spec items 1-7, 10-12 at minimum (type acceptance, level structure, eye sequences, field exclusivity, tutorialFocusPiece mapping, dialogue spot-checks for at least two levels, A1-3 awaitPieceTap assertion).
