import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

import { parseShotsArgs, type ShotsArgs } from '../../../src/shots/args';
import {
  BOARD_SIZE_ENV,
  SHOT_DIR_ENV,
  SHOT_LEVEL_ENV,
  SHOT_PREFIX_ENV,
  basenameWithoutExtension,
  buildRunPlan,
  capturesDeviceLog,
  describeSkippedFlow,
  isBoardSizeSweepFlow,
  maestroCommand,
  overallExitCode,
  parseFlowPlatforms,
  requireSizesForBoardSweep,
  summarize,
  toFlowFile,
  type JobResult,
} from '../../../src/shots/plan';

const LOOP = toFlowFile('.maestro/flows/shots/gameplay-loop.yaml');
const SWEEP = toFlowFile('.maestro/flows/shots/board-size-sweep.yaml');
const ANIM = toFlowFile('.maestro/flows/shots/animation-host-safety.yaml');

function lines(...text: string[]): string {
  return text.join('\n');
}

const ANIM_IOS_ONLY = toFlowFile(
  '.maestro/flows/shots/animation-host-safety.yaml',
  lines('# REQ-A-1..A-3', '# platforms: ios', 'appId: com.tuckerbrady.theaxiom', '---', '- launchApp', ''),
);

const REPO_ROOT = resolve(__dirname, '..', '..', '..');

function args(argv: string[]): ShotsArgs {
  return parseShotsArgs(argv, { today: '2026-09-20' });
}

describe('basenameWithoutExtension', () => {
  it('strips directories and the extension', () => {
    expect(basenameWithoutExtension('.maestro/flows/shots/gameplay-loop.yaml')).toBe('gameplay-loop');
  });

  it('handles Windows separators, since the repo is edited on Windows', () => {
    expect(basenameWithoutExtension('.maestro\\flows\\shots\\gameplay-loop.yaml')).toBe('gameplay-loop');
  });

  it('leaves a dotfile alone', () => {
    expect(basenameWithoutExtension('.gitignore')).toBe('.gitignore');
  });
});

describe('flow classification', () => {
  it('routes the board-size flow to the sweep', () => {
    expect(isBoardSizeSweepFlow(SWEEP)).toBe(true);
    expect(isBoardSizeSweepFlow(LOOP)).toBe(false);
  });

  it('captures a device log only for the animation-host flow', () => {
    expect(capturesDeviceLog(ANIM)).toBe(true);
    expect(capturesDeviceLog(LOOP)).toBe(false);
    expect(capturesDeviceLog(SWEEP)).toBe(false);
  });
});

describe('requireSizesForBoardSweep', () => {
  it('passes when no sweep flow is selected', () => {
    expect(() => requireSizesForBoardSweep([LOOP], null)).not.toThrow();
  });

  it('passes when the sweep has sizes', () => {
    expect(() => requireSizesForBoardSweep([SWEEP], [{ columns: 8, rows: 7 }])).not.toThrow();
  });

  it('refuses to invent a default trio', () => {
    expect(() => requireSizesForBoardSweep([SWEEP], null)).toThrow(/no --sizes was given/);
    expect(() => requireSizesForBoardSweep([SWEEP], [])).toThrow(/design\s+decision, not a harness decision/);
  });
});

describe('buildRunPlan', () => {
  it('refuses a run with no flows', () => {
    expect(() => buildRunPlan(args(['--label', 'loop']), [])).toThrow(/No flows matched/);
  });

  it('lays the run out as <out>/<date>-<label>', () => {
    const plan = buildRunPlan(args(['--label', 'The Loop']), [LOOP]);
    expect(plan.runDirectory).toBe('__shots__/2026-09-20-the-loop');
    expect(plan.manifestPath).toBe('__shots__/2026-09-20-the-loop/manifest.json');
  });

  it('runs a non-sweep flow once per device', () => {
    const plan = buildRunPlan(args(['--label', 'loop']), [LOOP]);
    expect(plan.jobs).toHaveLength(3);
    expect(plan.jobs.map(j => j.device.alias)).toEqual(['se', '15', 'max']);
    expect(plan.jobs.every(j => j.boardSize === null)).toBe(true);
  });

  it('runs the sweep once per size per device — three sizes, three devices, nine jobs', () => {
    const plan = buildRunPlan(
      args(['--label', 'sweep', '--sizes', '8x7,9x8,10x9']),
      [SWEEP],
    );
    expect(plan.jobs).toHaveLength(9);
    expect(plan.jobs.filter(j => j.device.alias === 'se').map(j => j.boardSize)).toEqual([
      { columns: 8, rows: 7 },
      { columns: 9, rows: 8 },
      { columns: 10, rows: 9 },
    ]);
  });

  it('writes every device into its own directory under the run', () => {
    const plan = buildRunPlan(args(['--label', 'loop']), [LOOP]);
    expect(plan.jobs.map(j => j.shotDirectory)).toEqual([
      '__shots__/2026-09-20-loop/iphone-se-3rd-gen',
      '__shots__/2026-09-20-loop/iphone-15',
      '__shots__/2026-09-20-loop/iphone-15-pro-max',
    ]);
  });

  it('gives sweep jobs a size-prefixed shot name so three sizes do not collide', () => {
    const plan = buildRunPlan(
      args(['--label', 'sweep', '--devices', 'se', '--sizes', '8x7,10x9']),
      [SWEEP],
    );
    expect(plan.jobs[0].env[BOARD_SIZE_ENV]).toBe('8x7');
    expect(plan.jobs[0].env[SHOT_PREFIX_ENV]).toBe('8x7-');
    expect(plan.jobs[1].env[SHOT_PREFIX_ENV]).toBe('10x9-');
  });

  it('leaves the prefix empty and the size unset for a non-sweep flow', () => {
    const plan = buildRunPlan(args(['--label', 'loop', '--devices', 'se']), [LOOP]);
    expect(plan.jobs[0].env[SHOT_PREFIX_ENV]).toBe('');
    expect(plan.jobs[0].env[BOARD_SIZE_ENV]).toBeUndefined();
  });

  it('passes the shot directory and the level id through to the flow', () => {
    const plan = buildRunPlan(
      args(['--label', 'loop', '--devices', 'se', '--level', 'A1-3']),
      [LOOP],
    );
    expect(plan.jobs[0].env[SHOT_DIR_ENV]).toBe('__shots__/2026-09-20-loop/iphone-se-3rd-gen');
    expect(plan.jobs[0].env[SHOT_LEVEL_ENV]).toBe('A1-3');
  });

  it('omits the level env var when no level was given', () => {
    const plan = buildRunPlan(args(['--label', 'loop', '--devices', 'se']), [LOOP]);
    expect(plan.jobs[0].env[SHOT_LEVEL_ENV]).toBeUndefined();
  });

  it('captures a device log for the animation-host flow only', () => {
    const plan = buildRunPlan(args(['--label', 'anim', '--devices', 'se']), [ANIM, LOOP]);
    const anim = plan.jobs.find(j => j.flow.name === 'animation-host-safety');
    const loop = plan.jobs.find(j => j.flow.name === 'gameplay-loop');
    expect(anim?.logFile).toBe(
      '__shots__/2026-09-20-anim/iphone-se-3rd-gen/animation-host-safety.device.log',
    );
    expect(loop?.logFile).toBeNull();
  });

  it('propagates the sweep guard', () => {
    // `--sizes` defaults to the board-size standard since 2026-09-20, so the
    // guard is no longer reachable from the command line. It still has to
    // fire for a caller that supplies no sizes at all, which is what this
    // asserts — and `requireSizesForBoardSweep` is covered directly above.
    const noSizes = { ...args(['--label', 'sweep']), sizes: null };
    expect(() => buildRunPlan(noSizes, [SWEEP])).toThrow(/no --sizes was given/);
  });
});

describe('maestroCommand', () => {
  const plan = buildRunPlan(
    args(['--label', 'sweep', '--devices', 'se', '--sizes', '10x9', '--level', 'A1-3']),
    [SWEEP],
  );
  const { command, args: cmdArgs } = maestroCommand(plan.jobs[0], 'UDID-1');

  it('targets the booted simulator by udid', () => {
    expect(command).toBe('maestro');
    expect(cmdArgs.slice(0, 3)).toEqual(['--device', 'UDID-1', 'test']);
  });

  it('passes every env entry as a -e pair', () => {
    expect(cmdArgs).toContain('-e');
    expect(cmdArgs).toContain(`${BOARD_SIZE_ENV}=10x9`);
    expect(cmdArgs).toContain(`${SHOT_LEVEL_ENV}=A1-3`);
  });

  it('writes a junit report next to the shots and ends with the flow file', () => {
    expect(cmdArgs).toContain('--format');
    expect(cmdArgs).toContain('junit');
    expect(cmdArgs[cmdArgs.length - 1]).toBe('.maestro/flows/shots/board-size-sweep.yaml');
    expect(cmdArgs[cmdArgs.length - 2]).toBe(
      '__shots__/2026-09-20-sweep/iphone-se-3rd-gen/board-size-sweep.junit.xml',
    );
  });
});

describe('overallExitCode', () => {
  const plan = buildRunPlan(args(['--label', 'loop', '--devices', 'se']), [LOOP]);
  const job = plan.jobs[0];

  it('is zero when everything passed', () => {
    expect(overallExitCode([{ job, exitCode: 0 }])).toBe(0);
    expect(overallExitCode([])).toBe(0);
  });

  it('is non-zero if any flow failed', () => {
    const results: JobResult[] = [
      { job, exitCode: 0 },
      { job, exitCode: 1 },
    ];
    expect(overallExitCode(results)).toBe(1);
  });
});

describe('summarize', () => {
  const plan = buildRunPlan(
    args(['--label', 'sweep', '--devices', 'se', '--sizes', '10x9']),
    [SWEEP],
  );

  it('names the failures and counts them', () => {
    const text = summarize([{ job: plan.jobs[0], exitCode: 1 }]);
    expect(text).toContain('FAIL(1)');
    expect(text).toContain('board-size-sweep');
    expect(text).toContain('[10x9]');
    expect(text).toContain('1 of 1 flow runs failed.');
  });

  it('says so plainly when everything passed', () => {
    const text = summarize([{ job: plan.jobs[0], exitCode: 0 }]);
    expect(text).toContain('PASS');
    expect(text).toContain('All 1 flow runs passed.');
  });
});

describe('parseFlowPlatforms', () => {
  it('reads a platforms marker from the flow header', () => {
    expect(parseFlowPlatforms(lines('# platforms: ios', 'appId: x', '---'))).toEqual(['ios']);
  });

  it('accepts a list, in any case and spacing', () => {
    expect(parseFlowPlatforms(lines('#platforms:  iOS , android', '---'))).toEqual([
      'ios',
      'android',
    ]);
  });

  it('is null when the flow names no platforms, meaning it runs everywhere', () => {
    expect(parseFlowPlatforms(lines('# a comment', 'appId: x', '---', '- launchApp'))).toBeNull();
  });

  it('only reads the header, not a comment in the command list', () => {
    expect(parseFlowPlatforms(lines('appId: x', '---', '# platforms: ios', '- launchApp'))).toBeNull();
  });

  it('tolerates Windows line endings', () => {
    expect(parseFlowPlatforms('# platforms: ios\r\nappId: x\r\n---\r\n')).toEqual(['ios']);
  });

  it('refuses an unknown platform rather than silently running nowhere', () => {
    expect(() => parseFlowPlatforms(lines('# platforms: windows', '---'))).toThrow(/windows/);
  });
});

describe('platform filtering', () => {
  it('carries the platforms marker on the flow file', () => {
    expect(ANIM_IOS_ONLY.platforms).toEqual(['ios']);
    expect(LOOP.platforms).toBeNull();
  });

  it('skips an iOS-only flow on an android run and reports it', () => {
    const plan = buildRunPlan(
      args(['--label', 'loop', '--platform', 'android', '--devices', 'compact']),
      [ANIM_IOS_ONLY, LOOP],
    );
    expect(plan.jobs.map(j => j.flow.name)).toEqual(['gameplay-loop']);
    expect(plan.skippedFlows).toEqual([ANIM_IOS_ONLY]);
  });

  it('keeps an iOS-only flow on an ios run', () => {
    const plan = buildRunPlan(args(['--label', 'anim', '--devices', 'se']), [ANIM_IOS_ONLY, LOOP]);
    expect(plan.jobs.map(j => j.flow.name)).toEqual(['animation-host-safety', 'gameplay-loop']);
    expect(plan.skippedFlows).toEqual([]);
  });

  it('refuses a run where every flow was filtered out', () => {
    expect(() =>
      buildRunPlan(
        args(['--label', 'anim', '--platform', 'android', '--devices', 'compact']),
        [ANIM_IOS_ONLY],
      ),
    ).toThrow(/No flows left to run on android/);
  });

  it('says clearly which flow was skipped and why', () => {
    const line = describeSkippedFlow(ANIM_IOS_ONLY, 'android');
    expect(line).toContain('.maestro/flows/shots/animation-host-safety.yaml');
    expect(line).toContain('android');
    expect(line).toContain('platforms: ios');
  });
});

describe('the shipped flows', () => {
  const flowDirs = ['.maestro/flows/shots', '.maestro/flows/damaged-cells'];
  const flowPaths = flowDirs.flatMap(dir =>
    readdirSync(resolve(REPO_ROOT, dir))
      .filter(name => name.endsWith('.yaml'))
      .map(name => `${dir}/${name}`),
  );

  it('marks the animation-host flow iOS-only, so an android run skips it', () => {
    const path = '.maestro/flows/shots/animation-host-safety.yaml';
    const flow = toFlowFile(path, readFileSync(resolve(REPO_ROOT, path), 'utf8'));
    expect(flow.platforms).toEqual(['ios']);
  });

  it.each(flowPaths)('%s targets the real application id', path => {
    const contents = readFileSync(resolve(REPO_ROOT, path), 'utf8');
    expect(contents).toMatch(/^appId: com\.tuckerbrady\.theaxiom\r?$/m);
  });
});
