# PROMPT_159 — Driven screenshot harness

**Mission:** AXM-011 · **Branch:** `feat/axm-011-screenshot-harness` · **Date:** 2026-09-20
(run completed 2026-09-21 local time)

---

## Status — the run happened, on Android

An earlier version of this report opened with "no run happened, and why": the harness was
iOS-simulator-only and this is a Windows machine.

**That is no longer true.** T-Bot widened the scope on 2026-09-20: the Android emulator now
carries the board-size decision, the driven gameplay loop, damaged cells and legibility, and the
Android shots are authoritative for those things. The toolchain was installed on this Windows 11
machine, the app was built and installed on three emulators, and the flows were driven for real.

**What it still does not cover:** REQ-A-1..A-3. See *What still needs a macOS machine*.

---

## The board-size standard — decided

Tucker set the three sizes on **2026-09-20**, closing the decision that
`PROMPT_159_DECISION_BOARD_SIZES.md` raised and left OPEN:

| Name | Columns × Rows |
|------|----------------|
| S    | 8 × 6          |
| M    | 10 × 7         |
| L    | 10 × 9         |

They are wired as the default `--sizes` set — `BOARD_SIZE_STANDARD` in
`src/utils/boardSizeOverride.ts` — and remain overridable, so a future candidate set is an
argument rather than a code change.

---

## The toolchain that was installed

Tucker explicitly authorised developer tooling installs. Nothing outside the standard mobile
toolchain was installed, and no system or security setting was changed.

| Component | Version | How |
|---|---|---|
| JDK | Microsoft OpenJDK 17.0.20.1 LTS | **Portable zip** to `C:\Android\jdk17` |
| Android cmdline-tools | 11076708 | zip to `C:\Android\sdk\cmdline-tools\latest` |
| platform-tools (adb) | 37.0.1 | `sdkmanager` |
| emulator + system image | `android-35;google_apis;x86_64` | `sdkmanager` |
| platforms / build-tools | android-35, android-36 / 36.0.0 | `sdkmanager` |
| NDK | 27.1.12297006 | pulled automatically by the Gradle build |
| **Maestro** | **2.10.0** | zip to `C:\Android\maestro-root`, run as `maestro.bat` |

Three things are worth recording because they each cost time:

1. **`winget install Microsoft.OpenJDK.17` could not complete.** The MSI requests elevation, and a
   UAC dialog cannot be answered from a non-interactive session — the install waited forever. The
   portable **zip** JDK needs no elevation and was used instead. Prefer the zip on this machine.
2. **Maestro did not need WSL.** Maestro's Windows support is officially "unsupported, use WSL",
   and a WSL Ubuntu distro *was* installed on that assumption. It proved unnecessary: Maestro
   ships a Gradle start script, `bin/maestro.bat`, and every `maestro test` run worked natively
   against the Windows `adb`. **The route used was native Windows, not WSL.** The Ubuntu distro is
   installed but unused and can be removed.
3. **Node cannot spawn `maestro.bat` without a shell.** `spawnSync` goes through `CreateProcess`,
   which resolves only `.exe` from PATH, so the runner fails with ENOENT on a machine where
   `maestro` works fine in the terminal. `NEEDS_SHELL` in `src/shots/adb.ts` is that fix.

Accepting the Android SDK licences (`sdkmanager --licenses`) was unavoidable — the SDK cannot be
installed without it — and is flagged here rather than buried.

---

## The Android device matrix, and why these three

`src/shots/androidDevices.ts`. Chosen by **measured density-independent width**, the number a
React Native layout actually sees, not by marketing name or diagonal inches.

| Alias | AVD | Panel | dp | Stands for |
|---|---|---|---|---|
| `compact` | `axiom_compact` | 720×1280 @ 320dpi | **360 × 640** | the Android baseline width |
| `standard` | `axiom_standard` | 1080×2400 @ 420dpi | **411 × 914** | Pixel 6/7/8-class |
| `large` | `axiom_large` | 1344×2992 @ 480dpi | **448 × 997** | Pixel 9 Pro XL-class |

**The obvious matrix does not work.** Pixel 7 and Pixel 7 Pro are physically different phones and
both report **411 dp** wide (1080×2400 @ 420dpi and 1440×3120 @ 560dpi) — confirmed on booted
emulators with `adb shell wm size` + `wm density`. A sweep across those two produces six images
that differ only in pixel count and prove nothing about board sizing. The `large` AVD is therefore
configured to the reported geometry of a Pixel 9 Pro XL, a real 448 dp device.

`assertDistinctWidths` fails the matrix if two entries ever collide on dp width again, and it is
unit tested. For comparison the iOS matrix spans 375 / 393 / 430 dp, so the Android spread
brackets it at both ends.

---

## The commands, and how long they took

Build. The `testflight` profile is exactly `EXPO_PUBLIC_SHOW_DEV_TOOLS=true` per `eas.json`, so no
EAS cloud build was needed to get the dev board-size toggle:

```
$env:EXPO_PUBLIC_SHOW_DEV_TOOLS = "true"
npx expo prebuild --platform android --no-install
cd android
.\gradlew.bat assembleRelease --no-daemon -x lint -PreactNativeArchitectures=x86_64
```

**6m 07s**, producing `android/app/build/outputs/apk/release/app-release.apk` (36,052,361 bytes).
The `-PreactNativeArchitectures=x86_64` filter matters: the default builds all four ABIs and the
first attempt was on track to spend roughly four times as long compiling C++ nobody would run.

The board-size sweep — the nine images:

```
node .shots-build/shots/cli.js --platform android --label board-size-standard \
     --devices compact,standard,large --sizes 8x6,10x7,10x9 --level A1-3 \
     --flows ".maestro/flows/shots/board-size-sweep.yaml" --keep-booted
```

**778 seconds (12m 58s)** for nine flow runs across three emulators, including two cold emulator
boots. **9 of 9 passed.**

The gameplay loop:

```
node .shots-build/shots/cli.js --platform android --label gameplay-loop \
     --devices standard --level A1-3 \
     --flows ".maestro/flows/shots/gameplay-loop.yaml" --keep-booted
```

**1m 19s**, passed.

> **Invoke the compiled CLI directly, not through `npm run shots --`.** npm swallows
> `--platform`, `--sizes`, `--level` and `--flows` — it treats them as its own config and strips
> them before the script sees them, so the runner reports `--label is required` on a command line
> that plainly has one. `npm run shots` remains correct for a no-argument run; anything with flags
> goes through `node .shots-build/shots/cli.js` after `npx tsc -p tsconfig.shots.json`.

Release build, not debug, on purpose: a debug build needs a Metro server alive for the whole run,
and a dev-server disconnect mid-flow would look like a flow failure.

---

## The manifest

`__shots__/2026-09-21-board-size-standard/manifest.json`, schema v2:

```json
{
  "schemaVersion": 2,
  "label": "board-size-standard",
  "platform": "android",
  "startedAt": "2026-09-21T03:23:55.140Z",
  "finishedAt": "2026-09-21T03:36:49.820Z",
  "appVersion": "0.9.265",
  "gitSha": "773e323",
  "devices": [
    { "alias": "compact",  "platform": "android", "target": "axiom_compact",  "width": 360, "height": 640 },
    { "alias": "standard", "platform": "android", "target": "axiom_standard", "width": 411, "height": 914 },
    { "alias": "large",    "platform": "android", "target": "axiom_large",    "width": 448, "height": 997 }
  ],
  "boardSizes": ["8x6", "10x7", "10x9"],
  "shots": [ "9 entries, one per device x size" ]
}
```

Every one of the nine shot entries carries `"platform": "android"`, and every device slug and
every committed filename begins with `android-`. **Nothing in this run can be mistaken for an iOS
shot later.** That is why the schema went to v2: v1 had no `platform` field anywhere, and the
device entry's iOS-only `simulatorName` became the platform-neutral `target`.

---

## Task 2 — what the loop could and could not be driven through

| Stage | Result |
|---|---|
| Mission dossier | **Captured** — `01-mission-dossier.png` |
| REQUISITION before purchase | **Not reached** — A1-3 has no requisition gate; the step is conditional and skipped |
| REQUISITION after purchase | **Not reached** — same reason |
| Board on entry | **Captured** — `04-board-on-entry.png` |
| Piece placement from the tray | **Captured** — `05-piece-placed.png` |
| Conveyor rotate tap | **Captured** — `06-conveyor-rotated.png` |
| ENGAGE | **Captured** — `07-engage.png` |
| Signal running mid-beam | **Captured** — `08-signal-mid-beam.png` |
| Results with score breakdown | **Not reached** — the flow does not solve the level |
| Arc Wheel | **Not reached** — Kepler+ levels only; A1-3 is an Axiom-sector level and never renders it |

**Results screen.** The flow places one Conveyor, which does not solve A1-3, so the run never
produces a results screen. The step is wrapped in a `when: visible: "CONTINUE"` condition and is
skipped. Capturing it needs a flow that actually solves the level — real work, not pretended here.

**The placement shot nearly lied, and this is worth recording.** The first passing run captured a
`05-piece-placed.png` with **no piece in it**. Picking a piece up highlights only the cells
adjacent to an existing node; a tap anywhere else is silently swallowed and leaves the piece in
hand. A blind `50%,45%` tap did exactly that, and the flow still reported PASS because every
command had succeeded. The fix aims the tap at a legal ghost cell, and the corrected shot shows
the CONV count drop 5 → 4, a conveyor wired to the Source, and ENGAGE MACHINE going live. **A
green Maestro run is not evidence that a screenshot shows what its filename claims.** Every image
cited in this report was looked at.

**Board cells cannot be selected by id.** `GameplayScreen` sets a `board-cell-<x>-<y>` testID, but
React Native does not surface those testIDs in the Android view hierarchy — Maestro cannot see
them, and neither can `uiautomator`. The tab-bar testIDs (`sectors-tab`, `engineer-tab`) and the
dev chips (`dev-board-columns-8`) **do** surface and are used. Board cells are therefore tapped by
**point percentage**, which is level- and board-size-specific and is the one place the flow is not
selector-driven.

### Selector corrections — every flow in PR #47 was unrunnable

The flows shipped in PR #47 had never been executed. Driving them for the first time found these,
all now fixed:

| Problem | Detail |
|---|---|
| **Wrong app id** | Every flow declared `com.tuckbrady.theaxiom`. The real id is `com.tuckerbrady.theaxiom` — missing the "er". It matches neither the iOS bundle id nor the Android package, so **no flow could ever have launched the app on either platform.** |
| **Maestro selectors are FULL-match regexes** | `"THE AXIOM"` does not match the boot-log header `"THE AXIOM — SYSTEM BOOT LOG"`. This alone invalidated most selectors. Fixed with explicit `.*`. |
| **Hub screen names were invented** | `enter-hub` tapped an `"ENTER"` button and asserted a screen called `"HUB"`. The real control is **`BEGIN`** and the real screen is **`COMMAND DECK`**. |
| **First-run onboarding was not handled at all** | A fresh emulator lands in a boot log, not the hub, and there is no skip. Onboarding is now driven end to end by the new `subflows/complete-onboarding.yaml`. |
| **The DAILY TRANSMISSION modal** | Appears on the first launch of a calendar day and covers the hub entirely. Now dismissed conditionally. |
| **Typewriter text** | Almost every screen types its text out and mounts its control only when finished. Branching straight after `launchApp` reads a half-drawn screen. Every tap is now preceded by an explicit wait. |
| **The third transmission has a different CTA** | Cards 01 and 02 say `TAP TO CONTINUE`; card 03 says **`PROCEED TO REPAIR BAY`**. |
| **`evalScript` resolved to empty** | Splitting `BOARD_SIZE` with `evalScript` parsed, reported COMPLETED, and produced a silent `id: dev-board-columns-` lookup. The runner now passes `BOARD_COLUMNS` / `BOARD_ROWS` directly. |
| **An `env:` block of empty defaults beats `-e`** | `BOARD_SIZE: ""` in a subflow's `env:` won over the value passed on the command line. The keys are now left undeclared so a missing value fails loudly. |
| **`takeScreenshot` is sandboxed** | Maestro 2.10 refuses any path resolving outside the run's own artifact folder, so the `SHOT_DIR`-prefixed absolute paths could never have worked. The runner now points `--test-output-dir` at a per-job folder and lifts `takeScreenshot/*.png` out of it. |
| **The COGS hint card covers the board** | A1-3 opens with a teaching overlay over the lower half of the board, dimming the rest. The first sweep produced nine unusable images. Flows now tap `SKIP` until none is left. |

---

## Board sizes — the read

**These nine images are Android.** `project-docs/SHOTS/board-size-standard/`, all nine committed,
every filename prefixed `android-`.

Measured cell pitch, read off the grid dots in each image:

| Device | S — 8×6 | M — 10×7 | L — 10×9 |
|---|---|---|---|
| compact 360 dp | **40 dp** | 32 dp | 31 dp |
| standard 411 dp | **46 dp** | 37 dp | 37 dp |
| large 448 dp | **51 dp** | 40 dp | 40 dp |

### The finding that decides it: the board is width-bound

The board container is a fixed box and the grid fits itself to the **column count**. Rows barely
matter — **10×7 and 10×9 have identical cell pitch on every device.** Adding rows costs nothing in
cell size; it only spends vertical space that is otherwise empty.

Two consequences follow directly, and neither is arguable from numbers alone:

1. **At a given column count, always prefer the taller board.** L (10×9) is strictly better than
   M (10×7) — same cell size, more board, less dead space.
2. **M (10×7) never wins on any device in the matrix.** It is dominated by L everywhere. The
   three-rung standard has a redundant middle rung, and the real decision is **8 columns or 10**.

### Per device

**compact, 360 dp — S (8×6) wins, and it is the only usable size.**
8×6 gives 40 dp cells. Both 10-column boards collapse to 31–32 dp, far below the 48 dp Material
minimum and below Apple's 44 pt, and the low-contrast empty-cell dots very nearly disappear at
that scale. S is not a preference here; it is the only size that survives.

**standard, 411 dp — L (10×9) wins.**
37 dp cells, identical to 10×7, with two extra rows of board for free and much better use of the
vertical space. S at 46 dp is the most comfortable to tap and the most legible, and it is the
right answer if touch accuracy is the priority — but it wastes a lot of board area. 37 dp is under
the 48 dp guideline and is the one number in this table I would want playtested rather than
accepted on my say-so.

**large, 448 dp — L (10×9) wins comfortably.**
40 dp cells at 10 columns, the same pitch S gets on the compact device. Everything is legible, the
Source and Output icons are unambiguous, and the taller board finally makes the vertical space
earn its place. S at 51 dp is the largest, clearest grid in the whole set and also the emptiest.

### Two things that are not about size

- **Vertical dead space is significant on every device at every size.** The board is vertically
  centred in a much taller area, with a large gap between the TRAIL row and the top of the grid.
  L uses it best; S wastes the most. Worth its own look.
- **Empty-cell dots are very low contrast at all sizes** and are close to invisible at 31 dp on
  the compact device. That is a legibility problem independent of the board-size decision, and it
  gets worse as columns increase.

### One legibility bug found in passing

On the 360 dp compact device the C.O.G.S transmission header collides: `DISTRESS SIGNAL` and
`SYSTEM CRITICAL` render with no gap, reading as **"DISTRESS SIGNALSYSTEM CRITICAL"**. Visible in
the onboarding screens at that width. Not fixed here — it is UI copy and layout, outside this
mission's hard limits — but it is real and reproducible at 360 dp.

---

## REQ-A-1..A-3 — still uncovered, and why

**No Android result in this report is evidence about REQ-A-1..A-3, and the animation-host flow was
not run.**

REQ-A-1..A-3 is a specific native crash class: a SIGABRT out of an `Animated.View` host swap on
iOS, as seen in builds 20/21/25/34. It is an iOS/Hermes failure mode. An Android emulator cannot
produce it, cannot rule it out, and a green Android run would mean nothing — exactly the argument
PROMPT_159 makes against a web run.

To keep that boundary mechanical rather than a matter of discipline:

- `assertMacHost` **still guards the iOS path** in `cli.ts` and is unit tested. The Android branch
  does not call it; the iOS branch still refuses any non-darwin host.
- `ANDROID_LOG_FAILURE_PATTERNS` in `src/shots/androidLog.ts` is deliberately **narrower** than the
  iOS list. It covers "the run did not actually work" — a native crash of our process, a redbox,
  an ANR — and deliberately omits `RCTFatal` and the iOS SIGABRT signature. There is a unit test
  asserting the Android list does **not** carry the iOS crash signatures, so nobody can later read
  an Android pass as an A-series pass.
- The runner prints `Log scan FAILED` on Android, not `Animation-host safety FAILED`.

`animation-host-safety.yaml` remains in the repo, unrun, with its iOS selectors unverified.

---
## What was built

### The runner — `npm run shots`

```
npm run shots -- --label <name> [--devices se,15,max] [--flows <glob>]
                 [--sizes 8x7,9x8,10x9] [--level A1-3] [--out <dir>]
                 [--date YYYY-MM-DD] [--build-if-missing] [--keep-booted] [--dry-run]
```

Split so that the half that makes decisions is testable on a machine with no simulator, and the
half that touches processes is as thin as possible.

| File | What it is |
|---|---|
| `src/shots/args.ts` | Argument parsing. Pure — takes argv and an injected `today`, no clock, no fs, no `process`. |
| `src/shots/devices.ts` | The device matrix: iPhone SE (3rd gen), iPhone 15, iPhone 15 Pro Max, with simulator names, slugs and point widths. |
| `src/shots/manifest.ts` | Run-directory layout, step naming, manifest construction and the writer (fs injected as an interface). |
| `src/shots/plan.ts` | The run plan: which flow runs on which device at which size, where its shots and log land, and the exact Maestro command line. Pure. |
| `src/shots/host.ts` | Host precondition (`assertMacHost`) and the device-log failure scan for REQ-A-1..A-3. Pure. |
| `src/shots/simctl.ts` | Imperative shell: `xcrun simctl` boot/install/log-stream, the Maestro spawn, git sha and app version. |
| `src/shots/cli.ts` | Entry point. Parses, plans, boots, runs, collects, writes the manifest, exits non-zero on any failure. |
| `tsconfig.shots.json` | Compiles the harness to CommonJS in a gitignored `.shots-build/`. No new dependencies. |

Behaviour built to spec:

- Boots the simulator(s) by name, once per device, not once per flow.
- Installs the dev client when it is missing — only with `--build-if-missing`, otherwise it stops
  and tells you rather than silently starting a long build.
- Collects screenshots by diffing the device directory before and after each flow, so the manifest
  reflects what was actually written rather than what the flow claimed.
- Writes `manifest.json` carrying, per shot: step, device, board size, level id, app version, git
  sha, and the flow file that produced it.
- Exits non-zero if any flow fails, and also if the animation-host log scan finds a crash or an
  `Animated` warning — a green Maestro result with SIGABRT in the log is not a pass.

### Layout

```
__shots__/<YYYY-MM-DD>-<label>/<device>/<step>.png
__shots__/<YYYY-MM-DD>-<label>/manifest.json
```

`__shots__/` and `.shots-build/` are gitignored, with a comment in `.gitignore` recording why
(runs are disposable; nobody reviews a PR full of PNGs) and naming the one exception —
`project-docs/SHOTS/board-size-standard/`. **Nothing was committed under
`project-docs/SHOTS/`**; that directory holds the nine images that decide the standard, and those
images do not exist yet.

Verified on this machine with `--dry-run` (which boots nothing):

```
Run directory: __shots__/2026-09-20-smoke
  se   .maestro/flows/shots/animation-host-safety.yaml [-]    -> .../iphone-se-3rd-gen
  se   .maestro/flows/shots/board-size-sweep.yaml     [8x7]  -> .../iphone-se-3rd-gen
  ...
15 flow run(s) planned. Nothing was booted.
```

### The board-size toggle — no source edit

The sweep changes the board from a **dev-only Settings control**, never a source edit, so one run
shoots every candidate size.

- `src/utils/boardSizeOverride.ts` — shared by the app and the runner. Parses `"<cols>x<rows>"`,
  caps columns at ten, and `resolveBoardSize` returns the level's own size unless dev tools are
  on.
- `src/store/settingsStore.ts` — `devBoardSizeOverride: string | null`, persisted alongside the
  existing `devForceRequisitionGate`.
- `src/screens/SettingsScreen.tsx` — a chip block inside the existing `SHOW_DEV_TOOLS` branch.
- `src/screens/GameplayScreen.tsx` — the two lines that read `level.gridWidth` / `gridHeight` now
  go through `resolveBoardSize`.

Dev-only and invisible in production by construction: `SHOW_DEV_TOOLS` is
`__DEV__ || EXPO_PUBLIC_SHOW_DEV_TOOLS === 'true'`, and only the `testflight` EAS profile sets
that variable. In a `production` build the Settings block does not render and
`resolveBoardSize` ignores the stored value even if one is somehow present. Both halves are unit
tested.

The chips expose the **whole legal range** (3–10 columns, 3–12 rows) rather than three chosen
sizes. See "Decision closed" below.

### The flows

`.maestro/flows/shots/` — one per job in the spec, plus two shared subflows.

| Flow | Job |
|---|---|
| `gameplay-loop.yaml` | Task 2. Dossier → board → placement → rotate → ENGAGE → mid-beam. **Driven on Android; 6 of 9 stages captured.** |
| `board-size-sweep.yaml` | Task 3. Sets the size from the dev toggle, then shoots the board at that size. **Driven on Android; 9 of 9 runs passed.** |
| `animation-host-safety.yaml` | Task 4. Crosses the five transitions, device log captured alongside. **Not run. Needs a Mac — see REQ-A-1..A-3 above.** |
| `subflows/enter-hub.yaml` | Launch to hub, handling onboarding, the daily modal and the title screen. **Verified.** |
| `subflows/complete-onboarding.yaml` | **New.** Drives first-run onboarding end to end on a fresh device. **Verified.** |
| `subflows/set-board-size.yaml` | Drives the dev toggle from `BOARD_COLUMNS` / `BOARD_ROWS`. **Verified.** |

**Selector status has changed.** The flows in PR #47 were written from source and every one of
them was unrunnable — see *Selector corrections* above for the full list, starting with an app id
that matched neither platform. The four flows marked **Verified** have now been executed against a
real Android build and their selectors are observed rather than inferred.

`animation-host-safety.yaml` is the exception and is still entirely unverified. Its `[VERIFY]`
markers stand, and it has never been driven on any platform.

### Source changes outside the harness

Kept as small as they could be.

- `src/screens/GameplayScreen.tsx` — board size goes through `resolveBoardSize`; a
  `testID={`board-cell-${x}-${y}`}` on the **existing** ghost-cell `TouchableOpacity`.
- `src/navigation/TabNavigator.tsx` — `tabBarButtonTestID` on each tab. This is a navigator
  option on the tab button; it adds no view and wraps nothing. The names match the ids
  `.maestro/flows/hub-navigation.yaml` already expected but which did not exist, so this
  incidentally repairs that pre-existing flow.
- `src/screens/SettingsScreen.tsx`, `src/store/settingsStore.ts` — the dev toggle.

### Hard limits — held

- `PieceIcon.tsx` untouched. It remains the single source of truth for piece rendering, and the
  harness renders nothing.
- No COGS dialogue and no UI copy changed. Not one word. The only new strings are the dev-only
  Settings labels, which sit inside `SHOW_DEV_TOOLS` and never ship.
- No `useNativeDriver: true` added anywhere. No `Animated.View` host swapped across a conditional
  render branch. No animated host was wrapped in a new one — the one gameplay `testID` went on an
  existing, non-animated `TouchableOpacity`, and the tab ids are navigator options rather than
  views.
- Everything added under `src/` has tests.

---

## Tests

`__tests__/unit/shots/{args,devices,androidDevices,androidLog,manifest,plan,host}.test.ts` and
`__tests__/unit/utils/boardSizeOverride.test.ts` — **113 cases across 7 suites** in the shots
directory after the Android work.

The two new suites cover the new pure logic the same way the existing modules are covered:

- `androidDevices.test.ts` — the matrix, `dpWidth`, and `assertDistinctWidths`. It includes an
  explicit regression test for the Pixel 7 / Pixel 7 Pro collision: `dpWidth(1080, 420)` equals
  `dpWidth(1440, 560)`, which is why the large AVD is not a Pixel 7 Pro.
- `androidLog.test.ts` — `parseAdbDevices` (including the cold-start daemon preamble),
  `emulatorSerialForAvd`, and `scanLogcatForFailures`. One test asserts the Android pattern list
  does **not** contain the iOS `RCTFatal` signature, so an Android pass can never be read as a
  REQ-A-1..A-3 pass.

Three existing assertions changed, and each is a requirement change rather than a test bent to fit:

1. `args.test.ts` — `sizes` no longer defaults to null. Tucker decided the standard; the default
   **is** the decision now.
2. `args.test.ts` — the "unknown argument" test used `--platform` as its example of an unknown
   flag. `--platform` is a real flag now, so the check moved to one that is still unknown.
3. `plan.test.ts` — `buildRunPlan` can no longer reach the sweep guard from a command line,
   because `--sizes` defaults. The test now passes `sizes: null` explicitly, and
   `requireSizesForBoardSweep` is still covered directly by its own three assertions, so the
   requirement is intact rather than deleted.

Argument parsing, the device matrix and the manifest writer are covered as the spec requires, plus
the run planner and the log scan. Coverage on the pure modules:

| Module | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| `src/shots/` (all) | 100 | 95.5 | 100 | 100 |
| `src/utils/boardSizeOverride.ts` | 100 | 100 | 100 | 100 |

`src/shots/cli.ts` and `src/shots/simctl.ts` are excluded from coverage collection in
`jest.config.js`, with the reason in a comment: they are process wiring that can only execute on a
macOS host with a simulator, so unit coverage of them would be fiction. Every judgement they act on
lives in the modules above, which are fully covered. No coverage threshold was lowered.

---

## Decision closed — the three board sizes

PROMPT_159 named "three sizes, never wider than ten columns" but never said which three, and the
design canvas it pointed at was not shared with the session that built the harness. So the harness
refused to default them and the question was written up at
**`project-docs/REPORTS/PROMPT_159_DECISION_BOARD_SIZES.md`** instead of being guessed.

**Tucker closed it on 2026-09-20: S = 8×6, M = 10×7, L = 10×9.** That decision report is now
marked CLOSED and carries the answer at the top.

Mechanically, what changed: `--sizes` now defaults to `BOARD_SIZE_STANDARD` and is still
overridable. `requireSizesForBoardSweep` remains in `plan.ts` and still refuses a board-size flow
that is handed no sizes at all — it is simply no longer reachable from a bare command line, which
is the correct outcome once the standard exists.

The Settings chips still offer the whole legal range (3–10 columns, 3–12 rows) rather than three
chips. Now that the standard is decided that is no longer about avoiding a premature commitment —
it is what let this sweep photograph any size on demand, and it is what will let the next one
re-open the question without a code change.

---

## Quality gates

| Gate | Result |
|---|---|
| `npx expo lint` | **PASS** — exit 0, zero warnings |
| `npx tsc --noEmit` | **PASS** — exit 0, zero errors |
| `npm test` | **PASS** — 165 suites, 2079 passed, 28 skipped, 2 todo, 0 failed |
| `npm audit --audit-level=high` | **FAIL** — exit 1, 25 vulnerabilities (15 moderate, 10 high). **Pre-existing and not caused by this branch:** `package-lock.json` is untouched, no dependency was added. All ten highs are transitive through the Expo/Metro toolchain (`@expo/cli`, `@expo/metro`, `@expo/metro-config`, `metro`, `metro-config`, `metro-transform-worker`, `brace-expansion`, `image-size`, `postcss`, and `expo` itself by way of `@expo/cli`). Clearing them means bumping Expo, which is a separate mission with its own regression surface. Flagged rather than worked around. |

---

## What still needs a macOS machine

The Android run answered board sizes, the driven loop, and legibility. It did **not** answer
REQ-A-1..A-3, and it never could. What is left for a Mac:

1. **REQ-A-1..A-3, the animation-host safety run.** This is the whole of the remaining iOS
   surface and the reason the iOS path stays in the runner. It is a native iOS crash class — a
   SIGABRT out of an `Animated.View` host swap, as seen in builds 20/21/25/34 — and an Android
   emulator can neither reproduce it nor rule it out. `animation-host-safety.yaml` is written and
   unrun. Its five transitions (signal start/stop, piece placement and long-press return to tray,
   a Config Node cycle mid-run, backgrounding during a beam, navigation away mid-animation) have
   **never been driven on any platform**, so expect its selectors to need the same first-run
   correction the other flows needed.
2. **Create the three simulators**, named exactly as `src/shots/devices.ts` expects:
   `iPhone SE (3rd generation)`, `iPhone 15`, `iPhone 15 Pro Max`.
3. **Install a `testflight`-profile build** on each, or run with `--build-if-missing`. The
   board-size toggle is invisible without `EXPO_PUBLIC_SHOW_DEV_TOOLS=true`.
4. **Run it** (the iOS path is the default, so no `--platform` is needed):
   `npm run shots -- --label animation-host --flows ".maestro/flows/shots/animation-host-safety.yaml" --level A1-3`
5. **Fix the iOS `[VERIFY]` selectors** as the run reveals them. The Android pass gives a strong
   head start — the app id, the `BEGIN` / `COMMAND DECK` names, the onboarding sequence, the daily
   transmission modal and the typewriter waits are all platform-independent and already corrected.
   What may still differ is anything that depends on the iOS view hierarchy, and in particular
   **whether `board-cell-<x>-<y>` testIDs surface on iOS.** They do not on Android, which is why
   the loop taps by point; if they do surface on iOS, that flow can be made selector-driven there.
6. **Optionally re-shoot the board sizes on iOS** to confirm the Android read holds at 375 / 393 /
   430 dp. The Android read is authoritative per the scope change, but the widths are not
   identical and the compact iPhone SE at 375 dp sits between the Android compact (360) and
   standard (411) entries.

**An Android result must never be written into a REQ-A-1..A-3 row.** `assertMacHost` still guards
the iOS path, the Android log patterns deliberately omit the iOS crash signatures, and there is a
unit test enforcing that separation.

---

## What a future run should fix

Found while running, not worth blocking this mission:

- **The gameplay loop does not solve its level**, so no results screen is captured. A solving
  flow for one known level would close task 2 completely.
- **Board cells are tapped by point percentage**, which is tied to A1-3 at its default board size.
  Either a selector that surfaces on Android, or a small per-level coordinate table, would make
  the loop portable across levels and sizes.
- **The requisition stages were never exercised** because A1-3 has no requisition gate. Driving
  them needs a level that does.
- **`npm run shots --` cannot pass flags** because npm strips them. Either rename the flags out of
  npm's reserved set or ship a thin wrapper script, so the documented command in PROMPT_159
  actually works as written.
