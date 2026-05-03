# Cowork + Code Workflow — General Reference
### Universal Principles | Version 1.0 | April 2026

---

## TL;DR — The Core Loop

```
COWORK (CEO / Coordinator)  <->  YOU  <->  CODE (Executor)
```

Cowork handles all planning, integration, and documentation. Code handles all execution. You are the handoff between them.

---

## Part 1: What Each Tool Actually Is

### Cowork — Your Primary Planning Tool

Cowork is not a chatbot. It is an agentic workspace with read/write access to a local folder you select on your machine, a sandboxed Linux shell for running scripts and code locally, and native MCP connectors to your real tools (Figma, Jira, Confluence, Smartsheet, Outlook, Teams, SharePoint, Chrome).

Think of it as a chief of staff who can open your actual apps, read your actual files, write to your actual project folder, and hand off structured work to Code.

Why it replaces Chat: Chat can reason and plan, but it cannot touch any of your tools, cannot write to files, and forgets everything between sessions. Cowork does all of that.

### Claude Code — Your Execution Engine

The only tool in the suite with full local filesystem access and real git/GitHub integration. It reads your project files, writes code, runs tests, commits, and creates PRs. Sessions are fully persistent — stored as JSONL files in `~/.claude/projects/` and resumable anytime.

Code does not have your MCP connectors. It cannot read Figma or create Jira tickets without you manually setting those up in it. That is Cowork's job.

### Claude Chat — Limited Role

Chat has no filesystem access, no MCP connectors, no persistence, and no GitHub. The only edge case where Chat still makes sense is a completely detached brainstorm with zero connection to your actual project, or a Chat Project with GitHub sync for long-running reference context. For everything else, open Cowork.

---

## Part 2: Connected Tools in Cowork

### Figma
- Read any Figma file or frame by URL — design context, properties, layout, components
- Take a visual screenshot of any frame
- Read design system variables (colors, typography, spacing tokens)
- Search across design system for specific components
- Generate Code Connect mappings (links Figma components to actual code components)
- Read FigJam boards

### Jira + Confluence
- Create, edit, and transition Jira issues
- Search issues by JQL
- Add comments and worklogs to issues
- Link issues to each other
- Create and update Confluence pages
- Search Confluence by CQL

### Smartsheet
- Browse workspaces and folders
- Read, create, and update sheets and rows
- Add comments and discussions
- Search across Smartsheet
- Create sheets from templates

### Outlook + Teams + SharePoint
- Search Outlook email and calendar
- Search Teams chat messages
- Find meeting availability
- Read and search SharePoint files

### Claude in Chrome
- Navigate to any URL and take screenshots
- Read text content of any page
- Find and interact with elements
- Read browser console logs and network requests
- Execute JavaScript in the browser
- Upload files via browser
- Create GIFs of browser interactions

---

## Part 3: The File Sharing System

There is no native context sharing between Cowork and Code. Your project folder is the bridge.

### Recommended Structure

```
/your-repo
+-- /project-docs                  <-- BRIDGE FOLDER (Cowork writes, Code reads)
|   +-- DECISIONS.md               <-- Architecture decisions log
|   +-- /SPECS                     <-- Feature specs (one file per feature)
|   +-- /BRIEFS                    <-- Agent briefs (Cowork writes prompts for Code)
|   +-- /REPORTS                   <-- Code writes blockers/status here
+-- CLAUDE.md                      <-- Code's persistent memory (CRITICAL)
+-- CLAUDE.local.md                <-- Your personal Code overrides (.gitignore this)
+-- .claude/
|   +-- agents/                    <-- Code's subagent team
+-- /src
+-- ...
```

### The Handoff Motion

1. Cowork writes a spec to `/project-docs/SPECS/feature.md`
2. You tell Code: "Read `/project-docs/SPECS/feature.md` and implement it"
3. Code hits a decision point and writes to `/project-docs/REPORTS/feature-blocker.md`
4. You bring that blocker to Cowork: "Read the blocker at [path] and make a decision"
5. Cowork updates the spec and you loop Code back in

---

## Part 4: CLAUDE.md — Code's Persistent Memory

Code reads this file automatically at the start of every session. Without it, you re-explain your project every time.

### Template

```markdown
# Project: [Your App Name]

## Stack
- Platform: [platform]
- Language: [language]
- State management: [library]
- Auth: [library/approach]
- API: REST / GraphQL

## Project Structure
- /src/components — reusable UI components
- /src/screens — screen-level components
- /src/services — API calls
- /project-docs — specs and briefs from Cowork (READ THESE before implementing)

## Key Commands
- [build command]
- [test command]
- [lint command]

## Definition of Done
Every feature is done when:
1. Code is implemented and matches the spec in /project-docs/SPECS/
2. Tests written and passing
3. Lint clean
4. Build compiles without warnings

## Decisions Already Made (Don't Revisit)
- [locked decisions]

## Common Gotchas
- [things that have bitten you before]
```

File locations:
- `./CLAUDE.md` — commit to git (shared with team)
- `./CLAUDE.local.md` — personal overrides, add to `.gitignore`
- `~/.claude/CLAUDE.md` — global settings across all projects

---

## Part 5: Code's Subagent Team

Define specialized subagents in `.claude/agents/` with their own system prompts. Code will auto-delegate to these based on the task.

### Template

```markdown
---
name: [agent-name]
description: [When to use this agent]
tools: Read, Edit, Write, Bash
---
[Instructions for the agent's behavior and quality gates]
```

---

## Part 6: Full Feature Workflow — Idea to PR

1. **Context Gathering (Cowork):** Search email, Teams, Jira for existing decisions
2. **Spec Writing (Cowork):** Read Figma, write structured spec to /project-docs/SPECS/
3. **Ticket Creation (Cowork):** Create Jira story from spec
4. **Agent Brief (Cowork):** Write Code's instructions to /project-docs/BRIEFS/
5. **Execute (Code):** Read brief, explore codebase, plan, implement, test, commit
6. **Visual Verification (Cowork + Chrome):** Compare staging against Figma
7. **PR (Code):** Create PR with description from spec
8. **Close the Loop (Cowork):** Transition Jira, update tracker

### Lightweight Variant (Small Features / Bug Fixes)

Not every change needs the full ceremony. For small fixes: skip steps 1, 3, 6, 8. Write a brief directly, have Code execute, create PR.

### Spec Amendment Process

When Code discovers the spec is wrong mid-implementation:
1. Code writes to `/project-docs/REPORTS/feature-blocker.md`
2. You bring the blocker to Cowork
3. Cowork updates the spec with the decision
4. You loop Code back in with the updated spec

---

## Part 6B: Branching, QA, and Build Workflow

All code changes go through feature branches, a QA gate, and a build approval process before reaching TestFlight. The authoritative reference for this workflow is:

**`/project-docs/SPECS/branching-and-qa-strategy.md`**

The short version: branch per feature, QA gate before merge, crash report before investigation, build approval before `eas build`. No exceptions to any of these. Read the spec for the full process.

This changes step 5 of the handoff motion in Part 3 and step 5 of the full workflow in Part 6. Code now creates a feature branch instead of committing to master. Merge to master happens only after QA sign-off.

---

## Part 7: Context Management Rules

Context windows degrade as they fill. Keep sessions clean.

**In Cowork:** One session = one feature or one topic. Write decisions to files immediately. Start a new session for the next feature.

**In Code:** Use `/clear` between unrelated tasks. Use subagents for exploration. Keep sessions scoped. Resume a specific session with `claude --resume`.

**Rule of thumb:** If the AI is getting confused or inconsistent, the context window is probably full. Clear it and start fresh. You keep all file changes — you only lose conversation history.

---

## Part 8: Current Limitations

- No native context sharing between Cowork and Code. The `/project-docs` folder is the workaround.
- Cowork's shell is sandboxed. It cannot push to GitHub or run simulators directly.
- Cowork sessions are not fully persistent. Write decisions to files.
- Code's subagents are session-scoped, not truly parallel.
- Chrome automation works on web — not on native mobile simulators.
- Agent Teams (true multi-session Code coordination) is experimental.

---

## Part 9: One-Time Setup Checklist

- [ ] Select your project folder in Cowork
- [ ] Create `/project-docs/SPECS/`, `/BRIEFS/`, `/REPORTS/` folders
- [ ] Create `DECISIONS.md` in `/project-docs/`
- [ ] Write `CLAUDE.md` in repo root
- [ ] Add `CLAUDE.local.md` to `.gitignore`
- [ ] Create `.claude/agents/` with subagents for your stack
- [ ] Set up test/lint commands in `CLAUDE.md`
- [ ] Verify connectors work (Figma, Jira, Chrome)
- [ ] Default to Cowork for all work sessions
