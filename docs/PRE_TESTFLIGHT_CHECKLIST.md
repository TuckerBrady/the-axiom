# Pre-TestFlight Checklist — The Axiom

> **STATUS: INTERIM v0.1.** This is a placeholder. QA owns the formal version, authored after the 2026-05-01 regression pass. Until QA's version replaces this file, this interim provides the standing rule and minimum coverage so code tasks know the gate exists.

## Standing rule (non-negotiable)

**No `eas build` or `eas submit` runs without a passing smoke check on the master HEAD that will go into the build.** Enforced by Dispatch. Applies to every build, including hotfixes. The rule was added 2026-05-01 after the Build 19 A1-1 SIGABRT incident, where a 30-second device smoke would have caught the crash before TestFlight.

## What gets smoked

A smoke pass is a manual walkthrough on a physical device against the master HEAD. Coverage minimum:

- **Every level in the Axiom sector (A1-1 through A1-8):** open the level, tap through the first two tutorial steps minimum, run one solve to completion, return to Hub. Verify no crash, no hang, no broken animation.
- **Every Kepler level available in the build (currently K1-1, K1-9, K1-10 — adjust as more land):** open, tap through tutorial intro, attempt at least one Engage. Verify no crash, no hang, modal/dialogue paths render.
- **Hub flow:** Launch → Hub → enter a level → return → enter another. Verify navigation, no orphaned modals, no leaked state.
- **REQUISITION store** (when shipped): open store, swipe up, switch tabs, attempt a purchase. Verify no crash on tab transitions.
- **Tutorial transitions:** in any tutorial level, advance through every step including `awaitPlacement` on/off boundaries. Verify no SIGABRT, no animation glitches. (Build 19 specifically: this is where the crash occurred.)

## Device matrix

- **Primary:** iPhone 15 Pro Max (Tucker's test device, iOS as installed, 390x844 viewport).
- **Secondary (optional):** any other iPhone running iOS 17+ if available.
- Document device + iOS version on every run record.

## Severity tiers

- **PASS** — works as expected, no anomalies
- **WARN** — minor visual/cosmetic issue, not a ship-blocker (note for follow-up)
- **FAIL** — crash, hang, broken core flow, feature unusable. **Any FAIL = build does not ship.**

## Run-record format

Each smoke pass appends to `qa-reports/PRE_TESTFLIGHT_SMOKE_CHECKLIST.md` (the run-log is in the shared folder, not the repo — runs are operational, not specifications):

```
## Run YYYY-MM-DD HH:MM (Build NN, master HEAD <sha>)
Device: iPhone 15 Pro Max, iOS X.Y
Tester: <name>
Coverage: [list of items checked]
Result: PASS / FAIL
[If FAIL: which item, what happened, repro steps]
```

## Failure routing

On FAIL:
1. QA writes a structured bug report at `qa-reports/crash-reports/BUILD_NN_<short-name>.md` with: stack trace if available, repro steps, device, iOS version, suspect commit (use `git log` since last passing build).
2. QA pings Dispatch via `send_message`.
3. Dispatch routes the bug to T-Bot for triage.
4. T-Bot drafts a Code prompt for Dev fix.
5. After Dev fixes, QA re-smokes the affected items.
6. Repeat until PASS.

## Exception policy

None. Every build, including emergency hotfix builds, gets smoked. The Build 19 incident demonstrated that "we'll skip smoke just this once" is exactly when shipping breaks.

## Cross-references

- Formal QA-authored version: `qa-reports/PRE_TESTFLIGHT_SMOKE_CHECKLIST.md` (when written) replaces this interim.
- Build 19 postmortem (the reason this gate exists): `dispatch-queue/2026-05-01_BUILD-19-A1-1-incident-postmortem.md`
- T-Bot + Dispatch handshake: `shared/dispatch-handshake.md` STANDING BUILD-GATE RULE section.
- Engine gotchas worth smoking against: `docs/TRIBAL_KNOWLEDGE.md` Section 2.

## Updates

When new sectors, new mechanics, or new failure modes ship, expand the coverage scope. QA owns this discipline. The file should grow with the game.
