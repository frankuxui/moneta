import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil } from 'lucide-react';
import {
  subscriptionInput,
  moneyInput,
  parseMoney,
  todayMadrid,
  type Subscription,
} from '@moneta/shared';
import { useCategories, usePlatforms, useSave } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const formSchema = subscriptionInput
  .omit({ amountCents: true })
  .extend({
    amount: z.string().refine((v) => {
      try {
        parseMoney(v);
        return true;
      } catch {
        return false;
      }
    }, 'Introduce un importe positivo con hasta dos decimales'),
    categoryId: z.string(),
    platformId: z.string(),
  })
  .refine((v) => v.nextPaymentDate >= v.startDate, {
    message: 'El próximo cobro debe ser posterior o igual al inicio',
    path: ['nextPaymentDate'],
  });
type Values = z.input<typeof formSchema>;
export function SubscriptionDialog({ subscription }: { subscription?: Subscription }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {subscription ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${subscription.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus data-icon="inline-start" />
            Añadir suscripción
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="form-dialog">
        <DialogHeader>
          <DialogTitle>{subscription ? 'Editar suscripción' : 'Nueva suscripción'}</DialogTitle>
          <DialogDescription>
            Planifica tus pagos recurrentes. Se registrarán como gastos cuando confirmes cada cobro.
          </DialogDescription>
        </DialogHeader>
        {open && <SubscriptionForm subscription={subscription} onSaved={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
function SubscriptionForm({
  subscription: s,
  onSaved,
}: {
  subscription?: Subscription;
  onSaved: () => void;
}) {
  const categories = useCategories(),
    platforms = usePlatforms();
  const save = useSave(
    `/subscriptions${s ? `/${s.id}` : ''}`,
    s ? 'PATCH' : 'POST',
    'Suscripción guardada',
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values, unknown, z.output<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: s?.name ?? '',
      amount: s ? moneyInput(s.amountCents) : '',
      concept: s?.concept ?? '',
      description: s?.description ?? '',
      categoryId: s?.categoryId ?? '',
      platformId: s?.platformId ?? '',
      startDate: s?.startDate ?? todayMadrid(),
      nextPaymentDate: s?.nextPaymentDate ?? todayMadrid(),
      frequency: s?.frequency ?? 'monthly',
      status: s?.status ?? 'active',
      url: s?.url ?? '',
      notes: s?.notes ?? '',
    },
  });
  function field(key: keyof Values, label: string, type = 'text') {
    return (
      <Field data-invalid={!!errors[key]}>
        <FieldLabel htmlFor={`sub-${key}`}>{label}</FieldLabel>
        <Input
          id={`sub-${key}`}
          type={type}
          inputMode={key === 'amount' ? 'decimal' : undefined}
          {...register(key)}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `sub-error-${key}` : undefined}
        />
        {errors[key] && (
          <p id={`sub-error-${key}`} className="form-error">
            {errors[key]?.message}
          </p>
        )}
      </Field>
    );
  }
  return (
    <form
      noValidate
      onSubmit={handleSubmit(({ amount, categoryId, platformId, ...rest }) =>
        save.mutate(
          {
            ...rest,
            amountCents: parseMoney(amount),
            categoryId: categoryId || null,
            platformId: platformId || null,
          },
          { onSuccess: onSaved },
        ),
      )}
    >
      <FieldGroup>
        {field('name', 'Nombre')}
        <div className="form-columns">
          {field('amount', 'Importe por cobro (€)')}
          <Field>
            <FieldLabel htmlFor="sub-frequency">Frecuencia</FieldLabel>
            <select id="sub-frequency" {...register('frequency')}>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
              <option value="semiannual">Semestral</option>
              <option value="annual">Anual</option>
            </select>
          </Field>
        </div>
        <div className="form-columns">
          {field('startDate', 'Fecha de inicio', 'date')}
          {field('nextPaymentDate', 'Próximo cobro', 'date')}
        </div>
        <div className="form-columns">
          <Field>
            <FieldLabel htmlFor="sub-category">Categoría</FieldLabel>
            <select id="sub-category" {...register('categoryId')}>
              <option value="">Sin categoría</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="sub-platform">Plataforma</FieldLabel>
            <select id="sub-platform" {...register('platformId')}>
              <option value="">Sin plataforma</option>
              {platforms.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {(categories.isError || platforms.isError) && (
          <p role="alert" className="form-error">
            No se pudo cargar algún catálogo. Reabre el formulario para volver a intentarlo.
          </p>
        )}
        {field('concept', 'Concepto')}
        <Field>
          <FieldLabel htmlFor="sub-status">Estado</FieldLabel>
          <select id="sub-status" {...register('status')}>
            <option value="active">Activa</option>
            <option value="paused">Pausada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </Field>
        <details>
          <summary>Descripción, enlace y notas</summary>
          <FieldGroup className="pt-4">
            {field('description', 'Descripción')}
            {field('url', 'URL de la plataforma', 'url')}
            {field('notes', 'Notas')}
          </FieldGroup>
        </details>
        {save.error && (
          <p role="alert" className="form-error">
            {save.error.message}
          </p>
        )}
        <div className="form-actions">
          <Button type="button" variant="outline" disabled={save.isPending} onClick={onSaved}>
            Cancelar
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar suscripción'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
