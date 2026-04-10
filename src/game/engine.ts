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
    case 'splitter': {
      // Magnet mechanic: input is any connected side NOT in connectedMagnetSides.
      // If no magnets connected yet, accept from all sides so BFS can reach it.
      const magnets = piece.connectedMagnetSides;
      if (!magnets || magnets.length === 0) return ALL;
      return ALL.filter(s => !magnets.includes(s));
    }
    case 'inputPort':
      return [];                              // Source has no input
    case 'merger':
      return [rotateSide('left', rot), rotateSide('top', rot)];
    case 'bridge':
      return [rotateSide('left', rot), rotateSide('top', rot)];
    case 'inverter':
    case 'counter':
    case 'latch':
      return [rotateSide('left', rot)];
    case 'outputPort':
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
    case 'splitter': {
      // Magnet mechanic: output via the two connected magnet sides.
      // Fewer than 2 magnets = Splitter blocks (no valid outputs).
      const mags = piece.connectedMagnetSides;
      if (mags && mags.length >= 2) return [mags[0], mags[1]];
      return [];
    }
    case 'outputPort':
      return [];                              // Output has no output
    case 'merger':
      return [rotateSide('right', rot)];
    case 'bridge':
      return [rotateSide('right', rot), rotateSide('bottom', rot)];
    case 'inverter':
    case 'counter':
    case 'latch':
      return [rotateSide('right', rot)];
    case 'inputPort':
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
 *
 * For tape-enabled levels, pass pulseIndex (0-based) to drive protocol
 * piece behavior off state.inputTape[pulseIndex]. Transmitter writes back
 * into state.outputTape[pulseIndex]. Callers should pass the same state
 * object across pulses so outputTape accumulates.
 */
export function executeMachine(state: MachineState, pulseIndex: number = 0): ExecutionStep[] {
  const { pieces, dataTrail, configuration } = state;
  const steps: ExecutionStep[] = [];
  let stepTime = 0;

  // Current pulse value read from inputTape (if present). This is the
  // "what the machine knows right now" driving configNode gating and
  // scanner reads.
  const tapeValue: number | undefined = state.inputTape?.[pulseIndex];

  const source = pieces.find(p => p.type === 'inputPort');
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
      case 'inputPort':
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

      case 'configNode': {
        const nodeValue = piece.configValue ?? 1;
        const trailValue = tapeValue !== undefined ? tapeValue : configuration;
        const passes = trailValue === nodeValue;
        if (!passes) {
          step.success = false;
          step.message = `Configuration check failed — trail ${trailValue} !== gate ${nodeValue}`;
          steps.push(step);
          continue;
        }
        step.message = `Configuration check passed — trail ${trailValue} === gate ${nodeValue}`;
        break;
      }

      case 'scanner':
        if (tapeValue !== undefined) {
          step.message = `Scanned tape[${pulseIndex}] = ${tapeValue}`;
        } else if (trail.cells.length > 0 && trail.headPosition < trail.cells.length) {
          const value = trail.cells[trail.headPosition];
          trail.headPosition++;
          step.message = `Scanned value: ${value}`;
        } else {
          step.message = 'Scanner: no data to read';
        }
        break;

      case 'transmitter':
        if (state.inputTape !== undefined && state.outputTape !== undefined) {
          // Write the current pulse value to outputTape[pulseIndex].
          state.outputTape[pulseIndex] = tapeValue ?? 0;
          step.message = `Wrote outputTape[${pulseIndex}] = ${tapeValue ?? 0}`;
        } else if (trail.cells.length > 0 && trail.headPosition < trail.cells.length) {
          trail.cells[trail.headPosition] = 1;
          step.message = `Transmitted value to cell ${trail.headPosition}`;
        } else {
          step.message = 'Transmitter: no cell to write';
        }
        break;

      case 'merger':
        step.message = 'Signal merged from input path';
        break;

      case 'bridge':
        step.message = 'Signal crossed bridge without interaction';
        break;

      case 'inverter': {
        if (tapeValue !== undefined) {
          const inverted = 1 - tapeValue;
          step.message = `Inverted ${tapeValue} -> ${inverted}`;
        } else {
          step.message = 'Inverter: passing signal unchanged (no tape)';
        }
        break;
      }

      case 'counter': {
        const threshold = piece.threshold ?? 2;
        const next = (piece.count ?? 0) + 1;
        if (next >= threshold) {
          piece.count = 0;
          step.message = `Counter reached threshold ${threshold} — signal released`;
        } else {
          piece.count = next;
          step.success = false;
          step.message = `Counter at ${next}/${threshold} — signal blocked`;
          steps.push(step);
          continue;
        }
        break;
      }

      case 'latch': {
        const mode = piece.latchMode ?? 'write';
        if (mode === 'write') {
          piece.storedValue = tapeValue ?? 0;
          step.message = `Latch WRITE — stored ${piece.storedValue}`;
        } else {
          if (piece.storedValue == null) {
            step.success = false;
            step.message = 'Latch READ — no stored value, signal blocked';
            steps.push(step);
            continue;
          }
          step.message = `Latch READ — output stored value ${piece.storedValue}`;
        }
        break;
      }

      case 'outputPort':
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
  const succeeded = steps.some(s => s.type === 'outputPort' && s.success);
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
    case 'inputPort':
    case 'outputPort':
    case 'conveyor':
    case 'gear':
    case 'splitter':
    case 'merger':
    case 'bridge':
      return 'physics';
    case 'configNode':
    case 'scanner':
    case 'transmitter':
    case 'inverter':
    case 'counter':
    case 'latch':
      return 'protocol';
  }
}
