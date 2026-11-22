import { and, asc, desc, eq, gte, lte, sql, getTableColumns } from 'drizzle-orm';
import { z } from 'zod';
import { listQuery, type MovementInput } from '@moneta/shared';
import { db } from '../../db/index.js';
import { movements, categories } from '../../db/schema.js';
import { dateDocument, moneyDocument, searchCondition, searchDocument } from './search.js';
import { required } from '../../lib/errors.js';
export type Kind = 'expense' | 'income';
export async function listMovements(kind: Kind, q: z.infer<typeof listQuery>) {
  const origin = sql`case when ${movements.occurrenceDate} is not null then 'Cobro recurrente' else 'Puntual' end`;
  const name = searchDocument(
    movements.name,
    sql`coalesce(nullif(${movements.concept}, ''), 'Sin concepto')`,
    origin,
  );
  const category = sql`coalesce(${categories.name}, 'Sin categoría')`;
  const date = dateDocument(movements.date);
  const amount = moneyDocument(movements.amountCents, kind);
  const where = and(
    eq(movements.kind, kind),
    q.from ? gte(movements.date, q.from) : undefined,
    q.to ? lte(movements.date, q.to) : undefined,
    q.categoryId ? eq(movements.categoryId, q.categoryId) : undefined,
    searchCondition(name, q.nameSearch),
    searchCondition(category, q.categorySearch),
    searchCondition(date, q.dateSearch),
    searchCondition(amount, q.amountSearch),
    searchCondition(
      searchDocument(
        name,
        category,
        date,
        amount,
        movements.description,
        movements.paymentMethod,
        movements.notes,
        sql`${kind === 'expense' ? 'Gasto' : 'Ingreso'}::text`,
      ),
      q.search,
    ),
  );
  const order = q.direction === 'asc' ? asc : desc;
  return db.transaction(
    async (tx) => {
      const [totals] = await tx
        .select({
          total: sql<number>`count(*)::int`,
          totalCents: sql<string>`coalesce(sum(${movements.amountCents}),0)::text`,
        })
        .from(movements)
        .leftJoin(categories, eq(movements.categoryId, categories.id))
        .where(where);
      const items = await tx
        .select(getTableColumns(movements))
        .from(movements)
        .leftJoin(categories, eq(movements.categoryId, categories.id))
        .where(where)
        .orderBy(
          order(q.sort === 'amount' ? movements.amountCents : movements.date),
          asc(movements.id),
        )
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize);
      return { ...totals, items, page: q.page, pageSize: q.pageSize };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
export async function getMovement(kind: Kind, id: string) {
  return required(
    (
      await db
        .select()
        .from(movements)
        .where(and(eq(movements.id, id), eq(movements.kind, kind)))
    )[0],
  );
}
export async function createMovement(kind: Kind, input: MovementInput) {
  return required(
    (
      await db
        .insert(movements)
        .values({ ...input, kind, amountCents: BigInt(input.amountCents) })
        .returning()
    )[0],
  );
}
export async function updateMovement(kind: Kind, id: string, input: Partial<MovementInput>) {
  return required(
    (
      await db
        .update(movements)
        .set({
          ...input,
          amountCents: input.amountCents === undefined ? undefined : BigInt(input.amountCents),
        })
        .where(and(eq(movements.id, id), eq(movements.kind, kind)))
        .returning()
    )[0],
  );
}
export async function deleteMovement(kind: Kind, id: string) {
  return required(
    (
      await db
        .delete(movements)
        .where(and(eq(movements.id, id), eq(movements.kind, kind)))
        .returning({ id: movements.id })
    )[0],
  );
}
