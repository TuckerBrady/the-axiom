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

/**
 * For a given side, return the grid offset (dx, dy) to the adjacent cell.
 */
function sideOffset(side: PortSide): { dx: number; dy: number } {
  switch (side) {
    case 'top':    return { dx: 0, dy: -1 };
    case 'bottom': return { dx: 0, dy: 1 };
    case 'left':   return { dx: -1, dy: 0 };
    case 'right':  return { dx: 1, dy: 0 };
  }
}

// ─── Rotation-aware port logic ────────────────────────────────────────────────

/**
 * Returns which port sides a piece exposes based on its type and rotation.
 * Gear, Source, Output, and Protocol pieces are omnidirectional.
 * Conveyor and Splitter are directional.
 */
export function getActivePorts(piece: PlacedPiece): PortSide[] {
  const ALL: PortSide[] = ['top', 'bottom', 'left', 'right'];
  const rot = piece.rotation ?? 0;

  // Apply rotation: rotate the base ports clockwise by rot degrees
  function rotate(side: PortSide): PortSide {
    const order: PortSide[] = ['top', 'right', 'bottom', 'left'];
    const steps = (rot / 90) % 4;
    const idx = order.indexOf(side);
    return order[(idx + steps) % 4];
  }

  switch (piece.type) {
    case 'conveyor':
      // Base 0°: input LEFT, output RIGHT
      return [rotate('left'), rotate('right')];

    case 'splitter':
      // Base 0°: input LEFT, outputs RIGHT + BOTTOM
      return [rotate('left'), rotate('right'), rotate('bottom')];

    // Omnidirectional pieces — all 4 sides always
    case 'source':
    case 'output':
    case 'gear':
    case 'configNode':
    case 'scanner':
    case 'transmitter':
      return ALL;
  }
}

// ─── Connection logic ─────────────────────────────────────────────────────────

/**
 * Returns true if two pieces are adjacent on the grid and both have
 * active ports on the facing sides (respecting rotation).
 */
export function canConnect(piece1: PlacedPiece, piece2: PlacedPiece): boolean {
  const dx = piece2.gridX - piece1.gridX;
  const dy = piece2.gridY - piece1.gridY;

  if (Math.abs(dx) + Math.abs(dy) !== 1) return false;

  let facingSide: PortSide | null = null;
  if (dx === 1 && dy === 0) facingSide = 'right';
  if (dx === -1 && dy === 0) facingSide = 'left';
  if (dx === 0 && dy === 1) facingSide = 'bottom';
  if (dx === 0 && dy === -1) facingSide = 'top';

  if (!facingSide) return false;

  const opposite = OPPOSITE_SIDE[facingSide];

  // Check rotation-aware active ports
  const p1Active = getActivePorts(piece1);
  const p2Active = getActivePorts(piece2);

  return p1Active.includes(facingSide) && p2Active.includes(opposite);
}

/**
 * Scans all placed physics pieces and returns wires for adjacent pairs
 * that can connect via facing ports.
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

      // Find the specific ports that face each other
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
 * Returns IDs of all pieces directly connected to the given piece via wires.
 */
export function getConnectedPieces(
  pieceId: string,
  _pieces: PlacedPiece[],
  wires: Wire[],
): string[] {
  const connected: string[] = [];
  for (const w of wires) {
    if (w.fromPieceId === pieceId) connected.push(w.toPieceId);
    if (w.toPieceId === pieceId) connected.push(w.fromPieceId);
  }
  return connected;
}

// ─── Machine Execution ────────────────────────────────────────────────────────

/**
 * Core Turing machine execution loop.
 * Traces signal from Source through connected pieces. Returns ordered steps.
 *
 * Rules:
 * - Signal starts at Source
 * - Travels through Physics pieces in connection order
 * - ConfigNode: checks configuration against node condition
 * - Scanner: reads current DataTrail cell, advances head
 * - Transmitter: writes value to current DataTrail cell
 * - Output: returns success
 * - If signal cannot continue: void failure
 */
export function executeMachine(state: MachineState): ExecutionStep[] {
  const { pieces, wires, dataTrail, configuration } = state;
  const steps: ExecutionStep[] = [];
  let stepTime = 0;

  // Find the source piece
  const source = pieces.find(p => p.type === 'source');
  if (!source) {
    steps.push({
      pieceId: 'none',
      type: 'error',
      timestamp: stepTime,
      success: false,
      message: 'No source piece found',
    });
    return steps;
  }

  // BFS/DFS traversal from source through wires
  const visited = new Set<string>();
  const queue: string[] = [source.id];

  // Make a mutable copy of the data trail
  const trail = {
    cells: [...dataTrail.cells],
    headPosition: dataTrail.headPosition,
  };

  while (queue.length > 0) {
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
            // Signal is blocked, don't continue from this piece
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
        return steps; // Successfully completed
    }

    steps.push(step);

    // Find connected pieces and add unvisited ones to queue
    const neighbors = getConnectedPieces(currentId, pieces, wires);
    for (const nId of neighbors) {
      if (!visited.has(nId)) {
        queue.push(nId);
      }
    }
  }

  // If we get here, signal never reached output
  const lastStep = steps[steps.length - 1];
  if (!lastStep || lastStep.type !== 'output') {
    steps.push({
      pieceId: 'none',
      type: 'void',
      timestamp: stepTime,
      success: false,
      message: 'Signal lost — could not reach output. VOID STATE.',
    });
  }

  return steps;
}

// ─── Star rating ──────────────────────────────────────────────────────────────

/**
 * 3 stars: solved with optimalPieces or fewer
 * 2 stars: solved with up to double optimal
 * 1 star:  solved any other way
 */
export function calculateStars(
  steps: ExecutionStep[],
  piecesUsed: number,
  optimalPieces: number,
): 0 | 1 | 2 | 3 {
  // Check if the machine actually succeeded
  const succeeded = steps.some(s => s.type === 'output' && s.success);
  if (!succeeded) return 1;

  if (piecesUsed <= optimalPieces) return 3;
  if (piecesUsed <= optimalPieces * 2) return 2;
  return 1;
}

// ─── Piece factory helpers ────────────────────────────────────────────────────

/**
 * Returns the default ports for a given piece type.
 * Physics pieces get 4 directional ports.
 * Protocol pieces get input/output ports.
 */
export function getDefaultPorts(type: PlacedPiece['type']): PlacedPiece['ports'] {
  const allSides: PortSide[] = ['top', 'bottom', 'left', 'right'];

  switch (type) {
    case 'source':
      return allSides.map(side => ({
        id: `port-${side}`,
        side,
        connected: false,
      }));

    case 'output':
      return allSides.map(side => ({
        id: `port-${side}`,
        side,
        connected: false,
      }));

    case 'conveyor':
      // Passes signal through — has all 4 sides
      return allSides.map(side => ({
        id: `port-${side}`,
        side,
        connected: false,
      }));

    case 'gear':
      // Redirects — has all 4 sides
      return allSides.map(side => ({
        id: `port-${side}`,
        side,
        connected: false,
      }));

    case 'splitter':
      return allSides.map(side => ({
        id: `port-${side}`,
        side,
        connected: false,
      }));

    case 'configNode':
      return allSides.map(side => ({
        id: `port-${side}`,
        side,
        connected: false,
      }));

    case 'scanner':
      return allSides.map(side => ({
        id: `port-${side}`,
        side,
        connected: false,
      }));

    case 'transmitter':
      return allSides.map(side => ({
        id: `port-${side}`,
        side,
        connected: false,
      }));
  }
}

/**
 * Returns the category for a piece type.
 */
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
