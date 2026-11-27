import { describe, expect, it } from 'vitest';
import { summarizeWealth, wealthInput, wealthPatch, type WealthInput } from './wealth.js';
const entry: WealthInput = {
  name: 'Aportación',
  destination: 'Mi monedero',
  direction: 'deposit',
  amountCents: '2365',
  date: '2026-02-28',
  notes: '',
};
describe('contabilidad de ahorros e inversión', () => {
  it('suma céntimos, agrupa destinos y separa meses y años sin aproximarlos', () => {
    const summary = summarizeWealth(
      [
        entry,
        {
          ...entry,
          destination: 'mi monedero',
          direction: 'withdrawal',
          amountCents: '1',
          date: '2026-02-28',
        },
        { ...entry, date: '2026-03-01', amountCents: '100' },
        { ...entry, destination: 'Otro', date: '2025-02-28', amountCents: '99' },
        { ...entry, date: '2024-02-29', amountCents: '2' },
      ],
      '2026-02-28',
    );
    expect(summary.balanceCents).toBe('2565');
    expect(summary.monthDepositsCents).toBe('2365');
    expect(summary.monthWithdrawalsCents).toBe('1');
    expect(summary.destinations).toEqual([
      { destination: 'Mi monedero', balanceCents: '2466' },
      { destination: 'Otro', balanceCents: '99' },
    ]);
  });
  it('conserva totales superiores al entero seguro de JavaScript', () => {
    expect(
      summarizeWealth(
        Array.from({ length: 10000 }, () => ({ ...entry, amountCents: '999999999999' })),
      ).balanceCents,
    ).toBe('9999999999990000');
  });
  it('rechaza dinero inválido, fechas futuras, cuentas vacías y campos desconocidos', () => {
    for (const patch of [
      { amountCents: '0' },
      { amountCents: '-1' },
      { amountCents: '12.34' },
      { amountCents: '1000000000000' },
      { destination: ' ' },
      { date: '2199-12-31' },
      { date: '2026-02-29' },
      { unexpected: true },
    ]) {
      expect(wealthInput.safeParse({ ...entry, ...patch }).success).toBe(false);
    }
    expect(wealthPatch.parse({ name: 'Corrección' })).toEqual({ name: 'Corrección' });
  });
});
