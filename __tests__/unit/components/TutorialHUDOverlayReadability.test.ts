// Source-contract guard for Prompt 87: portal label readability +
// long-message handling. TestFlight feedback on A1-8 reported the
// portal label was too small to read and the long message could
// run off the bottom of shorter devices.

import * as fs from 'fs';
import * as path from 'path';

const overlaySource = fs.readFileSync(
  path.resolve(__dirname, '../../../src/components/TutorialHUDOverlay.tsx'),
  'utf8',
);

describe('TutorialHUDOverlay readability (Prompt 87)', () => {
  describe('portal label', () => {
    it('renders the label at fontSize 13 (was 10)', () => {
      // The label style block must use fontSize 13. We match the
      // label: { ... fontSize: 13 ... } region so we are pinned to
      // the label style and not some other style.
      expect(overlaySource).toMatch(/label:\s*\{[\s\S]*?fontSize:\s*13/);
      expect(overlaySource).not.toMatch(/label:\s*\{[\s\S]*?fontSize:\s*10/);
    });

    it('keeps amber color #F0B429 for the label (do not regress)', () => {
      expect(overlaySource).toMatch(/label:\s*\{[\s\S]*?color:\s*'#F0B429'/);
    });

    it('positions the label at portalBox.top - 24 to clear the larger text', () => {
      expect(overlaySource).toMatch(/top:\s*portalBox\.top\s*-\s*24/);
      expect(overlaySource).not.toMatch(/top:\s*portalBox\.top\s*-\s*20/);
    });
  });

  describe('long-message variant', () => {
    it('exposes a longMessage style with smaller font + tighter line height', () => {
      expect(overlaySource).toMatch(
        /longMessage:\s*\{[\s\S]*?fontSize:\s*13[\s\S]*?lineHeight:\s*19/,
      );
    });

    it('applies the longMessage style when message length exceeds 200 chars', () => {
      expect(overlaySource).toMatch(/text\.length\s*>\s*200/);
      expect(overlaySource).toMatch(/isLong\s*\?\s*\[st\.message,\s*st\.longMessage\]/);
    });
  });

  describe('callout repositioning for long messages', () => {
    it('uses a larger callout-height estimate when the message is long', () => {
      expect(overlaySource).toMatch(/CALLOUT_H_EST_DEFAULT\s*=\s*188/);
      expect(overlaySource).toMatch(/CALLOUT_H_EST_LONG\s*=\s*240/);
      expect(overlaySource).toMatch(/isLongMessage[\s\S]*?\?\s*CALLOUT_H_EST_LONG/);
    });

    it('flips the callout above the portal when below-placement would cross 85% of screen height', () => {
      expect(overlaySource).toMatch(/SCREEN_H\s*\*\s*0\.85/);
      // Above-placement uses portalTop - CALLOUT_GAP - CALLOUT_H_EST.
      expect(overlaySource).toMatch(/portalTop\s*-\s*CALLOUT_GAP\s*-\s*CALLOUT_H_EST/);
    });
  });
});
