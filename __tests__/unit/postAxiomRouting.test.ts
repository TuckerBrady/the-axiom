// Source-contract + store-behavior tests for Prompt 85:
// (1) successHandlers advances to Kepler after A1-8 first-time completion
// (2) HubScreen bounty card is gated on axiomCompleted >= AXIOM_TOTAL_LEVELS

import * as fs from 'fs';
import * as path from 'path';

const successHandlersSource = fs.readFileSync(
  path.resolve(__dirname, '../../src/game/engagement/successHandlers.ts'),
  'utf8',
);

const hubScreenSource = fs.readFileSync(
  path.resolve(__dirname, '../../src/screens/HubScreen.tsx'),
  'utf8',
);

describe('Part A — post-Axiom sector advancement', () => {
  it("calls setActiveSector('2') after the A1-8 first-time completion scene", () => {
    // Anchor on the line that hides the completion scene, then expect the
    // setActiveSector call before the navigation.navigate('Tabs'…) hand-off.
    expect(successHandlersSource).toMatch(
      /setShowCompletionScene\(false\);\s*\n\s*useProgressionStore\.getState\(\)\.setActiveSector\('2'\);\s*\n\s*navigation\.navigate\(['"]Tabs['"]\s+as\s+never\)/,
    );
  });

  it('does NOT call setActiveSector earlier in successHandlers (avoid double-trigger)', () => {
    const calls = (
      successHandlersSource.match(/setActiveSector\('2'\)/g) ?? []
    ).length;
    expect(calls).toBe(1);
  });

  it('setActiveSector on the progressionStore actually persists when invoked', () => {
    // Behavior check on the store itself — independent of the screen.
    jest.isolateModules(() => {
      const mod = require('../../src/store/progressionStore') as {
        useProgressionStore: { getState: () => { activeSector: string; setActiveSector: (s: string) => void } };
      };
      const initial = mod.useProgressionStore.getState().activeSector;
      expect(initial).toBe('A1');
      mod.useProgressionStore.getState().setActiveSector('2');
      expect(mod.useProgressionStore.getState().activeSector).toBe('2');
    });
  });
});

describe('Part B — bounty card gating on Axiom completion', () => {
  it('renders the bounty card only when axiomCompleted >= AXIOM_TOTAL_LEVELS', () => {
    expect(hubScreenSource).toMatch(
      /\{hasBounty && currentChallenge && axiomCompleted >= AXIOM_TOTAL_LEVELS && \(/,
    );
  });

  it('still requires hasBounty AND currentChallenge (gating is additive, not a replacement)', () => {
    // Regression guard — the gating condition must be ANDed with the
    // existing hasBounty + currentChallenge checks, not replace them.
    expect(hubScreenSource).toMatch(
      /hasBounty && currentChallenge && axiomCompleted/,
    );
    // Bare "hasBounty && currentChallenge && (" without the Axiom guard
    // must not appear (the original ungated form).
    expect(hubScreenSource).not.toMatch(
      /\{hasBounty && currentChallenge && \(/,
    );
  });

  it('AXIOM_TOTAL_LEVELS is already imported in HubScreen — no new import needed', () => {
    expect(hubScreenSource).toMatch(
      /import\s+\{[^}]*\bAXIOM_TOTAL_LEVELS\b[^}]*\}\s+from\s+['"][^'"]*progressionStore['"]/,
    );
  });

  it('axiomCompleted is computed via getSectorCompletedCount("A1-")', () => {
    expect(hubScreenSource).toMatch(
      /const axiomCompleted = getSectorCompletedCount\(['"]A1-['"]\);/,
    );
  });
});
