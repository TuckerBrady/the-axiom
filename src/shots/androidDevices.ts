/**
 * Android device matrix for the `npm run shots` harness.
 *
 * AXM-011 scope change (2026-09-20): the Android emulator carries the
 * board-size decision, the driven gameplay loop, damaged cells and
 * legibility. The iOS matrix in `devices.ts` stays in the runner, unrun,
 * for the day a Mac exists.
 *
 * ## Why these three devices
 *
 * The three entries below were chosen by *measured density-independent
 * width* — the number a React Native layout actually sees — not by marketing
 * name or diagonal inches. That distinction bit once already and is the
 * reason this file exists:
 *
 *   The obvious matrix is Pixel 7 / Pixel 7 Pro for "standard" and "large".
 *   Booted and measured with `adb shell wm size` + `wm density`, both report
 *   **411 dp** wide (1080x2400 @ 420dpi and 1440x3120 @ 560dpi). They are
 *   physically different phones and layout-identical. A sweep across those
 *   two would have produced six images that differ only in pixel count and
 *   proved nothing about board sizing.
 *
 * So the large entry is configured to the reported geometry of a Pixel 9 Pro
 * XL — 1344x2992 at 480dpi, which is 448 dp — and the compact entry is the
 * 360 dp baseline that most budget and compact Android phones report.
 *
 *   compact   360 dp   the Android baseline width; the floor a board must fit
 *   standard  411 dp   Pixel 6/7/8-class, the single most common width
 *   large     448 dp   Pixel 9 Pro XL-class, the practical ceiling for a phone
 *
 * For comparison the iOS matrix spans 375 / 393 / 430 dp, so the Android
 * spread is a little wider at both ends and brackets it.
 *
 * Every `points` value below was read off a booted emulator, not from a
 * spec sheet. See `project-docs/REPORTS/PROMPT_159_REPORT.md`.
 */

export type AndroidDeviceAlias = 'compact' | 'standard' | 'large';

export interface AndroidDeviceSpec {
  alias: AndroidDeviceAlias;
  platform: 'android';
  /** AVD name — `emulator -avd <target>`. */
  target: string;
  /** Directory segment under the run folder. Says "android" on purpose. */
  slug: string;
  /** Human label for the manifest and the report. */
  label: string;
  /** Logical (dp) screen size — the width board sizing actually sees. */
  points: { width: number; height: number };
  /** Physical panel, as configured in the AVD and confirmed over adb. */
  screen: { pixelWidth: number; pixelHeight: number; densityDpi: number };
}

export const ANDROID_DEVICE_MATRIX: readonly AndroidDeviceSpec[] = Object.freeze([
  Object.freeze({
    alias: 'compact' as const,
    platform: 'android' as const,
    target: 'axiom_compact',
    slug: 'android-compact-360dp',
    label: 'Android compact phone (360 dp)',
    points: Object.freeze({ width: 360, height: 640 }),
    screen: Object.freeze({ pixelWidth: 720, pixelHeight: 1280, densityDpi: 320 }),
  }),
  Object.freeze({
    alias: 'standard' as const,
    platform: 'android' as const,
    target: 'axiom_standard',
    slug: 'android-standard-411dp',
    label: 'Android standard phone (411 dp)',
    points: Object.freeze({ width: 411, height: 914 }),
    screen: Object.freeze({ pixelWidth: 1080, pixelHeight: 2400, densityDpi: 420 }),
  }),
  Object.freeze({
    alias: 'large' as const,
    platform: 'android' as const,
    target: 'axiom_large',
    slug: 'android-large-448dp',
    label: 'Android large phone (448 dp)',
    points: Object.freeze({ width: 448, height: 997 }),
    screen: Object.freeze({ pixelWidth: 1344, pixelHeight: 2992, densityDpi: 480 }),
  }),
]);

export const DEFAULT_ANDROID_DEVICE_ALIASES: readonly AndroidDeviceAlias[] =
  Object.freeze(['compact', 'standard', 'large']);

/** Every alias the matrix knows, in matrix order — used in error messages. */
export function knownAndroidDeviceAliases(): AndroidDeviceAlias[] {
  return ANDROID_DEVICE_MATRIX.map(d => d.alias);
}

export function findAndroidDevice(alias: string): AndroidDeviceSpec | null {
  const normalized = alias.trim().toLowerCase();
  return ANDROID_DEVICE_MATRIX.find(d => d.alias === normalized) ?? null;
}

/**
 * dp width from a physical panel — the calculation the matrix comment above
 * is arguing from, exposed so it is testable rather than asserted in prose.
 *
 * Android's own formula: dp = px / (dpi / 160).
 */
export function dpWidth(pixelWidth: number, densityDpi: number): number {
  if (densityDpi <= 0) {
    throw new Error(`densityDpi must be positive, got ${densityDpi}`);
  }
  return Math.round(pixelWidth / (densityDpi / 160));
}

/**
 * Guard the property the matrix exists to have: three genuinely different
 * widths. Pixel 7 and Pixel 7 Pro are both 411 dp, and a matrix that let two
 * entries collide would quietly shoot the same layout twice.
 */
export function assertDistinctWidths(
  devices: readonly AndroidDeviceSpec[] = ANDROID_DEVICE_MATRIX,
): void {
  const seen = new Map<number, string>();
  for (const device of devices) {
    const existing = seen.get(device.points.width);
    if (existing !== undefined) {
      throw new Error(
        `Android device matrix has two entries at ${device.points.width} dp ` +
          `("${existing}" and "${device.alias}"). The matrix exists to cover ` +
          'three distinct widths; two entries at the same dp width shoot the ' +
          'same layout twice and prove nothing.',
      );
    }
    seen.set(device.points.width, device.alias);
  }
}

/**
 * Resolve a list of aliases to specs.
 *
 * Duplicates collapse, and the result keeps matrix order rather than argument
 * order so two runs of the same sweep write their device directories in the
 * same sequence and diff cleanly.
 */
export function resolveAndroidDevices(
  aliases: readonly string[],
): AndroidDeviceSpec[] {
  if (aliases.length === 0) {
    throw new Error(
      `--devices was empty; expected one or more of ${knownAndroidDeviceAliases().join(', ')}`,
    );
  }
  const wanted = new Set<AndroidDeviceAlias>();
  for (const alias of aliases) {
    const device = findAndroidDevice(alias);
    if (!device) {
      throw new Error(
        `Unknown Android device "${alias}". Known devices: ${knownAndroidDeviceAliases().join(', ')}.`,
      );
    }
    wanted.add(device.alias);
  }
  return ANDROID_DEVICE_MATRIX.filter(d => wanted.has(d.alias));
}

/** Parse the comma-separated `--devices` value for `--platform android`. */
export function parseAndroidDeviceList(raw: string): AndroidDeviceSpec[] {
  const aliases = raw
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0);
  return resolveAndroidDevices(aliases);
}
