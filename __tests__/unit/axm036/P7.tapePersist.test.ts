// AXM-036 P7 (F7) — tape run-state colours persist to level end.
//
// Finding: GameplayScreen.tsx calls tape.resetTape() immediately after the
// pulse loop, before the lock phase, the completion card and every failure
// modal. resetTape() clears tapeCellHighlights, gateOutcomesRef,
// visualTrailOverride, visualOutputOverride and tapeBarState — so the Trail
// and OUT tape colours a run just earned vanish before the Engineer ever
// sees the result screen (Build 49, screenshot 09).
//
// P9 (AXM-036, merged first in this lane) renamed the old handleEngage body
// to runEngage and wrapped it in a thin handleEngage that only adds a
// try/catch/withRunGuard. The P7 hunks (the tape.resetTape() call and its
// sibling reset sites) are inside runEngage, disjoint from P9's wrapper —
// so this file's source checks target runEngage, not handleEngage.

// React 18+ requires this flag set before any act() calls so the
// concurrent renderer treats this as a test environment (same pattern as
// __tests__/unit/hooks/useGameplayTape.test.ts).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: {
  act: (cb: () => void | Promise<void>) => Promise<void>;
  create: (
    el: React.ReactElement,
  ) => { update: (el: React.ReactElement) => void; unmount: () => void };
} = require('react-test-renderer');
import { useGameplayTape } from '../../../src/hooks/useGameplayTape';

const SOURCE_PATH = path.join(__dirname, '../../../src/screens/GameplayScreen.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

/**
 * Extracts the body of a `const <name> = useCallback(<async >() => { ... }, [...]);`
 * (or a bare `useEffect(() => { ... }, [...]);` / `useFocusEffect(...)` block found by
 * a literal marker) by brace-matching from the marker's first `{` to its balanced `}`.
 * Brace-matching (rather than pinning the dependency array text) survives incidental
 * dependency-array edits that are not this package's concern.
 */
function extractBlock(startMarker: string): string {
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error(`marker not found: ${startMarker}`);
  }
  const braceOpen = source.indexOf('{', startIdx);
  if (braceOpen === -1) {
    throw new Error(`no opening brace after marker: ${startMarker}`);
  }
  let depth = 0;
  for (let i = braceOpen; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(braceOpen, i + 1);
      }
    }
  }
  throw new Error(`unbalanced braces from marker: ${startMarker}`);
}

describe('P7 — GameplayScreen.tsx source structure', () => {
  const runEngageBody = extractBlock('const runEngage = useCallback(async () => {');

  test('[P7-1] no resetTape between the pulse loop and the result branches of handleEngage', () => {
    // The pulse loop is the `for (let p = 0; p < pulses.length; p++) { ... }`
    // block inside runEngage (the inner run function P9's wrapper delegates
    // to). Everything from the loop's closing brace onward is the
    // post-run / result-branch region: wrong-output detection, the
    // INSUFFICIENT PULSES branch, the lock phase, success and void
    // failure. None of it may reset the tape.
    const loopStart = runEngageBody.indexOf('for (let p = 0; p < pulses.length; p++)');
    expect(loopStart).toBeGreaterThan(-1);

    const loopBraceOpen = runEngageBody.indexOf('{', loopStart);
    let depth = 0;
    let loopEnd = -1;
    for (let i = loopBraceOpen; i < runEngageBody.length; i++) {
      if (runEngageBody[i] === '{') depth++;
      else if (runEngageBody[i] === '}') {
        depth--;
        if (depth === 0) {
          loopEnd = i + 1;
          break;
        }
      }
    }
    expect(loopEnd).toBeGreaterThan(-1);

    const postLoopRegion = runEngageBody.slice(loopEnd);
    expect(postLoopRegion).not.toMatch(/tape\.resetTape\(\)/);

    // Sanity: the result branches this test is protecting actually exist
    // in that region, so a vacuous pass (e.g. a mis-set marker) is caught.
    expect(postLoopRegion).toMatch(/wrongOutput/);
    expect(postLoopRegion).toMatch(/handleSuccess/);
    expect(postLoopRegion).toMatch(/handleVoidFailure/);
  });

  test('[P7-2] resetTape called at run start and in each named handler', () => {
    // (1) Start of the next ENGAGE, before the first pulse: runEngage must
    // call resetTape() once, and that call must precede the pulse loop.
    const resetIdx = runEngageBody.indexOf('tape.resetTape()');
    const loopStart = runEngageBody.indexOf('for (let p = 0; p < pulses.length; p++)');
    expect(resetIdx).toBeGreaterThan(-1);
    expect(loopStart).toBeGreaterThan(-1);
    expect(resetIdx).toBeLessThan(loopStart);

    const resetCallCount = (runEngageBody.match(/tape\.resetTape\(\)/g) ?? []).length;
    expect(resetCallCount).toBe(1);

    // (2) handleReset (RESET and every TRY AGAIN)
    const handleResetBody = extractBlock('const handleReset = useCallback(() => {');
    expect(handleResetBody).toMatch(/tape\.resetTape\(\)/);

    // (3) handleWrongOutputRetry
    const handleWrongOutputRetryBody = extractBlock(
      'const handleWrongOutputRetry = useCallback(() => {',
    );
    expect(handleWrongOutputRetryBody).toMatch(/tape\.resetTape\(\)/);

    // (4) handleCompletionContinue
    const handleCompletionContinueBody = extractBlock(
      'const handleCompletionContinue = useCallback(() => {',
    );
    expect(handleCompletionContinueBody).toMatch(/tape\.resetTape\(\)/);

    // (5) blur/unmount (existing) — the unmount cleanup effect and the
    // useFocusEffect blur cleanup, both immediately following the
    // "Cleanup beam animation on unmount" / "on blur" comments.
    const unmountBody = extractBlock('Cleanup beam animation on unmount');
    expect(unmountBody).toMatch(/tape\.resetTape\(\)/);

    const blurBody = extractBlock('useFocusEffect(');
    expect(blurBody).toMatch(/tape\.resetTape\(\)/);
  });
});

describe('P7 — useGameplayTape keeps highlights until resetTape', () => {
  type HookResult = ReturnType<typeof useGameplayTape>;
  let captured: HookResult | null = null;

  function Harness() {
    captured = useGameplayTape(null);
    return null;
  }

  afterEach(() => {
    captured = null;
  });

  test('[P7-1] useGameplayTape keeps highlights until resetTape', async () => {
    let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness));
    });

    await TestRenderer.act(async () => {
      captured!.tapeSetters.setTapeCellHighlights(new Map([['trail-0', 'gate-pass']]));
      captured!.tapeSetters.setVisualOutputOverride([1, 0]);
    });
    expect(captured!.tapeCellHighlights.size).toBe(1);
    expect(captured!.visualOutputOverride).toEqual([1, 0]);

    // A re-render alone (no resetTape call) must not clear run-state.
    await TestRenderer.act(async () => {
      renderer.update(React.createElement(Harness));
    });
    expect(captured!.tapeCellHighlights.size).toBe(1);
    expect(captured!.visualOutputOverride).toEqual([1, 0]);

    // Only an explicit resetTape() clears it.
    await TestRenderer.act(async () => {
      captured!.resetTape();
    });
    expect(captured!.tapeCellHighlights.size).toBe(0);
    expect(captured!.visualOutputOverride).toBeNull();
  });
});
