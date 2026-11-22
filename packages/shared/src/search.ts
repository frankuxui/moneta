import { formatMoney, moneyInput } from './money.js';

// Also used by PostgreSQL to give client and server searches the same semantics.
export const GROUPED_NUMBER_PATTERN = '([0-9])\\.(?=[0-9]{3}([^0-9]|$))';
export const DECIMAL_DOT_PATTERN = '([0-9])\\.(?=[0-9]{1,2}([^0-9]|$))';
export const SPANISH_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
export const SPANISH_SHORT_MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sept',
  'oct',
  'nov',
  'dic',
];

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replaceAll('−', '-')
    .replace(new RegExp(GROUPED_NUMBER_PATTERN, 'g'), '$1')
    .replace(new RegExp(DECIMAL_DOT_PATTERN, 'g'), '$1,')
    .replace(/\s+/g, ' ')
    .trim();
}
export const searchTokens = (query: string) => normalizeSearch(query).split(' ').filter(Boolean);
export function matchesSearch(text: string, query: string): boolean {
  const normalized = normalizeSearch(text);
  return searchTokens(query).every((token) => normalized.includes(token));
}
export function moneySearchText(cents: string): string {
  return `${formatMoney(cents)} ${moneyInput(cents)} EUR`;
}
export function dateSearchText(date: string): string {
  const [year, month, day] = date.split('-');
  const index = Number(month) - 1;
  return `${date} ${day}/${month}/${year} ${Number(day)}/${Number(month)}/${year} ${Number(day)} ${SPANISH_SHORT_MONTHS[index]} ${year} ${Number(day)} ${SPANISH_MONTHS[index]} ${year}`;
}
