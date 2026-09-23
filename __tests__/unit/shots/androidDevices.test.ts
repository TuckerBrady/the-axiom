import {
  ANDROID_DEVICE_MATRIX,
  DEFAULT_ANDROID_DEVICE_ALIASES,
  assertDistinctWidths,
  dpWidth,
  findAndroidDevice,
  knownAndroidDeviceAliases,
  parseAndroidDeviceList,
  resolveAndroidDevices,
  type AndroidDeviceSpec,
} from '../../../src/shots/androidDevices';

describe('ANDROID_DEVICE_MATRIX', () => {
  it('covers three devices', () => {
    expect(ANDROID_DEVICE_MATRIX).toHaveLength(3);
    expect(knownAndroidDeviceAliases()).toEqual(['compact', 'standard', 'large']);
  });

  it('is three genuinely different dp widths', () => {
    // The whole point of the matrix. Pixel 7 and Pixel 7 Pro are physically
    // different phones that both report 411 dp, and a matrix built from
    // those two would shoot the same layout twice.
    expect(ANDROID_DEVICE_MATRIX.map(d => d.points.width)).toEqual([360, 411, 448]);
    expect(() => assertDistinctWidths()).not.toThrow();
  });

  it('names Android in every slug, so a shot cannot be mistaken for iOS', () => {
    for (const device of ANDROID_DEVICE_MATRIX) {
      expect(device.slug).toMatch(/^android-/);
      expect(device.platform).toBe('android');
    }
  });

  it('records the dp width its own panel actually produces', () => {
    for (const device of ANDROID_DEVICE_MATRIX) {
      expect(dpWidth(device.screen.pixelWidth, device.screen.densityDpi)).toBe(
        device.points.width,
      );
    }
  });

  it('defaults to the whole matrix', () => {
    expect(DEFAULT_ANDROID_DEVICE_ALIASES).toEqual(['compact', 'standard', 'large']);
  });
});

describe('dpWidth', () => {
  it('applies Android\'s own px / (dpi / 160)', () => {
    expect(dpWidth(1080, 420)).toBe(411);
    expect(dpWidth(720, 320)).toBe(360);
    expect(dpWidth(1344, 480)).toBe(448);
  });

  it('shows why Pixel 7 and Pixel 7 Pro collide', () => {
    expect(dpWidth(1080, 420)).toBe(dpWidth(1440, 560));
  });

  it('refuses a non-positive density rather than dividing by zero', () => {
    expect(() => dpWidth(1080, 0)).toThrow(/densityDpi must be positive/);
  });
});

describe('assertDistinctWidths', () => {
  it('rejects two entries at the same dp width, naming both', () => {
    const collide = [
      { ...ANDROID_DEVICE_MATRIX[1], alias: 'standard' },
      { ...ANDROID_DEVICE_MATRIX[1], alias: 'large' },
    ] as AndroidDeviceSpec[];
    expect(() => assertDistinctWidths(collide)).toThrow(/411 dp/);
    expect(() => assertDistinctWidths(collide)).toThrow(/standard.*large/s);
  });

  it('accepts an empty matrix', () => {
    expect(() => assertDistinctWidths([])).not.toThrow();
  });
});

describe('findAndroidDevice', () => {
  it('is case and whitespace insensitive', () => {
    expect(findAndroidDevice(' LARGE ')?.target).toBe('axiom_large');
  });

  it('returns null for an unknown alias', () => {
    expect(findAndroidDevice('se')).toBeNull();
  });
});

describe('resolveAndroidDevices', () => {
  it('keeps matrix order, not argument order, so runs diff cleanly', () => {
    expect(resolveAndroidDevices(['large', 'compact']).map(d => d.alias)).toEqual([
      'compact',
      'large',
    ]);
  });

  it('collapses duplicates', () => {
    expect(resolveAndroidDevices(['compact', 'compact']).map(d => d.alias)).toEqual([
      'compact',
    ]);
  });

  it('refuses an empty list', () => {
    expect(() => resolveAndroidDevices([])).toThrow(/--devices was empty/);
  });

  it('names the known aliases when given a bad one', () => {
    expect(() => resolveAndroidDevices(['max'])).toThrow(/Unknown Android device "max"/);
    expect(() => resolveAndroidDevices(['max'])).toThrow(/compact, standard, large/);
  });
});

describe('parseAndroidDeviceList', () => {
  it('splits, trims and ignores empty entries', () => {
    expect(parseAndroidDeviceList(' compact , ,large ').map(d => d.alias)).toEqual([
      'compact',
      'large',
    ]);
  });
});
