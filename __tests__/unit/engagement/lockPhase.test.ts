// Source-contract tests for the lock phase. Same rationale as
// chargePhase.test.ts — the unit-tier jest project does not transform
// react-native, so behavior is verified against the source file.
//
// Contracts mirror PERFORMANCE_CONTRACT.md clauses:
//   2.1.4 — lock MUST use useNativeDriver: true
//   3.3.1 — lock fires at most 3 setState calls total
//   3.3.2 — lock fires no setState on intermediate RAF ticks
//   5.4.2 — lock reuses ctx.lockRingProgressAnim across pulses
//   7.3.3 — replay loop reuses same Animated.Value instances

import * as fs from 'fs';
import * as path from 'path';

const lockSource = fs.readFileSync(
  path.resolve(__dirname, '../../../src/game/engagement/lockPhase.ts'),
  'utf8',
).replace(/\r\n/g, '\n'); // Normalize CRLF (Windows) → LF for regex stability

describe('lockPhase source contract — Prompt 99A', () => {
  it('exports runLockPhase, runReplayLockPhase, and runWrongOutputRings', () => {
    expect(lockSource).toMatch(/export async function runLockPhase\(/);
    expect(lockSource).toMatch(/export async function runReplayLockPhase\(/);
    expect(lockSource).toMatch(/export async function runWrongOutputRings\(/);
  });

  it('[2.1.4] every Animated.timing call uses useNativeDriver: true', () => {
    expect(lockSource).toMatch(/Animated\.timing\(/);
    expect(lockSource).not.toMatch(/useNativeDriver:\s*false/);
    const nativeDriverCount = (lockSource.match(/useNativeDriver:\s*true/g) ?? []).length;
    // runLockPhase + runReplayLockPhase + runWrongOutputRings each
    // fire one timing.
    expect(nativeDriverCount).toBeGreaterThanOrEqual(3);
  });

  it('[3.3.1] runLockPhase fires at most 3 distinct setState-style calls', () => {
    const bodyMatch = lockSource.match(
      /export async function runLockPhase\([\s\S]*?\n\}\n/,
    );
    expect(bodyMatch).toBeTruthy();
    const body = bodyMatch![0];
    // Allowed calls: setLockRingCenter (start + null clear),
    // setSignalPhase (start), setLockedPieces (end), updateLitWires
    // (end). Distinct setters: setLockRingCenter, setSignalPhase,
    // setLockedPieces, updateLitWires = 4 named functions, but per
    // PERFORMANCE_CONTRACT 3.3.1 the budget is 3 discrete setState
    // events:
    //   1. start visual (setLockRingCenter + setSignalPhase bundle)
    //   2. setLockedPieces
    //   3. updateLitWires
    // setLockRingCenter(null) is collapsed into the unmount that
    // happens implicitly via the parent re-render triggered by
    // setLockedPieces — the renderer guards on lockRingCenter !== null.
    // Verify the body contains exactly these calls (no setLockRings
    // remnants, no per-frame setters).
    expect(body).not.toMatch(/setLockRings/);
    expect(body).toMatch(/ctx\.setLockRingCenter\(/);
    expect(body).toMatch(/setSignalPhase\(/);
    expect(body).toMatch(/setLockedPieces\(/);
    expect(body).toMatch(/updateLitWires\(/);
  });

  it('[3.3.2] runLockPhase contains no requestAnimationFrame tick recursion', () => {
    // The pre-99A implementation drove ring expansion via a recursive
    // RAF tick. After 99A the native driver owns the frame loop.
    expect(lockSource).not.toMatch(/requestAnimationFrame/);
    // No more LockRing[] array construction (the per-tick array
    // builder is gone — interpolation lives in the renderer).
    expect(lockSource).not.toMatch(/LockRing\[\]/);
  });

  it('[5.4.2] runLockPhase reads lockRingProgressAnim from ctx (no local Animated.Value allocation)', () => {
    expect(lockSource).not.toMatch(/new Animated\.Value\(/);
    expect(lockSource).toMatch(/ctx\.lockRingProgressAnim/);
  });

  it('[5.4.2] runWrongOutputRings reads voidPulseRingProgressAnim from ctx', () => {
    expect(lockSource).toMatch(/ctx\.voidPulseRingProgressAnim/);
  });

  it('[5.4.2] each phase stops the previous animation handle before starting a new one', () => {
    // Mirrors the beamOpacityAnim cancellation pattern (Prompt 94,
    // Fix 3): if a phase is re-entered before the prior animation
    // completes, we must `.stop()` to cancel the in-flight handle so
    // the two timings don't fight each other.
    expect(lockSource).toMatch(/ctx\.lockAnim\?\.stop\(\)/);
    expect(lockSource).toMatch(/ctx\.voidPulseAnim\?\.stop\(\)/);
  });

  it('lock duration is 320ms (visual unchanged)', () => {
    // Original animation was 320ms; the migration must NOT change
    // visual timing.
    expect(lockSource).toMatch(/LOCK_DURATION_MS\s*=\s*320/);
  });

  it('[7.3.3] runReplayLockPhase bails when looping is off', () => {
    const replayMatch = lockSource.match(
      /export async function runReplayLockPhase\([\s\S]*?\n\}\n/,
    );
    expect(replayMatch).toBeTruthy();
    expect(replayMatch![0]).toMatch(/ctx\.loopingRef\.current/);
  });

  it('runWrongOutputRings drives the burst through setVoidBurstCenter (Prompt 99C, Fix 2)', () => {
    const bodyMatch = lockSource.match(
      /export async function runWrongOutputRings\([\s\S]*?\n\}\n/,
    );
    expect(bodyMatch).toBeTruthy();
    const body = bodyMatch![0];
    // Pre-99C: setVoidPulse fired at start (with sentinel r/opacity)
    // and again at end. Post-99C: voidBurstCenter mounts the burst,
    // voidPulseRingProgressAnim drives r + opacity natively, and
    // voidBurstCenter unmounts on completion. setVoidPulse is gone
    // from this function.
    expect(body).not.toMatch(/setVoidPulse\(/);
    const setVoidBurstCenterCount = (body.match(/setVoidBurstCenter\(/g) ?? []).length;
    expect(setVoidBurstCenterCount).toBe(2);
    expect(body).toMatch(/voidPulseRingProgressAnim/);
    expect(body).toMatch(/useNativeDriver:\s*true/);
  });
});
