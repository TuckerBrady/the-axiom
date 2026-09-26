// Tutorial tray focus (Tucker, build-48 TestFlight). When a tutorial step
// targets a tray piece, the tray first slides that piece into the centre
// frame, and the '???' spotlight lands on the frame.

import type { PieceType } from './types';

const TRAY_REF_TYPES: Record<string, PieceType> = {
  trayConveyor: 'conveyor',
  trayGear: 'gear',
  trayConfigNode: 'configNode',
  traySplitter: 'splitter',
  trayScanner: 'scanner',
  trayTransmitter: 'transmitter',
  // AXM-031: Kepler and Nova discoveries resolve to these in the tray.
  trayMerger: 'merger',
  trayInverter: 'inverter',
};

// The tray's animated scrollTo runs about 250-300ms on both platforms. The
// spotlight measures after it lands.
export const TRAY_FOCUS_SETTLE_MS = 350;

// The tray item a tutorial target names, or null when the target is not a
// tray piece or the piece is not in the tray. On a Kepler tray the piece is
// meant, never its tape.
export function trayFocusKey(
  targetRef: string | undefined,
  items: ReadonlyArray<{ key: string; type: PieceType; isTape: boolean }>,
): string | null {
  const type = targetRef ? TRAY_REF_TYPES[targetRef] : undefined;
  if (!type) return null;
  return items.find(i => i.type === type && !i.isTape)?.key ?? null;
}
