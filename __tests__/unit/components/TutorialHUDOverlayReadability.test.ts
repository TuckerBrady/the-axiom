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

    it('no longer renders step.label as a portal sub-header (UX-02, PROMPT_142)', () => {
      // PROMPT_142 UX-02 removed the per-step mission sub-header. The
      // `<Text style={st.label}>{step.label}</Text>` block — previously
      // positioned at portalBox.top - 24 — no longer renders. The st.label
      // style (fontSize 13, amber) is retained as dead style for a future
      // cleanup pass; the two assertions above still pin it.
      expect(overlaySource).not.toMatch(/<Text[^>]*style=\{st\.label\}[^>]*>\s*\{step\.label\}/);
      expect(overlaySource).not.toMatch(/top:\s*portalBox\.top\s*-\s*24/);
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

    it('floats the lower anchor with CALLOUT_H_EST so long messages stay clear of the nav bar (UX-01)', () => {
      // UX-01 replaced the floating 85%-overflow flip with a strict
      // two-position system. The lower anchor still uses CALLOUT_H_EST, so
      // a long message (240 est) shifts the card up relative to a default
      // one (188 est). The old SCREEN_H * 0.85 flip is removed.
      expect(overlaySource).toMatch(
        /SCREEN_H\s*-\s*NAV_HEIGHT\s*-\s*16\s*-\s*CALLOUT_H_EST/,
      );
      expect(overlaySource).not.toMatch(/SCREEN_H\s*\*\s*0\.85/);
    });
  });
});
