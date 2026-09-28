// AXM-036 P3 — pure constants for the Requisition store's slide motion.
//
// Extracted so the mount-in entrance, the handle collapse/expand, and the
// confirm slide-out (all in RequisitionPanel.tsx) share one source of truth
// for distance, duration, and curve instead of repeating magic numbers.
// The confirm slide-out's values are unchanged from before this package —
// they are only re-expressed through these exports (contract P3-4).

// Distance (dp) the panel travels off-screen on confirm, and the distance
// it starts from before easing in to 0 on mount.
export const REQ_SLIDE_DISTANCE = 600;

// Duration (ms) shared by every slide in this file: mount-in, expand,
// collapse, and confirm slide-out.
export const REQ_SLIDE_MS = 600;

// Ease-out curve used when something is arriving/opening: mount-in and
// handle-expand.
export const REQ_SLIDE_IN_BEZIER: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Ease-in curve used when something is leaving/closing: handle-collapse
// and the confirm slide-out.
export const REQ_SLIDE_OUT_BEZIER: [number, number, number, number] = [0.4, 0, 1, 0.6];

// SWEEP-B51 S8: the store's swipe gesture. A vertical drag is claimed once
// it passes REQ_SWIPE_START (dp); on release it expands or collapses the
// panel when it travelled at least REQ_SWIPE_THRESHOLD (dp) the right way.
export const REQ_SWIPE_START = 8;
export const REQ_SWIPE_THRESHOLD = 40;

// The expanded state a released swipe asks for, or null for no change.
// Collapsed + up swipe expands; expanded + down swipe collapses; a short or
// wrong-way swipe does nothing.
export function resolveReqSwipe(expanded: boolean, dy: number): boolean | null {
  if (!expanded && dy <= -REQ_SWIPE_THRESHOLD) return true;
  if (expanded && dy >= REQ_SWIPE_THRESHOLD) return false;
  return null;
}
