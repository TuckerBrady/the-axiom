# SE Validation Report — Maestro Smoke Suite

> **Report ID:** RPT-SMOKE-001
> **Date:** 2026-05-01
> **Author:** SE (System Engineer)
> **Spec:** `project-docs/SPECS/maestro-smoke-suite.md` (SPEC-SMOKE-001 v1.0)
> **Status:** COMPLETE — ready for Dispatch review

---

## 1. Summary

SE has produced the following deliverables for the Maestro smoke suite initiative:

1. **Spec document** at `project-docs/SPECS/maestro-smoke-suite.md` — 168 numbered clauses across 7 sections (Scaffolding, Flow Specs, Runner, Build Gate, Manual Cadence, Cross-References, Changelog).
2. **Pre-written runner test** at `__tests__/integration/smokeRunner.test.ts` — 19 test cases in `describe.skip` blocks, each citing the clause it validates.
3. **This validation report** at `project-docs/REPORTS/se-maestro-smoke-suite.md`.

No YAML flow files were created. No source code in `src/` was modified. No implementation was performed — this is specification only, per brief instructions.

---

## 2. Work Item Disposition

### WI-1: Read existing Maestro patterns

Existing flows read and analyzed:
- `.maestro/flows/complete-level.yaml` — uses `appId: com.tuckbrady.theaxiom`, text-based selectors, `runFlow` for subflows.
- `.maestro/flows/hub-navigation.yaml` — uses `id`-based selectors for tab navigation.
- `.maestro/flows/daily-challenge.yaml` — minimal flow, text selectors.

Pattern observations carried into the spec:
- `appId` in YAML front matter (clause 1.3.1).
- Mix of text and `id` selectors (clause 1.5.1 recommends migration to `testID` with backward compatibility).
- `runFlow` for composition (clause 1.4.1 formalizes subflow extraction).
- No existing subflows directory (clause 1.4.1 creates `.maestro/subflows/`).

### WI-2: Spec 18 smoke flows

All 18 checklist items specced. 16 as automated Maestro flows, 2 as manual-only with explicit rationale:
- Item 4 (haptics toggle): cannot verify haptic motor activation via Maestro (clause 2.4.1).
- Item 17 (FPS measurement): Maestro has no frame-rate instrumentation (clause 2.17.1).

Build 19 regression coverage:
- smoke_06 (A1-1 tutorial) exercises `awaitPlacement` step-transition boundary per REQ-A-1 (clause 2.6.1).
- smoke_12 (arc wheel tutorial) exercises `dimOpacity` host swap on `awaitPlacement` toggle per REQ-A-1 (clause 2.12.1).
- Both flows cross-reference `docs/ANIMATION_RULES.md` explicitly.

### WI-3: Spec runner script

Runner specced as POSIX shell script at `scripts/run-smoke.sh` (clause 3.1.1). Key decisions:
- Sequential execution, not parallel (clause 3.2.2 — shared simulator state makes parallel nondeterministic).
- Two abort-on-fail gates: smoke_01 and smoke_06 (clauses 3.2.3, 3.2.4).
- Structured stdout + JSON report (clauses 3.3.1, 3.3.2).
- Exit codes: 0=pass, 1=fail, 2=infra error (clauses 3.4.1-3.4.3).
- npm scripts: `smoke` and `smoke:ci` (clause 3.5.1).
- No bypass mechanism of any kind (clauses 3.6.1-3.6.3).

### WI-4: Spec build-gate integration

Three options evaluated (section 4.1):
- Option A (npm prebuild): REJECTED — EAS CLI does not respect npm lifecycle hooks.
- Option B (EAS build hook): REJECTED — EAS Cloud lacks Maestro and simulator.
- Option C (local `/build` slash command): SELECTED — natural extension of existing local gate pattern.

The `/build` command gets a new Phase 0 (Smoke) before the existing Phase 1 (Prompt) and Phase 2 (Build). Non-bypassable. Emergency escape is direct `eas-cli` invocation with Tucker approval (clause 4.4.1).

### Manual validation cadence

Proposed (section 5, subject to Tucker sign-off):
- Weekly during active development (Friday recommended).
- Required pre-MVP: full 18-item walk within 2 hours of MVP build (May 8).
- Per-release: every `eas build` invocation.

---

## 3. Constraints Verification

| Constraint | Status |
|------------|--------|
| RFC 2119 voice | PASS — all clauses use RFC 2119 keywords |
| Numbered clauses | PASS — 168 clauses, sequentially numbered |
| No emojis | PASS — zero emoji characters in all deliverables |
| No YAML flow files written | PASS — spec only, no `.yaml` files created |
| No runner implementation | PASS — spec only, no `run-smoke.sh` created |
| No `src/` modifications | PASS — zero files in `src/` touched |
| Coverage floors held (80/80/70/80) | PASS — `describe.skip` tests do not execute, cannot affect coverage |
| Existing Maestro flows preserved | PASS — no modifications to existing flows |

---

## 4. Open Questions for Tucker

1. **Manual cadence**: Section 5 proposes weekly + pre-MVP + per-release. Tucker locks the final schedule (clause 5.3.1).
2. **testID migration**: Clause 1.5.2 lists elements that need `testID` props before smoke flows can run. This is a Dev task — should it be a separate prompt or bundled with the flow implementation prompt?
3. **Kepler level list**: Clause 2.15.2 lists K1-1, K1-9, K1-10 as current Kepler levels. This list needs confirmation and a maintenance process as more levels land.
4. **Simulator boot**: Clause 3.7.1 says the runner should auto-boot a simulator if none is running. Confirm this is desired vs. requiring the developer to boot one manually.

---

## 5. Handoff to Dev

When Tucker approves the spec, Dev receives a prompt to implement:
1. 16 Maestro YAML flow files per section 2.
2. 3-4 subflow files per clause 1.4.1.
3. `scripts/run-smoke.sh` per section 3.
4. `package.json` script additions per clause 3.5.1.
5. `.gitignore` addition per clause 3.3.3.
6. `.claude/commands/build.md` Phase 0 modification per section 4.
7. `testID` props on required elements per clause 1.5.2.

The pre-written test at `__tests__/integration/smokeRunner.test.ts` validates the implementation. Dev removes `describe.skip` wrappers after implementation is complete.

---

Authored by SE, 2026-05-01.
