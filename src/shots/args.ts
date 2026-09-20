/**
 * Argument parsing for `npm run shots`.
 *
 * Pure: no filesystem, no clock, no process. `parseShotsArgs` takes the raw
 * argv tail and an explicit `today`, so every branch is unit-testable and a
 * run is reproducible.
 */

import {
  DEFAULT_DEVICE_ALIASES,
  parseDeviceList,
  resolveDevices,
  type DeviceSpec,
} from './devices';
import {
  parseBoardSizeList,
  type BoardSize,
} from '../utils/boardSizeOverride';

/** Flows live here unless `--flows` overrides the glob. */
export const DEFAULT_FLOWS_GLOB = '.maestro/flows/shots/*.yaml';

/** Runs land under this root, which is gitignored. */
export const DEFAULT_OUT_ROOT = '__shots__';

export interface ShotsArgs {
  /** Run label — becomes part of the run directory name. Required. */
  label: string;
  devices: DeviceSpec[];
  flowsGlob: string;
  /**
   * Board sizes for the sweep, or null when the caller did not ask for one.
   *
   * There is deliberately no default trio: the three candidate sizes are a
   * design decision that is not settled in PROMPT_159, and inventing one
   * here would bury it in code. A board-size flow selected without `--sizes`
   * is a hard error (see `requireSizesForBoardSweep`).
   */
  sizes: BoardSize[] | null;
  /**
   * Level the flows drive, recorded per shot in the manifest. The flows
   * themselves reach it through `SHOT_LEVEL`. Null when not given.
   */
  levelId: string | null;
  outRoot: string;
  /** YYYY-MM-DD used for the run directory name. */
  date: string;
  /** Print the plan and exit without booting anything. */
  dryRun: boolean;
  /** Build + install the dev client when the simulator does not have it. */
  buildIfMissing: boolean;
  /** Leave the simulators booted after the run. */
  keepBooted: boolean;
  help: boolean;
}

export class ShotsArgError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShotsArgError';
  }
}

export const USAGE = [
  'Usage: npm run shots -- --label <name> [options]',
  '',
  'Options:',
  '  --label <name>        Required. Names the run directory.',
  '  --devices <list>      Comma-separated: se,15,max. Default: se,15,max.',
  '  --flows <glob>        Flow glob. Default: ' + DEFAULT_FLOWS_GLOB,
  '  --sizes <list>        Board sizes for the sweep, e.g. 8x7,9x8,10x9.',
  '                        Required when a board-size flow is in the set.',
  '  --level <id>          Level the flows drive, e.g. A1-3. Recorded per shot.',
  '  --out <dir>           Output root. Default: ' + DEFAULT_OUT_ROOT,
  '  --date <YYYY-MM-DD>   Override the run date. Default: today.',
  '  --build-if-missing    Build and install the dev client when absent.',
  '  --keep-booted         Do not shut the simulators down afterwards.',
  '  --dry-run             Print the plan; boot nothing, run nothing.',
  '  --help                Print this text.',
].join('\n');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const FLAGS_WITH_VALUES = new Set([
  '--label',
  '--devices',
  '--flows',
  '--sizes',
  '--level',
  '--out',
  '--date',
]);

const BOOLEAN_FLAGS = new Set([
  '--dry-run',
  '--build-if-missing',
  '--keep-booted',
  '--help',
  '-h',
]);

export interface ParseOptions {
  /** Today's date as YYYY-MM-DD. Injected so parsing stays pure. */
  today: string;
}

export function parseShotsArgs(argv: readonly string[], options: ParseOptions): ShotsArgs {
  const raw: Record<string, string> = {};
  const booleans = new Set<string>();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (BOOLEAN_FLAGS.has(token)) {
      booleans.add(token === '-h' ? '--help' : token);
      continue;
    }
    if (FLAGS_WITH_VALUES.has(token)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new ShotsArgError(`${token} needs a value.\n\n${USAGE}`);
      }
      raw[token] = value;
      i += 1;
      continue;
    }
    // Support --flag=value as well as --flag value.
    const eq = token.indexOf('=');
    if (token.startsWith('--') && eq > 2) {
      const name = token.slice(0, eq);
      const value = token.slice(eq + 1);
      if (FLAGS_WITH_VALUES.has(name)) {
        if (value.length === 0) {
          throw new ShotsArgError(`${name} needs a value.\n\n${USAGE}`);
        }
        raw[name] = value;
        continue;
      }
    }
    throw new ShotsArgError(`Unknown argument "${token}".\n\n${USAGE}`);
  }

  const help = booleans.has('--help');
  if (help) {
    return {
      label: '',
      devices: [],
      flowsGlob: DEFAULT_FLOWS_GLOB,
      sizes: null,
      levelId: null,
      outRoot: DEFAULT_OUT_ROOT,
      date: options.today,
      dryRun: false,
      buildIfMissing: false,
      keepBooted: false,
      help: true,
    };
  }

  const label = (raw['--label'] ?? '').trim();
  if (label.length === 0) {
    throw new ShotsArgError(`--label is required.\n\n${USAGE}`);
  }

  let devices: DeviceSpec[];
  try {
    devices = raw['--devices']
      ? parseDeviceList(raw['--devices'])
      : resolveDevices(DEFAULT_DEVICE_ALIASES);
  } catch (error) {
    throw new ShotsArgError(`${(error as Error).message}\n\n${USAGE}`);
  }

  let sizes: BoardSize[] | null = null;
  if (raw['--sizes'] !== undefined) {
    try {
      sizes = parseBoardSizeList(raw['--sizes']);
    } catch (error) {
      throw new ShotsArgError(`${(error as Error).message}\n\n${USAGE}`);
    }
  }

  const date = raw['--date'] ?? options.today;
  if (!DATE_PATTERN.test(date)) {
    throw new ShotsArgError(`--date must be YYYY-MM-DD, got "${date}".\n\n${USAGE}`);
  }

  const flowsGlob = (raw['--flows'] ?? DEFAULT_FLOWS_GLOB).trim();
  if (flowsGlob.length === 0) {
    throw new ShotsArgError(`--flows needs a value.\n\n${USAGE}`);
  }

  const outRoot = (raw['--out'] ?? DEFAULT_OUT_ROOT).trim();
  if (outRoot.length === 0) {
    throw new ShotsArgError(`--out needs a value.\n\n${USAGE}`);
  }

  return {
    label,
    devices,
    flowsGlob,
    sizes,
    levelId: raw['--level'] ? raw['--level'].trim() : null,
    outRoot,
    date,
    dryRun: booleans.has('--dry-run'),
    buildIfMissing: booleans.has('--build-if-missing'),
    keepBooted: booleans.has('--keep-booted'),
    help: false,
  };
}
