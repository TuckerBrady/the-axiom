// Source-contract guards for Prompt 106 (Build 14 remaining fixes).
// Three independent fixes ride this prompt:
//   Fix 1 — OUT tape display: hasValue is the display predicate.
//           gatePassed/gateBlocked only style the cell.
//   Fix 2 — Progressive lag: blur cleanup + stack reset on Continue
//           prevents stale Gameplay instances from accumulating
//           when reached via HubScreen's `navigate` flow.
//   Fix 3 — A1-3 trail visual override seeds from the level's actual
//           pre-existing trail values rather than blanket null, so a
//           seeded `[0]` cell stays visible during the beam phase.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const tapeCellSrc = read('src/components/gameplay/TapeCell.tsx');
const gameplaySrc = read('src/screens/GameplayScreen.tsx');
// Phase 1 of the GameplayScreen refactor moved modal overlay JSX
// (results / completion / pause / etc.) into GameplayModals. The
// `navigation.reset` Continue handler lives there now.
const modalsSrc = read('src/components/gameplay/GameplayModals.tsx');
const levelsSrc = read('src/game/levels.ts');
// Phase 4 refactor (Prompt 110): blur cleanup delegates to beam.cancelAllFrames()
// which owns the inline ref-clearing patterns that previously lived in the blur block.
const beamHookSrc = read('src/hooks/useBeamEngine.ts');

describe('Prompt 106 — Fix 1: OUT tape always shows the written value', () => {
  it('display predicate is cellHasWrittenValue alone', () => {
    // Pre-Prompt-106 the ternary required `gatePassed && hasValue` to
    // show the value. With a Transmitter upstream of a Config Node
    // that blocked, the cell fell through to '·' even though the
    // Transmitter had already written. This regex asserts the new
    // form: hasValue ? written : gateBlocked ? '·' : '_'.
    expect(tapeCellSrc).toMatch(
      /cellHasWrittenValue \? written : gateBlocked \? '·' : '_'/,
    );
  });

  it('green styling requires hasValue, not gatePassed alone', () => {
    expect(tapeCellSrc).toMatch(
      /styleAsPassed = !!gatePassed && cellHasWrittenValue/,
    );
  });

  it('red styling requires the Transmitter never reached (no value written)', () => {
    // hasValue=true && gateBlocked=true must produce neutral styling
    // because the value is on the tape — the block happened downstream.
    expect(tapeCellSrc).toMatch(
      /styleAsBlocked = !!gateBlocked && !cellHasWrittenValue/,
    );
  });

  it('does not retain the pre-Prompt-106 ternary that hid written values on downstream block', () => {
    // The buggy form was: gatePassed && hasValue ? written : gateBlocked ? '·' : '_'
    // It would fall through to '·' for the (hasValue=true, gateBlocked=true)
    // case. Lock that form out so it can't reappear.
    expect(tapeCellSrc).not.toMatch(
      /gatePassed && hasValue\s*\n?\s*\?\s*written/,
    );
  });
});

describe('Prompt 106 — Fix 2: Progressive lag (blur cleanup + stack reset)', () => {
  it('GameplayScreen imports useFocusEffect from @react-navigation/native', () => {
    expect(gameplaySrc).toMatch(
      /import\s*\{\s*useFocusEffect\s*\}\s*from\s*'@react-navigation\/native'/,
    );
  });

  it('GameplayScreen runs the same animation cleanup on blur as on unmount', () => {
    // Native-stack v7 keeps a screen mounted when a new screen is
    // pushed on top. The unmount cleanup never fires in that flow, so
    // the prior Gameplay instance keeps running its RAF loops. The
    // blur cleanup mirrors the unmount cleanup so background instances
    // stop burning frames.
    //
    // Phase 4 refactor (Prompt 110): inline cleanup delegated to
    // beam.cancelAllFrames(). We verify the blur block calls it (same
    // delegation as the unmount block) and that the implementation in
    // useBeamEngine still covers every ref.
    const blurBlock = gameplaySrc.match(
      /useFocusEffect\(\s*useCallback\(\(\) => \{[\s\S]*?\}, \[\]\),\s*\)/,
    );
    expect(blurBlock).not.toBeNull();
    const body = blurBlock?.[0] ?? '';
    // Delegation contract: blur calls both cleanup helpers.
    expect(body).toMatch(/beam\.cancelAllFrames\(\)/);
    expect(body).toMatch(/tape\.resetTape\(\)/);
    // Implementation contract: cancelAllFrames clears every ref that
    // previously lived inline in the blur block.
    expect(beamHookSrc).toMatch(/animFrameRef\.current\.forEach/);
    expect(beamHookSrc).toMatch(/cancelAnimationFrame/);
    expect(beamHookSrc).toMatch(/animFrameRef\.current\.clear\(\)/);
    expect(beamHookSrc).toMatch(/flashTimersRef\.current\s*=\s*\[\]/);
    expect(beamHookSrc).toMatch(/safetyTimersRef\.current\s*=\s*\[\]/);
    expect(beamHookSrc).toMatch(/loopingRef\.current\s*=\s*false/);
  });

  it('Continue button resets the navigation stack instead of pushing LevelSelect', () => {
    // navigation.navigate('LevelSelect') pushes a new screen if
    // LevelSelect isn't already in the stack — leaving any prior
    // Gameplay instance mounted underneath. navigation.reset replaces
    // the entire stack with [Tabs, LevelSelect], unmounting every
    // screen above.
    expect(modalsSrc).toMatch(
      /navigation\.reset\(\{\s*index: 1,\s*routes: \[\{ name: 'Tabs' \}, \{ name: 'LevelSelect' \}\][\s\S]*?\}\)/,
    );
    // The bare navigate('LevelSelect') sites must be gone from both
    // the screen and the extracted modals component.
    expect(gameplaySrc).not.toMatch(/navigation\.navigate\('LevelSelect'\)/);
    expect(modalsSrc).not.toMatch(/navigation\.navigate\('LevelSelect'\)/);
  });
});

describe('Prompt 106 — Fix 3: A1-3 trail seed visible during beam', () => {
  it('A1-3 level definition seeds the trail with [0]', () => {
    // The fix relies on this shape — a seeded trail rather than nulls.
    // If the level definition changes shape, the visual fix needs to
    // be re-evaluated.
    const a13 = levelsSrc.match(/levelA1_3:[\s\S]*?dataTrail:\s*\{\s*cells:\s*\[([^\]]+)\]/);
    expect(a13).not.toBeNull();
    expect(a13?.[1].trim()).toBe('0');
  });

  it('engage seeds visualTrailOverride from the level cells, not blanket null', () => {
    // Pre-Prompt-106 the override was filled with null on engage,
    // which blanked the seeded `[0]` and rendered '·' for the entire
    // beam phase. The new form copies the level's actual values so
    // pre-existing trail content stays visible.
    expect(gameplaySrc).toMatch(
      /setVisualTrailOverride\(\[\.\.\.level\.dataTrail\.cells\]\)/,
    );
    expect(gameplaySrc).not.toMatch(
      /setVisualTrailOverride\(level\.dataTrail\.cells\.map\(\(\) => null\)\)/,
    );
  });
});
