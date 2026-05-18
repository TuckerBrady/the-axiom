/**
 * Static analysis: BoardGrid terminal-cell color audit (PROMPT_120 Fix 5).
 *
 * Terminal piece icon color was a hardcoded lock-green '#00C48C'.
 * Terminals should render in Colors.copper per the engine-semantic
 * palette. Source piece color (amber #F0B429) is unchanged.
 */

import * as fs from 'fs';
import * as path from 'path';

const BOARDGRID_PATH = path.resolve(
  __dirname,
  '../../src/components/gameplay/BoardGrid.tsx',
);

describe('BoardGrid — terminal color audit (Fix 5)', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(BOARDGRID_PATH, 'utf-8');
  });

  it('does not use the lock-green hex #00C48C anywhere', () => {
    expect(source).not.toContain('#00C48C');
  });

  it('uses Colors.copper for the terminal branch of the iconColor ternary', () => {
    // Match the `isOutput ? <terminal color>` branch.
    expect(source).toMatch(/isOutput\s*\?\s*Colors\.copper/);
  });

  it('preserves the amber source color #F0B429 (regression guard)', () => {
    expect(source).toContain("'#F0B429'");
  });

  it('still imports Colors from theme/tokens', () => {
    expect(source).toMatch(/import\s*\{[^}]*\bColors\b[^}]*\}\s*from\s*['"]\.\.\/\.\.\/theme\/tokens['"]/);
  });
});
