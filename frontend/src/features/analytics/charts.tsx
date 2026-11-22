import { useMemo } from 'react';
import { eachDayOfInterval, parseISO, format, startOfWeek, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { daysInRange, formatMoney, isoDate, type Overview } from '@moneta/shared';
import { ColorSwatch, EmptyState } from '@/components/common';
export function SpendingChart({
  data,
  showIncome = false,
}: {
  data: Overview;
  showIncome?: boolean;
}) {
  const series = useMemo(() => {
    const duration = daysInRange(data.from, data.to),
      buckets = new Map<string, { date: string; expense: bigint; income: bigint }>();
    const key = (day: Date) =>
      isoDate(
        duration > 366
          ? startOfMonth(day)
          : duration > 60
            ? startOfWeek(day, { weekStartsOn: 1 })
            : day,
      );
    for (const day of eachDayOfInterval({ start: parseISO(data.from), end: parseISO(data.to) })) {
      const date = key(day);
      if (!buckets.has(date)) buckets.set(date, { date, expense: 0n, income: 0n });
    }
    for (const item of data.series) {
      const bucket = buckets.get(key(parseISO(item.date)));
      if (bucket) {
        bucket.expense += BigInt(item.expensesCents);
        bucket.income += BigInt(item.incomeCents);
      }
    }
    return [...buckets.values()].map((b) => ({
      date: format(parseISO(b.date), duration > 366 ? 'MMM yy' : 'd MMM', { locale: es }),
      expense: Number(b.expense),
      income: Number(b.income),
      expensesCents: b.expense.toString(),
      incomeCents: b.income.toString(),
    }));
  }, [data]);
  if (!data.series.length)
    return (
      <div className="grid min-h-55 place-items-center rounded-sm bg-chart-grid lg:min-h-67.5 [&>[data-slot=empty]]:min-w-0 [&>[data-slot=empty]]:max-w-75 [&>[data-slot=empty]]:rounded-lg [&>[data-slot=empty]]:bg-card [&>[data-slot=empty]]:p-4.5 [&_[data-slot=empty-title]]:text-xs/normal [&_[data-slot=empty-description]]:text-caption">
        <EmptyState
          title="Tu evolución empieza con el primer registro"
          description="Aquí verás los gastos reales del período seleccionado."
        />
      </div>
    );
  return (
    <div
      className="h-65 w-full min-w-0 lg:h-63.75 2xl:h-72.5"
      role="img"
      aria-label={`Evolución de gastos. Total: ${formatMoney(data.expensesCents)}. Datos detallados en el historial.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={series}
          margin={{ top: 20, right: 12, left: 0, bottom: 0 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id="expense-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            minTickGap={32}
            tick={{ className: 'fill-muted-foreground! text-caption' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={58}
            tickFormatter={(v) =>
              new Intl.NumberFormat('es-ES', {
                notation: 'compact',
                maximumFractionDigits: 1,
              }).format(Number(v) / 100) + ' €'
            }
            tick={{ className: 'fill-muted-foreground! text-caption' }}
          />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.[0] ? (
                <div className="flex flex-col gap-1.75 rounded-sm border border-border bg-popover p-3 text-xs/normal shadow-chart">
                  <strong>{label}</strong>
                  <span>Gastos: {formatMoney(payload[0].payload.expensesCents)}</span>
                  {showIncome && (
                    <span>Ingresos: {formatMoney(payload[0].payload.incomeCents)}</span>
                  )}
                </div>
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            fill="url(#expense-fill)"
            name="Gastos"
            isAnimationActive={false}
          />
          {showIncome && (
            <Area
              type="monotone"
              dataKey="income"
              stroke="var(--chart-2)"
              strokeWidth={2}
              fill="transparent"
              name="Ingresos"
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function CategoriesChart({ data }: { data: Overview }) {
  if (!data.categories.length)
    return (
      <div className="grid min-h-55 place-items-center rounded-sm bg-chart-grid lg:min-h-67.5 [&>[data-slot=empty]]:min-w-0 [&>[data-slot=empty]]:max-w-75 [&>[data-slot=empty]]:rounded-lg [&>[data-slot=empty]]:bg-card [&>[data-slot=empty]]:p-4.5 [&_[data-slot=empty-title]]:text-xs/normal [&_[data-slot=empty-description]]:text-caption">
        <EmptyState
          title="Cada gasto encontrará su lugar"
          description="Asigna categorías a tus gastos para ver su distribución."
        />
      </div>
    );
  const values = data.categories.map((c) => ({ ...c, value: Number(c.amountCents) }));
  return (
    <div>
      <div
        className="relative h-52.5 lg:h-51.25"
        role="img"
        aria-label="Distribución de gastos por categoría"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={values}
              dataKey="value"
              nameKey="name"
              innerRadius="65%"
              outerRadius="90%"
              paddingAngle={3}
              stroke="none"
              isAnimationActive={false}
            >
              {values.map((c) => (
                <Cell key={c.id} fill={c.color} />
              ))}
            </Pie>
            <Tooltip formatter={(_v, _n, item) => formatMoney(item.payload.amountCents)} />
            <Legend content={() => null} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center [&>span]:text-2xs [&>span]:text-muted-foreground [&>strong]:mt-1.5 [&>strong]:text-lg/normal [&>strong]:tracking-tight [&>strong]:tabular-nums">
          <span>Total gastado</span>
          <strong>{formatMoney(data.expensesCents)}</strong>
        </div>
      </div>
      <ul className="mt-3 grid list-none grid-cols-1 gap-2.75 p-0 md:grid-cols-2 md:gap-3.25 lg:flex lg:flex-col lg:gap-2.75 [&>li]:flex [&>li]:justify-between [&>li]:gap-3 [&>li]:text-caption [&_li>span]:flex [&_li>span]:items-center [&_li>span]:gap-1.75 [&_li>span]:text-muted-foreground [&_strong]:font-medium [&_strong]:tabular-nums">
        {data.categories.map((c) => (
          <li key={c.id}>
            <span>
              <ColorSwatch color={c.color} className="size-1.75" />
              {c.name}
            </span>
            <strong>{formatMoney(c.amountCents)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
