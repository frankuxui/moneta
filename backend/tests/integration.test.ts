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
    await pool.query(
      'TRUNCATE wealth_entries,movements,subscriptions,platforms,categories,settings CASCADE',
    );
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
  it.each(['expenses', 'income'])(
    'busca todos los campos y combina columnas antes de paginar en %s',
    async (kind) => {
      const { body: category } = await api
        .post('/api/v1/categories')
        .send({ name: 'Formación' })
        .expect(201);
      for (let index = 0; index < 22; index++) {
        await api
          .post(`/api/v1/${kind}`)
          .send({ ...expense, name: `Otro ${index}`, date: '2026-02-01' })
          .expect(201);
      }
      const { body: target } = await api
        .post(`/api/v1/${kind}`)
        .send({
          ...expense,
          name: 'Curso de francés',
          categoryId: category.id,
          amountCents: '125075',
          description: 'Material avanzado',
          notes: 'Referencia 50%_especial',
          paymentMethod: 'Tarjeta virtual',
        })
        .expect(201);
      // It is beyond page one before filtering, and totals must use the entire result set.
      expect(
        (await api.get(`/api/v1/${kind}`)).body.items.some(
          (item: { id: string }) => item.id === target.id,
        ),
      ).toBe(false);
      for (const search of [
        'FRANCES',
        'formacion',
        'avanzado',
        '50%_especial',
        'tarjeta virtual',
        '1.250,75 €',
        '1250.75',
        '31/01/2026',
        '31 ene 2026',
        'enero',
        'frances formacion virtual',
      ]) {
        const { body } = await api
          .get(`/api/v1/${kind}`)
          .query({ search, pageSize: 1 })
          .expect(200);
        expect(body.total, search).toBe(1);
        expect(body.totalCents, search).toBe('125075');
        expect(body.items[0].id, search).toBe(target.id);
      }
      const filters = {
        nameSearch: 'frances',
        categorySearch: 'formacion',
        dateSearch: 'enero',
        amountSearch: '1250,75',
      };
      expect((await api.get(`/api/v1/${kind}`).query(filters).expect(200)).body.total).toBe(1);
      expect(
        (
          await api
            .get(`/api/v1/${kind}`)
            .query({ ...filters, search: 'efectivo' })
            .expect(200)
        ).body.total,
      ).toBe(0);
      expect(
        (
          await api
            .get(`/api/v1/${kind}`)
            .query({ ...filters, amountSearch: '23,65' })
            .expect(200)
        ).body.totalCents,
      ).toBe('0');
      expect(
        (await api.get(`/api/v1/${kind}`).query({ search: '50%_inventado' }).expect(200)).body
          .total,
      ).toBe(0);
      expect(
        (await api.get(`/api/v1/${kind}`).query({ categorySearch: 'sin categoria' }).expect(200))
          .body.total,
      ).toBe(22);
      await api
        .get(`/api/v1/${kind}`)
        .query({ nameSearch: 'a'.repeat(121) })
        .expect(422);
    },
  );
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
  it.each(['savings', 'investments'])(
    'CRUD de %s sin alterar gastos ni ingresos; rollback al sobregirar',
    async (kind) => {
      const input = {
        name: 'Aportación mensual',
        destination: 'Cuenta principal',
        direction: 'deposit',
        amountCents: '2365',
        date: '2026-02-28',
        notes: 'Reserva',
      };
      const { body: deposit } = await api.post(`/api/v1/${kind}`).send(input).expect(201);
      const { body: withdrawal } = await api
        .post(`/api/v1/${kind}`)
        .send({ ...input, direction: 'withdrawal', amountCents: '65' })
        .expect(201);
      expect((await api.get(`/api/v1/${kind}/summary`)).body.balanceCents).toBe('2300');
      await api.patch(`/api/v1/${kind}/${deposit.id}`).send({ notes: 'Actualizada' }).expect(200);
      expect((await api.get(`/api/v1/${kind}/${deposit.id}`)).body.amountCents).toBe('2365');
      await api
        .patch(`/api/v1/${kind}/${deposit.id}`)
        .send({ destination: 'Otra cuenta' })
        .expect(409);
      await api.delete(`/api/v1/${kind}/${deposit.id}`).expect(409);
      expect((await api.get(`/api/v1/${kind}/${deposit.id}`)).body.destination).toBe(
        'Cuenta principal',
      );
      const other = kind === 'savings' ? 'investments' : 'savings';
      await api.get(`/api/v1/${other}/${deposit.id}`).expect(404);
      await api.patch(`/api/v1/${other}/${deposit.id}`).send({ name: 'Ajeno' }).expect(404);
      await api.delete(`/api/v1/${other}/${deposit.id}`).expect(404);
      const { body: overview } = await api.get('/api/v1/dashboard?from=2026-02-01&to=2026-02-28');
      expect(overview.expensesCents).toBe('0');
      expect(overview.incomeCents).toBe('0');
      expect(overview.balanceCents).toBeNull();
      await api.delete(`/api/v1/${kind}/${withdrawal.id}`).expect(204);
      await api.delete(`/api/v1/${kind}/${deposit.id}`).expect(204);
      expect((await api.get(`/api/v1/${kind}/summary`)).body.balanceCents).toBe('0');
    },
  );
  it.each(['savings', 'investments'])(
    'filtra %s antes de paginar e incluye notas, fechas e importes legibles',
    async (kind) => {
      const input = {
        name: 'Inversión francés',
        destination: 'Plataforma Ágil',
        direction: 'deposit',
        amountCents: '125075',
        date: '2026-01-31',
        notes: 'Reserva 50%_especial',
      };
      await api.post(`/api/v1/${kind}`).send(input).expect(201);
      await api
        .post(`/api/v1/${kind}`)
        .send({ ...input, amountCents: '1' })
        .expect(201);
      await api
        .post(`/api/v1/${kind}`)
        .send({ ...input, date: '2026-02-01', name: 'Otro' })
        .expect(201);
      for (const search of [
        'frances agil',
        '50%_especial',
        '1.250,75',
        '1250.75',
        '31/01/2026',
        '31 enero 2026',
      ]) {
        const { body: result } = await api
          .get(`/api/v1/${kind}`)
          .query({ search, from: '2026-01-01', to: '2026-01-31', pageSize: 1 })
          .expect(200);
        const moneySearch = search === '1.250,75' || search === '1250.75';
        expect(result.total).toBe(moneySearch ? 1 : 2);
        expect(result.totalCents).toBe(moneySearch ? '125075' : '125076');
        expect(result.items).toHaveLength(1);
      }
      const { body: result } = await api
        .get(`/api/v1/${kind}`)
        .query({
          nameSearch: 'frances',
          destinationSearch: 'agil',
          directionSearch: 'aportacion',
          notesSearch: 'especial',
          amountSearch: '1250.75',
          dateSearch: 'enero',
        })
        .expect(200);
      expect(result.total).toBe(1);
      expect((await api.get(`/api/v1/${kind}/summary`)).body.balanceCents).toBe('250151');
    },
  );
  it('serializa retiradas concurrentes y protege el saldo por destino', async () => {
    const input = {
      name: 'Reserva',
      destination: 'Monedero',
      direction: 'deposit',
      amountCents: '100',
      date: '2026-01-31',
    };
    await api.post('/api/v1/savings').send(input).expect(201);
    const results = await Promise.all(
      [1, 2].map(() =>
        api
          .post('/api/v1/savings')
          .send({ ...input, destination: 'monedero', direction: 'withdrawal', amountCents: '60' }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await api.get('/api/v1/savings/summary')).body.balanceCents).toBe('40');
    const signed = await api.get('/api/v1/savings').query({ amountSearch: '-0,60' }).expect(200);
    expect(signed.body.total).toBe(1);
    expect(signed.body.totalCents).toBe('-60');
    await api
      .post('/api/v1/savings')
      .send({ ...input, destination: 'Otra', direction: 'withdrawal', amountCents: '1' })
      .expect(409);
  });
  it('valida contratos de ahorro/inversión y documenta sus rutas', async () => {
    const input = {
      name: 'Prueba',
      destination: 'Cuenta',
      direction: 'deposit',
      amountCents: '1',
      date: '2026-01-31',
    };
    for (const patch of [
      { amountCents: '0' },
      { amountCents: '-1' },
      { amountCents: '1000000000000' },
      { date: '2199-12-31' },
      { destination: '' },
      { direction: 'expense' },
    ]) {
      await api
        .post('/api/v1/investments')
        .send({ ...input, ...patch })
        .expect(422);
    }
    await api.get('/api/v1/savings?from=2026-02-01&to=2026-01-01').expect(422);
    await api.get('/api/v1/investments?unknown=1').expect(422);
    const { body: spec } = await api.get('/api/v1/openapi.json').expect(200);
    expect(spec.paths['/api/v1/savings/summary']).toBeDefined();
    expect(spec.components.schemas.WealthEntry).toBeDefined();
  });
});
