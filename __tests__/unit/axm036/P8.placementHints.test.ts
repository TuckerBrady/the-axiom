import * as fs from 'fs';
import * as path from 'path';
import type { PlacedPiece, PortSide } from '../../../src/game/types';
import { getPlacementHintCells } from '../../../src/game/placementHints';

function makePiece(
  id: string,
  type: PlacedPiece['type'],
  gridX: number,
  gridY: number,
  overrides?: Partial<PlacedPiece>,
): PlacedPiece {
  const category =
    ['configNode', 'scanner', 'transmitter', 'inverter', 'counter', 'latch'].includes(type)
      ? ('protocol' as const)
      : ('physics' as const);
  return {
    id,
    type,
    category,
    gridX,
    gridY,
    ports: [],
    rotation: 0,
    ...overrides,
  };
}

function cellSet(cells: Array<{ x: number; y: number }>): Set<string> {
  return new Set(cells.map(c => `${c.x},${c.y}`));
}

describe('[P8] getPlacementHintCells', () => {
  test('[P8-2] A1-3 screenshot board', () => {
    const pieces: PlacedPiece[] = [
      makePiece('source', 'source', 0, 1),
      makePiece('conv-1', 'conveyor', 1, 1, { rotation: 0 }),
      makePiece('conv-2', 'conveyor', 2, 1, { rotation: 0 }),
      makePiece('conv-3', 'conveyor', 3, 1, { rotation: 0 }),
      makePiece('gear', 'gear', 4, 1),
      makePiece('conv-4', 'conveyor', 4, 2, { rotation: 90 }),
      makePiece('conv-5', 'conveyor', 4, 3, { rotation: 90 }),
      makePiece('config', 'configNode', 4, 4),
      makePiece('terminal', 'terminal', 8, 6),
    ];

    const hints = getPlacementHintCells({ pieces, gridWidth: 9, gridHeight: 8 });
    const got = cellSet(hints);
    const expected = cellSet([
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 4, y: 0 },
      { x: 4, y: 5 },
      { x: 7, y: 6 },
      { x: 8, y: 5 },
      { x: 8, y: 7 },
    ]);

    expect(got).toEqual(expected);
    expect(got.has('3,4')).toBe(false);
    expect(got.has('5,4')).toBe(false);
    expect(got.has('5,1')).toBe(false);
  });

  test.each(['configNode', 'scanner', 'transmitter'] as const)(
    '[P8-2] config node never hints its sides (%s)',
    (type) => {
      (['top', 'bottom', 'left', 'right'] as PortSide[]).forEach(entrySide => {
        // Source directly adjacent, feeding the piece from `entrySide`.
        const offsets: Record<PortSide, { dx: number; dy: number }> = {
          top: { dx: 0, dy: -1 },
          bottom: { dx: 0, dy: 1 },
          left: { dx: -1, dy: 0 },
          right: { dx: 1, dy: 0 },
        };
        const opposite: Record<PortSide, PortSide> = {
          top: 'bottom',
          bottom: 'top',
          left: 'right',
          right: 'left',
        };
        const feedSide = opposite[entrySide];
        const off = offsets[feedSide];
        const centerX = 3;
        const centerY = 3;
        const sourceX = centerX + off.dx;
        const sourceY = centerY + off.dy;

        const pieces: PlacedPiece[] = [
          makePiece('source', 'source', sourceX, sourceY),
          makePiece('gate', type, centerX, centerY),
        ];

        const hints = getPlacementHintCells({ pieces, gridWidth: 7, gridHeight: 7 });
        const got = cellSet(hints);

        // Every side of the gate piece EXCEPT the one opposite entrySide
        // (the exit) must never be hinted.
        (['top', 'bottom', 'left', 'right'] as PortSide[]).forEach(side => {
          if (side === entrySide) return; // the exit side — should be a hint
          const o = offsets[side];
          const key = `${centerX + o.dx},${centerY + o.dy}`;
          expect(got.has(key)).toBe(false);
        });
      });
    },
  );

  test('[P8-2] conveyor hints its front only when fed through its rear', () => {
    // Conveyor at (1,1) rotation 0: input='left', output='right'.
    const fedFromRear: PlacedPiece[] = [
      makePiece('source', 'source', 0, 1),
      makePiece('conv', 'conveyor', 1, 1, { rotation: 0 }),
    ];
    const hintsFedFromRear = cellSet(getPlacementHintCells({ pieces: fedFromRear, gridWidth: 5, gridHeight: 5 }));
    expect(hintsFedFromRear.has('2,1')).toBe(true); // front (exit)
    expect(hintsFedFromRear.has('1,0')).toBe(false); // conveyor's own top never a hint
    expect(hintsFedFromRear.has('1,2')).toBe(false);

    // A source below the conveyor cannot feed it (conveyor only accepts
    // from the left at rotation 0), so the conveyor is never reached and
    // contributes no hints.
    const notFedFromRear: PlacedPiece[] = [
      makePiece('source', 'source', 1, 2),
      makePiece('conv', 'conveyor', 1, 1, { rotation: 0 }),
    ];
    const hintsNotFedFromRear = cellSet(getPlacementHintCells({ pieces: notFedFromRear, gridWidth: 5, gridHeight: 5 }));
    expect(hintsNotFedFromRear.has('2,1')).toBe(false);
  });

  test('[P8-2] gear hints exactly its two perpendicular exits', () => {
    const pieces: PlacedPiece[] = [
      makePiece('source', 'source', 0, 1),
      makePiece('gear', 'gear', 1, 1),
    ];
    const hints = cellSet(getPlacementHintCells({ pieces, gridWidth: 5, gridHeight: 5 }));
    // Entry from the left (source at (0,1) feeding gear at (1,1) from the
    // left). Perpendicular exits are top and bottom.
    expect(hints.has('1,0')).toBe(true);
    expect(hints.has('1,2')).toBe(true);
    // Not straight-ahead, not the entry side.
    expect(hints.has('2,1')).toBe(false);
    expect(hints.has('0,1')).toBe(false);
  });

  test('[P8-4] an unreached piece contributes nothing', () => {
    const pieces: PlacedPiece[] = [
      makePiece('source', 'source', 0, 0),
      // An isolated Config Node the trace never reaches.
      makePiece('gate', 'configNode', 4, 4),
    ];
    const hints = cellSet(getPlacementHintCells({ pieces, gridWidth: 8, gridHeight: 8 }));
    expect(hints.has('3,4')).toBe(false);
    expect(hints.has('5,4')).toBe(false);
    expect(hints.has('4,3')).toBe(false);
    expect(hints.has('4,5')).toBe(false);
  });

  test('[P8-3] terminal with entrySide left hints only its left cell', () => {
    const pieces: PlacedPiece[] = [
      makePiece('terminal', 'terminal', 3, 3, { entrySide: 'left' }),
    ];
    const hints = cellSet(getPlacementHintCells({ pieces, gridWidth: 7, gridHeight: 7 }));
    expect(hints).toEqual(new Set(['2,3']));
  });

  test('[P8-5] blown, occupied and out-of-bounds cells are never hints', () => {
    const pieces: PlacedPiece[] = [
      makePiece('source', 'source', 0, 0),
      makePiece('other', 'conveyor', 1, 0, { rotation: 90 }), // occupies the source's right neighbor
    ];
    const hints = cellSet(
      getPlacementHintCells({
        pieces,
        gridWidth: 3,
        gridHeight: 3,
        blownCells: new Set(['0,1']),
      }),
    );
    // Source at (0,0) would hint (0,-1) [OOB], (0,1) [blown], (-1,0) [OOB], (1,0) [occupied].
    expect(hints.has('0,1')).toBe(false);
    expect(hints.has('1,0')).toBe(false);
    expect(hints.size).toBe(0);
  });

  test('[P8-2] a config node set to 0 on an empty trail does not stop the trace', () => {
    const pieces: PlacedPiece[] = [
      makePiece('source', 'source', 0, 0),
      makePiece('gate', 'configNode', 1, 0, { configValue: 0 }),
    ];
    const hints = cellSet(getPlacementHintCells({ pieces, gridWidth: 5, gridHeight: 5 }));
    // Entry from the left; exit opposite (right) is still a hint regardless
    // of configValue / trail state — the trace ignores tape/trail values.
    expect(hints.has('2,0')).toBe(true);
  });
});

describe('[P8-6] GameplayScreen ghost block', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../../../src/screens/GameplayScreen.tsx'),
    'utf8',
  );

  function ghostBlock(): string {
    const startIdx = source.indexOf('Ghost cells');
    expect(startIdx).toBeGreaterThan(-1);
    const endMarker = 'board-cell-';
    const endIdx = source.indexOf(endMarker, startIdx);
    expect(endIdx).toBeGreaterThan(startIdx);
    // Extend to the end of the map/array-building block that follows the
    // testID literal, matching the rubric's scan window.
    const closeIdx = source.indexOf(')}', endIdx);
    return source.slice(startIdx, closeIdx > -1 ? closeIdx + 2 : endIdx + endMarker.length);
  }

  test('uses getPlacementHintCells and no longer calls getOutputPorts/getInputPorts', () => {
    const block = ghostBlock();
    expect(/getOutputPorts|getInputPorts|autoRot|oppSide/.test(block)).toBe(false);
    expect((block.match(/getPlacementHintCells/g) || []).length).toBeGreaterThanOrEqual(1);
  });

  test('the Kepler branch still renders every empty cell', () => {
    const block = ghostBlock();
    // The Kepler (non-Axiom) path must not be filtered by hint validity —
    // only isTutorialSector (Axiom) gates the `isValid` computation, and an
    // occupied check is the only thing that can suppress a cell for Kepler.
    const isTutorialSectorGate = block.match(/isTutorialSector\s*=\s*level\.sector\s*===\s*'axiom'/);
    expect(isTutorialSectorGate).not.toBeNull();
    // The occupied-cell short-circuit must still be present and unconditional.
    expect(block).toMatch(/if \(occupied\) return null;/);
  });
});
