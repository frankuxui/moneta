import { and, asc, desc, eq, gte, lte, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { listQuery, type MovementInput } from '@moneta/shared';
import { db } from '../../db/index.js';
import { movements } from '../../db/schema.js';
import { required } from '../../lib/errors.js';
export type Kind = 'expense' | 'income';
export async function listMovements(kind: Kind, q: z.infer<typeof listQuery>) {
  const where = and(
    eq(movements.kind, kind),
    q.from ? gte(movements.date, q.from) : undefined,
    q.to ? lte(movements.date, q.to) : undefined,
    q.categoryId ? eq(movements.categoryId, q.categoryId) : undefined,
    q.search
      ? or(
          ilike(movements.name, `%${q.search.replace(/[\\%_]/g, '\\$&')}%`),
          ilike(movements.concept, `%${q.search.replace(/[\\%_]/g, '\\$&')}%`),
        )
      : undefined,
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
        .where(where);
      const items = await tx
        .select()
        .from(movements)
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
