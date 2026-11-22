import type { Overview } from '@moneta/shared';
import { useApi } from '@/services/api';
import {
  PageHeader,
  EmptyState,
  ErrorState,
  Loading,
  Money,
  Section,
  useRange,
} from '@/components/common';
import { SpendingChart, CategoriesChart } from '@/features/analytics/charts';
import { equivalents } from '@moneta/shared';
export default function AnalyticsPage() {
  const { picker, query, valid } = useRange();
  const result = useApi<Overview>(`/analytics?${query}`);
  return (
    <div className="flex flex-col gap-5 md:gap-6.25 2xl:gap-7.25">
      <PageHeader
        eyebrow="EL CONTEXTO DETRÁS DE LAS CIFRAS"
        title="Entiende tus hábitos"
        description="Compara lo que gastas, lo que recibes y lo que viene."
      >
        {picker}
      </PageHeader>
      {!valid ? (
        <p role="alert">Selecciona un rango válido.</p>
      ) : result.isPending ? (
        <Loading />
      ) : result.isError ? (
        <ErrorState error={result.error} retry={() => void result.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-4 [&>div]:rounded-lg [&>div]:border [&>div]:border-border [&>div]:bg-card [&>div]:p-4.5 md:[&>div]:p-5.75 [&_span]:text-xs/normal [&_span]:text-muted-foreground [&_strong]:mt-2.25 [&_strong]:block [&_strong]:font-heading [&_strong]:text-title-small [&_strong]:font-medium [&_strong]:tracking-tight md:[&_strong]:text-metric">
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
            <div className="mt-3 flex justify-between gap-3.75 border-t border-border pt-4 text-micro text-muted-foreground md:text-2xs [&_span]:flex [&_span]:items-center [&_span]:gap-1.75 [&_i]:inline-block [&_i]:size-1.75 [&_i]:rounded-full [&_i]:bg-chart-1 [&_strong]:font-normal [&_[data-money]]:ml-1.5 [&_[data-money]]:font-semibold [&_[data-money]]:text-foreground">
              <span>
                <i /> Gastos
              </span>
              <span>
                <i className="bg-chart-2!" /> Ingresos
              </span>
            </div>
          </Section>
          <div className="grid grid-cols-1 items-stretch gap-5.5 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.6fr_1fr]">
            <Section title="Distribución de gastos" description="Importes reales por categoría">
              <CategoriesChart data={result.data} />
            </Section>
            <Section
              title="El peso de lo recurrente"
              description="Solo pagos confirmados, sin sumar previsiones"
            >
              <div className="flex flex-col [&>div]:flex [&>div]:justify-between [&>div]:gap-5 [&>div]:border-b [&>div]:border-border [&>div]:py-4.75 [&>div]:text-caption md:[&>div]:text-xs/normal [&_div>span]:text-muted-foreground [&_strong]:text-xs/normal [&_strong]:whitespace-nowrap md:[&_strong]:text-sm/normal">
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
              <ol className="m-0 list-none p-0 [&>li]:flex [&>li]:flex-wrap [&>li]:items-center [&>li]:gap-2.75 [&>li]:border-t [&>li]:border-border [&>li]:py-4.5 md:[&>li]:flex-nowrap md:[&>li]:gap-5 [&_li>strong]:min-w-25 [&_li>strong]:flex-1 [&_li>strong]:text-body [&_li>strong]:font-book md:[&_li>strong]:min-w-0 [&_li>div]:min-w-22.5 [&_li>div]:text-right [&_li>div]:text-body md:[&_li>div]:min-w-35 md:[&_li>div]:text-base/normal [&_small]:mt-1 [&_small]:block [&_small]:text-micro [&_small]:text-muted-foreground md:[&_small]:text-2xs">
                {result.data.costliest.map((s, index) => (
                  <li key={s.id}>
                    <span className="grid size-7 place-items-center rounded-full bg-muted text-xs/normal text-muted-foreground">
                      {index + 1}
                    </span>
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
