// AXM-036 P6 (F6) — tray scroll haptic tick. A user-driven scroll runs from
// `onScrollBeginDrag` until the settle that ends it; during it, each change
// of `indexAtOffset` ticks `hapticSelection()` exactly once. There is no
// tick at drag start, and a programmatic scroll (`onScroll` firing with no
// prior `onScrollBeginDrag`) never ticks.
// Red on origin/master: `PieceTray.tsx` never calls `hapticSelection` and
// wires no `onScrollBeginDrag` handler to the ScrollView.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';
import type { TrayItem } from '../../src/components/gameplay/PieceTray';
import { TRAY_PITCH } from '../../src/components/gameplay/trayCentre';

jest.mock('../../src/components/PieceIcon', () => ({ PieceIcon: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('../../src/store/settingsStore', () => ({
  useSettingsStore: { getState: jest.fn() },
}));

import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../../src/store/settingsStore';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer = require('react-test-renderer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PieceTray = require('../../src/components/gameplay/PieceTray').default;

type Node = { props: Record<string, any>; type: unknown };

const mockGetState = useSettingsStore.getState as jest.Mock;
const mockSelection = Haptics.selectionAsync as jest.Mock;

const item = (key: string, type: TrayItem['type'], count = 1): TrayItem =>
  ({ key, type, isTape: false, count });

const FIVE: TrayItem[] = [
  item('conveyor', 'conveyor', 3),
  item('gear', 'gear', 2),
  item('splitter', 'splitter', 1),
  item('scanner', 'scanner', 1),
  item('merger', 'merger', 1),
];

const scrollTo = jest.fn();
const createNodeMock = (el: Node) => (el.type === 'ScrollView' ? { scrollTo } : {});

function byTestId(r: any, id: string): Node {
  return r.root.find((n: Node) => n.props && n.props.testID === id && typeof n.type === 'string');
}

function findScrollView(r: any): Node {
  return r.root.find((n: Node) => n.type === 'ScrollView');
}

function mount() {
  const onPickup = jest.fn();
  let r: any;
  TestRenderer.act(() => {
    r = TestRenderer.create(
      <PieceTray items={FIVE} selectedKey={null} onPickup={onPickup} resetKey="L1" />,
      { createNodeMock },
    );
  });
  TestRenderer.act(() => {
    byTestId(r, 'tray-viewport').props.onLayout({ nativeEvent: { layout: { width: 411, height: 72 } } });
  });
  return r;
}

function scrollEvent(x: number) {
  return {
    nativeEvent: {
      contentOffset: { x, y: 0 },
      contentSize: { width: 1000, height: 72 },
      layoutMeasurement: { width: 411, height: 72 },
    },
  };
}

describe('PieceTray scroll haptic tick (AXM-036 P6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({ hapticsEnabled: true });
  });

  it('[P6-2] drag across offsets 0, 64, 128 ticks twice', () => {
    expect(TRAY_PITCH).toBe(64);
    const r = mount();
    const sv = findScrollView(r);
    TestRenderer.act(() => { sv.props.onScrollBeginDrag(scrollEvent(0)); });
    TestRenderer.act(() => { sv.props.onScroll(scrollEvent(0)); });
    TestRenderer.act(() => { sv.props.onScroll(scrollEvent(TRAY_PITCH)); });
    TestRenderer.act(() => { sv.props.onScroll(scrollEvent(TRAY_PITCH * 2)); });
    expect(mockSelection).toHaveBeenCalledTimes(2);
  });

  it('[P6-2] onScroll without begin-drag never ticks', () => {
    const r = mount();
    const sv = findScrollView(r);
    TestRenderer.act(() => { sv.props.onScroll(scrollEvent(TRAY_PITCH)); });
    TestRenderer.act(() => { sv.props.onScroll(scrollEvent(TRAY_PITCH * 2)); });
    expect(mockSelection).not.toHaveBeenCalled();
  });

  it('[P6-2] same index twice ticks once', () => {
    const r = mount();
    const sv = findScrollView(r);
    TestRenderer.act(() => { sv.props.onScrollBeginDrag(scrollEvent(0)); });
    TestRenderer.act(() => { sv.props.onScroll(scrollEvent(TRAY_PITCH)); });
    TestRenderer.act(() => { sv.props.onScroll(scrollEvent(TRAY_PITCH)); });
    expect(mockSelection).toHaveBeenCalledTimes(1);
  });

  it('[P6-2] haptics disabled, no call', () => {
    mockGetState.mockReturnValue({ hapticsEnabled: false });
    const r = mount();
    const sv = findScrollView(r);
    TestRenderer.act(() => { sv.props.onScrollBeginDrag(scrollEvent(0)); });
    TestRenderer.act(() => { sv.props.onScroll(scrollEvent(TRAY_PITCH)); });
    expect(mockSelection).not.toHaveBeenCalled();
  });
});
