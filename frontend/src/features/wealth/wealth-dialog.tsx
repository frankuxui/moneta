import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Plus } from 'lucide-react';
import {
  dateSchema,
  moneyInput,
  parseMoney,
  todayMadrid,
  type WealthEntry,
  type WealthKind,
} from '@moneta/shared';
import { useSave } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export const wealthFormSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un concepto').max(120),
  destination: z.string().trim().min(1, 'Indica la cuenta o plataforma').max(120),
  direction: z.enum(['deposit', 'withdrawal']),
  amount: z.string().refine((value) => {
    try {
      parseMoney(value);
      return true;
    } catch {
      return false;
    }
  }, 'Importe positivo con un máximo de dos decimales'),
  date: dateSchema.refine(
    (date) => date <= todayMadrid(),
    'No puedes registrar movimientos futuros',
  ),
  notes: z.string().max(2000),
});
type Values = z.infer<typeof wealthFormSchema>;

export function WealthDialog({
  kind,
  entry,
  destinations = [],
}: {
  kind: WealthKind;
  entry?: WealthEntry;
  destinations?: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {entry ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${entry.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus />
            Registrar movimiento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {entry
              ? 'Editar movimiento'
              : kind === 'savings'
                ? 'Movimiento de ahorros'
                : 'Movimiento de inversión'}
          </DialogTitle>
          <DialogDescription>
            Registra dinero que ya has aportado o retirado. No genera un gasto ni un ingreso.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <WealthForm
            kind={kind}
            entry={entry}
            destinations={destinations}
            onSaved={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function WealthForm({
  kind,
  entry,
  destinations,
  onSaved,
}: {
  kind: WealthKind;
  entry?: WealthEntry;
  destinations: string[];
  onSaved: () => void;
}) {
  const formId = useId();
  const save = useSave(`/${kind}${entry ? `/${entry.id}` : ''}`, entry ? 'PATCH' : 'POST');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(wealthFormSchema),
    defaultValues: {
      name: entry?.name ?? '',
      destination: entry?.destination ?? (kind === 'savings' ? 'Mi monedero' : ''),
      direction: entry?.direction ?? 'deposit',
      amount: entry ? moneyInput(entry.amountCents) : '',
      date: entry?.date ?? todayMadrid(),
      notes: entry?.notes ?? '',
    },
  });
  const field = (
    key: 'name' | 'destination' | 'amount' | 'date',
    label: string,
    props: React.ComponentProps<'input'> = {},
  ) => (
    <Field>
      <FieldLabel htmlFor={`${formId}-${key}`}>{label}</FieldLabel>
      <Input
        id={`${formId}-${key}`}
        {...register(key)}
        {...props}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${formId}-error-${key}` : undefined}
      />
      {errors[key] && (
        <p id={`${formId}-error-${key}`} className="text-xs/normal text-destructive">
          {errors[key].message}
        </p>
      )}
    </Field>
  );
  return (
    <form
      noValidate
      onSubmit={handleSubmit(({ amount, ...values }) =>
        save.mutate({ ...values, amountCents: parseMoney(amount) }, { onSuccess: onSaved }),
      )}
    >
      <FieldGroup className="@container/form">
        <Field>
          <FieldLabel htmlFor={`${formId}-direction`}>Tipo de movimiento</FieldLabel>
          <select
            id={`${formId}-direction`}
            {...register('direction')}
            className="min-h-9.5 rounded-sm border border-input bg-card px-3 py-2 text-sm"
          >
            <option value="deposit">Aportación</option>
            <option value="withdrawal">Retirada</option>
          </select>
        </Field>
        {field('name', 'Concepto', {
          autoFocus: true,
          placeholder: 'Por ejemplo, aportación de noviembre',
          maxLength: 120,
        })}
        {field('destination', kind === 'savings' ? 'Cuenta o monedero' : 'Plataforma o servicio', {
          list: `${formId}-destinations`,
          maxLength: 120,
        })}
        <datalist id={`${formId}-destinations`}>
          {destinations.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <div className="grid gap-4 @3xs/form:grid-cols-2">
          {field('amount', 'Importe (€)', { inputMode: 'decimal', placeholder: '0,00' })}
          {field('date', 'Fecha', { type: 'date', min: '1900-01-01', max: todayMadrid() })}
        </div>
        <Field>
          <FieldLabel htmlFor={`${formId}-notes`}>Notas</FieldLabel>
          <Textarea
            id={`${formId}-notes`}
            {...register('notes')}
            maxLength={2000}
            aria-invalid={!!errors.notes}
            aria-describedby={errors.notes ? `${formId}-notes-error` : undefined}
          />
          {errors.notes && (
            <p id={`${formId}-notes-error`} className="text-xs/normal text-destructive">
              {errors.notes.message}
            </p>
          )}
        </Field>
        {save.error && (
          <p role="alert" className="text-sm text-destructive">
            {save.error.message}
          </p>
        )}
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Guardando…' : 'Guardar movimiento'}
        </Button>
      </FieldGroup>
    </form>
  );
}
