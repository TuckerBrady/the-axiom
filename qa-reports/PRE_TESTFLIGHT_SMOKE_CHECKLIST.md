# Pre-TestFlight Smoke Checklist — The Axiom

> **VERSION:** 1.0 — Authored 2026-05-01 by QA (Phase 5).
> Replaces the interim placeholder at `docs/PRE_TESTFLIGHT_CHECKLIST.md` (commit 93eebf9).
> Baseline: Phase D device walk from `qa-reports/REGRESSION_2026-05-01.md`.

---

## A. Coverage Scope

18 items. Every item is tested on every smoke run. No partial runs.

### A1. Launch and Navigation

| # | Item | Steps | Pass Criteria |
|---|------|-------|---------------|
| 1 | Login / Begin flow | Cold launch from cleared state (fresh install or storage wipe). | App reaches HomeScreen within 3s. No crash, no white screen, no ANR. |
| 2 | Bottom nav | Tap each tab in sequence: Hub, Codex, Daily Challenge, Settings. | Each screen loads. Active tab indicator tracks correctly. No orphaned modals. |
| 3 | Hub | From Hub, tap Axiom sector card. Verify all 8 level tiles. Tap Kepler sector card if available. | Sector maps load. Correct tile count. Star counts and lock states match player progress. |
| 4 | Settings (haptics toggle) | Open Settings. Toggle haptics on/off. Close and reopen Settings. | Toggle state persists across reopen. No crash on rapid toggling. |

### A2. Codex and Reference

| # | Item | Steps | Pass Criteria |
|---|------|-------|---------------|
| 5 | Codex | Open Codex. Scroll through entries. Tap a Physics piece entry, then a Protocol piece entry. | Entries render with correct icons (PieceIcon). Detail view shows piece description. Back nav returns to list. |

### A3. Axiom Sector Levels

| # | Item | Steps | Pass Criteria |
|---|------|-------|---------------|
| 6 | A1-1 full tutorial walk | Enter A1-1. Advance through every tutorial step including awaitPlacement on/off boundaries. Place pieces as prompted. Engage. Complete level. | No SIGABRT. No layout crash on portal morph. HUD spotlight tracks target cell. Backdrop is non-interactive but board receives touch. Step advances after correct placement. 3-star awarded regardless of score (tutorial rule). |
| 7 | A1-2 through A1-8 | Enter each level sequentially. In each: place at least one piece, tap Engage, observe result. Return to Hub between levels. | Every level loads. Board grid renders at correct dynamic size (BOARD_SIZE = SCREEN_WIDTH - 24). Source auto-orients toward Terminal. Return to Hub produces no orphaned state. |

### A4. Core Mechanics

| # | Item | Steps | Pass Criteria |
|---|------|-------|---------------|
| 8 | Piece interactions | In any Axiom level: drag Conveyor from tray to board (orange highlight visible). Tap placed Conveyor (rotates 90 deg). Long press placed piece (returns to tray, no ghost state). Tap Config Node (cycles configValue 0/1). If Latch available, tap (toggles latchMode). | Each interaction matches spec. No other piece type rotates on tap. Long press never produces ghost/held state. Config Node renders Protocol purple (#8B5CF6). |
| 9 | Signal beam animation | In any level, tap Engage and observe the three-phase animation. | CHARGE phase: beam builds from Source. BEAM phase: signal travels along path. LOCK phase: ring + glow on Terminal. Animation runs at minimum 30 FPS (note actual FPS in run record). No frame drops below 24 FPS. Total animation time consistent with 0.6s cubic-bezier minimum per phase. |
| 10 | Tape system | In a level that uses tapes (A1-5+ or any level with IN/TRAIL/OUT). Observe tape colors and values during engagement. | IN tape renders correct input color. TRAIL tape shows working memory. OUT tape records output. Colors match defined palette. Values update in sync with signal progression. |

### A5. Economy and Progression

| # | Item | Steps | Pass Criteria |
|---|------|-------|---------------|
| 11 | Credit economy | Open requisition screen (any level with purchasable pieces). Note CR balance. Purchase a piece. Note new balance. Attempt to reduce balance below 0. | Balance decrements by piece cost. Balance cannot go below 0. Purchase denied gracefully if insufficient CR (no crash, no negative balance). |
| 12 | Arc wheel tutorial | On first encounter with the arc wheel (or reset state to trigger it). | Tutorial overlay renders. Steps advance on tap. Wheel responds to input after tutorial completes. |

### A6. HUD and COGS

| # | Item | Steps | Pass Criteria |
|---|------|-------|---------------|
| 13 | HUD overlay + COGS eye states | Enter gameplay. Observe COGS eye on load (blue = operations). Tap Engage (amber = engagement). Complete successfully (green = warmth). Trigger failure if possible (red = damage). | Eye color matches state. HUD chrome uses corner brackets on tactical/operational screens only. No chrome on personal screens. |

### A7. Daily Challenge and Kepler

| # | Item | Steps | Pass Criteria |
|---|------|-------|---------------|
| 14 | Daily challenge | Open daily challenge tab. Verify challenge loads (generated or fetched). If already completed today, verify completion state renders. | Challenge available. Status reflects completion state. No crash on repeated opens. Timer (if shown) counts correctly. |
| 15 | Kepler levels in build | Open every Kepler level currently in the build (K1-1, K1-9, K1-10 at time of writing — adjust as more land). Tap through tutorial intro if present. Attempt at least one Engage. | Levels load. No placement highlights (non-Axiom). Wire connections (dashed lines) still render. Modal/dialogue paths render. No crash. |

### A8. Stability and Persistence

| # | Item | Steps | Pass Criteria |
|---|------|-------|---------------|
| 16 | Navigation back paths | From any deep screen (gameplay, codex detail, settings), navigate back to Hub using every available back path (back button, gesture, bottom nav). | Every path returns to expected parent. No double-back. No orphaned modals. No leaked state. |
| 17 | Performance baseline | During A1-1 gameplay (board + tutorial + HUD active simultaneously), observe frame rate. | Sustained 60 FPS target on primary device. No single-frame drops below 24 FPS. Note actual measurement in run record. |
| 18 | Settings persistence | Change a setting (haptics, any toggle). Kill the app (force close, not just background). Relaunch. | Changed setting persists. No reset to defaults. No crash on cold relaunch after settings change. Background/resume (10s background, return) preserves screen state and placed pieces. |

---

## B. Device Matrix

| Role | Device | iOS Version | Viewport | Notes |
|------|--------|-------------|----------|-------|
| Primary | iPhone 15 Pro Max | Document installed version on every run | 390x844 | Tucker's test device. Every smoke run uses this device minimum. |
| Secondary (optional) | Any iPhone running iOS 17+ | Document installed version | Document actual | If available. Not required for gate but recommended for new sectors. |

Every run record must include: device model, iOS version, screen dimensions if non-primary device.

---

## C. Run-Record Format

Each smoke run is recorded as a new section appended to `qa-reports/smoke-runs/RUN_YYYY-MM-DD.md`. One file per run date. If multiple runs occur on the same date, append sequentially within the same file.

```
## Run YYYY-MM-DD HH:MM

Build: <build number>
Master HEAD: <sha (first 7 chars minimum)>
Device: <model>, iOS <version>
Tester: <name>
Coverage: 18/18 (or list any skipped items with justification — partial runs do not grant PASS)

### Results

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Login / Begin flow | PASS / WARN / FAIL | <detail if WARN or FAIL> |
| 2 | Bottom nav | PASS / WARN / FAIL | |
| ... | ... | ... | |
| 18 | Settings persistence | PASS / WARN / FAIL | |

### Verdict: PASS / FAIL

<If FAIL: which item(s), what happened, repro steps, suspect commit if identifiable>
<If WARN: list items, note for follow-up but build may ship>
```

---

## D. Severity Tiers

| Tier | Definition | Ship? |
|------|-----------|-------|
| PASS | Works as expected. No anomalies observed. | Yes |
| WARN | Minor visual or cosmetic issue. Core flow unaffected. Functionality intact. | Yes, with follow-up ticket filed. Note in run record. |
| FAIL | Crash, hang, broken core flow, feature unusable, data loss, SIGABRT, ANR, or animation rendering below 24 FPS sustained. | No. Build does not ship. Failure routing begins immediately. |

Any single FAIL on any item = the entire run is FAIL. Build does not ship.

WARN items accumulate. Three or more WARN items on a single run should be escalated to Dispatch for review even though the build is technically shippable.

---

## E. Failure Routing

On any FAIL result:

1. QA writes a structured bug report to `qa-reports/crash-reports/BUILD_<NN>_<short-name>.md` containing: stack trace (if available), full repro steps, device and iOS version, smoke item number, suspect commit (use `git log --oneline` since last passing build).

2. QA pings Dispatch via `send_message` with: build number, failed item number(s), severity, one-line summary, path to bug report.

3. Dispatch routes the bug to T-Bot for triage and priority assignment (P0-P3).

4. T-Bot drafts a Code prompt for Dev fix, referencing the bug report and relevant spec.

5. After Dev fixes and merges to master, QA re-smokes the failed items plus any adjacent items in the same coverage section. If pass, QA re-runs the full 18-item checklist on the new master HEAD.

6. Repeat until full PASS.

No partial re-smokes grant a shipping PASS. The final gate is always a full 18/18 run on the master HEAD that goes into the build.

---

## F. Standing Rule

**No `eas build` or `eas submit` runs without a passing smoke check on the master HEAD that will go into the build.**

This rule is non-negotiable. It applies to every build profile:

- `testflight` (internal TestFlight builds) — smoke required.
- `production` (App Store submission) — smoke required.
- Emergency hotfix builds — smoke required. No exceptions.

Origin: Build 19 A1-1 SIGABRT incident (2026-05-01). A 30-second device smoke would have caught the crash before TestFlight distribution. The rule was added the same day and is enforced by Dispatch.

The smoke must be run by QA (Phase 5) or, if QA is unavailable, by the developer who authored the final commit — but in that case the run record must note "developer self-smoke" and Dispatch must be informed.

---

## G. Update Protocol

This checklist grows with the game. Updates are required when:

- A new sector ships (add sector-specific items to A3 or a new subsection).
- A new piece is introduced (add to item 8 interaction verification).
- A new mechanic ships (add a dedicated item).
- A new failure mode is discovered in production (add a regression-specific item).
- The device matrix changes (update section B).
- The Kepler level list changes (update item 15 with current level IDs).

Update process:

1. QA drafts the addition and notes the trigger (which feature, which incident).
2. QA pings Dispatch with the proposed update.
3. After review, QA commits the updated checklist.
4. The item count in section A and the run-record template in section C are updated to reflect the new total.

The version line at the top of this file is incremented on every structural change (new items, removed items, section reorganization). Wording clarifications do not require a version bump.

---

## Cross-References

| Document | Location | Relevance |
|----------|----------|-----------|
| Interim placeholder (superseded) | `docs/PRE_TESTFLIGHT_CHECKLIST.md` | Historical. This file replaces it functionally. |
| Regression baseline | `qa-reports/REGRESSION_2026-05-01.md` | Phase D is the source of the 18-item structure. |
| Build 19 postmortem | `dispatch-queue/2026-05-01_BUILD-19-A1-1-incident-postmortem.md` | The incident that created this gate. |
| Dispatch handshake | `shared/dispatch-handshake.md` | STANDING BUILD-GATE RULE section. |
| Tribal knowledge | `docs/TRIBAL_KNOWLEDGE.md` | Section 2: engine gotchas worth smoking against. |
| Computational model | `docs/COMPUTATIONAL_MODEL.md` | Three-layer architecture reference for tape/signal verification. |

---

Authored by QA, 2026-05-01. Baseline: 18-item Phase D device walk, REGRESSION_2026-05-01.
