import {
  BOARD_COLUMN_CHOICES,
  BOARD_ROW_CHOICES,
  DEFAULT_OVERRIDE_COLUMNS,
  DEFAULT_OVERRIDE_ROWS,
  MAX_BOARD_COLUMNS,
  MAX_BOARD_ROWS,
  MIN_BOARD_COLUMNS,
  MIN_BOARD_ROWS,
  formatBoardSize,
  isBoardSizeInRange,
  parseBoardSize,
  parseBoardSizeList,
  resolveBoardSize,
} from '../../../src/utils/boardSizeOverride';

describe('parseBoardSize', () => {
  it('parses a well-formed size', () => {
    expect(parseBoardSize('10x9')).toEqual({ columns: 10, rows: 9 });
  });

  it('tolerates whitespace and an uppercase X', () => {
    expect(parseBoardSize('  8 X 7 ')).toEqual({ columns: 8, rows: 7 });
  });

  it('refuses a board wider than the ten-column cap', () => {
    expect(parseBoardSize('11x9')).toBeNull();
  });

  it('refuses a board below the minimum', () => {
    expect(parseBoardSize('2x7')).toBeNull();
    expect(parseBoardSize('8x2')).toBeNull();
  });

  it('refuses malformed input', () => {
    expect(parseBoardSize('')).toBeNull();
    expect(parseBoardSize('eight-by-seven')).toBeNull();
    expect(parseBoardSize('8')).toBeNull();
    expect(parseBoardSize('8x')).toBeNull();
    expect(parseBoardSize('8x7x6')).toBeNull();
  });

  it('refuses a non-string', () => {
    expect(parseBoardSize(null)).toBeNull();
    expect(parseBoardSize(undefined)).toBeNull();
    expect(parseBoardSize(87 as unknown as string)).toBeNull();
  });
});

describe('isBoardSizeInRange', () => {
  it('accepts the boundaries', () => {
    expect(isBoardSizeInRange(MIN_BOARD_COLUMNS, MIN_BOARD_ROWS)).toBe(true);
    expect(isBoardSizeInRange(MAX_BOARD_COLUMNS, MAX_BOARD_ROWS)).toBe(true);
  });

  it('rejects non-integers', () => {
    expect(isBoardSizeInRange(8.5, 7)).toBe(false);
    expect(isBoardSizeInRange(8, Number.NaN)).toBe(false);
  });
});

describe('formatBoardSize', () => {
  it('round-trips with the parser', () => {
    const size = { columns: 9, rows: 8 };
    expect(parseBoardSize(formatBoardSize(size))).toEqual(size);
  });
});

describe('resolveBoardSize', () => {
  const levelSize = { columns: 8, rows: 7 };

  it('ignores the override when dev tools are off — production is unaffected', () => {
    expect(resolveBoardSize(levelSize, '10x9', false)).toEqual(levelSize);
  });

  it('applies the override when dev tools are on', () => {
    expect(resolveBoardSize(levelSize, '10x9', true)).toEqual({ columns: 10, rows: 9 });
  });

  it('falls back to the level size when there is no override', () => {
    expect(resolveBoardSize(levelSize, null, true)).toEqual(levelSize);
    expect(resolveBoardSize(levelSize, undefined, true)).toEqual(levelSize);
  });

  it('falls back to the level size when the override is corrupt', () => {
    expect(resolveBoardSize(levelSize, '99x99', true)).toEqual(levelSize);
    expect(resolveBoardSize(levelSize, 'garbage', true)).toEqual(levelSize);
  });
});

describe('parseBoardSizeList', () => {
  it('parses a three-size sweep', () => {
    expect(parseBoardSizeList('8x7,9x8,10x9')).toEqual([
      { columns: 8, rows: 7 },
      { columns: 9, rows: 8 },
      { columns: 10, rows: 9 },
    ]);
  });

  it('collapses duplicates while keeping order', () => {
    expect(parseBoardSizeList('9x8, 8x7 ,9x8')).toEqual([
      { columns: 9, rows: 8 },
      { columns: 8, rows: 7 },
    ]);
  });

  it('throws on an empty list rather than sweeping nothing', () => {
    expect(() => parseBoardSizeList('')).toThrow(/--sizes was empty/);
    expect(() => parseBoardSizeList(' , , ')).toThrow(/--sizes was empty/);
  });

  it('throws on a bad entry rather than silently shooting fewer sizes', () => {
    expect(() => parseBoardSizeList('8x7,11x9')).toThrow(/"11x9" is not a valid board size/);
  });
});

describe('chip choices', () => {
  it('offers the whole legal column range, not a chosen trio', () => {
    expect(BOARD_COLUMN_CHOICES[0]).toBe(MIN_BOARD_COLUMNS);
    expect(BOARD_COLUMN_CHOICES[BOARD_COLUMN_CHOICES.length - 1]).toBe(MAX_BOARD_COLUMNS);
    expect(BOARD_COLUMN_CHOICES).toHaveLength(MAX_BOARD_COLUMNS - MIN_BOARD_COLUMNS + 1);
  });

  it('offers the whole legal row range', () => {
    expect(BOARD_ROW_CHOICES[0]).toBe(MIN_BOARD_ROWS);
    expect(BOARD_ROW_CHOICES[BOARD_ROW_CHOICES.length - 1]).toBe(MAX_BOARD_ROWS);
  });

  it('has an in-range fallback for the axis not yet picked', () => {
    expect(isBoardSizeInRange(DEFAULT_OVERRIDE_COLUMNS, DEFAULT_OVERRIDE_ROWS)).toBe(true);
  });
});
