# The Axiom — Claude Code Persistent Memory

READ THIS FIRST. EVERY SESSION. NO EXCEPTIONS.

---

## Project

| Field | Value |
|-------|-------|
| Name | The Axiom |
| Type | Mobile puzzle game |
| Stack | React Native / Expo / TypeScript |
| Developer | Tucker Brady (solo) |
| Repo | TuckerBrady/the-axiom, master branch |
| Expo account | tuckerbrady |
| Project ID | 1e67df2a-c3f1-45dd-817c-e1949a2b6da5 |
| Local path | C:\Users\tucka\Repos\TheTinkerer |
| Dev server | localhost:8081 (npx expo start --tunnel) |

---

## Project Structure

- /src — application source code
- /src/components — reusable UI components (PieceIcon is the single source of truth for piece rendering)
- /src/screens — screen-level components
- /constants — game constants, colors, piece definitions
- /hooks — custom React hooks
- /docs — design bible, narrative, computational model, teaching progression, level design framework
- /project-docs — specs and briefs from Cowork (READ THESE before implementing)
- /project-docs/SPECS — feature specs (one per feature)
- /project-docs/BRIEFS — agent briefs (implementation instructions from Cowork)
- /project-docs/REPORTS — blocker reports (write here when you hit a decision point)
- /design/screens — approved HTML prototypes (reference before implementing)
- /__tests__/unit — Jest unit tests
- /__tests__/integration — React Native Testing Library integration tests
- /.maestro/flows — Maestro E2E tests

---

## Key Commands

```
npx expo lint          # ESLint — zero warnings required
npx tsc --noEmit       # TypeScript — zero errors required
npm test               # Jest — all tests must pass
npm audit --audit-level=high  # Security — clean required
npx expo start --tunnel       # Dev server
```

QUALITY GATES — all must pass before pushing:
1. npx expo lint        — zero warnings
2. npx tsc --noEmit     — zero errors
3. npm test             — all tests green
4. npm audit --audit-level=high — clean
Only push if all four pass. Report pass/fail on each.

TEST COVERAGE RULE: every commit that adds or changes production
code MUST include corresponding test additions or updates. No
exceptions. New functions get unit tests. Changed behavior gets
updated assertions. If a commit touches src/, it touches __tests__/.
This is not optional. Code without tests is unfinished code.

COVERAGE TARGETS: 80% statements, 80% functions, 70% branches,
80% lines. These are enforced in jest.config.js. Do not lower
them. If a commit drops coverage below thresholds, add tests
until it passes.

---

## Current State

Last completed sprint: Sprint 17 (17A + 17B + 17C). Commit: 961d8c3.

What is live: Full Axiom sector (8 levels), Turing machine tape system,
per-piece interaction animations, signal beam animation, tutorial/HUD
overlay system, daily challenge system, credit economy, rank system,
scoring engine, discipline system, CI/CD pipeline on GitHub Actions.

Five new pieces built but unassigned: Merger, Bridge, Inverter, Counter, Latch.

Next up: Kepler Belt sector (10 levels), assign new pieces, wrong output
results modal, gameplay canvas rendering bug fix, A1-5 through A1-8 tape
retrofit per Level Design Framework.

---

## Architecture — Three Layers

Every machine operates on three layers simultaneously:
1. Signal Path (Physics pieces) — physical route from Input Port to Output Port
2. Data Trail (Protocol pieces) — persistent working memory, read/write operations
3. Tape System — input tape feeds values, output tape records answers

See docs/COMPUTATIONAL_MODEL.md for full detail.

---

## Piece Categories

Physics pieces (amber beam #F0B429): Conveyor, Gear, Splitter, Merger, Bridge, Relay, Threshold Relay, Amplifier, Junction, Sequencer

Protocol pieces (blue beam #00D4FF): Config Node, Scanner, Transmitter, Inverter, Counter, Latch, Capacitor, Divergence Gate, Confluence Node, Navigator (Legendary), Resonator (pre-placed)

Every new piece must follow docs/PIECE_CREATION_STANDARD.md checklist.

---

## Design Principles — NEVER VIOLATE

1. No emojis. Not in UI, not in commits, not in comments. Ever.
2. Tone is load-bearing. Every word of copy matters. Do not change text without Tucker sign-off.
3. Player is always The Engineer. Never "you." Never a chosen name before Deep Void.
4. Animations are cinematic. 0.6s cubic-bezier minimum.
5. Button-driven. Explicit Confirm press only.
6. HUD chrome is contextual. Corner brackets on tactical/operational screens only.
7. HTML prototype first. Tucker approves design in HTML before React Native implementation.
8. COGS eye states: blue=operations, amber=engagement, green=warmth, red=damage, dark=offline.
9. Credits is the only currency. Abbreviate as CR only where space is tight.
10. Free-to-play guarantee. Every level solvable without spending real money.

---

## COGS Character Reference

- Full name: C.O.G.S Unit 7
- Voice: dry, witty, reluctantly impressed, never a cheerleader
- Never says "good job" or equivalent unprompted
- Uses "acceptable" the way other people use "extraordinary"
- First uses Engineer's actual name ONLY after Deep Void boss failure and full integrity repair

---

## Commit Conventions

feat: new screens, features, game logic
fix: bug fixes
refactor: code restructure, no behaviour change
chore: dependencies, config, tooling
docs: documentation only
test: tests only

No emojis in commit messages. Ever.

---

## Decisions Already Made (Don't Revisit)

- React Native / Expo — locked
- TypeScript — locked
- Single currency (Credits / CR) — locked
- Scoring: Efficiency 30, Protocol Precision 25, Chain Integrity 20, Discipline 15, Speed 10 — locked
- Star thresholds: 80+=3, 55-79=2, 30-54=1, 0-29=void — locked
- Tutorial Axiom levels always 3-star regardless of score — locked
- Signal beam animation: three-phase CHARGE/BEAM/LOCK — locked
- Piece interaction animations: per-piece props on PieceIcon — locked
- PieceIcon is single source of truth for all piece rendering — locked
- Dynamic board sizing: BOARD_SIZE = SCREEN_WIDTH - 24, CELL_SIZE = BOARD_SIZE / numColumns — locked
- Source node = Input Port, Output node = Output Port — locked
- Wire rendering and copper highlights: Axiom sector only — locked

---

## Common Gotchas

- MissionDossierScreen slide animation: use Animated API directly, not navigator-level animation props (they break on web)
- PieceIcon: never create local implementations. Use the one in src/components/PieceIcon.tsx
- Board sizing: never hardcode CELL_SIZE. Always calculate dynamically
- Long press on placed piece: returns piece directly to tray. No ghost/held state.
- Only Conveyor rotates on tap (plumber model). Config Node tap cycles configValue. Latch tap toggles latchMode. All other pieces: no tap action.
- Config Node always Protocol purple (#8B5CF6). configValue (0/1) cycles on tap. No CONFIGURATION header in gameplay.
- Auto-orientation: only Input Port triggers it, no other piece
- Tutorial orb measurement: uses 120ms delayed measure() for boardGrid/engageButton/tray refs
- useNativeDriver: false for all piece animations
- Config Node Codex ID: use `configNode` not `config_node`

---

## Cowork-Code Handoff System

This project uses a file-based handoff between Cowork and Code:

- Cowork writes prompts to /cowork-prompts/PROMPT_NN.md (gitignored)
- Cowork writes specs to /project-docs/SPECS/
- If you hit a decision point, write a blocker to /project-docs/REPORTS/
- Always check /project-docs/ for context before starting a new task

Prompt delivery flow:
1. Cowork drafts the numbered prompt as a file in /cowork-prompts/PROMPT_NN.md.
2. Cowork gives Tucker an elevator pitch of what the prompt does.
3. Tucker reviews. If approved, Cowork overwrites /cowork-prompts/RECENT.md
   with the same content as PROMPT_NN.md (numbered file stays for history).
4. Tucker types `/prompt` in Code. The slash command at
   /.claude/commands/prompt.md reads RECENT.md and executes.

No copy-paste. No inline chat blocks. No @file path typing. Approval gate
is the pitch — Cowork does not write RECENT.md until Tucker says go.

What goes in project-docs:
- SPECS/ — decision records, feature specs. These persist. They document
  what was decided and why.
- REPORTS/ — blocker reports from Code when it hits a decision point.

Cowork can read the repo directly when the project folder is
mounted. When Cowork does not have direct access, it writes a
grep/search script as a code block prompt. Tucker pastes it into
Code, Code runs it, Tucker reports the output back to Cowork.

See docs/WORKFLOW_GENERAL.md for the full workflow reference.

---

## Documentation Index

| File | Purpose |
|------|---------|
| docs/CLAUDE_CONTEXT.md | Legacy master context (Chat sessions) |
| docs/COMPUTATIONAL_MODEL.md | Three-layer architecture, full piece vocabulary |
| docs/TEACHING_PROGRESSION.md | Sector-by-sector teaching arc |
| docs/LEVEL_DESIGN_FRAMEWORK.md | Seven-step level design sequence |
| docs/PIECE_CREATION_STANDARD.md | New piece checklist |
| docs/NARRATIVE.md | Full story bible, COGS dialogue, breadcrumbs |
| docs/DIALOGUE_SYSTEM.md | Post-level COGS discipline dialogue |
| docs/BOUNTY_SYSTEM.md | Daily challenge architecture |
| docs/DEVENV.md | CI/CD pipeline, Expo/EAS config |
| docs/WORKFLOW_GENERAL.md | Cowork + Code workflow principles |
| docs/WORKFLOW_AXIOM.md | Axiom-specific workflow reference |

---

## How to Start a New Task

1. Read this file
2. Check /project-docs/BRIEFS/ for a brief from Cowork
3. If a brief exists, read it and follow its instructions
4. If no brief, ask Tucker what is needed
5. Read any referenced docs (COMPUTATIONAL_MODEL, NARRATIVE, etc.)
6. Explore codebase first — do not start coding yet
7. Write a plan and confirm with Tucker before implementing
8. Implement, test, lint, typecheck
9. Run QUALITY GATES — all four must pass
10. Commit with appropriate prefix
11. If blocked, write to /project-docs/REPORTS/ and stop

---

## What NOT To Do

- Do not start coding without reading this file
- Do not change COGS dialogue without Tucker approval
- Do not change any UI copy without Tucker approval
- Do not break the CI pipeline
- Do not use emojis anywhere
- Do not introduce a second currency
- Do not make Free Build available before story mode completion
- Do not allow daily challenges before Axiom sector complete
- Do not use fixed CELL_SIZE
- Do not add HUD chrome to personal screens
- Long press always returns piece to tray directly. No ghost/held state.
- Do not show wire connections on non-Axiom levels
- Do not show placement highlights on non-Axiom levels
