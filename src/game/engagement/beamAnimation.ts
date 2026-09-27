import { Animated } from 'react-native';
import type { EngagementContext, ExecutionStep, Pt } from './types';
import { getPulseSpeed, computeWaypointDists } from '../bubbleMath';
import {
  buildSignalPath,
  posAlongPath,
  getBeamColor,
  TAPE_PIECE_COLORS,
  shimmer,
} from './constants';
import { beamTravelMs, beamHeadDistance, deriveSegmentDataFlags } from './beamData';
import {
  applyFlashBatch,
  makeFlashBatch,
} from './bubbleHelpers';
import { triggerPieceAnim } from './interactions';
import { raceWithTimeout } from './runGuard';

// AXM-036 P9-3 (F9): a failed run's void burst must not hang forever
// on a native Animated callback that never fires. 500ms of headroom on
// top of the burst's own duration is generous slack for a callback
// that is merely late, while still bounding the worst case (P9-4).
const VOID_BURST_TIMEOUT_SLACK_MS = 500;

// REQ-G-05 / SE-BEAM-082 — linear RGB blend between two '#RRGGBB' colors at
// t in [0, 1]. Segment colors always come from getBeamColor(), which only
// ever returns plain hex literals, so no rgba/named-color parsing is needed.
function lerpHexColor(fromHex: string, toHex: string, t: number): string {
  const parse = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });
  const a = parse(fromHex);
  const b = parse(toHex);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}

// Beam-dim level while a tape piece is processing (Prompt 91, Fix 5).
// 0.3 reads as "energy is over there now, not in the wire" without
// being so dim that the beam looks broken. Transition is 200ms each
// way per the prompt.
const BEAM_DIM_OPACITY = 0.3;
const BEAM_BRIGHT_OPACITY = 1;
const BEAM_DIM_DURATION_MS = 200;

// dim/brighten share the same Animated.Value (ctx.beamOpacity).
// If the beam dims and then brightens (or the inverse) inside the
// 200ms transition window, the second timing's `.start()` doesn't
// implicitly cancel the first — they overlap, fight, and the value
// follows the last writer rather than smoothly inverting (Prompt 94,
// Fix 3). ctx.beamOpacityAnim caches the current handle so each
// caller can `.stop()` it before queuing the next.
// Exported for the beamPerformance [2.1.1] test surface (Prompt 99A).
// Behavior is unchanged from the pre-99A internal version — this just
// promotes the helpers to module exports so the SE test can invoke
// them directly to verify useNativeDriver: true is set.
export function dimBeam(ctx: EngagementContext): void {
  ctx.beamOpacityAnim?.stop();
  ctx.beamOpacityAnim = Animated.timing(ctx.beamOpacity, {
    toValue: BEAM_DIM_OPACITY,
    duration: BEAM_DIM_DURATION_MS,
    useNativeDriver: true,
  });
  ctx.beamOpacityAnim.start();
}

export function brightenBeam(ctx: EngagementContext): void {
  ctx.beamOpacityAnim?.stop();
  ctx.beamOpacityAnim = Animated.timing(ctx.beamOpacity, {
    toValue: BEAM_BRIGHT_OPACITY,
    duration: BEAM_DIM_DURATION_MS,
    useNativeDriver: true,
  });
  ctx.beamOpacityAnim.start();
}

// BranchSlot identifies where a running path's head/trail should be
// written in BeamState. `null` = main (non-fork) beam — update `trails`
// + `heads`. `0` or `1` = fork branch A or B — update
// `branchTrails[branchSlot]` and `heads[branchSlot]`.
type BranchSlot = 0 | 1 | null;

// AXM-036 P4a (F13b): describes a data-carrying segment (this segment's
// leg of the beam has passed a Scanner/Inverter/Latch read, or inherits
// that from a Splitter's pre-fork carryIn). `data` is optional at the
// BeamState type level (see types.ts) but always populated here — the
// only production writer.
type TrailSeg = { points: Pt[]; color: string; data: boolean };

export function runLinearPath(
  ctx: EngagementContext,
  pathSteps: ExecutionStep[],
  branchSlot: BranchSlot,
  speedMultiplier: number,
  // AXM-036 P4a-7 (F13b): true when this path continues a data-carrying
  // beam from an upstream Splitter pre-fork leg. Resolves to this path's
  // own last segment flag (or `carryIn` unchanged if it has no segments),
  // so runPulse can hand that to both branch calls after a fork.
  carryIn = false,
): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    // AXM-036 P9-1 (F9): register a force-settle callback so a
    // cancelled or reset run (cancelAllFrames flushes
    // ctx.pendingResolversRef) resolves this promise instead of
    // hanging forever on an RAF loop that has just been cancelled and
    // will never tick again. `settle` is the only path that resolves
    // this promise — every branch below calls it instead of `resolve`
    // directly — so cancellation and normal completion can never
    // double-resolve or leak a stale entry in the registry.
    let hasSettled = false;
    let settleValue = carryIn;
    const settle = (value: boolean): void => {
      if (hasSettled) return;
      hasSettled = true;
      ctx.pendingResolversRef.current.delete(forceSettle);
      resolve(value);
    };
    const forceSettle = (): void => settle(settleValue);
    ctx.pendingResolversRef.current.add(forceSettle);

    const waypoints: Pt[] = [];
    for (const st of pathSteps) {
      const c = ctx.getPieceCenter(st.pieceId);
      if (c) waypoints.push(c);
    }
    if (waypoints.length < 2) {
      if (pathSteps[0]) triggerPieceAnim(ctx, pathSteps[0]);
      setTimeout(() => settle(carryIn), 180);
      return;
    }
    const path = buildSignalPath(waypoints);
    const waypointDists = computeWaypointDists(waypoints);
    const totalMs = beamTravelMs(path.total, ctx.CELL_SIZE, speedMultiplier);
    const segColors = pathSteps.map(s => getBeamColor(s.type));
    // Indexed the same way segColors is (by pathSteps position, one
    // entry per segment leaving that step) — see the P4a-7 note in
    // beamData.ts for the derivation.
    const segFlags = deriveSegmentDataFlags(pathSteps, carryIn);
    const lastFlag = segFlags.length > 0 ? segFlags[segFlags.length - 1] : carryIn;
    settleValue = lastFlag;
    const hasVoid = pathSteps.some(s => s.type === 'void');

    // Seed trail with a placeholder empty segment so the beam's color
    // identity shows before the head moves.
    applyFrame({
      trail: [{ points: [], color: segColors[0] ?? '#8B5CF6', data: segFlags[0] ?? carryIn }],
      head: null,
      headColor: null,
      newLitWires: null,
    });

    const t0 = performance.now();
    const lit = new Set<number>();
    const flashed = new Set<number>();
    let pauseStart = 0;
    let pauseAccum = 0;
    let pauseEnd = 0;
    // Number of tape-piece interactions whose pause is still in
    // flight. Multiple tape pieces can flash on a single tick
    // (easeOut3 + RAF granularity packs early waypoints into ~80 ms
    // on a full-speed pulse, and on Splitter pre-fork paths several
    // tape pieces can clear the same wpDist threshold). Pre-Prompt 98
    // the pause was released as soon as ANY one promise resolved,
    // collapsing pauseEnd while the second tape animation was still
    // running — the bookkeeping then raced and `rawT` went
    // catastrophically negative.
    //
    // Closure-scoped (per `runLinearPath` invocation) NOT module-
    // scoped: each Splitter branch runs its own `runLinearPath`
    // with its own pauseStart / pauseEnd / pauseAccum, so the
    // counter must follow the same scoping. A module-scoped
    // counter would let branch A's tape pause leak into branch B.
    let inFlightTapePauses = 0;

    // REQ-G-05 / SE-BEAM-082 (Handoff 003) — one JS-driven Animated.Value
    // per active trail (closure-scoped per runLinearPath invocation, same
    // reasoning as inFlightTapePauses above — a Splitter's two branches
    // each get their own crossfade, never sharing one). useNativeDriver:
    // false per ANIMATION_RULES.md; color interpolation isn't
    // native-drivable here regardless, and this value never backs an
    // Animated.View host (it's read via addListener into a plain string
    // baked into TrailSeg.color, rendered on a plain, non-Animated
    // <Polyline>), so the single-host invariant doesn't apply to it.
    // Crossfades the ACTIVE (currently-forming) segment's stroke smoothly
    // from the previous segment's color to its own over 300ms when the two
    // differ — i.e. when the beam crosses a Physics/Protocol category
    // boundary — instead of the segment's color snapping the instant the
    // boundary is crossed.
    const crossfadeAnim = new Animated.Value(0);
    let crossfadeLiveValue = 1; // 1 = settled on the active segment's own color
    const crossfadeListenerId = crossfadeAnim.addListener(({ value }) => {
      crossfadeLiveValue = value;
    });
    let lastActiveSegIdx = -1;
    let crossfadeFromColor: string | null = null;
    let crossfadeToColor: string | null = null;

    function applyFrame(update: {
      trail: TrailSeg[] | null;
      head: Pt | null | undefined; // undefined = no change, null = clear
      headColor: string | null;
      newLitWires: string[] | null;
      // AXM-036 P4a-9 (F13b): omitted (not just falsy) on frames that
      // don't recompute them, so the seed/truncate/clear frames below
      // leave the tick loop's last values in place instead of stomping
      // them back to 0/false every time they run.
      shimmer?: number;
      headData?: boolean;
    }): void {
      ctx.setBeamState(prev => {
        const next = { ...prev };
        // Trail routing — main vs branch slot.
        if (update.trail !== null) {
          if (branchSlot === null) {
            next.trails = update.trail;
          } else {
            const branchTrails = [prev.branchTrails[0] ?? [], prev.branchTrails[1] ?? []];
            branchTrails[branchSlot] = update.trail;
            next.branchTrails = branchTrails;
          }
        }
        // Head routing — branch slot writes to heads[slot]; main writes
        // the whole heads array.
        if (update.head !== undefined) {
          if (branchSlot === null) {
            next.heads = update.head ? [update.head] : [];
          } else {
            const heads = [...prev.heads];
            // Ensure the slot exists.
            while (heads.length <= branchSlot) heads.push({ x: 0, y: 0 });
            if (update.head) {
              heads[branchSlot] = update.head;
            } else {
              // Clearing a branch head — shrink the array by filtering
              // out just that slot so the other branch's head still
              // renders.
              heads.splice(branchSlot, 1);
            }
            next.heads = heads;
          }
        }
        if (update.headColor !== null) {
          next.headColor = update.headColor;
        }
        if (update.shimmer !== undefined) {
          next.shimmer = update.shimmer;
        }
        if (update.headData !== undefined) {
          next.headData = update.headData;
        }
        if (update.newLitWires && update.newLitWires.length > 0) {
          const lw = new Set(prev.litWires);
          for (const w of update.newLitWires) lw.add(w);
          next.litWires = lw;
        }
        return next;
      });
    }

    const tick = (): void => {
      const now = performance.now();
      if (pauseEnd > 0 && now < pauseEnd) {
        ctx.animFrameRef.current.set(branchSlot, requestAnimationFrame(tick));
        return;
      }
      if (pauseEnd > 0) {
        // Guard against pauseStart having been zeroed by an
        // out-of-order tape promise resolution (Prompt 98, Fix 1).
        // If pauseStart is 0 and pauseEnd is non-zero, the difference
        // would equal the entire app uptime — that lands in
        // pauseAccum and rawT goes catastrophically negative,
        // freezing the tick loop. Skipping accumulation when the
        // start is missing is correct: the only way to have
        // pauseEnd > 0 with pauseStart === 0 is if the bookkeeping
        // already raced; the safest thing is not to compound the
        // damage.
        if (pauseStart > 0) {
          pauseAccum += (pauseEnd - pauseStart);
        }
        pauseEnd = 0;
        pauseStart = 0;
      }
      // AXM-036 P4a-1 (F4): linear head travel, no easeOut3 — a straight
      // fraction-of-elapsed-time-over-totalMs (pause time excluded, same
      // as before) drives beamHeadDistance. No deceleration into any
      // waypoint or the Terminal.
      const elapsedMs = now - t0 - pauseAccum;
      const rawT = totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 1;
      const headDist = beamHeadDistance(elapsedMs, totalMs, path.total);
      const head = posAlongPath(path, headDist);

      const newSegs: TrailSeg[] = [];
      for (let i = 0; i < path.segs.length; i++) {
        const sg = path.segs[i];
        const color = segColors[i] ?? '#F0B429';
        const data = segFlags[i] ?? false;
        if (headDist >= sg.e) {
          newSegs.push({ points: [{ x: sg.x0, y: sg.y0 }, { x: sg.x0 + sg.dx, y: sg.y0 + sg.dy }], color, data });
        } else if (headDist > sg.s) {
          const tt = sg.l > 0 ? (headDist - sg.s) / sg.l : 0;
          newSegs.push({ points: [{ x: sg.x0, y: sg.y0 }, { x: sg.x0 + sg.dx * tt, y: sg.y0 + sg.dy * tt }], color, data });
          break;
        }
      }

      // REQ-G-05 / SE-BEAM-082 — the active (currently-forming) segment is
      // always the last entry pushed above. When it advances to a new
      // index whose color differs from the segment just completed, that's
      // a category-boundary crossing: kick a fresh 300ms crossfade from the
      // old color to the new one, JS-driven per ANIMATION_RULES.md.
      const activeSegIdx = newSegs.length - 1;
      if (activeSegIdx >= 0 && activeSegIdx !== lastActiveSegIdx) {
        const toColor = segColors[activeSegIdx] ?? '#F0B429';
        if (lastActiveSegIdx >= 0) {
          const fromColor = segColors[lastActiveSegIdx] ?? toColor;
          if (fromColor !== toColor) {
            crossfadeFromColor = fromColor;
            crossfadeToColor = toColor;
            crossfadeAnim.stopAnimation();
            crossfadeAnim.setValue(0);
            Animated.timing(crossfadeAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }).start();
          }
        }
        lastActiveSegIdx = activeSegIdx;
      }
      if (
        activeSegIdx >= 0 &&
        crossfadeLiveValue < 1 &&
        crossfadeFromColor &&
        crossfadeToColor
      ) {
        newSegs[activeSegIdx] = {
          ...newSegs[activeSegIdx],
          color: lerpHexColor(crossfadeFromColor, crossfadeToColor, crossfadeLiveValue),
        };
      }

      const currentColor = hasVoid && rawT > 0.85
        ? '#FF3B3B'
        : (newSegs.length > 0 ? newSegs[newSegs.length - 1].color : '#8B5CF6');

      // Collect newly-lit connectors (rising-edge, per wire mid-point)
      // into an array instead of firing a setter per wire. Most frames
      // don't light any new wires — this is usually an empty array.
      const newLitWires: string[] = [];
      for (let i = 0; i < path.segs.length; i++) {
        if (lit.has(i)) continue;
        const mid = path.segs[i].s + path.segs[i].l / 2;
        if (headDist >= mid) {
          lit.add(i);
          const fromId = pathSteps[i].pieceId;
          const toId = pathSteps[i + 1]?.pieceId;
          if (fromId && toId) {
            newLitWires.push(`${fromId}_${toId}`);
            newLitWires.push(`${toId}_${fromId}`);
          }
        }
      }

      // AXM-036 P4a-9 (F13b): shimmer(t) off the existing RAF clock, and
      // whether the head currently sits on a data-carrying segment
      // (activeSegIdx, computed above for the crossfade check).
      const activeSegFlag = activeSegIdx >= 0 ? (segFlags[activeSegIdx] ?? false) : false;
      const shimmerVal = shimmer(now);

      // ONE setBeamState per tick — trail, head, headColor, shimmer,
      // headData and any newly lit wires bundled into a single
      // reconciliation.
      applyFrame({
        trail: newSegs,
        head,
        headColor: currentColor,
        newLitWires: newLitWires.length > 0 ? newLitWires : null,
        shimmer: shimmerVal,
        headData: activeSegFlag,
      });

      // Per-tick piece-anim batch (Prompt 99C, Fix 1 option b /
      // clause 7.1.1). Every flash + animation tag + gate result that
      // crosses its threshold this frame accumulates here, and a
      // single applyFlashBatch call below dispatches the lot in one
      // setPieceAnimState (clause 3.1.3). Pre-99C each waypoint
      // dispatched its own setter, blowing the budget on dense ticks.
      const tickBatch = makeFlashBatch();

      for (let i = 0; i < waypoints.length; i++) {
        if (flashed.has(i)) continue;
        const wpDist = waypointDists[i];
        if (headDist >= wpDist || (i === waypoints.length - 1 && rawT >= 1)) {
          flashed.add(i);
          const stp = pathSteps[i];
          const isVoidBlocker = hasVoid && i === waypoints.length - 1;
          if (isVoidBlocker) tickBatch.flashes.push({ pieceId: stp.pieceId, color: '#FF3B3B' });
          else {
            const isTapePiece = !!TAPE_PIECE_COLORS[stp.type];
            if (isTapePiece) {
              // Snap the beam head + trail to the piece center
              // (Prompt 91, Fix 4). Without this, the head visibly
              // freezes a frame past the waypoint — the RAF
              // granularity puts it at the piece's far edge by the
              // time we cross the wpDist threshold. Re-apply the
              // trail truncated to wpDist and pin the head to
              // waypoints[i] so the visual stop is centered.
              const wp = waypoints[i];
              const truncSegs: TrailSeg[] = [];
              for (let j = 0; j < path.segs.length; j++) {
                const sg = path.segs[j];
                const color = segColors[j] ?? '#F0B429';
                const data = segFlags[j] ?? false;
                if (wpDist >= sg.e) {
                  truncSegs.push({
                    points: [
                      { x: sg.x0, y: sg.y0 },
                      { x: sg.x0 + sg.dx, y: sg.y0 + sg.dy },
                    ],
                    color,
                    data,
                  });
                } else if (wpDist > sg.s) {
                  const tt = sg.l > 0 ? (wpDist - sg.s) / sg.l : 0;
                  truncSegs.push({
                    points: [
                      { x: sg.x0, y: sg.y0 },
                      { x: sg.x0 + sg.dx * tt, y: sg.y0 + sg.dy * tt },
                    ],
                    color,
                    data,
                  });
                  break;
                }
              }
              const snapColor =
                truncSegs.length > 0
                  ? truncSegs[truncSegs.length - 1].color
                  : segColors[i] ?? '#F0B429';
              applyFrame({
                trail: truncSegs,
                head: wp,
                headColor: snapColor,
                newLitWires: null,
              });

              // Dim the beam while the tape piece processes
              // (Prompt 91, Fix 5). brighten only when the LAST
              // in-flight pause settles (counter 1→0 below).
              dimBeam(ctx);

              const now2 = performance.now();
              if (inFlightTapePauses === 0) {
                // First tape pause in this batch — anchor the
                // pauseStart / pauseEnd window. Subsequent pauses
                // queued in the same tick join the existing window
                // instead of overwriting pauseStart, which would
                // shrink the accumulated pause duration relative to
                // wall time.
                pauseStart = now2;
                pauseEnd = now2 + 1e9;
              }
              inFlightTapePauses++;
              // Per-pause resolver flag (Prompt 98, Fix 3). Both the
              // promise settle path and the 8 s safety timer race to
              // close out this pause; `resolved` ensures the counter
              // decrements exactly once and the safety timer can't
              // double-decrement after the promise has already
              // settled.
              const tapeResolver = { resolved: false };
              const settleTapePause = (): void => {
                if (tapeResolver.resolved) return;
                tapeResolver.resolved = true;
                inFlightTapePauses--;
                if (inFlightTapePauses === 0) {
                  pauseEnd = performance.now();
                  brightenBeam(ctx);
                }
              };
              // Safety net: force-resume the beam after 8s if the
              // interaction promise never settles. Routed through
              // safetyTimersRef (Prompt 95, Fix 7) so the per-pulse
              // flash-timer sweep (Prompt 94) can't clear an
              // in-flight safety timer mid-pause.
              const safetyTimer = setTimeout(settleTapePause, 8000);
              ctx.safetyTimersRef.current.push(safetyTimer);
              triggerPieceAnim(ctx, stp, tickBatch)
                .then(() => {
                  clearTimeout(safetyTimer);
                  settleTapePause();
                })
                .catch(() => {
                  clearTimeout(safetyTimer);
                  settleTapePause();
                });
            } else {
              triggerPieceAnim(ctx, stp, tickBatch);
            }
          }
        }
      }
      // Flush the per-tick batch in one setPieceAnimState (clause
      // 3.1.3 / 7.1.1). No-op if nothing crossed this frame.
      applyFlashBatch(ctx, tickBatch);
      if (rawT < 1) {
        ctx.animFrameRef.current.set(branchSlot, requestAnimationFrame(tick));
      } else {
        // Final frame for this slot — clear the entry so cleanup
        // doesn't try to cancel an id whose callback already
        // resolved.
        ctx.animFrameRef.current.delete(branchSlot);
        if (hasVoid) {
          // Void burst (Prompt 99C, Fix 2). Pre-99C this fired
          // setVoidPulse on every RAF tick for the 320ms burst — ~19
          // setState calls per voided pulse. Now: mount the burst
          // anchor once, drive radius/opacity from
          // voidPulseRingProgressAnim with useNativeDriver: true, and
          // unmount once the timing settles. Two setState calls
          // total (mount + unmount) for the entire burst.
          // PERFORMANCE_CONTRACT 2.1.5, 3.1.4.
          const blocker = waypoints[waypoints.length - 1];
          ctx.setVoidBurstCenter({ x: blocker.x, y: blocker.y });
          ctx.voidPulseAnim?.stop();
          ctx.voidPulseRingProgressAnim.setValue(0);
          // AXM-036 P9-3 (F9): the void burst's completion callback is a
          // native Animated bridge round-trip that can, in the field,
          // never fire. Race it against a bounded timeout so this run
          // resolves either way instead of leaving isExecuting stuck
          // true forever (Build 49's reported stall).
          raceWithTimeout(
            new Promise<void>(res => {
              ctx.voidPulseAnim = Animated.timing(ctx.voidPulseRingProgressAnim, {
                toValue: 1,
                duration: 320,
                useNativeDriver: true,
              });
              ctx.voidPulseAnim.start(() => {
                ctx.voidPulseAnim = null;
                res();
              });
            }),
            320 + VOID_BURST_TIMEOUT_SLACK_MS,
            () => undefined,
          ).then(() => {
            ctx.setVoidBurstCenter(null);
            applyFrame({ trail: [], head: null, headColor: null, newLitWires: null });
            crossfadeAnim.removeListener(crossfadeListenerId);
            crossfadeAnim.stopAnimation();
            settle(lastFlag);
          });
        } else {
          applyFrame({ trail: [], head: null, headColor: null, newLitWires: null });
          crossfadeAnim.removeListener(crossfadeListenerId);
          crossfadeAnim.stopAnimation();
          settle(lastFlag);
        }
      }
    };
    ctx.animFrameRef.current.set(branchSlot, requestAnimationFrame(tick));
  });
}

export function runPulse(
  ctx: EngagementContext,
  pulseSteps: ExecutionStep[],
): Promise<void> {
  return new Promise<void>(resolveAll => {
    const speed = getPulseSpeed(ctx.currentPulseRef.current);
    const forkIdx = pulseSteps.findIndex(s => s.type === 'splitter');
    const hasABranch = pulseSteps.some(s => s.branchId === 'A');
    const hasBBranch = pulseSteps.some(s => s.branchId === 'B');

    if (forkIdx === -1 || !hasABranch || !hasBBranch) {
      runLinearPath(ctx, pulseSteps, null, speed).then(() => resolveAll());
      return;
    }

    const preForkSteps = pulseSteps.slice(0, forkIdx + 1);
    const branchASteps = pulseSteps.filter(s => s.branchId === 'A');
    const branchBSteps = pulseSteps.filter(s => s.branchId === 'B');

    const forkPt = ctx.getPieceCenter(pulseSteps[forkIdx].pieceId);

    // AXM-036 P4a-7 (F13b): both branches inherit the pre-fork leg's own
    // last segment flag (resolved from runLinearPath below) as their
    // carryIn — the beam either enters the fork already carrying data,
    // or it doesn't, and both branches agree.
    runLinearPath(ctx, preForkSteps, null, speed).then((preForkCarry) => {
      if (!forkPt) { resolveAll(); return; }

      const splitterStep = pulseSteps[forkIdx];
      const aSteps = [splitterStep, ...branchASteps];
      const bSteps = [splitterStep, ...branchBSteps];

      Promise.all([
        runLinearPath(ctx, aSteps, 0, speed, preForkCarry),
        runLinearPath(ctx, bSteps, 1, speed, preForkCarry),
      ]).then(() => {
        // Final cleanup — clear heads + main trails + branch trails in
        // one reconciliation.
        ctx.setBeamState(prev => ({
          ...prev,
          heads: [],
          trails: [],
          branchTrails: [],
        }));
        resolveAll();
      });
    });
  });
}
