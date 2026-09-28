// SWEEP-B51 S8 (AXM-040): requisition store swipe rule, as a pure function
// so the release decision is testable without a gesture system.

import {
  REQ_SWIPE_START,
  REQ_SWIPE_THRESHOLD,
  resolveReqSwipe,
} from '../../../src/components/gameplay/requisitionSlide';

describe('SWEEP-B51 S8: requisition swipe rule', () => {
  test('[S8-1] swipe constants', () => {
    expect(REQ_SWIPE_START).toBe(8);
    expect(REQ_SWIPE_THRESHOLD).toBe(40);
  });

  test('[S8-1] resolveReqSwipe expands on an up swipe, collapses on a down swipe, and ignores short or wrong-way swipes', () => {
    // Collapsed: an up swipe of at least 40 expands.
    expect(resolveReqSwipe(false, -40)).toBe(true);
    expect(resolveReqSwipe(false, -120)).toBe(true);
    // Expanded: a down swipe of at least 40 collapses.
    expect(resolveReqSwipe(true, 40)).toBe(false);
    expect(resolveReqSwipe(true, 200)).toBe(false);
    // Short swipes change nothing.
    expect(resolveReqSwipe(false, -39)).toBeNull();
    expect(resolveReqSwipe(true, 39)).toBeNull();
    expect(resolveReqSwipe(false, 0)).toBeNull();
    expect(resolveReqSwipe(true, 0)).toBeNull();
    // Wrong-way swipes change nothing.
    expect(resolveReqSwipe(false, 80)).toBeNull();
    expect(resolveReqSwipe(true, -80)).toBeNull();
  });
});
