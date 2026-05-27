export interface TenderCalendarDay {
  iso: string;
  day: number;
  inCurrentMonth: boolean;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTenderDateLabel(isoDate: string, emptyLabel = 'DD/MM/YYYY'): string {
  const parts = ISO_DATE_PATTERN.exec(isoDate);
  if (!parts) return emptyLabel;

  const [, year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export function parseIsoDate(isoDate: string): Date | null {
  const parts = ISO_DATE_PATTERN.exec(isoDate);
  if (!parts) return null;

  const [, year, month, day] = parts;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function isIsoDateBefore(value: string, minimum: string): boolean {
  if (!value || !minimum) return false;
  return value < minimum;
}

export function addCalendarMonths(date: Date, monthsToAdd: number): Date {
  const requestedDay = date.getDate();
  const targetMonthStart = new Date(date.getFullYear(), date.getMonth() + monthsToAdd, 1);
  const targetMonthLastDay = new Date(
    targetMonthStart.getFullYear(),
    targetMonthStart.getMonth() + 1,
    0
  ).getDate();

  targetMonthStart.setDate(Math.min(requestedDay, targetMonthLastDay));
  return targetMonthStart;
}

export function getTenderCalendarGrid(visibleMonth: Date): TenderCalendarDay[] {
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const firstVisibleDay = new Date(monthStart);
  firstVisibleDay.setDate(monthStart.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDay);
    date.setDate(firstVisibleDay.getDate() + index);

    return {
      iso: toIsoDate(date),
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === visibleMonth.getMonth(),
    };
  });
}
