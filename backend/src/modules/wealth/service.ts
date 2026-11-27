import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import type { z } from 'zod';
import {
  summarizeWealth,
  type WealthKind,
  type WealthInput,
  type wealthQuery,
} from '@moneta/shared';
import { db } from '../../db/index.js';
import { wealthEntries } from '../../db/schema.js';
import { AppError, required } from '../../lib/errors.js';
import {
  dateDocument,
  moneyDocument,
  searchCondition,
  searchDocument,
} from '../movements/search.js';

export async function listWealth(kind: WealthKind, q: z.infer<typeof wealthQuery>) {
  const direction = sql`case when ${wealthEntries.direction} = 'deposit' then 'Aportación' else 'Retirada' end`;
  const date = dateDocument(wealthEntries.date);
  const amount = sql`case when ${wealthEntries.direction}='deposit'
    then ${moneyDocument(wealthEntries.amountCents, 'income')}
    else ${moneyDocument(wealthEntries.amountCents, 'expense')} end`;
  const where = and(
    eq(wealthEntries.kind, kind),
    q.from ? gte(wealthEntries.date, q.from) : undefined,
    q.to ? lte(wealthEntries.date, q.to) : undefined,
    searchCondition(wealthEntries.name, q.nameSearch),
    searchCondition(wealthEntries.destination, q.destinationSearch),
    searchCondition(direction, q.directionSearch),
    searchCondition(date, q.dateSearch),
    searchCondition(amount, q.amountSearch),
    searchCondition(wealthEntries.notes, q.notesSearch),
    searchCondition(
      searchDocument(
        wealthEntries.name,
        wealthEntries.destination,
        direction,
        date,
        amount,
        wealthEntries.notes,
      ),
      q.search,
    ),
  );
  return db.transaction(
    async (tx) => {
      const [totals] = await tx
        .select({
          total: sql<number>`count(*)::int`,
          totalCents: sql<string>`coalesce(sum(case when ${wealthEntries.direction}='deposit' then ${wealthEntries.amountCents} else -${wealthEntries.amountCents} end),0)::text`,
        })
        .from(wealthEntries)
        .where(where);
      const items = await tx
        .select()
        .from(wealthEntries)
        .where(where)
        .orderBy(desc(wealthEntries.date), desc(wealthEntries.createdAt), asc(wealthEntries.id))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize);
      return { ...totals, items, page: q.page, pageSize: q.pageSize };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
export async function wealthSummary(kind: WealthKind) {
  const entries = await db.select().from(wealthEntries).where(eq(wealthEntries.kind, kind));
  return summarizeWealth(
    entries.map((entry) => ({ ...entry, amountCents: entry.amountCents.toString() })),
  );
}
export async function getWealth(kind: WealthKind, id: string) {
  return required(
    (
      await db
        .select()
        .from(wealthEntries)
        .where(and(eq(wealthEntries.kind, kind), eq(wealthEntries.id, id)))
    )[0],
  );
}
type WealthCommand =
  | { type: 'create'; input: WealthInput }
  | { type: 'update'; id: string; input: Partial<WealthInput> }
  | { type: 'delete'; id: string };
export async function saveWealth(kind: WealthKind, command: WealthCommand) {
  return db.transaction(async (tx) => {
    // Serialize ledger writes across processes; concurrent withdrawals cannot overdraw an account.
    await tx.execute(sql`select pg_advisory_xact_lock(782340, ${kind === 'savings' ? 1 : 2})`);
    const where = and(
      eq(wealthEntries.kind, kind),
      command.type === 'create' ? undefined : eq(wealthEntries.id, command.id),
    );
    let entry: typeof wealthEntries.$inferSelect;
    if (command.type === 'delete')
      entry = required((await tx.delete(wealthEntries).where(where).returning())[0]);
    else if (command.type === 'update') {
      const input = command.input;
      entry = required(
        (
          await tx
            .update(wealthEntries)
            .set({
              ...input,
              amountCents: input.amountCents === undefined ? undefined : BigInt(input.amountCents),
            })
            .where(where)
            .returning()
        )[0],
      );
    } else {
      const complete = command.input;
      entry = required(
        (
          await tx
            .insert(wealthEntries)
            .values({ ...complete, kind, amountCents: BigInt(complete.amountCents) })
            .returning()
        )[0],
      );
    }
    const balances = await tx
      .select({
        balance: sql<string>`sum(case when ${wealthEntries.direction}='deposit' then ${wealthEntries.amountCents} else -${wealthEntries.amountCents} end)::text`,
      })
      .from(wealthEntries)
      .where(eq(wealthEntries.kind, kind))
      .groupBy(sql`lower(trim(${wealthEntries.destination}))`);
    if (balances.some((account) => BigInt(account.balance) < 0n)) {
      throw new AppError(
        409,
        'La operación dejaría una cuenta o plataforma con saldo negativo. Revisa sus aportaciones y retiradas.',
      );
    }
    return entry;
  });
}
