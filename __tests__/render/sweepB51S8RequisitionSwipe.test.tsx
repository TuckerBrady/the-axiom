// SWEEP-B51 S8 (AXM-040): the requisition store swipes both ways.
//
// On master the PanResponder was created once inside useRef and closed over
// the first render's `expanded` (false), so a down swipe on an expanded
// panel ran the collapsed branch and did nothing. The repo's react-native
// mock hands a host `{}` as the gesture state, so the gesture itself is
// driven through the captured PanResponder.create config.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';

jest.mock('../../src/components/PieceIcon', () => ({ PieceIcon: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer = require('react-test-renderer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PanResponder } = require('react-native');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RequisitionPanel = require('../../src/components/gameplay/RequisitionPanel').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useRequisitionStore } = require('../../src/store/requisitionStore');

const panelSrc = fs.readFileSync(
  path.resolve(__dirname, '../../src/components/gameplay/RequisitionPanel.tsx'),
  'utf8',
);

function resetStore() {
  useRequisitionStore.setState({
    phase: 'requisition',
    requisition: { purchases: [], totalSpend: 0, creditBudget: 100, confirmed: false },
    inventory: { pieces: [], tapes: { in: true, trail: false, out: false } },
    selectedInventoryId: null,
    _availablePieceTypes: ['conveyor', 'gear', 'configNode', 'scanner'],
    _discipline: 'mechanics',
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

let configs: Any[] = [];
// Maps each returned responder handler back to the config it was built
// from, so a test drives the config the mounted host actually uses (a
// `useRef(PanResponder.create(...))` argument is re-evaluated, and
// discarded, on every render).
let configByHandler = new Map<unknown, Any>();
let createSpy: jest.SpyInstance;

function render(): Any {
  let r: Any;
  TestRenderer.act(() => {
    r = TestRenderer.create(
      <RequisitionPanel
        discipline="mechanics"
        creditBalance={500}
        preAssignedPieces={['conveyor']}
        purchasableTapes={['TRAIL', 'OUT']}
        freeTapes={['IN']}
        onConfirm={jest.fn()}
      />,
    );
  });
  // Measure the body once so expand/collapse is live.
  const layoutView = r.root
    .findAllByType('View')
    .find((v: Any) => typeof v.props.onLayout === 'function');
  TestRenderer.act(() => {
    layoutView.props.onLayout({ nativeEvent: { layout: { height: 300, width: 300, x: 0, y: 0 } } });
  });
  return r;
}

function body(r: Any): Any {
  return r.root.findAllByType('AnimatedView')[1];
}

function mountedConfig(r: Any): Any {
  const host = panHosts(r)[0];
  const cfg = configByHandler.get(host.props.onResponderRelease);
  if (!cfg) throw new Error('no PanResponder config behind the handle host');
  return cfg;
}

function release(r: Any, dy: number, dx = 0): void {
  const cfg = mountedConfig(r);
  TestRenderer.act(() => {
    cfg.onPanResponderRelease({}, { dy, dx });
  });
}

function textOf(node: Any): string {
  return ([] as Any[])
    .concat(node.props.children)
    .filter((c: Any) => typeof c === 'string' || typeof c === 'number')
    .join('');
}

// Host elements that carry the pan handlers (the mock maps them to
// responder props on the host).
function panHosts(r: Any): Any[] {
  return r.root.findAll(
    (n: Any) => typeof n.type === 'string' && typeof n.props.onResponderRelease === 'function',
  );
}

beforeEach(() => {
  resetStore();
  configs = [];
  configByHandler = new Map();
  const original = PanResponder.create;
  createSpy = jest.spyOn(PanResponder, 'create').mockImplementation((cfg: Any) => {
    configs.push(cfg);
    const made = original(cfg);
    configByHandler.set(made.panHandlers.onResponderRelease, cfg);
    return made;
  });
});

afterEach(() => {
  createSpy.mockRestore();
});

describe('SWEEP-B51 S8: requisition store swipe', () => {
  it('[S8-2] after expanding, a down swipe on the handle collapses the panel', () => {
    const r = render();
    expect(configs.length).toBeGreaterThan(0);
    expect(body(r).props.pointerEvents).toBe('none');

    release(r, -60);
    expect(body(r).props.pointerEvents).toBe('auto');

    // A short down swipe changes nothing.
    release(r, 20);
    expect(body(r).props.pointerEvents).toBe('auto');

    release(r, 60);
    expect(body(r).props.pointerEvents).toBe('none');

    // And back up again: the rule holds across any number of toggles.
    release(r, -60);
    expect(body(r).props.pointerEvents).toBe('auto');

    // The tap toggle on the handle still works.
    const handle = r.root.findAllByType('TouchableOpacity')[0];
    TestRenderer.act(() => {
      handle.props.onPress();
    });
    expect(body(r).props.pointerEvents).toBe('none');
  });

  it('[S8-2] the budget bar carries the pan handlers', () => {
    const r = render();
    const hosts = panHosts(r);
    expect(hosts).toHaveLength(2);
    const [handleHost, budgetHost] = hosts;
    // The handle area holds the REQUISITION STORE label; the budget bar
    // holds BUDGET / SPENT / REMAINING.
    const labels = (n: Any) => n.findAllByType('Text').map(textOf).join('|');
    expect(labels(handleHost)).toMatch(/REQUISITION STORE/);
    expect(labels(budgetHost)).toMatch(/BUDGET/);
    expect(labels(budgetHost)).toMatch(/REMAINING/);
    // One responder serves both.
    expect(budgetHost.props.onResponderRelease).toBe(handleHost.props.onResponderRelease);

    // Both move-should-set callbacks claim a vertical drag past 8 and
    // leave a horizontal or short one alone.
    const cfg = mountedConfig(r);
    for (const key of ['onMoveShouldSetPanResponder', 'onMoveShouldSetPanResponderCapture']) {
      expect(typeof cfg[key]).toBe('function');
      expect(cfg[key]({}, { dy: 12, dx: 2 })).toBe(true);
      expect(cfg[key]({}, { dy: -12, dx: 0 })).toBe(true);
      expect(cfg[key]({}, { dy: 8, dx: 0 })).toBe(false);
      expect(cfg[key]({}, { dy: 20, dx: 30 })).toBe(false);
    }
  });

  it('[S8-3] RequisitionPanel creates no Animated.View beyond the root and the body', () => {
    const r = render();
    expect(r.root.findAllByType('AnimatedView')).toHaveLength(2);
    release(r, -60);
    release(r, 60);
    expect(r.root.findAllByType('AnimatedView')).toHaveLength(2);
    // No Animated.Value beyond the root translate and the body maxHeight:
    // nothing new was added, and the unused drag value is gone.
    expect((panelSrc.match(/new Animated\.Value\(/g) ?? []).length).toBe(2);
  });

  it('[S8-4] tab labels and tape icon labels are single-line and auto-fit', () => {
    const r = render();
    const tabs = ['PHYSICS', 'PROTOCOL', 'DATA', 'INFRA'];
    const tabTexts = r.root
      .findAllByType('Text')
      .filter((t: Any) => tabs.some(k => textOf(t) === k || textOf(t).startsWith(`${k} (`)));
    expect(tabTexts).toHaveLength(4);
    for (const t of tabTexts) {
      expect(t.props.numberOfLines).toBe(1);
    }

    // Open the DATA tab so the tape rows render.
    const dataTab = r.root
      .findAllByType('TouchableOpacity')
      .find((b: Any) => b.findAllByType('Text').some((t: Any) => textOf(t).startsWith('DATA')));
    TestRenderer.act(() => {
      dataTab.props.onPress();
    });
    const tapeIcons = r.root
      .findAllByType('Text')
      .filter((t: Any) => ['TRAIL', 'OUT'].includes(textOf(t)));
    expect(tapeIcons).toHaveLength(2);
    for (const t of tapeIcons) {
      expect(t.props.numberOfLines).toBe(1);
      expect(t.props.adjustsFontSizeToFit).toBe(true);
      expect(t.props.minimumFontScale).toBe(0.6);
    }
  });
});
