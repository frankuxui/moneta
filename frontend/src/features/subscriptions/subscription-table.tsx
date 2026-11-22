import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import {
  equivalents,
  matchesSearch,
  type Category,
  type Platform,
  type SubscriptionSummary,
} from '@moneta/shared';
import { cn } from '@/lib/utils';
import { ColumnSearch } from '@/components/column-search';
import { EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { subscriptionSearchData } from './search';
import {
  SubscriptionActions,
  SubscriptionBilling,
  SubscriptionIdentity,
  SubscriptionRenewal,
} from './subscription-cells';
import { SubscriptionDialog } from './subscription-dialog';

type SearchableSubscription = SubscriptionSummary & {
  search: ReturnType<typeof subscriptionSearchData>;
};
const columnLayout = {
  identity: 'col-span-2 @2xl/subscription-list:col-span-4',
  billing: 'col-span-1 @2xl/subscription-list:col-span-4 @5xl/subscription-list:col-span-3',
  renewal: 'col-span-1 @2xl/subscription-list:col-span-4 @5xl/subscription-list:col-span-3',
  actions: 'col-span-2 @2xl/subscription-list:col-span-12 @5xl/subscription-list:col-span-2',
};
type Props = {
  subscriptions: SubscriptionSummary[];
  platforms: Platform[];
  categories: Category[];
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  status: string;
  order: string;
  onReset: () => void;
};

export function SubscriptionTable({
  subscriptions,
  platforms,
  categories,
  globalFilter,
  onGlobalFilterChange,
  status,
  order,
  onReset,
}: Props) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const sorting = useMemo<SortingState>(
    () => [{ id: order === 'cost' ? 'billing' : 'renewal', desc: order === 'cost' }],
    [order],
  );
  const data = useMemo(
    () =>
      subscriptions
        .filter((s) => status === 'all' || s.status === status)
        .map((s) => ({ ...s, search: subscriptionSearchData(s, platforms, categories) })),
    [subscriptions, status, platforms, categories],
  );
  const columns = useMemo<ColumnDef<SearchableSubscription>[]>(
    () => [
      {
        id: 'identity',
        accessorFn: (s) => s.search.identity,
        header: 'Suscripción',
        cell: ({ row }) => (
          <SubscriptionIdentity
            sub={row.original}
            provider={platforms.find((p) => p.id === row.original.platformId)?.name}
          />
        ),
      },
      {
        id: 'billing',
        accessorFn: (s) => s.search.billing,
        header: 'Importe por cobro',
        cell: ({ row }) => <SubscriptionBilling sub={row.original} />,
        sortingFn: (a, b) => {
          const left = BigInt(
              equivalents(a.original.amountCents, a.original.frequency).annualCents,
            ),
            right = BigInt(equivalents(b.original.amountCents, b.original.frequency).annualCents);
          return left === right ? 0 : left < right ? -1 : 1;
        },
      },
      {
        id: 'renewal',
        accessorFn: (s) => s.search.renewal,
        header: 'Próximo cobro',
        cell: ({ row }) => <SubscriptionRenewal sub={row.original} />,
        sortingFn: (a, b) => a.original.nextPaymentDate.localeCompare(b.original.nextPaymentDate),
      },
      {
        id: 'actions',
        header: 'Acciones',
        enableColumnFilter: false,
        enableGlobalFilter: false,
        cell: ({ row }) => <SubscriptionActions sub={row.original} />,
      },
    ],
    [platforms],
  );
  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    state: {
      columnFilters,
      globalFilter,
      sorting,
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: (updater) =>
      onGlobalFilterChange(typeof updater === 'function' ? updater(globalFilter) : String(updater)),
    defaultColumn: {
      filterFn: (row, id, value: string) => matchesSearch(row.getValue<string>(id), value),
    },
    getColumnCanGlobalFilter: (column) => column.id === 'identity',
    globalFilterFn: (row, _column, value: string) =>
      matchesSearch(row.original.search.global, value),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const rows = table.getRowModel().rows;
  const filtered = !!globalFilter || !!columnFilters.length || status !== 'all';
  return (
    <div className="@container/subscription-list">
      <table className="block w-full border-collapse text-left" aria-label="Suscripciones">
        <thead className="block">
          {table.getHeaderGroups().map((group) => (
            <tr
              key={group.id}
              className="grid grid-cols-2 gap-x-6 gap-y-3 pb-3 @2xl/subscription-list:grid-cols-12"
            >
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className={cn(
                    'min-w-0 text-left align-top text-xs/normal font-medium text-muted-foreground',
                    columnLayout[header.column.id as keyof typeof columnLayout],
                    header.column.id === 'actions' &&
                      'hidden text-right @5xl/subscription-list:block',
                  )}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  <ColumnSearch
                    column={header.column}
                    label={String(header.column.columnDef.header)}
                  />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="block">
          {rows.map((row) => (
            <tr
              key={row.id}
              className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-5 border-t border-border py-6 @2xl/subscription-list:grid-cols-12 @5xl/subscription-list:items-center"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={cn(
                    'min-w-0',
                    columnLayout[cell.column.id as keyof typeof columnLayout],
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr className="block border-t border-border">
              <td className="block" colSpan={columns.length}>
                <EmptyState
                  title={
                    filtered
                      ? 'No hay resultados con estos filtros'
                      : 'Todo lo recurrente, bajo control'
                  }
                  description={
                    filtered
                      ? 'Cambia una búsqueda o limpia los filtros para volver a ver tus suscripciones.'
                      : 'Añade una suscripción para conocer sus costes y próximos cobros.'
                  }
                  action={
                    filtered ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          table.resetColumnFilters();
                          onReset();
                        }}
                      >
                        Limpiar búsquedas
                      </Button>
                    ) : (
                      <SubscriptionDialog />
                    )
                  }
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs/normal text-muted-foreground"
        aria-live="polite"
      >
        <span>
          {rows.length} de {subscriptions.length} suscripciones
        </span>
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              table.resetColumnFilters();
              onReset();
            }}
          >
            Limpiar búsquedas
          </Button>
        )}
      </div>
    </div>
  );
}
