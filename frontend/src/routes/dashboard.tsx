import {
  ArrowUpRight,
  CalendarDays,
  Repeat2,
  Wallet,
  ArrowDownLeft,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router';
import { type Overview } from '@moneta/shared';
import { useApi, useCategories, useSettings } from '@/services/api';
import {
  PageHeader,
  DateText,
  EmptyState,
  ErrorState,
  Hint,
  Loading,
  Money,
  Section,
  TextLink,
  useRange,
} from '@/components/common';
import { MovementDialog } from '@/features/movements/movement-dialog';
import { MovementTable } from '@/features/movements/movement-table';
import { SpendingChart, CategoriesChart } from '@/features/analytics/charts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
export default function DashboardPage() {
  const { picker, query, valid } = useRange();
  const result = useApi<Overview>(`/dashboard?${query}`),
    categories = useCategories(),
    settings = useSettings();
  const data = result.data;
  return (
    <div className="flex flex-col gap-5 md:gap-6.25 2xl:gap-7.25">
      <PageHeader
        eyebrow="UNA VISIÓN CLARA DE TU DINERO"
        title={
          <>
            Tu resumen financiero<span className="text-primary">.</span>
          </>
        }
        description="Menos suposiciones. Más claridad para tu día a día."
      >
        {picker}
      </PageHeader>
      {!valid ? (
        <p role="alert">Selecciona un rango de fechas válido.</p>
      ) : result.isPending ? (
        <Loading />
      ) : result.isError ? (
        <ErrorState error={result.error} retry={() => void result.refetch()} />
      ) : (
        data && (
          <>
            <div className="grid grid-cols-1 gap-4 md:gap-5.5 lg:grid-cols-[1fr_1.2fr] xl:grid-cols-[1fr_1.45fr]">
              <section className="relative overflow-hidden rounded-lg bg-highlight p-6.25 text-highlight-foreground lg:px-6.75 2xl:p-7.5">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-15 -right-20 size-50 rounded-full border border-white/5 before:absolute before:-inset-7 before:rounded-full before:border-28 before:border-white/1 after:absolute after:-inset-14 after:rounded-full after:border-28 after:border-white/1"
                />
                <div className="flex items-center justify-between [&>[data-eyebrow]]:text-micro [&>[data-eyebrow]]:tracking-overline [&>[data-eyebrow]]:text-highlight-muted">
                  <span
                    data-eyebrow
                    className="text-overline font-demi tracking-overline text-muted-foreground md:text-micro"
                  >
                    GASTO REAL DEL PERÍODO
                  </span>
                  <span className="grid size-8 place-items-center rounded-sm border border-white/7 bg-white/5">
                    <ArrowUpRight size={20} />
                  </span>
                </div>
                <div className="mt-3.25 font-heading text-amount-mobile leading-amount font-medium tracking-tighter wrap-anywhere md:text-amount xl:text-amount 2xl:text-5xl">
                  <Money value={data.expensesCents} />
                </div>
                <div className="relative z-1 mt-3 flex items-center gap-1.75 [&_[data-slot=badge]]:border-white/15 [&_[data-slot=badge]]:px-2 [&_[data-slot=badge]]:py-1 [&_[data-slot=badge]]:text-2xs [&_[data-slot=badge]]:font-normal [&_[data-slot=badge]]:whitespace-normal [&_[data-slot=badge]]:text-highlight-muted">
                  <Badge variant="outline">
                    {data.variationPercent === null
                      ? 'Sin base de comparación'
                      : `${BigInt(data.variationPercent) > 0n ? '+' : ''}${Number(data.variationPercent) / 100}% frente al período anterior`}
                  </Badge>
                  <Hint text="Se compara con los mismos días inmediatamente anteriores. Las previsiones de suscripciones no se incluyen." />
                </div>
                <div className="mt-4.5 mb-3.75 h-px bg-white/10 lg:mt-5.75" />
                <div className="flex gap-2.25 text-caption text-highlight-muted">
                  <DateText value={data.from} />
                  <span>—</span>
                  <DateText value={data.to} />
                </div>
              </section>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2 lg:gap-4.25">
                <Metric
                  icon={<CalendarDays />}
                  label="Esta semana"
                  value={<Money value={data.weekCents} />}
                  note="De lunes a domingo"
                />
                <Metric
                  icon={<Wallet />}
                  label="Este mes"
                  value={<Money value={data.monthCents} />}
                  note="Gastos registrados"
                />
                <Metric
                  icon={<ArrowUpRight />}
                  label="Este año"
                  value={<Money value={data.yearCents} />}
                  note="Desde el 1 de enero"
                />
                <Metric
                  icon={<ArrowDownLeft />}
                  label="Balance del período"
                  value={
                    data.balanceCents === null ? (
                      'Sin ingresos'
                    ) : (
                      <Money value={data.balanceCents} />
                    )
                  }
                  note={
                    data.balanceCents === null
                      ? 'Añade ingresos para calcularlo'
                      : 'Ingresos menos gastos reales'
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 items-stretch gap-5.5 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.6fr_1fr]">
              <Section
                title="Cómo evoluciona tu gasto"
                description="Movimientos reales del período"
                action={<TextLink to="/analytics">Ver analíticas</TextLink>}
              >
                <SpendingChart data={data} />
                <div className="mt-3 flex justify-between gap-3.75 border-t border-border pt-4 text-micro text-muted-foreground md:text-2xs [&_span]:flex [&_span]:items-center [&_span]:gap-1.75 [&_i]:inline-block [&_i]:size-1.75 [&_i]:rounded-full [&_i]:bg-chart-1 [&_strong]:font-normal [&_[data-money]]:ml-1.5 [&_[data-money]]:font-semibold [&_[data-money]]:text-foreground">
                  <span>
                    <i /> Gastos registrados
                  </span>
                  <strong>
                    Media diaria <Money value={data.averageCents} />
                  </strong>
                </div>
              </Section>
              <Section title="¿En qué lo gastas?" description="Distribución por categoría">
                <CategoriesChart data={data} />
              </Section>
            </div>
            <div className="grid grid-cols-1 items-start gap-5.5 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.6fr_1fr]">
              <Section
                title="Últimos gastos"
                description="Los movimientos más recientes del período"
                action={<TextLink to="/expenses">Ver todos</TextLink>}
              >
                {data.recent.length ? (
                  <MovementTable items={data.recent} categories={categories.data ?? []} compact />
                ) : (
                  <EmptyState
                    title="Empieza por tu primer gasto"
                    description="Una compra, un recibo, un café. Cada registro te ayuda a ver el conjunto."
                    action={<MovementDialog />}
                  />
                )}
              </Section>
              <Section
                className="border-t-3 border-t-primary [&_[data-slot=card-header]>svg]:text-primary [&>[data-slot=card-content]>p]:mt-1.25 [&>[data-slot=card-content]>p]:text-caption"
                title="Tu vida en suscripciones"
                description={`${data.activeSubscriptions} activas · costes equivalentes`}
                action={<Repeat2 size={21} />}
              >
                <div className="flex items-baseline gap-1.75 font-heading text-title tracking-tight [&>span:last-child]:font-sans [&>span:last-child]:text-2xs [&>span:last-child]:tracking-normal [&>span:last-child]:text-muted-foreground">
                  <Money value={data.monthlyCents} />
                  <span>/ mes equivalente</span>
                </div>
                <p className="text-muted-foreground">
                  <Money value={data.annualCents} /> al año equivalente
                </p>
                <div className="mt-5.5 mb-4.75 h-px bg-border" />
                {settings.data?.showProjections !== false && (
                  <>
                    <div className="flex items-center gap-1.5 [&>h3]:text-caption [&>h3]:font-book">
                      <h3>Pagos previstos en el período</h3>
                      <Hint text="Compromisos pendientes, no gastos registrados. Puedes confirmar el cobro desde Suscripciones." />
                    </div>
                    {data.upcoming.length ? (
                      <ul className="mt-1.5 mb-5 list-none p-0 [&>li]:flex [&>li]:items-center [&>li]:justify-between [&>li]:border-b [&>li]:border-border [&>li]:py-3 [&>li]:text-xs/normal [&_strong]:text-caption [&_strong]:font-book [&_small]:mt-1.25 [&_small]:block [&_small]:text-2xs [&_small]:text-muted-foreground">
                        {data.upcoming.slice(0, 3).map((p) => (
                          <li key={`${p.subscriptionId}-${p.date}`}>
                            <div>
                              <strong>{p.name}</strong>
                              <small>
                                <DateText value={p.date} />
                              </small>
                            </div>
                            <Money value={p.amountCents} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="pt-4 pb-5.75 text-caption leading-loose text-muted-foreground">
                        No hay cobros previstos en estas fechas.
                      </p>
                    )}
                  </>
                )}
                <Button variant="outline" asChild className="w-full">
                  <Link to="/subscriptions">
                    Gestionar suscripciones
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </Section>
            </div>
            {settings.data?.showIncome !== false && data.incomeCount > 0 && (
              <div className="flex flex-wrap items-center gap-3.5 rounded-lg border border-border bg-card px-5.75 py-4.25 text-xs/normal md:flex-nowrap [&>svg]:text-primary [&>strong]:ml-auto [&>a]:ml-auto md:[&>a]:ml-0">
                <ArrowDownLeft size={20} />
                <span>Ingresos registrados en este período</span>
                <strong>
                  <Money value={data.incomeCents} sign="+" />
                </strong>
                <TextLink to="/income">Ver ingresos</TextLink>
              </div>
            )}
            <p className="flex items-center gap-1.5 text-micro leading-copy text-muted-foreground md:text-2xs">
              Tus cifras reflejan los registros guardados. Los pagos previstos se muestran por
              separado.
            </p>
          </>
        )
      )}
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  note: string;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-4.5 md:p-3.5 lg:p-4.25 xl:px-5.25 xl:py-5 2xl:p-6 [&>strong]:mt-2.25 [&>strong]:block [&>strong]:font-heading [&>strong]:text-2xl/normal [&>strong]:font-medium [&>strong]:tracking-tight [&>strong]:wrap-anywhere md:[&>strong]:text-lg lg:[&>strong]:text-title-small xl:[&>strong]:text-metric [&>small]:mt-0.75 [&>small]:block [&>small]:text-2xs [&>small]:text-muted-foreground md:[&>small]:text-micro lg:[&>small]:text-2xs">
      <div className="flex items-center justify-between gap-2.5 text-caption text-muted-foreground md:text-2xs lg:text-caption [&>svg]:size-3.75 [&>svg]:text-muted-foreground md:[&>svg]:hidden lg:[&>svg]:block">
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </section>
  );
}
