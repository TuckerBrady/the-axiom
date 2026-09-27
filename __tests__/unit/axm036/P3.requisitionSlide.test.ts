// AXM-036 P3 (F3) — pure constants backing the Requisition store's slide
// motion (mount-in, handle expand/collapse, confirm slide-out).

import {
  REQ_SLIDE_DISTANCE,
  REQ_SLIDE_MS,
  REQ_SLIDE_IN_BEZIER,
  REQ_SLIDE_OUT_BEZIER,
} from '../../../src/components/gameplay/requisitionSlide';

describe('requisitionSlide constants', () => {
  it('[P3-1] constants', () => {
    expect(REQ_SLIDE_DISTANCE).toBe(600);
    expect(REQ_SLIDE_MS).toBe(600);
    expect(REQ_SLIDE_IN_BEZIER).toEqual([0.16, 1, 0.3, 1]);
    expect(REQ_SLIDE_OUT_BEZIER).toEqual([0.4, 0, 1, 0.6]);
  });
});
