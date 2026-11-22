import { useMemo } from 'react';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import type { Category, Movement } from '@moneta/shared';
import { DateText, Money } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { MovementDialog } from './movement-dialog';
import { ConfirmDelete } from '@/components/confirm-delete';
export function MovementTable({
  items,
  categories,
  kind = 'expenses',
  compact = false,
}: {
  items: Movement[];
  categories: Category[];
  kind?: 'expenses' | 'income';
  compact?: boolean;
}) {
  const columns = useMemo<ColumnDef<Movement>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Movimiento',
        cell: ({ row }) => (
          <div className="flex items-center gap-2.75 [&_strong]:block [&_strong]:max-w-55 [&_strong]:truncate [&_strong]:text-xs/normal [&_strong]:font-book [&_small]:mt-1 [&_small]:block [&_small]:max-w-55 [&_small]:truncate [&_small]:text-2xs [&_small]:text-muted-foreground">
            <span
              className="grid size-8.5 shrink-0 place-items-center rounded-sm border border-border bg-muted font-semibold text-muted-foreground"
              aria-hidden="true"
            >
              {row.original.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{row.original.name}</strong>
              <small>
                {row.original.concept || 'Sin concepto'}
                {row.original.occurrenceDate && ' · Cobro recurrente'}
              </small>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'categoryId',
        header: 'Categoría',
        cell: ({ row }) => (
          <Badge variant="secondary">
            {categories.find((c) => c.id === row.original.categoryId)?.name ?? 'Sin categoría'}
          </Badge>
        ),
      },
      {
        accessorKey: 'date',
        header: 'Fecha',
        cell: ({ row }) => <DateText value={row.original.date} />,
      },
      {
        accessorKey: 'amountCents',
        header: 'Importe',
        cell: ({ row }) => (
          <Money value={row.original.amountCents} sign={kind === 'income' ? '+' : '−'} />
        ),
      },
      ...(!compact
        ? [
            {
              id: 'actions',
              header: 'Acciones',
              cell: ({ row }: { row: { original: Movement } }) => (
                <div className="flex justify-end">
                  <MovementDialog kind={kind} movement={row.original} />
                  <ConfirmDelete
                    name={row.original.name}
                    path={`/${kind}/${row.original.id}`}
                    description={
                      row.original.occurrenceDate
                        ? 'Se eliminará el gasto registrado. El calendario de la suscripción no retrocederá; corrige el movimiento editándolo si solo necesitas cambiar sus datos.'
                        : undefined
                    }
                  />
                </div>
              ),
            },
          ]
        : []),
    ],
    [categories, kind, compact],
  );
  const table = useReactTable({ data: items, columns, getCoreRowModel: getCoreRowModel() });
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs/normal">
        <caption className="sr-only">
          {kind === 'income' ? 'Ingresos registrados' : 'Gastos registrados'}
        </caption>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((h) => (
                <th
                  className="border-y border-border bg-background px-2.5 py-3 text-2xs font-medium whitespace-nowrap text-muted-foreground first:pl-0 last:text-right"
                  key={h.id}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr className="last:[&_td]:border-b-0" key={row.original.id}>
              {row.getVisibleCells().map((cell) => (
                <td
                  className="border-b border-border px-2.5 py-4 whitespace-nowrap first:pl-0 last:text-right [&_[data-slot=badge]]:text-micro [&_[data-slot=badge]]:font-normal"
                  key={cell.id}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
