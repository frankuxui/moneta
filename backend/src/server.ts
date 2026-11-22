import { app } from './app.js';
import { pool } from './db/index.js';
import pino from 'pino';
const log = pino();
if (!process.env.DATABASE_URL)
  throw new Error('DATABASE_URL es obligatoria. Consulta .env.example.');
const server = app.listen(Number(process.env.PORT ?? 3080), '0.0.0.0', () =>
  log.info('Moneta API preparada'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
