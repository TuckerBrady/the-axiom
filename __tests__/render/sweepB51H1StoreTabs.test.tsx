// SWEEP-B51 H1 (AXM-040): the requisition store tab labels stay legible.
//
// Smoke W-1 (93ab0d7): each tab was an equal quarter (`flex: 1`) with an
// auto-shrinking label, and Android shrank the inactive labels to about 5px.
// Contract v1.3 R-H1.1: no auto-shrink, the 11px floor always, and tabs that
// size to their labels.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';

jest.mock('../../src/components/PieceIcon', () => ({ PieceIcon: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer = require('react-test-renderer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StyleSheet } = require('react-native');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RequisitionPanel = require('../../src/components/gameplay/RequisitionPanel').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useRequisitionStore } = require('../../src/store/requisitionStore');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Fonts, FontSizes } = require('../../src/theme/tokens');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { REQ_TAB_LETTER_SPACING, REQ_TAB_PAD_X } = require('../../src/components/gameplay/requisitionTabs');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const TABS = ['PHYSICS', 'PROTOCOL', 'DATA', 'INFRA'];

// StyleSheet.flatten applied through nested style arrays (the repo's
// react-native mock returns its argument unchanged, so arrays are walked here).
function flat(s: Any): Record<string, unknown> {
  if (Array.isArray(s)) return Object.assign({}, ...s.map(flat));
  if (!s) return {};
  return { ...StyleSheet.flatten(s) };
}

function textOf(node: Any): string {
  return ([] as Any[])
    .concat(node.props.children)
    .filter((c: Any) => typeof c === 'string' || typeof c === 'number')
    .join('');
}

function render(): Any {
  useRequisitionStore.setState({
    phase: 'requisition',
    requisition: { purchases: [], totalSpend: 0, creditBudget: 100, confirmed: false },
    inventory: { pieces: [], tapes: { in: true, trail: false, out: false } },
    selectedInventoryId: null,
    _availablePieceTypes: ['conveyor', 'gear', 'configNode', 'scanner'],
    _discipline: 'mechanics',
  });
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
  return r;
}

function tabLabels(r: Any): Any[] {
  const labels = r.root
    .findAllByType('Text')
    .filter((t: Any) => TABS.some(k => textOf(t) === k || textOf(t).startsWith(`${k} (`)));
  expect(labels).toHaveLength(4);
  return labels;
}

function tabButtons(r: Any): Any[] {
  const labels = tabLabels(r);
  const buttons = r.root
    .findAllByType('TouchableOpacity')
    .filter((b: Any) => b.findAllByType('Text').some((t: Any) => labels.includes(t)));
  expect(buttons).toHaveLength(4);
  return buttons;
}

describe('SWEEP-B51 H1 store tabs', () => {
  it('[H1-1] tab labels are single-line with no auto-shrink at the 11px floor', () => {
    const r = render();
    expect(FontSizes.floor).toBe(11);
    for (const t of tabLabels(r)) {
      expect(t.props.numberOfLines).toBe(1);
      expect(t.props.adjustsFontSizeToFit).toBeUndefined();
      expect(t.props.minimumFontScale).toBeUndefined();
      const s = flat(t.props.style);
      expect(s.fontFamily).toBe(Fonts.spaceMono);
      expect(s.fontSize).toBe(FontSizes.floor);
      expect(s.letterSpacing).toBe(REQ_TAB_LETTER_SPACING);
    }
  });

  it('[H1-1] active and inactive tab labels share one font size', () => {
    const r = render();
    // Exactly one label carries the active colour; every size is the floor.
    const colors = tabLabels(r).map((t: Any) => flat(t.props.style).color);
    expect(new Set(colors).size).toBe(2);
    // Walk every tab active in turn: the size never changes, only colour.
    for (let i = 0; i < 4; i++) {
      TestRenderer.act(() => {
        tabButtons(r)[i].props.onPress();
      });
      const sizes = tabLabels(r).map((t: Any) => flat(t.props.style).fontSize);
      expect(sizes).toEqual([FontSizes.floor, FontSizes.floor, FontSizes.floor, FontSizes.floor]);
      for (const t of tabLabels(r)) {
        expect(t.props.adjustsFontSizeToFit).toBeUndefined();
        expect(t.props.minimumFontScale).toBeUndefined();
      }
    }
  });

  it('[H1-2] each tab sizes to its label instead of an equal quarter', () => {
    const r = render();
    for (const b of tabButtons(r)) {
      const s = flat(b.props.style);
      expect(s.flexGrow).toBe(1);
      expect(s.flexShrink).toBe(0);
      expect(s.flexBasis).toBe('auto');
      expect(s.paddingHorizontal).toBe(REQ_TAB_PAD_X);
      expect('flex' in s).toBe(false);
      expect(s.paddingVertical).toBe(10);
      expect(s.alignItems).toBe('center');
      expect(s.borderBottomWidth).toBe(2);
    }
  });
});
