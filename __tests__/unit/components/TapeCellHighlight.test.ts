// Source-contract tests for the TapeCell native-driven highlight
// fade (Prompt 99C, Fix 3). The .ts unit project cannot render the
// JSX-using component, so these tests verify the contract by
// inspecting the source. Behavioral coverage of the rendered fade
// lives in Maestro.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const cellSrc = fs.readFileSync(
  path.resolve(repoRoot, 'src/components/gameplay/TapeCell.tsx'),
  'utf8',
);

describe('TapeCell — native-driven highlight overlay (Prompt 99C, Fix 3)', () => {
  it('allocates a per-cell highlightOpacity Animated.Value via useRef', () => {
    expect(cellSrc).toMatch(
      /const highlightOpacity = useRef\(new Animated\.Value\(0\)\)\.current/,
    );
  });

  it('renders an Animated.View overlay whose opacity reads highlightOpacity', () => {
    expect(cellSrc).toMatch(/<Animated\.View[\s\S]*?opacity:\s*highlightOpacity/);
  });

  // Build 21 follow-up: highlightOpacity demoted to JS driver because
  // its host (Animated.View at the `overlayColors ? (...) : null`
  // ternary) is conditionally mounted — REQ-A-1 FORM B. The runtime
  // is mitigated by lastColorsRef latching overlayColors truthy after
  // first highlight, but the static shape is still FORM B and a
  // future refactor removing the latch would re-expose the parent-
  // swap crash class. JS-driver cost on a 24x24-px overlay is
  // trivial. See project-docs/REPORTS/build21-sigsegv-investigation.md.
  it('fade-in to 1 uses JS driver with 120ms duration', () => {
    const fadeInMatch = cellSrc.match(
      /Animated\.timing\(highlightOpacity,\s*\{\s*toValue:\s*1[\s\S]*?duration:\s*HIGHLIGHT_FADE_IN_MS[\s\S]*?useNativeDriver:\s*false[\s\S]*?\}\)/,
    );
    expect(fadeInMatch).toBeTruthy();
    expect(cellSrc).toMatch(/HIGHLIGHT_FADE_IN_MS\s*=\s*120/);
  });

  it('fade-out to 0 uses JS driver with 180ms duration', () => {
    const fadeOutMatch = cellSrc.match(
      /Animated\.timing\(highlightOpacity,\s*\{\s*toValue:\s*0[\s\S]*?duration:\s*HIGHLIGHT_FADE_OUT_MS[\s\S]*?useNativeDriver:\s*false[\s\S]*?\}\)/,
    );
    expect(fadeOutMatch).toBeTruthy();
    expect(cellSrc).toMatch(/HIGHLIGHT_FADE_OUT_MS\s*=\s*180/);
  });

  it('no Animated.timing on highlightOpacity uses the native driver (REQ-A-1 FORM B)', () => {
    expect(cellSrc).not.toMatch(
      /Animated\.timing\(highlightOpacity,[^}]*useNativeDriver:\s*true/,
    );
  });

  it('preserves the pre-99C palette via colorsForHighlight()', () => {
    // Palette carried forward from the deleted style classes.
    expect(cellSrc).toMatch(/case 'read':[\s\S]*?bg:\s*'rgba\(0,229,255,0\.18\)'/);
    expect(cellSrc).toMatch(/case 'write':[\s\S]*?bg:\s*'rgba\(0,229,255,0\.22\)'/);
    // gate-pass uses trail primary blue (#00D4FF = rgba(0,212,255,...))
    // so the match highlight does not clash with neonGreen trail text
    // (Prompt 104, Fix 2).
    expect(cellSrc).toMatch(/case 'gate-pass':[\s\S]*?bg:\s*'rgba\(0,212,255,0\.18\)'/);
    expect(cellSrc).toMatch(/case 'gate-block':[\s\S]*?bg:\s*'rgba\(255,59,59,0\.18\)'/);
    expect(cellSrc).toMatch(/case 'departing':/);
  });

  it('drops the conditional style classes (Prompt 99C, Fix 3 step 4)', () => {
    // The five tapeCellHighlight* classes used to live both here and
    // in GameplayScreen.tsx; both copies move to the
    // colorsForHighlight() palette helper above.
    expect(cellSrc).not.toMatch(/styles\.tapeCellHighlightRead/);
    expect(cellSrc).not.toMatch(/styles\.tapeCellHighlightWrite/);
    expect(cellSrc).not.toMatch(/styles\.tapeCellHighlightGatePass/);
    expect(cellSrc).not.toMatch(/styles\.tapeCellHighlightGateBlock/);
    expect(cellSrc).not.toMatch(/styles\.tapeCellHighlightDeparting/);
  });

  it('GameplayScreen no longer carries the deleted style classes', () => {
    const screenSrc = fs.readFileSync(
      path.resolve(repoRoot, 'src/screens/GameplayScreen.tsx'),
      'utf8',
    );
    expect(screenSrc).not.toMatch(/^\s*tapeCellHighlightRead:/m);
    expect(screenSrc).not.toMatch(/^\s*tapeCellHighlightWrite:/m);
    expect(screenSrc).not.toMatch(/^\s*tapeCellHighlightGatePass:/m);
    expect(screenSrc).not.toMatch(/^\s*tapeCellHighlightGateBlock:/m);
    expect(screenSrc).not.toMatch(/^\s*tapeCellHighlightDeparting:/m);
  });
});
