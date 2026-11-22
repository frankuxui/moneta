import { Router } from 'express';
import { z } from 'zod';
import { movementInput, movementPatch, listQuery } from '@moneta/shared';
import {
  createMovement,
  deleteMovement,
  getMovement,
  listMovements,
  updateMovement,
  type Kind,
} from './service.js';
export function movementRouter(kind: Kind) {
  const router = Router();
  router.get('/', async (req, res) => {
    res.json(await listMovements(kind, listQuery.parse(req.query)));
  });
  router.get('/:id', async (req, res) => {
    res.json(await getMovement(kind, z.uuid().parse(req.params.id)));
  });
  router.post('/', async (req, res) => {
    res.status(201).json(await createMovement(kind, movementInput.parse(req.body)));
  });
  router.patch('/:id', async (req, res) => {
    res.json(
      await updateMovement(kind, z.uuid().parse(req.params.id), movementPatch.parse(req.body)),
    );
  });
  router.delete('/:id', async (req, res) => {
    await deleteMovement(kind, z.uuid().parse(req.params.id));
    res.status(204).end();
  });
  return router;
}
