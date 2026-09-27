// AXM-036 P5 (F5) — REQUIRED OUTPUT at the top of the spec sheet.
//
// Harness pattern: source inspection, established by
// __tests__/integration/GameplayModals.test.tsx and
// __tests__/integration/SpecSheetPanel.test.tsx. SpecSheetPanel.tsx renders
// through the "render" jest project (react-jsx tsconfig); the integration
// project here uses the plain tsconfig, so the component is verified by
// reading its source and its JSX section ordering rather than mounting it.
//
// Tucker (build 49, screenshot 05): on big spec sheets like A1-8, the
// REQUIRED OUTPUT block was buried between SHALL and SHOULD. He wants it at
// the very top of the sheet — above WILL — whenever it renders at all.

import * as fs from 'fs';
import * as path from 'path';
import { getLevelById } from '../../src/game/levels';
import { expectedOutputIsLiveGate } from '../../src/game/spec/specSheet';
import type { LevelDefinition } from '../../src/game/types';

function level(id: string): LevelDefinition {
  const found = getLevelById(id);
  if (!found) throw new Error(`level not found: ${id}`);
  return found;
}

const repoRoot = path.resolve(__dirname, '../..');
const panelSrc = fs.readFileSync(
  path.resolve(repoRoot, 'src/components/gameplay/SpecSheetPanel.tsx'),
  'utf8',
);

// Index the source once so each section's JSX position can be compared.
function sectionIndex(label: 'WILL' | 'SHALL' | 'SHOULD' | 'MAY'): number {
  const idx = panelSrc.indexOf(`<Section label="${label}"`);
  expect(idx).toBeGreaterThan(-1);
  return idx;
}

function requiredOutputIndex(): number {
  const idx = panelSrc.indexOf('REQUIRED OUTPUT');
  expect(idx).toBeGreaterThan(-1);
  return idx;
}

describe('[P5-1] REQUIRED OUTPUT precedes WILL when it renders', () => {
  it('[P5-1] A1-8: REQUIRED OUTPUT before WILL before SHALL before SHOULD', () => {
    expect(expectedOutputIsLiveGate(level('A1-8'))).toBe(true);

    const requiredOutput = requiredOutputIndex();
    const will = sectionIndex('WILL');
    const shall = sectionIndex('SHALL');
    const should = sectionIndex('SHOULD');

    expect(requiredOutput).toBeLessThan(will);
    expect(will).toBeLessThan(shall);
    expect(shall).toBeLessThan(should);
  });

  it('[P5-1] A1-7 likewise', () => {
    expect(expectedOutputIsLiveGate(level('A1-7'))).toBe(true);

    const requiredOutput = requiredOutputIndex();
    const will = sectionIndex('WILL');
    const shall = sectionIndex('SHALL');
    const should = sectionIndex('SHOULD');

    expect(requiredOutput).toBeLessThan(will);
    expect(will).toBeLessThan(shall);
    expect(shall).toBeLessThan(should);
  });

  it('[P5-1] A1-6: no REQUIRED OUTPUT; WILL, SHALL, SHOULD order unchanged', () => {
    expect(expectedOutputIsLiveGate(level('A1-6'))).toBe(false);

    const will = sectionIndex('WILL');
    const shall = sectionIndex('SHALL');
    const should = sectionIndex('SHOULD');

    expect(will).toBeLessThan(shall);
    expect(shall).toBeLessThan(should);
  });
});
