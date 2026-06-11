// PROMPT_142 -- GAME-03 + GAME-04: OUT tape cell highlight wiring.
//
// Source-contract test (matching the OUT-tape contracts already in
// engagement/gateOutcomeColoring.test.ts -- the unit tier does not wire
// RNTL, so behavior of the rendered tree is pinned via the source).
//
// Root cause: interactions.ts already calls
//   setHighlight(ctx, `out-${pulse}`, 'write')        // Transmitter, value-independent
//   setHighlight(ctx, `out-${pulse}`, 'gate-block')   // Config Node block
// but TapeBarShell's OUT cell map hardcoded `highlight={undefined}`, dropping
// the `out-${pulse}` highlight. The fix reads tapeCellHighlights.get(`out-${i}`)
// exactly like the IN and TRAIL cells.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const shellSrc = read('src/components/gameplay/TapeBarShell.tsx');
const cellSrc = read('src/components/gameplay/TapeCell.tsx');

describe('PROMPT_142 -- GAME-03/GAME-04: OUT tape cell highlight wiring', () => {
  it('the OUT cell no longer hardcodes highlight={undefined}', () => {
    expect(shellSrc).not.toMatch(/highlight=\{undefined\}/);
  });

  it('the OUT cell reads tapeCellHighlights.get(`out-${i}`), mirroring the IN/TRAIL cells', () => {
    // IN and TRAIL cells already use the index-keyed lookup; the OUT cell
    // must use the same form so out-${pulse} highlights set by interactions.ts
    // are passed through.
    expect(shellSrc).toMatch(/tapeCellHighlights\.get\(`in-\$\{i\}`\)/);
    expect(shellSrc).toMatch(/tapeCellHighlights\.get\(`out-\$\{i\}`\)/);
  });

  it('the OUT cell highlight is a plain index-keyed lookup, not branched on the written value (GAME-04)', () => {
    // GAME-04: a 0-write must light the cell exactly like a 1-write. Because
    // the highlight is keyed by pulse index (not value), the same 'write'
    // highlight fires for both. Pin that the OUT <TapeCell ... highlight={...}>
    // prop is the bare map lookup with no value-dependent ternary.
    const outCellBlock = shellSrc.match(/key=\{`out-\$\{i\}`\}[\s\S]*?\/>/);
    expect(outCellBlock).not.toBeNull();
    expect(outCellBlock![0]).toMatch(/highlight=\{tapeCellHighlights\.get\(`out-\$\{i\}`\)\}/);
  });

  it("TapeCell's colorsForHighlight still handles both 'write' and 'gate-block'", () => {
    // 'write' fires for Transmitter writes (GAME-03/04); 'gate-block' for a
    // Config Node block upstream of the OUT cell (GAME-03 passthrough).
    expect(cellSrc).toMatch(/case 'write':/);
    expect(cellSrc).toMatch(/case 'gate-block':/);
  });
});
