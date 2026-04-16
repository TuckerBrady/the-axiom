---
description: Read and execute the latest Cowork-drafted prompt
---

Read `cowork-prompts/RECENT.md` and execute its instructions exactly as written. That is the active brief.

When work is complete (SUCCESS, BLOCKER, or NO-OP), you MUST write `cowork-prompts/LAST_REPORT.md` in TWO PASSES so the key facts (Status, SHA, quality gates) always land on disk even if the detail pass gets truncated. Also print the report in chat as you normally would.

The complete final file shape:

````markdown
# LAST REPORT — {prompt title}

**Status:** {SUCCESS | BLOCKER | NO-OP}
**Final commit SHA:** {sha or "unchanged"}
**Base commit:** {sha before work started}
**Timestamp:** {ISO 8601 UTC}

## Quality gates
- `npx expo lint` — {PASS | FAIL}
- `npx tsc --noEmit` — {PASS | FAIL}
- `npm test` — {PASS | FAIL} ({X/Y})
- `npm audit --audit-level=high` — {PASS | FAIL}

## Investigation findings
- {what Code verified before editing}

## Creative interpretation calls
- {judgment calls where the spec allowed multiple paths}

## Test coverage
- {added / updated tests}

## Blockers
- {none | description}
````

**Pass 1 — skeleton (write this IMMEDIATELY after the four quality gates finish, before generating any long-form analysis).**

Use the Write tool to create `cowork-prompts/LAST_REPORT.md` containing ONLY the top of the template: the `# LAST REPORT — ...` title, the four header bullets (Status / Final commit SHA / Base commit / Timestamp), and the `## Quality gates` block with the four `PASS | FAIL` lines filled in. Stop there. Do NOT include the four detail sections yet. This pass is short and must always land in full.

**Pass 2 — detail (append after the skeleton is on disk).**

Use the Edit tool to append the four remaining sections to the same file: `## Investigation findings`, `## Creative interpretation calls`, `## Test coverage`, `## Blockers`. Append them as a single Edit that replaces the trailing newline of the skeleton with the four-section block, so the file ends up containing exactly the full template above. If budget runs out partway through this pass, the Status/SHA/quality gates from Pass 1 are already on disk.

Always overwrite — never append a second report. Do not create numbered history files. The file lives under `cowork-prompts/` which is gitignored, so it will not be committed.
