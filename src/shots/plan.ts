/**
 * Run planning for `npm run shots`.
 *
 * Everything that decides *what* the run will do lives here, as pure
 * functions over plain data: which flow runs on which device at which board
 * size, where its screenshots and its device log land, and what command line
 * Maestro is given. `cli.ts` only executes the plan.
 *
 * Splitting it this way means the interesting half of the harness is
 * unit-testable on any machine, including one with no simulator.
 */

import { formatBoardSize, type BoardSize } from '../utils/boardSizeOverride';
import type { DeviceSpec } from './devices';
import { runDirectoryName } from './manifest';
import type { ShotsArgs } from './args';

/**
 * A flow whose basename contains this marker is run once per `--sizes`
 * entry. Every other flow runs once, with no board-size override.
 */
export const BOARD_SIZE_FLOW_MARKER = 'board-size';

/**
 * A flow whose basename contains this marker has its device log captured
 * alongside its screenshots — REQ-A-1..A-3 is a log assertion as much as an
 * image one.
 */
export const LOG_CAPTURE_FLOW_MARKER = 'animation-host';

/** Env var the flows read for the board-size override. */
export const BOARD_SIZE_ENV = 'BOARD_SIZE';

/** Env var the flows read for the step-name prefix. */
export const SHOT_PREFIX_ENV = 'SHOT_PREFIX';

/**
 * Env var holding the directory `takeScreenshot` writes into. `cli.ts`
 * rewrites it to an absolute path before invoking Maestro, because
 * `takeScreenshot` resolves relative paths against Maestro's own cwd.
 */
export const SHOT_DIR_ENV = 'SHOT_DIR';

/** Env var carrying the level id the flows should drive. */
export const SHOT_LEVEL_ENV = 'SHOT_LEVEL';

export interface FlowFile {
  /** Repo-relative path, e.g. `.maestro/flows/shots/gameplay-loop.yaml`. */
  path: string;
  /** Basename without extension, e.g. `gameplay-loop`. */
  name: string;
}

export interface ShotJob {
  device: DeviceSpec;
  flow: FlowFile;
  /** null when this flow does not sweep board sizes. */
  boardSize: BoardSize | null;
  /** Directory screenshots land in, relative to the repo root. */
  shotDirectory: string;
  /** Device log path, or null when this flow does not capture one. */
  logFile: string | null;
  /** `-e KEY=VALUE` pairs handed to Maestro. */
  env: Record<string, string>;
}

export interface RunPlan {
  runDirectory: string;
  manifestPath: string;
  jobs: ShotJob[];
}

export function basenameWithoutExtension(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const base = normalized.slice(normalized.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}

export function toFlowFile(filePath: string): FlowFile {
  return { path: filePath.replace(/\\/g, '/'), name: basenameWithoutExtension(filePath) };
}

export function isBoardSizeSweepFlow(flow: FlowFile): boolean {
  return flow.name.toLowerCase().includes(BOARD_SIZE_FLOW_MARKER);
}

export function capturesDeviceLog(flow: FlowFile): boolean {
  return flow.name.toLowerCase().includes(LOG_CAPTURE_FLOW_MARKER);
}

/**
 * Refuse a run whose flow set includes the board-size sweep but which was
 * given no `--sizes`.
 *
 * The three candidate sizes are a design decision PROMPT_159 does not
 * settle, so the harness will not pick one. Erroring out with this message
 * is the honest behaviour; a silent default would ship an invented standard.
 */
export function requireSizesForBoardSweep(
  flows: readonly FlowFile[],
  sizes: readonly BoardSize[] | null,
): void {
  const sweep = flows.filter(isBoardSizeSweepFlow);
  if (sweep.length === 0) return;
  if (sizes && sizes.length > 0) return;
  throw new Error(
    `The flow set includes a board-size sweep (${sweep
      .map(f => f.path)
      .join(', ')}) but no --sizes was given. ` +
      'Pass the three candidate sizes explicitly, e.g. --sizes 8x7,9x8,10x9. ' +
      'The harness does not default them: the board-size standard is a design ' +
      'decision, not a harness decision.',
  );
}

export function buildRunPlan(args: ShotsArgs, flows: readonly FlowFile[]): RunPlan {
  if (flows.length === 0) {
    throw new Error(
      `No flows matched "${args.flowsGlob}". Nothing to run.`,
    );
  }
  requireSizesForBoardSweep(flows, args.sizes);

  const runDirName = runDirectoryName(args.date, args.label);
  const runDirectory = `${args.outRoot}/${runDirName}`;
  const jobs: ShotJob[] = [];

  for (const device of args.devices) {
    for (const flow of flows) {
      const sizes: (BoardSize | null)[] = isBoardSizeSweepFlow(flow)
        ? [...(args.sizes ?? [])]
        : [null];
      for (const boardSize of sizes) {
        const shotDirectory = `${runDirectory}/${device.slug}`;
        const env: Record<string, string> = { [SHOT_DIR_ENV]: shotDirectory };
        if (args.levelId) env[SHOT_LEVEL_ENV] = args.levelId;
        if (boardSize) {
          env[BOARD_SIZE_ENV] = formatBoardSize(boardSize);
          env[SHOT_PREFIX_ENV] = `${formatBoardSize(boardSize)}-`;
        } else {
          env[SHOT_PREFIX_ENV] = '';
        }
        jobs.push({
          device,
          flow,
          boardSize,
          shotDirectory,
          logFile: capturesDeviceLog(flow)
            ? `${shotDirectory}/${flow.name}.device.log`
            : null,
          env,
        });
      }
    }
  }

  return {
    runDirectory,
    manifestPath: `${runDirectory}/manifest.json`,
    jobs,
  };
}

/**
 * The Maestro invocation for a job.
 *
 * `--format junit` gives the runner a machine-readable result per flow, and
 * `--output` puts that report inside the run directory so a failure is
 * reviewable next to the shots it did manage to take.
 */
export function maestroCommand(
  job: ShotJob,
  udid: string,
): { command: string; args: string[] } {
  const args = ['--device', udid, 'test'];
  for (const [key, value] of Object.entries(job.env)) {
    args.push('-e', `${key}=${value}`);
  }
  args.push(
    '--format',
    'junit',
    '--output',
    `${job.shotDirectory}/${job.flow.name}.junit.xml`,
    job.flow.path,
  );
  return { command: 'maestro', args };
}

export interface JobResult {
  job: ShotJob;
  exitCode: number;
}

/**
 * Non-zero if any flow failed. PROMPT_159 task 1: the run exits non-zero if
 * any flow fails, so CI and a human both see the same verdict.
 */
export function overallExitCode(results: readonly JobResult[]): number {
  return results.some(r => r.exitCode !== 0) ? 1 : 0;
}

/** Human summary of a finished run. */
export function summarize(results: readonly JobResult[]): string {
  const failed = results.filter(r => r.exitCode !== 0);
  const lines = results.map(r => {
    const size = r.job.boardSize ? formatBoardSize(r.job.boardSize) : '-';
    const status = r.exitCode === 0 ? 'PASS' : `FAIL(${r.exitCode})`;
    return `  ${status}  ${r.job.device.alias.padEnd(4)} ${r.job.flow.name} [${size}]`;
  });
  lines.push(
    failed.length === 0
      ? `All ${results.length} flow runs passed.`
      : `${failed.length} of ${results.length} flow runs failed.`,
  );
  return lines.join('\n');
}
