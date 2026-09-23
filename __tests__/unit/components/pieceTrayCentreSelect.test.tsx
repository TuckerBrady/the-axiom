// AXM-020 (PROMPT_161) — centre-select tray, rendered. Drives the real
// PieceTray through react-test-renderer: the frame is the selection, a tap
// on any visible item centres and selects it, and a hold-to-drag from an
// off-centre item carries that item's type without re-centring first.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';
import type { TrayItem, DragState } from '../../../src/components/gameplay/PieceTray';

jest.mock('../../../src/components/PieceIcon', () => ({ PieceIcon: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer = require('react-test-renderer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PieceTray = require('../../../src/components/gameplay/PieceTray').default;

type Node = { props: Record<string, any>; type: unknown };

const item = (key: string, type: TrayItem['type'], count = 1): TrayItem =>
  ({ key, type, isTape: false, count });

const FIVE: TrayItem[] = [
  item('conveyor', 'conveyor', 3),
  item('gear', 'gear', 2),
  item('splitter', 'splitter', 1),
  item('scanner', 'scanner', 1),
  item('merger', 'merger', 1),
];

interface HarnessProps {
  items: TrayItem[];
  initialSelected?: string | null;
  hidden?: boolean;
  holdSelection?: boolean;
  onPickupSpy: jest.Mock;
  onDragStart?: jest.Mock;
  onDragEnd?: jest.Mock;
}

let setSelectedExternally: (k: string | null) => void = () => undefined;

// Plays the parent: owns the selection the way GameplayScreen's stores do.
function Harness(p: HarnessProps) {
  const [selected, setSelected] = React.useState<string | null>(p.initialSelected ?? null);
  setSelectedExternally = setSelected;
  const onPickup = React.useCallback((k: string | null) => {
    p.onPickupSpy(k);
    setSelected(k);
  }, [p.onPickupSpy]);
  return (
    <PieceTray
      items={p.items}
      selectedKey={selected}
      onPickup={onPickup}
      onDragStart={p.onDragStart ?? jest.fn()}
      onDragMove={jest.fn()}
      onDragEnd={p.onDragEnd ?? jest.fn()}
      onDragCancel={jest.fn()}
      hidden={p.hidden}
      holdSelection={p.holdSelection}
      resetKey="L1"
    />
  );
}

const scrollTo = jest.fn();
const createNodeMock = (el: Node) => (el.type === 'ScrollView' ? { scrollTo } : {});

function mount(props: Omit<HarnessProps, 'onPickupSpy'> & { onPickupSpy?: jest.Mock }) {
  const spy = props.onPickupSpy ?? jest.fn();
  let r: any;
  TestRenderer.act(() => {
    r = TestRenderer.create(<Harness {...props} onPickupSpy={spy} />, { createNodeMock });
  });
  // The viewport reports its width (411dp standard phone).
  TestRenderer.act(() => {
    byTestId(r, 'tray-viewport').props.onLayout({ nativeEvent: { layout: { width: 411, height: 72 } } });
  });
  return { r, spy };
}

function byTestId(r: any, id: string): Node {
  return r.root.find((n: Node) => n.props && n.props.testID === id && typeof n.type === 'string');
}

const touch = { nativeEvent: { pageX: 100, pageY: 700 } };

function tap(r: any, key: string) {
  const host = byTestId(r, `tray-item-${key}`);
  TestRenderer.act(() => { host.props.onResponderGrant(touch); });
  TestRenderer.act(() => { host.props.onResponderRelease(touch); });
}

function lastSelected(spy: jest.Mock) {
  return spy.mock.calls[spy.mock.calls.length - 1]?.[0];
}

beforeEach(() => {
  jest.useFakeTimers();
  scrollTo.mockClear();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('PieceTray centre-select (AXM-020)', () => {
  it('renders a fixed amber centre frame that never takes touches', () => {
    const { r } = mount({ items: FIVE });
    const frame = byTestId(r, 'tray-frame');
    expect(JSON.stringify(frame.props.style)).toContain('#F0B429');
    expect(frame.props.pointerEvents).toBe('none');
  });

  it('snaps to one offset per item, fast deceleration', () => {
    const { r } = mount({ items: FIVE });
    const sv = r.root.find((n: Node) => n.type === 'ScrollView');
    expect(sv.props.snapToOffsets).toEqual([0, 64, 128, 192, 256]);
    expect(sv.props.decelerationRate).toBe('fast');
  });

  it('on level start the first item sits in the frame, selected', () => {
    const { spy } = mount({ items: FIVE });
    expect(lastSelected(spy)).toBe('conveyor');
  });

  it('tapping an off-centre item scrolls it into the frame and selects it', () => {
    const { r, spy } = mount({ items: FIVE });
    tap(r, 'splitter');
    expect(lastSelected(spy)).toBe('splitter');
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 128, animated: true });
  });

  it('tapping the item already in the frame keeps it selected', () => {
    const { r, spy } = mount({ items: FIVE });
    tap(r, 'conveyor');
    expect(lastSelected(spy)).toBe('conveyor');
  });

  it('a drag from an off-centre item carries that item\'s type and does not re-centre', () => {
    const onDragStart = jest.fn();
    const onDragEnd = jest.fn();
    const { r, spy } = mount({ items: FIVE, onDragStart, onDragEnd });
    spy.mockClear();
    scrollTo.mockClear();
    const host = byTestId(r, 'tray-item-scanner');
    TestRenderer.act(() => { host.props.onResponderGrant(touch); });
    TestRenderer.act(() => { jest.advanceTimersByTime(180); });
    expect(onDragStart).toHaveBeenCalledTimes(1);
    const drag: DragState = onDragStart.mock.calls[0][0];
    expect(drag.type).toBe('scanner');
    expect(drag.pieceId).toBe('scanner');
    TestRenderer.act(() => { host.props.onResponderRelease({ nativeEvent: { pageX: 150, pageY: 300 } }); });
    expect(onDragEnd).toHaveBeenCalledWith(150, 300);
    // Browsing never gets in the way of placing: no selection change, no scroll.
    expect(spy).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('whatever settles in the frame after a scroll is the selection', () => {
    const { r, spy } = mount({ items: FIVE });
    const sv = r.root.find((n: Node) => n.type === 'ScrollView');
    TestRenderer.act(() => {
      sv.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 190, y: 0 } } });
    });
    expect(lastSelected(spy)).toBe('scanner');
  });

  it('after a placement clears the selection, the item still in the frame is selected again', () => {
    const { r, spy } = mount({ items: FIVE });
    const fewer = FIVE.map(i => (i.key === 'conveyor' ? { ...i, count: 2 } : i));
    TestRenderer.act(() => { setSelectedExternally(null); });
    TestRenderer.act(() => {
      r.update(<Harness items={fewer} onPickupSpy={spy} />);
    });
    expect(lastSelected(spy)).toBe('conveyor');
  });

  it('when the item in the frame leaves the tray, the next one slides in and is selected', () => {
    const { r, spy } = mount({ items: FIVE });
    tap(r, 'gear');
    const without = FIVE.filter(i => i.key !== 'gear');
    TestRenderer.act(() => { setSelectedExternally(null); });
    TestRenderer.act(() => {
      r.update(<Harness items={without} onPickupSpy={spy} />);
    });
    expect(lastSelected(spy)).toBe('splitter');
  });

  it('when the tray empties, nothing is selected', () => {
    const { r, spy } = mount({ items: [item('gear', 'gear', 1)] });
    TestRenderer.act(() => { setSelectedExternally(null); });
    spy.mockClear();
    TestRenderer.act(() => {
      r.update(<Harness items={[]} onPickupSpy={spy} />);
    });
    expect(spy).not.toHaveBeenCalledWith(expect.any(String));
  });

  it('a returned piece does not steal the frame from the current selection', () => {
    const noConveyor = FIVE.filter(i => i.key !== 'conveyor');
    const { r, spy } = mount({ items: noConveyor });
    tap(r, 'splitter');
    spy.mockClear();
    TestRenderer.act(() => {
      r.update(<Harness items={FIVE} onPickupSpy={spy} />);
    });
    expect(spy).not.toHaveBeenCalled();
    // The frame follows splitter to its new index (2 -> 128).
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 128, animated: false });
  });

  it('holds off while a placed piece is selected on the board', () => {
    const { r, spy } = mount({ items: FIVE });
    TestRenderer.act(() => { setSelectedExternally(null); });
    spy.mockClear();
    TestRenderer.act(() => {
      r.update(<Harness items={FIVE} holdSelection onPickupSpy={spy} />);
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('drops the selection while the tray is hidden for a run', () => {
    const { r, spy } = mount({ items: FIVE });
    TestRenderer.act(() => {
      r.update(<Harness items={FIVE} hidden onPickupSpy={spy} />);
    });
    expect(lastSelected(spy)).toBeNull();
  });

  it('scales the selected item a little, JS-driven, keyed to selection', () => {
    const { r } = mount({ items: FIVE });
    const scaled = r.root.findAll((n: Node) => n.type === 'AnimatedView' && n.props.testID === 'tray-item-scale-conveyor');
    expect(scaled).toHaveLength(1);
  });
});
