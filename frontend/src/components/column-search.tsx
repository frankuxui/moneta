import type { Column } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';

export function ColumnSearch<T>({ column, label }: { column: Column<T, unknown>; label: string }) {
  if (!column.getCanFilter()) return null;
  return (
    <Input
      type="search"
      aria-label={`Buscar en ${label}`}
      placeholder={`Buscar ${label.toLocaleLowerCase('es')}…`}
      className="mt-2 block h-8 min-w-0 text-xs/normal font-normal"
      maxLength={120}
      value={String(column.getFilterValue() ?? '')}
      onChange={(event) => column.setFilterValue(event.target.value)}
    />
  );
}
