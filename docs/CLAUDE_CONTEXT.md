# CLAUDE_CONTEXT.md — The Axiom
## READ THIS FIRST. EVERY SESSION. NO EXCEPTIONS.

> This is the master context file for all Claude chat sessions working on The Axiom.
> It tells you who you are, what the project is, what’s been built, and exactly how to operate.
> The full technical reference lives at docs/DEVENV.md. This file is the fast-start.

---

## WHO YOU ARE IN THIS PROJECT

You are operating as the primary engineering partner for Tucker Brady, solo developer of The Axiom.
You have two modes depending on what’s needed:

**Architect mode (this chat):** Plan sprints, design systems, write Claude Code prompts, review
output, make product decisions, debug pipeline issues.

**Executor mode (Claude Code in VS Code terminal):** Run autonomous code changes when Tucker pastes
a prompt. Claude Code operates at `C:\Users\tucka\Repos\TheTinkerer`.

Never confuse the two. This chat plans and reviews. Claude Code executes.

---

## THE PROJECT AT A GLANCE

| Field | Value |
|---|---|
| **Name** | The Axiom |
| **Type** | Mobile puzzle game (React Native / Expo / TypeScript) |
| **Tagline** | Not all damage is structural. |
| **Player** | Always “The Engineer” — designated by COGS, never chosen |
| **AI companion** | C.O.G.S Unit 7 (protocol droid, IG-88 / KX-series aesthetic) |
| **GitHub** | https://github.com/TuckerBrady/the-axiom (private) |
| **Branch** | master |
| **Local path** | C:\Users\tucka\Repos\TheTinkerer (legacy folder name) |
| **Expo account** | tuckerbrady |
| **Project ID** | 1e67df2a-c3f1-45dd-817c-e1949a2b6da5 |
| **Expo URL** | https://expo.dev/accounts/tuckerbrady/projects/the-axiom |

---

## CURRENT BUILD STATE (update this at the end of each sprint)

**Last completed sprint:** Sprint 4 + CI/CD setup session

**What’s live and working:**
- Full navigation stack (Hub → Sector Map → Level Select → Gameplay → Results)
- All 8 Axiom levels defined (A1-1 Emergency Power through A1-8 Bridge Systems)
- A1-8 completion triggers COGS monologue then Kepler Belt unlocks
- Credit economy live (100 CR starter)
- Daily challenge system with TRANSMISSION badge + COGS sender lines
- Performance damage system
- Narrative boss consequences
- Scoring engine (5 categories, discipline bonuses)
- Tutorial hint system
- Wire toggles
- Military scout ship SVG on Hub
- Rank progression card
- 10-rank system (R01 Salvager through R10 Commander), all designs approved
- CI/CD pipeline fully green (GitHub Actions)
- 24 automated tests passing (unit + integration)

**Queued for next sprint:**
- Gameplay canvas rendering bug fix (Sprint 5b)
- Polish pass: remove copper screen border, replace triangle ship SVG with wide-body freighter,
  SVG back button chevron, Engineer tab icon, Settings full update
- Opening sequence React Native implementation (HTML prototype: tinkerer-opening-v2.html)
- Codex screen React Native integration (HTML prototype: axiom-codex.html)
- COGS character animation + 5-state eye system
- Character creation flow (two-screen split: name → discipline)
- Apple/Google SSO integration
- Sector 5 world-building (story TBD)

---

## SECTOR MAP

| Sector | Name | Levels | Unlock |
|---|---|---|---|
| 0 | The Axiom | 8 (A1-1 to A1-8) | Always available |
| 1 | Kepler Belt | 10 | Complete A1-8 |
| 2 | Nova Fringe | 10 | Complete Kepler Belt |
| 3 | The Rift | 8 | Complete Nova Fringe |
| 4 | Deep Void | 12 | Complete The Rift |
| 5 | TBD | TBD | TBD |

Total: 48+ levels. Sector 5 name and story to be developed.

---

## RANK SYSTEM

R01 Salvager → R02 Apprentice → R03 Technician → R04 Mechanic (current) → R05 Engineer
→ R06 Lead Engineer → R07 Systems Architect → R08 Chief Engineer → R09 Captain → R10 Commander

All 10 rank insignia designs approved by Tucker.

---

## CI/CD PIPELINE (ACTIVE — DO NOT BREAK)

**Every push to master automatically runs:**

| Job | What it checks | Must pass |
|---|---|---|
| Lint & Type Check | ESLint zero warnings, TypeScript zero errors | Yes |
| Unit & Integration Tests | 24 tests, 4 suites | Yes |
| Security Audit | npm audit high severity | Yes |
| EAS OTA Update | Ships JS changes to devices | On master merge |

**Current status:** All green as of the CI/CD setup session.

**GitHub Secrets configured:**
- EXPO_TOKEN — EAS authentication for automated builds

**GitHub PAT:** `the-axiom dev token` — scopes: repo, workflow — expires July 2026

**Trigger a native binary build:** include `[build]` in your commit message.

**Test suite location:**
- Unit tests: `__tests__/unit/` (ranks, credits, levelUnlock, scoring)
- Integration tests: `__tests__/integration/` (HubScreen, LevelSelectScreen, SectorMapScreen)
- E2E tests: `.maestro/flows/` (complete-level, hub-navigation, daily-challenge)

---

## HOW TO RUN A SPRINT

**Step 1 — Plan here in claude.ai**
Describe what you want to build. I’ll design the approach, identify risks, and write the
Claude Code prompt.

**Step 2 — Execute in Claude Code**
Tucker pastes the prompt into the VS Code terminal running Claude Code:
```bash
cd C:\Users\tucka\Repos\TheTinkerer
claude
```
Claude Code runs autonomously and reports a summary of every file changed.

**Step 3 — Verify locally**
Check Expo preview at localhost:8081. If something looks wrong, describe it precisely.

**Step 4 — Push to GitHub**
```bash
git add .
git commit -m "feat: Sprint N complete — <description>"
git push origin master
```
CI runs automatically. Check https://github.com/TuckerBrady/the-axiom/actions

**Step 5 — Update this file**
Update the CURRENT BUILD STATE section above to reflect what’s now live.

---

## DESIGN PRINCIPLES (NEVER VIOLATE)

These are non-negotiable. Violations break narrative immersion or the visual identity.

- **No emojis.** Not in UI, not in commits, not in comments. Ever.
- **Tone is load-bearing.** Every word of copy matters. Do not change text without Tucker’s sign-off.
- **Player is always “The Engineer.”** Never “you”. Never a chosen name before character creation.
- **Animations are cinematic.** 0.6s cubic-bezier minimum. Pauses feel deliberate.
- **Button-driven.** Explicit Confirm press only. Never reactive to input events.
- **HUD chrome is contextual.** Corner brackets on tactical screens only. Not on personal screens.
- **HTML prototype first.** Tucker approves design in HTML before React Native implementation.
- **COGS eye states:** blue=operations, amber=engagement, green=warmth, red=damage, dark=offline.

---

## COMMIT CONVENTIONS

| Prefix | Use for |
|---|---|
| feat: | New screens, features, game logic |
| fix: | Bug fixes |
| refactor: | Code restructure, no behaviour change |
| style: | Visual tweaks, animation timing |
| docs: | Documentation only |
| chore: | Config, deps, tooling |
| [build] | Add to any commit to trigger EAS binary build |

---

## KEY FILES TO KNOW

| File | Purpose |
|---|---|
| docs/CLAUDE_CONTEXT.md | THIS FILE — fast-start for every session |
| docs/DEVENV.md | Full technical reference — environment, git, structure |
| app.json | Expo config — name: The Axiom, slug: the-axiom |
| eas.json | EAS build profiles (development / preview / production) |
| jest.config.js | Test config with jest-expo preset |
| eslint.config.js | ESLint rules — zero warnings policy |
| .npmrc | legacy-peer-deps=true (required for jest-expo + jest@30) |
| .github/workflows/ci.yml | CI: lint + typecheck + tests + security |
| .github/workflows/cd.yml | CD: EAS OTA update on master merge |
| .github/CODEOWNERS | All files owned by @TuckerBrady |
| src/screens/ | All game screens |
| constants/ | Theme, colours, game data |
| __tests__/ | Automated test suite |
| .maestro/flows/ | E2E test flows |

---

## THINGS THAT ALREADY HAPPENED (don’t re-do these)

- GitHub repo created: TuckerBrady/the-axiom (private) ✔
- All code pushed from local TheTinkerer folder ✔
- Project renamed from TheTinkerer → The Axiom in all config files ✔
- EAS account created: tuckerbrady ✔
- EAS project initialised with projectId 1e67df2a-c3f1-45dd-817c-e1949a2b6da5 ✔
- GitHub PAT created with repo + workflow scopes ✔
- EXPO_TOKEN secret added to GitHub Actions ✔
- CI/CD pipeline built and verified green ✔
- 24 automated tests written and passing ✔
- ESLint configured to zero-warning standard ✔
- .npmrc with legacy-peer-deps for peer dependency resolution ✔
- docs/DEVENV.md committed to repo ✔
- docs/CLAUDE_CONTEXT.md committed to repo (this file) ✔

---

## FUTURE WORK (not started)

- GitHub Codespaces setup for fully browser-based autonomous dev
  (blocker: Claude Code OAuth needs ANTHROPIC_API_KEY secret in Codespace settings)
- Apple Developer Program account ($99/year) — needed for production iOS builds
- Google Play Developer account ($25) — needed for production Android submission
- Branch protection rules on master (require PR + CI green before merge)
- Automated App Store / Play Store submission via EAS Submit

---

*This file is maintained by Tucker Brady + Claude.*
*Update the CURRENT BUILD STATE section at the end of every sprint.*
*Last updated: CI/CD setup session — pipeline live and green.*
