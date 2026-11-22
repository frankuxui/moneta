import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { movementOutput, subscriptionOutput } from '@moneta/shared';

const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL debe apuntar a una base terminada en _test');
process.env.NODE_ENV = 'test';
if (url) process.env.DATABASE_URL = url;
const { app } = await import('../src/app.js');
const { db, pool } = await import('../src/db/index.js');
const api = request(app);
const expense = {
  name: 'Compra semanal',
  amountCents: '2365',
  date: '2026-01-31',
  concept: 'Alimentación',
};
const subscription = {
  name: 'Servicio mensual',
  amountCents: '999',
  frequency: 'monthly',
  startDate: '2026-01-31',
  nextPaymentDate: '2026-01-31',
};
describe.skipIf(!url)('PostgreSQL real y API', () => {
  beforeAll(async () => {
    await migrate(db, { migrationsFolder: './drizzle' });
  });
  beforeEach(async () => {
    await pool.query('TRUNCATE movements,subscriptions,platforms,categories,settings CASCADE');
    await pool.query('INSERT INTO settings DEFAULT VALUES');
  });
  afterAll(async () => {
    await pool.end();
  });
  it('CRUD, céntimos, filtros y totales', async () => {
    const created = await api.post('/api/v1/expenses').send(expense).expect(201);
    expect(created.body.amountCents).toBe('2365');
    expect(movementOutput.safeParse(created.body).success).toBe(true);
    await api
      .post('/api/v1/expenses')
      .send({ ...expense, name: 'Otro', date: '2026-02-01', amountCents: '1' })
      .expect(201);
    const page = await api
      .get(
        '/api/v1/expenses?from=2026-01-01&to=2026-01-31&search=semanal&sort=amount&direction=asc',
      )
      .expect(200);
    expect(page.body.totalCents).toBe('2365');
    expect(page.body.total).toBe(1);
    await api
      .patch(`/api/v1/expenses/${created.body.id}`)
      .send({ amountCents: '2366' })
      .expect(200);
    expect((await api.get(`/api/v1/expenses/${created.body.id}`)).body.concept).toBe(
      'Alimentación',
    );
    await api.get(`/api/v1/income/${created.body.id}`).expect(404);
    await api.delete(`/api/v1/expenses/${created.body.id}`).expect(204);
    await api.get(`/api/v1/expenses/${created.body.id}`).expect(404);
  });
  it('rechaza importes, fechas, rangos, claves y cuerpos inválidos', async () => {
    for (const amountCents of ['1.23', '-1', '0', '9999999999999'])
      await api
        .post('/api/v1/expenses')
        .send({ ...expense, amountCents })
        .expect(422);
    await api
      .post('/api/v1/expenses')
      .send({ ...expense, date: '2026-02-30' })
      .expect(422);
    await api
      .post('/api/v1/expenses')
      .send({ ...expense, kind: 'income' })
      .expect(422);
    await api.get('/api/v1/expenses?from=2026-02-01&to=2026-01-01').expect(422);
    await api.get('/api/v1/expenses?pageSize=10000').expect(422);
    await api.patch('/api/v1/expenses/invalid').send({}).expect(422);
    await api
      .post('/api/v1/expenses')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
  });
  it('sin ingresos el balance es desconocido y la previsión no suma gasto', async () => {
    const sub = await api.post('/api/v1/subscriptions').send(subscription).expect(201);
    expect(subscriptionOutput.safeParse(sub.body).success).toBe(true);
    const result = await api.get('/api/v1/dashboard?from=2026-01-01&to=2026-01-31').expect(200);
    expect(result.body.expensesCents).toBe('0');
    expect(result.body.balanceCents).toBeNull();
    expect(result.body.projectedCents).toBe('999');
  });
  it('confirma concurrentemente una sola vez y mantiene ancla de fin de mes', async () => {
    const { body: sub } = await api.post('/api/v1/subscriptions').send(subscription).expect(201);
    const results = await Promise.all([
      api.post(`/api/v1/subscriptions/${sub.id}/confirm`).send({ date: '2026-01-31' }),
      api.post(`/api/v1/subscriptions/${sub.id}/confirm`).send({ date: '2026-01-31' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 201]);
    expect(results[0]?.body.id).toBe(results[1]?.body.id);
    expect((await api.get('/api/v1/expenses')).body.total).toBe(1);
    expect((await api.get('/api/v1/subscriptions')).body[0].paidCents).toBe('999');
    expect((await api.get(`/api/v1/subscriptions/${sub.id}`)).body.nextPaymentDate).toBe(
      '2026-02-28',
    );
    await api
      .post(`/api/v1/subscriptions/${sub.id}/confirm`)
      .send({ date: '2026-02-28' })
      .expect(201);
    const summary = (await api.get('/api/v1/subscriptions')).body[0];
    expect(summary.paidCents).toBe('1998');
    expect(summary.paymentCount).toBe(2);
    expect((await api.get(`/api/v1/subscriptions/${sub.id}`)).body.nextPaymentDate).toBe(
      '2026-03-31',
    );
  });
  it('un cobro pausado/futuro/incorrecto no crea gasto ni mueve el calendario', async () => {
    const { body: sub } = await api
      .post('/api/v1/subscriptions')
      .send({ ...subscription, status: 'paused' })
      .expect(201);
    await api
      .post(`/api/v1/subscriptions/${sub.id}/confirm`)
      .send({ date: '2026-01-31' })
      .expect(409);
    await api.patch(`/api/v1/subscriptions/${sub.id}`).send({ status: 'active' }).expect(200);
    await api
      .post(`/api/v1/subscriptions/${sub.id}/confirm`)
      .send({ date: '2026-02-01' })
      .expect(409);
    await api
      .post(`/api/v1/subscriptions/${sub.id}/confirm`)
      .send({ date: '2099-01-01' })
      .expect(422);
    expect((await api.get('/api/v1/expenses')).body.total).toBe(0);
  });
  it('valida fechas combinadas en PATCH', async () => {
    const { body: sub } = await api.post('/api/v1/subscriptions').send(subscription);
    await api
      .patch(`/api/v1/subscriptions/${sub.id}`)
      .send({ startDate: '2026-02-01' })
      .expect(422);
    expect((await api.get(`/api/v1/subscriptions/${sub.id}`)).body.startDate).toBe('2026-01-31');
  });
  it('PATCH conserva los campos omitidos al pausar y editar', async () => {
    const { body: category } = await api
      .post('/api/v1/categories')
      .send({ name: 'Personalizada', color: '#123456' })
      .expect(201);
    const { body: sub } = await api
      .post('/api/v1/subscriptions')
      .send({
        ...subscription,
        categoryId: category.id,
        description: 'Conservar descripción',
        url: 'https://example.com',
        notes: 'Conservar notas',
      })
      .expect(201);
    const { body: updated } = await api
      .patch(`/api/v1/subscriptions/${sub.id}`)
      .send({ status: 'paused' })
      .expect(200);
    expect(updated.categoryId).toBe(category.id);
    expect(updated.description).toBe('Conservar descripción');
    expect(updated.url).toBe('https://example.com');
    expect(updated.notes).toBe('Conservar notas');
    const { body: renamed } = await api
      .patch(`/api/v1/categories/${category.id}`)
      .send({ name: 'Renombrada' })
      .expect(200);
    expect(renamed.color).toBe('#123456');
  });
  it('balances exactos y separación recurrente/puntual', async () => {
    await api.post('/api/v1/expenses').send(expense);
    await api.post('/api/v1/income').send({ ...expense, name: 'Ingreso', amountCents: '10000' });
    const { body: sub } = await api.post('/api/v1/subscriptions').send(subscription);
    await api.post(`/api/v1/subscriptions/${sub.id}/confirm`).send({ date: '2026-01-31' });
    const { body: r } = await api.get('/api/v1/analytics?from=2026-01-01&to=2026-01-31');
    expect(r.expensesCents).toBe('3364');
    expect(r.balanceCents).toBe('6636');
    expect(r.recurringCents).toBe('999');
    expect(r.oneOffCents).toBe('2365');
    expect(r.projectedCents).toBe('0');
  });
  it('categorías y proveedores mantienen integridad referencial', async () => {
    const { body: c } = await api
      .post('/api/v1/categories')
      .send({ name: 'Transporte', color: '#123456' })
      .expect(201);
    await api.post('/api/v1/categories').send({ name: 'Transporte' }).expect(409);
    await api.patch(`/api/v1/categories/${c.id}`).send({ name: 'Movilidad' }).expect(200);
    await api
      .post('/api/v1/expenses')
      .send({ ...expense, categoryId: c.id })
      .expect(201);
    await api.delete(`/api/v1/categories/${c.id}`).expect(409);
    const { body: p } = await api.post('/api/v1/platforms').send({ name: 'Proveedor' }).expect(201);
    await api.patch(`/api/v1/platforms/${p.id}`).send({ name: 'Nuevo proveedor' }).expect(200);
    await api.delete(`/api/v1/platforms/${p.id}`).expect(204);
  });
  it('borrar suscripción conserva el gasto y su origen recurrente', async () => {
    const { body: sub } = await api.post('/api/v1/subscriptions').send(subscription);
    await api.post(`/api/v1/subscriptions/${sub.id}/confirm`).send({ date: '2026-01-31' });
    await api.delete(`/api/v1/subscriptions/${sub.id}`).expect(204);
    const { body: r } = await api.get('/api/v1/analytics?from=2026-01-01&to=2026-01-31');
    expect(r.expensesCents).toBe('999');
    expect(r.recurringCents).toBe('999');
  });
  it('preferencias persistentes, salud y OpenAPI', async () => {
    const { body: s } = await api.get('/api/v1/settings').expect(200);
    await api
      .put('/api/v1/settings')
      .send({ ...s, showIncome: false })
      .expect(200);
    expect((await api.get('/api/v1/settings')).body.showIncome).toBe(false);
    await api.get('/api/v1/health').expect(200);
    expect((await api.get('/api/v1/openapi.json').expect(200)).body.openapi).toBe('3.0.3');
  });
  it('impide mutaciones desde orígenes ajenos', async () => {
    await api
      .post('/api/v1/expenses')
      .set('Origin', 'https://untrusted.example')
      .send(expense)
      .expect(403);
    await api
      .post('/api/v1/expenses')
      .set('Origin', 'http://localhost:5180')
      .send(expense)
      .expect(201);
  });
});
