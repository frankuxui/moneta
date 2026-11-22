import type { Overview } from '@moneta/shared';
import { useApi } from '@/services/api';
import { EmptyState, ErrorState, Loading, Money, Section, useRange } from '@/components/common';
import { SpendingChart, CategoriesChart } from '@/features/analytics/charts';
import { equivalents } from '@moneta/shared';
export default function AnalyticsPage() {
  const { picker, query, valid } = useRange();
  const result = useApi<Overview>(`/analytics?${query}`);
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">EL CONTEXTO DETRÁS DE LAS CIFRAS</p>
          <h1>Entiende tus hábitos</h1>
          <p>Compara lo que gastas, lo que recibes y lo que viene.</p>
        </div>
        {picker}
      </div>
      {!valid ? (
        <p role="alert">Selecciona un rango válido.</p>
      ) : result.isPending ? (
        <Loading />
      ) : result.isError ? (
        <ErrorState error={result.error} retry={() => void result.refetch()} />
      ) : (
        <>
          <div className="analytics-metrics">
            <div>
              <span>Gastos reales</span>
              <strong>
                <Money value={result.data.expensesCents} />
              </strong>
            </div>
            <div>
              <span>Ingresos registrados</span>
              <strong>
                {result.data.incomeCount ? (
                  <Money value={result.data.incomeCents} />
                ) : (
                  'Sin registrar'
                )}
              </strong>
            </div>
            <div>
              <span>Balance real</span>
              <strong>
                {result.data.balanceCents === null ? (
                  'Sin ingresos'
                ) : (
                  <Money value={result.data.balanceCents} />
                )}
              </strong>
            </div>
            <div>
              <span>Promedio diario</span>
              <strong>
                <Money value={result.data.averageCents} />
              </strong>
            </div>
          </div>
          <Section
            title="Evolución de gastos e ingresos"
            description="Agrupación diaria, semanal o mensual según la amplitud del período."
          >
            <SpendingChart data={result.data} showIncome />
            <div className="chart-footer">
              <span>
                <i /> Gastos
              </span>
              <span>
                <i className="income-dot" /> Ingresos
              </span>
            </div>
          </Section>
          <div className="dashboard-charts">
            <Section title="Distribución de gastos" description="Importes reales por categoría">
              <CategoriesChart data={result.data} />
            </Section>
            <Section
              title="El peso de lo recurrente"
              description="Solo pagos confirmados, sin sumar previsiones"
            >
              <div className="breakdown">
                <div>
                  <span>Pagos recurrentes registrados</span>
                  <strong>
                    <Money value={result.data.recurringCents} />
                  </strong>
                </div>
                <div>
                  <span>Gastos puntuales</span>
                  <strong>
                    <Money value={result.data.oneOffCents} />
                  </strong>
                </div>
                <div>
                  <span>Período anterior de igual duración</span>
                  <strong>
                    <Money value={result.data.previousExpensesCents} />
                  </strong>
                </div>
                <div>
                  <span>Variación del gasto</span>
                  <strong>
                    {result.data.variationPercent === null
                      ? 'Sin base anterior'
                      : `${Number(result.data.variationPercent) / 100}%`}
                  </strong>
                </div>
                <div>
                  <span>Previsión pendiente en el período</span>
                  <strong>
                    <Money value={result.data.projectedCents} />
                  </strong>
                </div>
              </div>
            </Section>
          </div>
          <Section
            title="Suscripciones con mayor coste"
            description="Ordenadas por equivalente anual; son compromisos, no gastos reales."
          >
            {result.data.costliest.length ? (
              <ol className="costliest">
                {result.data.costliest.map((s, index) => (
                  <li key={s.id}>
                    <span className="rank">{index + 1}</span>
                    <strong>{s.name}</strong>
                    <div>
                      <Money value={equivalents(s.amountCents, s.frequency).monthlyCents} />
                      <small>/ mes equivalente</small>
                    </div>
                    <div>
                      <Money value={equivalents(s.amountCents, s.frequency).annualCents} />
                      <small>/ año equivalente</small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="Sin suscripciones activas"
                description="Cuando registres una suscripción, podrás comparar aquí su coste equivalente."
              />
            )}
          </Section>
        </>
      )}
    </div>
  );
}
