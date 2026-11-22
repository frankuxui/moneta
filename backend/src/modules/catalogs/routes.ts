import { Router } from 'express';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  categoryInput,
  categoryPatch,
  platformInput,
  platformPatch,
  settingsInput,
} from '@moneta/shared';
import { db } from '../../db/index.js';
import { categories, platforms, settings } from '../../db/schema.js';
import { required } from '../../lib/errors.js';
export const categoryRouter = Router();
categoryRouter.get('/', async (_req, res) => {
  res.json(await db.select().from(categories).orderBy(asc(categories.name)));
});
categoryRouter.get('/:id', async (req, res) => {
  res.json(
    required(
      (
        await db
          .select()
          .from(categories)
          .where(eq(categories.id, z.uuid().parse(req.params.id)))
      )[0],
    ),
  );
});
categoryRouter.post('/', async (req, res) => {
  res
    .status(201)
    .json(
      required((await db.insert(categories).values(categoryInput.parse(req.body)).returning())[0]),
    );
});
categoryRouter.patch('/:id', async (req, res) => {
  res.json(
    required(
      (
        await db
          .update(categories)
          .set(categoryPatch.parse(req.body))
          .where(eq(categories.id, z.uuid().parse(req.params.id)))
          .returning()
      )[0],
    ),
  );
});
categoryRouter.delete('/:id', async (req, res) => {
  required(
    (
      await db
        .delete(categories)
        .where(eq(categories.id, z.uuid().parse(req.params.id)))
        .returning()
    )[0],
  );
  res.status(204).end();
});
export const platformRouter = Router();
platformRouter.get('/', async (_req, res) => {
  res.json(await db.select().from(platforms).orderBy(asc(platforms.name)));
});
platformRouter.get('/:id', async (req, res) => {
  res.json(
    required(
      (
        await db
          .select()
          .from(platforms)
          .where(eq(platforms.id, z.uuid().parse(req.params.id)))
      )[0],
    ),
  );
});
platformRouter.post('/', async (req, res) => {
  res
    .status(201)
    .json(
      required((await db.insert(platforms).values(platformInput.parse(req.body)).returning())[0]),
    );
});
platformRouter.patch('/:id', async (req, res) => {
  res.json(
    required(
      (
        await db
          .update(platforms)
          .set(platformPatch.parse(req.body))
          .where(eq(platforms.id, z.uuid().parse(req.params.id)))
          .returning()
      )[0],
    ),
  );
});
platformRouter.delete('/:id', async (req, res) => {
  required(
    (
      await db
        .delete(platforms)
        .where(eq(platforms.id, z.uuid().parse(req.params.id)))
        .returning()
    )[0],
  );
  res.status(204).end();
});
export const settingsRouter = Router();
settingsRouter.get('/', async (_req, res) => {
  const { id: _, ...value } = required(
    (await db.select().from(settings).where(eq(settings.id, 1)))[0],
  );
  res.json(value);
});
settingsRouter.put('/', async (req, res) => {
  const value = settingsInput.parse(req.body);
  await db
    .insert(settings)
    .values({ id: 1, ...value })
    .onConflictDoUpdate({ target: settings.id, set: value });
  res.json(value);
});
