export const MAX_CENTS = 999_999_999_999n;

/** Decimal input is parsed as text, never through floating point arithmetic. */
export function parseMoney(input: string): string {
  let value = input.trim();
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(value)) value = value.replaceAll('.', '');
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(value)) {
    throw new Error('Introduce un importe positivo con un máximo de dos decimales.');
  }
  const [whole = '0', fraction = ''] = value.replace(',', '.').split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents <= 0n || cents > MAX_CENTS)
    throw new Error('El importe está fuera del rango permitido.');
  return cents.toString();
}

export function formatMoney(value: string | bigint): string {
  const amount = BigInt(value);
  const absolute = amount < 0n ? -amount : amount;
  const integer = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).formatToParts(absolute / 100n);
  const result = integer
    .map((part) =>
      part.type === 'fraction' ? (absolute % 100n).toString().padStart(2, '0') : part.value,
    )
    .join('');
  return `${amount < 0n ? '−' : ''}${result}`;
}

export function moneyInput(value: string): string {
  const cents = BigInt(value);
  return `${cents / 100n},${(cents % 100n).toString().padStart(2, '0')}`;
}
export const sumMoney = (values: readonly string[]) =>
  values.reduce((sum, v) => sum + BigInt(v), 0n).toString();
export const balance = (income: string, expenses: string) =>
  (BigInt(income) - BigInt(expenses)).toString();
export const roundedDivide = (amount: bigint, divisor: bigint) => (amount + divisor / 2n) / divisor;
export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
export function equivalents(amount: string, frequency: Frequency) {
  const annual =
    BigInt(amount) *
    { weekly: 52n, monthly: 12n, quarterly: 4n, semiannual: 2n, annual: 1n }[frequency];
  return { annualCents: annual.toString(), monthlyCents: roundedDivide(annual, 12n).toString() };
}
