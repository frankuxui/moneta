import { z } from 'zod';
import { centsSchema, createPatchSchema, dateSchema } from './contracts.js';
import { todayMadrid } from './calendar.js';

export type WealthKind = 'savings' | 'investments';
export const wealthInput = z
  .object({
    name: z.string().trim().min(1, 'Escribe un concepto').max(120),
    destination: z.string().trim().min(1, 'Indica la cuenta o plataforma').max(120),
    direction: z.enum(['deposit', 'withdrawal']),
    amountCents: centsSchema,
    date: dateSchema.refine(
      (date) => date <= todayMadrid(),
      'No puedes registrar movimientos futuros',
    ),
    notes: z.string().trim().max(2000).default(''),
  })
  .strict();
export const wealthPatch = createPatchSchema(wealthInput);
export const wealthOutput = wealthInput.extend({
  id: z.uuid(),
  kind: z.enum(['savings', 'investments']),
  createdAt: z.string(),
});
export type WealthInput = z.infer<typeof wealthInput>;
export type WealthEntry = z.infer<typeof wealthOutput>;
export const wealthQuery = z
  .object({
    search: z.string().max(120).default(''),
    nameSearch: z.string().max(120).default(''),
    destinationSearch: z.string().max(120).default(''),
    directionSearch: z.string().max(120).default(''),
    dateSearch: z.string().max(120).default(''),
    amountSearch: z.string().max(120).default(''),
    notesSearch: z.string().max(120).default(''),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine((q) => !q.from || !q.to || q.from <= q.to, 'Rango de fechas inválido');
const signedCents = z.string().regex(/^-?\d+$/);
export const wealthSummaryOutput = z.object({
  balanceCents: signedCents,
  depositsCents: signedCents,
  withdrawalsCents: signedCents,
  month: z.string(),
  monthDepositsCents: signedCents,
  monthWithdrawalsCents: signedCents,
  destinations: z.array(z.object({ destination: z.string(), balanceCents: signedCents })),
});
export type WealthSummary = z.infer<typeof wealthSummaryOutput>;

/** Contributions are allocations, never income/expenses or market valuations. */
export function summarizeWealth(
  entries: readonly WealthInput[],
  today = todayMadrid(),
): WealthSummary {
  let deposits = 0n,
    withdrawals = 0n,
    monthDeposits = 0n,
    monthWithdrawals = 0n;
  const destinations = new Map<string, { destination: string; balance: bigint }>();
  for (const entry of entries) {
    const amount = BigInt(entry.amountCents);
    const deposit = entry.direction === 'deposit';
    if (deposit) deposits += amount;
    else withdrawals += amount;
    if (entry.date.slice(0, 7) === today.slice(0, 7)) {
      if (deposit) monthDeposits += amount;
      else monthWithdrawals += amount;
    }
    const key = entry.destination.trim().toLowerCase();
    const account = destinations.get(key) ?? { destination: entry.destination, balance: 0n };
    account.balance += deposit ? amount : -amount;
    destinations.set(key, account);
  }
  return {
    balanceCents: (deposits - withdrawals).toString(),
    depositsCents: deposits.toString(),
    withdrawalsCents: withdrawals.toString(),
    month: today.slice(0, 7),
    monthDepositsCents: monthDeposits.toString(),
    monthWithdrawalsCents: monthWithdrawals.toString(),
    destinations: [...destinations.values()].map((v) => ({
      destination: v.destination,
      balanceCents: v.balance.toString(),
    })),
  };
}
