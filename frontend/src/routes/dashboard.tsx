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
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">UNA VISIÓN CLARA DE TU DINERO</p>
          <h1>
            Tu resumen financiero<span className="title-dot">.</span>
          </h1>
          <p>Menos suposiciones. Más claridad para tu día a día.</p>
        </div>
        {picker}
      </div>
      {!valid ? (
        <p role="alert">Selecciona un rango de fechas válido.</p>
      ) : result.isPending ? (
        <Loading />
      ) : result.isError ? (
        <ErrorState error={result.error} retry={() => void result.refetch()} />
      ) : (
        data && (
          <>
            <div className="dashboard-overview">
              <section className="spending-highlight">
                <div className="highlight-heading">
                  <span className="eyebrow">GASTO REAL DEL PERÍODO</span>
                  <span className="highlight-icon">
                    <ArrowUpRight size={20} />
                  </span>
                </div>
                <div className="highlight-amount">
                  <Money value={data.expensesCents} />
                </div>
                <div className="highlight-foot">
                  <Badge variant="outline">
                    {data.variationPercent === null
                      ? 'Sin base de comparación'
                      : `${BigInt(data.variationPercent) > 0n ? '+' : ''}${Number(data.variationPercent) / 100}% frente al período anterior`}
                  </Badge>
                  <Hint text="Se compara con los mismos días inmediatamente anteriores. Las previsiones de suscripciones no se incluyen." />
                </div>
                <div className="highlight-rule" />
                <div className="highlight-range">
                  <DateText value={data.from} />
                  <span>—</span>
                  <DateText value={data.to} />
                </div>
              </section>
              <div className="metric-grid">
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
            <div className="dashboard-charts">
              <Section
                title="Cómo evoluciona tu gasto"
                description="Movimientos reales del período"
                action={<TextLink to="/analytics">Ver analíticas</TextLink>}
              >
                <SpendingChart data={data} />
                <div className="chart-footer">
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
            <div className="dashboard-bottom">
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
                className="recurring-card"
                title="Tu vida en suscripciones"
                description={`${data.activeSubscriptions} activas · costes equivalentes`}
                action={<Repeat2 size={21} />}
              >
                <div className="recurring-total">
                  <Money value={data.monthlyCents} />
                  <span>/ mes equivalente</span>
                </div>
                <p className="muted">
                  <Money value={data.annualCents} /> al año equivalente
                </p>
                <div className="recurring-divider" />
                {settings.data?.showProjections !== false && (
                  <>
                    <div className="upcoming-heading">
                      <h3>Pagos previstos en el período</h3>
                      <Hint text="Compromisos pendientes, no gastos registrados. Puedes confirmar el cobro desde Suscripciones." />
                    </div>
                    {data.upcoming.length ? (
                      <ul className="upcoming-list">
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
                      <p className="quiet-empty">No hay cobros previstos en estas fechas.</p>
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
              <div className="income-strip">
                <ArrowDownLeft size={20} />
                <span>Ingresos registrados en este período</span>
                <strong>
                  <Money value={data.incomeCents} sign="+" />
                </strong>
                <TextLink to="/income">Ver ingresos</TextLink>
              </div>
            )}
            <p className="page-footnote">
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
    <section className="metric">
      <div className="metric-heading">
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </section>
  );
}
