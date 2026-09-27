// AXM-036 P3 (F3) — the Requisition store slides in on mount, its
// handle-driven expand/collapse animates smoothly (not a hard snap), and
// the existing confirm slide-out is unchanged (re-expressed through the
// requisitionSlide constants).

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';

jest.mock('../../src/components/PieceIcon', () => ({ PieceIcon: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer = require('react-test-renderer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Animated } = require('react-native');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RequisitionPanel = require('../../src/components/gameplay/RequisitionPanel').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useRequisitionStore } = require('../../src/store/requisitionStore');
import {
  REQ_SLIDE_DISTANCE,
  REQ_SLIDE_MS,
} from '../../src/components/gameplay/requisitionSlide';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resetStore() {
  useRequisitionStore.setState({
    phase: 'requisition',
    requisition: { purchases: [], totalSpend: 0, creditBudget: 100, confirmed: false },
    inventory: { pieces: [], tapes: { in: true, trail: false, out: false } },
    selectedInventoryId: null,
    _availablePieceTypes: ['conveyor', 'gear'],
    _discipline: 'mechanics',
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function baseProps(onConfirm: jest.Mock) {
  return {
    discipline: 'mechanics' as const,
    creditBalance: 500,
    preAssignedPieces: ['conveyor'] as const,
    purchasableTapes: ['TRAIL', 'OUT'] as const,
    freeTapes: ['IN'] as const,
    onConfirm,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function render(onConfirm: jest.Mock = jest.fn()): any {
  let r: any;
  TestRenderer.act(() => {
    r = TestRenderer.create(<RequisitionPanel {...baseProps(onConfirm)} />);
  });
  return r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findAnimatedViews(r: any): any[] {
  return r.root.findAllByType('AnimatedView');
}

// The inner content View carries onLayout=handleBodyLayout; it is the only
// View in the tree with that prop.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findLayoutView(r: any): any {
  const views = r.root.findAllByType('View');
  const hit = views.find((v: any) => typeof v.props.onLayout === 'function');
  if (!hit) throw new Error('layout-measuring View not found');
  return hit;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fireLayout(view: any, height: number): void {
  TestRenderer.act(() => {
    view.props.onLayout({ nativeEvent: { layout: { height, width: 300, x: 0, y: 0 } } });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findHandleButton(r: any): any {
  // The handle TouchableOpacity is the first TouchableOpacity in the tree —
  // it renders inside handleArea, before the tab bar, rows, and footer.
  return r.root.findAllByType('TouchableOpacity')[0];
}

beforeEach(() => {
  resetStore();
});

describe('RequisitionPanel — slide motion (AXM-036 P3)', () => {
  it('[P3-2] mount animates root translate 600 to 0, 600 ms, JS driver', () => {
    const timingSpy = jest.spyOn(Animated, 'timing');
    const r = render();

    const mountCall = timingSpy.mock.calls.find(
      (call: any[]) => call[1].toValue === 0 && call[1].duration === REQ_SLIDE_MS,
    ) as any[] | undefined;
    expect(mountCall).toBeDefined();
    expect(mountCall![1].useNativeDriver).toBe(false);

    const root = findAnimatedViews(r)[0];
    const styleArr: any[] = [].concat(root.props.style);
    const transformEntry = styleArr.find((s: any) => s && s.transform) as any;
    const slideOutAnim = transformEntry.transform[0].translateY;
    // The mock's timing.start() resolves synchronously to toValue.
    expect(slideOutAnim.__getValue()).toBe(0);

    timingSpy.mockRestore();
  });

  it('[P3-3] handle tap collapses then expands with 600 ms JS-driver timings and body stays mounted', () => {
    const r = render();
    const layoutView = findLayoutView(r);
    fireLayout(layoutView, 420);

    const timingSpy = jest.spyOn(Animated, 'timing');
    const handle = findHandleButton(r);

    TestRenderer.act(() => {
      handle.props.onPress();
    });
    const expandCall = timingSpy.mock.calls.find(
      (call: any[]) => call[1].toValue === 420 && call[1].duration === REQ_SLIDE_MS,
    ) as any[] | undefined;
    expect(expandCall).toBeDefined();
    expect(expandCall![1].useNativeDriver).toBe(false);

    TestRenderer.act(() => {
      handle.props.onPress();
    });
    const collapseCall = timingSpy.mock.calls.find(
      (call: any[]) => call[1].toValue === 0 && call[1].duration === REQ_SLIDE_MS
        && call[1] !== expandCall![1],
    ) as any[] | undefined;
    expect(collapseCall).toBeDefined();
    expect(collapseCall![1].useNativeDriver).toBe(false);

    // The body never unmounts across either tap — the footer and its
    // confirm control are findable both times.
    expect(() => r.root.findByProps({ accessibilityLabel: 'Confirm requisition' })).not.toThrow();

    timingSpy.mockRestore();
  });

  it('[P3-3] the collapse animation drives maxHeight, not height', () => {
    const r = render();
    const layoutView = findLayoutView(r);
    fireLayout(layoutView, 300);

    const body = findAnimatedViews(r)[1];
    const flat: any[] = [].concat(body.props.style).filter(Boolean);
    const maxHeightEntry = flat.find((s: any) => s && Object.prototype.hasOwnProperty.call(s, 'maxHeight')) as any;
    expect(maxHeightEntry).toBeDefined();
    expect(maxHeightEntry.maxHeight).toBeInstanceOf(Animated.Value);

    const hasHeightKey = flat.some((s: any) => s && Object.prototype.hasOwnProperty.call(s, 'height'));
    expect(hasHeightKey).toBe(false);
  });

  it('[P3-3] compact fit holds', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/gameplay/RequisitionPanel.tsx'),
      'utf8',
    );
    const styleBlock = (name: string): string => {
      const m = src.match(new RegExp(`\\n\\s*${name}:\\s*\\{([^}]*)\\}`));
      if (!m) throw new Error(`style block "${name}" not found`);
      return m[1];
    };
    expect(styleBlock('root')).toMatch(/flexShrink:\s*1/);
    expect(styleBlock('contentWrap')).toMatch(/flexShrink:\s*1/);
    expect(styleBlock('footer')).toMatch(/flexShrink:\s*0/);
    expect(styleBlock('body')).toMatch(/flexShrink:\s*1/);
    expect(styleBlock('body')).not.toMatch(/[^x]height:\s*\d/);
  });

  it('[P3-3] collapsed body is non-interactive and hidden from accessibility', () => {
    const r = render();
    const layoutView = findLayoutView(r);
    fireLayout(layoutView, 300);

    const collapsedBody = findAnimatedViews(r)[1];
    expect(collapsedBody.props.pointerEvents).toBe('none');
    expect(collapsedBody.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(collapsedBody.props.accessibilityElementsHidden).toBe(true);

    const handle = findHandleButton(r);
    TestRenderer.act(() => {
      handle.props.onPress();
    });

    const expandedBody = findAnimatedViews(r)[1];
    expect(expandedBody.props.pointerEvents).toBe('auto');
    expect(expandedBody.props.importantForAccessibility).toBe('auto');
    expect(expandedBody.props.accessibilityElementsHidden).toBe(false);
  });

  it('[P3-4] confirm still slides out to 600 then calls onConfirm', () => {
    const onConfirm = jest.fn();
    const r = render(onConfirm);
    const timingSpy = jest.spyOn(Animated, 'timing');

    const confirmBtn = r.root.findByProps({ accessibilityLabel: 'Confirm requisition' });
    TestRenderer.act(() => {
      confirmBtn.props.onPress();
    });

    const outCall = timingSpy.mock.calls.find(
      (call: any[]) => call[1].toValue === REQ_SLIDE_DISTANCE && call[1].duration === REQ_SLIDE_MS,
    ) as any[] | undefined;
    expect(outCall).toBeDefined();
    expect(outCall![1].useNativeDriver).toBe(false);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    timingSpy.mockRestore();
  });
});
