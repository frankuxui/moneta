import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { ZodError } from 'zod';
import { rangeQuery } from '@moneta/shared';
import { pool } from './db/index.js';
import { movementRouter } from './modules/movements/routes.js';
import { subscriptionRouter } from './modules/subscriptions/routes.js';
import { categoryRouter, platformRouter, settingsRouter } from './modules/catalogs/routes.js';
import { overview } from './modules/analytics/service.js';
import { AppError } from './lib/errors.js';
import { openapi } from './openapi.js';

export const app = express();
app.disable('x-powered-by');
app.set('json replacer', (_key: string, value: unknown) =>
  typeof value === 'bigint' ? value.toString() : value,
);
app.use(helmet({ contentSecurityPolicy: false }));
if (process.env.NODE_ENV !== 'test')
  app.use(
    pinoHttp({
      serializers: {
        req: (req) => ({ method: req.method, url: req.url?.split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      redact: ['req.headers', 'res.headers'],
    }),
  );
app.use(express.json({ limit: '32kb' }));
app.use((req, _res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    const allowed = (
      process.env.ALLOWED_ORIGINS ??
      'http://localhost:5180,http://127.0.0.1:5180,http://192.168.1.10:5180'
    ).split(',');
    if ((origin && !allowed.includes(origin)) || req.get('sec-fetch-site') === 'cross-site')
      throw new AppError(403, 'Origen no permitido.');
    if (
      req.method === 'PATCH' &&
      (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0)
    )
      throw new AppError(422, 'Incluye al menos un campo para actualizar.');
  }
  next();
});
app.get('/api/v1/health', async (_req, res) => {
  try {
    await pool.query('select 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});
app.get('/api/v1/openapi.json', (_req, res) => {
  res.json(openapi);
});
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.use('/api/v1/expenses', movementRouter('expense'));
app.use('/api/v1/income', movementRouter('income'));
app.use('/api/v1/subscriptions', subscriptionRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/platforms', platformRouter);
app.use('/api/v1/settings', settingsRouter);
app.get(['/api/v1/dashboard', '/api/v1/analytics'], async (req, res) => {
  const { from, to } = rangeQuery.parse(req.query);
  res.json(await overview(from, to));
});
app.use((_req, _res, next) => next(new AppError(404, 'Ruta no encontrada.')));
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
      res.status(422).json({
        error: 'validation',
        message: 'Revisa los datos introducidos.',
        details: err.issues,
      });
      return;
    }
    if (err instanceof AppError) {
      res.status(err.status).json({ error: 'request', message: err.message });
      return;
    }
    const issue = err as {
      code?: string;
      cause?: { code?: string };
      type?: string;
      status?: number;
    };
    const code = issue?.cause?.code ?? issue?.code;
    if (['23505', '23503', '23514'].includes(code ?? '')) {
      res.status(409).json({
        error: 'conflict',
        message:
          code === '23503'
            ? 'El registro tiene referencias o la categoría/plataforma no existe.'
            : 'El registro ya existe o entra en conflicto con los datos actuales.',
      });
      return;
    }
    if (issue?.status === 400 || issue?.status === 413) {
      res.status(issue.status).json({
        error: 'body',
        message: 'El cuerpo JSON no es válido o supera el tamaño permitido.',
      });
      return;
    }
    res.status(500).json({
      error: 'internal',
      message: 'No se pudo completar la operación. Comprueba la conexión y vuelve a intentarlo.',
    });
  },
);
