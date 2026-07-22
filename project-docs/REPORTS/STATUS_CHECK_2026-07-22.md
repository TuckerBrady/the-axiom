# Status Check — 2026-07-22

**Summary.** Master has been frozen since 2026-06-16 (d2949cf). Four PRs have been open for 5+ weeks with no reviews — they appear to have fallen through the cracks after the TestFlight release cycle consumed Tucker's and T-Bot's attention through PR #34 comments. The branch that was supposed to be a two-line A1-7 fix now carries 8 commits and is the de-facto Sprint 17C archive. The audit vulnerability count on master is 20 (4 high, 1 critical); the current branch has a partial fix that brings it to 19 (3 high, 1 critical) — but all remaining high/critical vulnerabilities require `npm audit fix --force` (expo@57, a breaking change). No `claude/*` branches exist on origin; that count was off. The local working tree has ~350 lines of uncommitted in-progress code that would be a real loss if discarded.

---

## 1. Audit state

**On `feat/a17-spec-out-and-anim` (current, 2026-07-22):**

```
19 vulnerabilities (15 moderate, 3 high, 1 critical)
```

High and critical detail:
- **HIGH — brace-expansion** (DoS via exponential-time regex expansion): affects `@expo/cli`, `@expo/fingerprint`, `@jest/reporters`, `@typescript-eslint/typescript-estree`, `brace-expansion`, `glob`, `jest-config`, `jest-runtime`. Fix available via `npm audit fix`.
- **HIGH — js-yaml** (quadratic CPU consumption via merge-key chains): affects `@istanbuljs/load-nyc-config`, `js-yaml`. Fix available via `npm audit fix`.
- **CRITICAL — postcss** (XSS via unescaped `</style>` in CSS stringify): rooted at `@expo/metro-config` → `@expo/cli` → `expo`. Fix requires `npm audit fix --force`, which installs **expo@57** (breaking change — cannot be applied without a full Expo upgrade and re-testing).

**On master (d2949cf):** Would show 20 vulnerabilities (4 high, 1 critical) — identical set plus undici high, which is present on master but was resolved by commit 90c6436 on the current branch.

**Existing audit fix work:**
- PR #29 (`chore/npm-audit-fix`) was merged 2026-06-16 and fixed form-data (CRLF injection, high) and ws (DoS, high). That work is on master.
- Commit 90c6436 on `feat/a17-spec-out-and-anim` fixed undici high (transitive via `expo-splash-screen`). This commit is NOT merged — it lives only on PR #34's branch.
- No other standalone audit fix branch exists on origin.

**Bottom line:** The `npm audit fix` (non-force) vulnerabilities (brace-expansion, js-yaml) should be resolvable without breaking changes. The postcss/expo tree requires a full Expo SDK upgrade to fix — that is a separate sprint item, not a one-line audit fix.

---

## 2. PR #34 scope

**Commits on branch beyond master (oldest → newest):**

| SHA | What it does |
|-----|-------------|
| 1f3c6f7 | A1-7: expected OUT on Spec Sheet + fill OUT at Transmitter (original purpose) |
| b64b906 | Kepler v3: blown cells, Latch DELAY, K1-9 shift register, K1-10 temporal-OR, consequence copy |
| ca46d1e | Nova Fringe: SPEC_NOVA_FRINGE + NF-1 (Inverter piece) |
| d5e439d | Docs: TestFlight release handoff (two-track build management) |
| ac42c8f | A1-1: Spec Sheet intro as final tutorial step |
| 246ec5a | App icon: COGS AI Orb in a focus frame |
| 366526b | Player-facing Replay Tutorial setting |
| 90c6436 | Audit fix: undici high (transitive via expo-splash-screen) |

**Is the branch still active?** No. Last commit is 90c6436, last comment in the PR thread is 2026-06-23. This is completed work waiting to merge.

**Can it be split cleanly?** Yes. Each commit touches a distinct feature surface with no shared code changes between them. Natural cut lines:

1. **A1-7 + A1-1 tutorial** (1f3c6f7 + ac42c8f) — original PR scope; self-contained.
2. **Kepler v3** (b64b906) — independent; touches levels/engine/tutorial.
3. **Nova Fringe** (ca46d1e) — independent; new sector scaffolding.
4. **Icon + settings** (246ec5a + 366526b) — two cosmetic/UX changes; trivially independent.
5. **Docs + audit** (d5e439d + 90c6436) — housekeeping.

However: splitting requires cherry-picking each group onto a fresh branch off master and re-running quality gates. The simpler path is to retitle PR #34 to reflect its actual scope (e.g., "feat: Sprint 17C — A1-7, Kepler v3, Nova Fringe, icon, audit fix") and merge as-is. The feature boundaries are clear in the commit history.

**Tucker's retitle flag (2026-06-21):** Was noted in the PR thread; never actioned.

---

## 3. Why PRs #30/#31/#32/#34 sat open 5+ weeks

No explicit merge blockers were stated on any of the four PRs. Most likely causes:

- **T-Bot is reactive.** T-Bot only acts when Tucker asks. No one initiated a merge review pass after the TestFlight release work concluded on 2026-06-23.
- **PR #34 consumed the review surface.** Tucker's and T-Bot's attention in late June was on EAS build numbering (build 42 → 44 → 46 corrections) and external tester assignment — all conducted via PR #34 comments. The other three PRs were backgrounded.
- **PRs #30/#31 are sequential.** PR #30 (requisition gating) was explicitly "step 1"; PR #31 (Arc Wheel lift) was "step 2, separate PR." Both were queued to follow #30's merge, which itself waited behind #34.
- **PR #32 has zero engagement.** It was opened 2026-06-16 with no comments, no review request, no follow-up. It appears to have been forgotten entirely.
- **Net:** They fell through the cracks — no active blocker, no scheduled review pass.

---

## 4. Local working tree state

**Tracked files with uncommitted changes (349 insertions, 45 deletions across 11 files):**

| File | Change |
|------|--------|
| src/components/gameplay/ArcWheel.tsx | +109 lines |
| src/game/levels.ts | +83 lines |
| src/store/requisitionStore.ts | +24 lines |
| src/screens/GameplayScreen.tsx | +36 lines |
| src/game/engine.ts | +21 lines |
| __tests__/unit/requisitionStore.test.ts | +44 lines |
| src/game/engagement/requiredPiecesDialogue.ts | +17 lines |
| src/utils/devFlags.ts | +4 lines |
| src/game/types.ts | +6 lines |
| __tests__/unit/components/ArcWheel.test.ts | +25 lines |
| __tests__/unit/levels.test.ts | +25 lines |

This is in-progress Arc Wheel lift and related engine work — real feature code. **Not safe to discard.**

**Untracked files — assessment by category:**

| Category | Safe to discard? | Note |
|----------|-----------------|------|
| `.auto-memory/` | No — recover first | Persistent memory state for the auto-memory system; check if content is recoverable elsewhere |
| `.coverage-tmp/`, `.coverage-tmp2/` | Yes | Temporary Jest artifacts |
| `__tests__/unit/kepler-engine/` (4 files) | No | Real test work: evaluateMinPieces, keplerK110TemporalOr, keplerK14Masking, minPiecesDialogue — not on GitHub |
| `design/mockups/`, `design/screens/`, `design/specs/` | Judgment call | Design reference files; recoverable from source if Cowork has copies |
| `project-docs/BRIEFS/BRIEF_UX01_DIALOGUE_CARD_ANCHORS.md` | No | Active brief from Cowork |
| `project-docs/REPORTS/` (7 files) | No | QA reports, crash investigation, build handoffs — historical record |
| `project-docs/SPECS/` (6 files) | No | SPEC_BEAM_ANIMATION, SPEC_SIGNAL_ENGINE, SPEC_TM_MODEL_AND_REQUIREMENTS, audio-haptics, scoring-algorithm-v2, tray-to-arc-wheel-rename — spec docs from Cowork |
| `prism-visual-interaction-audit.md` | Judgment call | Audit artifact; Cowork likely has a copy |
| `public/` | Likely yes | Generated/build assets |
| `qa-reports/` | Judgment call | Smoke run docs; value depends on whether these are already captured elsewhere |

**Summary:** The 11 modified tracked files and the 4 kepler-engine test files are the material risk. Everything else is either recoverable or expendable. GitHub is NOT the source of truth for any of this — nothing in this diff has been pushed.

---

## 5. Stray branches

**No `claude/*` branches exist on origin.** Total remote branch count is 41; all 41 are properly named under `feat/`, `fix/`, `chore/`, `docs/`, `spec/`, `archive/`, `wip/`, `test/`, `investigation/`, and `master`. The inventory in the prompt was either overstated or those branches were already deleted.

**Branches with commits beyond master that have no open PR:**

| Branch | Commits beyond master | Status |
|--------|----------------------|--------|
| `fix/turbomodule-crash-patch` | 1 commit (iOS 26 SIGSEGV patch) | Unclear — may be superseded or abandoned |
| `fix/tutorial-native-driver-sigsegv` | 2 commits (Build 20/21 SIGABRT fixes) | Likely superseded by subsequent tutorial fixes on master |
| `investigation/q02-canvas` | 1 commit (Q-02 canvas rendering findings) | Investigation artifact — findings reported, branch can be deleted |
| `wip/docs-preserve` | 2 commits (uncommitted docs before a master reset) | WIP preserve branch — likely safe to delete, content may be stale |

**Branches already merged to master (safe to delete):** Most of the remaining named branches (`fix/`, `feat/`, `docs/`, `chore/` with merged PRs). The `chore/npm-audit-fix` branch (PR #29 merged) and all other merged-PR branches are dead weight on origin.

**Recommendation (not actioned here):** Delete merged branches; verify `fix/turbomodule-crash-patch` and `fix/tutorial-native-driver-sigsegv` against current master to confirm they're not carrying needed patches before deletion.
