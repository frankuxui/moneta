import { useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
} from '@tanstack/react-table';
import type { WealthEntry, WealthKind } from '@moneta/shared';
import { DateText, Money, EmptyState } from '@/components/common';
import { ColumnSearch } from '@/components/column-search';
import { ConfirmDelete } from '@/components/confirm-delete';
import { WealthDialog } from './wealth-dialog';

export function WealthTable({
  kind,
  items,
  destinations,
  columnFilters,
  onColumnFiltersChange,
}: {
  kind: WealthKind;
  items: WealthEntry[];
  destinations: string[];
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
}) {
  const columns = useMemo<ColumnDef<WealthEntry>[]>(
    () => [
      { accessorKey: 'name', header: 'Concepto' },
      { accessorKey: 'destination', header: kind === 'savings' ? 'Cuenta' : 'Plataforma' },
      {
        accessorKey: 'direction',
        header: 'Tipo',
        cell: ({ row }) => (row.original.direction === 'deposit' ? 'Aportación' : 'Retirada'),
      },
      {
        accessorKey: 'date',
        header: 'Fecha',
        cell: ({ row }) => <DateText value={row.original.date} />,
      },
      {
        id: 'amount',
        accessorKey: 'amountCents',
        header: 'Importe',
        cell: ({ row }) => (
          <Money
            value={row.original.amountCents}
            sign={row.original.direction === 'deposit' ? '+' : '−'}
          />
        ),
      },
      {
        accessorKey: 'notes',
        header: 'Notas',
        cell: ({ row }) => (
          <span className="block max-w-60 truncate" title={row.original.notes}>
            {row.original.notes || 'Sin notas'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Acciones',
        enableColumnFilter: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <WealthDialog kind={kind} entry={row.original} destinations={destinations} />
            <ConfirmDelete
              path={`/${kind}/${row.original.id}`}
              name={row.original.name}
              description="El saldo se recalculará. No se puede eliminar una aportación si deja su cuenta o plataforma con saldo negativo."
            />
          </div>
        ),
      },
    ],
    [kind, destinations],
  );
  const table = useReactTable({
    data: items,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    state: { columnFilters },
    onColumnFiltersChange,
  });
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs/normal">
        <caption className="sr-only">
          Historial de {kind === 'savings' ? 'ahorros' : 'inversión'}
        </caption>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className="min-w-32 border-y border-border bg-background px-3 py-3 font-medium text-muted-foreground"
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
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="border-b border-border px-3 py-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState
                  title="No hay movimientos con estos filtros"
                  description="Registra tu primera aportación o cambia las búsquedas del historial."
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
