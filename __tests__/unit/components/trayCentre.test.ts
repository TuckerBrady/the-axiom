// AXM-020 (PROMPT_161) — centre-select tray: the pure geometry and
// selection rules. The tray snaps each item under a fixed centre frame; the
// item in the frame is the piece in hand.

import {
  TRAY_ITEM_W,
  TRAY_PITCH,
  centrePadding,
  snapOffsets,
  offsetForIndex,
  indexAtOffset,
  selectableKey,
  frameKeyAfterItemsChange,
  frameKeyForFilter,
} from '../../../src/components/gameplay/trayCentre';

const item = (key: string, count = 1) => ({ key, count });

describe('trayCentre — geometry', () => {
  it('pitch is one 56pt item plus the 8pt gap', () => {
    expect(TRAY_ITEM_W).toBe(56);
    expect(TRAY_PITCH).toBe(64);
  });

  it('side padding lets the first and last item reach the centre', () => {
    expect(centrePadding(411)).toBeCloseTo((411 - 56) / 2);
    expect(centrePadding(360)).toBeCloseTo((360 - 56) / 2);
    // A viewport narrower than one item never goes negative.
    expect(centrePadding(40)).toBe(0);
  });

  it('snap offsets are one per item, a pitch apart, starting at zero', () => {
    expect(snapOffsets(0)).toEqual([]);
    expect(snapOffsets(1)).toEqual([0]);
    expect(snapOffsets(4)).toEqual([0, 64, 128, 192]);
    expect(snapOffsets(3, 100)).toEqual([0, 100, 200]);
  });

  it('offsetForIndex is the snap offset for that index', () => {
    expect(offsetForIndex(0)).toBe(0);
    expect(offsetForIndex(3)).toBe(192);
  });

  it('indexAtOffset finds the item under the frame, clamped to the list', () => {
    expect(indexAtOffset(0, 5)).toBe(0);
    expect(indexAtOffset(64, 5)).toBe(1);
    // Nearest snap wins either side of the half-pitch.
    expect(indexAtOffset(95, 5)).toBe(1);
    expect(indexAtOffset(97, 5)).toBe(2);
    // Overscroll clamps.
    expect(indexAtOffset(-40, 5)).toBe(0);
    expect(indexAtOffset(9999, 5)).toBe(4);
    // Empty tray: nothing under the frame.
    expect(indexAtOffset(0, 0)).toBe(-1);
  });
});

describe('trayCentre — selection', () => {
  it('an item with count left is selectable; count zero or no item is not', () => {
    expect(selectableKey(item('conveyor', 2))).toBe('conveyor');
    expect(selectableKey(item('gear', 0))).toBeNull();
    expect(selectableKey(undefined)).toBeNull();
  });

  it('level start (no frame yet) puts the first item in the frame', () => {
    expect(frameKeyAfterItemsChange([], [item('a'), item('b')], null)).toBe('a');
  });

  it('an empty tray has nothing in the frame', () => {
    expect(frameKeyAfterItemsChange([item('a')], [], 'a')).toBeNull();
  });

  it('the frame keeps its item when the list changes around it', () => {
    // Long-press return re-adds a type ahead of the frame: the frame follows
    // its own item, it is not stolen by the returned one.
    const prev = [item('b'), item('c')];
    const next = [item('a'), item('b'), item('c')];
    expect(frameKeyAfterItemsChange(prev, next, 'c')).toBe('c');
  });

  it('when the framed item leaves (Kepler+ count zero), the next item slides in', () => {
    const prev = [item('a'), item('b'), item('c')];
    expect(frameKeyAfterItemsChange(prev, [item('a'), item('c')], 'b')).toBe('c');
  });

  it('when the last item leaves, the one before it takes the frame', () => {
    const prev = [item('a'), item('b'), item('c')];
    expect(frameKeyAfterItemsChange(prev, [item('a'), item('b')], 'c')).toBe('b');
  });

  it('when the framed item hits zero but stays (Axiom), the next item with count takes the frame', () => {
    const prev = [item('a', 1), item('b', 1), item('c', 1)];
    const next = [item('a', 1), item('b', 0), item('c', 1)];
    expect(frameKeyAfterItemsChange(prev, next, 'b')).toBe('c');
  });

  it('Axiom: with nothing after it, the nearest earlier item with count takes the frame', () => {
    const prev = [item('a', 1), item('b', 0), item('c', 1)];
    const next = [item('a', 1), item('b', 0), item('c', 0)];
    expect(frameKeyAfterItemsChange(prev, next, 'c')).toBe('a');
  });

  it('Axiom: when every item is spent, the frame stays where it is', () => {
    const prev = [item('a', 0), item('b', 1)];
    const next = [item('a', 0), item('b', 0)];
    expect(frameKeyAfterItemsChange(prev, next, 'b')).toBe('b');
  });

  it('a frame the Engineer parked on an already-empty item is left alone', () => {
    const prev = [item('a', 0), item('b', 1)];
    const next = [item('a', 0), item('b', 1)];
    expect(frameKeyAfterItemsChange(prev, next, 'a')).toBe('a');
  });

  it('a filter change re-centres on the first item of the new list', () => {
    expect(frameKeyForFilter([item('x'), item('y')])).toBe('x');
    expect(frameKeyForFilter([])).toBeNull();
  });
});
