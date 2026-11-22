import { Router } from 'express';
import { asc, eq, getTableColumns, sql } from 'drizzle-orm';
import { z } from 'zod';
import { subscriptionInput, subscriptionPatch, confirmInput } from '@moneta/shared';
import { db } from '../../db/index.js';
import { subscriptions, movements } from '../../db/schema.js';
import { required } from '../../lib/errors.js';
import { saveSubscription, confirmPayment } from './service.js';
export const subscriptionRouter = Router();
subscriptionRouter.get('/', async (_req, res) => {
  res.json(
    await db
      .select({
        ...getTableColumns(subscriptions),
        paidCents: sql<string>`coalesce(sum(${movements.amountCents}),0)::text`,
        paymentCount: sql<number>`count(${movements.id})::int`,
      })
      .from(subscriptions)
      .leftJoin(movements, eq(movements.subscriptionId, subscriptions.id))
      .groupBy(subscriptions.id)
      .orderBy(asc(subscriptions.nextPaymentDate)),
  );
});
subscriptionRouter.get('/:id', async (req, res) => {
  res.json(
    required(
      (
        await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.id, z.uuid().parse(req.params.id)))
      )[0],
    ),
  );
});
subscriptionRouter.post('/', async (req, res) => {
  res.status(201).json(await saveSubscription(subscriptionInput.parse(req.body)));
});
subscriptionRouter.patch('/:id', async (req, res) => {
  res.json(
    await saveSubscription(subscriptionPatch.parse(req.body), z.uuid().parse(req.params.id)),
  );
});
subscriptionRouter.delete('/:id', async (req, res) => {
  required(
    (
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.id, z.uuid().parse(req.params.id)))
        .returning()
    )[0],
  );
  res.status(204).end();
});
subscriptionRouter.post('/:id/confirm', async (req, res) => {
  const result = await confirmPayment(
    z.uuid().parse(req.params.id),
    confirmInput.parse(req.body).date,
  );
  res.status(result.created ? 201 : 200).json(result.movement);
});
