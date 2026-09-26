// AXM-020 (PROMPT_161) — centre-select tray, rendered. Drives the real
// PieceTray through react-test-renderer: the frame is the selection, a tap
// on any visible item centres and selects it, and a hold-to-drag from an
// off-centre item carries that item's type without re-centring first.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';
import type { TrayItem, DragState } from '../../src/components/gameplay/PieceTray';

jest.mock('../../src/components/PieceIcon', () => ({ PieceIcon: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer = require('react-test-renderer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PieceTray = require('../../src/components/gameplay/PieceTray').default;

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

function frameColour(r: any): unknown {
  const flat = [byTestId(r, 'tray-frame').props.style].flat(Infinity).filter(Boolean) as Record<string, unknown>[];
  return Object.assign({}, ...flat).borderColor;
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
  // Tucker, build-48 walkthrough: one square, not two. The fixed frame takes
  // the colour of the piece it holds, and the selected item drops its own
  // outline. The frame is amber only when nothing in it is selectable.
  it('renders a fixed centre frame that never takes touches', () => {
    const { r } = mount({ items: FIVE });
    const frame = byTestId(r, 'tray-frame');
    expect(frame.props.pointerEvents).toBe('none');
  });

  it('the frame takes the colour of the selected piece type', () => {
    const kinds: TrayItem[] = [item('conveyor', 'conveyor', 1), item('scanner', 'scanner', 1)];
    const { r } = mount({ items: kinds });
    expect(frameColour(r)).toBe('#4a9eff');
    TestRenderer.act(() => { setSelectedExternally('scanner'); });
    expect(frameColour(r)).toBe('#8B5CF6');
  });

  it('the frame takes the tape colour when a tape is selected', () => {
    const tape: TrayItem = { key: 'tape:in', type: 'conveyor', isTape: true, count: 1 };
    const { r } = mount({ items: [tape] });
    expect(frameColour(r)).toBe('#A97FDB');
  });

  it('the frame is amber when nothing in it is selected', () => {
    // A placed piece is selected on the board: the tray holds, its frame
    // holds nothing.
    const { r } = mount({ items: FIVE });
    TestRenderer.act(() => {
      r.update(<Harness items={FIVE} holdSelection onPickupSpy={jest.fn()} />);
    });
    TestRenderer.act(() => { setSelectedExternally(null); });
    expect(frameColour(r)).toBe('#F0B429');
  });

  it('the selected item draws no outline of its own', () => {
    const { r } = mount({ items: FIVE });
    const host = byTestId(r, 'tray-item-conveyor');
    const flat = [host.props.style].flat(Infinity).filter(Boolean) as Record<string, unknown>[];
    const border = Object.assign({}, ...flat).borderColor;
    expect(border).toBe('rgba(74,158,255,0.2)');
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

  it('a filter change re-centres on the first item of the new list and selects it', () => {
    const kepler: TrayItem[] = [
      item('conveyor:piece', 'conveyor', 1),
      item('gear:piece', 'gear', 1),
      item('scanner:piece', 'scanner', 1),
      item('transmitter:piece', 'transmitter', 1),
      item('configNode:piece', 'configNode', 1),
    ];
    const spy = jest.fn();
    let r: any;
    function Chips() {
      const [sel, setSel] = React.useState<string | null>(null);
      return (
        <PieceTray
          items={kepler}
          selectedKey={sel}
          onPickup={(k: string | null) => { spy(k); setSel(k); }}
          showFilterChips
          showSourceSplit
          resetKey="K1-10"
        />
      );
    }
    TestRenderer.act(() => { r = TestRenderer.create(<Chips />, { createNodeMock }); });
    expect(lastSelected(spy)).toBe('conveyor:piece');
    TestRenderer.act(() => { byTestId(r, 'tray-item-gear:piece').props.onPress(); });
    expect(lastSelected(spy)).toBe('gear:piece');
    scrollTo.mockClear();
    const protocol = r.root.find((n: Node) => n.props.accessibilityLabel === 'Filter PROTOCOL' && n.type === 'TouchableOpacity');
    TestRenderer.act(() => { protocol.props.onPress(); });
    expect(scrollTo).toHaveBeenCalledWith({ x: 0, animated: false });
    expect(lastSelected(spy)).toBe('scanner:piece');
  });

  it('without drag wiring, a tap on an off-centre item still centres and selects it', () => {
    const spy = jest.fn();
    let r: any;
    function TapOnly() {
      const [sel, setSel] = React.useState<string | null>(null);
      return <PieceTray items={FIVE} selectedKey={sel} onPickup={(k: string | null) => { spy(k); setSel(k); }} />;
    }
    TestRenderer.act(() => { r = TestRenderer.create(<TapOnly />, { createNodeMock }); });
    const host = byTestId(r, 'tray-item-merger');
    TestRenderer.act(() => { host.props.onPress(); });
    expect(lastSelected(spy)).toBe('merger');
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 256, animated: true });
  });

  it('a drag released without a fling settles on the item under the frame', () => {
    const { r, spy } = mount({ items: FIVE });
    const sv = r.root.find((n: Node) => n.type === 'ScrollView');
    TestRenderer.act(() => {
      sv.props.onScrollEndDrag({ nativeEvent: { contentOffset: { x: 70, y: 0 } } });
    });
    TestRenderer.act(() => { jest.advanceTimersByTime(80); });
    expect(lastSelected(spy)).toBe('gear');
  });

  it('a fling cancels the no-fling settle; momentum end decides', () => {
    const { r, spy } = mount({ items: FIVE });
    const sv = r.root.find((n: Node) => n.type === 'ScrollView');
    spy.mockClear();
    TestRenderer.act(() => {
      sv.props.onScrollEndDrag({ nativeEvent: { contentOffset: { x: 70, y: 0 } } });
      sv.props.onMomentumScrollBegin();
    });
    TestRenderer.act(() => { jest.advanceTimersByTime(200); });
    expect(spy).not.toHaveBeenCalled();
    TestRenderer.act(() => {
      sv.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 256, y: 0 } } });
    });
    expect(lastSelected(spy)).toBe('merger');
  });

  it('settling on an item with none left selects nothing', () => {
    const spent = FIVE.map(i => (i.key === 'gear' ? { ...i, count: 0 } : i));
    const { r, spy } = mount({ items: spent });
    const sv = r.root.find((n: Node) => n.type === 'ScrollView');
    TestRenderer.act(() => {
      sv.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 64, y: 0 } } });
    });
    expect(lastSelected(spy)).toBeNull();
  });

  it('scales the selected item a little, JS-driven, keyed to selection', () => {
    const { r } = mount({ items: FIVE });
    const scaled = r.root.findAll((n: Node) => n.type === 'AnimatedView' && n.props.testID === 'tray-item-scale-conveyor');
    expect(scaled).toHaveLength(1);
  });

  // Vaughn's PR #57 conditions. The native half of the swipe fix
  // (onShouldBlockNativeResponder) can't run in jest; this is the half that
  // can: a swipe the ScrollView takes arrives as a terminate before the hold
  // fires, and must leave no drag, no selection change and no scroll behind.
  it('a swipe the ScrollView takes (terminate before the hold) starts no drag and selects nothing', () => {
    const onDragStart = jest.fn();
    const { r, spy } = mount({ items: FIVE, onDragStart });
    spy.mockClear();
    scrollTo.mockClear();
    const host = byTestId(r, 'tray-item-scanner');
    TestRenderer.act(() => { host.props.onResponderGrant(touch); });
    TestRenderer.act(() => { jest.advanceTimersByTime(100); });
    TestRenderer.act(() => { host.props.onResponderTerminate(); });
    TestRenderer.act(() => { jest.advanceTimersByTime(200); });
    expect(onDragStart).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('a selection set from outside the tray (a tutorial step) moves the frame to it', () => {
    const { spy } = mount({ items: FIVE });
    scrollTo.mockClear();
    spy.mockClear();
    TestRenderer.act(() => { setSelectedExternally('scanner'); });
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 192, animated: true });
    // The tray follows the outside selection; it does not fight it.
    expect(spy).not.toHaveBeenCalled();
  });
});
