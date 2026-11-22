import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Sun, Moon, ShieldCheck } from 'lucide-react';
import { settingsInput, type Settings, type Category, type Platform } from '@moneta/shared';
import { useCategories, usePlatforms, useSave, useSettings } from '@/services/api';
import { useUi } from '@/stores/ui';
import { EmptyState, ErrorState, Loading, Section } from '@/components/common';
import { ConfirmDelete } from '@/components/confirm-delete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
const catalogSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(120),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
function CatalogDialog({
  type,
  item,
}: {
  type: 'categories' | 'platforms';
  item?: Category | Platform;
}) {
  const [open, setOpen] = useState(false);
  const save = useSave(`/${type}${item ? `/${item.id}` : ''}`, item ? 'PATCH' : 'POST');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof catalogSchema>>({
    resolver: zodResolver(catalogSchema),
    defaultValues: {
      name: item?.name ?? '',
      color: item && 'color' in item ? item.color : '#287f83',
    },
  });
  const label = type === 'categories' ? 'categoría' : 'plataforma';
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v)
          reset({
            name: item?.name ?? '',
            color: item && 'color' in item ? item.color : '#287f83',
          });
      }}
    >
      <DialogTrigger asChild>
        {item ? (
          <Button size="icon" variant="ghost" aria-label={`Editar ${item.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus data-icon="inline-start" />
            Añadir {label}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item ? 'Editar' : 'Añadir'} {label}
          </DialogTitle>
          <DialogDescription>
            {type === 'categories'
              ? 'Organiza los movimientos con categorías que tengan sentido para ti.'
              : 'Define el proveedor de tus suscripciones.'}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit((v) =>
            save.mutate(type === 'categories' ? v : { name: v.name }, {
              onSuccess: () => setOpen(false),
            }),
          )}
        >
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="catalog-name">Nombre</FieldLabel>
              <Input id="catalog-name" {...register('name')} aria-invalid={!!errors.name} />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </Field>
            {type === 'categories' && (
              <Field>
                <FieldLabel htmlFor="catalog-color">Color</FieldLabel>
                <Input id="catalog-color" type="color" {...register('color')} />
              </Field>
            )}
            {save.error && (
              <p role="alert" className="form-error">
                {save.error.message}
              </p>
            )}
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function Catalogs({ onlyCategories = false }: { onlyCategories?: boolean }) {
  const categories = useCategories(),
    platforms = usePlatforms();
  return (
    <>
      <Section
        title="Categorías"
        description="Personaliza cómo organizas tus gastos e ingresos."
        action={<CatalogDialog type="categories" />}
      >
        {categories.isPending ? (
          <Loading />
        ) : categories.isError ? (
          <ErrorState error={categories.error} />
        ) : categories.data.length ? (
          <div className="catalog-grid">
            {categories.data.map((c) => (
              <div key={c.id} className="catalog-item">
                <span className="category-swatch" style={{ background: c.color }} />
                <strong>{c.name}</strong>
                <CatalogDialog type="categories" item={c} />
                <ConfirmDelete
                  name={c.name}
                  path={`/categories/${c.id}`}
                  description="Solo puedes eliminar categorías que no estén asignadas a movimientos ni suscripciones. Reasigna esos registros antes de eliminarlas."
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Crea tu primera categoría" />
        )}
      </Section>
      {!onlyCategories && (
        <Section
          title="Plataformas y proveedores"
          description="Asocia tus suscripciones con sus proveedores."
          action={<CatalogDialog type="platforms" />}
        >
          {platforms.isPending ? (
            <Loading />
          ) : platforms.isError ? (
            <ErrorState error={platforms.error} />
          ) : platforms.data.length ? (
            <div className="catalog-grid">
              {platforms.data.map((p) => (
                <div key={p.id} className="catalog-item">
                  <strong>{p.name}</strong>
                  <CatalogDialog type="platforms" item={p} />
                  <ConfirmDelete name={p.name} path={`/platforms/${p.id}`} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="¿A quién pagas tus suscripciones?"
              description="Añade las plataformas que utilizas para identificarlas con facilidad."
              action={<CatalogDialog type="platforms" />}
            />
          )}
        </Section>
      )}
    </>
  );
}
function SettingsForm({ settings }: { settings: Settings }) {
  const save = useSave('/settings', 'PUT', 'Preferencias guardadas');
  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<Settings>({ resolver: zodResolver(settingsInput), defaultValues: settings });
  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))}>
      <div className="settings-fixed">
        <div>
          <span>Moneda</span>
          <strong>Euro · EUR</strong>
        </div>
        <div>
          <span>Fechas y zona horaria</span>
          <strong>España · Europe/Madrid</strong>
        </div>
        <div>
          <span>Inicio de la semana</span>
          <strong>Lunes</strong>
        </div>
      </div>
      <FieldGroup>
        <label className="checkbox-row">
          <input type="checkbox" {...register('showIncome')} />
          <span>
            <strong>Mostrar ingresos en el resumen</strong>
            <small>Se muestran cuando hay ingresos registrados en el período.</small>
          </span>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" {...register('showProjections')} />
          <span>
            <strong>Mostrar próximos pagos en el resumen</strong>
            <small>Mantén a la vista los compromisos previstos.</small>
          </span>
        </label>
        {save.error && (
          <p role="alert" className="form-error">
            {save.error.message}
          </p>
        )}
        <div>
          <Button type="submit" disabled={save.isPending || !isDirty}>
            {save.isPending ? 'Guardando…' : 'Guardar preferencias'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
export default function SettingsPage({ categoriesOnly = false }: { categoriesOnly?: boolean }) {
  const settings = useSettings(),
    theme = useUi((s) => s.theme),
    setTheme = useUi((s) => s.setTheme);
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">MONETA, A TU MANERA</p>
          <h1>{categoriesOnly ? 'Tus categorías' : 'Configuración'}</h1>
          <p>
            {categoriesOnly
              ? 'Dale sentido a cada movimiento.'
              : 'Los pequeños ajustes que hacen tu espacio más cómodo.'}
          </p>
        </div>
      </div>
      {!categoriesOnly && (
        <>
          <Section title="Preferencias" description="Configuración financiera y del resumen.">
            {settings.isPending ? (
              <Loading />
            ) : settings.isError ? (
              <ErrorState error={settings.error} />
            ) : (
              <SettingsForm key={JSON.stringify(settings.data)} settings={settings.data} />
            )}
          </Section>
          <Section title="Apariencia" description="La preferencia se guarda en este dispositivo.">
            <div className="theme-options">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                aria-pressed={theme === 'light'}
                onClick={() => setTheme('light')}
              >
                <Sun data-icon="inline-start" />
                Modo claro
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                aria-pressed={theme === 'dark'}
                onClick={() => setTheme('dark')}
              >
                <Moon data-icon="inline-start" />
                Modo oscuro
              </Button>
            </div>
          </Section>
        </>
      )}
      <Catalogs onlyCategories={categoriesOnly} />
      {!categoriesOnly && (
        <div className="privacy-note">
          <ShieldCheck />
          <div>
            <strong>Tu espacio financiero privado</strong>
            <p>
              Moneta está pensada para tu red local. Conserva una copia de seguridad periódica de
              tus registros.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
