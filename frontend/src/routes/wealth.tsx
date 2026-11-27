import { useState } from 'react';
import { Link } from 'react-router';
import type { ColumnFiltersState, OnChangeFn } from '@tanstack/react-table';
import {
  periodRange,
  type Page,
  type WealthEntry,
  type WealthKind,
  type WealthSummary,
} from '@moneta/shared';
import { useApi } from '@/services/api';
import { PageHeader, Section, Money, ErrorState, Loading } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WealthDialog } from '@/features/wealth/wealth-dialog';
import { WealthTable } from '@/features/wealth/wealth-table';

const columnQueries = {
  name: 'nameSearch',
  destination: 'destinationSearch',
  direction: 'directionSearch',
  date: 'dateSearch',
  amount: 'amountSearch',
  notes: 'notesSearch',
} as const;
const initialFilters = {
  search: '',
  nameSearch: '',
  destinationSearch: '',
  directionSearch: '',
  dateSearch: '',
  amountSearch: '',
  notesSearch: '',
  from: '',
  to: '',
  page: 1,
};
export default function WealthPage({ kind }: { kind: WealthKind }) {
  const saving = kind === 'savings';
  const [filters, setFilters] = useState(initialFilters);
  const change = (patch: Partial<typeof filters>) =>
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== '')
      .map(([key, value]) => [key, String(value)]),
  );
  const entries = useApi<Page<WealthEntry>>(`/${kind}?${params}`, { keepPreviousData: true });
  const summary = useApi<WealthSummary>(`/${kind}/summary`);
  const destinations = summary.data?.destinations.map((item) => item.destination) ?? [];
  const columnFilters = Object.entries(columnQueries)
    .filter(([, key]) => filters[key])
    .map(([id, key]) => ({ id, value: filters[key] }));
  const changeColumns: OnChangeFn<ColumnFiltersState> = (updater) => {
    const next = typeof updater === 'function' ? updater(columnFilters) : updater;
    change({
      nameSearch: '',
      destinationSearch: '',
      directionSearch: '',
      dateSearch: '',
      amountSearch: '',
      notesSearch: '',
      ...Object.fromEntries(
        next
          .filter((f) => f.id in columnQueries)
          .map((f) => [columnQueries[f.id as keyof typeof columnQueries], String(f.value)]),
      ),
    });
  };
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        eyebrow={saving ? 'TU TRANQUILIDAD, MES A MES' : 'EL DINERO QUE DESTINAS AL FUTURO'}
        title={saving ? 'Tu monedero de ahorros' : 'Tus inversiones'}
        description={
          saving
            ? 'Contabiliza lo que apartas y lo que retiras de tus ahorros.'
            : 'Registra tus aportaciones y retiradas por plataforma o servicio.'
        }
      >
        <WealthDialog kind={kind} destinations={destinations} />
      </PageHeader>
      <p className="text-sm text-muted-foreground">
        Estos movimientos no se suman a gastos ni ingresos.
        {!saving &&
          ' El capital neto aportado no representa el valor de mercado ni la rentabilidad.'}
      </p>
      {summary.isPending ? (
        <Loading />
      ) : summary.isError ? (
        <ErrorState error={summary.error} retry={() => void summary.refetch()} />
      ) : (
        <>
          <div className="@container/wealth-summary">
            <div className="grid gap-4 @2xl/wealth-summary:grid-cols-3">
              {[
                {
                  label: saving ? 'Saldo ahorrado' : 'Capital neto aportado',
                  amount: summary.data.balanceCents,
                  detail: 'Todas las aportaciones menos retiradas',
                },
                {
                  label: 'Aportaciones de este mes',
                  amount: summary.data.monthDepositsCents,
                  detail: summary.data.month,
                },
                {
                  label: 'Retiradas de este mes',
                  amount: summary.data.monthWithdrawalsCents,
                  detail: summary.data.month,
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="min-w-0 rounded-lg border border-border bg-card p-5"
                >
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="my-3 font-heading text-3xl tabular-nums">
                    <Money value={card.amount} />
                  </p>
                  <p className="text-xs text-muted-foreground">{card.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <Section
            title={saving ? 'Tus cuentas de ahorro' : 'Capital por plataforma'}
            description="Saldos acumulados de todos los registros, independientes de los filtros del historial."
          >
            {!summary.data.destinations.length ? (
              <p className="text-sm text-muted-foreground">
                Registra una aportación para empezar. Puedes indicar tu saldo inicial como primera
                aportación.
              </p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {summary.data.destinations.map((account) => (
                  <li
                    key={account.destination}
                    className="flex min-w-0 flex-wrap justify-between gap-3 rounded-md border border-border p-4"
                  >
                    <span className="break-words">{account.destination}</span>
                    <strong className="tabular-nums">
                      <Money value={account.balanceCents} />
                    </strong>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
      <Section
        title="Historial de movimientos"
        description="Busca todos los registros o selecciona un mes para revisar tus aportaciones y retiradas."
      >
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 text-xs text-muted-foreground">
            Buscar en todos los campos
            <Input
              type="search"
              aria-label="Buscar movimientos"
              placeholder="Concepto, plataforma, notas…"
              maxLength={120}
              value={filters.search}
              onChange={(e) => change({ search: e.target.value })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Mes del historial
            <Input
              type="month"
              aria-label="Mes del historial"
              min="1900-01"
              max="2199-12"
              value={filters.from.slice(0, 7)}
              onChange={(e) =>
                change(
                  e.target.value
                    ? periodRange('month', `${e.target.value}-01`)
                    : { from: '', to: '' },
                )
              }
            />
          </label>
          <Button variant="outline" onClick={() => setFilters(initialFilters)}>
            Limpiar filtros
          </Button>
        </div>
        {entries.isPending ? (
          <Loading />
        ) : entries.isError ? (
          <ErrorState error={entries.error} retry={() => void entries.refetch()} />
        ) : (
          <>
            <div aria-live="polite" className="mb-4 text-sm text-muted-foreground">
              {entries.data.total} movimientos · Neto filtrado:{' '}
              <Money value={entries.data.totalCents} />
              {entries.isFetching && ' · Actualizando…'}
            </div>
            <WealthTable
              kind={kind}
              items={entries.data.items}
              destinations={destinations}
              columnFilters={columnFilters}
              onColumnFiltersChange={changeColumns}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Página {filters.page} de{' '}
                {Math.max(1, Math.ceil(entries.data.total / entries.data.pageSize))}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={filters.page <= 1 || entries.isPlaceholderData}
                  onClick={() => change({ page: filters.page - 1 })}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    filters.page * entries.data.pageSize >= entries.data.total ||
                    entries.isPlaceholderData
                  }
                  onClick={() => change({ page: filters.page + 1 })}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
      </Section>
      <Link
        className="text-sm text-primary underline underline-offset-4"
        to={saving ? '/investments' : '/savings'}
      >
        {saving ? 'Ver inversiones' : 'Ver ahorros'}
      </Link>
    </div>
  );
}
