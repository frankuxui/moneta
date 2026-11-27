import { Router } from 'express';
import { z } from 'zod';
import { wealthInput, wealthPatch, wealthQuery, type WealthKind } from '@moneta/shared';
import { getWealth, listWealth, saveWealth, wealthSummary } from './service.js';

export function wealthRouter(kind: WealthKind) {
  const router = Router();
  router.get('/', async (req, res) => {
    res.json(await listWealth(kind, wealthQuery.parse(req.query)));
  });
  router.get('/summary', async (_req, res) => {
    res.json(await wealthSummary(kind));
  });
  router.get('/:id', async (req, res) => {
    res.json(await getWealth(kind, z.uuid().parse(req.params.id)));
  });
  router.post('/', async (req, res) => {
    res
      .status(201)
      .json(await saveWealth(kind, { type: 'create', input: wealthInput.parse(req.body) }));
  });
  router.patch('/:id', async (req, res) => {
    res.json(
      await saveWealth(kind, {
        type: 'update',
        input: wealthPatch.parse(req.body),
        id: z.uuid().parse(req.params.id),
      }),
    );
  });
  router.delete('/:id', async (req, res) => {
    await saveWealth(kind, { type: 'delete', id: z.uuid().parse(req.params.id) });
    res.status(204).end();
  });
  return router;
}
