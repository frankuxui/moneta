import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import pino from 'pino';
const log = pino();
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000,
});
pool.on('error', () =>
  log.error('Se perdió una conexión inactiva con PostgreSQL. Se abrirá una nueva al consultar.'),
);
export const db = drizzle(pool, { schema });
