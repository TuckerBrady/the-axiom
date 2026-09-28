// SWEEP-B51 S13 (AXM-040 + AXM-038): Codex "first encountered" truth and
// the Gear Codex note. CONTRACT v1.2 section 14.
//
// Source-structure tests. Files are read as UTF-8 and `—` escapes are
// decoded before comparing, so the escaped and literal forms are equal.
//
// The helper is loaded inside the tests that use it (S13-2 is its own clause),
// so each test's red on master names its own missing behaviour.

import * as fs from 'fs';
import * as path from 'path';
import type { PieceType } from '../../../src/game/types';

const ROOT = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const decode = (s: string) =>
  s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));

type FirstEncounterFor = (type: PieceType) => string | null;
const loadFirstEncounterFor = (): FirstEncounterFor =>
  require('../../helpers/firstEncounter').firstEncounterFor as FirstEncounterFor;

// Every piece type a level can carry (levels.test.ts VALID_PIECE_TYPES).
const PIECE_TYPES: PieceType[] = [
  'source', 'terminal', 'conveyor', 'gear', 'splitter',
  'configNode', 'scanner', 'transmitter',
  'merger', 'bridge', 'inverter', 'counter', 'latch',
];

/** The source text of the Codex entry with this id, up to the next entry. */
function entryText(src: string, id: string): string {
  const start = src.indexOf(`id: '${id}'`);
  expect(start).toBeGreaterThan(-1);
  const next = src.indexOf("id: '", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

/** The decoded value of a single-quoted string field inside an entry. */
function field(entry: string, name: string): string {
  const m = entry.match(new RegExp(`${name}: '((?:[^'\\\\]|\\\\.)*)'`));
  expect(m).not.toBeNull();
  return decode(m![1]).replace(/\\'/g, "'");
}

function checkFirstEncountered(file: string) {
  const firstEncounterFor = loadFirstEncounterFor();
  const src = read(file);
  const wrong: string[] = [];
  let checked = 0;
  for (const type of PIECE_TYPES) {
    const truth = firstEncounterFor(type);
    if (truth === null) continue;
    checked += 1;
    const stated = field(entryText(src, type), 'firstEncountered');
    if (stated !== truth) wrong.push(`${type}: "${stated}" should be "${truth}"`);
  }
  expect(checked).toBeGreaterThanOrEqual(12);
  expect(wrong).toEqual([]);
}

const GEAR_NOTE_DETAIL =
  'The Gear is the only piece that redirects signal. Where a Conveyor carries straight, the Gear turns — 90 degrees, one way. It never passes straight through and never divides. Give it exactly one way out.';
const GEAR_NOTE_SCREEN =
  'The Gear is the only piece that redirects signal. Where a Conveyor carries straight, the Gear turns — 90 degrees, one way. It accepts input from any direction. It never passes straight through and never divides; give it exactly one way out. Every non-linear circuit requires at least one. Plan the bend before you need it. The signal will not wait while you reconsider.';

describe('SWEEP-B51 S13: Codex first encountered and the Gear note', () => {
  it('[S13-1] every CodexDetailView piece entry that appears in a level states its true first level', () => {
    checkFirstEncountered('src/components/CodexDetailView.tsx');
  });

  it('[S13-1] every CodexScreen piece entry that appears in a level states its true first level', () => {
    checkFirstEncountered('src/screens/CodexScreen.tsx');
  });

  it('[S13-2] firstEncounterFor derives splitter as K1-5 and inverter as NF-1', () => {
    const firstEncounterFor = loadFirstEncounterFor();
    expect(firstEncounterFor('splitter')).toBe('KEPLER BELT — K1-5 Resupply Chain');
    expect(firstEncounterFor('inverter')).toBe('NOVA FRINGE — NF-1 Outer Marker');
    expect(firstEncounterFor('merger')).toBe('KEPLER BELT — K1-5 Resupply Chain');
    expect(firstEncounterFor('latch')).toBe('KEPLER BELT — K1-3 Junction 7');
    expect(firstEncounterFor('bridge')).toBe('KEPLER BELT — K1-7 Ore Processing');
    expect(firstEncounterFor('gear')).toBe('THE AXIOM — A1-1 Emergency Power');
    expect(firstEncounterFor('counter')).toBeNull();
  });

  it('[S13-3] the Gear cogsNote is verbatim in both files', () => {
    const detail = entryText(read('src/components/CodexDetailView.tsx'), 'gear');
    const screen = entryText(read('src/screens/CodexScreen.tsx'), 'gear');
    expect(field(detail, 'cogsNote')).toBe(GEAR_NOTE_DETAIL);
    expect(field(screen, 'cogsNote')).toBe(GEAR_NOTE_SCREEN);
    // The Gear firstEncountered literal stays as pinned by codexGearFirstEncountered.test.ts.
    expect(detail).toContain("firstEncountered: 'THE AXIOM \\u2014 A1-1 Emergency Power'");
    expect(screen).toContain("firstEncountered: 'THE AXIOM \\u2014 A1-1 Emergency Power'");
  });

  it('[S13-4] NARRATIVE.md carries both Gear Codex notes with their tags', () => {
    const doc = read('docs/NARRATIVE.md');
    const start = doc.indexOf('### Codex notes');
    expect(start).toBeGreaterThan(-1);
    const section = doc.slice(start);
    const detailAt = section.indexOf(`> "${GEAR_NOTE_DETAIL}"`);
    const screenAt = section.indexOf(`> "${GEAR_NOTE_SCREEN}"`);
    expect(detailAt).toBeGreaterThan(-1);
    expect(screenAt).toBeGreaterThan(-1);
    const detailTag = section.indexOf('[codex_gear | cogsNote | detail]', detailAt);
    const screenTag = section.indexOf('[codex_gear | cogsNote | screen]', screenAt);
    expect(detailTag).toBeGreaterThan(detailAt);
    expect(screenTag).toBeGreaterThan(screenAt);
    // Each tag sits on the line right after its quote.
    expect(section.slice(detailAt, detailTag).split('\n')).toHaveLength(2);
    expect(section.slice(screenAt, screenTag).split('\n')).toHaveLength(2);
  });
});
