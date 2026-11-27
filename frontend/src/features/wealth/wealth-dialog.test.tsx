import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WealthForm } from './wealth-dialog';
afterEach(() => vi.unstubAllGlobals());
function setup(fail = false) {
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(fail ? { message: 'Saldo insuficiente' } : { id: 'saved' }), {
        status: fail ? 409 : 201,
      }),
  );
  vi.stubGlobal('fetch', fetch);
  const saved = vi.fn();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <WealthForm kind="investments" destinations={[]} onSaved={saved} />
    </QueryClientProvider>,
  );
  return { fetch, saved, user: userEvent.setup() };
}
describe('formulario de ahorros e inversión', () => {
  it('exige destino e importe válido antes de guardar', async () => {
    const { user, fetch } = setup();
    await user.type(screen.getByLabelText('Concepto'), 'Aportación');
    await user.type(screen.getByLabelText('Importe (€)'), '1,234');
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }));
    expect(await screen.findByText('Indica la cuenta o plataforma')).toBeVisible();
    expect(
      await screen.findByText('Importe positivo con un máximo de dos decimales'),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('envía una retirada con céntimos exactos y conserva datos al fallar', async () => {
    const { user, fetch, saved } = setup(true);
    await user.type(screen.getByLabelText('Concepto'), 'Retirada');
    await user.type(screen.getByLabelText('Plataforma o servicio'), 'Mi plataforma');
    await user.type(screen.getByLabelText('Importe (€)'), '1.250,75');
    await user.selectOptions(screen.getByLabelText('Tipo de movimiento'), 'withdrawal');
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Saldo insuficiente');
    expect(screen.getByLabelText('Concepto')).toHaveValue('Retirada');
    const call = (fetch.mock.calls as unknown as [string, RequestInit][])[0];
    if (!call) throw new Error('No se envió el movimiento');
    expect(call[0]).toBe('/api/v1/investments');
    expect(JSON.parse(String(call[1].body))).toMatchObject({
      amountCents: '125075',
      direction: 'withdrawal',
      destination: 'Mi plataforma',
    });
    expect(saved).not.toHaveBeenCalled();
  });
  it('finaliza después de persistir una aportación', async () => {
    const { user, saved } = setup();
    await user.type(screen.getByLabelText('Concepto'), 'Aportación');
    await user.type(screen.getByLabelText('Plataforma o servicio'), 'Mi plataforma');
    await user.type(screen.getByLabelText('Importe (€)'), '0,01');
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  });
});
