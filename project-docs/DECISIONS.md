# The Axiom -- Architecture Decisions Log

Record every significant decision here as it is made.
Format: date, decision, rationale, who decided.

---

## April 2026

### 2026-04-10: Adopted Cowork + Code workflow
Decision: Transitioned from Chat + Code to Cowork + Code as the primary development workflow. File-based handoff via /project-docs/ folder.
Rationale: Cowork has filesystem access, MCP connectors, and persistent tool integration that Chat lacks. The /project-docs bridge gives Code structured context without native context sharing.
Decided by: Tucker Brady

### 2026-04-10: Created CLAUDE.md for Code persistent memory
Decision: Added CLAUDE.md to repo root as Code's fast-start context file, complementing the existing docs/CLAUDE_CONTEXT.md.
Rationale: CLAUDE.md is read automatically by Code at session start. Keeps the most critical info (stack, commands, rules, gotchas) in one place. CLAUDE_CONTEXT.md remains the deep reference.
Decided by: Tucker Brady

### 2026-04-10: Created four Code subagents
Decision: Added rn-dev, engine-dev, level-designer, test-engineer to .claude/agents/.
Rationale: Specialized context for different task types. rn-dev for UI/screen work, engine-dev for signal engine and game logic, level-designer for level design, test-engineer for testing.
Decided by: Tucker Brady
