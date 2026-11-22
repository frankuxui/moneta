import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  format,
  isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, Wallet, CircleCheck } from 'lucide-react';
import {
  formatMoney,
  isoDate,
  todayMadrid,
  type SubscriptionSummary,
  type Overview,
} from '@moneta/shared';
import { useApi, usePlatforms, useCategories } from '@/services/api';
import {
  PageHeader,
  ErrorState,
  Loading,
  Money,
  DateText,
  Section,
  Hint,
} from '@/components/common';
import { SubscriptionDialog } from '@/features/subscriptions/subscription-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubscriptionTable } from '@/features/subscriptions/subscription-table';
export default function SubscriptionsPage() {
  const subscriptions = useApi<SubscriptionSummary[]>('/subscriptions'),
    platforms = usePlatforms(),
    categories = useCategories();
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('all'),
    [order, setOrder] = useState('date');
  const [month, setMonth] = useState(() => startOfMonth(new Date(`${todayMadrid()}T12:00:00`)));
  const summary = useApi<Overview>(
    `/dashboard?from=${isoDate(startOfMonth(month))}&to=${isoDate(endOfMonth(month))}`,
  );
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  return (
    <div className="flex flex-col gap-5 md:gap-6.25 2xl:gap-7.25">
      <PageHeader
        eyebrow="SIN PERDER DE VISTA LO RECURRENTE"
        title="Tus suscripciones"
        description="Conoce tus compromisos. Confirma lo que ya has pagado."
      >
        <SubscriptionDialog />
      </PageHeader>
      {summary.data && (
        <section
          aria-label="Resumen de suscripciones"
          className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5"
        >
          <article className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm/normal font-medium text-muted-foreground">
                Suscripciones activas
              </h2>
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                <CircleCheck className="size-5" />
              </span>
            </div>
            <p className="mt-5 overflow-x-auto pb-1 font-heading text-4xl/none font-semibold tracking-tight text-foreground lg:text-5xl/none">
              {summary.data.activeSubscriptions}
            </p>
            <p className="mt-3 text-xs/normal leading-copy text-muted-foreground">
              Tus compromisos recurrentes actuales
            </p>
          </article>
          <article className="flex min-w-0 flex-col rounded-lg border border-highlight bg-highlight p-6 text-highlight-foreground shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-highlight-muted">
                <h2 className="text-sm/normal font-medium">Equivalente mensual</h2>
                <Hint text="Equivalencia presupuestaria de las suscripciones activas: los pagos semanales se anualizan con 52 semanas. No es el gasto real del mes." />
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10">
                <Wallet className="size-5" />
              </span>
            </div>
            <p className="mt-5 overflow-x-auto pb-1 font-heading text-4xl/none font-semibold tracking-tight lg:text-5xl/none">
              <Money value={summary.data.monthlyCents} />
            </p>
            <p className="mt-3 text-xs/normal leading-copy text-highlight-muted">
              Coste recurrente equivalente al mes
            </p>
          </article>
          <article className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm/normal font-medium text-muted-foreground">
                Equivalente anual
              </h2>
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                <CalendarDays className="size-5" />
              </span>
            </div>
            <p className="mt-5 overflow-x-auto pb-1 font-heading text-4xl/none font-semibold tracking-tight text-foreground lg:text-5xl/none">
              <Money value={summary.data.annualCents} />
            </p>
            <p className="mt-3 text-xs/normal leading-copy text-muted-foreground">
              Coste recurrente equivalente al año
            </p>
          </article>
        </section>
      )}
      <Section
        title="Todas tus suscripciones"
        description="Los cobros futuros no se suman a tus gastos."
      >
        <div className="@container/filters mb-5 flex flex-wrap items-center gap-2.25 md:gap-3 [&>input]:max-w-85 [&_select]:text-xs/normal">
          <Input
            aria-label="Buscar suscripciones"
            placeholder="Buscar en todos los campos…"
            maxLength={120}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="min-h-9.5 max-w-full cursor-pointer rounded-sm border border-input bg-card py-2 pr-8 pl-3 text-inherit"
            aria-label="Estado"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="paused">Pausadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
          <select
            className="min-h-9.5 max-w-full cursor-pointer rounded-sm border border-input bg-card py-2 pr-8 pl-3 text-inherit"
            aria-label="Orden de suscripciones"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="date">Por próximo cobro</option>
            <option value="cost">Por coste equivalente</option>
          </select>
        </div>
        {subscriptions.isPending ? (
          <Loading />
        ) : subscriptions.isError ? (
          <ErrorState error={subscriptions.error} retry={() => void subscriptions.refetch()} />
        ) : (
          <SubscriptionTable
            subscriptions={subscriptions.data}
            platforms={platforms.data ?? []}
            categories={categories.data ?? []}
            globalFilter={search}
            onGlobalFilterChange={setSearch}
            status={status}
            order={order}
            onReset={() => {
              setSearch('');
              setStatus('all');
            }}
          />
        )}
      </Section>
      <Section
        title="Calendario de pagos previstos"
        description="Previsiones desde el siguiente cobro pendiente; confirma los vencidos para actualizar el calendario."
        action={
          <div className="flex items-center gap-1.5 md:gap-2.5 [&>strong]:min-w-25 [&>strong]:text-center [&>strong]:text-xs/normal [&>strong]:font-medium [&>strong]:capitalize">
            <Button
              variant="outline"
              size="icon"
              aria-label="Mes anterior"
              onClick={() => setMonth((m) => addMonths(m, -1))}
            >
              <ChevronLeft />
            </Button>
            <strong>{format(month, 'MMMM yyyy', { locale: es })}</strong>
            <Button
              variant="outline"
              size="icon"
              aria-label="Mes siguiente"
              onClick={() => setMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        }
      >
        {summary.isError ? (
          <ErrorState error={summary.error} />
        ) : summary.isPending ? (
          <Loading />
        ) : (
          <>
            <div
              className="hidden grid-cols-7 overflow-hidden rounded-sm border border-border md:grid"
              role="table"
              aria-label="Calendario de pagos"
            >
              <div
                className="contents [&>span]:bg-background [&>span]:p-2.75 [&>span]:text-center [&>span]:text-caption [&>span]:text-muted-foreground"
                role="row"
              >
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                  <span role="columnheader" key={d}>
                    {d}
                  </span>
                ))}
              </div>
              {days.map((d) => {
                const date = isoDate(d),
                  payments = summary.data.upcoming.filter((p) => p.date === date);
                return (
                  <div
                    className={cn(
                      'flex min-h-25 flex-col gap-1.5 border-t border-r border-border p-2.25 text-xs/normal [&>time]:text-caption [&>time]:text-muted-foreground',
                      !isSameMonth(d, month) && 'bg-background opacity-50',
                      date === todayMadrid() &&
                        'bg-accent [&>time]:text-primary [&>time]:font-bold',
                    )}
                    key={date}
                    role="cell"
                  >
                    <time dateTime={date}>{format(d, 'd')}</time>
                    {payments.map((p) => (
                      <div
                        className="flex flex-col gap-0.75 overflow-hidden rounded-sm bg-secondary p-1.25 text-micro [&>span:first-child]:truncate"
                        key={p.subscriptionId}
                        title={`${p.name}: ${formatMoney(p.amountCents)}`}
                      >
                        <span>{p.name}</span>
                        <Money value={p.amountCents} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <p className="mt-4.5 flex flex-wrap items-center gap-2 text-caption text-muted-foreground md:flex-nowrap md:text-xs/normal [&_[data-money]]:font-semibold [&_[data-money]]:text-foreground">
              <CalendarDays size={16} /> Previsto en {format(month, 'MMMM', { locale: es })}:{' '}
              <Money value={summary.data.projectedCents} />
            </p>
            <div className="mt-3.75 block md:hidden [&>div]:flex [&>div]:justify-between [&>div]:gap-2.5 [&>div]:border-t [&>div]:border-border [&>div]:py-3.25 [&>div]:text-caption [&_time]:text-muted-foreground [&>p]:text-xs/normal [&>p]:text-muted-foreground">
              {summary.data.upcoming.length ? (
                summary.data.upcoming.map((p) => (
                  <div key={`${p.subscriptionId}-${p.date}`}>
                    <DateText value={p.date} />
                    <strong>{p.name}</strong>
                    <Money value={p.amountCents} />
                  </div>
                ))
              ) : (
                <p>No hay pagos previstos en este mes.</p>
              )}
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
