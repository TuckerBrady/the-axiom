// AXM-002 / AXM-022 (PROMPT_162) — the gameplay HUD, rendered. The level id
// and title share one line ("K1-1 · CORRIDOR ENTRY"), and no clock is drawn:
// elapsed time is tracked silently and never shown (Tucker, 2026-09-23).

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer = require('react-test-renderer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const HUDChrome = require('../../src/components/gameplay/HUDChrome').default;

type Node = { props: Record<string, any>; type: unknown; children: unknown[] };

function render(props: Partial<Record<string, unknown>> = {}) {
  let r: any;
  TestRenderer.act(() => {
    r = TestRenderer.create(
      <HUDChrome
        levelId="K1-1"
        levelTitle="Corridor Entry"
        pulseCounterText={null}
        onPause={jest.fn()}
        onOpenSpecSheet={jest.fn()}
        {...props}
      />,
    );
  });
  return r;
}

// Flattens a host Text's children to the string it draws.
function textOf(n: Node | string): string {
  if (typeof n === 'string') return n;
  return (n.children ?? []).map(c => textOf(c as Node | string)).join('');
}

const hostTexts = (r: any): Node[] =>
  r.root.findAll((n: Node) => n.type === 'Text');

describe('HUDChrome — one-line level header (AXM-002 part 1)', () => {
  it('renders id and title on one line, joined by a spaced middle dot', () => {
    const r = render();
    const line = hostTexts(r).find(t => textOf(t) === 'K1-1 · Corridor Entry');
    expect(line).toBeDefined();
    expect(line!.props.numberOfLines).toBe(1);
    expect(line!.props.ellipsizeMode ?? 'tail').toBe('tail');
  });

  it('draws the id and the title as two styled runs inside that one line', () => {
    const r = render();
    const line = hostTexts(r).find(t => textOf(t) === 'K1-1 · Corridor Entry')!;
    const runs = line.children.filter(
      (c): c is Node => typeof c !== 'string' && (c as Node).type === 'Text',
    );
    expect(runs.map(textOf)).toEqual(['K1-1', 'Corridor Entry']);
    const flat = (s: unknown) => Object.assign({}, ...[s].flat(Infinity as 1).filter(Boolean));
    expect(flat(runs[0].props.style).color).not.toBe(flat(runs[1].props.style).color);
    expect(flat(runs[0].props.style).fontSize).toBeGreaterThanOrEqual(11);
    expect(flat(runs[1].props.style).fontSize).toBeGreaterThanOrEqual(11);
  });

  it('no longer stacks the id and the title as separate lines', () => {
    const r = render();
    const topLevel = hostTexts(r).filter(t => textOf(t) === 'K1-1');
    // The only Text drawing exactly the id is the run nested in the line.
    expect(topLevel).toHaveLength(1);
  });
});

describe('HUDChrome — no visible timer (AXM-022)', () => {
  it('draws no clock, even when a caller still passes a timer string', () => {
    const r = render({ timerText: '1:23' });
    const drawn = hostTexts(r).map(textOf);
    expect(drawn.some(s => /\d+:\d{2}/.test(s))).toBe(false);
  });

  it('keeps the fixed-height pulse counter row as the only line under the header', () => {
    const r = render();
    const drawn = hostTexts(r).filter(t => t.props.numberOfLines === 1).map(textOf);
    expect(drawn).toEqual(['K1-1 · Corridor Entry', '']);
  });
});
