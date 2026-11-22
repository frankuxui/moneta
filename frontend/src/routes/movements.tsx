import { useState } from 'react';
import { Search, SlidersHorizontal, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { Movement, Page } from '@moneta/shared';
import { useApi, useCategories } from '@/services/api';
import { EmptyState, ErrorState, Loading, Money, Section } from '@/components/common';
import { MovementDialog } from '@/features/movements/movement-dialog';
import { MovementTable } from '@/features/movements/movement-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
export default function MovementsPage({ kind }: { kind: 'expenses' | 'income' }) {
  const [filters, setFilters] = useState({
    search: '',
    from: '',
    to: '',
    categoryId: '',
    sort: 'date',
    direction: 'desc',
    page: 1,
  });
  const change = (patch: Partial<typeof filters>) =>
    setFilters((v) => ({ ...v, ...patch, page: patch.page ?? 1 }));
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => [k, String(v)]),
  );
  const data = useApi<Page<Movement>>(`/${kind}?${params}`);
  const categories = useCategories();
  const income = kind === 'income';
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">{income ? 'LO QUE RECIBES' : 'CADA MOVIMIENTO CUENTA'}</p>
          <h1>{income ? 'Tus ingresos' : 'Tus gastos'}</h1>
          <p>
            {income
              ? 'Regístralos cuando quieras para conocer tu balance.'
              : 'Un lugar para entender a dónde va tu dinero.'}
          </p>
        </div>
        <MovementDialog kind={kind} />
      </div>
      <div className="ledger-summary">
        <div className="summary-icon">{income ? <ArrowDownLeft /> : <ArrowUpRight />}</div>
        <div>
          <span>Total de {income ? 'ingresos' : 'gastos'} filtrados</span>
          <strong>{data.data ? <Money value={data.data.totalCents} /> : '—'}</strong>
        </div>
        <span className="muted">{data.data?.total ?? '—'} movimientos registrados</span>
      </div>
      <Section title="Historial de movimientos" description="Solo movimientos reales registrados.">
        <div className="table-filters">
          <div className="search-field">
            <Search size={17} />
            <Input
              aria-label="Buscar movimientos"
              placeholder="Buscar por nombre o concepto…"
              value={filters.search}
              onChange={(e) => change({ search: e.target.value })}
            />
          </div>
          <select
            aria-label="Filtrar por categoría"
            value={filters.categoryId}
            onChange={(e) => change({ categoryId: e.target.value })}
          >
            <option value="">Todas las categorías</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <details className="filter-details">
            <summary>
              <SlidersHorizontal size={15} /> Más filtros
            </summary>
            <div className="filter-panel">
              <label>
                Desde
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(e) => change({ from: e.target.value })}
                />
              </label>
              <label>
                Hasta
                <Input
                  type="date"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(e) => change({ to: e.target.value })}
                />
              </label>
              <label>
                Ordenar por
                <select value={filters.sort} onChange={(e) => change({ sort: e.target.value })}>
                  <option value="date">Fecha</option>
                  <option value="amount">Importe</option>
                </select>
              </label>
              <label>
                Dirección
                <select
                  value={filters.direction}
                  onChange={(e) => change({ direction: e.target.value })}
                >
                  <option value="desc">De mayor a menor</option>
                  <option value="asc">De menor a mayor</option>
                </select>
              </label>
              <Button
                variant="ghost"
                onClick={() =>
                  setFilters({
                    search: '',
                    from: '',
                    to: '',
                    categoryId: '',
                    sort: 'date',
                    direction: 'desc',
                    page: 1,
                  })
                }
              >
                Limpiar filtros
              </Button>
            </div>
          </details>
        </div>
        {data.isPending ? (
          <Loading />
        ) : data.isError ? (
          <ErrorState error={data.error} retry={() => void data.refetch()} />
        ) : !data.data.items.length ? (
          <EmptyState
            title={
              filters.search || filters.categoryId || filters.from || filters.to
                ? 'No hay resultados con estos filtros'
                : income
                  ? 'Los ingresos son opcionales'
                  : 'Tu historial empieza aquí'
            }
            description={
              income
                ? 'Cuando añadas un ingreso, Moneta podrá calcular tu balance real.'
                : 'Registra un gasto o prueba a cambiar los filtros.'
            }
            action={<MovementDialog kind={kind} />}
          />
        ) : (
          <>
            <MovementTable items={data.data.items} categories={categories.data ?? []} kind={kind} />
            <div className="pagination">
              <span>
                Página {filters.page} de {Math.max(1, Math.ceil(data.data.total / 20))}
              </span>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === 1}
                  onClick={() => change({ page: filters.page - 1 })}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page * 20 >= data.data.total}
                  onClick={() => change({ page: filters.page + 1 })}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
