// Source-contract tests for WireOverlay + WireSegment (Prompt 99B).
// Already-lit segments must not re-render when a new segment lights
// (PERFORMANCE_CONTRACT 4.3.1, 4.3.2).

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const wireSrc = read('src/components/gameplay/WireOverlay.tsx');
const screenSrc = read('src/screens/GameplayScreen.tsx');

describe('WireOverlay — extracted wire layer', () => {
  it('exports a default React.memo-wrapped component', () => {
    expect(wireSrc).toMatch(/export default React\.memo\(WireOverlayComponent\)/);
  });

  it('declares an inner WireSegment that is React.memo-wrapped', () => {
    expect(wireSrc).toMatch(/const WireSegment = React\.memo\(function WireSegment/);
  });

  it('renders a Svg sibling of the dot grid (separate from BoardGrid + BeamOverlay)', () => {
    expect(wireSrc).toMatch(/<Svg[\s\S]*?style=\{StyleSheet\.absoluteFill\}/);
    expect(wireSrc).toMatch(/pointerEvents="none"/);
  });

  it('passes per-segment isLit / isLocked flags as primitive booleans (so memo barrier holds)', () => {
    expect(wireSrc).toMatch(/<WireSegment[\s\S]*?isLit=\{isLit\}/);
    expect(wireSrc).toMatch(/<WireSegment[\s\S]*?isLocked=\{isLocked\}/);
  });

  it('uses pieceById.get(...) for O(1) wire endpoint lookup (no per-render pieces.find)', () => {
    expect(wireSrc).toMatch(/const fromPiece = pieceById\.get\(wire\.fromPieceId\)/);
    expect(wireSrc).toMatch(/const toPiece = pieceById\.get\(wire\.toPieceId\)/);
    expect(wireSrc).not.toMatch(/pieces\.find\(/);
  });

  it('GameplayScreen mounts <WireOverlay /> as a sibling of <BoardGrid /> and <BeamOverlay />', () => {
    expect(screenSrc).toMatch(
      /import WireOverlay from '\.\.\/components\/gameplay\/WireOverlay'/,
    );
    // The wire layer renders between the dot Svg and BeamOverlay.
    expect(screenSrc).toMatch(/<WireOverlay[\s\S]*?litWires=\{beamState\.litWires\}/);
  });
});
