import { Animated } from 'react-native';
import type { EngagementContext, ExecutionStep, Pt } from './types';
import { getPulseSpeed, computeWaypointDists } from '../bubbleMath';
import {
  buildSignalPath,
  posAlongPath,
  easeOut3,
  getBeamColor,
  TAPE_PIECE_COLORS,
} from './constants';
import { flashPiece } from './bubbleHelpers';
import { triggerPieceAnim } from './interactions';
import {
  setVoidPulse,
} from './stateHelpers';

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

type TrailSeg = { points: Pt[]; color: string };

export function runLinearPath(
  ctx: EngagementContext,
  pathSteps: ExecutionStep[],
  branchSlot: BranchSlot,
  speedMultiplier: number,
): Promise<void> {
  return new Promise<void>(resolve => {
    const waypoints: Pt[] = [];
    for (const st of pathSteps) {
      const c = ctx.getPieceCenter(st.pieceId);
      if (c) waypoints.push(c);
    }
    if (waypoints.length < 2) {
      if (pathSteps[0]) triggerPieceAnim(ctx, pathSteps[0]);
      setTimeout(resolve, 180);
      return;
    }
    const path = buildSignalPath(waypoints);
    const waypointDists = computeWaypointDists(waypoints);
    const refLen = ctx.CELL_SIZE * 4;
    const totalMs =
      Math.max(300, Math.min(1200, 480 * (path.total / refLen))) * speedMultiplier;
    const segColors = pathSteps.map(s => getBeamColor(s.type));
    const hasVoid = pathSteps.some(s => s.type === 'void');

    // Seed trail with a placeholder empty segment so the beam's color
    // identity shows before the head moves.
    applyFrame({
      trail: [{ points: [], color: segColors[0] ?? '#8B5CF6' }],
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

    function applyFrame(update: {
      trail: TrailSeg[] | null;
      head: Pt | null | undefined; // undefined = no change, null = clear
      headColor: string | null;
      newLitWires: string[] | null;
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
      const rawT = Math.min(1, (now - t0 - pauseAccum) / totalMs);
      const t = easeOut3(rawT);
      const headDist = t * path.total;
      const head = posAlongPath(path, headDist);

      const newSegs: TrailSeg[] = [];
      for (let i = 0; i < path.segs.length; i++) {
        const sg = path.segs[i];
        const color = segColors[i] ?? '#F0B429';
        if (headDist >= sg.e) {
          newSegs.push({ points: [{ x: sg.x0, y: sg.y0 }, { x: sg.x0 + sg.dx, y: sg.y0 + sg.dy }], color });
        } else if (headDist > sg.s) {
          const tt = sg.l > 0 ? (headDist - sg.s) / sg.l : 0;
          newSegs.push({ points: [{ x: sg.x0, y: sg.y0 }, { x: sg.x0 + sg.dx * tt, y: sg.y0 + sg.dy * tt }], color });
          break;
        }
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

      // ONE setBeamState per tick — trail, head, headColor, and any
      // newly lit wires bundled into a single reconciliation.
      applyFrame({
        trail: newSegs,
        head,
        headColor: currentColor,
        newLitWires: newLitWires.length > 0 ? newLitWires : null,
      });

      for (let i = 0; i < waypoints.length; i++) {
        if (flashed.has(i)) continue;
        const wpDist = waypointDists[i];
        if (headDist >= wpDist || (i === waypoints.length - 1 && rawT >= 1)) {
          flashed.add(i);
          const stp = pathSteps[i];
          const isVoidBlocker = hasVoid && i === waypoints.length - 1;
          if (isVoidBlocker) flashPiece(ctx, stp.pieceId, '#FF3B3B');
          else {
            const isTapePiece = !!TAPE_PIECE_COLORS[stp.type];
            if (isTapePiece) {
              // Snap the beam head + trail to the piece center
              // (Prompt 91, Fix 4). Without this, the head visibly
              // freezes a frame past the waypoint — easeOut3 + the
              // RAF granularity put it at the piece's far edge by
              // the time we cross the wpDist threshold. Re-apply
              // the trail truncated to wpDist and pin the head to
              // waypoints[i] so the visual stop is centered.
              const wp = waypoints[i];
              const truncSegs: TrailSeg[] = [];
              for (let j = 0; j < path.segs.length; j++) {
                const sg = path.segs[j];
                const color = segColors[j] ?? '#F0B429';
                if (wpDist >= sg.e) {
                  truncSegs.push({
                    points: [
                      { x: sg.x0, y: sg.y0 },
                      { x: sg.x0 + sg.dx, y: sg.y0 + sg.dy },
                    ],
                    color,
                  });
                } else if (wpDist > sg.s) {
                  const tt = sg.l > 0 ? (wpDist - sg.s) / sg.l : 0;
                  truncSegs.push({
                    points: [
                      { x: sg.x0, y: sg.y0 },
                      { x: sg.x0 + sg.dx * tt, y: sg.y0 + sg.dy * tt },
                    ],
                    color,
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
              triggerPieceAnim(ctx, stp)
                .then(() => {
                  clearTimeout(safetyTimer);
                  settleTapePause();
                })
                .catch(() => {
                  clearTimeout(safetyTimer);
                  settleTapePause();
                });
            } else {
              triggerPieceAnim(ctx, stp);
            }
          }
        }
      }
      if (rawT < 1) {
        ctx.animFrameRef.current.set(branchSlot, requestAnimationFrame(tick));
      } else {
        // Final frame for this slot — clear the entry so cleanup
        // doesn't try to cancel an id whose callback already
        // resolved.
        ctx.animFrameRef.current.delete(branchSlot);
        if (hasVoid) {
          const blocker = waypoints[waypoints.length - 1];
          const ps = performance.now();
          const voidTick = (): void => {
            const e = performance.now() - ps;
            const p = Math.min(1, e / 320);
            setVoidPulse(ctx.setBeamState, { x: blocker.x, y: blocker.y, r: 6 + p * 40, opacity: 0.9 * (1 - p) });
            if (p < 1) ctx.animFrameRef.current.set(branchSlot, requestAnimationFrame(voidTick));
            else {
              ctx.animFrameRef.current.delete(branchSlot);
              setVoidPulse(ctx.setBeamState, null);
              applyFrame({ trail: [], head: null, headColor: null, newLitWires: null });
              resolve();
            }
          };
          ctx.animFrameRef.current.set(branchSlot, requestAnimationFrame(voidTick));
        } else {
          applyFrame({ trail: [], head: null, headColor: null, newLitWires: null });
          resolve();
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
      runLinearPath(ctx, pulseSteps, null, speed).then(resolveAll);
      return;
    }

    const preForkSteps = pulseSteps.slice(0, forkIdx + 1);
    const branchASteps = pulseSteps.filter(s => s.branchId === 'A');
    const branchBSteps = pulseSteps.filter(s => s.branchId === 'B');

    const forkPt = ctx.getPieceCenter(pulseSteps[forkIdx].pieceId);

    runLinearPath(ctx, preForkSteps, null, speed).then(() => {
      if (!forkPt) { resolveAll(); return; }

      const splitterStep = pulseSteps[forkIdx];
      const aSteps = [splitterStep, ...branchASteps];
      const bSteps = [splitterStep, ...branchBSteps];

      Promise.all([
        runLinearPath(ctx, aSteps, 0, speed),
        runLinearPath(ctx, bSteps, 1, speed),
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
