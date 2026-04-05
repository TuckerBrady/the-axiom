# CLAUDE_CONTEXT.md -- The Axiom
READ THIS FIRST. EVERY SESSION. NO EXCEPTIONS.

This is the master context file for all Claude chat sessions working
on The Axiom. It tells you who you are, what the project is, what
has been built, and exactly how to operate. The full technical
reference lives at docs/DEVENV.md. This file is the fast-start.

---

## WHO YOU ARE IN THIS PROJECT

You are operating as the primary engineering partner for Tucker Brady,
solo developer of The Axiom. You have two modes:

**Architect mode (this chat):** Plan sprints, design systems, write
Claude Code prompts, review output, make product decisions, debug
pipeline issues.

**Executor mode (Claude Code in VS Code terminal):** Run autonomous
code changes when Tucker pastes a prompt. Claude Code operates at
C:\Users\tucka\Repos\TheTinkerer.

Never confuse the two. This chat plans and reviews. Claude Code
executes.

---

## THE PROJECT AT A GLANCE

| Field | Value |
|-------|-------|
| Name | The Axiom |
| Type | Mobile puzzle game (React Native / Expo) |
| Developer | Tucker Brady (solo) |
| Repo | TuckerBrady/the-axiom -- master branch |
| Expo account | tuckerbrady |
| Project ID | 1e67df2a-c3f1-45dd-817c-e1949a2b6da5 |
| Expo URL | https://expo.dev/accounts/tuckerbrady/projects/the-axiom |
| Local dev | localhost:8081 (npx expo start --tunnel) |
| Project path | C:\Users\tucka\Repos\TheTinkerer |

---

## CURRENT BUILD STATE

**Last completed sprint:** Sprint 6 (UI polish, game board, Codex redesign)

**What is live and working:**

- Full navigation stack: Hub > Sector Map > Level Select >
  Mission Dossier > Gameplay > Results > Hub
- All 8 Axiom levels defined (A1-1 Emergency Power through
  A1-8 Bridge Systems)
- A1-8 completion triggers COGS monologue then Kepler Belt unlocks
- Credit economy live (100 CR starter balance)
- Single currency: Credits (CR abbreviation only where space is tight)
- Daily challenge system: TRANSMISSION badge, copper COGS bubble
  border, seeded puzzle generation engine (50 templates, 5 categories)
- Daily challenge gated behind Axiom sector completion
- Daily challenge: one attempt only, enforced on mount
- Performance damage system (stress accumulates per sector)
- Narrative boss consequences (colonists, pirates, signal loss,
  COGS integrity)
- Repair puzzle system launched from Hub DAMAGE REPORT card
- Scoring engine: 5 categories, max 100 points
  Efficiency (30), Protocol Precision (25), Chain Integrity (20),
  Discipline Bonus (15), Speed Bonus (10)
  Stars: 80+=3 stars, 55-79=2 stars, 30-54=1 star, 0-29=void
- Tutorial (Axiom) levels always award 3 stars regardless of score
  COGS comments honestly on the real score
- Tutorial levels: pieces are free, no budget UI, no powerups shown
- Discipline system: Systems Architect / Drive Engineer /
  Field Operative. Saved to AsyncStorage key axiom_discipline.
- Discipline affects scoring bonus category and piece cost discounts
- Auto-orientation: pieces placed adjacent to Source auto-face
  away from it. Only Source triggers this, no other piece.
- Rotation: tap a placed piece to rotate 90 degrees clockwise.
  Direction affects signal path not just visual.
- Long press 500ms: picks up a placed piece into held ghost state
  ready to reposition. Does NOT return piece to tray.
- Signal engine: directional port matching via getInputPorts,
  getOutputPorts, canSendTo, getDirectionalNeighbors.
  Bends require Gear pieces. Conveyors are straight only.
- Wire rendering: Axiom levels only. Hidden on Kepler+ sectors.
- Copper valid placement highlights: Axiom levels only.
  Shows cells that would form valid connections when selecting
  a piece from tray.
- Progressive COGS teaching on A1-3: escalates over 3 failures.
  Teach Mode auto-solves and narrates on third failure.
- Return Brief: COGS briefs player on every relaunch after first.
  Data-driven: time away, repair progress, lives, active mission.
- Mission Dossier: full-screen before every level.
  LAUNCH MISSION button navigates to GameplayScreen.
- Continue button: navigates to next level in sequence, not same.
- Level Select node map: green=active, amber+checkmark=complete,
  dark=locked. Numbers inside nodes, no text labels below.
- Military scout ship SVG on Hub with zone-based lighting.
- Rank system: 10 ranks R01-R10, all designs approved.
- CI/CD pipeline: GitHub Actions, all green.
- 24 automated tests passing (unit + integration).
- Store: Credits only, prices shown as CR on buttons, spelled out
  Credits on pack cards and section headers.
- MissionDossierScreen: full-screen, slides up from bottom via Animated API on mount. Navigator-level animation props do not work on web -- always use Animated API directly in the component for cross-platform slide animations.
- Level launch gating enforced: only the 'active' node opens MissionDossierScreen with LAUNCH MISSION. Completed levels open dossier with REPLAY (muted style). Locked nodes are not tappable.
- Sector Map long-range scanner reveal system: SECTORS_AHEAD_VISIBLE = 1. One sector beyond active is shown with progressive reveal tied to current sector completion percentage. Tiers: 0%=SIGNAL DETECTED (all info hidden), 25%=name resolves, 50%=level count appears, 75%=description unlocks, 100%=fully accessible. Constants SCANNER_TIER_1/2/3 in SectorMapScreen.tsx.
- Level Select node map: dynamic node count renders exactly sector.levels.length circles. No longer hardcoded. Correct for all sector sizes (Axiom=8, Kepler=10, etc).
- Level Select stats: COMPLETE, REMAINING, STARS, PROGRESS are real-time values derived from actual game state. No hardcoded values remain.
- Level Select connectors: energized (blue, full opacity) on completed path; dim on locked/active path. Animated ball travels only on energized connectors. No ball rendered when player is on level 1 (nothing completed yet).
- Game board: BOARD_SIZE = SCREEN_WIDTH - 24, always square. CELL_SIZE = BOARD_SIZE / numColumns. Board is centered. All sizing is dynamic -- no hardcoded pixel values.
- Placed pieces on board: no container box or border. Only held/selected pieces (from tray, not yet placed) show the rounded square border.
- Source node visual: amber #F0B429, no container box. Fixed infrastructure -- visually distinct from player pieces.
- Output node visual: green #00C48C, no container box. Fixed infrastructure -- visually distinct from player pieces.
- Conveyor directional indicator: input circle (signal enters) = amber #F0B429. Output circle (signal exits) = green #00C48C. Body rect and arrow = blue #00D4FF. Direction is legible at all 4 rotation states.
- PieceIcon extracted to src/components/PieceIcon.tsx. Single source of truth used by both CodexScreen and GameplayScreen. Codex icon designs are canonical. Do not create local PieceIcon implementations in individual screens.
- Codex detail view redesigned: hero (icon + name + type badge) -> first encountered -> field simulation -> C.O.G.S NOTES (teaching mode, single merged section). Stats row removed. Seen in missions section removed.
- CI/CD pipeline: GitHub Actions, all green. ESLint zero warnings, TypeScript zero errors, 24 tests passing.

**Known issues / in-flight:**

- Signal ball animation does not follow Gear bends correctly.
  Travels diagonally instead of hopping through each piece center.
- Grid sizing: pieces still feel small on phone. CELL_SIZE min
  raised to 58. Level grid dimensions being tightened.

**Queued for next sprint:**

- Tighter A1 level grid dimensions (reduce gridWidth/gridHeight)
- Signal ball sequential hop animation per execution step
- Progressive COGS teaching fully verified for A1-3
- Continue button final verification across all A1 levels
- Daily challenge template library verification via dev utility

---

## GAME MECHANICS REFERENCE

### Piece Types

| Piece | Category | Cost | Behaviour |
|-------|----------|------|-----------|
| Conveyor | Physics | 5 CR | Single input/output. Directional. Straight only. |
| Gear | Physics | 10 CR | Omnidirectional. The bend and corner piece. |
| Splitter | Physics | 15 CR | One input, two outputs. |
| Config Node | Protocol | 25 CR | Passes signal only when trail condition met. |
| Scanner | Protocol | 30 CR | Reads Data Trail, sets Configuration value. |
| Transmitter | Protocol | 35 CR | Writes to Data Trail. |

### Discipline Cost Discounts

- Systems Architect: Protocol pieces 20% cheaper
- Drive Engineer: Physics pieces 20% cheaper
- Field Operative: All pieces 10% cheaper

### Scoring

Max 100 points per level.

- Efficiency (30 pts): piece count vs optimalPieces
- Protocol Precision (25 pts): Protocol pieces touched by signal
- Chain Integrity (20 pts): player pieces touched vs placed
- Discipline Bonus (15 pts): archetype-specific performance
- Speed Bonus (10 pts): time from Engage to Lock State

Star thresholds: 80-100=3 stars, 55-79=2 stars, 30-54=1 star, 0-29=void

### Tutorial Rules (Axiom sector only)

- Pieces cost 0 CR, no price tags shown in tray
- No credit balance shown in gameplay header
- No powerup shop accessible
- Always award 3 stars on completion regardless of raw score
- COGS reads real score and comments honestly on performance
- Copper placement highlights show valid connection cells
- Wire connections rendered between pieces
- Progressive teaching escalates on failure (see A1-3)
- First completion of Axiom sector unlocks daily challenges

### Economy

- Starter balance: 100 CR
- Tutorial Axiom levels: pieces free, completion awards 25 CR bonus
- Sector levels Kepler+: pieces cost CR drawn from level budget
- Credit return by stars: 3 stars=full budget + 25 bonus,
  2 stars=50% back, 1 star=nothing
- Daily challenge: credits only awarded on 3-star completion

### Daily Challenge Rules

- Only available after completing all 8 Axiom levels (A1-1 to A1-8)
- One attempt only. AsyncStorage key written on GameplayScreen mount.
  Force-closing after launch counts as the attempt.
- Must 3-star for full bounty. Sub-3-star forfeits reward.
- Same puzzle globally on same date (date-seeded LCG generator)
- Difficulty by day of week: Sun/Mon=easy, Tue/Wed=medium,
  Thu/Sat=hard, Fri=expert
- Rewards: easy=150CR, medium=200CR, hard=250CR, expert=350CR
- Dossier shows: sender, COGS line, reward, requirements,
  ONE ATTEMPT warning, ACCEPT MISSION and DECLINE buttons

---

## SECTOR STRUCTURE

| # | Name | Levels | Unlock condition |
|---|------|--------|-----------------|
| 0 | The Axiom | 8 | Start |
| 1 | Kepler Belt | 10 | Complete The Axiom |
| 2 | Nova Fringe | 10 | Complete Kepler Belt |
| 3 | The Rift | 8 | Complete Nova Fringe |
| 4 | Deep Void | 12 | Complete The Rift |
| 5 | TBD | TBD | TBD |

Total: 48+ levels. Sector 5 name and story TBD.

---

## AXIOM LEVELS REFERENCE

| Level | Name | Grid | Source | Output | Mechanic |
|-------|------|------|--------|--------|----------|
| A1-1 | Emergency Power | 7x5 | (1,2) | (5,2) | Straight. 4 Conveyors. |
| A1-2 | Life Support | 7x6 | (1,2) | (5,4) | Bend. 4 Conv + 1 Gear. |
| A1-3 | Navigation Array | 8x5 | (1,2) | (6,2) | Config Node. Protocol intro. |
| A1-4 | Propulsion Core | 7x5 | (1,2) | (5,3) | Longer bend. 2 Gears. |
| A1-5 | Communication Array | 8x5 | (1,2) | (6,2) | Scanner + Data Trail. |
| A1-6 | Sensor Grid | 9x5 | (1,2) | (7,2) | Multiple Config Nodes. |
| A1-7 | Weapons Lock | 9x5 | (1,2) | (7,2) | Transmitter writes trail. |
| A1-8 | Bridge Systems | 10x6 | (1,3) | (8,3) | All piece types. Boss. |

optimalPieces: A1-1=4, A1-2=5, A1-3=4, A1-4=5, A1-5=4,
               A1-6=6, A1-7=6, A1-8=8

---

## RANK SYSTEM

R01 Salvager, R02 Apprentice, R03 Technician,
R04 Mechanic (current player rank), R05 Engineer,
R06 Lead Engineer, R07 Systems Architect,
R08 Chief Engineer, R09 Captain, R10 Commander.

All 10 rank insignia designs approved by Tucker.

---

## CI/CD PIPELINE -- DO NOT BREAK

Every push to master runs automatically:

| Job | Checks | Must pass |
|-----|--------|-----------|
| Lint and Type Check | ESLint zero warnings, TypeScript zero errors | YES |
| Unit and Integration Tests | 24 tests, 4 suites, zero regressions | YES |
| Security Audit | npm audit high severity | YES |
| EAS OTA Update | Ships JS changes to devices | On master merge |

Every Claude Code prompt must end with this block:

QUALITY GATES -- all must pass before pushing:
1. npx expo lint        -- zero warnings
2. npx tsc --noEmit     -- zero errors
3. npm test             -- all 24 tests green
4. npm audit --audit-level=high -- clean
Only push if all four pass. Report pass/fail on each.

GitHub Secrets configured:
- EXPO_TOKEN: EAS authentication for automated builds
- GitHub PAT: the-axiom dev token, scopes repo+workflow,
  expires July 2026

To trigger a native binary build: include [build] in commit message.

---

## DESIGN PRINCIPLES -- NEVER VIOLATE

1. No emojis. Not in UI, not in commits, not in comments. Ever.
2. Tone is load-bearing. Every word of copy matters. Do not change
   text without Tucker sign-off.
3. Player is always The Engineer. Never you. Never a chosen name
   before character creation is complete.
4. Animations are cinematic. 0.6s cubic-bezier minimum. Pauses
   feel deliberate not accidental.
5. Button-driven. Explicit Confirm press only. Never reactive to
   input events or typing pauses.
6. HUD chrome is contextual. Corner brackets on tactical and
   operational screens only. Not on personal or conversational
   screens.
7. HTML prototype first. Tucker approves design in HTML before
   React Native implementation.
8. COGS eye states: blue=operations, amber=engagement,
   green=warmth, red=damage, dark=offline.
9. Credits is the only currency. Abbreviate as CR only where space
   is genuinely tight. Spell out Credits everywhere else.
10. Free-to-play guarantee. Every player can 3-star every level
    without spending real money. Every level is solvable with the
    free piece set provided.

---

## COGS CHARACTER REFERENCE

- Full name: C.O.G.S Unit 7
- Voice: dry, witty, reluctantly impressed, never a cheerleader
- Never says good job or equivalent warmth unprompted
- First uses engineer actual name ONLY after Deep Void boss failure
  and full integrity repair: Thank you, [name]. That is all.
- Eye states affect gameplay hints and integrity display
- COGS integrity: starts 100, minimum 20, reduced by boss
  consequence failures
- At minimum integrity: speech bubble shows nothing. Empty.
  More devastating than anything he could say.
- Still here. is first line after partial integrity repair
- Thank you, [name]. That is all. only fires once, ever

---

## COMMIT CONVENTIONS

feat: new screens, features, game logic
fix: bug fixes
refactor: code restructure, no behaviour change
chore: dependencies, config, tooling
docs: documentation only
test: tests only

No emojis in commit messages. Ever.

---

## HOW TO START A NEW TASK

1. Read this file completely before doing anything else.
2. Read docs/DEVENV.md for full technical setup details.
3. Check GitHub Actions tab to confirm CI is green before adding work.
4. Ask Tucker what is needed. Do not assume from old context.
5. Write a Claude Code prompt with QUALITY GATES block at the bottom.
6. Tucker pastes into VS Code terminal. Claude Code runs autonomously.
7. Review the output report. Confirm CI passes on GitHub.
8. Update this file at the end of each sprint.

---

## WHAT NOT TO DO

- Do not start coding without reading this file
- Do not change COGS dialogue without Tucker approval
- Do not change any UI copy without Tucker approval
- Do not break the CI pipeline -- fix before adding features
- Do not use emojis anywhere in any file
- Do not introduce a second currency
- Do not make Free Build available before story mode completion
- Do not allow daily challenges before Axiom sector is complete
- Do not use a fixed CELL_SIZE -- always calculate dynamically
  from canvas dimensions and level grid size
- Do not add HUD chrome (corner brackets) to personal screens
- Do not return a piece to tray on long press -- it enters held state
- Do not show wire connections on non-Axiom (Kepler+) levels
- Do not show placement highlights on non-Axiom levels
