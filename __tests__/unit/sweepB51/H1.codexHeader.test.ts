/**
 * SWEEP-B51 H1 (AXM-040 + AXM-044): both Codex surfaces carry the header
 * port through one mapping (contract v1.3 R-H1.2). Source-structure checks,
 * UTF-8 reads. This suite imports nothing new, so its GUARD compiles and
 * passes on master.
 */
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.resolve(repoRoot, rel), 'utf-8');

function srcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...srcFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('SWEEP-B51 H1 Codex header port, source structure', () => {
  it('[H1-5] CodexDetailView hero and chips call codexPortSides and no inline port ternary remains in src', () => {
    const detail = read('src/components/CodexDetailView.tsx');
    expect(detail).toMatch(
      /export function codexPortSides\(id: string\): PortSide\[\] \| undefined \{/,
    );
    expect(detail).toContain('portSides={codexPortSides(entry.id)}');
    expect(detail).toContain('portSides={codexPortSides(e.id)}');
    expect(detail.match(/portSides=\{/g)?.length).toBe(2);

    const files = srcFiles(path.resolve(repoRoot, 'src'));
    expect(files.length).toBeGreaterThan(0);
    const inline = /=== 'source' \? \['right'\]/;
    const offenders = files.filter(f => inline.test(fs.readFileSync(f, 'utf-8')));
    expect(offenders).toEqual([]);
  });

  it('[H1-6] the CodexScreen detail hero passes codexPortSides', () => {
    const screen = read('src/screens/CodexScreen.tsx');
    // One import line, joined to the existing CodexDetailView import.
    const importLines = screen.split(/\r?\n/).filter(l => l.includes("from '../components/CodexDetailView'"));
    expect(importLines).toHaveLength(1);
    expect(importLines[0]).toMatch(/^import \{[^}]*\bcodexPortSides\b[^}]*\} from '\.\.\/components\/CodexDetailView';$/);
    for (const kept of ['TapeGlyph', 'TapeFieldStrip', 'hexToRgba']) {
      expect(importLines[0]).toMatch(new RegExp(`\\b${kept}\\b`));
    }
    // The size-32 detail hero carries the port.
    expect(screen).toContain(
      '<PieceIcon type={entry.id} size={32} color={streamColor} portSides={codexPortSides(entry.id)} />',
    );
    expect(screen.match(/portSides=\{codexPortSides\(/g)?.length).toBe(1);
    // The grid cards (36 and 38) are unchanged.
    expect(screen).toContain('<PieceIcon type={entry.id} size={36} color={streamColor} />');
    expect(screen).toContain('<PieceIcon type={entry.id} size={38} color={streamColor} />');
  });

  it('[H1-6] GUARD CodexScreen draws no port of its own', () => {
    const screen = read('src/screens/CodexScreen.tsx');
    expect(screen).not.toMatch(/EndpointPortShape/);
    expect(screen).not.toMatch(/endpointPortGeometry/);
    expect(screen).not.toMatch(/EndpointSockets/);
  });
});
