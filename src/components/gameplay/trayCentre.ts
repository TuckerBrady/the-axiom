// AXM-020 (PROMPT_161) — centre-select tray. The tray snaps each item under
// a fixed centre frame, and the item in the frame is the piece in hand. The
// geometry and the "which item holds the frame" rules live here, pure, so
// PieceTray only wires them to the ScrollView.

export const TRAY_ITEM_W = 56;
export const TRAY_ITEM_GAP = 8;
export const TRAY_PITCH = TRAY_ITEM_W + TRAY_ITEM_GAP;

interface FrameItem {
  key: string;
  count: number;
}

// Side padding that lets the first and the last item reach the centre.
export function centrePadding(viewportW: number, itemW: number = TRAY_ITEM_W): number {
  return Math.max(0, (viewportW - itemW) / 2);
}

// With centrePadding on both sides, item i is centred at scroll offset
// i * pitch.
export function offsetForIndex(index: number, pitch: number = TRAY_PITCH): number {
  return index * pitch;
}

export function snapOffsets(count: number, pitch: number = TRAY_PITCH): number[] {
  return Array.from({ length: count }, (_, i) => offsetForIndex(i, pitch));
}

// The index under the frame at a scroll offset, or -1 for an empty tray.
export function indexAtOffset(offset: number, count: number, pitch: number = TRAY_PITCH): number {
  if (count <= 0) return -1;
  return Math.min(count - 1, Math.max(0, Math.round(offset / pitch)));
}

// The selection a framed item gives: its key while it has pieces left.
export function selectableKey(item: FrameItem | undefined): string | null {
  return item && item.count > 0 ? item.key : null;
}

// Which item holds the frame after the item list changes (a placement, a
// long-press return, level start). The frame follows its own item by key, so
// a returned piece never steals it. When the framed item leaves (Kepler+,
// count zero), the item that slides into its place takes the frame. When it
// hits zero but stays (Axiom), the next item with pieces left takes it.
export function frameKeyAfterItemsChange(
  prev: readonly FrameItem[],
  next: readonly FrameItem[],
  frameKey: string | null,
): string | null {
  if (next.length === 0) return null;
  if (frameKey === null) return next[0].key;

  const nextIdx = next.findIndex(i => i.key === frameKey);
  if (nextIdx === -1) {
    const prevIdx = Math.max(0, prev.findIndex(i => i.key === frameKey));
    return next[Math.min(prevIdx, next.length - 1)].key;
  }

  const wasSelectable = (prev.find(i => i.key === frameKey)?.count ?? 0) > 0;
  if (next[nextIdx].count > 0 || !wasSelectable) return frameKey;

  for (let i = nextIdx + 1; i < next.length; i++) {
    if (next[i].count > 0) return next[i].key;
  }
  for (let i = nextIdx - 1; i >= 0; i--) {
    if (next[i].count > 0) return next[i].key;
  }
  return frameKey;
}

// A filter change re-centres on the first item of the new list.
export function frameKeyForFilter(visible: readonly FrameItem[]): string | null {
  return visible.length > 0 ? visible[0].key : null;
}
