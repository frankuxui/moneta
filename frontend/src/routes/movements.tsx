import { useState } from 'react';
import { Search, SlidersHorizontal, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { Movement, Page } from '@moneta/shared';
import { useApi, useCategories } from '@/services/api';
import { PageHeader, EmptyState, ErrorState, Loading, Money, Section } from '@/components/common';
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
    <div className="flex flex-col gap-5 md:gap-6.25 2xl:gap-7.25">
      <PageHeader
        eyebrow={income ? 'LO QUE RECIBES' : 'CADA MOVIMIENTO CUENTA'}
        title={income ? 'Tus ingresos' : 'Tus gastos'}
        description={
          income
            ? 'Regístralos cuando quieras para conocer tu balance.'
            : 'Un lugar para entender a dónde va tu dinero.'
        }
      >
        <MovementDialog kind={kind} />
      </PageHeader>
      <div className="flex flex-wrap items-center gap-4.25 rounded-lg border border-border bg-card p-4.75 md:flex-nowrap md:px-6.5 md:py-5.75 [&>div>span]:text-xs/normal [&>div>span]:text-muted-foreground [&_strong]:mt-1 [&_strong]:block [&_strong]:font-heading [&_strong]:text-3xl/normal [&_strong]:font-book [&>span]:ml-15.75 [&>span]:w-full [&>span]:text-caption md:[&>span]:ml-auto md:[&>span]:w-auto md:[&>span]:text-xs/normal">
        <div className="grid size-11.5 place-items-center rounded-lg bg-accent text-primary">
          {income ? <ArrowDownLeft /> : <ArrowUpRight />}
        </div>
        <div>
          <span>Total de {income ? 'ingresos' : 'gastos'} filtrados</span>
          <strong>{data.data ? <Money value={data.data.totalCents} /> : '—'}</strong>
        </div>
        <span className="text-muted-foreground">
          {data.data?.total ?? '—'} movimientos registrados
        </span>
      </div>
      <Section title="Historial de movimientos" description="Solo movimientos reales registrados.">
        <div className="@container/filters mb-5 flex flex-wrap items-center gap-2.25 md:gap-3 [&>input]:max-w-85 [&_select]:text-xs/normal">
          <div className="relative min-w-50 flex-1 [&>svg]:absolute [&>svg]:top-2.75 [&>svg]:left-3 [&>svg]:text-muted-foreground [&>input]:pl-9.25">
            <Search size={17} />
            <Input
              aria-label="Buscar movimientos"
              placeholder="Buscar por nombre o concepto…"
              value={filters.search}
              onChange={(e) => change({ search: e.target.value })}
            />
          </div>
          <select
            className="min-h-9.5 max-w-full cursor-pointer rounded-sm border border-input bg-card py-2 pr-8 pl-3 text-inherit"
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
          <details className="relative">
            <summary className="cursor-pointer text-xs/normal text-muted-foreground">
              <SlidersHorizontal size={15} /> Más filtros
            </summary>
            <div className="absolute top-11.25 right-0 z-15 grid min-w-70 gap-3.25 rounded-lg border border-border bg-popover p-5 shadow-floating [&>label]:flex [&>label]:flex-col [&>label]:gap-1.5 [&>label]:text-xs/normal">
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
                <select
                  className="min-h-9.5 max-w-full cursor-pointer rounded-sm border border-input bg-card py-2 pr-8 pl-3 text-inherit"
                  value={filters.sort}
                  onChange={(e) => change({ sort: e.target.value })}
                >
                  <option value="date">Fecha</option>
                  <option value="amount">Importe</option>
                </select>
              </label>
              <label>
                Dirección
                <select
                  className="min-h-9.5 max-w-full cursor-pointer rounded-sm border border-input bg-card py-2 pr-8 pl-3 text-inherit"
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
            <div className="mt-2.5 flex items-center justify-between border-t border-border pt-5 text-caption text-muted-foreground [&>div]:flex [&>div]:gap-2">
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
