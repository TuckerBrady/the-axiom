import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function walk(dir: string, exts: string[], out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(full, exts, out);
    } else if (exts.includes(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

const COGS_EYE_PATTERN = /cogs.?eye/i;

describe('PROMPT_141 -- COGS AI Orb naming, no "cogs eye" survivors', () => {
  it('src/constants/cogsAIOrbColors.ts exists (renamed from cogsEyeColors.ts)', () => {
    const p = path.join(ROOT, 'src/constants/cogsAIOrbColors.ts');
    expect(fs.existsSync(p)).toBe(true);
  });

  it('src/constants/cogsEyeColors.ts no longer exists', () => {
    const p = path.join(ROOT, 'src/constants/cogsEyeColors.ts');
    expect(fs.existsSync(p)).toBe(false);
  });

  it('no case-insensitive "cogs eye" / cogsEye / cogs_eye / CogsEye matches remain in src/', () => {
    const files = walk(path.join(ROOT, 'src'), ['.ts', '.tsx']);
    const offenders: string[] = [];
    for (const f of files) {
      const content = read(path.relative(ROOT, f));
      if (COGS_EYE_PATTERN.test(content)) {
        offenders.push(path.relative(ROOT, f));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no case-insensitive "cogs eye" matches remain in docs/CLAUDE_CONTEXT.md', () => {
    const content = read('docs/CLAUDE_CONTEXT.md');
    expect(COGS_EYE_PATTERN.test(content)).toBe(false);
  });

  it('no case-insensitive "cogs eye" matches remain in project-docs/SPECS/maestro-smoke-suite.md', () => {
    const content = read('project-docs/SPECS/maestro-smoke-suite.md');
    expect(COGS_EYE_PATTERN.test(content)).toBe(false);
  });

  it('cogsAIOrbColors module exports the renamed identifiers (no CogsEye*-named exports)', () => {
    const content = read('src/constants/cogsAIOrbColors.ts');
    expect(content).not.toMatch(/CogsEye/);
    expect(content).not.toMatch(/cogsEyeColors/);
  });
});
