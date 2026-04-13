# The Axiom — Cowork + Code Workflow
### Project-Specific Operating Manual | Version 1.0 | April 2026

For general principles, see docs/WORKFLOW_GENERAL.md.
This document is the Axiom-specific implementation.

---

## The Core Loop for The Axiom

```
COWORK (planning, specs, narrative, Code prompts)
   |
   v
Tucker pastes prompt into Code
   |
   v
CODE (implementation, tests, git, CI)
   |
   v
/project-docs/REPORTS/  (if blocked)
   |
   v
COWORK (resolves blocker, updates spec)
```

Tucker is the handoff between Cowork and Code.

What gets saved to files:
- /project-docs/SPECS/ — decision records and feature specs (persist)
- /project-docs/REPORTS/ — blocker reports from Code (persist until resolved)

What does NOT get saved to files:
- Code prompts. Cowork writes them in chat. Tucker copies and pastes
  into Code. Saving prompts as briefs wastes repo space and context
  window. Once a prompt is executed, it is done.

Code prompt delivery format:
- Always write as a single plain-text code block (no markdown
  formatting, no bold, no headers, no bullet styling)
- Tucker copies the block and pastes it directly into Code
- If it is not in a code block, it is harder to copy

Cowork codebase investigation:
- When the project folder is mounted, Cowork can read the repo
  directly and investigate code itself
- When Cowork does not have direct access, it writes a grep/search
  script as a code block prompt. Tucker pastes it into Code, Code
  runs it, Tucker reports the output back to Cowork

---

## Cowork's Role on The Axiom

Cowork is the planning layer. It handles:

- Reading Figma frames and writing feature specs
- Level design planning (computational goals, tape design, teaching progression)
- Narrative work (COGS dialogue, breadcrumbs, story beats)
- Writing Code prompts (delivered via chat, not saved as files)
- Resolving blockers Code writes to /project-docs/REPORTS/
- Visual QA via Chrome (comparing staging against Figma)
- Architecture decisions logged to /project-docs/DECISIONS.md
- Sprint planning and roadmap updates

Cowork always references:
- docs/COMPUTATIONAL_MODEL.md for piece behavior and three-layer architecture
- docs/TEACHING_PROGRESSION.md for sector teaching arcs
- docs/LEVEL_DESIGN_FRAMEWORK.md for level design rules
- docs/NARRATIVE.md for all story content and COGS voice
- docs/PIECE_CREATION_STANDARD.md for new piece requirements

---

## Code's Role on The Axiom

Code is the execution layer. It handles:

- React Native / Expo / TypeScript implementation
- Signal engine work (piece behavior, tape system, Data Trail)
- Screen building (following approved HTML prototypes in design/screens/)
- Writing and running tests
- Git commits and PRs
- CI pipeline maintenance

Code reads CLAUDE.md automatically every session and checks /project-docs/ for briefs.

### Code's Subagent Team

Four specialized agents in .claude/agents/:

| Agent | Use For |
|-------|---------|
| rn-dev | Default. Screen implementation, components, navigation, UI work |
| engine-dev | Signal engine, piece behavior, tape system, scoring, Data Trail |
| level-designer | New levels, tape design, tutorial steps, level retrofits |
| test-engineer | Unit tests, integration tests, E2E tests, debugging failures |

---

## Workflow by Task Type

### New Feature (Full Ceremony)

Example: building a new Kepler Belt level.

**Step 1 — Design (Cowork)**
```
"Read docs/LEVEL_DESIGN_FRAMEWORK.md and docs/TEACHING_PROGRESSION.md.
Design Kepler Belt level K1-3 following the seven-step sequence.
Computational goal: [rule]. New piece introduced: Inverter.
Write the full level spec to /project-docs/SPECS/K1-3-level.md."
```

**Step 2 — Brief (Cowork)**
```
"Write an agent brief for Code at /project-docs/BRIEFS/K1-3-brief.md.
Tell Code: read the spec at /project-docs/SPECS/K1-3-level.md,
use the level-designer subagent for the level definition and
engine-dev for any engine changes, then rn-dev for UI.
Include: level definition in levels.ts, tutorial steps,
tray assignment, test cases. Definition of done: all quality
gates pass, level is solvable with optimal and alternative
approaches."
```

**Step 3 — Execute (Code)**
```
Read /project-docs/BRIEFS/K1-3-brief.md and implement.
Explore codebase first. Plan before coding.
Run quality gates before pushing.
If blocked, write to /project-docs/REPORTS/K1-3-blocker.md.
```

**Step 4 — Verify (Cowork + Chrome)**
```
"Navigate to localhost:8081 in Chrome, play through level K1-3,
take screenshots at each step. Verify: piece behavior matches
COMPUTATIONAL_MODEL.md, tape produces correct output, tutorial
steps fire in order, scoring calculates correctly."
```

**Step 5 — Ship (Code)**
Create PR with description from spec. Commit prefix: feat.

### New Piece (Full Ceremony)

Must follow docs/PIECE_CREATION_STANDARD.md. No exceptions.

**Cowork:** Write piece spec covering engine behavior, icon design
notes, animation description, Codex entry text, COGS note, and
tutorial step text. All text tagged [PROPOSED] until Tucker approves.

**Code:** Implement using engine-dev for engine cases and ports,
rn-dev for PieceIcon SVG and animations, test-engineer for test
cases. Checklist in PIECE_CREATION_STANDARD.md must be 100% before PR.

### Bug Fix (Lightweight)

Skip Cowork for simple bugs. Go directly to Code:
```
"Bug: [description]. Reproduce: [steps]. Fix it. Run quality gates."
```

For complex bugs, have Cowork investigate first:
```
"Read the console logs at [URL] via Chrome. Check the signal
engine behavior for [piece type]. Write a diagnosis to
/project-docs/REPORTS/bug-diagnosis.md with root cause and
recommended fix."
```

### Narrative / Dialogue Work

Always goes through Cowork. Code never writes COGS dialogue.

```
"Read docs/NARRATIVE.md. Write COGS dialogue for Kepler Belt
levels K1-1 through K1-5. Follow the voice rules: dry, precise,
reluctantly warm. Tag all lines [PROPOSED]. Write to
/project-docs/SPECS/kepler-dialogue.md."
```

Tucker reviews and approves. Then Code implements the approved text.

### Sprint Planning

```
"Read docs/CLAUDE_CONTEXT.md for current state. Read the
known issues and queued items. Plan Sprint 18 with scope,
priority order, and estimated complexity. Write to
/project-docs/SPECS/sprint-18-plan.md."
```

---

## Cowork Prompt Patterns for The Axiom

### Level Design
```
"Design [sector] level [ID] following docs/LEVEL_DESIGN_FRAMEWORK.md.
Computational goal: [one sentence rule].
New piece: [piece name or none].
Write full spec to /project-docs/SPECS/[level-id]-level.md."
```

### Piece Design
```
"Design a new piece called [name] following docs/PIECE_CREATION_STANDARD.md
and docs/COMPUTATIONAL_MODEL.md. Category: Physics/Protocol.
Write full spec including engine behavior, icon description,
animation, Codex entry, and COGS note to
/project-docs/SPECS/[piece-name]-piece.md."
```

### Narrative Review
```
"Read docs/NARRATIVE.md Part [N]. Review for consistency with
the established voice rules and breadcrumb map. Flag any issues.
Write review to /project-docs/REPORTS/narrative-review.md."
```

### Figma to Spec
```
"Read the Figma frame at [URL]. Write a screen spec to
/project-docs/SPECS/[screen-name].md. Include: component list,
layout rules, states, animations, edge cases."
```

### Visual QA
```
"Navigate to localhost:8081 in Chrome. Play through [level/flow].
Screenshot each step. Compare against Figma at [URL] and the
approved HTML prototype in design/screens/. List discrepancies."
```

### Blocker Resolution
```
"Read the blocker at /project-docs/REPORTS/[name]-blocker.md.
Make a decision based on docs/COMPUTATIONAL_MODEL.md and
docs/NARRATIVE.md. Update the spec at /project-docs/SPECS/[name].md
with the resolution."
```

---

## Context Management for The Axiom

### Cowork Sessions
- One session per feature or sprint planning cycle
- Write all decisions to /project-docs/DECISIONS.md immediately
- Start fresh for each new feature — do not continue old sessions

### Code Sessions
- One session per feature or bug
- Resume with `claude --resume` for continuity on the same feature
- Use `/clear` between unrelated tasks
- Subagents handle exploration to keep main context clean
- Keep CLAUDE.md current at the end of each sprint

### The Documentation Index
Code and Cowork both reference the same docs/ folder. Keep it
current. Update docs/CLAUDE_CONTEXT.md at the end of each sprint
with what was built, what changed, and what is next.

---

## One-Time Setup Checklist

- [x] Project folder selected in Cowork (C:\Users\tucka\Repos\TheTinkerer)
- [x] /project-docs/SPECS/, /BRIEFS/, /REPORTS/ created
- [x] CLAUDE.md written in repo root
- [x] .claude/agents/ created with rn-dev, engine-dev, level-designer, test-engineer
- [x] docs/WORKFLOW_GENERAL.md saved (general principles)
- [x] docs/WORKFLOW_AXIOM.md saved (this file)
- [ ] Add CLAUDE.local.md to .gitignore
- [ ] Create /project-docs/DECISIONS.md — start logging architecture choices
- [ ] Verify Figma connector works (test: read any Figma URL)
- [ ] Verify Chrome works (test: navigate to localhost:8081, screenshot)
- [ ] Update docs/CLAUDE_CONTEXT.md to reference new workflow system

---

## Transition Notes

The existing docs/CLAUDE_CONTEXT.md was built for Chat + Code sessions.
It remains the authoritative reference for game state, mechanics, and
design principles. CLAUDE.md in the repo root is the new fast-start
for Code sessions. The two files complement each other:

- CLAUDE.md: what Code needs to start working (stack, commands, rules, gotchas)
- CLAUDE_CONTEXT.md: deep reference (build state, level details, sprint history)

Do not delete CLAUDE_CONTEXT.md. Continue updating it at sprint boundaries.
