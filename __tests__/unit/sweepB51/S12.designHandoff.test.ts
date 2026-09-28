// SWEEP-B51 S12 (AXM-044 + AXM-043): the locked design spec is committed
// byte-for-byte with LF line endings (contract H-14, clause S12-9).
//
// The line-ending check reads the COMMITTED bytes (git's blob at HEAD), not
// the working copy: on a Windows clone with core.autocrlf=true (this
// machine's system default) git checks every text file out with CRLF, so a
// working-copy read would report CR bytes that were never committed. Where
// git is unavailable the working copy is read instead.

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const REL = 'project-docs/DESIGN_HANDOFFS/009-energy-port-sockets/DESIGN_SPEC.md';
const REPO = path.resolve(__dirname, '../../..');
const SPEC = path.join(REPO, REL);

function committedText(): string {
  try {
    return execFileSync('git', ['show', `HEAD:${REL}`], {
      cwd: REPO,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return fs.readFileSync(SPEC, 'utf-8');
  }
}

describe('S12 design handoff', () => {
  test('[S12-9] the committed DESIGN_SPEC is the locked v1.0.0 text', () => {
    expect(fs.existsSync(SPEC)).toBe(true);
    const text = committedText();
    expect(text.startsWith('# DESIGN_SPEC: AXM-044')).toBe(true);
    expect(text).toContain('| Version | 1.0.0 |');
    expect(text).toContain('**S3: Energy port**');
    expect(text).not.toContain('\r');
  });
});
