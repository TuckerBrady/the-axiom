# Tribal Knowledge — The Axiom

This document is required reading for every code task and every department session. It captures decisions, gotchas, and working-style preferences that are not derivable from the code or git history. If a fact in this document conflicts with what you observe in `src/`, the code is authoritative — but flag the divergence so this doc can be updated.

---

## Section 1 — How Tucker Operates

Tucker is the solo developer and creative director of The Axiom. He architects; the AI team executes. This shapes every interaction.

- **Architecture vs execution:** Tucker decides architecture. AI does git, branches, prompt drafting, repo verification, ops. If a step requires Tucker to type a command into a terminal, the prompt was wrong — restructure so the AI does it.
- **No PRs, no manual feature branches.** Solo dev, no reviewer, no merge gatekeeper. Worktree branches spawned by Dispatch's code tasks are fine and merge fast-forward to master. Manual feature branches outside that path are friction.
- **Mobile review.** Tucker reads from his phone. SVG attachments for design — inline widgets and HTML don't render. Decisions, not explanations.
- **Tone is load-bearing.** Every word of UI text, COGS dialogue, tutorial copy needs Tucker's explicit sign-off. Drafts must be flagged PROPOSED. Never lock copy without him.
- **Repeat-asks.** When Tucker says "I've asked N times," the prior prompt was too soft. Rewrite assertively — exact paths, hard constraints, "do NOT" clauses where ambiguity drifted.
- **Test target.** iPhone 15 Pro Max (390x844 viewport). Anything rendering-related needs to verify against this device.
- **EAS quota.** 15 iOS builds/month on free plan. Batch features, get approval before builds.

## Section 2 — Engine Gotchas

The shipped code has nuances that aren't obvious from reading. Knowing these saves a session 200 turns of rediscovery.

### Native-driver Animated.View parent-swap (SIGABRT pattern)

When an `Animated.Value` with `useNativeDriver: true` is consumed by an `Animated.View` whose host parent is swapped via conditional render, iOS raises SIGABRT. Two incidents have caused this: Prompt 93 (`portalOpacity`) and Build 19 (`88c0b99`, arc-wheel-tutorial). Canonical rule: `docs/ANIMATION_RULES.md` REQ-A-1..3. Single-host invariant is non-negotiable.

### Beam animation performance

- Three-phase: CHARGE / BEAM / LOCK. Locked.
- 31 instances of `useNativeDriver: false` across the codebase — every animation runs on JS thread. Root cause of perf lag on device.
- `PieceIcon` is NOT memoized. During beam animation, every `setState` re-renders all PieceIcon instances. Memoizing PieceIcon is estimated 40-50% FPS improvement.
- The tutorial overlay staying mounted during beam animation compounds lag (120ms `measureInWindow` calls racing setState updates).

### Config Node behavior

- Reads from the Data Trail, not the Input Tape. (Wrong assumption persisted for multiple sessions until "engine truth fix" in Prompt 55.)
- Always Protocol purple `#8B5CF6`. `configValue` (0/1) cycles on tap.
- Codex ID is `configNode` (camelCase), NOT `config_node` (snake_case).

### Scanner behavior

- Reads from Input Tape, writes to Data Trail.
- The Scanner-to-Trail animation leg was removed in Dev7 because the trail write happens in the engine, not as a visible Scanner action.
- Scanner bubble/spotlight should only show the tape-read interaction, not the trail-write.

### Transmitter behavior (canonical)

- Writes to its target tape cell the value carried by the activating signal pulse. NOT a "signal arrived" presence sensor — writes the *value*, including `0`.
- Canonical clause: `project-docs/SPECS/kepler-belt-levels-v2-part1.md` REQ-T-1..4.
- Cross-referenced from every Kepler level spec.
- The Output Port (Terminal) does NOT auto-write — Transmitter is the only piece that writes values to the Output Tape. Any level needing output values requires a Transmitter in the floor solve.

### Signal flow

- Protocol pieces execute straight-through only (enter left, exit right). Only Gears change direction.
- Enforced in Prompt 56A. Before that, protocol pieces were omnidirectional, which was wrong.

### Data Trail persistence

- Trail values persist across pulses within a single machine run. This is what makes the machine stateful.
- Trail cells initialize as `null` (not `0`) since Prompt 56B.
- The visual trail override resets to nulls every replay loop iteration. This is intentional for the visual display, but the engine trail carries forward.

### `expectedOutput` length mismatch

- Several Axiom levels have `expectedOutput` arrays shorter than `inputTape`. Writes beyond `expectedOutput.length` render via a `beyondRangeWrite` path. Works visually, brittle data model. A1-5 through A1-8 need tape retrofit per Level Design Framework.

### Null byte corruption

- Code's file writes occasionally leave trailing null bytes (hit 6 files in Prompt 75). Fix: a node script that strips null bytes from all `.ts`/`.tsx` files. Watch for this on large prompts.

## Section 3 — Locked Design Decisions

These are decisions that shape what the game IS. Do not propose changes without explicit Tucker discussion.

### Soul of the game

The joy is building elaborate, interesting machines — NOT finding the minimum solution. Scoring rewards complexity. Credits fund creativity through the Arc Wheel (formerly "tray"). Failure is the curriculum: build, fail, learn, invest, build better, succeed.

### Sectors

- **Axiom sector** = safe zone. 8 levels (A1-1 through A1-8). No lives, no penalties, no blown cells. Tutorials always award 3 stars.
- **Kepler Belt** = consequences. Damaged cells, REQUISITION store, scoring v2, credit economy, `requiredPieces` enforcement. 10 levels (K1-1 through K1-10).

### Y2K aesthetic (locked)

- Inspired by late 90s translucent tech: N64 Funtastic, iMac G3, Game Boy Color.
- Tape colors LOCKED:
  - IN tape: Ice Blue `#7FC8E8`
  - TRAIL tape: Atomic Purple `#A97FDB` (Game Boy Color)
  - OUT tape: Fire Orange `#FF7D3F` (iMac Tangerine)
- Engine-semantic colors stay unchanged: cyan for Scanner, green for pass, red for block, amber for Physics. Y2K palette wraps around them for UI chrome.

### COGS voice

- COGS Unit 7 is the in-game droid companion.
- Voice: dry, witty, reluctantly impressed. Never a cheerleader. Never "good job" unprompted. Uses "acceptable" the way others say "extraordinary."
- Eye states: blue=operations, amber=engagement, green=warmth, red=damage, dark=offline.
- In-level: COGS is an AI persona. Out-of-gameplay (Launch, Hub, Level Select): he's a droid character. NEVER use "AI companion" or "AI unit" in out-of-gameplay chrome.

### "The Engineer" naming

- Player is always "The Engineer."
- Never "you" in UI copy.
- Never the chosen name pre-Deep-Void reveal (one of two protected green-eye beats).
- Carveout: COGS dialogue addressing the Engineer directly *can* use "you." That's COGS speech-to-Engineer. UI chrome cannot.

### Auth strategy

- No auth for MVP. Single "Begin" button on LoginScreen.
- Real auth (Supabase anonymous + optional upgrade) deferred to v1.1.
- Decision made in Dev3.

### Scoring philosophy

- Replaced efficiency-based scoring (fewer pieces = better) with complexity-based (more pieces = better) in Dev2.
- Philosophy: "Rube Goldberg first, CS teaching second. More pieces = more fun."
- 3 stars at 75%+ tray usage, 2 stars at 50-74%, 1 star at <50%.

### No emojis

Anywhere. Not in UI, commits, comments, code, or any artifact produced for the project.

### Free-to-play guarantee

Every level solvable without spending real money.

## Section 4 — Working Practices

### Quality gates (non-negotiable)

Every commit before push:

```bash
npx expo lint                 # zero warnings
npx tsc --noEmit              # zero errors
npm test                      # all tests green
npm audit --audit-level=high  # clean
```

Coverage floors enforced in `jest.config.js`: 80% statements / 80% functions / 70% branches / 80% lines. Every commit touching `src/` must touch `__tests__/`.

### Test-driven development pipeline

Seven phases, locked order: Product → UX/UI → SE → Dev → QA → Final Review → User Acceptance. Tests before code, by someone other than the implementer. Test fails = code is wrong, not the test.

### Pre-TestFlight smoke

No `eas build` or `eas submit` runs without a passing smoke check on master HEAD. See `docs/PRE_TESTFLIGHT_CHECKLIST.md`.

### Cross-session communication

Cowork projects do not directly message each other. Cross-department traffic routes through Dispatch (runtime) or T-Bot (strategy/relay).

### Compression detection

If a session's context opens with "This session is being continued..." — stop. Recommend starting fresh. Re-read persona memory before proceeding. Personality is the first thing compression flattens.

### Handoff protocol

When a major deliverable lands or context approaches saturation, write a handoff. Decision-shaped, not explanation-shaped. Include a freshly-invented passphrase for the next session.

## Section 5 — Authoritative Sources

When this document and another document disagree, the more specific document wins:

- `CLAUDE.md` — locked decisions, what not to touch (overrides this doc on specifics)
- `docs/COMPUTATIONAL_MODEL.md` — three-layer architecture, piece vocabulary
- `docs/TEACHING_PROGRESSION.md` — sector-by-sector teaching arc
- `docs/LEVEL_DESIGN_FRAMEWORK.md` — seven-step level design sequence
- `docs/NARRATIVE.md` — story bible, COGS dialogue, breadcrumbs (overrides this doc on narrative/voice)
- `docs/PIECE_CREATION_STANDARD.md` — new piece checklist
- `docs/ANIMATION_RULES.md` — animation invariants (overrides this doc on animation)
- `docs/PRE_TESTFLIGHT_CHECKLIST.md` — smoke gate (QA-owned)
- `project-docs/SPECS/*` — formal SE specs (override this doc on level-specific behavior)

## Section 6 — Updates

This document accumulates. When a new gotcha surfaces or a decision lands, add it here. Keep entries tight; cross-reference detailed specs for the long-form. Compiled from Dev1-Dev7 transcripts originally; updated by T-Bot through curatorial maintenance after that.
