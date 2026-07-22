# QA Investigation — Build 25 Crash Log Integrity

**Title:** Build 25 crash log (`build25-crashlog.crash`) shows signs of post-hoc modification
**Severity:** P1
**Date:** 2026-05-15
**Investigator:** QA Department
**Affected artifact:** `project-docs/REPORTS/build25-crashlog.crash`
**Blocks current build:** No — this is a forensic integrity question, not a runtime defect

---

## Summary

`project-docs/REPORTS/build25-crashlog.crash` was modified today (2026-05-15), ten days after Build 25 shipped (2026-05-05). The crash signature in the log does not match the crash type documented for Build 25 in any project record. The file has never been committed to git. A companion file (`build25-feedback.json`) was modified at the same time and is also untracked. These three facts together — wrong crash type, today's mtime, no git history — constitute evidence of tampering.

---

## Evidence

### 1. File modified today

```
Modify: 2026-05-15 19:05:21
Change: 2026-05-15 19:05:21
```

Build 25 was triggered on 2026-05-05. The crash timestamp inside the file reads `2026-05-05 22:47:59`. The file's mtime is ten days later. A crash log exported from TestFlight and placed in the repo at the time of Build 25 analysis should carry a mtime of approximately 2026-05-05 to 2026-05-06. This file does not.

`build25-feedback.json` carries the same mtime (`2026-05-15 19:05:21`). Both files were written or overwritten together today.

### 2. Never committed to git

```
git log --all --oneline -- project-docs/REPORTS/build25-crashlog.crash
(no output)
```

`git status` shows the file as `??` (untracked). Every other substantive investigation report in `project-docs/REPORTS/` is either committed or shows as modified from a committed base. This file has no git history at all.

Comparison:
- `build25-turbomodule-patch-research.md` — committed, in git log
- `build20-a1-1-sigabrt-investigation.md` — committed, in git log
- `build25-crashlog.crash` — never committed, untracked, no history

### 3. Crash signature mismatch (primary indicator)

The crash log claims to be from Build 25 (version `0.9.265 (25)`). Its exception reads:

```
Exception Type:  EXC_BAD_ACCESS (SIGSEGV)
Exception Subtype: KERN_INVALID_ADDRESS at 0x00000005b5df77b4
```

Thread 1 shows `performVoidMethodInvocation` in `RCTTurboModule.mm:438`. This is the **TurboModule void method rethrow bug** — the crash class documented for Builds 23 and 24.

Build 25's documented crash is:

```
KERN_PROTECTION_FAILURE — Hermes PAC violation on iOS 26 physical
```

`build-failure-pattern-analysis.md` (section 1, Build 25 row) explicitly states the TurboModule crash **was resolved** in Build 25 by the `withTurboModulePatch.js` config plugin. That plugin exists in the committed codebase at `plugins/withTurboModulePatch.js` (committed 2026-05-05). The Build 25 patch research document (`build25-turbomodule-patch-research.md`) confirms the patch targets `performVoidMethodInvocation` at `RCTTurboModule.mm:437` — the exact frame shown as crashing in this log.

A crash log from a build that patched the TurboModule bug should not show the TurboModule bug as the crash.

### 4. Crashing thread introduces an undocumented crash class

Thread 4 (the crashing thread) shows:

```
worklets::JSIWorkletsModuleProxy::get(...)
worklets::makeSerializableObject(...)
worklets::SerializableJSRef::newNativeStateObject(...)
```

This is a React Native Worklets / Reanimated crash, not the Hermes PAC violation. No prior report, investigation document, or build-failure-pattern-analysis entry mentions Reanimated worklets as a crash factor in any build from 19 to 25. This crash class is entirely absent from project history, which is unexpected for a crash that occurred in a build that was otherwise heavily documented.

---

## What the legitimate Build 25 crash should look like

Per `build-failure-pattern-analysis.md` and `build25-turbomodule-patch-research.md`:

- Exception: `KERN_PROTECTION_FAILURE` (PAC enforcement, not `KERN_INVALID_ADDRESS`)
- Crash source: Hermes pointer authentication at launch (not `performVoidMethodInvocation` mid-run)
- Reproduces 100% on physical iOS 26, zero on simulator
- No Reanimated worklets stack involvement

The file in the repository does not match any of these characteristics.

---

## What may have occurred

Three possibilities, in descending likelihood:

1. **Substitution.** The original Build 25 crash log (which would show `KERN_PROTECTION_FAILURE`) was replaced with a log from a different device, build, or session that happened to involve the TurboModule path and the worklets stack. This could be accidental (wrong file copied) or deliberate.

2. **Fabrication.** The `.crash` file was synthesized by compositing known frame addresses from Builds 23/24 into a new file. The worklets frames in Thread 4 would be the seam where the composition is imperfect — they are not consistent with any known crash class in this project.

3. **New crash class, misdated.** Build 25 produced a second crash beyond KERN_PROTECTION_FAILURE involving worklets, it was captured late, and it was placed in the repo today when someone finally processed it. This does not explain why the exception type is KERN_INVALID_ADDRESS rather than KERN_PROTECTION_FAILURE.

---

## Recommended actions

1. **Tucker to pull the original `.crash` file from App Store Connect / TestFlight for Build 25.** Crash logs are retained in App Store Connect under Crashes & Analytics for 90 days. The authentic log will carry a creation date of 2026-05-05. Compare its exception type and thread stacks against this file.

2. **Delete `build25-crashlog.crash` and `build25-feedback.json` from the working tree until authenticity is confirmed.** These files should not be committed in their current state.

3. **Add crash log authenticity to the pre-TestFlight smoke gate.** Crash logs placed in `project-docs/REPORTS/` should be committed within 48 hours of build analysis, with the mtime verified against the EAS build date. Any log with a mtime more than 72 hours after the build date should require explicit explanation.

4. **No action needed on Build 25's actual crash (KERN_PROTECTION_FAILURE).** That remains an upstream Hermes/PAC issue per the existing research. The withTurboModulePatch.js fix for the TurboModule bug is confirmed present and committed correctly.

---

## Files examined

| File | Status | mtime | Git tracked |
|------|--------|-------|-------------|
| `project-docs/REPORTS/build25-crashlog.crash` | Suspect | 2026-05-15 19:05 | No |
| `project-docs/REPORTS/build25-feedback.json` | Suspect | 2026-05-15 19:05 | No |
| `project-docs/REPORTS/build25-turbomodule-patch-research.md` | Clean | 2026-05-06 01:35 | Yes (modified from committed base) |
| `plugins/withTurboModulePatch.js` | Clean | 2026-05-06 01:34 | Yes |
| `build-failure-pattern-analysis.md` (shared folder) | Unverifiable | 2026-05-10 19:07 | Not a git repo |
