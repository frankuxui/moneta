import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Plus } from 'lucide-react';
import { moneyInput, parseMoney, todayMadrid, type Movement } from '@moneta/shared';
import { useCategories, useSave } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export const movementFormSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(120),
  amount: z.string().refine((v) => {
    try {
      parseMoney(v);
      return true;
    } catch {
      return false;
    }
  }, 'Importe positivo, con un máximo de dos decimales'),
  date: z.iso.date('Selecciona una fecha válida'),
  categoryId: z.string(),
  concept: z.string().max(240),
  description: z.string().max(2000),
  paymentMethod: z.string().max(120),
  notes: z.string().max(2000),
});
type Values = z.infer<typeof movementFormSchema>;
export function MovementDialog({
  kind = 'expenses',
  movement,
  trigger,
}: {
  kind?: 'expenses' | 'income';
  movement?: Movement;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ??
          (movement ? (
            <Button variant="ghost" size="icon" aria-label={`Editar ${movement.name}`}>
              <Pencil />
            </Button>
          ) : (
            <Button>
              <Plus data-icon="inline-start" />
              {kind === 'income' ? 'Añadir ingreso' : 'Añadir gasto'}
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent className="form-dialog">
        <DialogHeader>
          <DialogTitle>
            {movement ? 'Editar' : 'Nuevo'} {kind === 'income' ? 'ingreso' : 'gasto'}
          </DialogTitle>
          <DialogDescription>
            Registra un movimiento real. Los importes se guardan con precisión de céntimos.
          </DialogDescription>
        </DialogHeader>
        {open && <MovementForm kind={kind} movement={movement} onSaved={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
export function MovementForm({
  kind,
  movement,
  onSaved,
}: {
  kind: 'expenses' | 'income';
  movement?: Movement;
  onSaved: () => void;
}) {
  const categories = useCategories();
  const save = useSave(
    `/${kind}${movement ? `/${movement.id}` : ''}`,
    movement ? 'PATCH' : 'POST',
    movement ? 'Movimiento actualizado' : 'Movimiento registrado',
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      name: movement?.name ?? '',
      amount: movement ? moneyInput(movement.amountCents) : '',
      date: movement?.date ?? todayMadrid(),
      categoryId: movement?.categoryId ?? '',
      concept: movement?.concept ?? '',
      description: movement?.description ?? '',
      paymentMethod: movement?.paymentMethod ?? '',
      notes: movement?.notes ?? '',
    },
  });
  const field = (key: keyof Values, label: string, props: React.ComponentProps<'input'> = {}) => (
    <Field data-invalid={!!errors[key]}>
      <FieldLabel htmlFor={`movement-${key}`}>{label}</FieldLabel>
      <Input
        id={`movement-${key}`}
        {...register(key)}
        {...props}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `error-${key}` : undefined}
      />
      {errors[key] && (
        <p id={`error-${key}`} className="form-error">
          {errors[key]?.message}
        </p>
      )}
    </Field>
  );
  return (
    <form
      noValidate
      onSubmit={handleSubmit(({ amount, categoryId, ...rest }) =>
        save.mutate(
          { ...rest, amountCents: parseMoney(amount), categoryId: categoryId || null },
          { onSuccess: onSaved },
        ),
      )}
    >
      <FieldGroup>
        {field('name', 'Nombre', {
          placeholder: kind === 'income' ? 'Por ejemplo, nómina' : 'Por ejemplo, compra semanal',
          autoFocus: true,
        })}
        <div className="form-columns">
          {field('amount', 'Importe (€)', { inputMode: 'decimal', placeholder: '0,00' })}
          {field('date', 'Fecha', { type: 'date' })}
        </div>
        <Field>
          <FieldLabel htmlFor="movement-category">Categoría</FieldLabel>
          <select
            id="movement-category"
            {...register('categoryId')}
            disabled={categories.isPending || categories.isError}
          >
            <option value="">Sin categoría</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {categories.isError && (
            <p role="alert" className="form-error">
              No se pudieron cargar las categorías. Puedes guardar sin categoría o volver a abrir el
              formulario.
            </p>
          )}
        </Field>
        {field('concept', 'Concepto', { placeholder: '¿A qué corresponde este movimiento?' })}
        <details>
          <summary>Descripción y detalles opcionales</summary>
          <FieldGroup className="pt-4">
            {field('paymentMethod', 'Método de pago', {
              placeholder: 'Tarjeta, efectivo, transferencia…',
            })}
            {field('description', 'Descripción')}
            <Field>
              <FieldLabel htmlFor="movement-notes">Notas</FieldLabel>
              <Textarea id="movement-notes" {...register('notes')} maxLength={2000} />
            </Field>
          </FieldGroup>
        </details>
        {save.error && (
          <p role="alert" className="form-error">
            {save.error.message}
          </p>
        )}
        <div className="form-actions">
          <Button type="button" variant="outline" onClick={onSaved} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar movimiento'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
