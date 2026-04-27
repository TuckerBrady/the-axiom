// Source-contract tests for BoardGrid + BoardPiece (Prompt 99B).
// Per-piece prop isolation lives in BoardPiece — when pieceAnimState
// changes, only the BoardPiece whose own animProps slice changed
// re-renders (PERFORMANCE_CONTRACT 4.2.2).

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const gridSrc = read('src/components/gameplay/BoardGrid.tsx');
const pieceSrc = read('src/components/gameplay/BoardPiece.tsx');
const screenSrc = read('src/screens/GameplayScreen.tsx');

describe('BoardGrid — wraps the per-piece map', () => {
  it('exports a default React.memo-wrapped component', () => {
    expect(gridSrc).toMatch(/export default React\.memo\(BoardGridComponent\)/);
  });

  it('takes pieces, pieceAnimProps Map, flashing Map, locked Set, and stable callbacks', () => {
    expect(gridSrc).toMatch(/pieces:\s*PlacedPiece\[\]/);
    expect(gridSrc).toMatch(/pieceAnimProps:\s*Map<string, PieceAnimProps>/);
    expect(gridSrc).toMatch(/flashingMap:\s*Map<string, string>/);
    expect(gridSrc).toMatch(/lockedSet:\s*Set<string>/);
    expect(gridSrc).toMatch(/onPieceTap:\s*\(id: string\)\s*=>\s*void/);
    expect(gridSrc).toMatch(/onPieceLongPress:\s*\(id: string\)\s*=>\s*void/);
  });

  it('passes the parent callbacks DIRECTLY to BoardPiece (no per-piece closure allocation)', () => {
    // Inline `() => onPieceTap(piece.id)` would defeat the memo. The
    // child receives the parent's stable function reference and
    // does its own (id) -> void invocation internally.
    expect(gridSrc).toMatch(/onTap=\{onPieceTap\}/);
    expect(gridSrc).toMatch(/onLongPress=\{onPieceLongPress\}/);
  });
});

describe('BoardPiece — per-piece prop isolation', () => {
  it('exports a memoized component with a custom areEqual', () => {
    expect(pieceSrc).toMatch(/const BoardPiece = React\.memo\(function BoardPiece/);
    expect(pieceSrc).toMatch(/function arePropsEqual\(prev: Props, next: Props\): boolean/);
  });

  it('areEqual compares animProps shallowly across animType / gateResult / failColor', () => {
    expect(pieceSrc).toMatch(/a\.animType === b\.animType/);
    expect(pieceSrc).toMatch(/a\.gateResult === b\.gateResult/);
    expect(pieceSrc).toMatch(/a\.failColor === b\.failColor/);
  });

  it('areEqual compares cellSize / flashColor / isLocked / iconColor / pieceRef / callbacks / piece by reference', () => {
    expect(pieceSrc).toMatch(/prev\.cellSize !== next\.cellSize/);
    expect(pieceSrc).toMatch(/prev\.flashColor !== next\.flashColor/);
    expect(pieceSrc).toMatch(/prev\.isLocked !== next\.isLocked/);
    expect(pieceSrc).toMatch(/prev\.iconColor !== next\.iconColor/);
    expect(pieceSrc).toMatch(/prev\.pieceRef !== next\.pieceRef/);
    expect(pieceSrc).toMatch(/prev\.onTap !== next\.onTap/);
    expect(pieceSrc).toMatch(/prev\.onLongPress !== next\.onLongPress/);
    expect(pieceSrc).toMatch(/prev\.piece !== next\.piece/);
  });

  it('renders PieceIcon with all per-piece animation flags', () => {
    expect(pieceSrc).toMatch(/<PieceIcon[\s\S]*?spinning=\{animType === 'spinning'\}/);
    expect(pieceSrc).toMatch(/locking=\{animType === 'locking'\}/);
    expect(pieceSrc).toMatch(/charging=\{animType === 'charging'\}/);
  });
});

describe('GameplayScreen wires BoardGrid with stable callbacks', () => {
  it('imports BoardGrid', () => {
    expect(screenSrc).toMatch(
      /import BoardGrid from '\.\.\/components\/gameplay\/BoardGrid'/,
    );
  });

  it('renders <BoardGrid /> with onPieceTap / onPieceLongPress (useCallback-stabilized)', () => {
    expect(screenSrc).toMatch(/<BoardGrid[\s\S]*?onPieceTap=\{handlePieceTap\}/);
    expect(screenSrc).toMatch(/<BoardGrid[\s\S]*?onPieceLongPress=\{handlePieceLongPress\}/);
  });

  it('handlePieceTap takes a pieceId string (not a PlacedPiece) so the callback identity stays stable', () => {
    expect(screenSrc).toMatch(
      /const handlePieceTap = useCallback\(\(pieceId: string\) =>/,
    );
    expect(screenSrc).toMatch(
      /const handlePieceLongPress = useCallback\(\(pieceId: string\) =>/,
    );
  });
});
