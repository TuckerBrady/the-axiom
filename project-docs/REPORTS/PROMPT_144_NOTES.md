# PROMPT_144 NOTES — A1-7 output-tape-intro

## PROPOSED COGS copy — Tucker sign-off required

A new tutorial step `output-tape-intro` was added to `levelA1_7.tutorialSteps`
(between `transmitter-reveal` and `transmitter-teach`) in `src/game/levels.ts`.

The COGS message is the copy proposed in the prompt, used verbatim:

> "This is the output tape. The Transmitter writes here — one cell per pulse,
> left to right. What the machine produces becomes visible the moment it
> produces it."

**Status: PROPOSED.** This wording must receive Tucker sign-off before any
TestFlight build surfaces it to players. No grammar/continuity issue was
found that required altering the proposed wording, so it ships as written
pending approval.

## Continuity check

- Style matches A1-5's `input-tape-intro` / `data-trail-intro` (standalone
  tape-concept intro fired after the relevant piece is named).
- `eyeState: 'blue'` (operations) is consistent with the other tape-intro
  beats and the surrounding A1-7 steps.
- Render-gating confirmed per prompt Scope section: A1-7's `availablePieces`
  includes `'transmitter'`, so `hasOutTape` is true from mount and the OUT
  row renders before this step fires. No blocker; `TutorialHUDOverlay.tsx`
  and `GameplayScreen.tsx` untouched.
