# SPEC: Testing Foundation
### Sprint 18C | April 2026 | COMPLETE

---

## Problem

Test coverage was under 5%. CD pipeline deployed OTA updates
without waiting for CI. No coverage thresholds configured.
Major systems (engine, store, scoring, challenges) had zero
direct test coverage.

---

## What Was Done

### CD Pipeline Fix (cd.yml)
Changed from push trigger to workflow_run trigger. OTA deploy
now requires CI success. eas-build requires CI success plus
[build] in commit message. Broken builds cannot ship.

### Coverage Thresholds (jest.config.js)
Statements: 33%, Branches: 24%, Functions: 29%, Lines: 33%.
Set ~5% below current actuals. They only ratchet up.

### Test Suite (47 -> 83 tests)

engine.test.ts (11 tests):
  executeMachine linear path, Gear direction change, Config
  Node gating, Splitter fork, Splitter block, incomplete path,
  autoConnectPhysicsPieces, calculateStars boundaries.

gameStore.test.ts (9 tests):
  placePiece placement and rejection, Splitter rotation lock,
  deletePiece removal and pre-placed guard, wire recalculation,
  movePiece, rotatePiece conveyor-only, computeSplitterMagnets
  integration.

scoring.test.ts (13 tests):
  calculateScore full calculation, starsFromTotal thresholds,
  doesConsequenceTrigger, efficiency, protocol precision,
  chain integrity, discipline bonus, speed bonus, edge cases.

challengeTemplates.test.ts (6 tests):
  ALL_TEMPLATES validation, required fields, difficulty
  filtering, piece type validity, non-empty tapes.

### Coverage After
Statements: 37.92%, Branches: 29.31%, Functions: 33.93%,
Lines: 37.64%.

---

## Commit

9e6f6b0

---

## Standing Rule

Every commit that adds or changes production code MUST include
corresponding test additions or updates. Documented in CLAUDE.md
under QUALITY GATES. No exceptions.
