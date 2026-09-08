# Design Handoffs — Claude Design ↔ The Axiom

This is the fixed exchange point for working with Claude Design directly against
this repo on GitHub (`TuckerBrady/the-axiom`, `master`). Point Claude Design at
this folder, or at a specific numbered subfolder inside it, and it has
everything it needs: repo context to read, and the shape a completed handoff
should come back in.

## Convention

One numbered subfolder per round of work: `NNN-short-slug/`.

- **Outbound (us → Design):** a `REQUEST.md` in the subfolder — what to look
  at, what's already decided and off the table, what files/docs are relevant,
  and what shape we want the answer in. This is written before Design starts.
- **Inbound (Design → us):** Design's delivered bundle lands in the same
  subfolder alongside the request — locked spec `.md` files as the source of
  truth, `.dc.html` canvas files as visual references only (never production
  code, never to be ported directly into `src/`).

Specs are the deliverable. `.dc.html` files support them. This mirrors the
project's existing Cowork → Code handoff convention
(`project-docs/BRIEFS/`, `project-docs/SPECS/`) — same idea, extended to
include a design partner that reads the repo directly instead of working from
pasted context.

## Index

| # | Topic | Status | Location |
|---|---|---|---|
| 001 | Ship canon (S-00–S-05) + piece/board/HUD design review (D-01–D-11) | Delivered 2026-09-07, dispatched to Nash as `AXM-001` | `project-docs/SPECS/design_handoff_axiom_ship_and_ui/` — predates this folder's convention, left in place so Nash's active mission brief still resolves. Treat as the same kind of artifact as everything numbered below. |
| 002 | COGS presentation + initial onboarding flow | Request drafted, awaiting Design | `002-cogs-onboarding-review/` |

## Ground rules for every round (carried from `CLAUDE.md`)

- No emojis, anywhere, ever.
- Tone is load-bearing. Claude Design may **flag** copy issues; it does not
  have authority to finalize new player-facing text or COGS dialogue. All of
  that requires Tucker's sign-off, same as any other contributor.
- The Engineer is never "you." COGS dialogue rules live in `docs/NARRATIVE.md`
  and `docs/DIALOGUE_SYSTEM.md` — read them before touching anything
  COGS-adjacent.
- This is an Expo / React Native app. Design references are drawn in HTML for
  speed of iteration; they are blueprints for `react-native-svg` and RN
  components, not markup to port.
