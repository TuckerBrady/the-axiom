import type {
  PlacedPiece,
  Wire,
  MachineState,
  ExecutionStep,
  PortSide,
} from './types';

// ─── Port / adjacency helpers ─────────────────────────────────────────────────

const OPPOSITE_SIDE: Record<PortSide, PortSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

function sideOffset(side: PortSide): { dx: number; dy: number } {
  switch (side) {
    case 'top':    return { dx: 0, dy: -1 };
    case 'bottom': return { dx: 0, dy: 1 };
    case 'left':   return { dx: -1, dy: 0 };
    case 'right':  return { dx: 1, dy: 0 };
  }
}

// ─── Rotation helper ─────────────────────────────────────────────────────────

function rotateSide(side: PortSide, rotation: number): PortSide {
  const order: PortSide[] = ['top', 'right', 'bottom', 'left'];
  const steps = ((rotation ?? 0) / 90) % 4;
  const idx = order.indexOf(side);
  return order[(idx + steps) % 4];
}

// ─── Directional port logic ──────────────────────────────────────────────────

/**
 * Returns which sides a piece can RECEIVE signal from.
 */
export function getInputPorts(piece: PlacedPiece): PortSide[] {
  const ALL: PortSide[] = ['top', 'bottom', 'left', 'right'];
  const rot = piece.rotation ?? 0;

  switch (piece.type) {
    case 'conveyor':
      return [rotateSide('left', rot)];      // input from left at 0°
    case 'splitter':
      return [rotateSide('left', rot)];      // input from left at 0°
    case 'source':
      return [];                              // Source has no input
    case 'output':
    case 'gear':
    case 'configNode':
    case 'scanner':
    case 'transmitter':
      return ALL;                             // omnidirectional input
  }
}

/**
 * Returns which sides a piece SENDS signal toward.
 */
export function getOutputPorts(piece: PlacedPiece): PortSide[] {
  const ALL: PortSide[] = ['top', 'bottom', 'left', 'right'];
  const rot = piece.rotation ?? 0;

  switch (piece.type) {
    case 'conveyor':
      return [rotateSide('right', rot)];     // output to right at 0°
    case 'splitter':
      return [rotateSide('right', rot), rotateSide('bottom', rot)]; // right + bottom at 0°
    case 'output':
      return [];                              // Output has no output
    case 'source':
    case 'gear':
    case 'configNode':
    case 'scanner':
    case 'transmitter':
      return ALL;                             // omnidirectional output
  }
}

/**
 * Returns all active port sides (union of input + output).
 * Used by autoConnectPhysicsPieces for wire rendering.
 */
export function getActivePorts(piece: PlacedPiece): PortSide[] {
  const inputs = getInputPorts(piece);
  const outputs = getOutputPorts(piece);
  const all = new Set([...inputs, ...outputs]);
  return Array.from(all);
}

// ─── Connection logic ─────────────────────────────────────────────────────────

/**
 * Returns true if piece1 can send signal to piece2
 * (piece1 has an output port facing piece2, and piece2 has
 * an input port facing piece1).
 */
export function canSendTo(piece1: PlacedPiece, piece2: PlacedPiece): boolean {
  const dx = piece2.gridX - piece1.gridX;
  const dy = piece2.gridY - piece1.gridY;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return false;

  let facingSide: PortSide;
  if (dx === 1 && dy === 0) facingSide = 'right';
  else if (dx === -1 && dy === 0) facingSide = 'left';
  else if (dx === 0 && dy === 1) facingSide = 'bottom';
  else facingSide = 'top';

  const opposite = OPPOSITE_SIDE[facingSide];

  return getOutputPorts(piece1).includes(facingSide) &&
         getInputPorts(piece2).includes(opposite);
}

/**
 * Bidirectional check for wire rendering — either piece can send to the other.
 */
export function canConnect(piece1: PlacedPiece, piece2: PlacedPiece): boolean {
  return canSendTo(piece1, piece2) || canSendTo(piece2, piece1);
}

/**
 * Scans all pieces and returns wires for adjacent pairs that can connect.
 */
export function autoConnectPhysicsPieces(pieces: PlacedPiece[]): Wire[] {
  const wires: Wire[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const a = pieces[i];
      const b = pieces[j];

      if (!canConnect(a, b)) continue;

      const wireKey = [a.id, b.id].sort().join('::');
      if (seen.has(wireKey)) continue;
      seen.add(wireKey);

      const dx = b.gridX - a.gridX;
      const dy = b.gridY - a.gridY;
      let aSide: PortSide;
      if (dx === 1) aSide = 'right';
      else if (dx === -1) aSide = 'left';
      else if (dy === 1) aSide = 'bottom';
      else aSide = 'top';

      const bSide = OPPOSITE_SIDE[aSide];
      const aPort = a.ports.find(p => p.side === aSide);
      const bPort = b.ports.find(p => p.side === bSide);

      if (aPort && bPort) {
        wires.push({
          id: `wire-${a.id}-${b.id}`,
          fromPieceId: a.id,
          fromPortId: aPort.id,
          toPieceId: b.id,
          toPortId: bPort.id,
        });
      }
    }
  }

  return wires;
}

/**
 * Returns IDs of pieces that the given piece can send signal TO (directional).
 */
function getDirectionalNeighbors(piece: PlacedPiece, allPieces: PlacedPiece[]): PlacedPiece[] {
  const neighbors: PlacedPiece[] = [];
  const outputSides = getOutputPorts(piece);

  for (const side of outputSides) {
    const { dx, dy } = sideOffset(side);
    const targetX = piece.gridX + dx;
    const targetY = piece.gridY + dy;

    const target = allPieces.find(p => p.gridX === targetX && p.gridY === targetY);
    if (!target) continue;

    // Target must accept input from the opposite direction
    const inputSide = OPPOSITE_SIDE[side];
    if (getInputPorts(target).includes(inputSide)) {
      neighbors.push(target);
    }
  }

  return neighbors;
}

// ─── Machine Execution ────────────────────────────────────────────────────────

const MAX_STEPS = 50;

/**
 * Directional signal tracer. Follows output→input port matching.
 */
export function executeMachine(state: MachineState): ExecutionStep[] {
  const { pieces, dataTrail, configuration } = state;
  const steps: ExecutionStep[] = [];
  let stepTime = 0;

  const source = pieces.find(p => p.type === 'source');
  if (!source) {
    steps.push({ pieceId: 'none', type: 'error', timestamp: stepTime, success: false, message: 'No source piece found' });
    return steps;
  }

  const visited = new Set<string>();
  const queue: string[] = [source.id];

  const trail = {
    cells: [...dataTrail.cells],
    headPosition: dataTrail.headPosition,
  };

  while (queue.length > 0 && steps.length < MAX_STEPS) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const piece = pieces.find(p => p.id === currentId);
    if (!piece) continue;

    const step: ExecutionStep = {
      pieceId: piece.id,
      type: piece.type,
      timestamp: stepTime++,
      success: true,
    };

    switch (piece.type) {
      case 'source':
        step.message = 'Signal initiated';
        break;

      case 'conveyor':
        step.message = 'Signal passed through conveyor';
        break;

      case 'gear':
        step.message = 'Signal redirected by gear';
        break;

      case 'splitter':
        step.message = 'Signal split';
        break;

      case 'configNode':
        if (piece.condition) {
          const passes = piece.condition(configuration);
          if (!passes) {
            step.success = false;
            step.message = 'Configuration check failed — signal blocked';
            steps.push(step);
            continue;
          }
          step.message = 'Configuration check passed';
        } else {
          step.message = 'Config node passed (no condition)';
        }
        break;

      case 'scanner':
        if (trail.cells.length > 0 && trail.headPosition < trail.cells.length) {
          const value = trail.cells[trail.headPosition];
          trail.headPosition++;
          step.message = `Scanned value: ${value}`;
        } else {
          step.message = 'Scanner: no data to read';
        }
        break;

      case 'transmitter':
        if (trail.cells.length > 0 && trail.headPosition < trail.cells.length) {
          trail.cells[trail.headPosition] = 1;
          step.message = `Transmitted value to cell ${trail.headPosition}`;
        } else {
          step.message = 'Transmitter: no cell to write';
        }
        break;

      case 'output':
        step.message = 'Signal reached output — success!';
        steps.push(step);
        return steps;
    }

    steps.push(step);

    // Follow directional output ports to find next pieces
    const neighbors = getDirectionalNeighbors(piece, pieces);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.id)) {
        queue.push(neighbor.id);
      }
    }
  }

  // Signal never reached output
  steps.push({
    pieceId: 'none',
    type: 'void',
    timestamp: stepTime,
    success: false,
    message: 'Signal lost — could not reach output. VOID STATE.',
  });

  return steps;
}

// ─── Star rating ──────────────────────────────────────────────────────────────

export function calculateStars(
  steps: ExecutionStep[],
  piecesUsed: number,
  optimalPieces: number,
): 0 | 1 | 2 | 3 {
  const succeeded = steps.some(s => s.type === 'output' && s.success);
  if (!succeeded) return 1;

  if (piecesUsed <= optimalPieces) return 3;
  if (piecesUsed <= optimalPieces * 2) return 2;
  return 1;
}

// ─── Piece factory helpers ────────────────────────────────────────────────────

export function getDefaultPorts(type: PlacedPiece['type']): PlacedPiece['ports'] {
  const allSides: PortSide[] = ['top', 'bottom', 'left', 'right'];
  return allSides.map(side => ({
    id: `port-${side}`,
    side,
    connected: false,
  }));
}

export function getPieceCategory(type: PlacedPiece['type']): PlacedPiece['category'] {
  switch (type) {
    case 'source':
    case 'output':
    case 'conveyor':
    case 'gear':
    case 'splitter':
      return 'physics';
    case 'configNode':
    case 'scanner':
    case 'transmitter':
      return 'protocol';
  }
}
