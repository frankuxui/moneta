import {
  pgTable,
  uuid,
  text,
  bigint,
  date,
  integer,
  timestamp,
  uniqueIndex,
  check,
  index,
  boolean,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const id = () => uuid('id').defaultRandom().primaryKey();
const createdAt = () =>
  timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull();
export const categories = pgTable('categories', {
  id: id(),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#287f83'),
});
export const platforms = pgTable('platforms', { id: id(), name: text('name').notNull().unique() });
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: id(),
    name: text('name').notNull(),
    amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
    concept: text('concept').notNull().default(''),
    description: text('description').notNull().default(''),
    categoryId: uuid('category_id').references(() => categories.id),
    platformId: uuid('platform_id').references(() => platforms.id),
    startDate: date('start_date').notNull(),
    nextPaymentDate: date('next_payment_date').notNull(),
    anchorDay: integer('anchor_day').notNull(),
    frequency: text('frequency')
      .$type<'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'>()
      .notNull(),
    status: text('status').$type<'active' | 'paused' | 'cancelled'>().notNull().default('active'),
    url: text('url').notNull().default(''),
    notes: text('notes').notNull().default(''),
    createdAt: createdAt(),
  },
  (t) => [
    check('subscription_amount', sql`${t.amountCents}>0 AND ${t.amountCents}<=999999999999`),
    check('subscription_anchor', sql`${t.anchorDay} BETWEEN 1 AND 31`),
    check('subscription_dates', sql`${t.nextPaymentDate}>=${t.startDate}`),
    check(
      'subscription_frequency',
      sql`${t.frequency} IN ('weekly','monthly','quarterly','semiannual','annual')`,
    ),
    check('subscription_status', sql`${t.status} IN ('active','paused','cancelled')`),
    index('subscription_due_idx').on(t.nextPaymentDate),
  ],
);
export const movements = pgTable(
  'movements',
  {
    id: id(),
    kind: text('kind').$type<'expense' | 'income'>().notNull(),
    name: text('name').notNull(),
    amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
    concept: text('concept').notNull().default(''),
    categoryId: uuid('category_id').references(() => categories.id),
    date: date('date').notNull(),
    description: text('description').notNull().default(''),
    paymentMethod: text('payment_method').notNull().default(''),
    notes: text('notes').notNull().default(''),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, {
      onDelete: 'set null',
    }),
    occurrenceDate: date('occurrence_date'),
    createdAt: createdAt(),
  },
  (t) => [
    check('movement_amount', sql`${t.amountCents}>0 AND ${t.amountCents}<=999999999999`),
    check('movement_kind', sql`${t.kind} IN ('expense','income')`),
    uniqueIndex('movement_subscription_occurrence').on(t.subscriptionId, t.occurrenceDate),
    index('movement_kind_date_idx').on(t.kind, t.date),
    index('movement_category_idx').on(t.categoryId),
  ],
);
export const settings = pgTable(
  'settings',
  {
    id: integer('id').primaryKey().default(1),
    currency: text('currency').notNull().default('EUR'),
    locale: text('locale').notNull().default('es-ES'),
    timezone: text('timezone').notNull().default('Europe/Madrid'),
    weekStartsOn: integer('week_starts_on').notNull().default(1),
    showIncome: boolean('show_income').notNull().default(true),
    showProjections: boolean('show_projections').notNull().default(true),
  },
  (t) => [check('settings_singleton', sql`${t.id}=1`)],
);
