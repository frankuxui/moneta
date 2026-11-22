import { describe, it, expect } from 'vitest';
import { parseMoney, formatMoney, balance, equivalents, sumMoney } from './money.js';
import { nextOccurrence, periodRange, todayMadrid, previousRange } from './calendar.js';
import { movementPatch, subscriptionPatch, categoryPatch } from './contracts.js';
describe('dinero exacto', () => {
  it.each([
    ['23,65', '2365'],
    ['9.99', '999'],
    ['120,50', '12050'],
    ['1.250,75', '125075'],
    ['0,01', '1'],
  ])('%s', (v, c) => expect(parseMoney(v)).toBe(c));
  it.each(['1.250', '1,234', '1e3', '-1', '0', 'NaN', '1,2.3', '€ 10', '1 000', '9999999999999'])(
    'rechaza %s',
    (v) => expect(() => parseMoney(v)).toThrow(),
  );
  it('suma y resta sin pérdida', () => {
    expect(sumMoney(['10', '20'])).toBe('30');
    expect(balance('100', '2365')).toBe('-2265');
    expect(formatMoney('900719925474099301')).toContain('9.007.199.254.740.993,01');
  });
  it('equivalencias redondeadas al céntimo', () => {
    expect(equivalents('999', 'annual')).toEqual({ annualCents: '999', monthlyCents: '83' });
    expect(equivalents('2365', 'monthly').annualCents).toBe('28380');
    expect(equivalents('100', 'weekly').monthlyCents).toBe('433');
  });
});
describe('calendario', () => {
  it.each([
    ['quarterly', '2026-04-30'],
    ['semiannual', '2026-07-31'],
    ['annual', '2027-01-31'],
  ] as const)('renueva %s por meses de calendario', (frequency, expected) =>
    expect(nextOccurrence('2026-01-31', frequency, 31)).toBe(expected),
  );
  it('mantiene el ancla 31 a través de febrero', () => {
    expect(nextOccurrence('2024-01-31', 'monthly', 31)).toBe('2024-02-29');
    expect(nextOccurrence('2024-02-29', 'monthly', 31)).toBe('2024-03-31');
    expect(nextOccurrence('2025-01-31', 'monthly', 31)).toBe('2025-02-28');
  });
  it.each([29, 30, 31])('limita el día %i', (day) =>
    expect(nextOccurrence(`2025-01-${day}`, 'monthly', day)).toBe('2025-02-28'),
  );
  it('año bisiesto, cambio de año y semana', () => {
    expect(nextOccurrence('2024-02-29', 'annual', 29)).toBe('2025-02-28');
    expect(nextOccurrence('2025-12-31', 'weekly', 31)).toBe('2026-01-07');
    expect(periodRange('week', '2026-03-01')).toEqual({ from: '2026-02-23', to: '2026-03-01' });
    expect(periodRange('year', '2026-01-01').to).toBe('2026-12-31');
  });
  it('límites Madrid y comparación sin solapamiento', () => {
    expect(todayMadrid(new Date('2026-03-31T22:30:00Z'))).toBe('2026-04-01');
    expect(previousRange('2026-03-01', '2026-03-31')).toEqual({
      from: '2026-01-29',
      to: '2026-02-28',
    });
  });
});
describe('contratos parciales', () => {
  it('no aplica valores predeterminados a campos omitidos', () => {
    expect(movementPatch.parse({ amountCents: '123' })).toEqual({ amountCents: '123' });
    expect(subscriptionPatch.parse({ status: 'paused' })).toEqual({ status: 'paused' });
    expect(categoryPatch.parse({ name: 'Nueva' })).toEqual({ name: 'Nueva' });
  });
});
