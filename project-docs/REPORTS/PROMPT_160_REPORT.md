# PROMPT_160 report — Arc Wheel removed, one sliding tray for every sector (AXM-013)

Nash (WRENCH), 2026-09-22. Branch `feat/axm-013-sliding-tray`, off master `611033c`.
Decisions the brief did not cover are in `AXM-013_DECISIONS.md`, next to this file.

## Deleted, added, renamed

**Deleted**
- `src/components/gameplay/ArcWheel.tsx`
- `__tests__/unit/components/ArcWheel.test.ts`
- `WHEEL_WIDTH` and the under-wheel drop rejection in `GameplayScreen.handleDragEnd`
- The side setting in `settingsStore` (field, type, setter, persistence). Old saves are migrated
  on hydrate (see D-5 and D-6). No Settings-screen control existed on master.
- The wheel tutorial ref in `useGameplayTutorial` and the tutorial target map
- The Handoff 003 REQ-G-13 and REQ-G-18 contract tests (they asserted on the deleted component),
  and the side-setting contract tests in `PlacementTransition.test.ts`

**Added**
- `src/game/trayPlacement.ts`: `shouldMountTray` (one tray, mount gate) and
  `placeFromKeplerInventory` (inventory path, never credits)
- `src/components/gameplay/DragGhostSnapBack.tsx`: the blown-cell drop rejection ghost
- `hapticError()` in `src/utils/haptics.ts`
- `migrateSettings()` in `src/store/settingsStore.ts`
- Tests: `__tests__/unit/components/keplerTray.test.ts`, the new cases in `trayGrouping.test.ts`,
  the migration cases in `settingsStore.test.ts`, `hapticError` in `haptics.test.ts`

**Renamed**
- `arcWheelGrouping.ts` → `trayGrouping.ts`; `groupArcWheelPieces` → `groupTrayPieces`;
  `ArcWheelPiece` → `TrayPiece`
- `arcWheelSortKey` → `traySortKey` (`src/game/piecePrices.ts`)
- `DragState` moved into `PieceTray.tsx`
- Tests: `arcWheelGrouping.test.ts` → `components/trayGrouping.test.ts`,
  `arc-wheel-tutorial.test.ts` → `tray-tutorial-hook.test.ts`,
  `levels/arcWheelTutorial.test.ts` → `levels/trayTutorial.test.ts`
- Every remaining identifier, comment and test name in `src/`, `__tests__/` and `.maestro/`,
  including the smoke-runner manifest entry `smoke_12_…` (that flow file does not exist on master)

**Changed behaviour**
- `requisitionStore.placeInventoryPiece` consumes requisitioned instances first;
  `unplaceInventoryPiece` returns pre-assigned first (`nextPlacementIndex` / `nextReturnIndex`).
- `PieceTray` takes `items` (key, type, isTape, count, source split) in place of the Axiom-only
  type/count maps. The Axiom builds the same items it showed before, with the same badge and the
  same dimming.
- The board's screen position for drag-drop now comes from `measure()` pageX/pageY, and is taken
  on layout and at every drag start (`measureBoardOnScreen`). See the device section: this fixes
  drops landing below the finger in every sector, the Axiom included.

## The two greps

```
$ grep -ri "arcwheel\|arc wheel\|arc-wheel" src __tests__ .maestro
$ echo $?
1
```

Empty. `keplerTray.test.ts` runs the same search on every `npm test`, so it stays empty. The one
intentional reference to the removed setting's persisted key is assembled from parts
(`settingsStore.ts`, `RETIRED_KEYS`, see D-6).

REQ-A-3 host check, on every file this change touches that animates:

```
$ grep -n "useNativeDriver: true" src/components/gameplay/PieceTray.tsx \
    src/components/gameplay/DragGhostSnapBack.tsx src/screens/GameplayScreen.tsx
$ echo $?
1
$ grep -n "Animated.View\|Animated\.Value" src/components/gameplay/PieceTray.tsx \
    src/components/gameplay/DragGhostSnapBack.tsx
src/components/gameplay/DragGhostSnapBack.tsx:23:  const pos = useRef(new Animated.ValueXY(...)).current;
src/components/gameplay/DragGhostSnapBack.tsx:24:  const opacity = useRef(new Animated.Value(0.85)).current;
src/components/gameplay/DragGhostSnapBack.tsx:49:    <Animated.View
```

- `PieceTray` has no `Animated` at all.
- The snap-back ghost has two JS-driven values (`useNativeDriver: false`), consumed by exactly one
  `Animated.View`. That view is the component's only host for its whole mount, and the parent
  mounts it by key per rejection. No native value exists, so there is nothing to orphan.
- There is exactly one `<PieceTray>` element in GameplayScreen, gated by `shouldMountTray` and
  varied by props. It is never two trays behind `isAxiomLevel ? … : …`. A test asserts this.
- `nativeDriverHostUniqueness.test.ts` and `tutorialHUDOverlayTransitions.test.tsx` are unchanged
  and pass (the latter is skipped on master, as before).

## K1-1 and K1-10 on a device

Release APKs built from this branch (`EXPO_PUBLIC_SHOW_DEV_TOOLS=true` on the gradle step) and run
on `axiom_standard` (411dp) as `emulator-5570`. The install time was checked against the device
clock after every rebuild, so no shot comes from a stale APK. The save was seeded by hand (all of
A1 plus K1-1..K1-9) to reach K1-10. It is not a real player's progress. Shots are in
`project-docs/SHOTS/axm-013/`, all `android-standard-411dp-*`.

**K1-1: few items, no chips** (`k1-1-01`, `k1-1-02`, `k1-1-03`)
- After requisitioning one extra Conveyor, the tray holds two items: Conveyor with an amber **4**
  and a blue **1**, and Gear with an amber **2**. No chip row and no edge fade (everything fits).
- Placing a Conveyor (drag, and separately tap-select then tap-board) takes the **blue** instance
  first: the badge drops to amber 4 alone.
- A long-press on the placed piece returns it, and the badge goes back to **4 + 1** (the
  requisitioned piece came back, because no pre-assigned one was on the board).
- **ENGAGE at a Kepler board size (8×6):** the board frame sits in the same place before and
  during the run. The tray goes invisible and keeps its row, and nothing moves (`k1-1-03`,
  side by side).

**K1-10: 22 instances, chips, sliding** (`k1-10-01` … `k1-10-05`)
- Nine items after requisitioning one Scanner: Scanner shows amber **2** + blue **1**. Chips
  **ALL · PHYSICS · PROTOCOL** (no TAPES, since the level has no tape item). A seventh item is
  half-visible under the right-edge fade.
- Sliding the tray to its end moves the fade to the left edge. The order holds (Physics then
  Protocol, price ascending).
- Dragging the Scanner onto the board: mid-drag the hover cell sits under the finger (`-02`,
  finger marked in red). After the drop, the badge reads amber **2** with blue gone (`-03`), and
  ENGAGE is enabled.
- Dropping a Conveyor onto a blown cell (`-04`, three frames): held, the hover cell is red over
  the scar. On release, the ghost is caught gliding back onto the Conveyor item. Afterwards
  nothing is placed and the badge still reads 8. The error haptic can't be seen on an emulator.
  The call is covered by `haptics.test.ts` and the GameplayScreen contract test.
- After a slide to the end: PROTOCOL shows exactly its four items from the start of the row, and
  PHYSICS shows five, with Bridge, Merger and Splitter in PHYSICS per the canonical split (`-05`).
- K1-10's own tutorial step (`board-intro`) appears once placement starts. Its dialog covers
  the chip row, so forcing ALL during a tutorial (D-4) was not observed on device. It is covered
  by source only.

**The Axiom is unchanged** (`a1-2-drop-under-finger`): A1-2's tray shows the same blue
piece-colour badges and no chips.

### Two defects found on device, fixed in this PR (red test first, both)

1. **A filter change kept the old scroll offset.** Slide to the end, tap PROTOCOL, and the four
   Protocol items sat off-screen to the left. A change of filter now returns the tray to its
   start. (`af1a751` red, `6844dd8` fix)
2. **Drops landed one to two rows below the finger, in every sector.** The mid-drag hover cell
   was 2 rows low on K1-10 and 1 row low on the Axiom's A1-2, on the same build. The drop cell was
   resolved against a board position from `measureInWindow`. That isn't the coordinate space of a
   touch's `pageX/pageY`, and it was only taken in the board's `onLayout`, so it went stale when a
   sibling moved the board. A single `measureBoardOnScreen` now uses `measure()`'s `pageX/pageY`
   and runs on layout and at every drag start. After the fix the hover cell is under the finger on
   both A1-2 and K1-10. (`dcd0330`/`a6f12d9` red, `4ea9495`/`232a3f6` fix) **This was already on
   master for the Axiom tray.** A1-2 shows it with none of this PR's layout changes involved.
   Tap-placement was never affected, because it resolves from the cell itself.

**Not run:** `axiom_compact` (360dp) and `axiom_large` (448dp). K1-10 on 360dp is the
tightest case for the chip row. Expectation: nine 56pt items still slide; this is unverified.

## Copy: "wheel" → "tray"

Changed, noun only (K1-1 `tutorialSteps`, `src/game/levels.ts`):
- `wheel-place`: "…The **wheel** hands the piece to you directly." → "…The **tray** hands the piece
  to you directly."
- `wheel-forfeit`: "Anything left on the **wheel** when the mission ends is forfeited…" →
  "Anything left on the **tray** when…"

Left alone, because they need more than the noun:
- `wheel-intro`: "…loaded here — on the wheel. Out here the manifest is not a tray along the bottom
  of the board anymore. It is this. One piece at center at a time." It denies the very thing it
  now points at. A noun swap would make it contradict itself.
- `wheel-scroll`: "Swipe the wheel to bring a piece to the center. The one in the middle is the one
  you are holding. You will not see every part at once…" It describes a vertical cycle with a
  centre selection, which the tray doesn't have.
- Pre-existing and not a noun problem, but now visible: `wheel-place` says "No more tapping the
  grid." Tap-select then tap-board still places a piece in Kepler, as it did with the wheel.

All four steps now point at the Conveyor tray item (`trayConveyor`), the focus piece of K1-1's
inventory. The step ids are unchanged (D-7). The K1-1 store steps that
`kepler-arc-wheel-integration.md` §2 flagged as mis-targeted at `tray` **no longer exist** in
`levels.ts`, so there was nothing to re-verify there.

The filter chip labels (ALL, PHYSICS, PROTOCOL, TAPES) are as approved. No other player-facing
text or COGS line in `src/` mentions the wheel.

## PR #47 and #48

- **#47 (AXM-011 harness) is not merged**, so this branch is off master and #47 gets a comment.
  The flow that needs changing: `.maestro/flows/damaged-cells/live-burn.yaml` lines 90-99 swipe
  the tray **UP** from `SCAN, .* available` until `XMIT, .* available` shows. The tray now slides
  horizontally, so that swipe must go **LEFT**. The item labels keep the same
  `<CODE>, <n> available` format, so every `tapOn` still matches. `terrain.yaml` and the
  `flows/shots/` flows don't touch the Kepler selector. **Expect a merge conflict in
  `src/store/settingsStore.ts`**: #47 adds `devBoardSizeOverride` next to the side setting this
  PR deletes. Resolve by keeping #47's field and dropping the side setting.
- **#48 (damaged cells):** its one wheel reference is the context line
  `import ArcWheel, { WHEEL_WIDTH, … }` directly above the `DamagedCell` import it adds. This
  branch deletes that line, so git will report a **trivial conflict** in the GameplayScreen import
  block. Resolve by keeping #48's `DamagedCell` import and dropping the wheel import. There is no
  functional overlap: #48 changes how blown cells are drawn, and this PR changes what happens when
  a piece is dropped on one.

## Quality gates

- `npx expo lint`: **PASS**, 0 errors, 0 warnings
- `npx tsc --noEmit`: **PASS**, 0 errors
- `npm test`: **PASS**, 157 suites, 1954 passed / 28 skipped / 2 todo. Coverage 84.74 % statements,
  75.96 % branches, 83.59 % functions, 85.63 % lines (thresholds 80 / 70 / 80 / 80)
- `npm audit --audit-level=high`: **PASS**, exit 0 (17 moderate, 0 high, 0 critical)
