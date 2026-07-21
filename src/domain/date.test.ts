import { describe, expect, it } from 'vitest';
import { addDays, formatDateKey, getMonthGrid, getSevenDayWindow, isDateKey, parseDateKey } from './date';

describe('local date helpers', () => {
  it('round trips a local date without UTC conversion', () => {
    const key = formatDateKey(new Date(2026, 6, 20));
    expect(key).toBe('2026-07-20');
    expect(parseDateKey(key).getDate()).toBe(20);
    expect(isDateKey('2026-02-29')).toBe(false);
  });

  it('builds a seven-day window centered on the selected date', () => {
    expect(getSevenDayWindow('2026-07-20')).toEqual([
      '2026-07-17', '2026-07-18', '2026-07-19', '2026-07-20',
      '2026-07-21', '2026-07-22', '2026-07-23',
    ]);
  });

  it('builds a Monday-first six-week month grid', () => {
    const grid = getMonthGrid('2026-07-20');
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-06-29');
    expect(grid[41]).toBe('2026-08-09');
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
  });
});
