import {
  DEFAULT_DEVICE_ALIASES,
  DEVICE_MATRIX,
  findDevice,
  knownDeviceAliases,
  parseDeviceList,
  resolveDevices,
} from '../../../src/shots/devices';

describe('DEVICE_MATRIX', () => {
  it('is the three widths PROMPT_159 fixes the sweep to', () => {
    expect(DEVICE_MATRIX.map(d => d.simulatorName)).toEqual([
      'iPhone SE (3rd generation)',
      'iPhone 15',
      'iPhone 15 Pro Max',
    ]);
  });

  it('has unique aliases and unique directory slugs', () => {
    expect(new Set(DEVICE_MATRIX.map(d => d.alias)).size).toBe(DEVICE_MATRIX.length);
    expect(new Set(DEVICE_MATRIX.map(d => d.slug)).size).toBe(DEVICE_MATRIX.length);
  });

  it('orders narrowest to widest, so a sweep reads left to right', () => {
    const widths = DEVICE_MATRIX.map(d => d.points.width);
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
  });

  it('defaults to the full matrix', () => {
    expect([...DEFAULT_DEVICE_ALIASES]).toEqual(knownDeviceAliases());
  });
});

describe('findDevice', () => {
  it('is case- and whitespace-insensitive', () => {
    expect(findDevice(' MAX ')?.simulatorName).toBe('iPhone 15 Pro Max');
  });

  it('returns null for an unknown alias', () => {
    expect(findDevice('pixel')).toBeNull();
  });
});

describe('resolveDevices', () => {
  it('resolves aliases to specs', () => {
    expect(resolveDevices(['se', 'max']).map(d => d.alias)).toEqual(['se', 'max']);
  });

  it('collapses duplicates', () => {
    expect(resolveDevices(['se', 'se']).map(d => d.alias)).toEqual(['se']);
  });

  it('returns matrix order regardless of argument order, so runs diff cleanly', () => {
    expect(resolveDevices(['max', 'se', '15']).map(d => d.alias)).toEqual(['se', '15', 'max']);
  });

  it('throws on an unknown device and names the ones it knows', () => {
    expect(() => resolveDevices(['ipad'])).toThrow(/Unknown device "ipad"/);
    expect(() => resolveDevices(['ipad'])).toThrow(/se, 15, max/);
  });

  it('throws on an empty list', () => {
    expect(() => resolveDevices([])).toThrow(/--devices was empty/);
  });
});

describe('parseDeviceList', () => {
  it('parses a comma-separated value with stray whitespace', () => {
    expect(parseDeviceList(' se , 15 ').map(d => d.alias)).toEqual(['se', '15']);
  });

  it('throws when nothing usable is left', () => {
    expect(() => parseDeviceList(' , ')).toThrow(/--devices was empty/);
  });
});
