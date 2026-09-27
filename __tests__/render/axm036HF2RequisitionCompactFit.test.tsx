// AXM-036 hotfix 2 — the Requisition store's confirm footer must stay on
// screen at 360x640dp, the panel must not resize on a tab switch, and
// nothing of the body may show below the handle while collapsed.
//
// Build-51 smoke (Vaughn twin, master b7947dd) found REQUISITION clipped
// off-screen on every Kepler level with TRAIL/OUT rows at 360x640dp. #78
// (P3) had wrapped the tab bar, list and footer in a plain measuring View
// inside the animated body. That View could not shrink, so the body clipped
// the footer instead of the list giving up height. The older source-regex
// test (RequisitionPanelCompactFit) still passed, because every style block
// it read was unchanged; the break was in the element tree between them.
//
// These tests work on the RENDERED tree, not the source text:
//   - an ancestor-chain check from the footer up to the panel root, and
//   - a small column flex solver (flexShrink weighted by basis, maxHeight,
//     minHeight, fixed height, overflow clipping) run over the rendered
//     styles at the 360x640 panel budget measured on the axiom_compact AVD.
// The solver is a model of Yoga's column shrink, not Yoga itself. It is
// deliberately simple: every style it reads is a plain number here.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';

jest.mock('../../src/components/PieceIcon', () => ({ PieceIcon: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer = require('react-test-renderer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RN = require('react-native');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RequisitionPanel = require('../../src/components/gameplay/RequisitionPanel').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useRequisitionStore } = require('../../src/store/requisitionStore');

// Panel budget on the axiom_compact AVD (720x1280 @ 320dpi) on K1-2:
// the drawer's top border sits at 456px and the ENGAGE row starts at
// 1120px, so the column leaves the drawer 332dp. At 390x844dp the same
// level leaves it about 540dp.
const COMPACT = { width: 360, height: 640, panel: 332 };
const LARGE = { width: 390, height: 844, panel: 540 };

type Style = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = any;

function flattenStyle(s: unknown): Style {
  const out: Style = {};
  const walk = (v: unknown): void => {
    if (!v) return;
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === 'object') Object.assign(out, v as Style);
  };
  walk(s);
  for (const k of Object.keys(out)) {
    const v = out[k] as { __getValue?: () => number } | undefined;
    if (v && typeof v === 'object' && typeof v.__getValue === 'function') out[k] = v.__getValue();
  }
  return out;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const isHost = (n: Node): boolean => typeof n.type === 'string';

function hostKids(n: Node): Node[] {
  const out: Node[] = [];
  for (const c of n.children ?? []) {
    if (typeof c === 'string') continue;
    if (isHost(c)) out.push(c);
    else out.push(...hostKids(c));
  }
  return out;
}

function edges(s: Style) {
  const p = num(s.padding) ?? 0;
  const pv = num(s.paddingVertical) ?? p;
  const m = num(s.margin) ?? 0;
  const mv = num(s.marginVertical) ?? m;
  const b = num(s.borderWidth) ?? 0;
  return {
    padTop: (num(s.paddingTop) ?? pv) + (num(s.borderTopWidth) ?? b),
    padBottom: (num(s.paddingBottom) ?? pv) + (num(s.borderBottomWidth) ?? b),
    marTop: num(s.marginTop) ?? mv,
    marBottom: num(s.marginBottom) ?? mv,
  };
}

const flowKids = (n: Node): Node[] =>
  hostKids(n).filter(k => flattenStyle(k.props.style).position !== 'absolute');

function clamp(h: number, s: Style): number {
  const max = num(s.maxHeight);
  const min = num(s.minHeight);
  let v = h;
  if (max != null) v = Math.min(v, max);
  if (min != null) v = Math.max(v, min);
  return v;
}

// Natural (unconstrained) border-box height.
function natural(n: Node): number {
  const s = flattenStyle(n.props.style);
  if (n.type === 'Text') return clamp(16, s);
  const e = edges(s);
  if (num(s.height) != null) return clamp(num(s.height)!, s);
  const kids = flowKids(n);
  const outer = kids.map(k => { const ke = edges(flattenStyle(k.props.style)); return natural(k) + ke.marTop + ke.marBottom; });
  const row = s.flexDirection === 'row';
  const gap = num(s.gap) ?? 0;
  const content = row
    ? Math.max(0, ...outer)
    : outer.reduce((a, b) => a + b, 0) + (row ? 0 : gap * Math.max(0, kids.length - 1));
  return clamp(content + e.padTop + e.padBottom, s);
}

function shrinkOf(s: Style): number {
  if (num(s.flexShrink) != null) return num(s.flexShrink)!;
  if ((num(s.flex) ?? 0) > 0) return 1;
  return 0;
}

// Lay a column node out into height h at y. Boxes land in `boxes`.
function layout(n: Node, y: number, h: number, boxes: Map<Node, { y: number; h: number }>): void {
  boxes.set(n, { y, h });
  const s = flattenStyle(n.props.style);
  if (n.type === 'Text') return;
  const e = edges(s);
  const kids = flowKids(n);
  const row = s.flexDirection === 'row';
  const inner = h - e.padTop - e.padBottom;
  if (row) {
    for (const k of kids) layout(k, y + e.padTop, natural(k), boxes);
    return;
  }
  // A scroll view's content scrolls; it never squeezes its children.
  const scrolls = n.type === 'ScrollView';
  const gap = num(s.gap) ?? 0;
  const sizes = kids.map(natural);
  const margins = kids.map(k => edges(flattenStyle(k.props.style)));
  const used = sizes.reduce((a, b) => a + b, 0)
    + margins.reduce((a, m) => a + m.marTop + m.marBottom, 0)
    + gap * Math.max(0, kids.length - 1);
  const overflow = used - inner;
  if (overflow > 0 && !scrolls) {
    const weights = kids.map((k, i) => shrinkOf(flattenStyle(k.props.style)) * sizes[i]);
    const total = weights.reduce((a, b) => a + b, 0);
    if (total > 0) {
      kids.forEach((k, i) => {
        const ks = flattenStyle(k.props.style);
        const floor = num(ks.minHeight) ?? 0;
        sizes[i] = Math.max(floor, sizes[i] - (overflow * weights[i]) / total);
      });
    }
  }
  let cursor = y + e.padTop;
  kids.forEach((k, i) => {
    cursor += margins[i].marTop;
    layout(k, cursor, sizes[i], boxes);
    cursor += sizes[i] + margins[i].marBottom + gap;
  });
}

function setScreen(screen: { width: number; height: number }) {
  jest.spyOn(RN.Dimensions, 'get').mockReturnValue({ ...screen, scale: 2, fontScale: 1 });
}

// A K1-2-sized store: five PHYSICS rows, six PROTOCOL rows, TRAIL and OUT
// tapes for sale. That is the level where the smoke first lost the footer.
function resetStore() {
  useRequisitionStore.setState({
    phase: 'requisition',
    requisition: { purchases: [], totalSpend: 0, creditBudget: 80, confirmed: false },
    inventory: { pieces: [], tapes: { in: true, trail: false, out: false } },
    selectedInventoryId: null,
    _availablePieceTypes: [
      'conveyor', 'gear', 'splitter', 'merger', 'bridge',
      'configNode', 'scanner', 'transmitter', 'inverter', 'counter', 'latch',
    ],
    _discipline: 'mechanics',
  });
}

function render(): Node {
  let r: Node;
  TestRenderer.act(() => {
    r = TestRenderer.create(
      <RequisitionPanel
        discipline="mechanics"
        creditBalance={500}
        preAssignedPieces={['conveyor', 'gear']}
        purchasableTapes={['TRAIL', 'OUT']}
        freeTapes={['IN']}
        onConfirm={jest.fn()}
      />,
    );
  });
  return r;
}

const panelRoot = (r: Node): Node => r.root.findAllByType('AnimatedView')[0];
const panelBody = (r: Node): Node => r.root.findAllByType('AnimatedView')[1];
const confirmBtn = (r: Node): Node => r.root.findByProps({ accessibilityLabel: 'Confirm requisition' });
const handleBtn = (r: Node): Node => r.root.findAllByType('TouchableOpacity')[0];

function footerOf(r: Node): Node {
  let n = confirmBtn(r).parent;
  while (n && !isHost(n)) n = n.parent;
  return n;
}

// Fire every onLayout in the panel with that element's natural height —
// the value an unconstrained native layout would report. Design-agnostic:
// works whichever elements the panel chooses to measure.
function fireAllLayouts(r: Node): void {
  const measured = r.root.findAll((n: Node) => isHost(n) && typeof n.props.onLayout === 'function');
  TestRenderer.act(() => {
    for (const v of measured) {
      v.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 360, height: natural(v) } } });
    }
  });
}

function pressTab(r: Node, tab: string): void {
  const btn = r.root.findAllByType('TouchableOpacity').find((t: Node) => {
    const texts = t.findAllByType('Text').map((x: Node) => [].concat(x.props.children).join(''));
    return texts.some((s: string) => s.startsWith(tab));
  });
  if (!btn) throw new Error(`tab ${tab} not found`);
  TestRenderer.act(() => { btn.props.onPress(); });
}

function expand(r: Node): void {
  fireAllLayouts(r);
  TestRenderer.act(() => { handleBtn(r).props.onPress(); });
  fireAllLayouts(r);
}

function solve(r: Node, panel: number) {
  const boxes = new Map<Node, { y: number; h: number }>();
  layout(panelRoot(r), 0, panel, boxes);
  return boxes;
}

// Every clipping ancestor of `n` (overflow hidden, plus the panel root,
// whose bottom edge is the ENGAGE row) must contain n's whole box.
function fullyVisible(r: Node, n: Node, boxes: Map<Node, { y: number; h: number }>): boolean {
  const box = boxes.get(n);
  if (!box || box.h <= 0) return false;
  let a = n.parent;
  while (a) {
    if (isHost(a)) {
      const s = flattenStyle(a.props.style);
      const ab = boxes.get(a);
      const clips = s.overflow === 'hidden' || a === panelRoot(r);
      if (clips && ab && box.y + box.h > ab.y + ab.h + 0.5) return false;
    }
    a = a.parent;
  }
  return true;
}

const TABS = ['PHYSICS', 'PROTOCOL', 'DATA', 'INFRA'];

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('RequisitionPanel — confirm footer on a compact screen (AXM-036 hotfix 2)', () => {
  it('[HF2-1] at 360x640 on a K1-2 store the expanded footer and REQUISITION button sit fully inside the panel', () => {
    setScreen(COMPACT);
    const r = render();
    expand(r);
    const boxes = solve(r, COMPACT.panel);
    expect(fullyVisible(r, footerOf(r), boxes)).toBe(true);
    expect(fullyVisible(r, confirmBtn(r), boxes)).toBe(true);
    // The button keeps its natural height: it is not squashed to fit.
    expect(boxes.get(confirmBtn(r))!.h).toBeCloseTo(natural(confirmBtn(r)), 5);
  });

  it('[HF2-2] the footer stays fully inside the panel on every tab at 360x640 and at 390x844', () => {
    for (const screen of [COMPACT, LARGE]) {
      setScreen(screen);
      const r = render();
      expand(r);
      for (const tab of TABS) {
        pressTab(r, tab);
        fireAllLayouts(r);
        const boxes = solve(r, screen.panel);
        expect({ screen: screen.height, tab, visible: fullyVisible(r, confirmBtn(r), boxes) })
          .toEqual({ screen: screen.height, tab, visible: true });
      }
      jest.restoreAllMocks();
    }
  });

  it('[HF2-3] every rendered ancestor of the footer, up to the panel root, can shrink', () => {
    setScreen(COMPACT);
    const r = render();
    expand(r);
    const root = panelRoot(r);
    const stiff: string[] = [];
    let a = footerOf(r).parent;
    while (a && a !== root.parent) {
      if (isHost(a) && shrinkOf(flattenStyle(a.props.style)) < 1) {
        stiff.push(`${a.type}${a.props.onLayout ? '(onLayout)' : ''}`);
      }
      a = a.parent;
    }
    expect(stiff).toEqual([]);
  });

  it('[HF2-4] the list is what gives up height: its wrapper shrinks to 0 and the confirm control is outside the scroll view', () => {
    setScreen(COMPACT);
    const r = render();
    const scroll = r.root.findByType('ScrollView');
    let wrap = scroll.parent;
    while (wrap && !isHost(wrap)) wrap = wrap.parent;
    const ws = flattenStyle(wrap.props.style);
    expect(shrinkOf(ws)).toBeGreaterThanOrEqual(1);
    expect(ws.minHeight).toBe(0);
    expect(shrinkOf(flattenStyle(scroll.props.style))).toBeGreaterThanOrEqual(1);
    expect(scroll.findAll((n: Node) => n.props.accessibilityLabel === 'Confirm requisition')).toHaveLength(0);
    expect(shrinkOf(flattenStyle(footerOf(r).props.style))).toBe(0);
  });
});

describe('RequisitionPanel — tab switches do not resize the panel (AXM-036 hotfix 2)', () => {
  it('[HF2-5] the list region has one fixed height on every tab, whatever each tab holds', () => {
    setScreen(LARGE);
    const r = render();
    expand(r);
    const heights = TABS.map(tab => {
      pressTab(r, tab);
      fireAllLayouts(r);
      const scroll = r.root.findByType('ScrollView');
      let wrap = scroll.parent;
      while (wrap && !isHost(wrap)) wrap = wrap.parent;
      return flattenStyle(wrap.props.style).height;
    });
    expect(typeof heights[0]).toBe('number');
    expect(new Set(heights).size).toBe(1);
  });

  it('[HF2-6] the body height is identical across tab switches at 360x640 and at 390x844', () => {
    for (const screen of [COMPACT, LARGE]) {
      setScreen(screen);
      const r = render();
      expand(r);
      const bodyHeights = TABS.map(tab => {
        pressTab(r, tab);
        fireAllLayouts(r);
        return Math.round(solve(r, screen.panel).get(panelBody(r))!.h);
      });
      expect({ screen: screen.height, bodyHeights })
        .toEqual({ screen: screen.height, bodyHeights: bodyHeights.map(() => bodyHeights[0]) });
      jest.restoreAllMocks();
    }
  });
});

describe('RequisitionPanel — collapsed shows nothing below the handle (AXM-036 hotfix 2)', () => {
  it('[HF2-7] before any layout pass the collapsed body is already held at maxHeight 0', () => {
    setScreen(COMPACT);
    const r = render();
    expect(flattenStyle(panelBody(r).props.style).maxHeight).toBe(0);
  });

  it('[HF2-8] after expand then collapse, the body solves to 0 height and no tab or footer is visible', () => {
    setScreen(COMPACT);
    const r = render();
    expand(r);
    TestRenderer.act(() => { handleBtn(r).props.onPress(); });
    fireAllLayouts(r);
    const boxes = solve(r, COMPACT.panel);
    expect(boxes.get(panelBody(r))!.h).toBe(0);
    expect(fullyVisible(r, confirmBtn(r), boxes)).toBe(false);
  });
});
