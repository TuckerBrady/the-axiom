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
  setBeamHeads,
  setBeamHeadColor,
  setTrailSegments,
  setBranchTrails,
  setVoidPulse,
  updateLitWires,
} from './stateHelpers';

export function runLinearPath(
  ctx: EngagementContext,
  pathSteps: ExecutionStep[],
  opts: {
    setHead: (h: Pt | null) => void;
    setTrail: (s: { points: Pt[]; color: string }[]) => void;
  },
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
    opts.setTrail([{ points: [], color: segColors[0] ?? '#8B5CF6' }]);
    const t0 = performance.now();
    const lit = new Set<number>();
    const flashed = new Set<number>();
    let pauseStart = 0;
    let pauseAccum = 0;
    let pauseEnd = 0;

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

      const newSegs: { points: Pt[]; color: string }[] = [];
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
      opts.setTrail(newSegs);
      const currentColor = hasVoid && rawT > 0.85
        ? '#FF3B3B'
        : (newSegs.length > 0 ? newSegs[newSegs.length - 1].color : '#8B5CF6');
      opts.setHead(head);
      setBeamHeadColor(ctx.setBeamState, currentColor);

      for (let i = 0; i < path.segs.length; i++) {
        if (lit.has(i)) continue;
        const mid = path.segs[i].s + path.segs[i].l / 2;
        if (headDist >= mid) {
          lit.add(i);
          const fromId = pathSteps[i].pieceId;
          const toId = pathSteps[i + 1]?.pieceId;
          if (fromId && toId) {
            updateLitWires(ctx.setBeamState, prev => { const n = new Set(prev); n.add(`${fromId}_${toId}`); n.add(`${toId}_${fromId}`); return n; });
          }
        }
      }
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
              triggerPieceAnim(ctx, stp).then(() => {
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
            else { setVoidPulse(ctx.setBeamState, null); opts.setHead(null); opts.setTrail([]); resolve(); }
          };
          ctx.animFrameRef.current = requestAnimationFrame(voidTick);
        } else {
          opts.setHead(null);
          opts.setTrail([]);
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
      runLinearPath(ctx, pulseSteps, {
        setHead: (h) => setBeamHeads(ctx.setBeamState, h ? [h] : []),
        setTrail: (s) => setTrailSegments(ctx.setBeamState, s),
      }, speed).then(resolveAll);
      return;
    }

    const preForkSteps = pulseSteps.slice(0, forkIdx + 1);
    const branchASteps = pulseSteps.filter(s => s.branchId === 'A');
    const branchBSteps = pulseSteps.filter(s => s.branchId === 'B');

    const forkPt = ctx.getPieceCenter(pulseSteps[forkIdx].pieceId);

    runLinearPath(ctx, preForkSteps, {
      setHead: (h) => setBeamHeads(ctx.setBeamState, h ? [h] : []),
      setTrail: (s) => setTrailSegments(ctx.setBeamState, s),
    }, speed).then(() => {
      if (!forkPt) { resolveAll(); return; }

      const splitterStep = pulseSteps[forkIdx];
      const aSteps = [splitterStep, ...branchASteps];
      const bSteps = [splitterStep, ...branchBSteps];

      let headA: Pt | null = null;
      let headB: Pt | null = null;
      let trailA: { points: Pt[]; color: string }[] = [];
      let trailB: { points: Pt[]; color: string }[] = [];

      const syncHeads = (): void => {
        const heads: Pt[] = [];
        if (headA) heads.push(headA);
        if (headB) heads.push(headB);
        // Single setState call writing both heads + branch trails at
        // once so Promise.all branch A/B updates share one reconciliation.
        ctx.setBeamState(prev => ({
          ...prev,
          heads,
          branchTrails: [trailA, trailB],
        }));
      };

      Promise.all([
        runLinearPath(ctx, aSteps, {
          setHead: (h) => { headA = h; syncHeads(); },
          setTrail: (s) => { trailA = s; syncHeads(); },
        }, speed),
        runLinearPath(ctx, bSteps, {
          setHead: (h) => { headB = h; syncHeads(); },
          setTrail: (s) => { trailB = s; syncHeads(); },
        }, speed),
      ]).then(() => {
        // Clear heads, trails, and branch trails in one reconciliation.
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
