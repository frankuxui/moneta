import { z } from 'zod';
import {
  movementInput,
  subscriptionInput,
  categoryInput,
  platformInput,
  settingsInput,
  confirmInput,
  movementOutput,
  createPatchSchema,
  subscriptionSummaryOutput,
  subscriptionOutput,
  categoryOutput,
  platformOutput,
} from '@moneta/shared';
const schema = (value: z.ZodType, io: 'input' | 'output' = 'input') =>
  z.toJSONSchema(value, { target: 'openapi-3.0', io });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (value: unknown) => ({ 'application/json': { schema: value } });
const error = {
  description: 'Error de validación, recurso inexistente o conflicto',
  content: json(ref('Error')),
};
const paths: Record<string, unknown> = {};
for (const [path, name, paginated] of [
  ['expenses', 'Movement', true],
  ['income', 'Movement', true],
  ['subscriptions', 'Subscription', false],
  ['categories', 'Category', false],
  ['platforms', 'Platform', false],
] as const) {
  paths[`/api/v1/${path}`] = {
    get: {
      summary: `Listar ${path}`,
      parameters: paginated
        ? [
            ...[
              'search',
              'nameSearch',
              'categorySearch',
              'dateSearch',
              'amountSearch',
              'from',
              'to',
              'categoryId',
            ].map((name) => ({
              name,
              in: 'query',
              schema: { type: 'string' },
            })),
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['date', 'amount'] } },
            { name: 'direction', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            },
          ]
        : [],
      responses: {
        200: {
          description: 'Listado',
          content: json(
            paginated
              ? {
                  type: 'object',
                  properties: {
                    items: { type: 'array', items: ref(name) },
                    total: { type: 'integer' },
                    totalCents: { type: 'string' },
                    page: { type: 'integer' },
                    pageSize: { type: 'integer' },
                  },
                }
              : {
                  type: 'array',
                  items: ref(name === 'Subscription' ? 'SubscriptionSummary' : name),
                },
          ),
        },
        422: error,
      },
    },
    post: {
      summary: `Crear ${path}`,
      requestBody: { required: true, content: json(ref(`${name}Input`)) },
      responses: {
        201: { description: 'Creado', content: json(ref(name)) },
        409: error,
        422: error,
      },
    },
  };
  paths[`/api/v1/${path}/{id}`] = {
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    get: { responses: { 200: { description: 'Registro', content: json(ref(name)) }, 404: error } },
    patch: {
      requestBody: { required: true, content: json(ref(`${name}Patch`)) },
      responses: {
        200: { description: 'Actualizado', content: json(ref(name)) },
        404: error,
        409: error,
        422: error,
      },
    },
    delete: { responses: { 204: { description: 'Eliminado' }, 404: error, 409: error } },
  };
}
paths['/api/v1/subscriptions/{id}/confirm'] = {
  post: {
    summary: 'Confirmar vencimiento (idempotente)',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    requestBody: { required: true, content: json(schema(confirmInput)) },
    responses: {
      200: { description: 'Ya confirmado', content: json(ref('Movement')) },
      201: { description: 'Gasto creado', content: json(ref('Movement')) },
      409: error,
      422: error,
    },
  },
};
paths['/api/v1/settings'] = {
  get: { responses: { 200: { description: 'Preferencias', content: json(ref('Settings')) } } },
  put: {
    requestBody: { required: true, content: json(ref('Settings')) },
    responses: { 200: { description: 'Guardadas', content: json(ref('Settings')) }, 422: error },
  },
};
for (const name of ['dashboard', 'analytics'])
  paths[`/api/v1/${name}`] = {
    get: {
      parameters: ['from', 'to'].map((name) => ({
        name,
        in: 'query',
        schema: { type: 'string', format: 'date' },
      })),
      responses: {
        200: {
          description:
            'Cifras reales y proyecciones separadas. variationPercent en centésimas de porcentaje; null si no hay base anterior.',
          content: json(ref('Overview')),
        },
        422: error,
      },
    },
  };
paths['/api/v1/health'] = {
  get: {
    responses: {
      200: { description: 'Base de datos disponible' },
      503: { description: 'Base de datos no disponible' },
    },
  },
};
const schemas: Record<string, unknown> = {
  Settings: schema(settingsInput),
  Error: {
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' },
      details: { type: 'array', items: { type: 'object' } },
    },
  },
};
for (const [name, input, output] of [
  ['Movement', movementInput, movementOutput],
  ['Subscription', subscriptionInput, subscriptionOutput],
  ['Category', categoryInput, categoryOutput],
  ['Platform', platformInput, platformOutput],
] as const) {
  schemas[`${name}Input`] = schema(input);
  schemas[`${name}Patch`] = schema(createPatchSchema(input));
  schemas[name] = schema(output, 'output');
}
schemas.SubscriptionSummary = schema(subscriptionSummaryOutput, 'output');
schemas.Overview = {
  type: 'object',
  properties: Object.fromEntries([
    ...[
      'expensesCents',
      'incomeCents',
      'weekCents',
      'monthCents',
      'yearCents',
      'previousExpensesCents',
      'monthlyCents',
      'annualCents',
      'projectedCents',
      'averageCents',
      'recurringCents',
      'oneOffCents',
    ].map((n) => [n, { type: 'string', pattern: '^\\d+$' }]),
    ['from', { type: 'string', format: 'date' }],
    ['to', { type: 'string', format: 'date' }],
    ['balanceCents', { type: 'string', nullable: true }],
    ['variationPercent', { type: 'string', nullable: true }],
    ['incomeCount', { type: 'integer' }],
    ['activeSubscriptions', { type: 'integer' }],
    ['recent', { type: 'array', items: ref('Movement') }],
    ['costliest', { type: 'array', items: ref('Subscription') }],
    [
      'categories',
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            color: { type: 'string' },
            amountCents: { type: 'string' },
          },
        },
      },
    ],
    [
      'series',
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' },
            expensesCents: { type: 'string' },
            incomeCents: { type: 'string' },
          },
        },
      },
    ],
    [
      'upcoming',
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            date: { type: 'string', format: 'date' },
            amountCents: { type: 'string' },
          },
        },
      },
    ],
  ]),
};
export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Moneta API',
    version: '1.0.0',
    description:
      'Aplicación privada LAN. Céntimos serializados como cadenas; fechas de calendario ISO. Sin autenticación.',
  },
  paths,
  components: { schemas },
};
