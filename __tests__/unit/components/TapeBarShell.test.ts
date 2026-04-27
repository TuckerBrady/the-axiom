// Source-contract tests for TapeBarShell + TapeCell (Prompt 99B).
// The shell re-renders only when the per-cell highlight Map changes;
// individual cells short-circuit on unchanged highlight values
// (PERFORMANCE_CONTRACT 4.1.6).

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const shellSrc = read('src/components/gameplay/TapeBarShell.tsx');
const cellSrc = read('src/components/gameplay/TapeCell.tsx');
const screenSrc = read('src/screens/GameplayScreen.tsx');

describe('TapeBarShell — extracted tape rows', () => {
  it('exports a default React.memo-wrapped component', () => {
    expect(shellSrc).toMatch(/export default React\.memo\(TapeBarShellComponent\)/);
  });

  it('renders IN row only when inputTape is provided', () => {
    expect(shellSrc).toMatch(/const hasInputTape = !!inputTape && inputTape\.length > 0/);
    expect(shellSrc).toMatch(/\{hasInputTape && \(/);
  });

  it('renders TRAIL row whenever trailCells.length > 0 (covers tape and trail-only levels)', () => {
    expect(shellSrc).toMatch(/\{trailCells\.length > 0 && \(/);
  });

  it('renders OUT row only when both hasOutTape and hasInputTape are true', () => {
    expect(shellSrc).toMatch(/\{hasOutTape && hasInputTape && \(/);
  });

  it('forwards refs that the tutorial overlay measures (input/output/trail row + first-cell)', () => {
    expect(shellSrc).toMatch(/inputTapeRowRef:\s*React\.Ref<View>/);
    expect(shellSrc).toMatch(/outputTapeRowRef:\s*React\.Ref<View>/);
    expect(shellSrc).toMatch(/dataTrailRowRef:\s*React\.Ref<View>/);
    expect(shellSrc).toMatch(/inputTapeCellsRef:\s*React\.Ref<View>/);
    expect(shellSrc).toMatch(/dataTrailCellsRef:\s*React\.Ref<View>/);
    expect(shellSrc).toMatch(/outputTapeCellsRef:\s*React\.Ref<View>/);
  });

  it('GameplayScreen renders a single <TapeBarShell /> for both tape and trail-only cases', () => {
    // The two original blocks (input-tape + trail-only) collapsed
    // into one TapeBarShell call.
    const calls = screenSrc.match(/<TapeBarShell/g) ?? [];
    expect(calls.length).toBe(1);
  });
});

describe('TapeCell — per-cell memo barrier', () => {
  it('exports a memoized component with a custom areEqual that compares value + highlight + tape', () => {
    expect(cellSrc).toMatch(/const TapeCell = React\.memo\(function TapeCell/);
    expect(cellSrc).toMatch(/function arePropsEqual\(prev: Props, next: Props\): boolean/);
    expect(cellSrc).toMatch(/prev\.value === next\.value/);
    expect(cellSrc).toMatch(/prev\.highlight === next\.highlight/);
    expect(cellSrc).toMatch(/prev\.tape === next\.tape/);
  });

  it('renders three tape variants (in / trail / out) inside one component', () => {
    expect(cellSrc).toMatch(/if \(tape === 'in'\)/);
    expect(cellSrc).toMatch(/if \(tape === 'trail'\)/);
    // OUT branch is the fallthrough.
  });

  it('OUT branch renders middle-dot for blocked, value for passed, underscore otherwise', () => {
    // Match the conditional whether the literal char or the escape
    // is in the source — both encode U+00B7.
    const out = cellSrc.match(
      /gatePassed && hasValue[\s\S]*?\? written[\s\S]*?: gateBlocked[\s\S]*?\?[\s\S]*?: '_'/,
    );
    expect(out).not.toBeNull();
  });
});
