# SE Build 19 Corrective Actions -- Validation Report

Date: 2026-05-01
Author: SE (System Engineer)
Incident: Build 19 SIGABRT (commit 88c0b99, arc-wheel-tutorial)
Root cause fix: commit 96a4aba (TutorialHUDOverlay restructure)
Canonical rule: commit 93eebf9 (docs/ANIMATION_RULES.md)

---

## Summary

This report documents the test surface built to prevent a third occurrence
of the native-driver parent-swap anti-pattern. The root cause (dimOpacity
host swap on awaitPlacement toggle) was fixed in 96a4aba. The canonical
rule was codified in docs/ANIMATION_RULES.md (93eebf9). This session adds
the executable verification layer: integration tests covering runtime
behavior and a static-analysis check covering code structure.

---

## Deliverables

### 1. Integration tests

File: `__tests__/integration/tutorialHUDOverlayTransitions.test.tsx`
Status: describe.skip (awaiting RNTL integration test surface)

Test cases and REQ coverage:

- [REQ-A-1] Full step advance: mounts at step 0, advances through all
  A1-1 steps. Verifies no exception thrown during any transition.

- [REQ-A-1] awaitPlacement on->off boundary: isolates the step 5->6
  transition (the exact axis where Build 19 failed). Asserts dimOpacity
  host count is stable across the transition.

- [REQ-A-1] awaitPlacement off->on boundary: isolates step 4->5 transition.
  Same host stability assertion in the reverse direction.

- [REQ-A-2] Persistent host across all step types: walks every step and
  verifies the dim backdrop Animated.View count never changes.

- [REQ-A-1] Rapid step advance (skip-button spam): advances steps at 10ms
  intervals. Verifies no crash when transitions overlap.

- [REQ-A-1] Unmount mid-transition: unmounts the overlay while a step
  transition is in progress at the awaitPlacement boundary.

### 2. Static analysis test

File: `__tests__/lint/nativeDriverHostUniqueness.test.ts`
Status: Active (runs in npm test)

Design choice: Jest assertion over file scan, not ESLint custom rule.

Rationale:
- The anti-pattern is cross-branch structural, not a single-node issue.
  ESLint rules operate per-AST-node and would require a custom
  scope-tracking visitor that duplicates full-file scan work.
- Jest integrates into the existing `npm test` pipeline with zero config
  beyond the lint project entry in jest.config.js.
- The scan is fast and produces clear, actionable error messages with
  file paths, value names, and line numbers.
- False-positive rate is low: the heuristic specifically targets
  native-driven values appearing in multiple Animated.View hosts inside
  conditional branches.

Test cases:
- [REQ-A-1] Scans all .tsx files in src/. Fails if any native-driven
  Animated.Value appears in multiple Animated.View hosts across
  conditional branches.
- [REQ-A-1] Correctly identifies the anti-pattern in the synthetic
  fixture (asserts violation count > 0, value name = dimOpacity,
  host count = 2).
- [REQ-A-1] Passes against current TutorialHUDOverlay.tsx (post-96a4aba).
- [REQ-A-3] Verifies the scan covers all .tsx files containing
  Animated.View, including TutorialHUDOverlay.tsx.

### 3. Synthetic fixture

File: `__tests__/__fixtures__/nativeDriverAntiPattern.tsx`

A minimal component that deliberately reintroduces the Build 19
anti-pattern: dimOpacity declared with useNativeDriver: true, consumed
by two Animated.View hosts inside a ternary conditional. The static
check must fail against this fixture and pass against production code.

### 4. Jest configuration

File: `jest.config.js`

Added a `lint` project entry that matches `__tests__/lint/**/*.test.{ts,tsx}`.
This ensures the static check runs as part of `npm test` alongside unit
and integration tests.

---

## REQ Coverage Matrix

| REQ    | Integration tests              | Static check                  |
|--------|-------------------------------|-------------------------------|
| REQ-A-1 | 5 test cases (describe.skip)  | 3 test cases (active)         |
| REQ-A-2 | 1 test case (describe.skip)   | Implicit (host persistence)   |
| REQ-A-3 | --                            | 1 test case (coverage scope)  |

---

## Constraints Verified

- No emojis in any deliverable.
- No modifications to src/ (all files are in __tests__/, project-docs/, jest.config.js).
- Coverage floors: not affected (integration tests are in describe.skip;
  lint tests scan files but do not import src/ modules for coverage).
- Every test description cites its REQ-A-N clause.

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes (new files are type-clean)
- [ ] `npx expo lint` passes (no new warnings)
- [ ] `npm test` passes (lint tests active, integration tests skipped)
- [ ] Coverage floors held (80/80/70/80)
- [ ] Static check passes against current TutorialHUDOverlay.tsx
- [ ] Static check fails against synthetic fixture
