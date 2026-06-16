import type { LevelDefinition, PlacedPiece, PieceType, OutputTapeValue } from './types';
import type { PuzzleTemplate } from './challengeTemplates';
import { SeededRandom } from './seededRandom';
import { getDefaultPorts, getPieceCategory } from './engine';
import { runSolution } from './puzzleVerifier';

let pieceCounter = 5000;

function makePiece(type: PieceType, x: number, y: number, prePlaced: boolean, rotation = 0): PlacedPiece {
  return {
    id: `daily-${type}-${++pieceCounter}`,
    type,
    category: getPieceCategory(type),
    gridX: x,
    gridY: y,
    ports: getDefaultPorts(type),
    rotation,
    isPrePlaced: prePlaced,
  };
}

// ─── Position resolvers ──────────────────────────────────────────────────────

function resolveSourcePos(pos: string, gw: number, gh: number, rng: SeededRandom): [number, number] {
  switch (pos) {
    case 'top_left': return [1, 1];
    case 'bottom_left': return [1, gh - 2];
    case 'left': default: return [1, rng.nextInt(2, gh - 3)];
  }
}

function resolveOutputPos(pos: string, gw: number, gh: number, rng: SeededRandom): [number, number] {
  switch (pos) {
    case 'top_right': return [gw - 2, 1];
    case 'bottom_right': return [gw - 2, gh - 2];
    case 'right': default: return [gw - 2, rng.nextInt(2, gh - 3)];
  }
}

// ─── Solution path builders ──────────────────────────────────────────────────

type SolPiece = { type: PieceType; x: number; y: number; rotation: number };

function buildStraightPath(sx: number, sy: number, ox: number, oy: number, required: PieceType[]): SolPiece[] {
  const path: SolPiece[] = [];
  // Force same row
  const row = sy;
  for (let col = sx + 1; col < ox; col++) {
    const type = required.includes('gear') && col === sx + Math.floor((ox - sx) / 2) ? 'gear' : 'conveyor';
    path.push({ type, x: col, y: row, rotation: 0 });
  }
  return path;
}

function buildBendDownPath(sx: number, sy: number, ox: number, oy: number, rng: SeededRandom): SolPiece[] {
  const path: SolPiece[] = [];
  const bendCol = rng.nextInt(sx + 2, Math.max(sx + 2, ox - 2));

  // Horizontal to bend
  for (let col = sx + 1; col < bendCol; col++) {
    path.push({ type: 'conveyor', x: col, y: sy, rotation: 0 });
  }
  // Gear at corner
  path.push({ type: 'gear', x: bendCol, y: sy, rotation: 0 });
  // Vertical down
  for (let row = sy + 1; row < oy; row++) {
    path.push({ type: 'conveyor', x: bendCol, y: row, rotation: 90 });
  }
  // Gear at bottom corner
  if (bendCol !== ox) {
    path.push({ type: 'gear', x: bendCol, y: oy, rotation: 0 });
    // Horizontal to output
    for (let col = bendCol + 1; col < ox; col++) {
      path.push({ type: 'conveyor', x: col, y: oy, rotation: 0 });
    }
  }
  return path;
}

function buildBendUpPath(sx: number, sy: number, ox: number, oy: number, rng: SeededRandom): SolPiece[] {
  const path: SolPiece[] = [];
  const bendCol = rng.nextInt(sx + 2, Math.max(sx + 2, ox - 2));

  for (let col = sx + 1; col < bendCol; col++) {
    path.push({ type: 'conveyor', x: col, y: sy, rotation: 0 });
  }
  path.push({ type: 'gear', x: bendCol, y: sy, rotation: 0 });
  for (let row = sy - 1; row > oy; row--) {
    path.push({ type: 'conveyor', x: bendCol, y: row, rotation: 270 });
  }
  if (bendCol !== ox) {
    path.push({ type: 'gear', x: bendCol, y: oy, rotation: 0 });
    for (let col = bendCol + 1; col < ox; col++) {
      path.push({ type: 'conveyor', x: col, y: oy, rotation: 0 });
    }
  }
  return path;
}

function buildDoubleBendPath(sx: number, sy: number, ox: number, oy: number, rng: SeededRandom): SolPiece[] {
  const midCol = rng.nextInt(sx + 2, Math.max(sx + 2, ox - 3));
  const midRow = sy < oy ? rng.nextInt(sy + 1, oy - 1) : rng.nextInt(oy + 1, sy - 1);
  const path: SolPiece[] = [];

  // Horizontal seg 1
  for (let col = sx + 1; col < midCol; col++) path.push({ type: 'conveyor', x: col, y: sy, rotation: 0 });
  path.push({ type: 'gear', x: midCol, y: sy, rotation: 0 });
  // Vertical
  if (midRow > sy) {
    for (let row = sy + 1; row < midRow; row++) path.push({ type: 'conveyor', x: midCol, y: row, rotation: 90 });
  } else {
    for (let row = sy - 1; row > midRow; row--) path.push({ type: 'conveyor', x: midCol, y: row, rotation: 270 });
  }
  path.push({ type: 'gear', x: midCol, y: midRow, rotation: 0 });
  // Horizontal seg 2
  for (let col = midCol + 1; col < ox; col++) path.push({ type: 'conveyor', x: col, y: midRow, rotation: 0 });
  // If output row differs, add final vertical
  if (midRow !== oy) {
    path.push({ type: 'gear', x: ox - 1, y: midRow, rotation: 0 });
    const dir = oy > midRow ? 90 : 270;
    const start = oy > midRow ? midRow + 1 : midRow - 1;
    const end = oy;
    if (dir === 90) for (let row = start; row < end; row++) path.push({ type: 'conveyor', x: ox - 1, y: row, rotation: 90 });
    else for (let row = start; row > end; row--) path.push({ type: 'conveyor', x: ox - 1, y: row, rotation: 270 });
  }
  return path;
}

function buildSolutionPath(
  shape: string, sx: number, sy: number, ox: number, oy: number,
  required: PieceType[], rng: SeededRandom,
): SolPiece[] {
  switch (shape) {
    case 'straight': return buildStraightPath(sx, sy, ox, oy, required);
    case 'bend_down': return sy <= oy ? buildBendDownPath(sx, sy, ox, oy, rng) : buildBendDownPath(sx, sy, ox, oy, rng);
    case 'bend_up': return sy >= oy ? buildBendUpPath(sx, sy, ox, oy, rng) : buildBendUpPath(sx, sy, ox, oy, rng);
    case 'double_bend': return buildDoubleBendPath(sx, sy, ox, oy, rng);
    case 'zigzag': return buildDoubleBendPath(sx, sy, ox, oy, rng); // zigzag uses double_bend with more variance
    case 'split_rejoin': return buildStraightPath(sx, sy, ox, oy, required); // simplified
    default: return buildStraightPath(sx, sy, ox, oy, required);
  }
}

// ─── Transmitter insertion (makes a tape bounty actually produce output) ─────

// Convert the rightmost conveyor feeding the Terminal horizontally into a
// Transmitter, so the intended solution writes an output tape (the engine only
// writes outputTape on a Transmitter fire). Returns null when no horizontal
// approach conveyor exists — the caller then ships a routing bounty instead.
function insertTransmitter(path: SolPiece[], ox: number, oy: number): SolPiece[] | null {
  let bestIdx = -1;
  let bestX = -1;
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (p.type === 'conveyor' && p.y === oy && p.x < ox && p.x > bestX) {
      bestX = p.x;
      bestIdx = i;
    }
  }
  if (bestIdx === -1) return null;
  const copy = path.map(p => ({ ...p }));
  copy[bestIdx] = { ...copy[bestIdx], type: 'transmitter', rotation: 0 };
  return copy;
}

// ─── Tape generation (for challenges with tape-interacting pieces) ───────────

const TAPE_LENGTHS: Record<string, [number, number]> = {
  easy: [4, 5],
  medium: [6, 7],
  hard: [8, 10],
  expert: [10, 12],
};

function generateInputTape(length: number, rng: SeededRandom): number[] {
  const tape: number[] = [];
  let consecutive = 0;
  let lastVal = -1;
  for (let i = 0; i < length; i++) {
    let val = rng.nextInt(0, 1);
    // Prevent more than 3 consecutive same values
    if (val === lastVal) {
      consecutive++;
      if (consecutive >= 3) {
        val = 1 - val;
        consecutive = 1;
      }
    } else {
      consecutive = 1;
    }
    tape.push(val);
    lastVal = val;
  }
  // Ensure at least one 0 and one 1 (both outcomes tested)
  if (!tape.includes(0)) tape[rng.nextInt(1, length - 1)] = 0;
  if (!tape.includes(1)) tape[rng.nextInt(0, length - 2)] = 1;
  return tape;
}

// ─── Main generator ──────────────────────────────────────────────────────────

export function generatePuzzleFromTemplate(
  template: PuzzleTemplate,
  rng: SeededRandom,
  dateString: string,
): { level: LevelDefinition; solutionPieces: PlacedPiece[] } {
  pieceCounter = 5000;
  const { gridWidth: gw, gridHeight: gh, pattern, piecePool } = template;

  // 1. Resolve source/output positions
  let [sx, sy] = resolveSourcePos(pattern.sourcePosition, gw, gh, rng);
  let [ox, oy] = resolveOutputPos(pattern.outputPosition, gw, gh, rng);

  // For straight patterns, force same row
  if (pattern.solutionShape === 'straight') {
    oy = sy;
  }

  // 2. Build solution path
  const solPath = buildSolutionPath(pattern.solutionShape, sx, sy, ox, oy, pattern.requiredPieceTypes, rng);

  // 3. Pre-placed pieces
  const prePlaced = [
    makePiece('source', sx, sy, true),
    makePiece('terminal', ox, oy, true),
  ];

  // 4. Budget
  const budget = rng.nextInt(template.budgetRange[0], template.budgetRange[1]);

  // 5. Decide tape vs routing. A template "wants" a tape level when its pool
  // offers tape-interacting pieces. But a bounty is only a HONEST tape level if
  // its intended solution can actually WRITE an output tape — which requires a
  // Transmitter on the signal path (the engine writes outputTape only on a
  // Transmitter fire). The physics-only solution builders can't, so we insert a
  // Transmitter into the path and DERIVE expectedOutput from running it. If that
  // doesn't yield real output (e.g. the insertion didn't land on the path), the
  // bounty degrades to a verified routing puzzle rather than shipping an
  // unsolvable tape level. (Was: expectedOutput = [...inputTape] assumed, with
  // no Transmitter — unsolvable, see puzzleVerifier rewrite.)
  const TAPE_PIECE_TYPES: PieceType[] = ['scanner', 'transmitter', 'configNode'];
  const poolWantsTape = piecePool.some(e => TAPE_PIECE_TYPES.includes(e.type));

  let solPathFinal: SolPiece[] = solPath;
  let inputTape: number[] | undefined;
  let expectedOutput: OutputTapeValue[] | undefined;
  let dataTrail: { cells: (0 | 1)[]; headPosition: number } = { cells: [], headPosition: 0 };

  if (poolWantsTape) {
    const [minLen, maxLen] = TAPE_LENGTHS[template.difficulty] ?? [4, 5];
    const tapeLength = rng.nextInt(minLen, maxLen);
    const candidateInput = generateInputTape(tapeLength, rng);
    const candidatePath = insertTransmitter(solPath, ox, oy);

    if (candidatePath) {
      const candidateTrail = { cells: new Array(gw).fill(0) as (0 | 1)[], headPosition: 0 };
      const candidateSolution = candidatePath.map(sp => makePiece(sp.type, sp.x, sp.y, false, sp.rotation));
      // Provisional level shell — runSolution only reads prePlaced/inputTape/
      // dataTrail/grid, not expectedOutput.
      const provisional = {
        prePlacedPieces: prePlaced,
        inputTape: candidateInput,
        dataTrail: candidateTrail,
        gridWidth: gw,
        gridHeight: gh,
      } as unknown as LevelDefinition;
      const run = runSolution(provisional, candidateSolution);
      const hasReal = !!run.outputTape && run.outputTape.some(v => v === 0 || v === 1);
      if (run.reachedEveryPulse && hasReal) {
        // Genuine tape bounty: expectedOutput is what the verified solution
        // actually produces (solvable by construction).
        inputTape = candidateInput;
        expectedOutput = run.outputTape!;
        dataTrail = candidateTrail;
        solPathFinal = candidatePath;
      }
    }
  }

  // 6. Convert (final) solution to PlacedPiece[] for verification.
  const solutionPieces = solPathFinal.map(sp => makePiece(sp.type, sp.x, sp.y, false, sp.rotation));

  // 7. Available pieces from pool, then ensure the solution pieces are covered.
  const available: PieceType[] = [];
  for (const entry of piecePool) {
    const count = rng.nextInt(entry.countRange[0], entry.countRange[1]);
    for (let i = 0; i < count; i++) available.push(entry.type);
  }
  const solCounts: Partial<Record<PieceType, number>> = {};
  for (const sp of solPathFinal) solCounts[sp.type] = (solCounts[sp.type] ?? 0) + 1;
  for (const [type, needed] of Object.entries(solCounts)) {
    const have = available.filter(p => p === type).length;
    for (let i = have; i < (needed as number); i++) available.push(type as PieceType);
  }

  // 8. Build LevelDefinition. isTapeLevel reflects what actually shipped, so
  // downstream (COGS copy, Spec Sheet) describes the real puzzle.
  const isTapeLevel = inputTape !== undefined && expectedOutput !== undefined;
  const level: LevelDefinition = {
    id: `daily_${dateString}`,
    name: `${template.name} — Daily Bounty`,
    sector: 'daily',
    description: 'Daily challenge puzzle.',
    cogsLine: '',
    gridWidth: gw,
    gridHeight: gh,
    prePlacedPieces: prePlaced,
    availablePieces: available,
    dataTrail,
    objectives: [{ type: 'reach_output' }],
    optimalPieces: pattern.optimalPieceCount,
    budget,
    scoringCategoriesVisible: isTapeLevel
      ? ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus', 'speedBonus']
      : ['efficiency', 'chainIntegrity', 'disciplineBonus', 'speedBonus'],
    inputTape,
    expectedOutput,
  };

  return { level, solutionPieces };
}
