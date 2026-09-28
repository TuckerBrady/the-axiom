// SWEEP-B51 S5 (AXM-040): what Android BACK does inside a level.
//
// BACK never leaves a level. With nothing open it opens PAUSE; inside PAUSE it
// steps back one layer (the abandon confirm first, then PAUSE itself). While a
// result, failure or out-of-lives overlay is up it does nothing: those screens
// own their exits. Abandoning stays the explicit CONFIRM ABANDON path.

export type GameplayBackAction = 'openPause' | 'closeAbandonConfirm' | 'closePause' | 'consume';

export function resolveGameplayBack(s: {
  pauseOpen: boolean;
  abandonConfirmOpen: boolean;
  blockingOverlayOpen: boolean;
}): GameplayBackAction {
  if (s.blockingOverlayOpen) return 'consume';
  if (s.pauseOpen && s.abandonConfirmOpen) return 'closeAbandonConfirm';
  if (s.pauseOpen) return 'closePause';
  return 'openPause';
}
