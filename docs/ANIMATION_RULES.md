# Animation Rules — The Axiom

This document defines invariants that every animation in The Axiom MUST respect. It exists because the same anti-pattern has caused two separate hard crashes; canonical rules in the repo close the gap so a third occurrence is caught before merge.

## Required reading

Anyone editing files containing `Animated.View`, `Animated.Value`, or animation hooks MUST read this document first. Code review of any diff that touches an animation tree MUST include the grep check defined in REQ-A-3.

## Canonical clauses

### REQ-A-1 — Single-host invariant for native-driven values

An `Animated.Value` tracked by the native driver (`useNativeDriver: true`) MUST be consumed by exactly one `Animated.View` instance across the component's entire lifecycle. Swapping the host parent of a native-driven `Animated.View` between conditional render branches is prohibited.

### REQ-A-2 — Persistent host on state transitions

When a state transition (tutorial step change, modal open/close, sector swap, etc.) would unmount an `Animated.View` whose backing value is native-driven, the component MUST be refactored so the animated host is persistent (single parent across all branches) and only the children, opacity stops, or styles change.

### REQ-A-3 — Code review grep mandate

Code review of any diff that touches an `Animated.View` tree MUST include a grep for every `Animated.Value` declared in the file and MUST verify each native-driven value appears in exactly one `Animated.View` host across all conditional render branches.

The reviewer recites: "I grepped all Animated.Value usages in this file. Each native-driven value appears in exactly one host." If any native-driven value appears in more than one host, the diff is rejected pending refactor per REQ-A-2.

## Rationale

The native thread retains a binding to the original `Animated.View` host. When React unmounts that host and mounts a new one referencing the same `Animated.Value`, the native binding is orphaned and the new host has no native backing. iOS raises SIGABRT.

## Incident history

This pattern has caused two separate hard crashes in The Axiom:

1. **Prompt 93 (`portalOpacity`)** — first occurrence. Lesson captured as a code comment in `TutorialHUDOverlay.tsx` lines 445-449. The comment was visible to anyone reading that file but was not promoted to a canonical rule.

2. **Build 19 (`88c0b99`, arc-wheel-tutorial)** — second occurrence. The arc-wheel-tutorial commit introduced a ternary 200 lines below the existing comment and reintroduced the identical anti-pattern (`dimOpacity` host swap on `awaitPlacement` toggle). Crash on A1-1 step 5. Symptom-fixed in `96a4aba` (TutorialHUDOverlay restructure). Postmortem at `dispatch-queue/2026-05-01_BUILD-19-A1-1-incident-postmortem.md`.

The Build 19 incident is the reason this document exists. Tucker's framing: *"This was a total team failure. That is the true root cause, the symptom is the game crash."*

## Defenses now in place

Five layers of defense against a third occurrence:

1. **Canonical doc (this file)** — every code task reads it as part of `docs/`.
2. **Department project Instructions** — SE, QA, UX Cowork sessions all read this file at session start.
3. **SE pre-written integration tests** — `__tests__/integration/tutorialHUDOverlayTransitions.test.tsx` exercises step transitions across `awaitPlacement` boundaries.
4. **SE pre-written static check** — `__tests__/lint/nativeDriverHostUniqueness.test.ts` (or eslint rule equivalent) fails CI when any native-driven `Animated.Value` appears in multiple hosts.
5. **QA pre-TestFlight smoke** — every Axiom level walked through to step 5 minimum on iPhone 15 Pro Max before any `eas submit`. Reproducible crashes catch on smoke.

## Cross-reference

For the running incident log including both crashes plus other engine gotchas, see `docs/TRIBAL_KNOWLEDGE.md` (Engine Gotchas — Native-driver section).

## Updates

When a third native-driver pattern surfaces (or a new animation invariant becomes load-bearing), add a new REQ-A-N here. Increment the section, do not retire previous clauses without consensus across SE + Tucker. Cross-reference from any affected level specs.
