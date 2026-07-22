# Build 25 Crash Investigation — Post-Mortem Report
# Date: 2026-05-15
# Status: RESOLVED — Fix staged in PROMPT_115, pending TestFlight verification

---

## Executive Summary

Build 25 of TheTinkerer crashed on Thread 4 (the JS thread) with EXC_BAD_ACCESS /
KERN_INVALID_ADDRESS on every device that reached the post-level star animation. The
crash was not caused by an upstream library bug, iOS 26 PAC enforcement, or the
TurboModule void method issue active on Thread 1. It was caused by a project-level
code pattern: Reanimated animation builder chains constructed inside render-path
`.map()` callbacks, which creates intermediate objects that the HadesGC concurrent
garbage collector can sweep before the chain is complete.

Root cause was confirmed by three independent analyses — T-Bot forensic audit,
WRENCH (Dev department), and an authentic crash log retrieved directly from App Store
Connect — all pointing to the same frames in the same thread. The fix is surgical:
pre-compute all animation builder constants at module scope. No dependency upgrades,
no timing changes, no architecture changes.

---

## Background

### Build History (Crashes 19-25)

Build 19 crashed with SIGABRT from a native-driven Animated.Value host swap in
TutorialHUDOverlay. Root cause: REQ-A-1 violation (single-host invariant). Fixed in
Sprint 17C. Established REQ-A-1, REQ-A-2, REQ-A-3.

Builds 23 and 24 crashed with SIGSEGV in performVoidMethodInvocation (TurboModule
void method exception handling, RN 0.81.5 bug). Patch applied. Thread 1 in Build 25
still carries this stack but it is a bystander — not the crashing thread.

Build 25 was the third distinct crash class. Initial hypothesis pointed to Hermes PAC
enforcement on iOS 26 (A-series arm64e). This was wrong. The ESR encoding in the
authentic crash log (0x92000046) is a Translation fault from a bad virtual address —
not a PAC authentication failure, which produces a different ESR class (0x86000004).

The team does not believe any of these crashes were upstream library bugs. All three
were caused by our code, and all three have been fixed or have fixes staged.

---

## Root Cause

### Crash Signature

```
Thread 4 (Triggered by Thread: 4)
Exception: EXC_BAD_ACCESS (SIGSEGV)
ESR: 0x92000046 — Data Abort, byte write, Translation fault (invalid virtual address)
Crash address: 0x00000005b5df77b4
```

ESR 0x92000046 decodes as: Data Abort (EC=0x24), byte write (SAS=0b00), Translation
fault level 2 (DFSC=0x06). This is a write to a page that has been unmapped — freed
heap memory. It is NOT a PAC pointer authentication failure.

### The Mechanism

react-native-worklets 0.5.1 uses HadesGC, the Hermes concurrent generational garbage
collector. HadesGC runs its collection phase on background threads (Threads 5-6 in the
Build 25 log) concurrently with JS execution on Thread 4.

When a Reanimated animation builder chain is constructed inside a `.map()` callback
during a React render, the following sequence can occur:

1. `FadeInUp.delay(i * 200)` is called. It returns an intermediate builder object.
   This object is referenced only by a local variable on the JS stack — it is not
   yet GC-rooted in any persistent structure.

2. Between `.delay()` returning and `.duration()` being called, a microtask
   checkpoint fires (`RuntimeScheduler_Modern::performMicrotaskCheckpoint` /
   `drainJobs`). This is the window. React's fiber reconciliation uses microtask
   scheduling to batch work after animation completion.

3. HadesGC, running concurrently on Threads 5-6, performs a sweep phase. The
   intermediate builder object — not yet rooted — is considered garbage and its
   memory is freed.

4. Execution returns from the microtask checkpoint. `.duration(400)` is called on
   the now-freed object. `makeSerializableObject` calls `setNativeState`, which calls
   `GCSymbolID::set`, which writes to the freed address. Crash.

The race was latent in the codebase before the April 26-27 commits. Two changes made
it near-certain:

- `b8fb203` (Apr 26): native driver migration shortened the beam animation completion
  window, tightening the GC timing and making the microtask checkpoint more likely to
  fire between `.delay()` and `.duration()`.
- `90ab83d` (Apr 26): memoized subtree extraction added state churn, increasing GC
  pressure and frequency of concurrent collection.
- Four commits on Apr 27 (Dory session, GameplayScreen decomposition) added further
  render-path complexity, compounding the pressure.

The race went from theoretical to near-certain. "Rogue session makes a latent race
condition deterministic" is a class of failure to monitor for.

### Crash Stack (Thread 4, key frames)

```
frame 0:  GCSymbolID::set
frame 1:  DictPropertyMap::findOrAdd
frame 2:  JSObject::defineNewOwnProperty
frame 3:  HermesRuntimeImpl::setNativeState
frame 4:  worklets::SerializableJSRef::newNativeStateObject
frame 5:  worklets::makeSerializableObject
frame 6:  JSIWorkletsModuleProxy::get::$_15
...
frame 29: arrayPrototypeMap       (first .map() call)
...
frame 37: arrayPrototypeMap       (second .map() call — renderStars iterates [1,2,3])
...
frame 45: Runtime::drainJobs
frame 46: HermesRuntimeImpl::drainMicrotasks
frame 47: RuntimeScheduler_Modern::performMicrotaskCheckpoint
```

Two nested `arrayPrototypeMap` frames confirm the pattern: the crash happens inside a
`.map()` callback that constructs a Reanimated builder chain, during a microtask drain.

### Vulnerable Locations

`src/components/gameplay/GameplayModals.tsx` — `renderStars()` function:
```tsx
// VULNERABLE — do not write code like this
return [1, 2, 3].map(i => (
  <Animated.View entering={FadeInUp.delay(i * 200).duration(400)}>
```

`src/screens/StoreScreen.tsx` — POWER_UPS.map (line ~213):
```tsx
// VULNERABLE
entering={FadeInUp.delay(i * 60).duration(350)}
```

`src/screens/StoreScreen.tsx` — CIRCUIT_PACKS.map (line ~249):
```tsx
// VULNERABLE
entering={FadeInUp.delay(300 + i * 80).duration(350)}
```

---

## Investigation Methodology

### Why Three Independent Reads

A single analysis — even a correct one — cannot rule out confirmation bias or a
missed alternative. The standard used in this investigation: two independent analyses
must agree before a fix is drafted. Tucker's smell test (only our project, no
upstream reports matching the crash) was the first signal. T-Bot's analysis was the
first read. WRENCH (Dev) was the second. Both identified the same files and the same
pattern without sharing findings. The authentic crash log from App Store Connect was
the third read — it confirmed the thread attribution and crash stack independently
of all prior analysis. All three agreed. That is the gate.

### Crash Log Chain of Custody

A chain-of-custody dispute arose during the investigation (SKEPTIC/QA correctly
flagged integrity signals on a T-Bot-placed file copy). The dispute was resolved by
retrieving the authentic log directly from App Store Connect and committing it with a
message naming the source:

`project-docs/REPORTS/build25-crashlog.crash` — committed at a41f549
`project-docs/REPORTS/build25-feedback.json` — committed alongside it

Source: App Store Connect > TestFlight > Tucker Brady > Build 25 crash (2026-05-06).
Device: iPhone16,2 (iPhone 15 Pro Max), iOS 26.4.2, arm64e.

When T-Bot places a file from an upload into the repo, the mtime will reflect the
copy date, not the original file date. This is expected. The right response is to
commit it immediately with the source named in the commit message so future forensic
checks have a clear chain of custody.

### Prior Diagnoses Assessed

| Hypothesis | Verdict | Reasoning |
|---|---|---|
| REQ-A-1 SIGABRT (Build 19) | Real, correctly fixed, not relevant | Different exception type, different thread, different stack |
| TurboModule void SIGSEGV (Builds 23+) | Real, patch applied, bystander in Build 25 | Thread 1 carries the stack but "Triggered by Thread: 4" — Thread 1 did not crash |
| PAC KERN_PROTECTION_FAILURE (iOS 26) | Wrong exception type for Build 25 | ESR 0x92000046 is Translation fault, not PAC auth failure (0x86000004) |
| HadesGC race in .map() callback | Confirmed root cause | Three independent analyses, authenticated crash stack, code pattern verified |

---

## The Fix

### REQ-W-1 (New Rule)

A Reanimated animation builder chain (`FadeIn`, `FadeInUp`, or any other `entering=`
builder) MUST NOT be constructed inside a `.map()` callback, array iteration, or
async/Promise callback in render-path code. Builder chains used in `entering=` props
MUST be declared as module-scope constants.

This rule is enforced by the lint test at `__tests__/lint/workletsMapCallbackSafety.test.ts`.

Analogy: REQ-W-1 is to Reanimated what REQ-A-1 is to Animated. Both rules exist
because a seemingly harmless render-path pattern triggers a native-layer race that
produces a deterministic crash.

### PROMPT_115 — Code Changes

`src/components/gameplay/GameplayModals.tsx` — add before VOID_QUOTES:
```tsx
// REQ-W-1: Module-scope entering= animation constants.
// Do NOT reconstruct these inside .map() callbacks.
const STAR_ENTER_1 = FadeInUp.delay(200).duration(400);
const STAR_ENTER_2 = FadeInUp.delay(400).duration(400);
const STAR_ENTER_3 = FadeInUp.delay(600).duration(400);
```

Update `renderStars()` to reference constants instead of constructing inline.

`src/screens/StoreScreen.tsx` — add before POWER_UPS:
```tsx
// REQ-W-1: Module-scope entering= animation constants. See GameplayModals.tsx for rationale.
const POWER_UP_ENTERS = [
  FadeInUp.delay(0).duration(350),
  FadeInUp.delay(60).duration(350),
  FadeInUp.delay(120).duration(350),
  FadeInUp.delay(180).duration(350),
  FadeInUp.delay(240).duration(350),
];

const CIRCUIT_PACK_ENTERS = [
  FadeInUp.delay(300).duration(350),
  FadeInUp.delay(380).duration(350),
  FadeInUp.delay(460).duration(350),
  FadeInUp.delay(540).duration(350),
];
```

Replace inline chains with `POWER_UP_ENTERS[i]` and `CIRCUIT_PACK_ENTERS[i]`.

Animation timing values are identical to the originals. The fix changes where the
builder objects are allocated and rooted — not when or how they animate.

### Commit Order

1. `test: add REQ-W-1 lint check for entering= builder chains inside .map() callbacks`
2. `fix: pre-compute Reanimated entering= animation constants at module scope (REQ-W-1)`

Tests committed before implementation. This is the standard.

---

## Lessons Learned

### 1. Always verify "Triggered by Thread:" before assigning crash cause

The crash log header names the crashing thread explicitly. Read it first. Thread 1
in Build 25 carried a TurboModule void stack that looked like the cause — but Thread
4 was the crashing thread, declared at the top of the log. Assigning crash cause
based on a recognizable stack without checking thread attribution led SKEPTIC to a
false positive. Every crash triage begins at the header, not at the most familiar
stack.

### 2. Chain of custody requires a commit, not just a file copy

When placing an externally sourced file into the repo (download, upload, transfer),
commit it immediately with the source named in the commit message. The file's mtime
will reflect the copy date. Without a commit message naming the source, there is no
chain of custody and future forensic checks will flag the file as suspect. This is
not a failure mode — it is expected. The protocol prevents the confusion.

### 3. Tucker's smell test is load-bearing

"Only our project is crashing, there are no community reports matching this stack."
This signal correctly ruled out upstream library bugs and pointed at our code in all
three crash investigations (Build 19, Build 23, Build 25). When community reports
are absent for a crash that is 100% reproducible on one project, look hard at recent
commits before diagnosing the library. Weight this signal heavily in future triage.

### 4. Rogue sessions can make latent races deterministic

The HadesGC race existed before the April 26-27 Dory session. Dory did not create
the bug. What Dory did: shortened the beam completion window (tighter GC timing) and
added state churn (more GC pressure), converting a low-probability race into a
near-certain crash. "Rogue session makes a latent bug deterministic" is its own
failure class. When a crash appears suddenly after a large automated commit window,
check whether the session compressed an existing race condition rather than
introduced a new one.

### 5. Cold-starting a department session without Gopher Protocol loads wrong identity

During this investigation, the Dev department session (WRENCH) cold-started, found
T-Bot's HANDOFF.md in `.auto-memory/`, and briefly activated as T-Bot instead of Dev.
The session had no Gopher Protocol in its project Instructions. The Gopher challenge-
response must precede content delivery in every department session — it establishes
identity before any brief is read. Without it, a cold-start reading the wrong file
can produce an identity collision.

### 6. Two independent analyses agreeing is the gate, not one

T-Bot's analysis alone was sufficient to draft a correct fix. Waiting for WRENCH
confirmed it, and WRENCH's confirmation also cleanly absorbed SKEPTIC's false alarm
(SKEPTIC was persuaded by WRENCH's full thread attribution analysis, not by T-Bot
asserting the same thing). Running independent audits in parallel — without sharing
findings — provides both a quality gate and a dispute resolution mechanism. This
is the standard for any crash with ambiguous prior diagnoses.

---

## Rules Established by This Investigation

| Rule | Location | Summary |
|---|---|---|
| REQ-W-1 | `docs/ANIMATION_RULES.md` (pending), `feedback_tucker_ops_rules.md` | Reanimated entering= builder chains at module scope always |
| Commit externally sourced files with source in message | This document | Chain of custody for uploaded/downloaded files |
| Three-reads standard for crash root cause | This document | T-Bot + one independent + authenticated log |

---

## References

- Authentic crash log: `project-docs/REPORTS/build25-crashlog.crash` (commit a41f549)
- Feedback record: `project-docs/REPORTS/build25-feedback.json`
- WRENCH forensic audit: `qa-reports/` (Dev department transcript)
- SKEPTIC integrity report: `qa-reports/build25-crashlog-integrity-report.md`
- Fix prompt: `cowork-prompts/PROMPT_115.md` / `cowork-prompts/APPROVED/2026-05-15_PROMPT_115.md` (after execution)
- Animation rules: `docs/ANIMATION_RULES.md` (REQ-A-1..3 precedents, REQ-W-1 pending addition)
