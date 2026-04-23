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
        ctx.animFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      if (pauseEnd > 0) {
        pauseAccum += (pauseEnd - pauseStart);
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
              const now2 = performance.now();
              pauseStart = now2;
              pauseEnd = now2 + 1e9;
              // Safety net: force-resume the beam after 8s if the
              // interaction promise never settles.
              const safetyTimer = setTimeout(() => {
                if (pauseEnd > performance.now()) {
                  pauseEnd = performance.now();
                }
              }, 8000);
              ctx.flashTimersRef.current.push(safetyTimer);
              triggerPieceAnim(ctx, stp).then(() => {
                clearTimeout(safetyTimer);
                pauseEnd = performance.now();
              }).catch(() => {
                clearTimeout(safetyTimer);
                pauseEnd = performance.now();
              });
            } else {
              triggerPieceAnim(ctx, stp);
            }
          }
        }
      }
      if (rawT < 1) {
        ctx.animFrameRef.current = requestAnimationFrame(tick);
      } else {
        if (hasVoid) {
          const blocker = waypoints[waypoints.length - 1];
          const ps = performance.now();
          const voidTick = (): void => {
            const e = performance.now() - ps;
            const p = Math.min(1, e / 320);
            setVoidPulse(ctx.setBeamState, { x: blocker.x, y: blocker.y, r: 6 + p * 40, opacity: 0.9 * (1 - p) });
            if (p < 1) ctx.animFrameRef.current = requestAnimationFrame(voidTick);
            else {
              setVoidPulse(ctx.setBeamState, null);
              applyFrame({ trail: [], head: null, headColor: null, newLitWires: null });
              resolve();
            }
          };
          ctx.animFrameRef.current = requestAnimationFrame(voidTick);
        } else {
          applyFrame({ trail: [], head: null, headColor: null, newLitWires: null });
          resolve();
        }
      }
    };
    ctx.animFrameRef.current = requestAnimationFrame(tick);
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
