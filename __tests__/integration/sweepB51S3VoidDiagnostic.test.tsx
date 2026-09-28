/**
 * SWEEP-B51 S3 (AXM-038): the VOID modal shows the Gear jam diagnostic.
 * Source-structure checks (UTF-8 reads).
 */
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.resolve(repoRoot, rel), 'utf-8');

describe('SWEEP-B51 S3 VOID diagnostic wiring', () => {
  test('[S3-9] the VOID modal renders voidDiagnosticLine in place of the random quote', () => {
    const modals = read('src/components/gameplay/GameplayModals.tsx');
    const start = modals.indexOf('{/* ── Void State Overlay');
    const end = modals.indexOf('{/* ── COGS Teach Card');
    expect(start).toBeGreaterThan(-1);
    const voidBlock = modals.slice(start, end);
    // The quote slot prefers the diagnostic, else the random quote.
    expect(voidBlock).toMatch(/\{voidDiagnosticLine \?\? VOID_QUOTES\[voidQuoteIndex\]\}/);
    // The blown-cell line is unchanged.
    expect(voidBlock).toMatch(/getBlownCellCOGSLine\(blownCells\.size\)/);
    // The prop is declared and received.
    expect(modals).toMatch(/voidDiagnosticLine: string \| null;/);

    const hook = read('src/hooks/useGameplayModals.ts');
    expect(hook).toMatch(/useState<string \| null>\(null\)/);
    expect(hook).toMatch(/voidDiagnosticLine: string \| null;/);
    expect(hook).toMatch(/setVoidDiagnosticLine: React\.Dispatch<React\.SetStateAction<string \| null>>;/);

    const screen = read('src/screens/GameplayScreen.tsx');
    const call = screen.slice(screen.indexOf('await handleVoidFailure({'));
    expect(call.slice(0, call.indexOf('});'))).toMatch(/setVoidDiagnosticLine: modals\.setVoidDiagnosticLine,/);
    expect(screen).toMatch(/voidDiagnosticLine=\{modals\.voidDiagnosticLine\}/);
  });
});
