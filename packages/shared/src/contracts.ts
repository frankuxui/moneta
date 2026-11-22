import { z } from 'zod';
import { MAX_CENTS } from './money.js';
import { daysInRange, todayMadrid, periodRange } from './calendar.js';

export const dateSchema = z.iso
  .date()
  .refine((v) => v >= '1900-01-01' && v <= '2199-12-31', 'La fecha debe estar entre 1900 y 2199');
export const centsSchema = z
  .string()
  .regex(/^[1-9]\d*$/, 'Importe en céntimos positivo')
  .refine((v) => /^[1-9]\d*$/.test(v) && BigInt(v) <= MAX_CENTS, 'Importe demasiado alto');
const name = z.string().trim().min(1, 'El nombre es obligatorio').max(120);
const optionalText = z.string().trim().max(2000).default('');
export const categoryInput = z
  .object({
    name,
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default('#287f83'),
  })
  .strict();
export const platformInput = z.object({ name }).strict();
export const movementInput = z
  .object({
    name,
    amountCents: centsSchema,
    concept: z.string().trim().max(240).default(''),
    categoryId: z.uuid().nullable().default(null),
    date: dateSchema,
    description: optionalText,
    paymentMethod: z.string().trim().max(120).default(''),
    notes: optionalText,
  })
  .strict();
export const subscriptionInput = z
  .object({
    name,
    amountCents: centsSchema,
    concept: z.string().trim().max(240).default(''),
    categoryId: z.uuid().nullable().default(null),
    platformId: z.uuid().nullable().default(null),
    description: optionalText,
    startDate: dateSchema,
    nextPaymentDate: dateSchema,
    frequency: z.enum(['weekly', 'monthly', 'quarterly', 'semiannual', 'annual']),
    status: z.enum(['active', 'paused', 'cancelled']).default('active'),
    url: z
      .union([
        z.literal(''),
        z.url().refine((v) => /^https?:\/\//.test(v), 'Usa una URL http o https'),
      ])
      .default(''),
    notes: optionalText,
  })
  .strict();
export const validSubscription = (v: { startDate: string; nextPaymentDate: string }) =>
  v.nextPaymentDate >= v.startDate;
export const settingsInput = z
  .object({
    currency: z.literal('EUR'),
    locale: z.literal('es-ES'),
    timezone: z.literal('Europe/Madrid'),
    weekStartsOn: z.literal(1),
    showIncome: z.boolean(),
    showProjections: z.boolean(),
  })
  .strict();
export const rangeQuery = z
  .object({
    from: dateSchema.default(() => periodRange('month').from),
    to: dateSchema.default(() => periodRange('month').to),
  })
  .refine(
    (v) => v.to >= v.from && daysInRange(v.from, v.to) <= 3660,
    'Selecciona un rango válido de hasta diez años',
  );
export const listQuery = z
  .object({
    search: z.string().max(120).default(''),
    nameSearch: z.string().max(120).default(''),
    categorySearch: z.string().max(120).default(''),
    dateSearch: z.string().max(120).default(''),
    amountSearch: z.string().max(120).default(''),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    categoryId: z.uuid().optional(),
    sort: z.enum(['date', 'amount']).default('date'),
    direction: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine((v) => !v.from || !v.to || v.from <= v.to, 'Rango de fechas inválido');
export const confirmInput = z
  .object({
    date: dateSchema.refine((v) => v <= todayMadrid(), 'No puedes confirmar un pago futuro'),
  })
  .strict();
/** Zod defaults must not reset omitted properties in a PATCH request. */
export function createPatchSchema<T extends Record<string, z.ZodType>>(schema: z.ZodObject<T>) {
  const fields = Object.fromEntries(
    Object.entries(schema.shape).map(([key, value]) => [
      key,
      value instanceof z.ZodDefault ? value.removeDefault() : value,
    ]),
  ) as {
    [K in keyof T]: T[K] extends z.ZodDefault<infer Inner> ? Inner : T[K];
  };
  return z.object(fields).partial().strict();
}
export const movementPatch = createPatchSchema(movementInput);
export const subscriptionPatch = createPatchSchema(subscriptionInput);
export const categoryPatch = createPatchSchema(categoryInput);
export const platformPatch = createPatchSchema(platformInput);
export type MovementInput = z.infer<typeof movementInput>;
export type SubscriptionInput = z.infer<typeof subscriptionInput>;
export const movementOutput = movementInput.extend({
  id: z.uuid(),
  kind: z.enum(['expense', 'income']),
  subscriptionId: z.uuid().nullable(),
  occurrenceDate: dateSchema.nullable(),
  createdAt: z.string(),
});
export const subscriptionOutput = subscriptionInput.extend({
  id: z.uuid(),
  anchorDay: z.number().int().min(1).max(31),
  createdAt: z.string(),
});
export const categoryOutput = categoryInput.extend({ id: z.uuid() });
export const platformOutput = platformInput.extend({ id: z.uuid() });
export type Movement = z.infer<typeof movementOutput>;
export type Subscription = z.infer<typeof subscriptionOutput>;
export const subscriptionSummaryOutput = subscriptionOutput.extend({
  paidCents: z.string().regex(/^\d+$/),
  paymentCount: z.number().int().nonnegative(),
});
export type SubscriptionSummary = z.infer<typeof subscriptionSummaryOutput>;
export type Category = z.infer<typeof categoryOutput>;
export type Platform = z.infer<typeof platformOutput>;
export type Settings = z.infer<typeof settingsInput>;
export type Page<T> = {
  items: T[];
  total: number;
  totalCents: string;
  page: number;
  pageSize: number;
};
export type Overview = {
  from: string;
  to: string;
  expensesCents: string;
  incomeCents: string;
  incomeCount: number;
  balanceCents: string | null;
  weekCents: string;
  monthCents: string;
  yearCents: string;
  previousExpensesCents: string;
  variationPercent: string | null;
  activeSubscriptions: number;
  monthlyCents: string;
  annualCents: string;
  projectedCents: string;
  averageCents: string;
  recurringCents: string;
  oneOffCents: string;
  recent: Movement[];
  categories: { id: string; name: string; color: string; amountCents: string }[];
  series: { date: string; expensesCents: string; incomeCents: string }[];
  upcoming: { subscriptionId: string; name: string; date: string; amountCents: string }[];
  costliest: Subscription[];
};
