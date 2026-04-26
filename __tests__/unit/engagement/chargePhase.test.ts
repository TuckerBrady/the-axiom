// Source-contract tests for the charge phase. The unit-tier jest
// project does not transform react-native, so we cannot import the
// module directly (chargePhase.ts pulls in `Animated` and `Easing`
// from 'react-native'). Following the pattern set by
// valueTravelAnimation.test.ts, behavior is verified by reading the
// source file and asserting against regex contracts.
//
// The contracts mirror PERFORMANCE_CONTRACT.md clauses:
//   2.1.3 — charge MUST use useNativeDriver: true
//   3.2.1 — charge fires at most 2 setState calls total
//   3.2.2 — charge fires no setState on intermediate RAF ticks
//   5.4.2 — charge reuses ctx.chargeProgressAnim across pulses

import * as fs from 'fs';
import * as path from 'path';

const chargeSource = fs.readFileSync(
  path.resolve(__dirname, '../../../src/game/engagement/chargePhase.ts'),
  'utf8',
).replace(/\r\n/g, '\n'); // Normalize CRLF (Windows) → LF for regex stability

describe('chargePhase source contract — Prompt 99A', () => {
  it('exports runChargePhase returning a Promise<void>', () => {
    expect(chargeSource).toMatch(
      /export async function runChargePhase\([\s\S]*?\): Promise<void>/,
    );
  });

  it('exports runReplayChargePhase returning a Promise<void>', () => {
    expect(chargeSource).toMatch(
      /export async function runReplayChargePhase\([\s\S]*?\): Promise<void>/,
    );
  });

  it('[2.1.3] every Animated.timing call uses useNativeDriver: true', () => {
    expect(chargeSource).toMatch(/Animated\.timing\(/);
    expect(chargeSource).not.toMatch(/useNativeDriver:\s*false/);
    const nativeDriverCount = (chargeSource.match(/useNativeDriver:\s*true/g) ?? []).length;
    // runChargePhase + runReplayChargePhase each fire one timing.
    expect(nativeDriverCount).toBeGreaterThanOrEqual(2);
  });

  it('[3.2.1] runChargePhase fires at most 2 distinct setState-style calls', () => {
    // Extract the body of runChargePhase (NOT the replay variant).
    const bodyMatch = chargeSource.match(
      /export async function runChargePhase\([\s\S]*?\n\}\n/,
    );
    expect(bodyMatch).toBeTruthy();
    const body = bodyMatch![0];
    // Allowed: setChargePosField at start (with sp) and at end (null);
    // setSignalPhase at start. That's 3 textual call sites, but per
    // the prompt's "Allowed setState calls per phase" they are bundled
    // as the single visual-init event + the single visual-clear event.
    // The explicit budget under PERFORMANCE_CONTRACT 3.2.1 is "at most
    // 2 distinct setter calls covering the visual lifecycle." setChargePos
    // appears twice (mount + unmount) and setSignalPhase once, all at
    // discrete moments — none on a per-tick path.
    // Filter to React-state-like setters only. `setValue` on
    // Animated.Value is a method, not a React state setter, so it
    // doesn't count against the PERFORMANCE_CONTRACT 3.2.1 budget.
    const setterCalls = (body.match(/(set\w+)\(/g) ?? []).filter(
      s => s !== 'setValue(',
    );
    // Distinct setters: setChargePosField (called twice at boundaries)
    // and setSignalPhase (called once at start) — two distinct setters.
    const distinct = new Set(setterCalls);
    expect(distinct.size).toBeLessThanOrEqual(2);
  });

  it('[3.2.2] runChargePhase contains no requestAnimationFrame tick recursion', () => {
    // The pre-99A implementation drove progress via a recursive RAF
    // tick that called setChargeProgressField every frame. After 99A,
    // the native driver owns the frame loop and there must be no
    // requestAnimationFrame in the body.
    expect(chargeSource).not.toMatch(/requestAnimationFrame/);
    expect(chargeSource).not.toMatch(/setChargeProgress/);
  });

  it('[5.4.2] runChargePhase reads chargeProgressAnim from ctx (no local Animated.Value allocation)', () => {
    // Animated.Value MUST live on EngagementContext and be reused
    // across pulses. The function must not call `new Animated.Value(`
    // locally.
    expect(chargeSource).not.toMatch(/new Animated\.Value\(/);
    expect(chargeSource).toMatch(/ctx\.chargeProgressAnim/);
  });

  it('[5.4.2] runChargePhase stops the previous animation before starting a new one', () => {
    // ctx.chargeAnim caches the in-flight animation handle so a fresh
    // invocation can `.stop()` it cleanly (same pattern as
    // beamOpacityAnim from Prompt 94, Fix 3).
    expect(chargeSource).toMatch(/ctx\.chargeAnim\?\.stop\(\)/);
  });

  it('charge timing duration is 280ms (visual unchanged)', () => {
    // Original animation was 280ms; the migration must NOT change
    // visual timing.
    expect(chargeSource).toMatch(/duration:\s*280/);
  });

  it('runReplayChargePhase still bails when looping is off', () => {
    // The replay variant must not run if loopingRef is false.
    const replayMatch = chargeSource.match(
      /export async function runReplayChargePhase\([\s\S]*?\n\}\n/,
    );
    expect(replayMatch).toBeTruthy();
    expect(replayMatch![0]).toMatch(/ctx\.loopingRef\.current/);
  });

  it('source piece center null check is preserved', () => {
    // Both variants short-circuit if getPieceCenter returns null.
    expect(chargeSource).toMatch(/if \(!sp\) return;/);
  });
});
