/**
 * Board-size override — shared by the app (dev-only Settings toggle) and by
 * the `npm run shots` harness (`--sizes` argument).
 *
 * PROMPT_159 task 3: the board-size sweep must be able to change the board
 * without a source edit, so one run can shoot the same level at every
 * candidate size. The override is dev-only: `resolveBoardSize` ignores it
 * unless the caller passes `devToolsEnabled` (SHOW_DEV_TOOLS, true in
 * __DEV__ and in `testflight` builds, never in `production`).
 *
 * Deliberately free of React and of Node so both consumers can import it.
 */

/**
 * The board-size standard caps the board at ten columns. Anything wider
 * makes cells unreadable on an iPhone SE, so the parser refuses it rather
 * than letting a typo produce a board nobody can play.
 */
export const MAX_BOARD_COLUMNS = 10;
export const MIN_BOARD_COLUMNS = 3;
export const MAX_BOARD_ROWS = 12;
export const MIN_BOARD_ROWS = 3;

export interface BoardSize {
  columns: number;
  rows: number;
}

/**
 * Every legal column / row count, for the dev chip rows.
 *
 * The control offers the whole legal range on purpose. Which three sizes
 * become the board-size standard is a design decision; a chip row of three
 * chosen sizes would bake that decision into a settings screen.
 */
export const BOARD_COLUMN_CHOICES: readonly number[] = Object.freeze(
  Array.from(
    { length: MAX_BOARD_COLUMNS - MIN_BOARD_COLUMNS + 1 },
    (_, i) => MIN_BOARD_COLUMNS + i,
  ),
);

export const BOARD_ROW_CHOICES: readonly number[] = Object.freeze(
  Array.from(
    { length: MAX_BOARD_ROWS - MIN_BOARD_ROWS + 1 },
    (_, i) => MIN_BOARD_ROWS + i,
  ),
);

/**
 * The shipped fallback board, used only to fill the axis the dev has not
 * picked yet (pick 10 columns first and rows start from here). This is the
 * existing GameplayScreen fallback, not a proposed standard.
 */
export const DEFAULT_OVERRIDE_COLUMNS = 8;
export const DEFAULT_OVERRIDE_ROWS = 7;

/**
 * The board-size standard — S, M and L.
 *
 * Set by Tucker on 2026-09-20, closing the decision that
 * `project-docs/REPORTS/PROMPT_159_DECISION_BOARD_SIZES.md` raised and left
 * OPEN. PROMPT_159 described the standard as "three sizes, never wider than
 * ten columns" but never named them, so the harness refused to default them
 * rather than invent a standard. These are the named three:
 *
 *   S  8 x 6
 *   M  10 x 7
 *   L  10 x 9
 *
 * This is the harness default for `--sizes`, and it is still overridable —
 * a future candidate set is a command-line argument, not a code change.
 */
export const BOARD_SIZE_STANDARD: readonly BoardSize[] = Object.freeze([
  Object.freeze({ columns: 8, rows: 6 }),
  Object.freeze({ columns: 10, rows: 7 }),
  Object.freeze({ columns: 10, rows: 9 }),
]);

/** Short names for the three standard sizes, for reports and filenames. */
export const BOARD_SIZE_STANDARD_NAMES: Readonly<Record<string, 'S' | 'M' | 'L'>> =
  Object.freeze({ '8x6': 'S', '10x7': 'M', '10x9': 'L' });

const BOARD_SIZE_PATTERN = /^\s*(\d{1,2})\s*[xX]\s*(\d{1,2})\s*$/;

/**
 * Parse a `<columns>x<rows>` string such as `"10x9"`.
 *
 * Returns null for anything that is not a well-formed, in-range size. Null
 * means "no override" everywhere it is consumed, so a bad value degrades to
 * the level's own size rather than crashing a run.
 */
export function parseBoardSize(raw: string | null | undefined): BoardSize | null {
  if (typeof raw !== 'string') return null;
  const match = BOARD_SIZE_PATTERN.exec(raw);
  if (!match) return null;
  const columns = Number(match[1]);
  const rows = Number(match[2]);
  if (!isBoardSizeInRange(columns, rows)) return null;
  return { columns, rows };
}

/** True when both dimensions sit inside the documented board-size bounds. */
export function isBoardSizeInRange(columns: number, rows: number): boolean {
  if (!Number.isInteger(columns) || !Number.isInteger(rows)) return false;
  if (columns < MIN_BOARD_COLUMNS || columns > MAX_BOARD_COLUMNS) return false;
  if (rows < MIN_BOARD_ROWS || rows > MAX_BOARD_ROWS) return false;
  return true;
}

/** Canonical `"<columns>x<rows>"` rendering — the inverse of parseBoardSize. */
export function formatBoardSize(size: BoardSize): string {
  return `${size.columns}x${size.rows}`;
}

/**
 * The size the board should actually render at.
 *
 * `levelSize` is whatever the level definition asks for. The override only
 * wins when dev tools are enabled AND it parses. Production builds pass
 * `devToolsEnabled: false` and always get the level's own size, which is why
 * this is invisible outside `testflight`.
 */
export function resolveBoardSize(
  levelSize: BoardSize,
  override: string | null | undefined,
  devToolsEnabled: boolean,
): BoardSize {
  if (!devToolsEnabled) return levelSize;
  const parsed = parseBoardSize(override);
  return parsed ?? levelSize;
}

/**
 * Parse a comma-separated sweep list (`"8x7,9x8,10x9"`).
 *
 * Throws on a malformed entry: the harness would otherwise silently shoot
 * fewer sizes than asked for, and a sweep with a missing size is worse than
 * a sweep that refused to start.
 */
export function parseBoardSizeList(raw: string): BoardSize[] {
  const entries = raw
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0);
  if (entries.length === 0) {
    throw new Error('--sizes was empty; expected something like 8x7,9x8,10x9');
  }
  const sizes: BoardSize[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const parsed = parseBoardSize(entry);
    if (!parsed) {
      throw new Error(
        `--sizes entry "${entry}" is not a valid board size. ` +
          `Expected <columns>x<rows> with ${MIN_BOARD_COLUMNS}-${MAX_BOARD_COLUMNS} ` +
          `columns and ${MIN_BOARD_ROWS}-${MAX_BOARD_ROWS} rows.`,
      );
    }
    const key = formatBoardSize(parsed);
    if (seen.has(key)) continue;
    seen.add(key);
    sizes.push(parsed);
  }
  return sizes;
}
