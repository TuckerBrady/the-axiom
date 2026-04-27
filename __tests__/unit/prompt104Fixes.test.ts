// Source-contract guards for Prompt 104 — TestFlight Build 12 Fixes.
//
// Four bugs fixed:
//   Fix 1 — Wire glow reset per pulse
//   Fix 2 — Trail tape green-on-green highlight
//   Fix 3 — OUT tape writes only at Transmitter (green styling gated on hasValue)
//   Fix 4 — Progressive lag from replay loop and safety timer accumulation

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const gameplaySrc = read('src/screens/GameplayScreen.tsx');
const replayLoopSrc = read('src/game/engagement/replayLoop.ts');
const tapeCellSrc = read('src/components/gameplay/TapeCell.tsx');
const interactionsSrc = read('src/game/engagement/interactions.ts');

// ─── Fix 1 — Wire Glow Reset Per Pulse ─────────────────────────────────────

describe('Fix 1 — litWires reset between pulses', () => {
  it('GameplayScreen resets litWires to a fresh Set before each engageRunPulse call', () => {
    // The reset must appear after the pieceAnimState reset and before
    // the engageRunPulse await, inside the pulse for-loop.
    const pulseLoopBlock = gameplaySrc.match(
      /for \(let p = 0; p < pulses\.length; p\+\+\) \{[\s\S]*?await engageRunPulse\(ctx, pulses\[p\]\);/,
    );
    expect(pulseLoopBlock).not.toBeNull();
    expect(pulseLoopBlock?.[0]).toMatch(
      /setBeamState\(prev => \(\{ \.\.\.prev, litWires: new Set\(\) \}\)\)/,
    );
  });

  it('replayLoop resets litWires at the start of each loop iteration', () => {
    // The outer setBeamState call (which resets heads/trails/branchTrails)
    // must also include litWires: new Set().
    expect(replayLoopSrc).toMatch(
      /setBeamState\(prev => \(\{[\s\S]*?heads: \[\],[\s\S]*?litWires: new Set\(\)/,
    );
  });

  it('replayLoop resets litWires between pulses inside its inner for-loop', () => {
    // Each pulse in the replay also gets a fresh litWires reset so
    // inter-pulse visibility matches the initial-pulse experience.
    const innerLoop = replayLoopSrc.match(
      /for \(let lp = 0; lp < pulses\.length; lp\+\+\) \{[\s\S]*?await runPulse\(ctx, pulses\[lp\]\);/,
    );
    expect(innerLoop).not.toBeNull();
    expect(innerLoop?.[0]).toMatch(
      /setBeamState\(prev => \(\{ \.\.\.prev, litWires: new Set\(\) \}\)\)/,
    );
  });
});

// ─── Fix 2 — Trail Tape Green-on-Green ─────────────────────────────────────

describe('Fix 2 — gate-pass highlight uses blue, not green', () => {
  it("gate-pass bg is rgba(0,212,255,0.18) — trail primary blue #00D4FF", () => {
    expect(tapeCellSrc).toMatch(
      /case 'gate-pass':[\s\S]*?bg:\s*'rgba\(0,212,255,0\.18\)'/,
    );
  });

  it("gate-pass border is rgba(0,212,255,0.9)", () => {
    expect(tapeCellSrc).toMatch(
      /case 'gate-pass':[\s\S]*?border:\s*'rgba\(0,212,255,0\.9\)'/,
    );
  });

  it('gate-pass does NOT use the old neonGreen rgba(0,255,135,...)', () => {
    // The comment in colorsForHighlight() references the old value for
    // context; only the return statement should be checked — not the
    // comment block that precedes it.
    const returnLine = tapeCellSrc.match(
      /case 'gate-pass':[\s\S]*?return \{ bg: '([^']+)', border: '([^']+)' \};/,
    );
    expect(returnLine).not.toBeNull();
    expect(returnLine?.[1]).not.toMatch(/rgba\(0,255,135/);
    expect(returnLine?.[2]).not.toMatch(/rgba\(0,255,135/);
  });

  it('gate-block still uses the original red', () => {
    expect(tapeCellSrc).toMatch(
      /case 'gate-block':[\s\S]*?bg:\s*'rgba\(255,59,59,0\.18\)'/,
    );
  });
});

// ─── Fix 3 — OUT Tape Premature Green Styling ───────────────────────────────

describe('Fix 3 — OUT cell green styling gated on hasValue', () => {
  it('tapeCellGatePassed style requires BOTH gatePassed AND hasValue', () => {
    // Config Node pass alone (gatePassed=true, hasValue=false) must not
    // color the OUT cell green — that looked like "data printed at
    // Config Node step" before the Transmitter actually wrote.
    expect(tapeCellSrc).toMatch(
      /\(gatePassed && hasValue\) && styles\.tapeCellGatePassed/,
    );
  });

  it('tapeCellTextGatePassed also requires hasValue', () => {
    expect(tapeCellSrc).toMatch(
      /\(gatePassed && hasValue\) && styles\.tapeCellTextGatePassed/,
    );
  });

  it('the display text logic is unchanged: gatePassed && hasValue ? written', () => {
    expect(tapeCellSrc).toMatch(
      /gatePassed && hasValue[\s\S]*?\? written[\s\S]*?: gateBlocked[\s\S]*?\? '·'[\s\S]*?: '_'/,
    );
  });

  it('Config Node interaction still records passed outcome in gateOutcomes', () => {
    // gateOutcomes.current.set(pulse, 'passed') is the intended contract:
    // the outcome map drives which visual state the OUT cell is in, but
    // the GREEN styling only fires once hasValue is also true (Transmitter
    // has written). This test pins that the outcome record stays in place.
    expect(interactionsSrc).toMatch(
      /gateOutcomes\.current\.set\(pulse, pass \? 'passed' : 'blocked'\)/,
    );
  });
});

// ─── Fix 4 — Progressive Lag ────────────────────────────────────────────────

describe('Fix 4A — safety timer cleanup at engage start', () => {
  it('handleEngage clears safetyTimersRef before starting a new run', () => {
    // Stale 8s force-resume timers from the previous run must be
    // cancelled so they cannot fire into a new run's animation state.
    const engageBlock = gameplaySrc.match(
      /beamOpacity\.setValue\(1\);[\s\S]*?const lockedElapsed = elapsedSeconds;/,
    );
    expect(engageBlock).not.toBeNull();
    expect(engageBlock?.[0]).toMatch(
      /safetyTimersRef\.current\.forEach\(t => clearTimeout\(t\)\)/,
    );
    expect(engageBlock?.[0]).toMatch(/safetyTimersRef\.current = \[\]/);
  });
});

describe('Fix 4B — replay loop removed after level success', () => {
  it('GameplayScreen does not call runReplayLoop after handleSuccess', () => {
    // The replay loop caused animation accumulation that produced the
    // progressive lag Tucker saw on A1-7/A1-8 when playing sequentially.
    // The board now stays in the static locked success state.
    const postSuccessBlock = gameplaySrc.match(
      /if \(routed\) return;[\s\S]*?\} else \{[\s\S]*?handleVoidFailure/,
    );
    expect(postSuccessBlock).not.toBeNull();
    expect(postSuccessBlock?.[0]).not.toMatch(/runReplayLoop/);
    expect(postSuccessBlock?.[0]).not.toMatch(/loopingRef\.current = true/);
  });

  it('GameplayScreen does not import runReplayLoop', () => {
    expect(gameplaySrc).not.toMatch(/runReplayLoop,/);
  });

  it('CONTINUE handler still stops looping and clears RAF frames', () => {
    // Even without an active loop, the CONTINUE handler must still run
    // its cleanup so any edge-case lingering frames are cancelled.
    const continueBlock = gameplaySrc.match(
      /label="CONTINUE"[\s\S]*?onPress=\{[\s\S]*?\(\) => \{[\s\S]*?setShowResults\(true\)/,
    );
    expect(continueBlock).not.toBeNull();
    expect(continueBlock?.[0]).toMatch(/loopingRef\.current = false/);
    expect(continueBlock?.[0]).toMatch(/animFrameRef\.current\.forEach/);
  });
});
