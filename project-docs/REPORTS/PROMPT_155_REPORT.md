# PROMPT_155 REPORT — Reconcile PR #30 and PR #31 against merged master

**Date:** 2026-07-22

---

## PR #30 — Redundancy assessment

**Verdict: PARTIALLY SUPERSEDED.**

| Piece | Status |
|-------|--------|
| Store-layer gating (`buildPieceTypesForLevel` + `_availablePieceTypes` in store state) | Superseded — re-implemented in WIP commit 9efe511 (2-arg, reads `SHOW_DEV_TOOLS` directly; functionally equivalent but private and non-pure) |
| `RequisitionPanel.tsx` UI changes (read from `_availablePieceTypes`, `categoryRows()`, empty-category "not catalogued yet" state) | NOT superseded — master's panel still renders the full `PHYSICS_PIECE_TYPES`/`PROTOCOL_PIECE_TYPES` roster regardless of the gated list stored in the store |
| Dev toggle (`devForceRequisitionGate`, Settings toggle, `ded0283`) | NOT superseded — never merged anywhere |

**Behavioral gap:** On master, undiscovered pieces are still visible in `RequisitionPanel` despite `_availablePieceTypes` storing the filtered list. The store knows the gated set; the panel ignores it. This is a real UI gap.

**Resolution:** Created `chore/requisition-dev-toggle-settings-cleanup` (PR #35) containing:
- `buildPieceTypesForLevel` exported with `showDev` parameter (pure, testable)
- `devForceRequisitionGate` in settingsStore (persisted)
- `initRequisition` computes `showDev = SHOW_DEV_TOOLS && !devForceRequisitionGate`
- SettingsScreen dev toggle ("Force Requisition Gating (Dev)")
- RequisitionPanel wired to `_availablePieceTypes` with empty-category state
- Settings cleanup: dead EDIT Button removed, real credits, dead styles dropped

**New PR:** https://github.com/TuckerBrady/the-axiom/pull/35
**SHA:** 7f57f68
**Quality gates on new branch:** lint PASS, tsc PASS, 1759/1759 tests pass (coverage 84.87/75.77/83.57/85.92)

**PR #30 closed** with comment explaining partial supersession and linking PR #35.

---

## PR #31 — Reconciliation

**Conflict location:** `src/components/gameplay/ArcWheel.tsx` (sole conflict).

**Feature sets preserved:**

**From master** (merged via PR #34 WIP):
- Scroll chevrons (∧∧/∨∨) with slot-machine slide animation (`scrollOffsetAnim`, 200ms ease-out)
- 3-dot dismiss handle on the inward pill face
- `IDLE_OPACITY 0.55`, `ACTIVE_TIMEOUT_MS 8000`
- `export const WHEEL_WIDTH`
- `WheelNode`-per-node PanResponder architecture (hold-to-drag + chevron scroll + dismiss)
- `overflow: 'hidden'` on pill

**From PR #31** (portd into reconciled file):
- `expanded` state + `renderOverview()` — full inventory bloom by category (PHYSICS/PROTOCOL/DATA)
- Expand-dots button in the pill (taps to open overview)
- `categoryOf()`, `CATEGORY_LABEL`, `PROTOCOL_TYPES` constants
- `beginDrag`/`endDragHold` callbacks for drag support from the overview items
- `arcWheelGroups.ts` (PR #31's grouping module) retained as a companion to `arcWheelGrouping.ts`

**Resolution decisions:**
- `arcWheelGrouping.ts` (master, `PieceGroup` type) is the module `ArcWheel.tsx` imports. `arcWheelGroups.ts` (PR #31, `Group` type) is a companion module with its own test — both are kept and valid.
- `CountBadge` component from PR #31 dropped; `WheelNode` renders the badge inline (master's approach).
- `renderCompactNode` (PR #31 inline TouchableOpacity) replaced by `renderNode` (master's `WheelNode`-based).
- `categoryOf` updated to accept `PieceGroup` instead of `Group`.
- `ArcWheel.test.ts`: `groupPieces` assertion updated to `groupArcWheelPieces`.

**Quality gates on reconciled branch:**
- `npx expo lint` — PASS (0 warnings)
- `npx tsc --noEmit` — PASS (0 errors)
- `npm test` — PASS (1766/1766; 28 skipped, 2 todo; coverage 84.91/75.80/83.60/85.96)
- `npm audit --audit-level=high` — PASS (inherited from master)

**Final SHA on `feat/arc-wheel-lift`:** 1435538
**Branch pushed:** confirmed.

---

## Blockers

None.
