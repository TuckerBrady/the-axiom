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

**Last completed sprint:** Sprint 19 (Non-linear redesign, Daily Challenge tapes, bible compliance). Most recent commit: c580529.

**What is live and working:**

- Config Node redesign: configValue (0/1) per piece, tap
  cycles value, amber state-driven color (dim at 0, amber at 1),
  0/1 badge bottom-right, engine uses configValue not condition
  function, CONFIGURATION header removed from gameplay.
- Non-linear board layouts for all 8 Axiom levels: ports inset
  from edges, zigzag paths, vertical/L/Z-shape routing.
- Template fields (computationalGoal, conceptTaught, etc.) on
  all 8 Axiom levels and all 10 Kepler levels.
- Dashed connection lines on all levels (not just tutorial).
  Placement highlights on tutorial levels only.
- Daily Challenge tape generation for tape-interacting pieces.
  Deterministic (seeded RNG). Difficulty-scaled tape lengths.
- 10 Kepler Belt levels fully implemented with Latch, Merger,
  Bridge. Consequence levels at K1-4, K1-8, K1-10.
- Tap-to-rotate limited to Conveyor only (plumber model).
  Config Node tap cycles configValue. Latch tap toggles
  latchMode. All other pieces: no tap action.
- Piece sandbox in dev tools (Settings > PIECE SANDBOX).
- Dev mode lives disabled.
- Design bible complete: Three documentation files establish
  the full computational vision for The Axiom.
  COMPUTATIONAL_MODEL.md — three-layer architecture, complete
  piece vocabulary with CS concept mappings, 20 pieces total
  including Navigator (Legendary) and Resonator.
  TEACHING_PROGRESSION.md — sector-by-sector teaching arc,
  narrative and mechanic integration principles, tape visibility
  progression by sector.
  LEVEL_DESIGN_FRAMEWORK.md — seven-step design sequence,
  quality checklist, retrofit guidance for A1-5 through A1-8,
  four-step tutorial pattern (instructor, collector interrupts,
  Codex, instructor resumes), sector-specific design notes.
  All level design going forward follows this framework.
- Sprint 17C: Five new pieces added (Kepler Belt, not yet assigned to
  any level): Merger (Physics), Bridge (Physics), Inverter (Protocol),
  Counter (Protocol), Latch (Protocol). All have engine cases
  (success + failure paths), rotation-aware input/output ports,
  PieceIcon SVGs, animation props (merging, bridging, inverting,
  counting, latching + latchMode), and full Codex entries in both
  CodexDetailView and CodexScreen. Tutorial steps and tray
  assignments deferred until Kepler Belt levels are built.
- Sprint 17C: Piece creation standard published at
  docs/PIECE_CREATION_STANDARD.md. Required checklist for every new
  piece — engine, icon, animations, Codex entry, tutorial, gameplay
  integration, COGS voice sign-off. No piece ships without it.
- Sprint 17B: Piece interaction animation system. Every piece animates
  when the beam passes through. PieceIcon props: charging (inputPort,
  280ms), locking (outputPort, 400ms), rolling (conveyor, 180ms),
  spinning (gear, 400ms), splitting (splitter, 160ms), scanning
  (scanner, 200ms), gating + gateResult (configNode, 240ms),
  transmitting (transmitter, 150ms). Failure states: void beam death
  with red head transition + red X, Config Node block with red gate
  flash + rings, wrong output tape comparison with bit-by-bit
  mismatch highlight. activeAnimations Map drives all prop passing
  from GameplayScreen to PieceIcon.
- Sprint 17A: Turing machine tape system. Levels define
  inputTape: number[] and expectedOutput: number[]. Engine fires
  N pulses (one per tape bit). Scanner reads inputTape[pulseIndex],
  Transmitter writes outputTape[pulseIndex], Config Node gates on
  the current tape bit. After all pulses, outputTape compared to
  expectedOutput — match = lock, mismatch = wrong output failure
  state. Tape UI renders above board: input tape with head
  indicator, output tape filling as Transmitter writes; pulse
  counter shows during execution. Tape-enabled levels: A1-5, A1-6,
  A1-7, A1-8. Levels without inputTape run as single pulse —
  unchanged.
- Sprint 17A: Input Port / Output Port rename. Formerly Source node
  and Output node. All piece type string references updated across
  11 files: 'source' → 'inputPort', 'output' → 'outputPort'
  everywhere in engine, types, levels, stores, screens, and
  components. Codex IDs, names, and field simulations all updated.
- Sprint 16B: Segmented beam color system. Purple for source/output
  (data layer), amber for Physics pieces (conveyor/gear/splitter), blue
  for Protocol pieces (scanner/configNode/transmitter), green for lock,
  red for void. Trail segments retain their color showing the signal's
  history. CFG activation panel z-index fix. Board portal measurement
  retry on stale layout. Tutorial targetRef audit for A1-4 and A1-5.


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
- Rotation: tap a placed Conveyor to rotate 90 degrees
  clockwise. Only the Conveyor rotates on tap -- it is the
  only directional piece (the plumber model). Config Node
  tap cycles configValue. Latch tap toggles latchMode. All
  other pieces: no tap action.
- Long press 500ms: returns a placed piece directly to the
  tray. No ghost/held state. To reposition a piece, return
  it to tray and place it again.
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
- 35 automated tests passing (unit + integration).
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
- HUD tutorial overlay system: spotlight targeting, live demo
  panels, Codex entry slide-up reveal with pixel dissolve,
  back/forward navigation, AsyncStorage step persistence.
  AsyncStorage keys: axiom_tutorial_step_${levelId},
  axiom_tutorial_complete_${levelId},
  axiom_tutorial_skipped_${levelId}.
  Tutorial steps defined for all 8 Axiom levels. New piece
  introductions: Gear (A1-2), Config Node (A1-3), Splitter (A1-4),
  Scanner (A1-5), Transmitter (A1-7). Board strategy steps on
  A1-6 and A1-8.
  Sprint 10: orb morph system replaces spotlight. COGS orb flies
  between targets, morphs into portal square on arrival, collapses
  back to orb on advance. Callout floats near portal. Minimal nav
  strip. Demo ball positions fixed across all 5 piece types.
  Sprint 11: DEV TOOLS panel in SettingsScreen (dev builds only):
  Reset Tutorial Progress (24 AsyncStorage keys), Reset Level
  Progress (all completion/star keys), Force Show Tutorial
  (axiom_tutorial_force_show key), Level Jump (navigate to any
  level dossier directly).
- CI/CD pipeline: GitHub Actions, all green. ESLint zero warnings, TypeScript zero errors, 35 tests passing.

**Known issues / in-flight:**

- HUD tutorial system complete across all 8 Axiom levels (A1-1
  through A1-8). Full PieceSimulation parity in CodexDetailView.
- Wrong output results modal not yet implemented. Sprint 17B
  triggers existing void/fail state as a placeholder.
- Daily Challenge tape generation added — verify all template
  categories produce correct tapes.
- Ship damage mechanic: wear tracking implemented, structural
  damage blocked on Tucker design decisions (see blocker report).

**Queued for next sprint (On the horizon):**

- Kepler Belt level design and build (Sector 1, 10 levels)
- Assign Merger, Bridge, Inverter, Counter, Latch to Kepler Belt
  levels and write tutorial steps for each
- Wrong output results modal implementation
- Gameplay canvas rendering bug fix
- Tutorial system improvements (Tucker has ideas — next session)
- Complete narrative document review (Parts One, Four–Ten)
- MVP launch prep

---

## GAME MECHANICS REFERENCE

### Piece Types

| Piece | Category | Cost | Behaviour |
|-------|----------|------|-----------|
| Conveyor | Physics | 5 CR | Single input/output. Directional. Straight only. |
| Gear | Physics | 10 CR | Omnidirectional. The bend and corner piece. |
| Splitter | Physics | 15 CR | One input, two outputs. |
| Config Node | Protocol | 25 CR | Reads Data Trail at its position. Gates signal when Data Trail value matches configured value (0 or 1). Tap to cycle configValue. Amber state-driven: dim when 0, amber when 1. |
| Scanner | Protocol | 30 CR | Reads Data Trail, sets Configuration value. |
| Transmitter | Protocol | 35 CR | Writes to Data Trail. |
| Navigator | Protocol | Legendary (Deep Void) | COGS-operated head controller. 3 modes: Single, Dual, Sync. |
| Resonator | Protocol | Pre-placed (The Cradle) | Pattern recognition, not player-placed. |

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

**Next sector to build:** Sector 1 Kepler Belt (10 levels planned).
The five new pieces from Sprint 17C — Merger, Bridge, Inverter,
Counter, Latch — are ready for Kepler Belt assignment. Tutorial
steps and tray inclusion deferred until those levels are designed.

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
| Unit and Integration Tests | 35 tests, 4 suites, zero regressions | YES |
| Security Audit | npm audit high severity | YES |
| EAS OTA Update | Ships JS changes to devices | On master merge |

Every Claude Code prompt must end with this block:

QUALITY GATES -- all must pass before pushing:
1. npx expo lint        -- zero warnings
2. npx tsc --noEmit     -- zero errors
3. npm test             -- all 35 tests green
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
   React Native implementation. All approved prototypes live in
   design/screens/ and are referenced directly in Claude Code
   implementation prompts.
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

NOTE: This project now uses a Cowork + Code workflow. Code sessions
should read CLAUDE.md (repo root) as the fast-start file and check
/project-docs/BRIEFS/ for briefs from Cowork before starting work.
See docs/WORKFLOW_AXIOM.md for the full operating manual and
docs/WORKFLOW_GENERAL.md for general principles.

1. Read CLAUDE.md (repo root) for the fast-start context.
2. Check /project-docs/BRIEFS/ for a brief from Cowork.
3. If a brief exists, read it and follow its instructions.
4. If no brief, read this file for deep context, then ask Tucker.
5. Read any referenced docs as needed:
   - docs/DEVENV.md for CI/CD and technical setup
   - docs/NARRATIVE.md for the complete story bible
   - docs/DIALOGUE_SYSTEM.md for post-level COGS dialogue
   - docs/BOUNTY_SYSTEM.md for daily challenge architecture
   - docs/COMPUTATIONAL_MODEL.md for piece catalog and three-layer architecture
   - docs/TEACHING_PROGRESSION.md for sector teaching arcs
   - docs/LEVEL_DESIGN_FRAMEWORK.md for level design sequence
6. All story content requires Tucker Brady sign-off before implementation.
7. Check GitHub Actions tab to confirm CI is green before adding work.
8. Explore codebase first. Do not start coding yet.
9. Write a plan and confirm with Tucker before implementing.
10. Implement, test, lint, typecheck.
11. Run QUALITY GATES -- all four must pass before pushing.
12. Commit with appropriate prefix.
13. If blocked, write to /project-docs/REPORTS/ and stop.
14. Update this file at the end of each sprint.

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
- Long press always returns piece to tray directly. There
  is no ghost/held state for placed pieces.
- Do not show wire connections on non-Axiom (Kepler+) levels
- Do not show placement highlights on non-Axiom levels


---

## CODEX ENTRIES — FULL REFERENCE

These are the canonical descriptions for all Codex
entries in The Axiom. Four sections: Pieces, Locations,
Entities, The Axiom. Writers and future Claude sessions
must use these as the source of truth for all lore,
copy, and narrative references.

---

### PIECES (8 unlocked, 10 classified)

**Conveyor**
The most fundamental component in the machine. Accepts
signal from one direction, outputs in the opposite.
Cannot change direction on its own — it carries, it does
not think. Named for the industrial belt systems that
inspired its design. The first piece any Engineer learns
to place.

**Gear**
The only Physics piece capable of changing signal
direction. Omnidirectional — accepts input from any
adjacent port and routes the signal outward. The corner
of every machine that bends. COGS has noted that most
Engineers underestimate how many problems a single
Gear solves.

**Splitter**
Accepts one input and produces two simultaneous outputs.
Used when the signal needs to reach multiple destinations
or when a chain must branch. Rarely optimal. Often
necessary.

**Source**
The origin point of every machine. Pre-placed on every
level. Cannot be moved. Radiates signal outward to any
adjacent connected piece when the machine engages. The
Engineer does not place the Source — they work from it.

**Output**
The destination. Pre-placed on every level. Cannot be
moved. When the signal reaches Output, the machine locks
and the circuit is complete. Everything the Engineer
builds is in service of this moment.

**Config Node**
The first Protocol piece most Engineers encounter. Does
not carry signal blindly — it reads the current
Configuration value and decides whether to pass or block.
A gate with a condition. The signal arrives. The
condition is checked. The gate opens or it does not.

**Scanner**
Reads the Data Trail at the current head position and
sets the Configuration value accordingly. The Scanner
is how the machine becomes aware of its own memory.
What it reads determines what happens next.

**Transmitter**
Writes a value to the Data Trail. Where the Scanner
reads, the Transmitter writes. Together they allow a
machine to change what it knows mid-execution. The most
powerful piece in the catalogue. Also the most dangerous
to misplace.

**Relay** [CLASSIFIED — unlocks Kepler Belt]
Holds signal for one execution cycle then releases it.
Used for timing coordination between parallel paths.

**Threshold Relay** [CLASSIFIED — unlocks Kepler Belt]
Passes signal when either input port is receiving.
Less demanding than the Confluence Node, more forgiving
than most Protocol pieces. Used when redundancy is the
point — two routes, one destination, either will do.
The Threshold Relay is how a machine survives a broken
path. COGS considers this practical. He does not
consider practical to be a compliment.

**Inverter** [CLASSIFIED — unlocks Kepler Belt]
Flips the Configuration value at the point of
evaluation. What reads as 1 becomes 0. What reads as
0 becomes 1. The machine's understanding of its own
state is reversed. Puzzles that include an Inverter
require the Engineer to reason backward — the solution
is often the opposite of the obvious approach.

**Amplifier** [CLASSIFIED — unlocks Nova Fringe]
Extends signal range across non-adjacent cells. Used
when the optimal path cannot be built with adjacent
pieces alone.

**Confluence Node** [CLASSIFIED — unlocks Nova Fringe]
Requires signal to arrive simultaneously from two
separate input ports before passing it forward. The
machine will not proceed on partial information.
Building toward a Confluence Node means designing two
complete paths that converge at exactly the right
moment. Most Engineers attempt this once with a single
path and learn immediately why that does not work.

**Junction** [CLASSIFIED — unlocks The Rift]
Four-way intersection piece. Signal passes through in
the direction it arrived unless redirected by an
adjacent Gear.

**Capacitor** [CLASSIFIED — unlocks The Rift]
Stores a Configuration value from one Scanner read and
holds it for a later Config Node check. Bridges the gap
between read and decision across a longer execution path.

**Divergence Gate** [CLASSIFIED — unlocks The Rift]
Passes signal when exactly one input is active. Not
zero. Not both. One. The most discriminating piece in
the Protocol catalogue. It opens for the unexpected
path and closes for the expected one. Engineers who
approach it with conventional routing logic will find
it uncooperative. COGS has described it as having
good taste.

**Sequencer** [CLASSIFIED — unlocks Deep Void]
Fires outputs in a defined order rather than
simultaneously. The most complex Physics piece.
Reserved for Deep Void.

---

### LOCATIONS (1/12 unlocked at game start)

**The Axiom**
A military scout vessel of unclear origin, acquired
through circumstances the ship logs do not fully
explain. Compact, durable, and built for long-range
independent operation. Eight critical systems were
offline when the Engineer came aboard. The ship has
been operational in varying states of repair ever
since. COGS came with it.

**Andros Cluster**
The star system where The Axiom's journey begins.
Coordinates 47.2N, 183.5E. A mid-density cluster with
established trade and relay infrastructure. Not
frontier space — but not safe either. The Axiom
passed through here once before, under different
command.

**Kepler Station**
A colonial relay station in the Kepler Belt.
Population: several hundred. The station council
requested assistance restoring power infrastructure
damaged in an unlogged incident. They were told help
was coming. They waited longer than expected.

**Kepler Belt**
An asteroid field threaded with relay stations, mining
platforms, and the kind of infrastructure that keeps
distant colonies connected to the core. Not dangerous
by reputation. Dangerous in practice to anyone flying
without current charts.

**Nova Fringe**
A stellar nursery on the outer boundary of charted
space. Plasma storms make navigation unreliable. The
researchers who come here do so because the phenomena
cannot be observed anywhere else. The Axiom has no
official reason to be in this sector. It came anyway.

**The Rift**
A dimensional anomaly zone. Long-range sensors produce
readings that do not correspond to known physical
phenomena. Signal degradation is standard. Signals
that should not exist are occasionally detected. The
3.4 seconds of data COGS recovered before system
failure came from somewhere in this sector.

**Deep Void**
Uncharted space beyond the Rift. No relay
infrastructure. No registered vessels. No record of
prior survey. What brought The Axiom here is a
question the ship logs answer only partially. What
is waiting here is a question they do not answer
at all.

**Colony Vessel Perseverance**
A long-haul colony vessel in transit through Nova
Fringe. Mid-journey. Unable to stop. The crew has
been in transit long enough that morale is a
maintenance item. They reached out for assistance
with a routing problem because they had no other
options. COGS found their operational discipline
adequate. This is high praise.

**Outer Belt Station — Unregistered**
Coordinates verified. Registration: none. The
structure is real. The people inside it have chosen
not to be on any official record. This is not
unusual in the outer belt. It does not make it
comfortable.

**Andros Cluster Authority**
The regional governing body for the Andros Cluster.
They communicate through official channels when they
need something done quietly. When they contacted
The Axiom directly it was not a small job. COGS ran
a background check. The results were inconclusive
in ways that were themselves informative.

**Automated Beacon — Deep Void Approach**
No crew. No registration. Broadcasting a distress
signal and a reward offer simultaneously. An
automated system with credits to offer is either a
trap or something stranger. COGS has not determined
which. The investigation is ongoing.

**The Previous Engineer's Last Known Position**
A set of coordinates that appear in fragments across
three separate sectors. Not a place. A trail.
Something was here, or someone was here, and whatever
happened left marks in the data that COGS has been
quietly assembling for longer than he has mentioned.

---

### ENTITIES (2/8 unlocked at game start)

**C.O.G.S Unit 7**
Designation: Cooperative Operations and Guidance
System, Unit 7. Acquired with the vessel under
circumstances the purchase record does not fully
explain. Operational role: AI companion, navigator,
systems analyst, and the only crew member who has
been aboard The Axiom continuously since before the
Engineer arrived. His assessment of most situations
is accurate. His commentary on them is offered
regardless of whether it was requested. He has never
confirmed how long he was running before the Engineer
came aboard. He has not denied the question either.

**The Engineer**
Designation assigned by COGS on first activation.
Not chosen. Not negotiable. The Engineer came aboard
The Axiom, found eight systems offline, and started
fixing them. Whether this was the plan or an
improvisation is unclear. What is clear is that the
ship is more operational than it was, the Axiom's
systems remember every repair, and COGS has begun
adjusting his probability estimates upward.

**The Kepler Station Council**
The governing body of Kepler Station. Pragmatic,
under-resourced, and experienced enough to know that
waiting for official assistance means not getting it.
They reached out to The Axiom because the Engineer's
reputation — such as it is this early — suggested a
faster solution than the alternatives. Their
relationship with The Axiom improved or deteriorated
depending on how the Kepler sector was resolved.

**Dr. Yael Orin**
A plasma physicist stationed in Nova Fringe studying
stellar formation phenomena that cannot be observed
anywhere closer to the core. Legitimate credentials.
Published work. The kind of researcher who stays in
dangerous places because the science requires it.
She contacted The Axiom with a routing problem she
could not solve locally. COGS described her
credentials as adequate. This is high praise.

**The Previous Engineer**
No name in any accessible record. A designation only
— the same designation, in fact, that COGS assigned
to the current Engineer on day one. The Axiom was
under their command before it was not. The logs from
that period are incomplete in ways that feel
deliberate. COGS references this period rarely and
precisely. What happened to the previous Engineer is
the question underneath every other question in
Deep Void.

**Pirate Vessel — Unidentified**
Vessel profile matched to an unregistered craft
operating in Nova Fringe. Known to board and extract.
Known to leave. What they took from The Axiom, how
much it cost, and whether COGS has a plan about it
are all matters of record. The exact credit amount
is logged. COGS has not stopped thinking about it.

**Kepler Belt Colonists**
Not a single entity — a population. Several hundred
people living in relay stations and mining platforms
across the belt, dependent on infrastructure they
did not build and cannot fully repair. They trusted
that someone would come when the power grid failed.
That trust was either validated or exhausted
depending on how the Kepler sector ended.

**Signal — Unidentified Origin**
Not a person. Not a vessel. A 3.4-second transmission
detected in The Rift before COGS's memory systems
took damage. Content: partially recovered. Origin:
unknown. The Codex entry for this exists but most of
it is redacted. COGS wrote the redactions himself.
He has not explained why he remembers more than
he logged.

---

### THE AXIOM — VESSEL RECORDS (1/6 unlocked)

**Vessel Overview**
A military scout ship of compact design, built for
extended independent operation in low-support
environments. Eight primary systems. One AI unit.
Crew complement: one, currently. The ship was
acquired through channels that the acquisition
record describes as standard and that COGS describes
as unusual. Both statements appear to be true.

**Ship Systems — Repair Log**
A running record of every system the Engineer has
restored and the order in which they were repaired.
Emergency power first. Bridge systems last. The log
does not record what condition the ship was in
before the Engineer arrived, only what it became
afterward. COGS maintains a parallel log. The two
records do not always agree on timestamps.

**The AX-MOD Port**
A retrofitted connection port on COGS's chest unit
that was not part of the original C.O.G.S
manufacturing specification. The modification is
professional-grade. The origin is unlogged. COGS
acknowledges its existence and declines to explain
it. It is compatible with hardware that should not
exist yet.

**Navigation History**
A partial record of where The Axiom has been.
Partial because some entries are missing. Not
corrupted — missing. The gaps correspond to periods
before the current Engineer's tenure. COGS has the
coordinates. He has not volunteered them. He has
not denied having them.

**Previous Crew Record**
One entry. One designation: The Engineer. No name.
Service dates: incomplete. Departure record: absent.
What the previous Engineer built, repaired, and left
behind is scattered across four sectors in fragments.
The Axiom remembers them in the way ships remember
— in the wear on the panels, in the modifications
no one ordered, in the AI that came with the ship
and has never fully explained why it stayed.

**The Axiom's Mission**
Officially: unassigned. The ship has no standing
orders from any authority. No contract. No employer.
What the Engineer does with it is the Engineer's
decision. COGS has opinions about this. He expresses
them by providing information the Engineer did not
ask for and withholding assessments until they are
useful. Whether The Axiom has a purpose beyond what
the Engineer gives it is the kind of question COGS
considers unanswerable and therefore interesting.

## Sprint 12A — DistressScreen & RepairScreen redesign
DistressScreen and RepairScreen redesigned for emergency tone.
Approved Distress copy wired verbatim (three transmissions +
"PROCEED TO REPAIR BAY" final action). Repair help text removed,
COGS directive "Connect the relay. Source to Output." added.
Both screens: added HUD corner brackets (blue #00D4FF, 0.28),
integrity bar with 1.2s pulse via RN Animated (useNativeDriver:
false). RepairScreen: progress dots removed, board/tray/engage
updated to current game visual standards using PieceIcon
(source/output/conveyor). No navigation or interaction logic
changes.

## Sprint 12B — Onboarding polish (6 screens)
CodexEntryScreen now wraps CodexDetailView with the approved
Conveyor entry (no bespoke 4-card layout). IntroductionScreen,
CharacterNameScreen, DisciplineScreen, LoginScreen updated to
current design standards: cyan HUD brackets on all four corners
(#00D4FF/0.28, zIndex 20), card bg rgba(6,9,18,0.95) border
rgba(0,212,255,0.12), body text 14/300/#B0CCE8 italic. Login
house/pentagon icon replaced with inline simplified Axiom ship
SVG (viewBox 0 0 200 100, hull/command/sensor-wing/engine
polygons). DisciplineScreen COGS response card uses
state="engaged" and amber CONFIRM DISCIPLINE button with corner
bracket accents. CharacterNameScreen designation reveal section
preserved unchanged; only input-state chrome updated. DistressScreen
header restyled (red #FF3B3B 10px) with 1px rgba(255,59,59,0.15)
separator line. No copy or navigation changes.

## Sprint 13 — Pause modal, timer, gesture/orb fixes, onboarding cleanup
Pause modal with RESUME / RESTART / ABANDON MISSION (life cost
+ confirmation). Elapsed timer in gameplay header (MM:SS) and
pause modal — starts on level mount, pauses with modal, stops
on engage; elapsedSeconds piped into calculateScore for the
Speed Bonus category (new optional param, defaults to engage
duration for backward compat). Swipe-down gesture disabled on
GameplayScreen (gestureEnabled: false). Orb measurement now
uses 120ms delayed measure() for boardGrid/engageButton/tray
refs (sourceNode/outputNode still direct). CodexEntryScreen
removed from onboarding navigator — RepairScreen navigates
directly to Introduction. A1-1 Conveyor tutorial line updated.
Decryption bar increment-driven (40ms / +3.5..9.5) ~1.6s.
Pixel dissolve batches 100 cells / 20ms ~320ms.

## Sprint 14 — Signal beam animation + piece color polish
Full three-phase signal animation system replaces the old
discrete signalDot. CHARGE (280ms expanding rings at source)
→ BEAM (rAF-driven path traversal with trail polyline,
white-core head, easeOut3, speed scales to path length with
reference CELL_SIZE*4, clamped 300-1200ms) → LOCK (two
expanding rings from output, 200ms staggered, then full
path/wires lit green). Multi-pulse support: pulse count =
number of source-typed steps in executionSteps, with 80ms
gaps and source re-flash between. Per-piece special anims:
gear spin (400ms), scanner sweep (200ms vertical line),
transmitter wave pulse (150ms in-out). Wire keys use
`${fromId}_${toId}` convention (both directions stored in
litWires). Every piece icon now has distinctive secondary
accents that survive the board's primary color override.

## Sprint 17 — Tape system, piece animations, new pieces (commit 15b68cc)
17A: Source/Output renamed to Input Port / Output Port across 11
files. Turing tape system added — levels can declare inputTape and
expectedOutput; engine runs N pulses threading pulseIndex through
Scanner / Transmitter / Config Node. Tape UI rendered above the
board with head indicator and pulse counter. A1-5..A1-8 converted
to tape-driven levels.
17B: Per-piece interaction animations driven by activeAnimations
Map in GameplayScreen. Props on PieceIcon: charging, locking,
rolling, spinning, splitting, scanning, gating + gateResult,
transmitting. Failure states: void beam death (red head + X),
Config Node block flash, wrong-output bit-by-bit mismatch.
17C: Five new pieces — Merger, Bridge, Inverter, Counter, Latch.
Engine cases, rotation-aware ports, PieceIcon SVGs, animation
props (merging, bridging, inverting, counting, latching +
latchMode), Codex entries in both CodexDetailView and CodexScreen.
docs/PIECE_CREATION_STANDARD.md published as the authoritative
checklist for every new piece. New pieces intentionally NOT yet
added to any level tray or tutorial — deferred until Kepler Belt
levels are built. Also fixed legacy `config_node` Codex IDs to
the canonical `configNode`.
