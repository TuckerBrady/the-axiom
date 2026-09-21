/**
 * Device matrix for the `npm run shots` harness.
 *
 * PROMPT_159 fixes the sweep to three device widths: iPhone SE (3rd gen),
 * iPhone 15 and iPhone 15 Pro Max. The simulator names below must match
 * `xcrun simctl list devices` exactly — the runner boots by name.
 *
 * Point sizes are recorded so the manifest can say what width a shot was
 * taken at without anybody having to remember which device is which.
 */

export type DeviceAlias = 'se' | '15' | 'max';

export interface DeviceSpec {
  /** Short alias accepted by `--devices`. */
  alias: DeviceAlias;
  /** Always `ios` — this matrix is the iOS half of the harness. */
  platform: 'ios';
  /**
   * Platform-neutral name of the thing the runner boots. On iOS this is the
   * simulator name; `androidDevices.ts` uses the same field for the AVD
   * name, so `plan.ts` and `manifest.ts` can stay platform-agnostic.
   */
  target: string;
  /** Exact `xcrun simctl` device name. Same string as `target`. */
  simulatorName: string;
  /** Directory segment under the run folder. */
  slug: string;
  /** Human label for the manifest and the report. */
  label: string;
  /** Logical (point) screen size — the width board sizing actually sees. */
  points: { width: number; height: number };
}

export const DEVICE_MATRIX: readonly DeviceSpec[] = Object.freeze([
  Object.freeze({
    alias: 'se' as const,
    platform: 'ios' as const,
    target: 'iPhone SE (3rd generation)',
    simulatorName: 'iPhone SE (3rd generation)',
    slug: 'iphone-se-3rd-gen',
    label: 'iPhone SE (3rd gen)',
    points: Object.freeze({ width: 375, height: 667 }),
  }),
  Object.freeze({
    alias: '15' as const,
    platform: 'ios' as const,
    target: 'iPhone 15',
    simulatorName: 'iPhone 15',
    slug: 'iphone-15',
    label: 'iPhone 15',
    points: Object.freeze({ width: 393, height: 852 }),
  }),
  Object.freeze({
    alias: 'max' as const,
    platform: 'ios' as const,
    target: 'iPhone 15 Pro Max',
    simulatorName: 'iPhone 15 Pro Max',
    slug: 'iphone-15-pro-max',
    label: 'iPhone 15 Pro Max',
    points: Object.freeze({ width: 430, height: 932 }),
  }),
]);

export const DEFAULT_DEVICE_ALIASES: readonly DeviceAlias[] = Object.freeze([
  'se',
  '15',
  'max',
]);

/** Every alias the matrix knows, in matrix order — used in error messages. */
export function knownDeviceAliases(): DeviceAlias[] {
  return DEVICE_MATRIX.map(d => d.alias);
}

export function findDevice(alias: string): DeviceSpec | null {
  const normalized = alias.trim().toLowerCase();
  return DEVICE_MATRIX.find(d => d.alias === normalized) ?? null;
}

/**
 * Resolve a list of aliases to specs.
 *
 * Duplicates collapse, and the result keeps DEVICE_MATRIX order rather than
 * argument order so two runs of the same sweep always write their device
 * directories in the same sequence and diff cleanly.
 */
export function resolveDevices(aliases: readonly string[]): DeviceSpec[] {
  if (aliases.length === 0) {
    throw new Error(
      `--devices was empty; expected one or more of ${knownDeviceAliases().join(', ')}`,
    );
  }
  const wanted = new Set<DeviceAlias>();
  for (const alias of aliases) {
    const device = findDevice(alias);
    if (!device) {
      throw new Error(
        `Unknown device "${alias}". Known devices: ${knownDeviceAliases().join(', ')}.`,
      );
    }
    wanted.add(device.alias);
  }
  return DEVICE_MATRIX.filter(d => wanted.has(d.alias));
}

/** Parse the comma-separated `--devices` value. */
export function parseDeviceList(raw: string): DeviceSpec[] {
  const aliases = raw
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0);
  return resolveDevices(aliases);
}

/**
 * Either platform's device spec.
 *
 * `plan.ts` and `manifest.ts` only ever touch the fields both matrices
 * share — `alias`, `platform`, `target`, `slug`, `label`, `points` — so they
 * do not branch on platform at all. Only `cli.ts` does, where it has to
 * choose between `simctl.ts` and `adb.ts`.
 */
export type ShotPlatform = 'ios' | 'android';

export interface CommonDeviceSpec {
  alias: string;
  platform: ShotPlatform;
  target: string;
  slug: string;
  label: string;
  points: { width: number; height: number };
}
