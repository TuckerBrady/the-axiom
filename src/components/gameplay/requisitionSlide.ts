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
