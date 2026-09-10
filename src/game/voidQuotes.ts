// The mechanical-fallback void quotes shown on the void-failure modal.
// REQ-G-08 (Handoff 003): part 1 fixes the reroll bug by drawing the index
// once, in failureHandlers.handleVoidFailure, rather than in
// GameplayModals' render path. Part 2 (replacing this five-item array with
// the full DIALOGUE_SYSTEM.md void matrix, selected on discipline x
// behavior x phase) is BLOCKED on a separate 004 handoff — out of scope
// here. Lives in its own module, not GameplayModals.tsx, so the pure
// engagement-layer failure handler can draw from it without importing a
// React Native component tree.
export const VOID_QUOTES = [
  '"The signal did not reach Output. I observed the exact moment it failed."',
  '"Void state. I could explain why. You should already know."',
  '"The machine did not lock. Review your connections."',
  '"Signal lost. The configuration was incorrect. Adjust and retry."',
];
