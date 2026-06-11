# Maestro Smoke Suite Specification

> **Spec ID:** SPEC-SMOKE-001
> **Version:** 1.0
> **Author:** SE (System Engineer)
> **Date:** 2026-05-01
> **Status:** DRAFT — awaiting Tucker sign-off
> **Origin:** Pre-TestFlight Smoke Checklist (`qa-reports/PRE_TESTFLIGHT_SMOKE_CHECKLIST.md`)
> **Incident driver:** Build 19 A1-1 SIGABRT (`docs/ANIMATION_RULES.md`, REQ-A-1)

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this
document are to be interpreted as described in RFC 2119.

---

## 1. SCAFFOLDING

### 1.1 Directory layout

```
.maestro/
  config.yaml                  # (1.1.1) Global Maestro config
  flows/
    smoke_01_cold_launch.yaml
    smoke_02_bottom_nav.yaml
    smoke_03_hub_sectors.yaml
    smoke_05_codex.yaml
    smoke_06_a1_1_tutorial.yaml
    smoke_07_a1_2_through_a1_8.yaml
    smoke_08_piece_interactions.yaml
    smoke_09_signal_beam.yaml
    smoke_10_tape_system.yaml
    smoke_11_credit_economy.yaml
    smoke_12_arc_wheel_tutorial.yaml
    smoke_13_hud_cogs_ai_orb.yaml
    smoke_14_daily_challenge.yaml
    smoke_15_kepler_levels.yaml
    smoke_16_back_navigation.yaml
    smoke_18_settings_persistence.yaml
    complete-level.yaml         # existing flow (preserved)
    hub-navigation.yaml         # existing flow (preserved)
    daily-challenge.yaml        # existing flow (preserved)
  subflows/
    launch_to_hub.yaml          # (1.1.2) Shared: cold launch through HomeScreen to Hub
    enter_axiom_level.yaml      # (1.1.3) Shared: Hub -> Axiom sector -> level N
    place_and_engage.yaml       # (1.1.4) Shared: place a piece and tap Engage
scripts/
  run-smoke.sh                  # (1.1.5) Runner script (see section 3)
```

### 1.2 Naming convention

1. (1.2.1) Every smoke flow file MUST be named `smoke_NN_<short_name>.yaml` where NN is the zero-padded checklist item number from `PRE_TESTFLIGHT_SMOKE_CHECKLIST.md`.
2. (1.2.2) Items 4 and 17 MUST NOT have corresponding flow files. They are manual-only (see section 2.17).
3. (1.2.3) Existing flows (`complete-level.yaml`, `hub-navigation.yaml`, `daily-challenge.yaml`) MUST be preserved unchanged. Smoke flows MAY reference them via `runFlow` but MUST NOT modify them.

### 1.3 App ID

4. (1.3.1) Every flow MUST declare `appId: com.tuckbrady.theaxiom` in its YAML front matter, consistent with existing flows.

### 1.4 Shared subflows

5. (1.4.1) Repeated action sequences (cold launch to Hub, entering a specific Axiom level) MUST be extracted into subflows under `.maestro/subflows/`.
6. (1.4.2) Subflows MUST NOT declare `appId` — they inherit from the calling flow.

### 1.5 testID requirements

7. (1.5.1) Smoke flows SHOULD prefer `testID`-based selectors over text-based selectors. Where existing flows use text selectors (e.g., `tapOn: "ENTER"`), new smoke flows MAY use the same pattern for consistency, but Dev SHOULD add `testID` props to key interactive elements and migrate selectors in a follow-up pass.
8. (1.5.2) At minimum, the following elements MUST have `testID` props before smoke flows can run: bottom nav tabs, Engage button, tray pieces, Config Node, Latch, Conveyor (on board), COGS AI Orb indicator, credit balance display, arc wheel.

---

## 2. FLOW SPECS

Each flow spec below defines: flow ID, filename, prerequisites, action sequence, pass/fail assertions, and max duration.

### 2.1 smoke_01 — Cold Launch

| Field | Value |
|-------|-------|
| Flow ID | smoke_01 |
| Filename | `smoke_01_cold_launch.yaml` |
| Checklist item | 1 — Login / Begin flow |
| Prerequisites | None (first flow) |
| Max duration | 10s |

**Action sequence:**

9. (2.1.1) Clear app state (`clearState` or `clearKeychain`).
10. (2.1.2) Launch app (`launchApp`).
11. (2.1.3) Wait up to 3000ms for HomeScreen.
12. (2.1.4) Assert visible: element matching HomeScreen identifier (e.g., `testID: "home-screen"`).

**Pass criteria:**

13. (2.1.5) App MUST reach HomeScreen within 3000ms of launch.
14. (2.1.6) No crash, no white screen. If `assertVisible` fails or the flow times out, the result is FAIL.

---

### 2.2 smoke_02 — Bottom Nav

| Field | Value |
|-------|-------|
| Flow ID | smoke_02 |
| Filename | `smoke_02_bottom_nav.yaml` |
| Checklist item | 2 — Bottom nav |
| Prerequisites | smoke_01 MUST pass |
| Max duration | 15s |

**Action sequence:**

15. (2.2.1) Run subflow `launch_to_hub.yaml`.
16. (2.2.2) Tap Hub tab. Assert Hub screen visible.
17. (2.2.3) Tap Codex tab (`testID: "codex-tab"`). Assert Codex screen visible.
18. (2.2.4) Tap Daily Challenge tab (`testID: "daily-challenge-tab"`). Assert Daily Challenge screen visible.
19. (2.2.5) Tap Settings tab (`testID: "settings-tab"`). Assert Settings screen visible.
20. (2.2.6) Tap Hub tab. Assert Hub screen visible (round-trip).

**Pass criteria:**

21. (2.2.7) All four tabs MUST load their respective screens. Active tab indicator MUST track correctly. No orphaned modals.
22. (2.2.8) Each tap-and-assert MUST complete within 2000ms.

---

### 2.3 smoke_03 — Hub / Sectors

| Field | Value |
|-------|-------|
| Flow ID | smoke_03 |
| Filename | `smoke_03_hub_sectors.yaml` |
| Checklist item | 3 — Hub |
| Prerequisites | smoke_01 MUST pass |
| Max duration | 15s |

**Action sequence:**

23. (2.3.1) Run subflow `launch_to_hub.yaml`.
24. (2.3.2) Tap Axiom sector card. Assert sector map loads.
25. (2.3.3) Assert exactly 8 level tiles visible (count assertion).
26. (2.3.4) Verify star counts and lock states render (assert at least one tile has a visible star or lock indicator).
27. (2.3.5) Navigate back to Hub.
28. (2.3.6) If Kepler sector card is visible, tap it and assert sector map loads with expected tile count.

**Pass criteria:**

29. (2.3.7) Axiom sector MUST show 8 level tiles. Sector maps MUST load without crash.
30. (2.3.8) Kepler assertion is conditional — if the card is not present, the flow MUST NOT fail.

---

### 2.4 smoke_04 — Settings / Haptics Toggle (MANUAL ONLY)

31. (2.4.1) Item 4 (haptics toggle) is NOT automatable via Maestro. Maestro cannot verify haptic motor activation; it can only verify UI state.
32. (2.4.2) This item MUST remain in the manual device walk checklist.
33. (2.4.3) No YAML flow file SHALL be created for this item.

**Rationale:** Haptic feedback verification requires physical device sensation. A Maestro flow could toggle the switch and verify visual state persistence, but that does not satisfy the checklist requirement of confirming the haptic motor fires. Partial automation would create false confidence.

---

### 2.5 smoke_05 — Codex

| Field | Value |
|-------|-------|
| Flow ID | smoke_05 |
| Filename | `smoke_05_codex.yaml` |
| Checklist item | 5 — Codex |
| Prerequisites | smoke_01 MUST pass |
| Max duration | 15s |

**Action sequence:**

34. (2.5.1) Run subflow `launch_to_hub.yaml`.
35. (2.5.2) Tap Codex tab.
36. (2.5.3) Scroll down through entries (swipe up).
37. (2.5.4) Tap a Physics piece entry (e.g., Conveyor). Assert detail view renders with piece description.
38. (2.5.5) Navigate back to Codex list.
39. (2.5.6) Tap a Protocol piece entry (e.g., Config Node, using Codex ID `configNode`). Assert detail view renders.
40. (2.5.7) Navigate back to Codex list.

**Pass criteria:**

41. (2.5.8) Entries MUST render with correct PieceIcon instances. Detail views MUST show piece descriptions. Back navigation MUST return to the list without crash.

---

### 2.6 smoke_06 — A1-1 Full Tutorial Walk (Build 19 Regression Gate)

| Field | Value |
|-------|-------|
| Flow ID | smoke_06 |
| Filename | `smoke_06_a1_1_tutorial.yaml` |
| Checklist item | 6 — A1-1 full tutorial walk |
| Prerequisites | smoke_01 MUST pass |
| Max duration | 45s |

**Cross-references:**

42. (2.6.1) This flow MUST exercise the `awaitPlacement` step-transition boundary per REQ-A-1 (`docs/ANIMATION_RULES.md`). This is the Build 19 crash path. The Maestro suite becomes a sixth layer of defense against the native-driver host-swap SIGABRT.

**Action sequence:**

43. (2.6.2) Run subflow `launch_to_hub.yaml`.
44. (2.6.3) Navigate to Axiom sector, tap A1-1 level tile, enter level.
45. (2.6.4) For each tutorial step:
    - Assert tutorial overlay is visible.
    - Assert HUD spotlight tracks the target cell or element.
    - Assert backdrop is visible (non-interactive).
    - If the step is a placement step (`awaitPlacement: true`), place the prompted piece on the highlighted cell.
    - Assert step advances after correct placement.
46. (2.6.5) Specifically: advance through the `awaitPlacement` on/off boundary (the transition from a placement step to a non-placement step, and vice versa). This is the exact code path that caused Build 19 SIGABRT.
47. (2.6.6) After all tutorial steps, tap Engage.
48. (2.6.7) Assert level completes.
49. (2.6.8) Assert 3-star awarded (tutorial rule: always 3-star regardless of score).

**Pass criteria:**

50. (2.6.9) No SIGABRT. No layout crash on portal morph. No native-driver host orphan (REQ-A-1 violation symptom: crash on step transition).
51. (2.6.10) Step advances MUST occur only after correct placement on `awaitPlacement` steps.
52. (2.6.11) 3-star result MUST display on completion.
53. (2.6.12) Total flow duration MUST NOT exceed 45s. If the tutorial has more than 10 steps, the timeout MAY be extended to 60s, but this MUST be documented in the flow file comment.

---

### 2.7 smoke_07 — A1-2 through A1-8

| Field | Value |
|-------|-------|
| Flow ID | smoke_07 |
| Filename | `smoke_07_a1_2_through_a1_8.yaml` |
| Checklist item | 7 — A1-2 through A1-8 |
| Prerequisites | smoke_06 MUST pass (A1-1 tutorial unlocks A1-2) |
| Max duration | 90s |

**Action sequence:**

54. (2.7.1) For each level A1-2 through A1-8:
    - Run subflow `enter_axiom_level.yaml` with level parameter.
    - Assert board grid renders at correct dynamic size (board element is visible and non-zero dimensions).
    - Place at least one piece from tray onto board.
    - Assert Source auto-orients toward Terminal.
    - Tap Engage, observe result screen.
    - Return to Hub.
    - Assert Hub loads cleanly (no orphaned state).
55. (2.7.2) Each level iteration MUST complete within 12s.

**Pass criteria:**

56. (2.7.3) Every level MUST load. Board MUST render at dynamic size (BOARD_SIZE = SCREEN_WIDTH - 24).
57. (2.7.4) Source auto-orientation MUST occur. Return to Hub MUST not leave orphaned state.

---

### 2.8 smoke_08 — Piece Interactions

| Field | Value |
|-------|-------|
| Flow ID | smoke_08 |
| Filename | `smoke_08_piece_interactions.yaml` |
| Checklist item | 8 — Piece interactions |
| Prerequisites | smoke_01 MUST pass |
| Max duration | 30s |

**Action sequence:**

58. (2.8.1) Enter an Axiom level (A1-2 or later, where tray has Conveyor and Config Node).
59. (2.8.2) Drag Conveyor from tray to a valid board cell. Assert orange placement highlight is visible (Axiom sector only).
60. (2.8.3) Tap placed Conveyor. Assert rotation (90 degree change — verify via element property or visual assertion).
61. (2.8.4) Long press placed Conveyor. Assert piece returns to tray. Assert no ghost/held state (the piece element on the board MUST NOT be visible after long press; the tray count MUST increment).
62. (2.8.5) If Config Node is available: place Config Node. Assert Protocol purple color (#8B5CF6). Tap Config Node. Assert `configValue` cycles (0 to 1 or 1 to 0).
63. (2.8.6) If Latch is available: place Latch. Tap Latch. Assert `latchMode` toggles.
64. (2.8.7) Tap any other placed piece (not Conveyor, Config Node, or Latch). Assert no rotation occurs. Assert no state change.

**Pass criteria:**

65. (2.8.8) Only Conveyor rotates on tap. Only Config Node cycles on tap. Only Latch toggles on tap. Long press MUST return piece to tray directly — no ghost/held intermediate state.

---

### 2.9 smoke_09 — Signal Beam Animation

| Field | Value |
|-------|-------|
| Flow ID | smoke_09 |
| Filename | `smoke_09_signal_beam.yaml` |
| Checklist item | 9 — Signal beam animation |
| Prerequisites | smoke_01 MUST pass |
| Max duration | 20s |

**Action sequence:**

66. (2.9.1) Enter a solvable Axiom level. Place pieces to create a valid path.
67. (2.9.2) Tap Engage.
68. (2.9.3) Assert CHARGE phase element visible (beam builds from Source).
69. (2.9.4) Wait for BEAM phase. Assert signal traversal element visible.
70. (2.9.5) Wait for LOCK phase. Assert Terminal ring/glow element visible.

**Pass criteria:**

71. (2.9.6) All three phases MUST render sequentially. The flow MUST NOT timeout during any phase transition (each phase must complete within 3000ms).
72. (2.9.7) FPS measurement is NOT automatable in Maestro. The flow verifies that the animation completes without hang or crash. Actual FPS measurement (30 FPS sustained, no drops below 24 FPS) remains a manual verification item, captured in item 17.

---

### 2.10 smoke_10 — Tape System

| Field | Value |
|-------|-------|
| Flow ID | smoke_10 |
| Filename | `smoke_10_tape_system.yaml` |
| Checklist item | 10 — Tape system |
| Prerequisites | smoke_06 MUST pass (need A1-5+ unlocked) |
| Max duration | 25s |

**Action sequence:**

73. (2.10.1) Enter a level that uses tapes (A1-5 or later, or any level with IN/TRAIL/OUT tapes).
74. (2.10.2) Assert IN tape element visible with correct color.
75. (2.10.3) Assert TRAIL tape element visible (if present for this level).
76. (2.10.4) Assert OUT tape element visible.
77. (2.10.5) Place pieces and tap Engage.
78. (2.10.6) During or after engagement, assert tape values have updated (at minimum, OUT tape shows a recorded value).

**Pass criteria:**

79. (2.10.7) All tape elements present for the level MUST render. Colors MUST match the defined palette. Values MUST update during signal progression.

---

### 2.11 smoke_11 — Credit Economy

| Field | Value |
|-------|-------|
| Flow ID | smoke_11 |
| Filename | `smoke_11_credit_economy.yaml` |
| Checklist item | 11 — Credit economy |
| Prerequisites | smoke_01 MUST pass |
| Max duration | 20s |

**Action sequence:**

80. (2.11.1) Enter a level with purchasable pieces (requisition screen available).
81. (2.11.2) Assert credit balance element visible. Record initial balance.
82. (2.11.3) Purchase a piece. Assert balance decrements by piece cost.
83. (2.11.4) If balance is near zero, attempt another purchase that would exceed remaining balance. Assert purchase denied (button disabled or error message). Assert balance does not go negative.

**Pass criteria:**

84. (2.11.5) Balance MUST decrement correctly. Balance MUST NOT go below zero. No crash on insufficient-CR purchase attempt.

---

### 2.12 smoke_12 — Arc Wheel Tutorial (Build 19 Regression Gate)

| Field | Value |
|-------|-------|
| Flow ID | smoke_12 |
| Filename | `smoke_12_arc_wheel_tutorial.yaml` |
| Checklist item | 12 — Arc wheel tutorial |
| Prerequisites | smoke_01 MUST pass |
| Max duration | 25s |

**Cross-references:**

85. (2.12.1) This flow MUST exercise the `awaitPlacement` step-transition boundary per REQ-A-1 (`docs/ANIMATION_RULES.md`). The arc-wheel-tutorial commit (`88c0b99`) was the direct cause of Build 19 SIGABRT. The `dimOpacity` host swap on `awaitPlacement` toggle is the specific anti-pattern.

**Action sequence:**

86. (2.12.2) Navigate to the first encounter with the arc wheel (reset state if necessary to trigger the tutorial).
87. (2.12.3) Assert tutorial overlay renders.
88. (2.12.4) Advance through each tutorial step by tapping.
89. (2.12.5) Specifically: exercise the step transition that crosses the `awaitPlacement` boundary (the transition from non-placement to placement or vice versa within the arc wheel tutorial sequence).
90. (2.12.6) After tutorial completes, assert the arc wheel responds to input (swipe or drag).

**Pass criteria:**

91. (2.12.7) No SIGABRT. No native-driver host orphan. Tutorial steps MUST advance without crash. Arc wheel MUST be interactive after tutorial completion.
92. (2.12.8) This flow, together with smoke_06, provides automated regression coverage for the Build 19 crash path. Both MUST pass for the smoke suite to pass.

---

### 2.13 smoke_13 — HUD Overlay and COGS AI Orb States

| Field | Value |
|-------|-------|
| Flow ID | smoke_13 |
| Filename | `smoke_13_hud_cogs_ai_orb.yaml` |
| Checklist item | 13 — HUD overlay + COGS AI Orb states |
| Prerequisites | smoke_01 MUST pass |
| Max duration | 25s |

**Action sequence:**

93. (2.13.1) Enter an Axiom level.
94. (2.13.2) Assert COGS AI Orb element visible. Assert eye color is blue (operations state, hex #0077FF or testID-based state assertion).
95. (2.13.3) Tap Engage. Assert eye color transitions to amber (engagement state).
96. (2.13.4) On successful completion: assert eye color transitions to green (warmth state).
97. (2.13.5) If failure can be triggered (e.g., engage with no pieces or wrong path): assert eye color transitions to red (damage state).
98. (2.13.6) Assert HUD corner brackets are visible on gameplay screen (tactical/operational).
99. (2.13.7) Navigate to a personal screen (Settings). Assert no HUD corner brackets.

**Pass criteria:**

100. (2.13.8) Eye color MUST match state: blue=operations, amber=engagement, green=warmth, red=damage. HUD chrome MUST appear on tactical/operational screens only.

---

### 2.14 smoke_14 — Daily Challenge

| Field | Value |
|-------|-------|
| Flow ID | smoke_14 |
| Filename | `smoke_14_daily_challenge.yaml` |
| Checklist item | 14 — Daily challenge |
| Prerequisites | smoke_01 MUST pass |
| Max duration | 15s |

**Action sequence:**

101. (2.14.1) Run subflow `launch_to_hub.yaml`.
102. (2.14.2) Tap Daily Challenge tab.
103. (2.14.3) Assert challenge content loads (challenge card or challenge details visible).
104. (2.14.4) If completion state, assert completion indicator visible.
105. (2.14.5) Navigate away and return. Assert no crash on repeated opens.

**Pass criteria:**

106. (2.14.6) Challenge MUST be available or show valid completion state. No crash on repeated opens. Timer (if shown) MUST display a valid value.

---

### 2.15 smoke_15 — Kepler Levels

| Field | Value |
|-------|-------|
| Flow ID | smoke_15 |
| Filename | `smoke_15_kepler_levels.yaml` |
| Checklist item | 15 — Kepler levels in build |
| Prerequisites | smoke_01 MUST pass |
| Max duration | 45s |

**Action sequence:**

107. (2.15.1) Navigate to Hub, tap Kepler sector card.
108. (2.15.2) For each Kepler level currently in the build (K1-1, K1-9, K1-10 at time of writing — this list MUST be updated as levels land):
    - Tap level tile. Assert level loads.
    - Assert no placement highlights (non-Axiom sector).
    - Assert wire connections (dashed lines) render.
    - If tutorial intro present, tap through it.
    - Tap Engage at least once.
    - Return to sector map.
109. (2.15.3) If Kepler sector is not yet in the build, this flow MUST skip gracefully (not FAIL).

**Pass criteria:**

110. (2.15.4) Levels MUST load. Placement highlights MUST NOT appear. Wire connections MUST render. No crash.
111. (2.15.5) The Kepler level list in this flow MUST be updated whenever new Kepler levels ship, per the update protocol in `PRE_TESTFLIGHT_SMOKE_CHECKLIST.md` section G.

---

### 2.16 smoke_16 — Back Navigation

| Field | Value |
|-------|-------|
| Flow ID | smoke_16 |
| Filename | `smoke_16_back_navigation.yaml` |
| Checklist item | 16 — Navigation back paths |
| Prerequisites | smoke_01 MUST pass |
| Max duration | 30s |

**Action sequence:**

112. (2.16.1) Navigate to a deep screen (gameplay level).
113. (2.16.2) Tap back button. Assert parent screen loads.
114. (2.16.3) Navigate to Codex detail view.
115. (2.16.4) Tap back button. Assert Codex list loads.
116. (2.16.5) Navigate to Settings.
117. (2.16.6) Tap Hub via bottom nav. Assert Hub loads.
118. (2.16.7) Navigate to a deep screen again. Use swipe-back gesture. Assert parent screen loads.
119. (2.16.8) After each navigation, assert no orphaned modals (no unexpected overlay or modal element visible).

**Pass criteria:**

120. (2.16.9) Every back path MUST return to the expected parent. No double-back. No orphaned modals. No leaked state (e.g., placed pieces from a previous level appearing in a new context).

---

### 2.17 smoke_17 — Performance Baseline (MANUAL ONLY)

121. (2.17.1) Item 17 (FPS measurement) is NOT automatable via Maestro. Maestro does not provide frame-rate instrumentation. Xcode Instruments or a native performance profiler is required.
122. (2.17.2) This item MUST remain in the manual device walk checklist.
123. (2.17.3) No YAML flow file SHALL be created for this item.

**Rationale:** FPS measurement requires native profiling tools (Xcode Instruments, GPU Report). Maestro can detect hangs (via timeout) but cannot measure sustained frame rates or detect sub-24-FPS drops. The signal beam animation flow (smoke_09) provides hang detection but not frame-rate measurement.

---

### 2.18 smoke_18 — Settings Persistence

| Field | Value |
|-------|-------|
| Flow ID | smoke_18 |
| Filename | `smoke_18_settings_persistence.yaml` |
| Checklist item | 18 — Settings persistence |
| Prerequisites | smoke_01 MUST pass |
| Max duration | 20s |

**Action sequence:**

124. (2.18.1) Run subflow `launch_to_hub.yaml`.
125. (2.18.2) Navigate to Settings.
126. (2.18.3) Toggle a setting (any available toggle — use one with a visible `testID`).
127. (2.18.4) Record the new toggle state.
128. (2.18.5) Kill the app (`stopApp`).
129. (2.18.6) Relaunch (`launchApp` — cold start, no `clearState`).
130. (2.18.7) Navigate to Settings.
131. (2.18.8) Assert the toggle state matches the value set in step (2.18.3).

**Pass criteria:**

132. (2.18.9) Changed setting MUST persist across force-close and relaunch. No reset to defaults. No crash on cold relaunch after settings change.

---

## 3. RUNNER

### 3.1 Language and location

133. (3.1.1) The runner MUST be a POSIX-compatible shell script at `scripts/run-smoke.sh`.
134. (3.1.2) The script MUST be executable (`chmod +x`).

**Rationale:** Shell is the simplest option with zero additional dependencies. The runner does not need Node or Python — it orchestrates `maestro test` invocations and parses exit codes. Every CI environment and local dev machine has a POSIX shell.

### 3.2 Execution model

135. (3.2.1) Flows MUST execute sequentially in numerical order (smoke_01, smoke_02, ..., smoke_18), skipping items 04 and 17 (manual-only).
136. (3.2.2) Parallel execution is NOT RECOMMENDED. Flows share simulator state (app data, navigation position). Parallel runs would produce nondeterministic failures.
137. (3.2.3) If smoke_01 (cold launch) fails, the runner MUST abort immediately. All subsequent flows depend on a successful cold launch.
138. (3.2.4) If smoke_06 (A1-1 tutorial) fails, the runner MUST abort. Flows that depend on level unlock state (smoke_07, smoke_10) cannot proceed.
139. (3.2.5) For all other flows: if a flow fails, the runner MUST record the failure and continue to the next flow. A single failure in a non-blocking flow does not abort the suite.

### 3.3 Output format

140. (3.3.1) The runner MUST produce structured output to stdout in the following format:

```
==============================
SMOKE SUITE — The Axiom
==============================
Build:   <git describe or short SHA>
Date:    <ISO 8601 timestamp>
Device:  <simulator name>
------------------------------
[PASS] smoke_01  Cold Launch              (4.2s)
[PASS] smoke_02  Bottom Nav               (8.1s)
[PASS] smoke_03  Hub Sectors              (7.3s)
[SKIP] smoke_04  Haptics (manual only)
[PASS] smoke_05  Codex                    (9.0s)
...
[SKIP] smoke_17  FPS Baseline (manual only)
[PASS] smoke_18  Settings Persistence     (11.2s)
------------------------------
RESULT: 16/16 PASS (2 SKIP manual)
Total time: 4m 12s
==============================
```

141. (3.3.2) The runner MUST also write a machine-parseable JSON report to `smoke-results.json` in the repo root (gitignored):

```json
{
  "suite": "smoke",
  "timestamp": "2026-05-01T14:30:00Z",
  "build": "v0.9.20-g961d8c3",
  "device": "iPhone 15 Pro (simulator)",
  "results": [
    { "id": "smoke_01", "name": "Cold Launch", "status": "PASS", "duration_ms": 4200 },
    { "id": "smoke_04", "name": "Haptics", "status": "SKIP", "reason": "manual only" },
    ...
  ],
  "summary": { "pass": 16, "fail": 0, "skip": 2, "total": 18 }
}
```

142. (3.3.3) `smoke-results.json` MUST be added to `.gitignore`.

### 3.4 Exit codes

143. (3.4.1) Exit code 0: all 16 automated flows passed.
144. (3.4.2) Exit code 1: one or more flows failed.
145. (3.4.3) Exit code 2: runner infrastructure error (Maestro not installed, simulator not booted, etc.).

### 3.5 npm scripts

146. (3.5.1) The following npm scripts MUST be added to `package.json`:

```json
{
  "smoke": "bash scripts/run-smoke.sh",
  "smoke:ci": "bash scripts/run-smoke.sh --ci"
}
```

147. (3.5.2) The `--ci` flag MUST suppress interactive output (colors, progress bars) and MUST exit with the appropriate code without prompting.
148. (3.5.3) `npm run smoke` is the local developer invocation. `npm run smoke:ci` is the CI invocation. Both run the identical flow set.

### 3.6 No bypass mechanism

149. (3.6.1) The runner MUST NOT accept a `--skip-smoke`, `--force`, or any flag that bypasses individual flows or the entire suite.
150. (3.6.2) There SHALL be no environment variable that disables smoke execution.
151. (3.6.3) Emergency bypasses route through Tucker, not script switches. If a build must ship without smoke (an event that should never occur), Tucker manually invokes `eas-cli` directly, bypassing the `/build` command entirely.

### 3.7 Prerequisites check

152. (3.7.1) Before running any flow, the runner MUST verify:
    - `maestro` CLI is installed and on PATH.
    - An iOS simulator is booted (or boot one automatically).
    - The app is built and installed on the simulator.
153. (3.7.2) If any prerequisite is missing, the runner MUST print a diagnostic message and exit with code 2.

---

## 4. BUILD GATE

### 4.1 Option evaluation

Three options were evaluated for gating `eas build` on smoke results:

**Option A: npm prebuild script**

- Mechanism: Add `"preeas-build"` or `"prebuild"` script to `package.json` that runs `npm run smoke`.
- Feasibility: npm lifecycle scripts like `prebuild` only fire for `npm run build`, not for `npx eas-cli build`. EAS CLI does not respect npm lifecycle hooks. This option is NOT feasible.
- Verdict: REJECTED.

**Option B: EAS build hook**

- Mechanism: Use `eas.json` build hooks (`prebuild` phase) to run Maestro flows.
- Feasibility: EAS Cloud build environment does NOT include Maestro CLI or an iOS simulator. Maestro flows require a running simulator with the app installed. EAS builds happen on Expo's remote infrastructure. This option is NOT feasible.
- Verdict: REJECTED.

**Option C: Local `/build` slash command runs smoke first**

- Mechanism: Modify `.claude/commands/build.md` to add a Phase 0 that runs `npm run smoke` before the existing Phase 1 (prompt execution) and Phase 2 (EAS build + submit).
- Feasibility: The `/build` command already runs in a local environment with access to the shell, simulator, and Maestro. It already gates on quality checks (lint, typecheck, test, audit). Adding smoke as a prerequisite is a natural extension.
- Verdict: SELECTED.

### 4.2 Implementation specification

154. (4.2.1) The `/build` slash command (`.claude/commands/build.md`) MUST be modified to add a Phase 0: Smoke.
155. (4.2.2) Phase 0 MUST execute before Phase 1 (prompt execution).
156. (4.2.3) Phase 0 sequence:
    - Run `npm run smoke:ci`.
    - If exit code is 0, proceed to Phase 1.
    - If exit code is 1 or 2, STOP. Do not proceed. Write the failure to `cowork-prompts/LAST_REPORT.md` with the smoke failure details.
157. (4.2.4) The `/build` command Phase 0 MUST NOT be bypassable. There is no `--skip-smoke` flag on `/build`.

### 4.3 Updated `/build` phase sequence

```
Phase 0: Smoke    — npm run smoke:ci     (NEW)
Phase 1: Prompt   — execute RECENT.md, run quality gates, commit
Phase 2: Build    — push, eas build, eas submit
```

158. (4.3.1) If Phase 0 fails, Phase 1 and Phase 2 MUST NOT execute.
159. (4.3.2) The LAST_REPORT.md template MUST be extended to include a Smoke section:

```
## Smoke
- **Result:** PASS | FAIL
- **Flows passed:** N/16
- **Failed flows:** <list or "None">
- **Duration:** <total time>
```

### 4.4 Direct eas-cli invocation

160. (4.4.1) Developers MAY invoke `npx eas-cli build` directly, bypassing the `/build` command. This is the emergency escape hatch.
161. (4.4.2) Direct invocation MUST be accompanied by Tucker approval and MUST be documented in the run record with justification.
162. (4.4.3) The runner script itself provides no enforcement against direct `eas-cli` invocation. The enforcement is procedural (Dispatch standing rule) not technical.

---

## 5. MANUAL CADENCE

### 5.1 Proposed schedule

163. (5.1.1) Weekly during active development: one full 18-item manual device walk per week, on the primary device (iPhone 15 Pro Max). RECOMMENDED day: Friday before end of work. Run record filed to `qa-reports/smoke-runs/RUN_YYYY-MM-DD.md`.

164. (5.1.2) Required pre-MVP (May 8, 2026): one full 18-item manual device walk on the master HEAD that will become the MVP build. This walk MUST include items 4 (haptics) and 17 (FPS), which are not covered by the automated suite. This walk MUST be completed no more than 2 hours before the `eas build` invocation.

165. (5.1.3) Per-release: one full 18-item manual device walk before every `eas build --profile testflight` and every `eas build --profile production`. The automated smoke suite runs first (via `/build` Phase 0). The manual walk covers items 4 and 17 plus serves as a human sanity check on all 18 items.

### 5.2 Manual-only items

166. (5.2.1) Items 4 (haptics toggle) and 17 (FPS measurement) MUST always be part of the manual walk. They cannot be deferred or skipped.
167. (5.2.2) If the manual walk reveals a FAIL on any item (including the 16 automated items), the automated suite MUST be re-evaluated. A manual FAIL on an item that the automated suite marked PASS indicates a gap in the automation coverage.

### 5.3 Tucker locks the cadence

168. (5.3.1) The cadence proposed in 5.1 is a RECOMMENDATION. Tucker sets the final cadence. This spec proposes; Tucker disposes.

---

## 6. CROSS-REFERENCES

| Document | Location | Relevance |
|----------|----------|-----------|
| Smoke checklist | `qa-reports/PRE_TESTFLIGHT_SMOKE_CHECKLIST.md` | Source of the 18 items |
| Animation rules | `docs/ANIMATION_RULES.md` | REQ-A-1, Build 19 crash path |
| Build command | `.claude/commands/build.md` | Modified by section 4 |
| Existing Maestro flows | `.maestro/flows/` | Naming, style, `appId` reference |
| Computational model | `docs/COMPUTATIONAL_MODEL.md` | Tape/signal layer reference |
| Jest config | `jest.config.js` | Test project structure for runner test |

---

## 7. CHANGELOG

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-05-01 | SE | Initial spec |
