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
          <div className="movement-name">
            <span className="movement-initial" aria-hidden="true">
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
                <div className="row-actions">
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
    <div className="table-scroll">
      <table>
        <caption className="sr-only">
          {kind === 'income' ? 'Ingresos registrados' : 'Gastos registrados'}
        </caption>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((h) => (
                <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.original.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
