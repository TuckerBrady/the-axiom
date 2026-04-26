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
    case 'obstacle':
      return [];                              // Impassable terrain — no input
    case 'source':
      return [];                              // Source has no input
    case 'merger':
      return [rotateSide('left', rot), rotateSide('top', rot)];
    case 'bridge':
      return [rotateSide('left', rot), rotateSide('top', rot)];
    case 'inverter':
    case 'counter':
    case 'latch':
      return [rotateSide('left', rot)];
    case 'terminal':
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
    case 'obstacle':
      return [];                              // Impassable terrain — no output
    case 'terminal':
      return [];                              // Output has no output
    case 'merger':
      return [rotateSide('right', rot)];
    case 'bridge':
      return [rotateSide('right', rot), rotateSide('bottom', rot)];
    case 'inverter':
    case 'counter':
    case 'latch':
      return [rotateSide('right', rot)];
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
        // Determine wire direction from actual port flow:
        // A outputs on aSide AND B inputs on bSide → A→B
        // B outputs on bSide AND A inputs on aSide → B→A
        const aOutputs = getOutputPorts(a).includes(aSide);
        const bInputs = getInputPorts(b).includes(bSide);
        const bOutputs = getOutputPorts(b).includes(bSide);
        const aInputs = getInputPorts(a).includes(aSide);

        let fromId = a.id;
        let fromPortId = aPort.id;
        let toId = b.id;
        let toPortId = bPort.id;

        if (bOutputs && aInputs && !(aOutputs && bInputs)) {
          // Reverse: B→A
          fromId = b.id;
          fromPortId = bPort.id;
          toId = a.id;
          toPortId = aPort.id;
        }

        wires.push({
          id: `wire-${fromId}-${toId}`,
          fromPieceId: fromId,
          fromPortId,
          toPieceId: toId,
          toPortId,
        });
      }
    }
  }

  return wires;
}

// Protocol piece types that enforce straight-through routing
const STRAIGHT_THROUGH_TYPES = new Set(['configNode', 'scanner', 'transmitter']);

/**
 * Returns IDs of pieces that the given piece can send signal TO (directional).
 * For protocol pieces (configNode, scanner, transmitter), enforces straight-through:
 * signal exits only from the side opposite to where it entered.
 */
function getDirectionalNeighbors(
  piece: PlacedPiece,
  allPieces: PlacedPiece[],
  entrySide?: PortSide,
): PlacedPiece[] {
  const neighbors: PlacedPiece[] = [];
  let outputSides = getOutputPorts(piece);

  // Straight-through enforcement: if this is a protocol piece and we know
  // which side signal entered from, limit output to the opposite side only.
  if (entrySide && STRAIGHT_THROUGH_TYPES.has(piece.type)) {
    const exitSide = OPPOSITE_SIDE[entrySide];
    outputSides = outputSides.includes(exitSide) ? [exitSide] : [];
  }

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
 * piece behavior. Scanner reads inputTape[pulseIndex] and writes it to
 * dataTrail.cells[pulseIndex]. Config Node reads dataTrail.cells[pulseIndex]
 * to gate. Transmitter writes to outputTape[pulseIndex]. Trail and
 * outputTape state persist across pulses via mutation of the state object.
 */
export function executeMachine(state: MachineState, pulseIndex: number = 0): ExecutionStep[] {
  const { pieces, dataTrail, configuration } = state;
  const steps: ExecutionStep[] = [];
  let stepTime = 0;

  // Current pulse value read from inputTape (if present). This is the
  // "what the machine knows right now" driving configNode gating and
  // scanner reads.
  const tapeValue: number | undefined = state.inputTape?.[pulseIndex];

  const source = pieces.find(p => p.type === 'source');
  if (!source) {
    steps.push({ pieceId: 'none', type: 'error', timestamp: stepTime, success: false, message: 'No source piece found' });
    return steps;
  }

  const visited = new Set<string>();
  // Prompt 100 — BFS queue entries carry a `signalValue`, the bit
  // value being propagated along the path. Pieces that transform the
  // signal (Inverter flip, Latch READ override) update the outbound
  // value before enqueuing neighbors. Pieces that consume the signal
  // (Transmitter write) read it as-is. This is the source of truth
  // per TRANSMITTER_WRITE_CONTRACT clauses 3.1 / 3.3 — the Transmitter
  // writes the carried signal value, not the raw input-tape value.
  // Seed value comes from the input tape (clause 3.2: passthrough
  // matches input). When inputTape is undefined (legacy levels with
  // no tape), default to 0 so downstream typing stays clean.
  const queue: { id: string; entrySide?: PortSide; signalValue: number }[] = [
    { id: source.id, signalValue: tapeValue ?? 0 },
  ];

  const trail = {
    cells: [...dataTrail.cells],
    headPosition: dataTrail.headPosition,
  };

  while (queue.length > 0 && steps.length < MAX_STEPS) {
    const { id: currentId, entrySide, signalValue } = queue.shift()!;
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

    // Default outbound signal: passthrough. Pieces that transform the
    // signal (Inverter, Latch READ) overwrite this before the neighbor
    // enqueue at the bottom of the loop. Splitter / Conveyor / Gear /
    // Bridge / Merger / Scanner / Transmitter / Config Node leave it
    // alone — they do not transform the signal value (Scanner writes
    // to the trail; Transmitter writes the signal out; Config Node
    // gates without mutating).
    let outboundSignalValue: number = signalValue;

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

      case 'configNode': {
        const nodeValue = piece.configValue ?? 1;
        let trailValue: number | null;
        if (trail.cells.length > 0 && pulseIndex < trail.cells.length) {
          trailValue = trail.cells[pulseIndex];
        } else if (trail.cells.length > 0 && trail.headPosition < trail.cells.length) {
          trailValue = trail.cells[trail.headPosition];
        } else {
          trailValue = nodeValue;
        }
        const passes = trailValue !== null && trailValue === nodeValue;
        if (!passes) {
          step.success = false;
          const displayTrail = trailValue === null ? 'empty' : trailValue;
          step.message = `Configuration check failed — trail ${displayTrail} !== gate ${nodeValue}`;
          steps.push(step);
          continue;
        }
        const displayTrail = trailValue === null ? 'empty' : trailValue;
        step.message = `Configuration check passed — trail ${displayTrail} === gate ${nodeValue}`;
        break;
      }

      case 'scanner':
        if (tapeValue !== undefined) {
          if (pulseIndex < trail.cells.length) {
            trail.cells[pulseIndex] = tapeValue as 0 | 1;
          }
          step.message = `Scanned tape[${pulseIndex}] = ${tapeValue}, wrote to trail[${pulseIndex}]`;
        } else if (trail.cells.length > 0 && trail.headPosition < trail.cells.length) {
          const value = trail.cells[trail.headPosition];
          trail.headPosition++;
          step.message = `Scanned value: ${value}`;
        } else {
          step.message = 'Scanner: no data to read';
        }
        break;

      case 'transmitter':
        if (state.outputTape !== undefined) {
          // TRANSMITTER_WRITE_CONTRACT 3.1, 3.3, 4.1: write the
          // carried signal value (post-Inverter / post-Latch READ
          // transformations) to outputTape[pulseIndex]. Pre-Prompt-100
          // this wrote `tapeValue ?? 0` (the raw input tape value),
          // which silently dropped any upstream Inverter flip.
          const value = signalValue as 0 | 1;
          state.outputTape[pulseIndex] = value;
          step.message = `Wrote outputTape[${pulseIndex}] = ${value}`;
        } else if (trail.cells.length > 0 && trail.headPosition < trail.cells.length) {
          // Legacy non-tape path for older level shapes that have a
          // trail but no outputTape. Behavior preserved verbatim.
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
        // TRANSMITTER_WRITE_CONTRACT 3.3: Inverter operates on the
        // carried signal value, not the raw input tape. An upstream
        // chain like [Source -> Inverter -> Inverter -> Transmitter]
        // must compose correctly (1 -> 0 -> 1), which only works if
        // each Inverter reads the signal value from its predecessor.
        const inbound = signalValue;
        const inverted = (1 - inbound) as 0 | 1;
        outboundSignalValue = inverted;
        step.message = `Inverted ${inbound} -> ${inverted}`;
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
          // Latch WRITE captures the carried signal value, mirroring
          // the same source-of-truth shift Inverter and Transmitter use
          // (TRANSMITTER_WRITE_CONTRACT 3.3). Pre-Prompt-100 this read
          // tapeValue directly — same correctness gap as Transmitter.
          piece.storedValue = signalValue as 0 | 1;
          step.message = `Latch WRITE — stored ${piece.storedValue}`;
        } else {
          if (piece.storedValue == null) {
            step.success = false;
            step.message = 'Latch READ — no stored value, signal blocked';
            steps.push(step);
            continue;
          }
          // Latch READ overrides the outbound signal with the stored
          // value so downstream pieces see the read value, not the
          // value carried into the latch.
          outboundSignalValue = piece.storedValue;
          step.message = `Latch READ — output stored value ${piece.storedValue}`;
        }
        break;
      }

      case 'terminal':
        step.message = 'Signal reached output — success!';
        steps.push(step);
        state.dataTrail.cells = trail.cells;
        state.dataTrail.headPosition = trail.headPosition;
        return steps;
    }

    steps.push(step);

    // Follow directional output ports to find next pieces.
    // Pass entrySide so protocol pieces enforce straight-through routing.
    // Pass outboundSignalValue so transformations (Inverter flip,
    // Latch READ override) propagate to downstream pieces. For a
    // Splitter, every branch inherits the SAME outbound value — the
    // Splitter does not re-derive the signal per branch, it duplicates
    // it. Do not "optimize" by mutating outboundSignalValue per
    // neighbor; that would break dataflow semantics.
    const neighbors = getDirectionalNeighbors(piece, pieces, entrySide);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.id)) {
        // Determine which side of the neighbor the signal enters from
        const dx = neighbor.gridX - piece.gridX;
        const dy = neighbor.gridY - piece.gridY;
        let neighborEntrySide: PortSide;
        if (dx === 1) neighborEntrySide = 'left';
        else if (dx === -1) neighborEntrySide = 'right';
        else if (dy === 1) neighborEntrySide = 'top';
        else neighborEntrySide = 'bottom';
        queue.push({
          id: neighbor.id,
          entrySide: neighborEntrySide,
          signalValue: outboundSignalValue,
        });
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

  state.dataTrail.cells = trail.cells;
  state.dataTrail.headPosition = trail.headPosition;
  return steps;
}

// ─── Star rating ──────────────────────────────────────────────────────────────

/**
 * Star rating based on machine completeness.
 * Rewards using MORE pieces (Rube Goldberg philosophy).
 * 3 stars: succeeded AND used most/all of the tray pieces
 * 2 stars: succeeded but used few pieces
 * 1 star: succeeded minimally
 * 0 stars: failed (returned as 1 for backward compat with void display)
 *
 * @param totalTrayPieces - total pieces available in tray. If not provided,
 *   falls back to old behavior comparing against optimalPieces.
 */
export function calculateStars(
  steps: ExecutionStep[],
  piecesUsed: number,
  optimalPieces: number, // Reference only — kept for API compat
  totalTrayPieces?: number,
): 0 | 1 | 2 | 3 {
  const succeeded = steps.some(s => s.type === 'terminal' && s.success);
  if (!succeeded) return 1;

  const total = totalTrayPieces ?? optimalPieces;
  if (total <= 0) return 3;
  const ratio = piecesUsed / total;
  if (ratio >= 0.75) return 3;
  if (ratio >= 0.5) return 2;
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
    case 'terminal':
    case 'conveyor':
    case 'gear':
    case 'splitter':
    case 'merger':
    case 'bridge':
    case 'obstacle':
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
