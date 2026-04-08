import type { LevelDefinition, PlacedPiece, PieceType } from './types';
import type { PuzzleTemplate } from './challengeTemplates';
import { SeededRandom } from './seededRandom';
import { getDefaultPorts, getPieceCategory } from './engine';

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

// ─── Data trail generation ───────────────────────────────────────────────────

function generateDataTrail(rng: SeededRandom, length: number, needsCorrectValues: boolean): (0 | 1)[] {
  const trail: (0 | 1)[] = [];
  for (let i = 0; i < length; i++) {
    trail.push(rng.nextInt(0, 1) as 0 | 1);
  }
  // Ensure at least one '1' for configNode to pass
  if (needsCorrectValues && !trail.includes(1)) {
    (trail as (0 | 1)[])[0] = 1;
  }
  return trail;
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
    makePiece('inputPort', sx, sy, true),
    makePiece('outputPort', ox, oy, true),
  ];

  // 4. Convert solution to PlacedPiece[] (for verification)
  const solutionPieces = solPath.map(sp => makePiece(sp.type, sp.x, sp.y, false, sp.rotation));

  // 5. Available pieces from pool
  const available: PieceType[] = [];
  for (const entry of piecePool) {
    const count = rng.nextInt(entry.countRange[0], entry.countRange[1]);
    for (let i = 0; i < count; i++) available.push(entry.type);
  }
  // Ensure solution pieces are covered
  const solCounts: Partial<Record<PieceType, number>> = {};
  for (const sp of solPath) solCounts[sp.type] = (solCounts[sp.type] ?? 0) + 1;
  for (const [type, needed] of Object.entries(solCounts)) {
    const have = available.filter(p => p === type).length;
    for (let i = have; i < (needed as number); i++) available.push(type as PieceType);
  }

  // 6. Budget
  const budget = rng.nextInt(template.budgetRange[0], template.budgetRange[1]);

  // 7. Data trail (if Protocol pieces in solution)
  const hasProtocol = solPath.some(sp => ['configNode', 'scanner', 'transmitter'].includes(sp.type));
  const dataTrail = hasProtocol
    ? { cells: generateDataTrail(rng, gw, true), headPosition: 0 }
    : { cells: [] as (0 | 1)[], headPosition: 0 };

  // 8. Build LevelDefinition
  const level: LevelDefinition = {
    id: `daily_${dateString}`,
    name: `${template.name} — Daily Challenge`,
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
    scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus', 'speedBonus'],
  };

  return { level, solutionPieces };
}
