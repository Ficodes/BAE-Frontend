import {
  addCalendarMonths,
  formatTenderDateLabel,
  getTenderCalendarGrid,
  isIsoDateBefore,
  toIsoDate,
} from './tender-date-field.model';

describe('tender date field model', () => {
  it('formats ISO dates as dd/mm/yyyy labels', () => {
    expect(formatTenderDateLabel('2026-05-21')).toBe('21/05/2026');
    expect(formatTenderDateLabel('', 'Select date')).toBe('Select date');
  });

  it('builds a Monday-first 42-day calendar grid around the visible month', () => {
    const grid = getTenderCalendarGrid(new Date(2026, 4, 1));

    expect(grid.length).toBe(42);
    expect(grid[0]).toEqual({
      iso: '2026-04-27',
      day: 27,
      inCurrentMonth: false,
    });
    expect(grid[4]).toEqual({
      iso: '2026-05-01',
      day: 1,
      inCurrentMonth: true,
    });
  });

  it('compares ISO dates and keeps month changes stable', () => {
    expect(isIsoDateBefore('2026-05-20', '2026-05-21')).toBeTrue();
    expect(isIsoDateBefore('2026-05-21', '2026-05-21')).toBeFalse();
    expect(toIsoDate(addCalendarMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
  });
});
