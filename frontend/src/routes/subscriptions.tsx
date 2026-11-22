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
import {
  Repeat2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pause,
  Play,
  CalendarDays,
} from 'lucide-react';
import {
  equivalents,
  formatMoney,
  isoDate,
  todayMadrid,
  type SubscriptionSummary,
  type Overview,
} from '@moneta/shared';
import { useApi, useSave, usePlatforms } from '@/services/api';
import {
  EmptyState,
  ErrorState,
  Loading,
  Money,
  DateText,
  Section,
  Hint,
} from '@/components/common';
import { ConfirmDelete } from '@/components/confirm-delete';
import { ConfirmPayment } from '@/features/subscriptions/confirm-payment';
import { SubscriptionDialog } from '@/features/subscriptions/subscription-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
const frequencyLabels = {
  weekly: 'semana',
  monthly: 'mes',
  quarterly: 'trimestre',
  semiannual: 'semestre',
  annual: 'año',
};
function SubscriptionRow({ sub: s, provider }: { sub: SubscriptionSummary; provider?: string }) {
  const update = useSave(`/subscriptions/${s.id}`, 'PATCH', 'Estado actualizado');
  return (
    <article className="subscription-row">
      <span className="subscription-symbol">
        <Repeat2 />
      </span>
      <div className="subscription-identity">
        <h3>{s.name}</h3>
        <p>
          {provider ?? 'Sin plataforma'} <span>·</span> {s.concept || 'Pago recurrente'}
        </p>
      </div>
      <div className="subscription-price">
        <Money value={s.amountCents} />
        <small>
          por {frequencyLabels[s.frequency]} ·{' '}
          {formatMoney(equivalents(s.amountCents, s.frequency).monthlyCents)}/mes eq.
        </small>
        <small>
          Pagado: <Money value={s.paidCents} /> · {s.paymentCount} cobros registrados
        </small>
      </div>
      <div className="subscription-date">
        <Badge variant={s.status === 'active' ? 'secondary' : 'outline'}>
          {s.status === 'active' ? 'Activa' : s.status === 'paused' ? 'Pausada' : 'Cancelada'}
        </Badge>
        <small>
          Próximo: <DateText value={s.nextPaymentDate} />
        </small>
      </div>
      <div className="subscription-actions">
        <ConfirmPayment subscription={s} />
        <Button
          variant="ghost"
          size="icon"
          disabled={update.isPending}
          aria-label={s.status === 'active' ? `Pausar ${s.name}` : `Activar ${s.name}`}
          onClick={() => update.mutate({ status: s.status === 'active' ? 'paused' : 'active' })}
        >
          {s.status === 'active' ? <Pause /> : <Play />}
        </Button>
        <SubscriptionDialog subscription={s} />
        <ConfirmDelete
          name={s.name}
          path={`/subscriptions/${s.id}`}
          description="Se eliminará la suscripción y sus previsiones. Los gastos ya confirmados se conservarán."
        />
        {s.url && (
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Abrir plataforma de ${s.name}`}
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>
    </article>
  );
}
export default function SubscriptionsPage() {
  const subscriptions = useApi<SubscriptionSummary[]>('/subscriptions'),
    platforms = usePlatforms();
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
  const filtered = (subscriptions.data ?? [])
    .filter(
      (s) =>
        (status === 'all' || s.status === status) &&
        s.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')),
    )
    .toSorted((a, b) =>
      order === 'cost'
        ? Number(
            BigInt(equivalents(b.amountCents, b.frequency).annualCents) -
              BigInt(equivalents(a.amountCents, a.frequency).annualCents),
          )
        : a.nextPaymentDate.localeCompare(b.nextPaymentDate),
    );
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">SIN PERDER DE VISTA LO RECURRENTE</p>
          <h1>Tus suscripciones</h1>
          <p>Conoce tus compromisos. Confirma lo que ya has pagado.</p>
        </div>
        <SubscriptionDialog />
      </div>
      {summary.data && (
        <div className="subscription-stats">
          <div>
            <span>Suscripciones activas</span>
            <strong>{summary.data.activeSubscriptions}</strong>
          </div>
          <div>
            <span>
              Equivalente mensual{' '}
              <Hint text="Equivalencia presupuestaria: los pagos semanales se anualizan con 52 semanas. No es el gasto real del mes." />
            </span>
            <strong>
              <Money value={summary.data.monthlyCents} />
            </strong>
          </div>
          <div>
            <span>Equivalente anual</span>
            <strong>
              <Money value={summary.data.annualCents} />
            </strong>
          </div>
        </div>
      )}
      <Section
        title="Todas tus suscripciones"
        description="Los cobros futuros no se suman a tus gastos."
      >
        <div className="table-filters">
          <Input
            aria-label="Buscar suscripciones"
            placeholder="Buscar suscripciones…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="paused">Pausadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
          <select
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
        ) : filtered.length ? (
          filtered.map((s) => (
            <SubscriptionRow
              key={s.id}
              sub={s}
              provider={platforms.data?.find((p) => p.id === s.platformId)?.name}
            />
          ))
        ) : (
          <EmptyState
            title="Todo lo recurrente, bajo control"
            description="Añade una suscripción para ver cuándo se renueva y cuánto representa al mes."
            action={<SubscriptionDialog />}
          />
        )}
      </Section>
      <Section
        title="Calendario de pagos previstos"
        description="Previsiones desde el siguiente cobro pendiente; confirma los vencidos para actualizar el calendario."
        action={
          <div className="calendar-controls">
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
            <div className="calendar-grid" role="table" aria-label="Calendario de pagos">
              <div className="calendar-weekdays" role="row">
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
                    className={`calendar-day ${!isSameMonth(d, month) ? 'outside' : ''} ${date === todayMadrid() ? 'today' : ''}`}
                    key={date}
                    role="cell"
                  >
                    <time dateTime={date}>{format(d, 'd')}</time>
                    {payments.map((p) => (
                      <div
                        className="calendar-payment"
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
            <p className="calendar-note">
              <CalendarDays size={16} /> Previsto en {format(month, 'MMMM', { locale: es })}:{' '}
              <Money value={summary.data.projectedCents} />
            </p>
            <div className="mobile-agenda">
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
