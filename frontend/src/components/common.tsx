import { cn } from '@/lib/utils';
import { useState } from 'react';
import { AlertCircle, ArrowRight, Inbox, Info } from 'lucide-react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { periodRange, formatMoney, todayMadrid } from '@moneta/shared';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle />
      <AlertTitle>No se pudieron cargar los datos</AlertTitle>
      <AlertDescription>
        {error.message}
        {retry && (
          <Button variant="outline" size="sm" onClick={retry}>
            Volver a intentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
export function Loading() {
  return (
    <div aria-label="Cargando datos" role="status" className="grid gap-5">
      <div className="grid grid-cols-2 gap-5">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-72" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
export function EmptyState({
  title = 'Todavía no hay movimientos',
  description = 'Añade tu primer registro para empezar a conocer tus finanzas.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-wrap items-start justify-between gap-4 xl:flex-nowrap">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
export function TextLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      className="inline-flex items-center gap-1.25 text-caption font-book whitespace-nowrap text-primary hover:underline"
      to={to}
    >
      {children}
      <ArrowRight size={14} />
    </Link>
  );
}
export function DateText({ value }: { value: string }) {
  return (
    <time dateTime={value}>
      {new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(`${value}T12:00:00`),
      )}
    </time>
  );
}
export function Money({ value, sign }: { value: string; sign?: '+' | '−' }) {
  return (
    <span data-money className="whitespace-nowrap tracking-tight tabular-nums">
      {sign}
      {formatMoney(value)}
    </span>
  );
}
export function ColorSwatch({ color, className }: { color: string; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 10 10" className={cn('size-2.5 shrink-0', className)}>
      <rect width="10" height="10" rx="4" fill={color} />
    </svg>
  );
}
export function Hint({ text }: { text: string }) {
  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label="Más información"
            className="inline-flex items-center justify-center border-0 bg-transparent p-0.5 text-inherit opacity-80"
          >
            <Info size={14} />
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={8}
            collisionPadding={12}
            className="z-60 max-w-65 rounded-sm border border-border bg-popover p-3 text-xs/normal font-normal tracking-normal text-popover-foreground shadow-floating"
          >
            {text}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
export function useRange() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [custom, setCustom] = useState(periodRange('month'));
  const range = period === 'custom' ? custom : periodRange(period);
  const valid = range.from !== '' && range.to !== '' && range.from <= range.to;
  return {
    range,
    valid,
    picker: (
      <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end [&>select]:min-w-31.25 [&>select]:text-xs/normal lg:[&>select]:min-w-36.5 [&>input]:w-35.5">
        <label className="sr-only" htmlFor="period">
          Período
        </label>
        <select
          className="min-h-9.5 max-w-full cursor-pointer rounded-sm border border-input bg-card py-2 pr-8 pl-3 text-inherit"
          id="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as typeof period)}
        >
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
          <option value="year">Este año</option>
          <option value="custom">Personalizado</option>
        </select>
        {period === 'custom' && (
          <>
            <Input
              aria-label="Desde"
              type="date"
              value={custom.from}
              max={custom.to || undefined}
              onChange={(e) => setCustom({ ...custom, from: e.target.value })}
            />
            <span>—</span>
            <Input
              aria-label="Hasta"
              type="date"
              value={custom.to}
              min={custom.from || undefined}
              onChange={(e) => setCustom({ ...custom, to: e.target.value })}
            />
          </>
        )}
      </div>
    ),
    query: valid
      ? `from=${range.from}&to=${range.to}`
      : `from=${todayMadrid()}&to=${todayMadrid()}`,
  };
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-0.75 flex flex-wrap items-start justify-between gap-4.25 md:flex-nowrap md:gap-5 lg:items-center [&_h1]:mt-2.25 [&_h1]:font-heading [&_h1]:text-title [&_h1]:leading-title [&_h1]:font-book [&_h1]:tracking-page md:[&_h1]:text-page-tablet lg:[&_h1]:text-page [&_p:not([data-eyebrow])]:mt-2.25 [&_p:not([data-eyebrow])]:text-xs/normal [&_p:not([data-eyebrow])]:leading-copy [&_p:not([data-eyebrow])]:text-muted-foreground md:[&_p:not([data-eyebrow])]:text-body">
      <div>
        <p
          data-eyebrow
          className="text-overline font-demi tracking-overline text-muted-foreground md:text-micro"
        >
          {eyebrow}
        </p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}
