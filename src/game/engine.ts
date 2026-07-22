import type {
  PlacedPiece,
  Wire,
  MachineState,
  ExecutionStep,
  LevelDefinition,
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
 * Count the inbound signal edges into a Merger instance — the number of distinct
 * upstream pieces whose output port faces one of the Merger's input ports. Used by
 * the deferred-evaluation hold (G3, SPEC_KEPLER_ENGINE.md §3.3) to know how many
 * paths to wait for before OR-ing them. Derived from live port adjacency
 * (`canSendTo`), the same routing rule the BFS uses, so it is a safe upper bound on
 * the number of paths that can actually arrive. When an inbound path is blocked
 * upstream and never arrives, the drain-fallback flush (see executeMachine) emits
 * the OR of whatever did arrive.
 */
function countMergerInboundEdges(merger: PlacedPiece, allPieces: PlacedPiece[]): number {
  return allPieces.reduce(
    (n, p) => (p.id !== merger.id && canSendTo(p, merger) ? n + 1 : n),
    0,
  );
}

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
  // G3 (REQ-MERGER-OR-1/2/3): deferred-Merger state. Each Merger that the BFS
  // reaches collects every inbound path's signal value here before emitting the
  // OR. Holding the Merger out of `visited` until its paths arrive is what stops
  // the visited-set from silently dropping the second converging path.
  const pendingMergers = new Map<string, { arrivals: number[]; expectedPaths: number }>();
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
  // G2 (REQ-CONFIG-LATCH-1/2): `carriesLatchValue` marks that the carried
  // `signalValue` is a value EMITTED by an upstream value-producing piece
  // (a Latch), as opposed to the default source seed. A downstream Config
  // Node gates on this carried value and MUST NOT fall back to the
  // empty-trail default pass when it is present. The source seed is NOT a
  // carried Latch value, so the existing trail/tape gating and default-pass
  // behavior are unchanged for machines with no upstream Latch.
  const queue: {
    id: string;
    entrySide?: PortSide;
    signalValue: number;
    carriesLatchValue: boolean;
    // G3: set by the drain-fallback to force a held Merger to emit when an
    // inbound path was blocked upstream and will never arrive on its own.
    flushMerger?: boolean;
  }[] = [{ id: source.id, signalValue: tapeValue ?? 0, carriesLatchValue: false }];

  const trail = {
    cells: [...dataTrail.cells],
    headPosition: dataTrail.headPosition,
  };

  // Outer loop: drain the BFS queue, then flush any held Merger that received at
  // least one inbound path but never reached `expectedPaths` (a path blocked
  // upstream that never arrives). Each flush re-seeds the queue, so we loop until
  // there is no queue work and no flushable Merger left (G3, REQ-MERGER-OR-3).
  let didWork = true;
  while (didWork) {
    didWork = false;

    while (queue.length > 0 && steps.length < MAX_STEPS) {
    const { id: currentId, entrySide, signalValue, carriesLatchValue, flushMerger } = queue.shift()!;
    if (visited.has(currentId)) continue;

    const piece = pieces.find(p => p.id === currentId);
    if (!piece) continue;

    // ── G3 (REQ-MERGER-OR-1/2/3): deferred Merger evaluation ──
    // A Merger reconverges multiple inbound paths under OR. Processing it on the
    // first arriving path (and marking it visited) is exactly the defect that
    // drops the second converging path. Instead, record each arrival and HOLD the
    // Merger — do not mark it visited, do not emit downstream — until every
    // expected inbound path has arrived. Only then does it fall through to normal
    // processing, where `case 'merger'` ORs the collected values. A `flushMerger`
    // entry (queued by the drain-fallback below) forces the hold to release when
    // an inbound path was blocked upstream and never arrives.
    if (piece.type === 'merger') {
      let pending = pendingMergers.get(currentId);
      if (!pending) {
        pending = { arrivals: [], expectedPaths: countMergerInboundEdges(piece, pieces) };
        pendingMergers.set(currentId, pending);
      }
      if (!flushMerger) {
        pending.arrivals.push(signalValue);
      }
      const allPathsArrived = pending.arrivals.length >= pending.expectedPaths;
      if (!flushMerger && !allPathsArrived) {
        continue; // hold for the remaining inbound path(s)
      }
      // ready — fall through to normal processing (visited add + OR in switch)
    }

    visited.add(currentId);

    piece.firedDuringRun = true;

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
    // G2: rides alongside `outboundSignalValue`. Pass-through pieces inherit
    // the inbound flag; a Latch sets it true (its emitted value becomes the
    // carried value a downstream Config Node gates on).
    let outboundCarriesLatchValue: boolean = carriesLatchValue;

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
        // G2 (REQ-CONFIG-LATCH-1/2): when a carried value emitted by an
        // upstream Latch is present, the value under test is that carried
        // signal value. This takes precedence over the Data Trail and MUST
        // NOT fall back to the empty-trail default pass.
        if (carriesLatchValue) {
          const passes = signalValue === nodeValue;
          if (!passes) {
            step.success = false;
            step.message = `Configuration check failed — value ${signalValue} !== gate ${nodeValue}`;
            steps.push(step);
            continue;
          }
          step.message = `Configuration check passed — value ${signalValue} === gate ${nodeValue}`;
          break;
        }
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

      case 'merger': {
        // G3 (REQ-MERGER-OR-1/2/3): emit the OR of every inbound path value
        // collected during the deferred hold — 1 if any delivering path carried
        // 1, else 0. A non-delivering (blocked-upstream) path contributes no
        // operand, so a single delivering path makes the Merger emit that path's
        // value. A merged value is a fresh derived result, not a single Latch's
        // emission, so it does not carry a Latch value downstream (G2 flag cleared).
        const pending = pendingMergers.get(piece.id);
        const arrivals = pending?.arrivals ?? [signalValue];
        outboundSignalValue = arrivals.some(v => v === 1) ? 1 : 0;
        outboundCarriesLatchValue = false;
        step.message = `Signal merged (OR of ${arrivals.length} path${
          arrivals.length === 1 ? '' : 's'
        }) = ${outboundSignalValue}`;
        break;
      }

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
        // A Latch with unset latchMode is treated as 'write'
        // (REQ-LATCH-PREPLACE-1, deterministic default).
        const mode = piece.latchMode ?? 'write';
        // G2 (REQ-CONFIG-LATCH-1): a Latch emits a value downstream; mark the
        // carried signal so a downstream Config Node gates on the Latch's
        // emitted value rather than the Data Trail / default pass.
        outboundCarriesLatchValue = true;
        if (mode === 'write') {
          // Latch WRITE captures the carried signal value, mirroring
          // the same source-of-truth shift Inverter and Transmitter use
          // (TRANSMITTER_WRITE_CONTRACT 3.3). Pre-Prompt-100 this read
          // tapeValue directly — same correctness gap as Transmitter.
          piece.storedValue = signalValue as 0 | 1;
          step.message = `Latch WRITE — stored ${piece.storedValue}`;
        } else if (mode === 'delay') {
          // Latch DELAY — true D flip-flop (G1, SPEC_KEPLER_ENGINE 3.1).
          // Read-before-write within the pulse (REQ-LATCH-DELAY-3): emit
          // the value captured on the previous pulse, then capture the
          // current inbound value for the next pulse. On the first pulse
          // of a run nothing is stored, so emit 0 (REQ-LATCH-DELAY-2).
          // A DELAY Latch always passes — it never blocks
          // (REQ-LATCH-DELAY-4); it only transforms the carried value.
          const emitted = piece.storedValue ?? 0;
          outboundSignalValue = emitted;
          piece.storedValue = signalValue as 0 | 1;
          step.message = `Latch DELAY — emitted ${emitted}, stored ${piece.storedValue}`;
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
          carriesLatchValue: outboundCarriesLatchValue,
        });
      }
    }
    }

    // ── G3 drain-fallback (REQ-MERGER-OR-3) ──
    // A held Merger that received at least one arrival but never reached
    // `expectedPaths` (because an inbound path was blocked upstream and will
    // never arrive) must still emit. Re-queue it with `flushMerger` so it
    // releases on the next inner pass and ORs whatever delivered. Guarded by
    // MAX_STEPS so a permanently-held Merger can never spin the outer loop.
    if (steps.length < MAX_STEPS) {
      for (const [mergerId, pending] of pendingMergers) {
        if (!visited.has(mergerId) && pending.arrivals.length >= 1) {
          queue.push({ id: mergerId, signalValue: 0, carriesLatchValue: false, flushMerger: true });
          didWork = true;
        }
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

// ─── Required pieces enforcement ─────────────────────────────────────────────

export interface PieceRunState {
  pieceId: string;
  firedDuringRun: boolean;
}

export type RequiredPiecesResult =
  | { result: 'satisfied' }
  | {
      result: 'requiredPiecesNotEngaged';
      missing: Array<{ type: string; required: number; engaged: number }>;
    };

/**
 * Reset per-run piece state at run start (precedes pulse 0). Accepts either a
 * raw PlacedPiece[] (legacy callers) or a MachineState (the run-init path).
 * Clears `firedDuringRun` on every piece and, per REQ-LATCH-RESET-1, clears each
 * Latch's `storedValue` to null so consecutive runs are independent and a DELAY
 * Latch emits 0 on pulse 0 of every run.
 */
export function resetRunState(pieces: PlacedPiece[]): void;
export function resetRunState(state: MachineState): void;
export function resetRunState(arg: PlacedPiece[] | MachineState): void {
  const pieces = Array.isArray(arg) ? arg : arg.pieces;
  for (const p of pieces) {
    p.firedDuringRun = false;
    if (p.type === 'latch') {
      p.storedValue = null;
    }
  }
}

/**
 * The Latch tap-cycle (REQ-LATCH-MODE-1): write -> read -> delay -> write.
 * A tapped Latch with no mode set is treated as 'write' (the deterministic
 * default), so the first tap advances it to 'read'. The third mode, 'delay'
 * (D flip-flop), is the cross-pulse memory required by K1-9/K1-10 and is
 * unreachable without this three-state cycle.
 */
export function nextLatchMode(
  mode: PlacedPiece['latchMode'],
): 'write' | 'read' | 'delay' {
  switch (mode ?? 'write') {
    case 'write':
      return 'read';
    case 'read':
      return 'delay';
    default:
      return 'write';
  }
}

/**
 * Resolve a run state's `pieceId` to the piece TYPE used for requiredPieces
 * matching (REQ-REQPIECES-MAP-1, SPEC_KEPLER_ENGINE.md §3.4).
 *
 * Arc Wheel placements carry an inventory instance id (e.g. `inv-07`), not a
 * type string. We look the id up in the placed-pieces array to recover its
 * type. When no placed-pieces array is supplied, or the id is not found in it,
 * we fall back to treating the `pieceId` itself as the type — this preserves
 * the existing contract (keplerRequiredPieces.test.ts) where run states already
 * carry type strings as their `pieceId`.
 */
function resolveRunStateType(
  state: PieceRunState,
  typeById: Map<string, string> | undefined,
): string {
  return typeById?.get(state.pieceId) ?? state.pieceId;
}

export function evaluateRequiredPieces(
  levelDef: LevelDefinition,
  pieceRunStates: PieceRunState[],
  placedPieces?: PlacedPiece[],
): RequiredPiecesResult {
  const required = levelDef.requiredPieces;
  if (!required || required.length === 0) return { result: 'satisfied' };

  // Build an instance-id -> type lookup so Arc Wheel inventory ids (inv-NN)
  // resolve to a real piece type before matching (REQ-REQPIECES-MAP-1).
  const typeById = placedPieces
    ? new Map(placedPieces.map(p => [p.id, p.type as string]))
    : undefined;

  const missing: Array<{ type: string; required: number; engaged: number }> = [];

  for (const entry of required) {
    const engaged = pieceRunStates.filter(
      s => resolveRunStateType(s, typeById) === entry.type && s.firedDuringRun,
    ).length;
    if (engaged < entry.count) {
      missing.push({ type: entry.type, required: entry.count, engaged });
    }
  }

  if (missing.length === 0) return { result: 'satisfied' };
  return { result: 'requiredPiecesNotEngaged', missing };
}

/**
 * Evaluate the minPieces hard floor: a completing run must engage at least
 * `level.minPieces` player-placed pieces. Pre-placed pieces (Source, Terminal,
 * Resonator, etc.) are excluded, as are pieces that never fired during the run.
 * Pushes the Engineer toward elaborate machines rather than minimal wires.
 *
 * Returns the active count, the required floor, and whether the floor is met.
 * A level with no minPieces (undefined or <= 0) always returns met: true.
 */
export function evaluateMinPieces(
  level: LevelDefinition,
  placedPieces: PlacedPiece[],
): { met: boolean; active: number; required: number } {
  const active = placedPieces.filter(
    p => !p.isPrePlaced && p.firedDuringRun === true,
  ).length;
  const required = level.minPieces ?? 0;
  if (required <= 0) return { met: true, active, required: 0 };
  return { met: active >= required, active, required };
}
