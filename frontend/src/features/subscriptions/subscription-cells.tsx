import { Repeat2, Pause, Play, ExternalLink } from 'lucide-react';
import { equivalents, type SubscriptionSummary } from '@moneta/shared';
import { useSave } from '@/services/api';
import { Money, DateText } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDelete } from '@/components/confirm-delete';
import { ConfirmPayment } from './confirm-payment';
import { SubscriptionDialog } from './subscription-dialog';
import { frequencyLabels, statusLabels } from './search';

export function SubscriptionIdentity({
  sub: s,
  provider,
}: {
  sub: SubscriptionSummary;
  provider?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent text-primary">
        <Repeat2 className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-heading text-base/normal font-semibold wrap-anywhere">{s.name}</h3>
        <p className="mt-1 text-sm/normal leading-copy text-muted-foreground wrap-anywhere">
          {provider ?? 'Sin plataforma'}{' '}
          <span aria-hidden="true" className="px-1">
            ·
          </span>{' '}
          {s.concept || 'Pago recurrente'}
        </p>
        <p className="mt-2 text-xs/normal leading-copy text-muted-foreground">
          Pagado:{' '}
          <span className="font-medium text-foreground">
            <Money value={s.paidCents} />
          </span>
          <span aria-hidden="true" className="px-1.5">
            ·
          </span>
          {s.paymentCount} {s.paymentCount === 1 ? 'cobro registrado' : 'cobros registrados'}
        </p>
      </div>
    </div>
  );
}

export function SubscriptionBilling({ sub: s }: { sub: SubscriptionSummary }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs/normal font-medium text-muted-foreground @5xl/subscription-list:hidden">
        Importe por cobro
      </p>
      <p className="overflow-x-auto pb-0.5 font-heading text-2xl/normal font-semibold text-foreground">
        <Money value={s.amountCents} />
      </p>
      <p className="text-xs/normal text-muted-foreground">por {frequencyLabels[s.frequency]}</p>
      <p className="mt-2 text-xs/normal leading-copy text-muted-foreground">
        Equiv. mensual{' '}
        <span className="font-medium text-primary">
          <Money value={equivalents(s.amountCents, s.frequency).monthlyCents} />
        </span>
      </p>
    </div>
  );
}

export function SubscriptionRenewal({ sub: s }: { sub: SubscriptionSummary }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <p className="text-xs/normal font-medium text-muted-foreground @5xl/subscription-list:hidden">
        Próximo cobro
      </p>
      <p className="text-sm/normal font-medium">
        <DateText value={s.nextPaymentDate} />
      </p>
      <Badge variant={s.status === 'active' ? 'secondary' : 'outline'}>
        {statusLabels[s.status]}
      </Badge>
    </div>
  );
}

export function SubscriptionActions({ sub: s }: { sub: SubscriptionSummary }) {
  const update = useSave(`/subscriptions/${s.id}`, 'PATCH', 'Estado actualizado');
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 @5xl/subscription-list:flex-col @5xl/subscription-list:items-end @5xl/subscription-list:gap-2 @5xl/subscription-list:border-0 @5xl/subscription-list:pt-0">
      <div className="w-full @sm/subscription-list:w-auto @5xl/subscription-list:w-full [&>button]:w-full">
        <ConfirmPayment subscription={s} />
      </div>
      <div className="ml-auto flex items-center gap-1">
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
          <Button variant="ghost" size="icon" asChild>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Abrir plataforma de ${s.name}`}
            >
              <ExternalLink />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
