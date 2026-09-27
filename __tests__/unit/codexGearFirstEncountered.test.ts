// AXM-026 spec 7.14.1 (Tucker, 2026-09-26): A1-1 teaches the Gear, so its
// Codex entry must say it was first encountered there, not in A1-2.

import * as fs from 'fs';
import * as path from 'path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '../..', p), 'utf8');

describe('Gear Codex entry: first encountered in A1-1', () => {
  it.each([
    'src/components/CodexDetailView.tsx',
    'src/screens/CodexScreen.tsx',
  ])('%s', (file) => {
    const src = read(file);
    const i = src.indexOf("id: 'gear'");
    expect(i).toBeGreaterThan(-1);
    const entry = src.slice(i, src.indexOf('firstEncountered', i) + 80);
    expect(entry).toContain('A1-1 Emergency Power');
    expect(entry).not.toContain('A1-2');
  });
});
