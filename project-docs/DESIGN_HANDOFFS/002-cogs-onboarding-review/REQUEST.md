# Request 002 — COGS Presentation + Initial Onboarding Review

Prepared for Claude Design. Repo: `TuckerBrady/the-axiom` @ `master`
(local dev name `TheTinkerer`).

## Ask

Read the initial onboarding sequence — boot through the first COGS meeting —
and the COGS character's current visual/interaction presentation across the
app. Produce the same kind of deliverable as Request 001
(`project-docs/DESIGN_HANDOFFS/001` — see
`project-docs/SPECS/design_handoff_axiom_ship_and_ui/`): a locked spec with
numbered findings, grounded in what's actually in the repo, plus `.dc.html`
visual references where a picture earns its place.

This is a review, not a blank-page redesign. Tell us where the onboarding
flow and COGS's presentation already work, and where they fight the design
bible or fail on-device. Don't invent new narrative beats or new screens
unless a finding requires one to fix a real problem.

## Scope

**Onboarding flow, in order** (`src/screens/onboarding/`):

1. `BootScreen.tsx` — boot sequence
2. `LoginScreen.tsx` — single "Begin" button, no auth (MVP decision, locked)
3. `IntroductionScreen.tsx`
4. `DistressScreen.tsx`
5. `CharacterNameScreen.tsx` — Engineer Reveal, three-beat sequence per
   `src/constants/onboardingCopy.ts`
6. `DisciplineScreen.tsx` — Systems Architect / Drive Engineer / Field
   Operative selection
7. `RepairScreen.tsx`
8. `CodexEntryScreen.tsx`

**COGS presentation, wherever it appears:**

- `src/components/CogsAvatar.tsx`
- `src/components/cogs/CogsRobotAvatar.tsx`
- `src/components/cogs/CogsHubCard.tsx`
- `src/constants/cogsAIOrbColors.ts` — eye-state color mapping
- `src/constants/disciplineReactions.ts`
- Any other component rendering COGS's eye, orb, or avatar state found along
  the way

**Required reading before forming findings:**

- `docs/NARRATIVE.md` — full story bible. COGS's characterization (Part Two)
  and his eye-state table are load-bearing; do not propose anything that
  contradicts them.
- `docs/DIALOGUE_SYSTEM.md` — post-level discipline dialogue system.
- `docs/TEACHING_PROGRESSION.md` — where onboarding sits in the sector-by-
  sector arc; the onboarding flow's job is to seed the Physics/Protocol
  distinction the Kepler Belt gate later depends on.
- `CLAUDE.md` at repo root, especially: Design Principles (never violate),
  COGS Character Reference, Y2K aesthetic lock, tape color lock.

## What's already decided — do not relitigate

- Player is always "The Engineer." Never "you." Never a chosen name before
  Deep Void — see `docs/NARRATIVE.md` Part Two for exactly when and why that
  changes.
- COGS eye states: blue = operations, amber = engagement, green = warmth,
  red = damage, dark = offline. This mapping is locked; a finding may say the
  *rendering* of a state is wrong, never propose a different state set.
- Single "Begin" button on LoginScreen, no auth for MVP — locked.
- Button-driven UI. Explicit Confirm press only, no implicit advance.
- Animations are cinematic: 0.6s cubic-bezier minimum on screen transitions.
- Y2K aesthetic (N64 Funtastic, iMac G3, Game Boy Color) — locked palette
  family, same as Request 001's UI Kit.
- HUD chrome (corner brackets) belongs on tactical/operational screens only —
  never on personal/narrative screens. Onboarding is narrative; findings
  should reflect that, not add HUD chrome to it.

## What we want back

Same shape as Request 001:

1. A `REVIEW.md` (or similarly named locked spec) — numbered findings, each
   with: observed behavior, why it's a problem (reference the doc bible or a
   concrete on-device failure, not taste), the specific change, and how to
   verify the fix.
2. `.dc.html` visual references as needed — actual onboarding screens at true
   device sizes, COGS avatar/orb states side by side, whatever makes a
   finding legible. Note fidelity per element (hi-fi exact values vs. lo-fi
   blueprint) the same way Request 001 did.
3. A short README indexing the bundle and giving a priority order, with the
   repo files each finding touches.

## Explicitly out of scope

- **No new COGS dialogue.** Not one line. Flag places where existing lines
  feel like they're carrying too much (or too little) visual weight; don't
  write replacements.
- **No new player-facing copy.** Same rule as Request 001 — Design Principle
  2 requires Tucker's sign-off on any text change, and that authority isn't
  delegated here.
- **No new screens** unless a finding identifies a real functional gap (e.g.,
  a state the onboarding flow can reach with nothing rendered for it) — not
  as a nice-to-have.
- Don't touch anything already settled by Request 001 (ship canon, piece/HUD
  color roles, type scale) — reference those tokens as ground truth, don't
  re-derive them.

## Context Tucker gave directly

Tucker is looking at this because he wants a second, focused pass on first
impressions — the sequence a brand-new player sees before they've built
anything — now that Request 001 has settled the game's visual language. If
COGS's introduction or the discipline choice undersells the character or the
stakes established in `docs/NARRATIVE.md`, that's exactly the kind of finding
this request is for.
