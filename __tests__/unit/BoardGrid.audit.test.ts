/**
 * Static analysis: BoardGrid terminal-cell color audit.
 *
 * History: PROMPT_120 Fix 5 changed the Terminal icon from lock-green
 * '#00C48C' to Colors.copper for an "engine-semantic palette". Tucker
 * reversed that on 2026-06-13: the board Terminal must read green
 * (#00C48C) to match the Codex entry and the PieceIcon terminal strokes,
 * which never stopped using green. Source (amber #F0B429) is unchanged.
 */

import * as fs from 'fs';
import * as path from 'path';

const BOARDGRID_PATH = path.resolve(
  __dirname,
  '../../src/components/gameplay/BoardGrid.tsx',
);

describe('BoardGrid — terminal color audit', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(BOARDGRID_PATH, 'utf-8');
  });

  it('uses terminal green #00C48C (matching the Codex), not copper', () => {
    expect(source).toMatch(/isOutput\s*\n?\s*\?\s*'#00C48C'/);
    expect(source).not.toMatch(/isOutput\s*\n?\s*\?\s*Colors\.copper/);
  });

  it('preserves the amber source color #F0B429 (regression guard)', () => {
    expect(source).toContain("'#F0B429'");
  });

  it('still imports Colors from theme/tokens', () => {
    expect(source).toMatch(/import\s*\{[^}]*\bColors\b[^}]*\}\s*from\s*['"]\.\.\/\.\.\/theme\/tokens['"]/);
  });
});
