// Lint-class source-contract tests for AXM-001 (AXIOM_DESIGN_REVIEW.md
// D-01 through D-06). These grep the PieceIcon.tsx source rather than
// rendering it — the established pattern in this repo for enforcing a
// standard across every case in the switch (see HUDChrome.test.ts).
//
// Each test should fail on any future piece that reintroduces the
// violation it guards against.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const src = read('src/components/PieceIcon.tsx');

// Matches every <Svg ...> opening tag body so its attributes can be
// inspected together (viewBox, width, height on the same element).
const svgOpenTags = src.match(/<Svg\b[^>]*>/g) ?? [];

describe('PieceIcon — D-01: uniform viewBox', () => {
  it('never renders an <Svg> case with a viewBox other than "0 0 40 40"', () => {
    const offenders = svgOpenTags.filter(tag => /viewBox="[^"]*"/.test(tag) && !/viewBox="0 0 40 40"/.test(tag));
    expect(offenders).toEqual([]);
  });

  it('has no viewBox other than "0 0 40 40" anywhere in the file', () => {
    const viewBoxes = [...src.matchAll(/viewBox="([^"]*)"/g)].map(m => m[1]);
    expect(viewBoxes.length).toBeGreaterThan(0);
    expect(viewBoxes.every(vb => vb === '0 0 40 40')).toBe(true);
  });

  it('every case renders width={s} height={s} with no exceptions (no s * factor)', () => {
    expect(src).not.toMatch(/height=\{s \* [\d.]+\}/);
    expect(src).not.toMatch(/width=\{s \* [\d.]+\}/);
  });
});

describe('PieceIcon — D-02: opacity floor and stroke widths', () => {
  it('no strokeOpacity/opacity/fillOpacity literal renders below 0.45', () => {
    const pattern = /(?:stroke|fill)?[Oo]pacity=(?:"([\d.]+)"|\{([\d.]+)\})/g;
    const offenders: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(src))) {
      const raw = m[1] ?? m[2];
      const value = parseFloat(raw);
      if (!Number.isNaN(value) && value < 0.45) {
        offenders.push(m[0]);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no accent stroke renders below 1.2 as a literal strokeWidth', () => {
    const pattern = /strokeWidth=(?:"([\d.]+)"|\{([\d.]+)\})/g;
    const offenders: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(src))) {
      const raw = m[1] ?? m[2];
      const value = parseFloat(raw);
      if (!Number.isNaN(value) && value < 1.2) {
        offenders.push(m[0]);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('PieceIcon — D-03/D-04: reserved beam hues', () => {
  const animationFlags = ['charging', 'locking', 'gating', 'splitting', 'transmitting', 'rolling', 'scanning'];
  const lines = src.split('\n');
  // A hex literal counts as "guarded" if an animation flag appears
  // within a small window of surrounding lines — the JSX for a single
  // guarded element (comment + attributes) commonly spans several lines.
  const WINDOW = 4;
  function isGuarded(lineIndex: number): boolean {
    const start = Math.max(0, lineIndex - WINDOW);
    const end = Math.min(lines.length, lineIndex + WINDOW + 1);
    const context = lines.slice(start, end).join('\n');
    return animationFlags.some(flag => context.includes(flag));
  }

  it('every remaining amber/cyan literal is guarded by an animation flag', () => {
    const offenders = lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => /#F0B429|#00D4FF/.test(line))
      .filter(({ i }) => !isGuarded(i));
    expect(offenders).toEqual([]);
  });

  it('every remaining #00C48C (green) literal is guarded by an animation flag or the terminal case', () => {
    const offenders = lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => /#00C48C/.test(line))
      .filter(({ i }) => !isGuarded(i) && !lines.slice(Math.max(0, i - WINDOW), i + 1).some(l => l.includes('lockR')));
    expect(offenders).toEqual([]);
  });

  it('static Physics accents use copper, static Protocol accents use lavender/protocol token', () => {
    // Spot-check a representative sample of the D-03 per-piece edit table.
    expect(src).toMatch(/Start drum — filled[\s\S]{0,120}fill=\{Colors\.copper\}/);
    expect(src).toMatch(/centre pivot|center pivot/i);
    expect(src).toMatch(/fill=\{Colors\.circuit\}/); // scanner/transmitter/inverter lavender accents
  });
});

describe('PieceIcon — D-05: no type in piece icons', () => {
  it('imports no SvgText from react-native-svg', () => {
    expect(src).not.toMatch(/Text as SvgText/);
  });

  it('renders no <SvgText> element anywhere', () => {
    expect(src).not.toMatch(/<SvgText/);
  });

  it('counter renders a segmented ring instead of a numeric readout', () => {
    expect(src).toMatch(/ringSegmentPath/);
  });
});

describe('PieceIcon — D-06: configNode is rotation-invariant', () => {
  it('draws gate strips on all four edges unconditionally (no isActive branch selecting which edges render)', () => {
    const configNodeCase = src.slice(src.indexOf("case 'configNode'"), src.indexOf("case 'scanner'"));
    // All four AnimatedRect strips must appear unconditionally, not inside
    // an isActive ? ... : ... branch that swaps which pair renders.
    expect(configNodeCase).not.toMatch(/isActive \? \(/);
    const stripMatches = configNodeCase.match(/<AnimatedRect/g) ?? [];
    expect(stripMatches.length).toBe(4);
  });

  it('encodes active/inactive via the centre dot radius/ring, not strip position', () => {
    const configNodeCase = src.slice(src.indexOf("case 'configNode'"), src.indexOf("case 'scanner'"));
    expect(configNodeCase).toMatch(/r="4" fill=\{dotFill\}/);
    expect(configNodeCase).toMatch(/isActive && !gating/);
  });
});
