import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { subscriptionSummaryOutput } from '@moneta/shared';
import { Input } from '@/components/ui/input';
import { SubscriptionTable } from './subscription-table';

const category = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Formación',
  color: '#287f83',
};
const provider = { id: '22222222-2222-4222-8222-222222222222', name: 'Academia' };
const subscriptions = [
  subscriptionSummaryOutput.parse({
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Curso francés',
    amountCents: '125075',
    categoryId: category.id,
    platformId: provider.id,
    frequency: 'annual',
    startDate: '2026-01-05',
    nextPaymentDate: '2027-01-05',
    anchorDay: 5,
    createdAt: '2026-01-01',
    paidCents: '125075',
    paymentCount: 1,
    notes: 'Referencia privada',
    url: 'https://example.com/idiomas',
  }),
  subscriptionSummaryOutput.parse({
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Música',
    amountCents: '999',
    frequency: 'monthly',
    status: 'paused',
    startDate: '2026-01-01',
    nextPaymentDate: '2026-11-30',
    anchorDay: 30,
    createdAt: '2026-01-01',
    paidCents: '0',
    paymentCount: 0,
  }),
];
function Harness() {
  const [search, setSearch] = useState('');
  return (
    <>
      <Input
        aria-label="Buscar suscripciones"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <SubscriptionTable
        subscriptions={subscriptions}
        platforms={[provider]}
        categories={[category]}
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        status="all"
        order="date"
        onReset={() => setSearch('')}
      />
    </>
  );
}
function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}
describe('tabla de suscripciones', () => {
  it('busca globalmente campos visibles, notas, categoría, URL, fechas y dinero', async () => {
    const user = setup();
    const input = screen.getByRole('textbox', { name: 'Buscar suscripciones' });
    for (const value of [
      'FRANCES academia',
      'formacion',
      'referencia privada',
      'example.com/idiomas',
      '1.250,75',
      '1250.75',
      '5 ene 2027',
    ]) {
      await user.clear(input);
      await user.type(input, value);
      const table = screen.getByRole('table', { name: 'Suscripciones' });
      expect(within(table).getByText('Curso francés')).toBeVisible();
      expect(within(table).queryByText('Música')).not.toBeInTheDocument();
    }
    await user.clear(input);
    await user.type(input, 'pausada');
    expect(screen.getByText('Música')).toBeVisible();
    expect(screen.queryByText('Curso francés')).not.toBeInTheDocument();
  });
  it('combina los inputs de cada columna y conserva los filtros al quedar vacío', async () => {
    const user = setup();
    expect(screen.getAllByRole('searchbox')).toHaveLength(3);
    expect(screen.queryByRole('searchbox', { name: 'Buscar en Acciones' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar en Suscripción' }), 'academia');
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar en Importe por cobro' }),
      'anual',
    );
    const renewal = screen.getByRole('searchbox', { name: 'Buscar en Próximo cobro' });
    await user.type(renewal, 'pausada');
    expect(screen.getByText('No hay resultados con estos filtros')).toBeVisible();
    expect(renewal).toHaveFocus();
    await user.clear(renewal);
    expect(screen.getByText('Curso francés')).toBeVisible();
    expect(screen.queryByText('Música')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpiar búsquedas' }));
    expect(screen.getByText('Música')).toBeVisible();
    for (const input of screen.getAllByRole('searchbox')) expect(input).toHaveValue('');
  });
});
