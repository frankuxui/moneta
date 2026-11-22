import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MovementForm } from './movement-dialog';
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const calls: { url: string; method?: string; body?: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, body: init?.body as string });
      return new Response(JSON.stringify(init?.method === 'POST' ? { id: 'test' } : []), {
        status: init?.method === 'POST' ? 201 : 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  const saved = vi.fn();
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <MovementForm kind="expenses" onSaved={saved} />
    </QueryClientProvider>,
  );
  return { calls, saved, user: userEvent.setup() };
}
describe('formulario de gasto', () => {
  it('impide enviar importes con más de dos decimales', async () => {
    const { user, calls } = setup();
    await user.type(screen.getByLabelText('Nombre'), 'Compra');
    await user.type(screen.getByLabelText('Importe (€)'), '1,234');
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }));
    expect(
      await screen.findByText('Importe positivo, con un máximo de dos decimales'),
    ).toBeVisible();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });
  it('envía céntimos exactos y finaliza tras guardar', async () => {
    const { user, calls, saved } = setup();
    await user.type(screen.getByLabelText('Nombre'), 'Compra');
    await user.type(screen.getByLabelText('Importe (€)'), '23,65');
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    const sent = JSON.parse(calls.find((c) => c.method === 'POST')?.body ?? '{}');
    expect(sent.amountCents).toBe('2365');
    expect(sent.categoryId).toBeNull();
    expect(sent.amount).toBeUndefined();
  });
  it('muestra un fallo de persistencia y conserva lo escrito', async () => {
    const { user, saved } = setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: 'Base de datos no disponible' }), { status: 503 }),
      ),
    );
    await user.type(screen.getByLabelText('Nombre'), 'Compra');
    await user.type(screen.getByLabelText('Importe (€)'), '23,65');
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }));
    expect(await screen.findByText('Base de datos no disponible')).toBeVisible();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Compra');
    expect(saved).not.toHaveBeenCalled();
  });
});
