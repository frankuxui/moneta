import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import type { Frequency } from './money.js';

export const isoDate = (date: Date) => format(date, 'yyyy-MM-dd');
export function todayMadrid(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function nextOccurrence(date: string, frequency: Frequency, anchorDay: number): string {
  const current = parseISO(date);
  if (frequency === 'weekly') return isoDate(addDays(current, 7));
  const months = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 }[frequency];
  const target = addMonths(startOfMonth(current), months);
  target.setDate(Math.min(anchorDay, endOfMonth(target).getDate()));
  return isoDate(target);
}
export function periodRange(period: 'week' | 'month' | 'year', today = todayMadrid()) {
  const date = parseISO(today);
  if (period === 'week')
    return {
      from: isoDate(startOfWeek(date, { weekStartsOn: 1 })),
      to: isoDate(endOfWeek(date, { weekStartsOn: 1 })),
    };
  if (period === 'year') return { from: isoDate(startOfYear(date)), to: isoDate(endOfYear(date)) };
  return { from: isoDate(startOfMonth(date)), to: isoDate(endOfMonth(date)) };
}
export function previousRange(from: string, to: string) {
  const duration = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
  return {
    from: isoDate(addDays(parseISO(from), -duration)),
    to: isoDate(addDays(parseISO(from), -1)),
  };
}
export function daysInRange(from: string, to: string) {
  return differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
}
