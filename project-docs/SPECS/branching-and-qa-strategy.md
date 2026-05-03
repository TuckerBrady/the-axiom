# Git Branching and QA Strategy
### The Axiom | Version 1.0 | May 2026

---

## Purpose

This is the authoritative workflow for how code moves from idea to TestFlight build. It replaces the previous approach of committing directly to master and cutting builds on hope.

The problems this solves: bugs stacking on master with no isolation, TestFlight builds wasted on crashes that should have been caught locally, and investigation processes that guess at root causes instead of reading the actual crash report first.

---

## Part 1: Branch Strategy

### Naming

All work happens on branches off master. Naming convention:

```
feature/short-description    — new features, screens, game logic
fix/short-description        — bug fixes
refactor/short-description   — code restructure, no behaviour change
chore/short-description      — dependencies, config, tooling
```

Examples: `feature/kepler-belt-levels`, `fix/hermes-sigsegv-canvas`, `refactor/scoring-engine-cleanup`.

### Rules

1. One branch per feature or fix. No bundling unrelated changes on the same branch.
2. Branch from the current tip of master. Pull master before branching.
3. Branch stays independent until it passes the QA gate (Part 2).
4. Only merge to master after QA signs off.
5. Builds are only cut from master, never from a feature branch.
6. Delete the branch after merge. Dead branches are noise.

### Parallel Development

Multiple feature branches can be active simultaneously. Each branch is isolated and tested independently. If two branches touch the same files, the second one to merge resolves conflicts at merge time (see Part 5 for conflict resolution).

T-Bot tracks which branches are active and who owns them. No two departments should be editing the same file on different branches without T-Bot flagging the collision risk upfront.

### Branch Lifecycle

```
master (stable)
  |
  +-- feature/kepler-belt-levels  (Dev works here)
  |     |
  |     +-- QA gate passes
  |     |
  |     +-- merge to master
  |
  +-- fix/canvas-render-bug       (parallel, independent)
        |
        +-- QA gate passes
        |
        +-- merge to master
```

---

## Part 2: QA Gate Process

No branch merges to master without passing the QA gate. No exceptions.

### Gate Checklist

QA runs the following on the branch before approving merge. All four must pass:

```
1. npx expo lint          — zero warnings
2. npx tsc --noEmit       — zero errors
3. npm test               — all tests green, coverage thresholds met
4. npm audit --audit-level=high — clean
```

These are the same quality gates defined in CLAUDE.md. The difference is enforcement: previously they ran at commit time on master. Now they run on the branch before the branch ever touches master.

### Branch-Level Testing

QA tests the branch in isolation before merge. This means:

1. **Automated gates** — the four checks above, run by QA or CI on the branch.
2. **Functional testing** — QA verifies the feature works as specified. Compare against the spec in `/project-docs/SPECS/` and any approved HTML prototypes in `/design/screens/`.
3. **Regression check** — QA confirms existing functionality is not broken. Run the full test suite, not just new tests.

### Device Testing Without Burning Builds

TestFlight builds are expensive (15/month). Use these for device testing without consuming the quota:

- **iOS Simulator** — `npx expo run:ios` compiles and runs a debug build on the local simulator. Covers layout, navigation, animations, and most gameplay. This is the primary testing tool.
- **Expo Dev Client** — if a dev client build exists on a physical device, connect to the dev server for live testing. Useful for touch interactions and performance that the simulator cannot replicate.
- **Maestro E2E** — run `.maestro/flows/` against the simulator build for automated interaction testing.

TestFlight builds are release candidates. They validate that the production build process works and that the app runs correctly on real hardware with real Hermes compilation. They are not for debugging.

### QA Sign-Off

QA writes a brief pass/fail summary as a comment on the branch (or in a report file if working through the Cowork-Code handoff). The summary includes:

- Gate results (lint, typecheck, tests, audit — pass/fail each)
- Functional test result
- Any issues found and whether they are blocking
- Recommendation: merge or send back

---

## Part 3: Crash Report First Rule

This is mandatory. No exceptions. No shortcuts.

### The Rule

When a crash or unexpected failure is reported from a TestFlight build or device test, the FIRST action — before any code-level investigation — is to obtain the actual device crash report.

Do not:
- Guess at root causes from code patterns
- Start bisecting commits
- Read source files looking for likely culprits
- Theorize based on symptoms

Do:
- Get the crash report from Xcode Organizer (TestFlight crashes), Console.app (simulator crashes), or device logs
- Read the crash report
- Identify the failing thread, the exception type, and the faulting address or stack frame
- THEN begin investigation with that data in hand

### Why This Exists

We burned two TestFlight builds chasing a Hermes SIGSEGV. The investigation process spent cycles analyzing code paths and guessing at causes. The actual crash report — which would have pointed directly to the fault — was never pulled until late in the process. This rule prevents that from happening again.

### Crash Report Filing

Every crash report goes into `/project-docs/REPORTS/` with this naming:

```
crash-buildNN-short-description.md
```

Example: `crash-build12-hermes-sigsegv-canvas.md`

Contents:

```markdown
# Crash Report: [Build NN] — [Short Description]
### Date: YYYY-MM-DD

## Device / OS
[device model, iOS version]

## Build
[EAS build number, commit hash]

## Raw Crash Report
[paste the full crash report from Xcode Organizer or Console.app]

## Analysis
[faulting thread, exception type, relevant stack frames]

## Root Cause
[filled in after investigation]

## Fix
[branch name, commit hash — filled in after fix lands]
```

The raw crash report section is non-negotiable. If you cannot paste the actual report, the investigation has not started.

---

## Part 4: Build Quota Management

### Budget

15 EAS builds per month on the free plan. Every build counts. There is no "just try it and see" budget.

### Build Allocation

Treat builds as a finite resource with this priority order:

1. **Release candidates** — code that has passed the QA gate on its branch, merged to master, and is ready for TestFlight validation. This is the primary use.
2. **Critical hotfixes** — a shipped build has a blocking bug that cannot wait for next month's quota. Emergency only.
3. **Infrastructure validation** — Expo SDK upgrade, new native module, EAS config change that cannot be validated any other way. Rare.

### Build Approval Gate

No `eas build` command runs without explicit approval from Tucker or Dispatch. The approval request includes:

- What changed since the last build (commits on master since last build tag)
- QA gate status (all four passing)
- Remaining build quota for the month
- Why this build is needed now vs. waiting

### What Does Not Get a Build

- Debugging crashes (use simulator + crash reports)
- Testing a feature that has not passed QA gate
- "Let's see if this works on device" without completing branch-level QA
- Multiple builds in a single day unless the first revealed a release-blocking issue

### Build Tracking

Maintain a running count in `/project-docs/REPORTS/build-log.md`:

```markdown
# Build Log — [Month Year]

| # | Date | Commit | Branch(es) Merged | Result | Notes |
|---|------|--------|-------------------|--------|-------|
| 1 | 05-03 | abc1234 | feature/kepler-levels | Pass | RC1 for Kepler |
| 2 | 05-10 | def5678 | fix/canvas-render | Pass | Hotfix |
```

---

## Part 5: Integration with Existing Workflow

### Cowork-Code Handoff

The branching strategy layers on top of the existing handoff system. The flow becomes:

1. Cowork writes spec to `/project-docs/SPECS/`
2. Cowork writes brief to `/project-docs/BRIEFS/`
3. Tucker approves and delivers prompt via `/prompt` slash command
4. **Code creates a feature branch** (not committing to master)
5. Code implements on the branch, runs quality gates
6. QA tests the branch
7. On QA pass, Code merges to master
8. Tucker or Dispatch approves a build if one is warranted

Step 4 is the new gate. Previously, Code committed directly to master at step 4.

### T-Bot Coordination

T-Bot's responsibilities in the branching workflow:

- **Branch assignment** — when a sprint task is assigned, T-Bot specifies the branch name in the brief. This prevents naming collisions and ensures one-branch-per-task.
- **Collision detection** — if two tasks will touch overlapping files, T-Bot flags this at assignment time so the second task knows to rebase before QA.
- **Merge ordering** — when multiple branches are QA-ready simultaneously, T-Bot recommends merge order based on dependency and risk. Lower-risk, independent changes merge first.
- **Build approval routing** — T-Bot tracks remaining build quota and includes it in any build request to Tucker or Dispatch.

### Merge Conflict Resolution

When a branch has conflicts with master (because another branch merged first):

1. The branch owner rebases onto current master: `git rebase master`
2. Resolve conflicts on the branch
3. Re-run the full QA gate on the rebased branch
4. QA re-approves
5. Then merge

Conflicts are never resolved on master. Master stays clean.

### CI/CD Pipeline Alignment

The existing GitHub Actions pipeline (documented in docs/DEVENV.md) already supports this:

- **Push/PR to any branch** — CI runs lint, typecheck, tests, audit. This is the automated portion of the QA gate.
- **Merge to master** — CD runs EAS OTA update automatically.
- **Merge to master with `[build]` in commit message** — triggers EAS binary build. Use this only after build approval gate passes.

No pipeline changes are needed. The branching strategy is a process change that uses the existing CI/CD infrastructure correctly.

---

## Part 6: Quick Reference

### Developer Checklist (Per Feature)

```
[ ] Branch created from current master tip
[ ] Branch named correctly (feature/, fix/, refactor/, chore/)
[ ] Implementation complete
[ ] Tests written (coverage thresholds met)
[ ] Quality gates pass on branch (lint, typecheck, tests, audit)
[ ] QA notified for branch-level testing
[ ] QA sign-off received
[ ] Rebased on master if needed (re-run gates after rebase)
[ ] Merged to master
[ ] Branch deleted
[ ] Build requested if warranted (with approval)
```

### Crash Response Checklist

```
[ ] Crash reported — DO NOT start code investigation
[ ] Obtain device crash report (Xcode Organizer / Console.app)
[ ] File crash report to project-docs/REPORTS/crash-buildNN-description.md
[ ] Read and analyze the crash report
[ ] Identify faulting thread, exception type, stack frames
[ ] NOW begin code-level investigation guided by crash data
[ ] Fix on a branch, QA gate, merge
```

### Build Request Template

```
Build Request — [Date]
Commits since last build: [list or count]
Branches merged: [list]
QA gate: [pass/fail each]
Builds remaining this month: [N of 15]
Reason: [why now]
Approved by: [Tucker / Dispatch]
```
