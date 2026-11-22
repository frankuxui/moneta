import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import {
  balance,
  daysInRange,
  equivalents,
  nextOccurrence,
  periodRange,
  previousRange,
  roundedDivide,
  sumMoney,
  todayMadrid,
} from '@moneta/shared';
import { db } from '../../db/index.js';
import { movements, categories, subscriptions } from '../../db/schema.js';

export async function overview(from: string, to: string) {
  return db.transaction(
    async (tx) => {
      const range = (start: string, end: string) =>
        and(gte(movements.date, start), lte(movements.date, end));
      async function totals(start: string, end: string) {
        return tx
          .select({
            kind: movements.kind,
            cents: sql<string>`coalesce(sum(${movements.amountCents}),0)::text`,
            count: sql<number>`count(*)::int`,
          })
          .from(movements)
          .where(range(start, end))
          .groupBy(movements.kind);
      }
      const rows = await totals(from, to);
      const expensesCents = rows.find((r) => r.kind === 'expense')?.cents ?? '0';
      const incomeCents = rows.find((r) => r.kind === 'income')?.cents ?? '0';
      const incomeCount = rows.find((r) => r.kind === 'income')?.count ?? 0;
      const previous = previousRange(from, to);
      const previousExpensesCents =
        (await totals(previous.from, previous.to)).find((r) => r.kind === 'expense')?.cents ?? '0';
      const periodTotals: Record<string, string> = {};
      for (const period of ['week', 'month', 'year'] as const) {
        const r = periodRange(period);
        periodTotals[`${period}Cents`] =
          (await totals(r.from, r.to)).find((v) => v.kind === 'expense')?.cents ?? '0';
      }
      const distribution = await tx
        .select({
          id: sql<string>`coalesce(${categories.id}::text,'uncategorized')`,
          name: sql<string>`coalesce(${categories.name},'Sin categoría')`,
          color: sql<string>`coalesce(${categories.color},'#94a3b8')`,
          amountCents: sql<string>`sum(${movements.amountCents})::text`,
        })
        .from(movements)
        .leftJoin(categories, eq(movements.categoryId, categories.id))
        .where(and(range(from, to), eq(movements.kind, 'expense')))
        .groupBy(categories.id, categories.name, categories.color)
        .orderBy(desc(sql`sum(${movements.amountCents})`));
      const series = await tx
        .select({
          date: movements.date,
          expensesCents: sql<string>`coalesce(sum(${movements.amountCents}) FILTER (WHERE ${movements.kind}='expense'),0)::text`,
          incomeCents: sql<string>`coalesce(sum(${movements.amountCents}) FILTER (WHERE ${movements.kind}='income'),0)::text`,
        })
        .from(movements)
        .where(range(from, to))
        .groupBy(movements.date)
        .orderBy(movements.date);
      const recent = await tx
        .select()
        .from(movements)
        .where(and(range(from, to), eq(movements.kind, 'expense')))
        .orderBy(desc(movements.date), desc(movements.createdAt))
        .limit(5);
      const [recurring] = await tx
        .select({ cents: sql<string>`coalesce(sum(${movements.amountCents}),0)::text` })
        .from(movements)
        .where(
          and(
            range(from, to),
            eq(movements.kind, 'expense'),
            sql`${movements.occurrenceDate} IS NOT NULL`,
          ),
        );
      const active = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.status, 'active'));
      const annualCents = sumMoney(
        active.map((s) => equivalents(s.amountCents.toString(), s.frequency).annualCents),
      );
      const monthlyCents = roundedDivide(BigInt(annualCents), 12n).toString();
      const upcoming: {
        subscriptionId: string;
        name: string;
        date: string;
        amountCents: string;
      }[] = [];
      // Starting at the next unpaid occurrence preserves overdue commitments; no expense is inserted.
      for (const sub of active) {
        let date = sub.nextPaymentDate;
        while (date <= to) {
          if (date >= from)
            upcoming.push({
              subscriptionId: sub.id,
              name: sub.name,
              date,
              amountCents: sub.amountCents.toString(),
            });
          date = nextOccurrence(date, sub.frequency, sub.anchorDay);
        }
      }
      upcoming.sort((a, b) => a.date.localeCompare(b.date));
      const recurringCents = recurring?.cents ?? '0';
      return {
        from,
        to,
        today: todayMadrid(),
        expensesCents,
        incomeCents,
        incomeCount,
        balanceCents: incomeCount ? balance(incomeCents, expensesCents) : null,
        ...periodTotals,
        previousExpensesCents,
        variationPercent:
          BigInt(previousExpensesCents) === 0n
            ? null
            : (
                ((BigInt(expensesCents) - BigInt(previousExpensesCents)) * 10000n) /
                BigInt(previousExpensesCents)
              ).toString(),
        activeSubscriptions: active.length,
        annualCents,
        monthlyCents,
        projectedCents: sumMoney(upcoming.map((s) => s.amountCents)),
        averageCents: roundedDivide(
          BigInt(expensesCents),
          BigInt(daysInRange(from, to)),
        ).toString(),
        recurringCents,
        oneOffCents: balance(expensesCents, recurringCents),
        categories: distribution,
        series,
        recent,
        upcoming,
        costliest: active
          .sort((a, b) => {
            const x = BigInt(equivalents(a.amountCents.toString(), a.frequency).annualCents),
              y = BigInt(equivalents(b.amountCents.toString(), b.frequency).annualCents);
            return x > y ? -1 : x < y ? 1 : 0;
          })
          .slice(0, 5),
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
