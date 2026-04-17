---
description: Read and execute the latest Cowork-drafted prompt
---

Read `cowork-prompts/RECENT.md` and execute its instructions exactly as written. That is the active brief.

When work is complete (SUCCESS, BLOCKER, or NO-OP), you MUST write `cowork-prompts/LAST_REPORT.md` with this structure:

```
# LAST REPORT — Prompt NN — Title

**Status:** SUCCESS | BLOCKER | NO-OP
**Build:** v0.9.{buildNumber} (run `node scripts/write-build-info.js` to get current number)
**Final commit SHA:** {sha}
**Base commit:** {sha}
**Timestamp:** {ISO timestamp}

## Quality gates
- `npx expo lint` — PASS | FAIL
- `npx tsc --noEmit` — PASS | FAIL
- `npm test` — PASS (N/N) | FAIL
- `npm audit --audit-level=high` — PASS | FAIL

## Investigation findings
{What you found in the codebase before making changes}

## Creative interpretation calls
{Any decisions you made that were not explicitly specified}

## Test coverage
{Tests added or updated, or why none were needed}

## Blockers
{Any issues that need Cowork/Tucker attention, or "None."}
```

The **Build** line is mandatory. Run `node scripts/write-build-info.js` and read the console output to get the current version number. This lets testers and Cowork reference the exact build.