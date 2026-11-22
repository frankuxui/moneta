import { and, eq } from 'drizzle-orm';
import { nextOccurrence, validSubscription, type SubscriptionInput } from '@moneta/shared';
import { db } from '../../db/index.js';
import { subscriptions, movements } from '../../db/schema.js';
import { AppError, required } from '../../lib/errors.js';
export async function saveSubscription(
  input: SubscriptionInput | Partial<SubscriptionInput>,
  id?: string,
) {
  if (!id) {
    const data = input as SubscriptionInput;
    if (!validSubscription(data))
      throw new AppError(422, 'El próximo cobro debe ser igual o posterior al inicio.');
    return required(
      (
        await db
          .insert(subscriptions)
          .values({
            ...data,
            amountCents: BigInt(data.amountCents),
            anchorDay: Number(data.nextPaymentDate.slice(8)),
          })
          .returning()
      )[0],
    );
  }
  return db.transaction(async (tx) => {
    const current = required(
      (await tx.select().from(subscriptions).where(eq(subscriptions.id, id)).for('update'))[0],
    );
    const merged = { ...current, ...input };
    if (!validSubscription(merged))
      throw new AppError(422, 'El próximo cobro debe ser igual o posterior al inicio.');
    return required(
      (
        await tx
          .update(subscriptions)
          .set({
            ...input,
            amountCents: input.amountCents === undefined ? undefined : BigInt(input.amountCents),
            anchorDay:
              input.nextPaymentDate && input.nextPaymentDate !== current.nextPaymentDate
                ? Number(input.nextPaymentDate.slice(8))
                : current.anchorDay,
          })
          .where(eq(subscriptions.id, id))
          .returning()
      )[0],
    );
  });
}
export async function confirmPayment(id: string, date: string) {
  return db.transaction(async (tx) => {
    const sub = required(
      (await tx.select().from(subscriptions).where(eq(subscriptions.id, id)).for('update'))[0],
    );
    const existing = (
      await tx
        .select()
        .from(movements)
        .where(and(eq(movements.subscriptionId, id), eq(movements.occurrenceDate, date)))
    )[0];
    if (existing) return { movement: existing, created: false };
    if (sub.status !== 'active')
      throw new AppError(409, 'La suscripción debe estar activa para confirmar un cobro.');
    if (date !== sub.nextPaymentDate)
      throw new AppError(
        409,
        'El vencimiento ha cambiado. Actualiza la página antes de confirmar.',
      );
    const movement = required(
      (
        await tx
          .insert(movements)
          .values({
            kind: 'expense',
            name: sub.name,
            concept: sub.concept,
            amountCents: sub.amountCents,
            categoryId: sub.categoryId,
            date,
            description: sub.description,
            subscriptionId: id,
            occurrenceDate: date,
          })
          .returning()
      )[0],
    );
    await tx
      .update(subscriptions)
      .set({ nextPaymentDate: nextOccurrence(date, sub.frequency, sub.anchorDay) })
      .where(eq(subscriptions.id, id));
    return { movement, created: true };
  });
}
