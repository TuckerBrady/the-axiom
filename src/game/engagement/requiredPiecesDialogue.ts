const PIECE_DISPLAY_NAMES: Partial<Record<string, string>> = {
  splitter: 'Splitter',
  merger: 'Merger',
  bridge: 'Bridge',
  latch: 'Latch',
  scanner: 'Scanner',
  transmitter: 'Transmitter',
  configNode: 'Config Node',
  conveyor: 'Conveyor',
  gear: 'Gear',
  inverter: 'Inverter',
  counter: 'Counter',
};

function displayName(type: string): string {
  return PIECE_DISPLAY_NAMES[type] ?? type;
}

function listPieces(types: string[]): string {
  if (types.length === 1) return types[0];
  if (types.length === 2) return `${types[0]} and ${types[1]}`;
  const last = types[types.length - 1];
  const rest = types.slice(0, -1).join(', ');
  return `${rest}, and ${last}`;
}

export function buildRequiredPiecesCogsLine(
  levelId: string,
  missing: Array<{ type: string; required: number; engaged: number }>,
): string {
  const missingNames = missing.map(m => displayName(m.type));

  if (levelId === 'K1-6') {
    const hasSplitter = missing.some(m => m.type === 'splitter');
    const hasMerger = missing.some(m => m.type === 'merger');
    if (hasSplitter && hasMerger) {
      return 'The Splitter and Merger were not engaged. The signal passed through, but the machine did not branch. A straight line is not a solution here.';
    }
    if (hasSplitter) {
      return 'The Splitter was not engaged. The branching architecture was not built. I registered the output. The method was not acceptable.';
    }
    if (hasMerger) {
      return 'The Merger was not engaged. Two paths that do not reconverge are two incomplete paths. The output was coincidental.';
    }
  }

  if (levelId === 'K1-8') {
    if (missingNames.length >= 3) {
      return `The ${listPieces(missingNames)} were not engaged. The machine produced output by bypassing the required architecture. That is not the same as solving it.`;
    }
    if (missingNames.length === 2) {
      return `The ${missingNames[0]} and ${missingNames[1]} were not engaged. The transit gate requires the full architecture. A partial solution is a deferred failure.`;
    }
    return `The ${missingNames[0]} was not engaged. The required architecture was not built. Output achieved by bypass is not credited here.`;
  }

  const count = missingNames.length;
  if (count === 1) {
    return `The ${missingNames[0]} was not engaged during this run. Place it where the signal can reach it.`;
  }
  return `${listPieces(missingNames)} were not engaged during this run. The required architecture was not built.`;
}
