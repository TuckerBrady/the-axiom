# PROMPT_159 — Driven screenshot harness

**Mission:** AXM-011 · **Branch:** `feat/axm-011-screenshot-harness` · **Date:** 2026-09-20

---

## No run happened, and why

**No flow in this harness has ever been executed. No screenshot exists. There is no
manifest.**

The harness is fixed to Maestro against the iOS simulator, and the iOS simulator needs a macOS
host with Xcode. This work was done on a Windows 11 machine. There is no Mac available, so the
simulator cannot boot here and no flow can be driven.

The correct response to that was to build everything that does not require a booted simulator and
stop cleanly at the line. That is what this branch contains. Specifically, this report does **not**
contain a manifest section and does **not** contain a "which board size wins" section. Both of
those require looking at real images, and there are no real images.

The Windows boundary is enforced in code, not left to discipline. `assertMacHost` in
`src/shots/host.ts` refuses any non-darwin platform with an explicit message, and it is unit
tested. Observed on this machine:

```
$ npm run shots -- --label smoke --flows ".maestro/flows/shots/gameplay-loop.yaml" --devices se
npm run shots needs a macOS host with Xcode and an iOS simulator; this is "win32". The harness is
deliberately simulator-only: browser shots cannot answer board-size legibility or native
animation-host safety, so there is no web fallback.
exit 3
```

There is no web fallback and none was added. PROMPT_159 settles that: a browser viewport is not a
device width, and an `Animated.View` host-swap SIGABRT cannot appear in a browser at all, so a
green web run would be evidence of nothing.

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
sizes. See "Decision deferred" below.

### The flows

`.maestro/flows/shots/` — one per job in the spec, plus two shared subflows.

| Flow | Job |
|---|---|
| `gameplay-loop.yaml` | Task 2. Mission dossier, REQUISITION before and after a purchase, board on entry, piece placement from the tray, Arc Wheel, Conveyor rotate tap, ENGAGE, signal mid-beam, results screen. |
| `board-size-sweep.yaml` | Task 3. Sets the size from `BOARD_SIZE`, then shoots the empty board, an occupied board, and the far corner cell at that size. Run once per `--sizes` entry per device. |
| `animation-host-safety.yaml` | Task 4. Crosses the five transitions, with the device log captured alongside. |
| `subflows/enter-hub.yaml` | Launch to hub without clearing state. |
| `subflows/set-board-size.yaml` | Drives the dev toggle from `BOARD_SIZE`. |

**Every selector in these flows is unverified.** They were derived by reading the source, not by
watching anything run. Steps whose selectors depend on level content or on drag geometry rather
than on a literal string in the source are marked `[VERIFY]` in the flow files. They are the ones
most likely to need adjusting on the first real run. Adjust them; do not delete the step.

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

`__tests__/unit/shots/{args,devices,manifest,plan,host}.test.ts` and
`__tests__/unit/utils/boardSizeOverride.test.ts` — 98 new cases across 6 suites.

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

## Decision deferred — the three candidate board sizes

PROMPT_159 names "three sizes, never wider than ten columns" but does not say which three. The
design canvas it points at (`https://claude.ai/artifact/SAzDSZG8yjz9SuRwAGJSV9`) is not shared with
this session, so the values could not be read from it.

Per the prompt's own instruction, this was not picked here. It is written up in full at
**`project-docs/REPORTS/PROMPT_159_DECISION_BOARD_SIZES.md`**.

What that means mechanically: `--sizes` has **no default**. A run whose flow set includes the
board-size sweep and which is given no `--sizes` is refused, by name, with the reason. Observed:

```
$ npm run shots -- --label smoke --devices se --dry-run
The flow set includes a board-size sweep (.maestro/flows/shots/board-size-sweep.yaml) but no
--sizes was given. Pass the three candidate sizes explicitly, e.g. --sizes 8x7,9x8,10x9. The
harness does not default them: the board-size standard is a design decision, not a harness
decision.
exit 2
```

The Settings chips offer the whole legal range for the same reason — a chip row of three chosen
sizes would bake the undecided standard into a settings screen.

---

## Quality gates

| Gate | Result |
|---|---|
| `npx expo lint` | **PASS** — exit 0, zero warnings |
| `npx tsc --noEmit` | **PASS** — exit 0, zero errors |
| `npm test` | **PASS** — 163 suites, 2044 passed, 28 skipped, 2 todo, 0 failed; coverage thresholds held (85.48% stmts / 76.83% branch / 84.35% funcs / 86.46% lines against 80/70/80/80) |
| `npm audit --audit-level=high` | **FAIL** — exit 1, 25 vulnerabilities (15 moderate, 10 high). **Pre-existing and not caused by this branch:** `package-lock.json` is untouched, no dependency was added. All ten highs are transitive through the Expo/Metro toolchain (`@expo/cli`, `@expo/metro`, `@expo/metro-config`, `metro`, `metro-config`, `metro-transform-worker`, `brace-expansion`, `image-size`, `postcss`, and `expo` itself by way of `@expo/cli`). Clearing them means bumping Expo, which is a separate mission with its own regression surface. Flagged rather than worked around. |

---

## What still needs a macOS machine

Everything below requires a Mac with Xcode, an iOS simulator and Maestro installed. Nothing here
can be faked or partially done on Windows.

1. **Create the three simulators** if they are not present, named exactly as
   `src/shots/devices.ts` expects: `iPhone SE (3rd generation)`, `iPhone 15`,
   `iPhone 15 Pro Max`.
2. **Install a `testflight`-profile build** on each, or run with `--build-if-missing`. The
   `testflight` profile is required — the board-size toggle is invisible without
   `EXPO_PUBLIC_SHOW_DEV_TOOLS=true`.
3. **Get the three candidate board sizes** settled (see the decision report) and pass them as
   `--sizes`.
4. **Run the gameplay loop:**
   `npm run shots -- --label gameplay-loop --flows ".maestro/flows/shots/gameplay-loop.yaml" --level <id>`
5. **Run the board-size sweep:**
   `npm run shots -- --label board-size-standard --flows ".maestro/flows/shots/board-size-sweep.yaml" --sizes <a,b,c> --level <id>`
6. **Run the animation-host safety flow:**
   `npm run shots -- --label animation-host --flows ".maestro/flows/shots/animation-host-safety.yaml" --level <id>`
7. **Fix the `[VERIFY]` selectors** as the first run reveals them. Expect several to be wrong —
   they were written from source, not from a screen. The runner's junit output per flow says which
   step failed.
8. **Then, and only then, write the three sections this report deliberately omits:**
   - the command line that produced the run and how long it took;
   - the manifest of the run, plus the list of task-2 stages Maestro could not drive;
   - the nine board-size images, committed once under
     `project-docs/SHOTS/board-size-standard/`, with a read on which size wins on each device and
     why;
   - for task 4, which transitions the flow actually crossed, what the log showed, and an honest
     list of what it did **not** cover.

Item 8 is the substance of PROMPT_159's report section. It is not written here because it cannot be
written honestly without a run.
