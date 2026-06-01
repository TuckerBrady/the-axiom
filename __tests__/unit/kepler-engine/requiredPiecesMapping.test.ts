// Tests — requiredPieces instance-to-type resolution at the calling boundary.
// Contract: project-docs/SPECS/SPEC_KEPLER_ENGINE.md Section 3.4 (G4).
// Driving levels: K1-6 (Colonist Hub), K1-8 (Transit Gate).
//
// The core evaluateRequiredPieces logic (placed-AND-fired; bypass fails; floor solve
// passes) is already covered by __tests__/unit/keplerRequiredPieces.test.ts
// (REQ-RP-1 .. REQ-RP-5). This file adds ONLY the audit gap 9 requirement: a fired
// piece carrying an Arc Wheel instance id (e.g. `inv-NN`, not a type string) MUST be
// resolved to its TYPE before matching requiredPieces, or K1-6/K1-8 silently report
// zero engaged.
//
// Phase 3 resolution: evaluateRequiredPieces gained a third optional parameter,
// placedPieces: PlacedPiece[]. Run states carry the instance id in `pieceId`; the
// function builds an id->type map from placedPieces and resolves each run state's
// id to its type before matching. When the id is not found (or no placedPieces is
// supplied) the id is treated as the type itself, preserving Suite 1.

import { getLevelById } from '../../../src/game/levels';
import type { PlacedPiece } from '../../../src/game/types';
import { evaluateRequiredPieces, getDefaultPorts, getPieceCategory } from '../../../src/game/engine';

type PieceRunState = { pieceId: string; firedDuringRun: boolean };

// Build a placed piece whose instance id is an Arc Wheel inventory id (inv-NN),
// not a type string — exactly the shape that triggered audit gap 9.
function makeInventoryPiece(
  invId: string,
  type: PlacedPiece['type'],
  gridX: number,
  gridY: number,
): PlacedPiece {
  return {
    id: invId,
    type,
    category: getPieceCategory(type),
    gridX,
    gridY,
    ports: getDefaultPorts(type),
    rotation: 0,
    isPrePlaced: false,
    firedDuringRun: true,
  };
}

describe('requiredPieces instance-to-type resolution (3.4.1)', () => {
  it('[REQ-REQPIECES-MAP-1] on K1-6, a real placed-and-fired Splitter and Merger whose instance ids are inventory ids (e.g. inv-03, inv-07) evaluate to result "satisfied"', () => {
    const level = getLevelById('K1-6')!;
    expect(level.requiredPieces).toEqual([
      { type: 'splitter', count: 1 },
      { type: 'merger', count: 1 },
    ]);

    // Arc Wheel placements: instance ids are inventory ids, NOT type strings.
    const placed: PlacedPiece[] = [
      makeInventoryPiece('inv-01', 'scanner', 1, 0),
      makeInventoryPiece('inv-03', 'splitter', 2, 0),
      makeInventoryPiece('inv-05', 'configNode', 2, 1),
      makeInventoryPiece('inv-07', 'merger', 3, 0),
      makeInventoryPiece('inv-09', 'transmitter', 4, 0),
    ];
    const runStates: PieceRunState[] = placed.map(p => ({
      pieceId: p.id,
      firedDuringRun: p.firedDuringRun ?? false,
    }));

    const result = evaluateRequiredPieces(level, runStates, placed);
    expect(result.result).toBe('satisfied');
  });

  it('[REQ-REQPIECES-MAP-1] on K1-8, real placed-and-fired Bridge + Latch + Splitter + Merger with inventory instance ids evaluate to result "satisfied"', () => {
    const level = getLevelById('K1-8')!;
    expect(level.requiredPieces).toEqual([
      { type: 'bridge', count: 1 },
      { type: 'latch', count: 1 },
      { type: 'splitter', count: 1 },
      { type: 'merger', count: 1 },
    ]);

    const placed: PlacedPiece[] = [
      makeInventoryPiece('inv-02', 'scanner', 1, 0),
      makeInventoryPiece('inv-04', 'latch', 2, 0),
      makeInventoryPiece('inv-06', 'splitter', 3, 0),
      makeInventoryPiece('inv-08', 'bridge', 3, 1),
      makeInventoryPiece('inv-10', 'configNode', 4, 1),
      makeInventoryPiece('inv-12', 'merger', 4, 0),
      makeInventoryPiece('inv-14', 'transmitter', 5, 0),
    ];
    const runStates: PieceRunState[] = placed.map(p => ({
      pieceId: p.id,
      firedDuringRun: p.firedDuringRun ?? false,
    }));

    const result = evaluateRequiredPieces(level, runStates, placed);
    expect(result.result).toBe('satisfied');
  });

  it('[REQ-REQPIECES-MAP-1] a fired instance with an inventory id MUST NOT be counted as missing merely because its raw id string does not equal the requiredPieces entry type', () => {
    const level = getLevelById('K1-6')!;

    // Single Splitter, placed from the wheel, fired. Its raw id ('inv-42')
    // never equals 'splitter' — pre-fix this would report splitter missing.
    const placed: PlacedPiece[] = [makeInventoryPiece('inv-42', 'splitter', 2, 0)];
    const runStates: PieceRunState[] = [{ pieceId: 'inv-42', firedDuringRun: true }];

    // Without resolution (no placedPieces array), the raw id mismatch causes a
    // missing report — this documents the bug the resolution closes.
    const unresolved = evaluateRequiredPieces(level, runStates);
    expect(unresolved.result).toBe('requiredPiecesNotEngaged');
    if (unresolved.result === 'requiredPiecesNotEngaged') {
      expect(unresolved.missing.map(m => m.type)).toContain('splitter');
    }

    // With resolution, inv-42 resolves to type 'splitter' and counts as engaged.
    // K1-6 also requires a merger, which is genuinely absent here — so the
    // result is still requiredPiecesNotEngaged, but splitter MUST NOT appear in
    // missing (it was resolved and counted), while merger MUST.
    const resolved = evaluateRequiredPieces(level, runStates, placed);
    expect(resolved.result).toBe('requiredPiecesNotEngaged');
    if (resolved.result === 'requiredPiecesNotEngaged') {
      const missingTypes = resolved.missing.map(m => m.type);
      expect(missingTypes).not.toContain('splitter');
      expect(missingTypes).toContain('merger');
    }
  });
});
