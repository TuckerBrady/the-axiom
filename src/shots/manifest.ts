/**
 * Run layout and manifest writer for `npm run shots`.
 *
 * Layout (PROMPT_159):
 *   __shots__/<YYYY-MM-DD>-<label>/<device>/<step>.png
 *   __shots__/<YYYY-MM-DD>-<label>/manifest.json
 *
 * The manifest exists so two runs can be compared without anybody
 * remembering what they were looking at. Every shot carries step, device,
 * board size, level id, app version, git sha and the flow that produced it.
 */

import { formatBoardSize, type BoardSize } from '../utils/boardSizeOverride';
import type { DeviceSpec } from './devices';

/** Bumped whenever the manifest shape changes incompatibly. */
export const MANIFEST_SCHEMA_VERSION = 1;

export const MANIFEST_FILENAME = 'manifest.json';

export interface ManifestShot {
  /** Flow-declared step name, e.g. `mission-dossier`. */
  step: string;
  /** Human device label. */
  device: string;
  deviceAlias: string;
  /** `"10x9"`, or null when the flow did not override the board. */
  boardSize: string | null;
  /** Level the shot was taken in, or null when the step is off-board. */
  levelId: string | null;
  appVersion: string;
  gitSha: string;
  /** Flow file that produced the shot, repo-relative. */
  flow: string;
  /** Path relative to the run directory. */
  file: string;
}

export interface Manifest {
  schemaVersion: number;
  label: string;
  runDirectory: string;
  startedAt: string;
  finishedAt: string;
  appVersion: string;
  gitSha: string;
  devices: { alias: string; label: string; simulatorName: string; width: number; height: number }[];
  flows: string[];
  boardSizes: string[] | null;
  shots: ManifestShot[];
}

/**
 * Reduce a label to a directory-safe slug.
 *
 * Runs are named by a human on the command line; a space or a slash in the
 * label must not produce a nested or unquotable path.
 */
export function slugifyLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length === 0) {
    throw new Error(`Label "${label}" contains no usable characters.`);
  }
  return slug;
}

/** `2026-09-20-board-size-sweep` */
export function runDirectoryName(date: string, label: string): string {
  return `${date}-${slugifyLabel(label)}`;
}

/** Path of one shot relative to the run directory. */
export function shotRelativePath(deviceSlug: string, step: string): string {
  return `${deviceSlug}/${slugifyLabel(step)}.png`;
}

/**
 * The step name a flow must pass to `takeScreenshot`.
 *
 * Board-size sweep steps carry their size so three sizes of the same step do
 * not collide in one device directory.
 */
export function stepName(step: string, boardSize: BoardSize | null): string {
  return boardSize ? `${step}-${formatBoardSize(boardSize)}` : step;
}

export interface BuildManifestInput {
  label: string;
  runDirectory: string;
  startedAt: string;
  finishedAt: string;
  appVersion: string;
  gitSha: string;
  devices: readonly DeviceSpec[];
  flows: readonly string[];
  boardSizes: readonly BoardSize[] | null;
  shots: readonly ManifestShot[];
}

export function buildManifest(input: BuildManifestInput): Manifest {
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    label: input.label,
    runDirectory: input.runDirectory,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    appVersion: input.appVersion,
    gitSha: input.gitSha,
    devices: input.devices.map(d => ({
      alias: d.alias,
      label: d.label,
      simulatorName: d.simulatorName,
      width: d.points.width,
      height: d.points.height,
    })),
    flows: [...input.flows],
    boardSizes: input.boardSizes ? input.boardSizes.map(formatBoardSize) : null,
    shots: [...input.shots],
  };
}

/** Stable, diffable JSON. Two runs of the same sweep diff line by line. */
export function serializeManifest(manifest: Manifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * The slice of `fs` the writer needs. Injected so the writer is unit-tested
 * without touching a disk.
 */
export interface ManifestFileSystem {
  mkdirSync(path: string, options: { recursive: true }): void;
  writeFileSync(path: string, data: string, encoding: 'utf8'): void;
}

/**
 * Write `manifest.json` into the run directory. Returns the path written.
 */
export function writeManifest(
  fs: ManifestFileSystem,
  runDirectoryPath: string,
  manifest: Manifest,
): string {
  fs.mkdirSync(runDirectoryPath, { recursive: true });
  const target = `${runDirectoryPath}/${MANIFEST_FILENAME}`;
  fs.writeFileSync(target, serializeManifest(manifest), 'utf8');
  return target;
}
