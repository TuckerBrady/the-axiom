---
description: Execute the latest prompt, then build and submit to TestFlight
---

This command does everything `/prompt` does, then kicks off an EAS TestFlight build and submits it to TestFlight.

> The `testflight` profile shows dev tools in Settings. For a real App Store submission, invoke `eas-cli --profile production` manually — do NOT alias `/build` to `production`.

## Phase 1: Execute the prompt

Read `cowork-prompts/RECENT.md` and execute its instructions exactly as written. Run all quality gates. Commit as specified.

If the prompt results in a BLOCKER or FAIL on any quality gate, STOP. Do not proceed to Phase 2. Write `cowork-prompts/LAST_REPORT.md` as normal with the blocker details.

## Phase 2: Build and submit

Only proceed here if Phase 1 completed with SUCCESS and all four quality gates passed.

1. Push the commit(s) to origin/master:
   ```
   git push origin master
   ```

2. Kick off the EAS TestFlight build:
   ```
   npx eas-cli build --platform ios --profile testflight --non-interactive
   ```
   If `eas-cli` is not installed, run `npm install -g eas-cli` first.

3. Wait for the build to complete. Check status with:
   ```
   npx eas-cli build:list --platform ios --limit 1
   ```

4. Once the build status is `finished`, submit to TestFlight:
   ```
   npx eas-cli submit --platform ios --latest --profile testflight --non-interactive
   ```

5. Report the build URL and submission status in LAST_REPORT.md.

## Report

When all phases are complete, write `cowork-prompts/LAST_REPORT.md` with the standard structure plus a TestFlight section:

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

## TestFlight
- **EAS Build URL:** {url}
- **Build status:** finished | failed
- **Submit status:** submitted | failed | skipped
- **TestFlight version:** {version}

## Blockers
{Any issues that need Cowork/Tucker attention, or "None."}
```

The **Build** line is mandatory. Run `node scripts/write-build-info.js` and read the console output to get the current version number.
