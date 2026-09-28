// SWEEP-B51 S9 (AXM-040): a tap on the tutorial callout card advances.
//
// The callout is pointerEvents="auto", so on a step without allowPieceTap a
// tap on the card was swallowed: its message had no press handler, and only
// a tap outside it reached handleTapAnywhere (smoke 2d). Source-structure
// checks, read as UTF-8, over the callout block only.

import * as fs from 'fs';
import * as path from 'path';

const src = fs
  .readFileSync(path.resolve(__dirname, '../../../src/components/TutorialHUDOverlay.tsx'), 'utf8')
  .replace(/\r\n/g, '\n');

function calloutBlock(): string {
  const start = src.indexOf('{/* Callout */}');
  const end = src.indexOf('{/* Orb.', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('SWEEP-B51 S9: tutorial callout tap', () => {
  test('[S9-1] the non-allowPieceTap callout message is wrapped in a touchable that calls handleTapAnywhere', () => {
    const block = calloutBlock();
    // The ternary's else branch is a TouchableOpacity around renderMessage().
    const elseBranch = block.slice(block.indexOf(') : ('));
    expect(block.indexOf(') : (')).toBeGreaterThan(-1);
    const touchable = elseBranch.match(/<TouchableOpacity([^>]*)>\s*\{renderMessage\(\)\}\s*<\/TouchableOpacity>/);
    expect(touchable).not.toBeNull();
    const attrs = touchable![1];
    expect(attrs).toMatch(/onPress=\{handleTapAnywhere\}/);
    expect(attrs).toMatch(/activeOpacity=\{0\.85\}/);
    expect(attrs).toMatch(/testID="tutorial-callout-body"/);
    // No bare renderMessage() left outside a touchable.
    expect(block).not.toMatch(/\) : renderMessage\(\)\}/);
    // handleTapAnywhere is still the tap-anywhere handler (phase and codex guards).
    expect(src).toMatch(/const handleTapAnywhere = useCallback\(\(\) => \{\n\s*if \(phase !== 'arrived'\) return;\n\s*if \(codexVisible\) return;\n\s*handlePrimary\(\);/);
  });

  test('[S9-1] the callout host and SKIP are unchanged', () => {
    const block = calloutBlock();
    expect(block).toContain(`{phase === 'arrived' && calloutPos && (
        <Animated.View
          pointerEvents="auto"
          style={[
            st.callout,`);
    expect(block).toContain(`<TouchableOpacity onPress={handleSkip} style={st.skipBtn} activeOpacity={0.7}>
            <Text style={st.skipBtnText}>SKIP</Text>
          </TouchableOpacity>`);
    expect(block).toContain(`{step?.allowPieceTap ? (
            <TouchableOpacity onPress={handlePrimary} activeOpacity={0.85}>
              {renderMessage()}
            </TouchableOpacity>`);
    expect((block.match(/<Animated\.View/g) ?? []).length).toBe(1);
    // The one host holds exactly three touchables: SKIP, the allowPieceTap
    // message, and the tap-to-advance message body.
    expect((block.match(/<TouchableOpacity/g) ?? []).length).toBe(3);
  });
});
