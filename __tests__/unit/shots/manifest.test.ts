import { DEVICE_MATRIX } from '../../../src/shots/devices';
import {
  MANIFEST_FILENAME,
  MANIFEST_SCHEMA_VERSION,
  buildManifest,
  runDirectoryName,
  serializeManifest,
  shotRelativePath,
  slugifyLabel,
  stepName,
  writeManifest,
  type ManifestFileSystem,
  type ManifestShot,
} from '../../../src/shots/manifest';

const SHOT: ManifestShot = {
  step: 'board-empty',
  platform: 'ios',
  device: 'iPhone SE (3rd gen)',
  deviceAlias: 'se',
  boardSize: '10x9',
  levelId: 'A1-3',
  appVersion: '0.9.265',
  gitSha: 'abc1234',
  flow: '.maestro/flows/shots/board-size-sweep.yaml',
  file: 'iphone-se-3rd-gen/10x9-board-empty.png',
};

describe('slugifyLabel', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyLabel('Board Size Sweep')).toBe('board-size-sweep');
  });

  it('strips path separators so a label cannot nest the run directory', () => {
    expect(slugifyLabel('a/b\\c')).toBe('a-b-c');
  });

  it('trims leading and trailing separators', () => {
    expect(slugifyLabel('  --loop--  ')).toBe('loop');
  });

  it('throws rather than producing an empty directory name', () => {
    expect(() => slugifyLabel('///')).toThrow(/no usable characters/);
  });
});

describe('runDirectoryName', () => {
  it('is <date>-<label>, as the spec lays it out', () => {
    expect(runDirectoryName('2026-09-20', 'Board Size Sweep')).toBe(
      '2026-09-20-board-size-sweep',
    );
  });
});

describe('shotRelativePath', () => {
  it('is <device>/<step>.png under the run directory', () => {
    expect(shotRelativePath('iphone-15', 'Signal Mid Beam')).toBe(
      'iphone-15/signal-mid-beam.png',
    );
  });
});

describe('stepName', () => {
  it('leaves a non-sweep step alone', () => {
    expect(stepName('board-empty', null)).toBe('board-empty');
  });

  it('carries the size so three sizes do not collide in one directory', () => {
    expect(stepName('board-empty', { columns: 10, rows: 9 })).toBe('board-empty-10x9');
  });
});

describe('buildManifest', () => {
  const manifest = buildManifest({
    label: 'board-size-sweep',
    platform: 'ios',
    runDirectory: '__shots__/2026-09-20-board-size-sweep',
    startedAt: '2026-09-20T10:00:00.000Z',
    finishedAt: '2026-09-20T10:12:00.000Z',
    appVersion: '0.9.265',
    gitSha: 'abc1234',
    devices: DEVICE_MATRIX,
    flows: ['.maestro/flows/shots/board-size-sweep.yaml'],
    boardSizes: [{ columns: 8, rows: 7 }, { columns: 10, rows: 9 }],
    shots: [SHOT],
  });

  it('stamps the schema version', () => {
    expect(manifest.schemaVersion).toBe(MANIFEST_SCHEMA_VERSION);
  });

  it('carries every field the spec asks for, per shot', () => {
    const shot = manifest.shots[0];
    expect(shot.step).toBe('board-empty');
    expect(shot.device).toBe('iPhone SE (3rd gen)');
    expect(shot.boardSize).toBe('10x9');
    expect(shot.levelId).toBe('A1-3');
    expect(shot.appVersion).toBe('0.9.265');
    expect(shot.gitSha).toBe('abc1234');
    expect(shot.flow).toBe('.maestro/flows/shots/board-size-sweep.yaml');
  });

  it('records device widths so a shot can be read without knowing the matrix', () => {
    // Schema v2: every device entry names its platform, and the iOS-only
    // `simulatorName` became the platform-neutral `target`.
    expect(manifest.devices).toEqual([
      { alias: 'se', platform: 'ios', label: 'iPhone SE (3rd gen)', target: 'iPhone SE (3rd generation)', width: 375, height: 667 },
      { alias: '15', platform: 'ios', label: 'iPhone 15', target: 'iPhone 15', width: 393, height: 852 },
      { alias: 'max', platform: 'ios', label: 'iPhone 15 Pro Max', target: 'iPhone 15 Pro Max', width: 430, height: 932 },
    ]);
  });

  it('formats board sizes as strings', () => {
    expect(manifest.boardSizes).toEqual(['8x7', '10x9']);
  });

  it('records null board sizes when the run was not a sweep', () => {
    const plain = buildManifest({
      label: 'loop',
      platform: 'ios',
      runDirectory: '__shots__/2026-09-20-loop',
      startedAt: 'a',
      finishedAt: 'b',
      appVersion: '0.9.265',
      gitSha: 'abc1234',
      devices: [],
      flows: [],
      boardSizes: null,
      shots: [],
    });
    expect(plain.boardSizes).toBeNull();
  });

  it('copies its input arrays, so a later mutation cannot rewrite the manifest', () => {
    const shots: ManifestShot[] = [SHOT];
    const built = buildManifest({
      label: 'loop',
      platform: 'ios',
      runDirectory: 'x',
      startedAt: 'a',
      finishedAt: 'b',
      appVersion: '1',
      gitSha: 'g',
      devices: [],
      flows: [],
      boardSizes: null,
      shots,
    });
    shots.push({ ...SHOT, step: 'late-arrival' });
    expect(built.shots).toHaveLength(1);
  });
});

describe('serializeManifest', () => {
  it('is indented and newline-terminated, so two runs diff line by line', () => {
    const json = serializeManifest(
      buildManifest({
        label: 'loop',
        platform: 'ios',
        runDirectory: 'x',
        startedAt: 'a',
        finishedAt: 'b',
        appVersion: '1',
        gitSha: 'g',
        devices: [],
        flows: [],
        boardSizes: null,
        shots: [],
      }),
    );
    expect(json.endsWith('\n')).toBe(true);
    expect(json).toContain('\n  "label": "loop"');
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe('writeManifest', () => {
  function fakeFs() {
    const mkdirs: string[] = [];
    const writes: { path: string; data: string }[] = [];
    const fs: ManifestFileSystem = {
      mkdirSync: (path, options) => {
        expect(options.recursive).toBe(true);
        mkdirs.push(path);
      },
      writeFileSync: (path, data, encoding) => {
        expect(encoding).toBe('utf8');
        writes.push({ path, data });
      },
    };
    return { fs, mkdirs, writes };
  }

  const manifest = buildManifest({
    label: 'loop',
    platform: 'ios',
    runDirectory: '__shots__/2026-09-20-loop',
    startedAt: 'a',
    finishedAt: 'b',
    appVersion: '0.9.265',
    gitSha: 'abc1234',
    devices: [],
    flows: [],
    boardSizes: null,
    shots: [SHOT],
  });

  it('creates the run directory before writing', () => {
    const { fs, mkdirs } = fakeFs();
    writeManifest(fs, '/repo/__shots__/2026-09-20-loop', manifest);
    expect(mkdirs).toEqual(['/repo/__shots__/2026-09-20-loop']);
  });

  it('writes manifest.json into the run directory and returns its path', () => {
    const { fs, writes } = fakeFs();
    const target = writeManifest(fs, '/repo/__shots__/2026-09-20-loop', manifest);
    expect(target).toBe(`/repo/__shots__/2026-09-20-loop/${MANIFEST_FILENAME}`);
    expect(writes).toHaveLength(1);
    expect(writes[0].path).toBe(target);
    expect(JSON.parse(writes[0].data).shots[0].step).toBe('board-empty');
  });
});
