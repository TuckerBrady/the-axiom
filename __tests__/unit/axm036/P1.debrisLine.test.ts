// AXM-036 P1 (F1 + F12) — [P1-3] / [P1-4]. Tucker ruling R-1: K1-1's two
// pre-placed obstacles are collapsed-corridor debris; K1-1 gains one COGS
// tutorial step naming them, inserted between board-intro and board-resume.

import * as fs from 'fs';
import * as path from 'path';
import { levelK1_1 } from '../../../src/game/levels';

const BOARD_DEBRIS_MESSAGE =
  'Two cells on this board are gone. Collapsed plating, left over from the mining. Nothing seats there and the signal will not cross them. Route around.';

describe('[P1-3] K1-1 has board-debris between board-intro and board-resume', () => {
  it('inserts board-debris in the correct order, changing nothing else', () => {
    const ids = (levelK1_1.tutorialSteps ?? []).map(s => s.id);
    expect(ids).toEqual([
      'tray-intro',
      'tray-scroll',
      'tray-place',
      'tray-forfeit',
      'board-intro',
      'board-debris',
      'board-resume',
    ]);
  });

  it('the board-debris step has the exact message, targetRef and eyeState', () => {
    const step = (levelK1_1.tutorialSteps ?? []).find(s => s.id === 'board-debris');
    expect(step).toBeDefined();
    expect(step!.targetRef).toBe('boardGrid');
    expect(step!.eyeState).toBe('blue');
    expect(step!.message).toBe(BOARD_DEBRIS_MESSAGE);
  });
});

describe("[P1-3] the debris line's count matches K1-1's obstacle count", () => {
  it('K1-1 has exactly two obstacle pieces, and the line says "Two cells"', () => {
    const obstacleCount = levelK1_1.prePlacedPieces.filter(p => p.type === 'obstacle').length;
    expect(obstacleCount).toBe(2);
    const step = (levelK1_1.tutorialSteps ?? []).find(s => s.id === 'board-debris');
    expect(step!.message.startsWith('Two cells')).toBe(true);
  });
});

describe('[P1-4] NARRATIVE.md carries the board-debris line verbatim', () => {
  it('contains the message and the board-debris tag', () => {
    const narrative = fs.readFileSync(
      path.resolve(__dirname, '../../../docs/NARRATIVE.md'),
      'utf8',
    );
    expect(narrative).toContain(BOARD_DEBRIS_MESSAGE);
    expect(narrative).toContain('[board-debris | tutorialStep | BLUE]');
  });
});
