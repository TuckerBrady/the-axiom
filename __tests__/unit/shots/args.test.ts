import {
  DEFAULT_FLOWS_GLOB,
  DEFAULT_OUT_ROOT,
  ShotsArgError,
  parseShotsArgs,
} from '../../../src/shots/args';

const TODAY = { today: '2026-09-20' };

function parse(argv: string[]) {
  return parseShotsArgs(argv, TODAY);
}

describe('parseShotsArgs', () => {
  it('requires a label', () => {
    expect(() => parse([])).toThrow(ShotsArgError);
    expect(() => parse([])).toThrow(/--label is required/);
    expect(() => parse(['--label', '   '])).toThrow(/--label is required/);
  });

  it('defaults devices to the whole matrix, flows to the shots directory', () => {
    const args = parse(['--label', 'loop']);
    expect(args.devices.map(d => d.alias)).toEqual(['se', '15', 'max']);
    expect(args.flowsGlob).toBe(DEFAULT_FLOWS_GLOB);
    expect(args.outRoot).toBe(DEFAULT_OUT_ROOT);
    expect(args.date).toBe('2026-09-20');
    // Tucker set the board-size standard on 2026-09-20, which closed the
    // decision PROMPT_159 deferred. Before that date the harness refused to
    // default `--sizes` at all; now the default IS the decision.
    expect(args.sizes).toEqual([
      { columns: 8, rows: 6 },
      { columns: 10, rows: 7 },
      { columns: 10, rows: 9 },
    ]);
    expect(args.levelId).toBeNull();
    expect(args.dryRun).toBe(false);
    expect(args.buildIfMissing).toBe(false);
    expect(args.keepBooted).toBe(false);
  });

  it('parses every flag in its long form', () => {
    const args = parse([
      '--label', 'board size sweep',
      '--devices', 'se,max',
      '--flows', '.maestro/flows/shots/board-size-sweep.yaml',
      '--sizes', '8x7,10x9',
      '--level', 'A1-3',
      '--out', 'tmp-shots',
      '--date', '2026-01-02',
      '--dry-run',
      '--build-if-missing',
      '--keep-booted',
    ]);
    expect(args.label).toBe('board size sweep');
    expect(args.devices.map(d => d.alias)).toEqual(['se', 'max']);
    expect(args.flowsGlob).toBe('.maestro/flows/shots/board-size-sweep.yaml');
    expect(args.sizes).toEqual([{ columns: 8, rows: 7 }, { columns: 10, rows: 9 }]);
    expect(args.levelId).toBe('A1-3');
    expect(args.outRoot).toBe('tmp-shots');
    expect(args.date).toBe('2026-01-02');
    expect(args.dryRun).toBe(true);
    expect(args.buildIfMissing).toBe(true);
    expect(args.keepBooted).toBe(true);
  });

  it('accepts --flag=value', () => {
    const args = parse(['--label=loop', '--devices=15']);
    expect(args.label).toBe('loop');
    expect(args.devices.map(d => d.alias)).toEqual(['15']);
  });

  it('rejects an unknown argument instead of ignoring it', () => {
    // `--platform` used to be the example of an unknown flag here. It is a
    // real flag now, so the check moved to one that is still unknown.
    expect(() => parse(['--label', 'loop', '--simulator', 'web'])).toThrow(
      /Unknown argument "--simulator"/,
    );
    expect(() => parse(['--label', 'loop', 'stray'])).toThrow(/Unknown argument "stray"/);
  });

  it('rejects a flag whose value is missing or is another flag', () => {
    expect(() => parse(['--label'])).toThrow(/--label needs a value/);
    expect(() => parse(['--label', '--dry-run'])).toThrow(/--label needs a value/);
    expect(() => parse(['--label=', 'x'])).toThrow(/--label needs a value/);
  });

  it('rejects an unknown device through the arg layer', () => {
    expect(() => parse(['--label', 'loop', '--devices', 'pixel'])).toThrow(ShotsArgError);
    expect(() => parse(['--label', 'loop', '--devices', 'pixel'])).toThrow(/Unknown device/);
  });

  it('rejects a board size outside the ten-column cap', () => {
    expect(() => parse(['--label', 'loop', '--sizes', '12x9'])).toThrow(ShotsArgError);
    expect(() => parse(['--label', 'loop', '--sizes', '12x9'])).toThrow(/not a valid board size/);
  });

  it('rejects a malformed date', () => {
    expect(() => parse(['--label', 'loop', '--date', '20-09-2026'])).toThrow(/--date must be YYYY-MM-DD/);
  });

  it('rejects an empty --flows or --out', () => {
    expect(() => parse(['--label', 'loop', '--flows', '   '])).toThrow(/--flows needs a value/);
    expect(() => parse(['--label', 'loop', '--out', '   '])).toThrow(/--out needs a value/);
  });

  it('short-circuits on --help without demanding a label', () => {
    expect(parse(['--help']).help).toBe(true);
    expect(parse(['-h']).help).toBe(true);
  });

  it('puts the usage text in every error, so the fix is on screen', () => {
    try {
      parse([]);
      throw new Error('expected a throw');
    } catch (error) {
      expect((error as Error).message).toContain('Usage: npm run shots');
    }
  });
});

describe('--platform', () => {
  it('defaults to ios, so an existing command line means what it always meant', () => {
    const args = parse(['--label', 'loop']);
    expect(args.platform).toBe('ios');
    expect(args.devices.map(d => d.alias)).toEqual(['se', '15', 'max']);
  });

  it('switches --devices to the Android matrix', () => {
    const args = parse(['--label', 'loop', '--platform', 'android']);
    expect(args.platform).toBe('android');
    expect(args.devices.map(d => d.alias)).toEqual(['compact', 'standard', 'large']);
    expect(args.devices.map(d => d.points.width)).toEqual([360, 411, 448]);
  });

  it('resolves an explicit Android device list', () => {
    const args = parse([
      '--label', 'loop',
      '--platform', 'android',
      '--devices', 'large,compact',
    ]);
    expect(args.devices.map(d => d.slug)).toEqual([
      'android-compact-360dp',
      'android-large-448dp',
    ]);
  });

  it('rejects an iOS alias under --platform android', () => {
    expect(() =>
      parse(['--label', 'loop', '--platform', 'android', '--devices', 'se']),
    ).toThrow(/Unknown Android device "se"/);
  });

  it('rejects an unknown platform by name', () => {
    expect(() => parse(['--label', 'loop', '--platform', 'web'])).toThrow(
      ShotsArgError,
    );
    expect(() => parse(['--label', 'loop', '--platform', 'web'])).toThrow(
      /--platform must be ios or android, got "web"/,
    );
  });

  it('is case insensitive', () => {
    expect(parse(['--label', 'l', '--platform', 'ANDROID']).platform).toBe('android');
  });

  it('still lets --sizes override the standard', () => {
    const args = parse(['--label', 'l', '--platform', 'android', '--sizes', '9x8']);
    expect(args.sizes).toEqual([{ columns: 9, rows: 8 }]);
  });
});
