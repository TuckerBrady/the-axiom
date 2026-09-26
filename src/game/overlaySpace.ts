// Tutorial spotlight space (Tucker, build 48). measureInWindow is not the
// overlay's coordinate space on every platform: on edge-to-edge Android the
// status bar sits between them. Measuring the overlay root with the same call
// and subtracting its origin cancels that gap wherever it exists.

export type OverlayLayout = { x: number; y: number; width: number; height: number };

export function toOverlaySpace(
  layout: OverlayLayout,
  origin: { x: number; y: number },
): OverlayLayout {
  return { x: layout.x - origin.x, y: layout.y - origin.y, width: layout.width, height: layout.height };
}
