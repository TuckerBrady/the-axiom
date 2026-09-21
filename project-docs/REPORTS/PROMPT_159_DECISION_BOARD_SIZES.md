# Decision needed — the three candidate board sizes

> **CLOSED 2026-09-20.** Tucker named the three sizes:
>
> | Name | Columns × Rows |
> |------|----------------|
> | S    | 8 × 6          |
> | M    | 10 × 7         |
> | L    | 10 × 9         |
>
> They are wired as the default `--sizes` set in
> `BOARD_SIZE_STANDARD` (`src/utils/boardSizeOverride.ts`) and remain
> overridable from the command line. The sweep that photographs them has
> been run — on **Android**, not iOS — and the nine images are committed
> under `project-docs/SHOTS/board-size-standard/`. See
> `PROMPT_159_REPORT.md` for the run and the read on which size wins where.
>
> Everything below is the original write-up, kept for the reasoning.

**Raised by:** PROMPT_159 / AXM-011 · **Date:** 2026-09-20 · **Status:** CLOSED 2026-09-20

---

## The question

PROMPT_159 task 3 asks for "the same level, shot at all three proposed sizes on all three
devices". The prompt describes the standard as "three sizes, never wider than ten columns" but
never names the three.

The design canvas the prompt points at —
`https://claude.ai/artifact/SAzDSZG8yjz9SuRwAGJSV9` — is not shared with the session that built
the harness, so the values could not be read from it.

PROMPT_159 closes with: "If a decision shows up that is not covered above, stop and write it to
`project-docs/REPORTS/` rather than picking for yourself." So this is written up rather than
chosen.

## Why it was not guessed

The two obvious guesses both fail:

- **Guess from the shipped default.** `GameplayScreen` falls back to 8×7, so 8×7 / 9×8 / 10×9
  looks like a natural ladder. But it is a ladder invented on this branch, and once it is in a
  chip row and a report it starts being cited as the standard.
- **Guess from the ten-column cap.** "Never wider than ten" fixes the top of the range and says
  nothing about the other two.

A sweep that shoots the wrong three sizes is worse than one that refuses to start: nine images get
produced, reviewed, and argued from, and the decision they were supposed to inform quietly gets
made by whoever picked the sizes.

## What was built instead

Nothing defaults. Everything is parameterised.

- **The runner has no default `--sizes`.** A run whose flow set includes the board-size sweep and
  which is given no `--sizes` is refused by name, with the reason. The check is
  `requireSizesForBoardSweep` in `src/shots/plan.ts`, and it is unit tested.
- **The dev Settings control exposes the whole legal range** — 3 to 10 columns, 3 to 12 rows —
  rather than three chips. A three-chip row would bake the undecided standard into a settings
  screen.
- **`MAX_BOARD_COLUMNS = 10`** in `src/utils/boardSizeOverride.ts` is the one thing the prompt did
  settle, so the parser enforces it: `11x9` is rejected at the argument layer.

Any three sizes inside those bounds can be swept the moment they are named. No code change is
needed — only the `--sizes` value.

## What is needed to close this

*(Answered above on 2026-09-20.)*

A single line naming the three candidate sizes as `<columns>x<rows>`, from the design canvas or
from Tucker directly. For example:

```
npm run shots -- --label board-size-standard \
                 --flows ".maestro/flows/shots/board-size-sweep.yaml" \
                 --sizes 8x7,9x8,10x9 \
                 --level <id>
```

Once the sizes are known and a macOS host is available, the sweep produces the nine images that
decide the standard, which then get committed once under
`project-docs/SHOTS/board-size-standard/`.

## Related

- `project-docs/REPORTS/PROMPT_159_REPORT.md` — the full build report, including why no run
  happened.
