# TestFlight Release Handoff — for T-Bot

Date: 2026-06-21
Branch: `feat/a17-spec-out-and-anim`
Author: Claude Code (Tucker's local dev session)
Purpose: hand off the current build state + how to run the two-track TestFlight
release so T-Bot can manage distribution.

---

## TL;DR — IMMEDIATE ACTION

A clean **public** build was built + uploaded to App Store Connect:

- **Version 0.9.265, build 42** — this is the one for external/public testers.
- Built with the `production` EAS profile → **dev tools OFF, codex discovery-gated**.
- ASC app: `6763194579` → TestFlight.

**Assign build `0.9.265 (42)` to the external test group, then submit for Beta App
Review.** Do NOT assign an earlier build — see the warning below.

---

## ⚠️ ONE-APP BUILD WARNING (read before assigning)

Both the dev and public builds live under the SAME app record (`6763194579`) and the
SAME version string (0.9.265). They are distinguished by **build number**:

- **Build 42** = `production` profile = CLEAN (no dev tools, codex hidden). → external testers.
- Earlier builds (e.g. the Kepler dev build) = `testflight` profile = dev tools ON,
  codex fully unlocked. → internal only (Tucker).

If a `testflight`/dev build is ever attached to the external group, public testers will
see developer tools and an unlocked codex. **Only attach `production`-profile builds
(currently build 42) to external testers.** When unsure, confirm the build's profile on
expo.dev before assigning.

---

## THE TWO-TRACK MODEL

| | Dev track (Tucker) | Public track (testers) |
|---|---|---|
| EAS profile | `testflight` | `production` |
| `EXPO_PUBLIC_SHOW_DEV_TOOLS` | `true` | unset |
| Dev tools (Settings/debug) | visible | hidden |
| Codex undiscovered entries | unlocked | `CLASSIFIED` until found |
| TestFlight audience | **Internal** group | **External** group |
| Build command | `/build` skill, or `eas build -p ios --profile testflight --auto-submit` | `eas build -p ios --profile production --auto-submit` |

**Why this works with zero per-build code changes:** `src/utils/devFlags.ts` exports
`SHOW_DEV_TOOLS = __DEV__ || process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === 'true'`. That one
flag gates every dev affordance AND the codex (`CodexScreen.tsx` returns `unlocked` only
when it is true). `production` builds set no dev env var and `__DEV__` is false in release
→ automatically clean. Do not add other `EXPO_PUBLIC_*` dev gates without updating this.

**Isolation:** External TestFlight groups do NOT auto-receive internal/dev builds. Tucker
will keep cutting `testflight` builds for his own internal testing; those will appear in
the build list but will not reach external testers unless explicitly assigned. Keep it
that way.

---

## APP STORE CONNECT STEPS (external testing) — web UI, human/T-Bot only

1. TestFlight → External Testing → create a group (e.g. "Public Beta"), add tester emails.
2. Fill in **Test Information** (what-to-test + contact email) — Apple requires it for external.
3. Assign **build 0.9.265 (42)** to the group.
4. Submit for **Beta App Review** (~24h first time; later builds usually faster).
5. Keep Tucker in the **Internal** group for the dev track.

---

## WHAT'S IN THIS BUILD (cycle summary)

Shipped/committed on `feat/a17-spec-out-and-anim` (all four quality gates green:
lint / tsc / jest 1726+ passing / audit clean at high):

**Kepler Belt (Sector 1) — brought to SPEC_KEPLER_REBUILD_v3:**
- Level data reconciled to v3 (economy fields, budgets, optimalPieces). K1-9 fixed from a
  rejected XOR design to the canonical one-pulse shift register.
- Latch DELAY mode made reachable in-game (3-state tap cycle) — K1-9/K1-10 now solvable.
- Pre-existing blown cells (`damagedCells`) wired + placed on K1-5..K1-10; obstacle→rubble
  and blown-cell→crater visuals.
- Consequence copy for K1-4/K1-8/K1-10; dormant K1-8 NarrativeConsequence record.
- `speedBonus` dropped from visible scoring (engine scores it 0).
- Kepler tutorial overlay enabled (was Axiom-only) + K1-1 Arc Wheel / REQUISITION onboarding.

**Nova Fringe (Sector 2) — scoped + started:**
- `project-docs/SPECS/SPEC_NOVA_FRINGE.md` (DRAFT) — 10 levels, 4 logic/state pieces.
- NF-1 "Outer Marker" (Inverter) built + engine-validated. NF-3+ blocked on three
  unbuilt pieces (Capacitor, Confluence Node, Divergence Gate).

**Note:** all new player-facing COGS copy is PROPOSED, pending Tucker sign-off. It is in
the build (Tucker is reviewing in TestFlight) but not finalized.

---

## KNOWN CAVEAT IN THIS BUILD

The **Nova Fringe** sector card unlocks after a player completes all 10 Kepler levels, but
`LevelSelectScreen` is still hardwired to a binary Axiom/Kepler choice. A tester who
finishes Kepler and taps Nova may hit confusing/broken navigation. Nova is unfinished
(only NF-1 exists, not navigable). This predates the current work. For the public beta:
either accept that testers are unlikely to 100% Kepler, or request the Nova sector be
hard-locked / the LevelSelect 3-way refactor be done before the next public build.

---

## BRANCH / MERGE STATE

- All work is committed on `feat/a17-spec-out-and-anim` (not yet merged to `master`).
- GitHub is source of truth; this branch is up for review/approval per project workflow.
- The Nova work is intentionally gated and non-navigable — safe to carry, not ready to feature.
