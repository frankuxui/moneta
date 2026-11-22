import { useState } from 'react';
import { Check } from 'lucide-react';
import { todayMadrid, type Subscription } from '@moneta/shared';
import { useSave } from '@/services/api';
import { DateText, Money } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
export function ConfirmPayment({ subscription: s }: { subscription: Subscription }) {
  const [open, setOpen] = useState(false);
  const save = useSave(
    `/subscriptions/${s.id}/confirm`,
    'POST',
    'Cobro confirmado y gasto registrado',
  );
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={s.status !== 'active' || s.nextPaymentDate > todayMadrid()}
        >
          <Check data-icon="inline-start" />
          Confirmar cobro
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Se ha cobrado {s.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Se registrará un gasto de <Money value={s.amountCents} /> con fecha{' '}
            <DateText value={s.nextPaymentDate} /> y se avanzará al siguiente vencimiento.
            Confírmalo solo si el pago ya se ha realizado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {save.error && (
          <p role="alert" className="form-error">
            {save.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={save.isPending}>Todavía no</AlertDialogCancel>
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate({ date: s.nextPaymentDate }, { onSuccess: () => setOpen(false) })
            }
          >
            {save.isPending ? 'Registrando…' : 'Sí, registrar gasto'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
