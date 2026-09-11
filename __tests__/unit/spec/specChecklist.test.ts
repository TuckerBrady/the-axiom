// Results-screen Spec Sheet checklist. Verifies each spec's status is backed by
// real data: SHALL met on completion, SHOULD from the score breakdown, MAY from
// the satisfied-condition list, WILL shown as givens.

import { levelA1_1, levelA1_4, levelA1_7 } from '../../../src/game/levels';
import { buildSpecChecklist } from '../../../src/game/spec/specChecklist';
import type { ScoreBreakdown } from '../../../src/game/scoring';
import type { LevelDefinition, MayCondition } from '../../../src/game/types';

function breakdown(over: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  return {
    completion: 0, pathIntegrity: 0, signalDepth: 0, investment: 0, diversity: 0, discipline: 0,
    forfeitedPurchasedCount: 0,
    ...over,
  };
}

describe('buildSpecChecklist — SHALL reflects the win condition', () => {
  it('A1-1 (routing): the reach-Terminal SHALL is marked met on completion', () => {
    const items = buildSpecChecklist(levelA1_1, breakdown());
    const shall = items.filter(i => i.section === 'SHALL');
    expect(shall.length).toBeGreaterThan(0);
    expect(shall.every(i => i.status === 'met')).toBe(true);
  });

  it('A1-4 (topology): BOTH the routing and the topology SHALL are present and met', () => {
    const items = buildSpecChecklist(levelA1_4, breakdown());
    const shall = items.filter(i => i.section === 'SHALL');
    expect(shall.length).toBeGreaterThanOrEqual(2);
    expect(shall.some(i => /change direction/i.test(i.text))).toBe(true);
    expect(shall.every(i => i.status === 'met')).toBe(true);
  });

  it('A1-7 (tape): WILL facts appear as givens, SHALL is the output match', () => {
    const items = buildSpecChecklist(levelA1_7, breakdown());
    expect(items.some(i => i.section === 'WILL' && i.status === 'given')).toBe(true);
    expect(items.some(i => i.section === 'SHALL' && /Output Tape SHALL match/i.test(i.text))).toBe(true);
  });
});

// REQ-62 (scoring-algorithm-v2.md, AXM-010): scoringCategoriesVisible is
// removed — deriveShouldStatements now always returns the same fixed
// subset (pathIntegrity/signalDepth/discipline; see specSheet.ts) for
// every level, not a per-level list.
describe('buildSpecChecklist — SHOULD reflects the score breakdown', () => {
  it('full marks = met, partial points = partial, zero = missed', () => {
    const items = buildSpecChecklist(
      levelA1_1,
      breakdown({ pathIntegrity: 15, signalDepth: 0, discipline: 5 }), // max 15/14/10
    );
    const should = items.filter(i => i.section === 'SHOULD');
    expect(should).toHaveLength(3);
    expect(should.find(i => /participate in the signal chain/i.test(i.text))?.status).toBe('met');
    const statuses = should.map(i => i.status);
    expect(statuses).toContain('met');
    expect(statuses).toContain('partial');
    expect(statuses).toContain('missed');
  });
});

describe('buildSpecChecklist — MAY reflects what was actually achieved', () => {
  const may: MayCondition[] = [
    { id: 'lean', description: 'Solve it lean.', predicate: { type: 'underPieceCount', max: 4 }, reward: { type: 'credits', amount: 50 } },
    { id: 'fast', description: 'Solve it fast.', predicate: { type: 'underSeconds', max: 20 }, reward: { type: 'credits', amount: 25 } },
  ];
  const level = { ...levelA1_1, mayConditions: may } as LevelDefinition;

  it('met MAY shows the CR award; unmet MAY is marked missed', () => {
    const items = buildSpecChecklist(level, breakdown(), ['Solve it lean.']);
    const mayItems = items.filter(i => i.section === 'MAY');
    expect(mayItems).toHaveLength(2);
    const lean = mayItems.find(i => i.text.startsWith('Solve it lean.'))!;
    expect(lean.status).toBe('met');
    expect(lean.text).toContain('+50 CR');
    const fast = mayItems.find(i => i.text.startsWith('Solve it fast.'))!;
    expect(fast.status).toBe('missed');
    expect(fast.text).not.toContain('CR');
  });
});
