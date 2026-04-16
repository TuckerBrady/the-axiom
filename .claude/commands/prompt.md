---
description: Read and execute the latest Cowork-drafted prompt
---

Read the file at `cowork-prompts/RECENT.md` and execute its instructions exactly as written. That file is the active prompt drafted and approved by Cowork/Tucker for the current task. Treat it as the full task brief — follow its investigation, task, acceptance criteria, quality gates, and commit/push instructions.

## Final report

After completing the task — whether you finished successfully (after pushing), stopped on a blocker, or only partially completed it — do BOTH of the following:

1. Print the final report in chat as you normally would.
2. Use the Write tool to overwrite `cowork-prompts/LAST_REPORT.md` with the same report, formatted using the exact template below. Always overwrite; never append. Do not create numbered history files. The file lives under `cowork-prompts/` which is gitignored, so it will not be committed.

Use this exact structure so Cowork can parse it predictably:

```markdown
# LAST REPORT — {Prompt title, copied from RECENT.md H1}

**Status:** {one of: SUCCESS / BLOCKED / PARTIAL}
**Final commit SHA:** {SHA if pushed, otherwise "not committed"}
**Base commit:** {starting SHA}
**Timestamp:** {ISO 8601 UTC, e.g. 2026-04-15T22:31:00Z}

## Investigation findings
{bullet list of what was discovered during pre-flight / investigation}

## Quality gates
- `npx expo lint` — {PASS / FAIL with detail}
- `npx tsc --noEmit` — {PASS / FAIL with detail}
- `npm test` — {PASS count/total with detail}
- `npm audit --audit-level=high` — {PASS / FAIL with detail}

## Creative interpretation calls
{any places the agent diverged from the letter of the prompt, with rationale. If none, write "None."}

## Test coverage
{tests added or updated, or "No production code touched, no tests added" if N/A}

## Blockers
{if status is BLOCKED or PARTIAL, describe what stopped work and what decision is needed. Otherwise write "None."}
```
